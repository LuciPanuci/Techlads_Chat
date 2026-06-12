import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { prepareChat, persistConversation, type HistoryRow } from '../_shared/chatPrep.ts';
import { submitSiteInquiry, type ContactFormData } from '../_shared/inquiry.ts';
import { corsHeaders, handleOptions, jsonResponse, sseEvent, sseResponse } from '../_shared/cors.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const HISTORY_UI_LIMIT = 40;

type ChatAction = 'chat' | 'history' | 'config' | 'submitInquiry';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleOptions();
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Authorization header required' }, 401);
    }

    const body = await req.json();
    const action = (body.action ?? 'chat') as ChatAction;
    const siteId = body.siteId ?? 'default';
    const sessionId = body.sessionId ?? null;
    const stream = body.stream === true;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'config') {
      return await handleConfig(supabase, siteId);
    }

    if (!sessionId) {
      return jsonResponse({ success: false, error: 'sessionId is required' }, 400);
    }

    if (action === 'history') {
      return await handleHistory(supabase, siteId, sessionId);
    }

    if (action === 'submitInquiry') {
      return await handleSubmitInquiry(supabase, {
        siteId,
        sessionId,
        contactFormData: body.contactFormData as ContactFormData,
        routeContext: body.routeContext ?? null,
      });
    }

    const chatInput = {
      siteId,
      sessionId,
      message: body.message,
      routeContext: body.routeContext ?? null,
    };

    if (stream) {
      return await handleChatStream(supabase, chatInput);
    }

    return await handleChat(supabase, chatInput);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('site-chat error:', message);
    return jsonResponse({ success: false, error: message }, 500);
  }
});

async function handleConfig(supabase: ReturnType<typeof createClient>, siteId: string) {
  const { data: site, error } = await supabase
    .from('site_chat_sites')
    .select('id, enabled, chatbot_name, business_name, appearance, model, max_tokens')
    .eq('id', siteId)
    .single();

  if (error || !site) {
    return jsonResponse({ success: false, error: 'Site not found' }, 404);
  }

  if (!site.enabled) {
    return jsonResponse({ success: false, error: 'Chatbot is disabled for this site', code: 'DISABLED' }, 403);
  }

  return jsonResponse({ success: true, config: site });
}

async function handleHistory(
  supabase: ReturnType<typeof createClient>,
  siteId: string,
  sessionId: string,
) {
  const { data, error } = await supabase.rpc('get_site_chat_history', {
    p_site_id: siteId,
    p_session_id: sessionId,
    p_limit: HISTORY_UI_LIMIT,
  });

  if (error) {
    throw new Error(`Failed to load history: ${error.message}`);
  }

  const messages = ((data ?? []) as HistoryRow[]).map((row) => ({
    role: row.role,
    content: row.content,
    messageSequence: row.message_sequence,
    createdAt: row.created_at,
  }));

  return jsonResponse({ success: true, messages });
}

