export async function invokeSiteChat(supabase, payload) {
  const { data, error } = await supabase.functions.invoke('site-chat', { body: payload });
  if (error) {
    throw error;
  }
  return data;
}

export async function invokeSiteChatAdmin(supabase, adminSecret, payload) {
  const { data, error } = await supabase.functions.invoke('site-chat-admin', {
    body: payload,
    headers: {
      'x-admin-secret': adminSecret,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchSiteConfig(supabase, siteId) {
  return invokeSiteChat(supabase, { action: 'config', siteId });
}

export async function fetchChatHistory(supabase, siteId, sessionId) {
  return invokeSiteChat(supabase, { action: 'history', siteId, sessionId });
}

export async function sendChatMessage(supabase, { siteId, sessionId, message, routeContext }) {
  return invokeSiteChat(supabase, {
    action: 'chat',
    siteId,
    sessionId,
    message,
    routeContext,
  });
}

async function readSsePayloads(response, onEvent) {
  const reader = response.body.getReader();
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

      const payload = JSON.parse(dataLine.slice(6));
      onEvent(payload);
    }
  }
}

export async function streamChatMessage(
  supabaseUrl,
  supabaseAnonKey,
  { siteId, sessionId, message, routeContext, onDelta, onDone, onError },
) {
  const response = await fetch(`${supabaseUrl}/functions/v1/site-chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      action: 'chat',
      siteId,
      sessionId,
      message,
      routeContext,
      stream: true,
    }),
  });

  const contentType = response.headers.get('content-type') ?? '';

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error ?? `Chat request failed (${response.status})`);
  }

  if (!contentType.includes('text/event-stream')) {
    const data = await response.json();
    if (!data?.success) {
      throw new Error(data?.error ?? 'Chat request failed');
    }
    if (data.response) {
      onDelta?.(data.response);
    }
    onDone?.({ model: data.model });
    return;
  }

  let streamError = null;

  await readSsePayloads(response, (payload) => {
    if (payload.type === 'text' && payload.text) {
      onDelta?.(payload.text);
    } else if (payload.type === 'done') {
      onDone?.(payload);
    } else if (payload.type === 'error') {
      streamError = new Error(payload.error ?? 'Stream error');
      onError?.(streamError);
    }
  });

  if (streamError) {
    throw streamError;
  }
}

export async function submitChatInquiry(
  supabaseUrl,
  supabaseAnonKey,
  { siteId, sessionId, contactFormData, routeContext },
) {
  const response = await fetch(`${supabaseUrl}/functions/v1/site-chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'submitInquiry',
      siteId,
      sessionId,
      contactFormData,
      routeContext,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success) {
    throw new Error(data?.error ?? `Inquiry failed (${response.status})`);
  }

  return data;
}
