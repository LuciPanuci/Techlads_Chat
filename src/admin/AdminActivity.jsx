import React, { useCallback, useEffect, useState } from 'react';
import { invokeSiteChatAdmin } from '../lib/api';

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function truncate(text, max = 120) {
  const value = String(text ?? '').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function shortSessionId(sessionId) {
  const value = String(sessionId ?? '');
  if (value.length <= 16) return value;
  return `${value.slice(0, 10)}…${value.slice(-4)}`;
}

export default function AdminActivity({
  supabase,
  adminSecret,
  siteId,
  initialSessionId = null,
  onSessionConsumed,
}) {
  const [view, setView] = useState('conversations');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [inquiries, setInquiries] = useState([]);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invokeSiteChatAdmin(supabase, adminSecret, {
        action: 'conversations',
        siteId,
        limit: 100,
      });
      if (!data?.success) throw new Error(data?.error ?? 'Failed to load conversations');
      setSessions(data.sessions ?? []);
    } catch (err) {
      setError(err.message ?? 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [adminSecret, siteId, supabase]);

  const loadInquiries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invokeSiteChatAdmin(supabase, adminSecret, {
        action: 'inquiries',
        siteId,
        limit: 100,
      });
      if (!data?.success) throw new Error(data?.error ?? 'Failed to load inquiries');
      setInquiries(data.inquiries ?? []);
    } catch (err) {
      setError(err.message ?? 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, [adminSecret, siteId, supabase]);

  const loadConversation = useCallback(
    async (sessionId) => {
      if (!sessionId) return;
      setSelectedSessionId(sessionId);
      setMessagesLoading(true);
      setError(null);
      try {
        const data = await invokeSiteChatAdmin(supabase, adminSecret, {
          action: 'conversation',
          siteId,
          sessionId,
        });
        if (!data?.success) throw new Error(data?.error ?? 'Failed to load conversation');
        setMessages(data.messages ?? []);
      } catch (err) {
        setError(err.message ?? 'Failed to load conversation');
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [adminSecret, siteId, supabase],
  );

  useEffect(() => {
    if (view === 'conversations') {
      loadSessions();
    } else {
      loadInquiries();
    }
  }, [view, loadSessions, loadInquiries]);

  useEffect(() => {
    if (!initialSessionId) return;
    setView('conversations');
    loadConversation(initialSessionId);
    onSessionConsumed?.();
  }, [initialSessionId, loadConversation, onSessionConsumed]);

  const openInquirySession = (sessionId) => {
    setView('conversations');
    loadConversation(sessionId);
  };

  return (
    <section className="scc-admin-section scc-admin-activity">
      <div className="scc-admin-activity__toolbar">
        <div className="scc-admin-activity__subtabs">
          <button
            type="button"
            className={`scc-admin__tab ${view === 'conversations' ? 'scc-admin__tab--active' : ''}`}
            onClick={() => setView('conversations')}
          >
            Conversations
          </button>
          <button
            type="button"
            className={`scc-admin__tab ${view === 'inquiries' ? 'scc-admin__tab--active' : ''}`}
            onClick={() => setView('inquiries')}
          >
            Inquiries
          </button>
        </div>
        <button
          type="button"
          className="scc-btn scc-btn--ghost"
          onClick={() => (view === 'conversations' ? loadSessions() : loadInquiries())}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error ? <p className="scc-error">{error}</p> : null}

      {view === 'conversations' ? (
        <div className="scc-admin-activity__split">
          <div className="scc-admin-activity__list">
            {sessions.length === 0 && !loading ? (
              <p className="scc-help">No conversations yet.</p>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.session_id}
                  type="button"
                  className={`scc-admin-activity__item ${
                    selectedSessionId === session.session_id ? 'scc-admin-activity__item--active' : ''
                  }`}
                  onClick={() => loadConversation(session.session_id)}
                >
                  <span className="scc-admin-activity__item-preview">
                    {truncate(session.preview) || '(no user message)'}
                  </span>
                  <span className="scc-admin-activity__item-meta">
                    {formatWhen(session.last_at)} · {session.user_message_count ?? 0} visitor msg
                    {session.last_route_path ? ` · ${session.last_route_path}` : ''}
                  </span>
                  <span className="scc-admin-activity__item-id">{shortSessionId(session.session_id)}</span>
                </button>
              ))
            )}
          </div>

          <div className="scc-admin-activity__detail">
            {!selectedSessionId ? (
              <p className="scc-help">Select a conversation to read the full thread.</p>
            ) : messagesLoading ? (
              <p className="scc-help">Loading thread…</p>
            ) : messages.length === 0 ? (
              <p className="scc-help">No messages in this session.</p>
            ) : (
              <>
                <p className="scc-admin-activity__detail-id">
                  Session <code>{selectedSessionId}</code>
                </p>
                <div className="scc-admin-activity__thread">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.messageSequence ?? index}-${message.role}`}
                      className={`scc-admin-activity__bubble scc-admin-activity__bubble--${message.role}`}
                    >
                      <p className="scc-admin-activity__bubble-label">
                        {message.role === 'user' ? 'Visitor' : 'Assistant'}
                        {message.createdAt ? ` · ${formatWhen(message.createdAt)}` : ''}
                      </p>
                      <p className="scc-admin-activity__bubble-text">{message.content}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="scc-admin-activity__inquiries">
          {inquiries.length === 0 && !loading ? (
            <p className="scc-help">No inquiry forms submitted yet.</p>
          ) : (
            inquiries.map((inquiry) => (
              <article key={inquiry.id} className="scc-admin-activity__inquiry">
                <header className="scc-admin-activity__inquiry-head">
                  <div>
                    <strong>{inquiry.contact_name}</strong>
                    <span className="scc-admin-activity__inquiry-contact">
                      {inquiry.contact_email}
                      {inquiry.contact_phone ? ` · ${inquiry.contact_phone}` : ''}
                    </span>
                  </div>
                  <span className="scc-meta">{formatWhen(inquiry.created_at)}</span>
                </header>
                <p className="scc-admin-activity__inquiry-message">{inquiry.message}</p>
                <footer className="scc-admin-activity__inquiry-foot">
                  {inquiry.route_path ? <span className="scc-meta">Page: {inquiry.route_path}</span> : null}
                  {inquiry.session_id ? (
                    <button
                      type="button"
                      className="scc-admin-activity__link"
                      onClick={() => openInquirySession(inquiry.session_id)}
                    >
                      View chat ({shortSessionId(inquiry.session_id)})
                    </button>
                  ) : null}
                  <span className="scc-admin-activity__status">{inquiry.status}</span>
                </footer>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