async function handleSubmitInquiry(
  supabase: ReturnType<typeof createClient>,
  input: {
    siteId: string;
    sessionId: string;
    contactFormData: ContactFormData;
    routeContext: { pathname?: string } | null;
  },
) {
  const { data: site, error: siteError } = await supabase
    .from('site_chat_sites')
    .select('id, enabled, business_name, chatbot_name')
    .eq('id', input.siteId)
    .single();

  if (siteError || !site) {
    return jsonResponse({ success: false, error: 'Site not found' }, 404);
  }

  if (!site.enabled) {
    return jsonResponse({ success: false, error: 'Chatbot is disabled', code: 'DISABLED' }, 403);
  }

  try {
    const { confirmation } = await submitSiteInquiry(supabase, {
      siteId: input.siteId,
      sessionId: input.sessionId,
      contactFormData: input.contactFormData,
      routePath: input.routeContext?.pathname ?? null,
      businessName: String(site.business_name || site.chatbot_name || 'the team'),
    });

    return jsonResponse({
      success: true,
      response: confirmation,
      contactFormSubmitted: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit inquiry';
    return jsonResponse({ success: false, error: message, contactFormError: true }, 400);
  }
}

function chatPrepErrorResponse(error: unknown): Response | null {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const code = (error as Error & { code?: string }).code;

  if (message === 'Site not found') {
    return jsonResponse({ success: false, error: message }, 404);
  }
  if (code === 'DISABLED') {
    return jsonResponse({ success: false, error: message, code: 'DISABLED' }, 403);
  }
  if (message === 'message is required') {
    return jsonResponse({ success: false, error: message }, 400);
  }

  return null;
}

async function handleChat(
  supabase: ReturnType<typeof createClient>,
  input: {
    siteId: string;
    sessionId: string;
    message: string;
    routeContext: { pathname?: string } | null;
  },
) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  let prepared;
  try {
    prepared = await prepareChat(supabase, input);
  } catch (error) {
    const prepResponse = chatPrepErrorResponse(error);
    if (prepResponse) return prepResponse;
    throw error;
  }

  const { site, message, systemPrompt, conversationMessages, nextUserSequence, nextAssistantSequence, routePath } =
    prepared;

  const aiResponse = await callAnthropic({
    apiKey: ANTHROPIC_API_KEY,
    model: String(site.model),
    maxTokens: Number(site.max_tokens),
    systemPrompt,
    messages: conversationMessages,
  });

  await persistConversation(supabase, {
    siteId: input.siteId,
    sessionId: input.sessionId,
    userMessage: message,
    assistantMessage: aiResponse,
    nextUserSequence,
    nextAssistantSequence,
    routePath,
  });

  return jsonResponse({
    success: true,
    response: aiResponse,
    model: site.model,
  });
}

async function handleChatStream(
  supabase: ReturnType<typeof createClient>,
  input: {
    siteId: string;
    sessionId: string;
    message: string;
    routeContext: { pathname?: string } | null;
  },
) {
  if (!ANTHROPIC_API_KEY) {
    return jsonResponse({ success: false, error: 'ANTHROPIC_API_KEY not configured' }, 500);
  }

  let prepared;
  try {
    prepared = await prepareChat(supabase, input);
  } catch (error) {
    const prepResponse = chatPrepErrorResponse(error);
    if (prepResponse) return prepResponse;
    throw error;
  }

  const { site, message, systemPrompt, conversationMessages, nextUserSequence, nextAssistantSequence, routePath } =
    prepared;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(sseEvent(payload)));
      };

      let fullText = '';

      try {
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: site.model,
            max_tokens: site.max_tokens,
            stream: true,
            system: systemPrompt,
            messages: conversationMessages,
          }),
        });

        if (!anthropicResponse.ok) {
          const errorData = await anthropicResponse.json().catch(() => ({}));
          const errMessage =
            (errorData as { error?: { message?: string } })?.error?.message ??
            anthropicResponse.statusText;
          send({ type: 'error', error: `Claude API error: ${errMessage}` });
          return;
        }

        if (!anthropicResponse.body) {
          send({ type: 'error', error: 'Empty response from Claude API' });
          return;
        }

        const reader = anthropicResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const dataLine = part.split('\n').find((line) => line.startsWith('data: '));
            if (!dataLine) continue;

            const payload = JSON.parse(dataLine.slice(6)) as {
              type?: string;
              delta?: { type?: string; text?: string };
              error?: { message?: string };
            };

            if (payload.type === 'content_block_delta' && payload.delta?.type === 'text_delta') {
              const chunk = payload.delta.text ?? '';
              if (chunk) {
                fullText += chunk;
                send({ type: 'text', text: chunk });
              }
            } else if (payload.type === 'error') {
              throw new Error(payload.error?.message ?? 'Claude stream error');
            }
          }
        }

        if (!fullText.trim()) {
          send({ type: 'error', error: 'Empty response from Claude API' });
          return;
        }

        await persistConversation(supabase, {
          siteId: input.siteId,
          sessionId: input.sessionId,
          userMessage: message,
          assistantMessage: fullText,
          nextUserSequence,
          nextAssistantSequence,
          routePath,
        });

        send({ type: 'done', model: site.model });
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : 'Unknown stream error';
        console.error('site-chat stream error:', errMessage);
        send({ type: 'error', error: errMessage });
      } finally {
        controller.close();
      }
    },
  });

  return sseResponse(stream);
}

async function callAnthropic(input: {
  apiKey: string;
  model: string;
  maxTokens: number;
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<string> {
  let retryCount = 0;
  const maxRetries = 2;

  while (retryCount <= maxRetries) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': input.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: input.model,
        max_tokens: input.maxTokens,
        system: input.systemPrompt,
        messages: input.messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errMessage =
        (errorData as { error?: { message?: string } })?.error?.message ?? response.statusText;
      retryCount += 1;
      if (retryCount > maxRetries) {
        throw new Error(`Claude API error: ${errMessage}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text;
    if (!text) {
      retryCount += 1;
      if (retryCount > maxRetries) {
        throw new Error('Invalid response structure from Claude API');
      }
      continue;
    }

    return text;
  }

  throw new Error('Claude API failed');
}
