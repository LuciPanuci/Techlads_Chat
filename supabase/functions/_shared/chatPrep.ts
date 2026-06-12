import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildSystemPrompt, chunkMarkdownForQuery } from './prompt.ts';

const HISTORY_MODEL_LIMIT = 20;

export type HistoryRow = {
  role: 'user' | 'assistant';
  content: string;
  message_sequence: number;
  created_at: string;
};

export type PreparedChat = {
  site: Record<string, unknown>;
  message: string;
  systemPrompt: string;
  conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  nextUserSequence: number;
  nextAssistantSequence: number;
  routePath: string | null;
};

export async function prepareChat(
  supabase: SupabaseClient,
  input: {
    siteId: string;
    sessionId: string;
    message: string;
    routeContext: { pathname?: string } | null;
  },
): Promise<PreparedChat> {
  const message = input.message?.trim();
  if (!message) {
    throw new Error('message is required');
  }

  const { data: site, error: siteError } = await supabase
    .from('site_chat_sites')
    .select('*')
    .eq('id', input.siteId)
    .single();

  if (siteError || !site) {
    throw new Error('Site not found');
  }

  if (!site.enabled) {
    const err = new Error('Chatbot is disabled');
    (err as Error & { code?: string }).code = 'DISABLED';
    throw err;
  }

  const { data: contextRow, error: contextError } = await supabase
    .from('site_chat_context')
    .select('context_markdown')
    .eq('site_id', input.siteId)
    .single();

  if (contextError) {
    console.warn('site-chat context warning:', contextError.message);
  }

  const fullContext = contextRow?.context_markdown ?? '';
  const contextMarkdown = chunkMarkdownForQuery(fullContext, message, 6);

  const { data: history, error: historyError } = await supabase.rpc('get_site_chat_history', {
    p_site_id: input.siteId,
    p_session_id: input.sessionId,
    p_limit: HISTORY_MODEL_LIMIT,
  });

  if (historyError) {
    throw new Error(`Failed to load conversation history: ${historyError.message}`);
  }

  const safeHistory = (history ?? []) as HistoryRow[];

  const { data: userMessageCount, error: countError } = await supabase.rpc(
    'get_site_chat_user_message_count',
    {
      p_site_id: input.siteId,
      p_session_id: input.sessionId,
    },
  );

  if (countError) {
    throw new Error(`Failed to get message count: ${countError.message}`);
  }

  const nextUserSequence = ((userMessageCount as number) ?? 0) * 2 + 1;
  const nextAssistantSequence = nextUserSequence + 1;

  const systemPrompt = buildSystemPrompt({
    chatbotName: String(site.chatbot_name),
    businessName: String(site.business_name),
    contextMarkdown,
    systemPromptExtra: String(site.system_prompt_extra ?? ''),
    routePath: input.routeContext?.pathname ?? null,
    hasHistory: safeHistory.length > 0,
  });

  const conversationMessages = [
    ...safeHistory.map((row) => ({ role: row.role, content: row.content })),
    { role: 'user' as const, content: message },
  ];

  return {
    site,
    message,
    systemPrompt,
    conversationMessages,
    nextUserSequence,
    nextAssistantSequence,
    routePath: input.routeContext?.pathname ?? null,
  };
}

export async function persistConversation(
  supabase: SupabaseClient,
  input: {
    siteId: string;
    sessionId: string;
    userMessage: string;
    assistantMessage: string;
    nextUserSequence: number;
    nextAssistantSequence: number;
    routePath: string | null;
  },
): Promise<void> {
  const { error: userInsertError } = await supabase.from('site_chat_conversations').insert({
    site_id: input.siteId,
    session_id: input.sessionId,
    message_sequence: input.nextUserSequence,
    role: 'user',
    content: input.userMessage,
    route_path: input.routePath,
  });

  if (userInsertError) {
    throw new Error(`Failed to store user message: ${userInsertError.message}`);
  }

  const { error: assistantInsertError } = await supabase.from('site_chat_conversations').insert({
    site_id: input.siteId,
    session_id: input.sessionId,
    message_sequence: input.nextAssistantSequence,
    role: 'assistant',
    content: input.assistantMessage,
    route_path: input.routePath,
  });

  if (assistantInsertError) {
    throw new Error(`Failed to store assistant message: ${assistantInsertError.message}`);
  }
}
