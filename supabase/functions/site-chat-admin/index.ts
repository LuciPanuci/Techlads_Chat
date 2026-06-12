import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';

const ADMIN_SECRET = Deno.env.get('SITE_CHAT_ADMIN_SECRET');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleOptions();
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  try {
    const providedSecret = req.headers.get('x-admin-secret');
    if (!ADMIN_SECRET || providedSecret !== ADMIN_SECRET) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await req.json();
    const action = body.action ?? 'get';
    const siteId = body.siteId ?? 'default';

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'get') {
      const [{ data: site, error: siteError }, { data: context, error: contextError }] =
        await Promise.all([
          supabase.from('site_chat_sites').select('*').eq('id', siteId).single(),
          supabase.from('site_chat_context').select('*').eq('site_id', siteId).single(),
        ]);

      if (siteError) {
        return jsonResponse({ success: false, error: siteError.message }, 404);
      }

      return jsonResponse({
        success: true,
        site,
        context: contextError ? { site_id: siteId, context_markdown: '' } : context,
      });
    }

    if (action === 'inquiries') {
      const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 200);
      const { data, error } = await supabase
        .from('site_chat_inquiries')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(error.message);
      }

      return jsonResponse({ success: true, inquiries: data ?? [] });
    }

    if (action === 'conversations') {
      const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 200);
      const { data, error } = await supabase.rpc('list_site_chat_sessions', {
        p_site_id: siteId,
        p_limit: limit,
      });

      if (error) {
        throw new Error(error.message);
      }

      return jsonResponse({ success: true, sessions: data ?? [] });
    }

    if (action === 'conversation') {
      const sessionId = body.sessionId;
      if (!sessionId || typeof sessionId !== 'string') {
        return jsonResponse({ success: false, error: 'sessionId is required' }, 400);
      }

      const limit = Math.min(Math.max(Number(body.limit) || 500, 1), 1000);
      const { data, error } = await supabase.rpc('get_site_chat_history', {
        p_site_id: siteId,
        p_session_id: sessionId,
        p_limit: limit,
      });

      if (error) {
        throw new Error(error.message);
      }

      const messages = (data ?? []).map((row: Record<string, unknown>) => ({
        role: row.role,
        content: row.content,
        messageSequence: row.message_sequence,
        createdAt: row.created_at,
      }));

      return jsonResponse({ success: true, sessionId, messages });
    }

    if (action === 'save') {
      const sitePatch = body.site ?? {};
      const contextMarkdown = body.contextMarkdown;

      const { error: siteError } = await supabase
        .from('site_chat_sites')
        .upsert({
          id: siteId,
          enabled: sitePatch.enabled ?? true,
          chatbot_name: sitePatch.chatbot_name ?? 'AI Assistant',
          business_name: sitePatch.business_name ?? '',
          appearance: sitePatch.appearance ?? {},
          model: sitePatch.model ?? 'claude-sonnet-4-20250514',
          max_tokens: sitePatch.max_tokens ?? 1024,
          system_prompt_extra: sitePatch.system_prompt_extra ?? '',
          updated_at: new Date().toISOString(),
        });

      if (siteError) {
        throw new Error(siteError.message);
      }

      if (typeof contextMarkdown === 'string') {
        const { error: contextError } = await supabase.from('site_chat_context').upsert({
          site_id: siteId,
          context_markdown: contextMarkdown,
          updated_at: new Date().toISOString(),
        });

        if (contextError) {
          throw new Error(contextError.message);
        }
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ success: false, error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('site-chat-admin error:', message);
    return jsonResponse({ success: false, error: message }, 500);
  }
});
