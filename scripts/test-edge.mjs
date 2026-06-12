#!/usr/bin/env node

/**
 * Smoke-test deployed edge functions.
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 *   SITE_CHAT_ADMIN_SECRET (for admin save test — optional)
 *
 * Usage:
 *   node scripts/test-edge.mjs
 */

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const adminSecret = process.env.SITE_CHAT_ADMIN_SECRET;
const siteId = process.env.SITE_ID ?? 'default';

if (!supabaseUrl || !anonKey) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

async function invokeFunction(name, body, extraHeaders = {}) {
  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function main() {
  console.log('1. config');
  const config = await invokeFunction('site-chat', { action: 'config', siteId });
  console.log(config);
  if (!config.data?.success) {
    throw new Error('config failed');
  }

  const sessionId = `test_${Date.now()}`;
  console.log('\n2. chat');
  const chat = await invokeFunction('site-chat', {
    action: 'chat',
    siteId,
    sessionId,
    message: 'Hello — what can you help me with?',
    routeContext: { pathname: '/test' },
  });
  console.log(chat);
  if (!chat.data?.success) {
    throw new Error('chat failed');
  }

  console.log('\n3. history');
  const history = await invokeFunction('site-chat', {
    action: 'history',
    siteId,
    sessionId,
  });
  console.log(history);
  if (!history.data?.success || (history.data.messages?.length ?? 0) < 2) {
    throw new Error('history failed or incomplete');
  }

  if (adminSecret) {
    console.log('\n4. admin get');
    const admin = await invokeFunction(
      'site-chat-admin',
      { action: 'get', siteId },
      { 'x-admin-secret': adminSecret },
    );
    console.log({ status: admin.status, success: admin.data?.success });
  } else {
    console.log('\n4. admin get — skipped (no SITE_CHAT_ADMIN_SECRET)');
  }

  console.log('\n✅ Edge smoke test passed');
}

main().catch((error) => {
  console.error('❌', error.message ?? error);
  process.exit(1);
});
