export function createSessionId() {
  return `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function getStoredSessionId(siteId) {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(sessionStorageKey(siteId));
  } catch {
    return null;
  }
}

export function storeSessionId(siteId, sessionId) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(sessionStorageKey(siteId), sessionId);
  } catch {
    // ignore quota errors
  }
}

export function clearStoredSessionId(siteId) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(sessionStorageKey(siteId));
  } catch {
    // ignore
  }
}

function sessionStorageKey(siteId) {
  return `site-context-chat-session-${siteId}`;
}

export function widgetStorageKey(siteId) {
  return `site-context-chat-widget-${siteId}`;
}

export function mobileWidgetStorageKey(siteId) {
  return `site-context-chat-widget-mobile-${siteId}`;
}
