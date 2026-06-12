import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CANONICAL_WELCOME_MESSAGE, resolveWelcomeMessage } from '../lib/appearanceDefaults';
import { invokeSiteChatAdmin } from '../lib/api';
import AdminActivity from './AdminActivity';
import { ChatbotProvider } from '../context/ChatbotProvider';
import SiteChatWidget from '../chatbot/SiteChatWidget';

const DEFAULT_APPEARANCE = {
  primary: '#5DA399',
  primaryDark: '#0F766E',
  secondary: '#F29F05',
  accent: '#F29F05',
  welcomeMessage: CANONICAL_WELCOME_MESSAGE,
  placeholder: 'Type your message...',
};

const ADMIN_SECRET_KEY = 'site-context-chat-admin-secret';

export default function AdminPanel({
  supabaseUrl,
  supabaseAnonKey,
  siteId = 'default',
  className,
}) {
  const supabase = useMemo(
    () => createClient(supabaseUrl, supabaseAnonKey),
    [supabaseUrl, supabaseAnonKey],
  );

  const [adminSecret, setAdminSecret] = useState('');
  const [secretInput, setSecretInput] = useState('');

  useEffect(() => {
    const stored = window.localStorage.getItem(ADMIN_SECRET_KEY) ?? '';
    if (stored) {
      setAdminSecret(stored);
      setSecretInput(stored);
    }
  }, []);
  const [tab, setTab] = useState('settings');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  const [site, setSite] = useState({
    enabled: true,
    chatbot_name: 'AI Assistant',
    business_name: '',
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system_prompt_extra: '',
    appearance: DEFAULT_APPEARANCE,
  });
  const [contextMarkdown, setContextMarkdown] = useState('');

  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2500);
  };

  const loadConfig = useCallback(async () => {
    if (!adminSecret) return;
    setLoading(true);
    setError(null);
    try {
      const data = await invokeSiteChatAdmin(supabase, adminSecret, {
        action: 'get',
        siteId,
      });
      if (!data?.success) {
        throw new Error(data?.error ?? 'Failed to load config');
      }
      setSite({
        enabled: data.site.enabled,
        chatbot_name: data.site.chatbot_name,
        business_name: data.site.business_name,
        model: data.site.model,
        max_tokens: data.site.max_tokens,
        system_prompt_extra: data.site.system_prompt_extra ?? '',
        appearance: {
          ...DEFAULT_APPEARANCE,
          ...(data.site.appearance ?? {}),
          welcomeMessage: resolveWelcomeMessage(data.site.appearance?.welcomeMessage),
        },
      });
      setContextMarkdown(data.context?.context_markdown ?? '');
    } catch (err) {
      const message = err.message ?? 'Failed to load config';
      setError(message);
      if (/unauthorized|401|forbidden/i.test(message)) {
        window.localStorage.removeItem(ADMIN_SECRET_KEY);
        setAdminSecret('');
        setSecretInput('');
      }
    } finally {
      setLoading(false);
    }
  }, [adminSecret, siteId, supabase]);

  useEffect(() => {
    if (adminSecret) {
      loadConfig();
    }
  }, [adminSecret, loadConfig]);

  const handleUnlock = (event) => {
    event.preventDefault();
    const trimmed = secretInput.trim();
    if (!trimmed) return;
    window.localStorage.setItem(ADMIN_SECRET_KEY, trimmed);
    setAdminSecret(trimmed);
  };

  const handleSave = async () => {
    if (!adminSecret) return;
    setLoading(true);
    setError(null);
    try {
      const data = await invokeSiteChatAdmin(supabase, adminSecret, {
        action: 'save',
        siteId,
        site,
        contextMarkdown,
      });
      if (!data?.success) {
        throw new Error(data?.error ?? 'Failed to save');
      }
      showNotice('Saved to Supabase.');
    } catch (err) {
      setError(err.message ?? 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleImportMarkdown = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setContextMarkdown(text);
    event.target.value = '';
  };

  const contextStats = useMemo(() => {
    const chars = contextMarkdown.length;
    const words = contextMarkdown.trim() ? contextMarkdown.trim().split(/\s+/).length : 0;
    return { chars, words };
  }, [contextMarkdown]);

  if (!adminSecret) {
    return (
      <div className={`scc-admin ${className ?? ''}`}>
        <h1 className="scc-admin__title">Site Context Chat — Admin</h1>
        <p className="scc-help">
          Enter your <code>SITE_CHAT_ADMIN_SECRET</code> (set in Supabase Edge Function secrets).
        </p>
        <form onSubmit={handleUnlock} className="scc-admin__row">
          <input
            className="scc-input scc-input--full"
            type="password"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            placeholder="Admin secret"
          />
          <button type="submit" className="scc-btn scc-btn--primary">
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={`scc-admin ${className ?? ''}`}>
      <header className="scc-admin__header">
        <div>
          <h1 className="scc-admin__title">Site Context Chat</h1>
          <p className="scc-admin__lead">
            Site <code>{siteId}</code> — Anthropic key stays in Supabase secrets, not here.
          </p>
        </div>
        <button
          type="button"
          className="scc-btn scc-btn--primary"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
      </header>

      {notice && <div className="scc-admin__notice">{notice}</div>}
      {error && <div className="scc-error">{error}</div>}

      <nav className="scc-admin__tabs">
        {['settings', 'context', 'appearance', 'activity', 'test'].map((id) => (
          <button
            key={id}
            type="button"
            className={`scc-admin__tab ${tab === id ? 'scc-admin__tab--active' : ''}`}
            onClick={() => setTab(id)}
          >
            {id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
      </nav>

      <div className="scc-admin__body">
        {tab === 'settings' && (
          <section className="scc-admin-section">
            <label className="scc-field scc-field--row">
              <span>Enabled</span>
              <input
                type="checkbox"
                checked={site.enabled}
                onChange={(e) => setSite((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
            </label>
            <label className="scc-field">
              <span>Chatbot name</span>
              <input
                className="scc-input scc-input--full"
                value={site.chatbot_name}
                onChange={(e) => setSite((prev) => ({ ...prev, chatbot_name: e.target.value }))}
              />
            </label>
            <label className="scc-field">
              <span>Business name</span>
              <input
                className="scc-input scc-input--full"
                value={site.business_name}
                onChange={(e) => setSite((prev) => ({ ...prev, business_name: e.target.value }))}
              />
            </label>
            <label className="scc-field">
              <span>Model</span>
              <input
                className="scc-input scc-input--full"
                value={site.model}
                onChange={(e) => setSite((prev) => ({ ...prev, model: e.target.value }))}
              />
            </label>
            <label className="scc-field">
              <span>Max tokens</span>
              <input
                className="scc-input scc-input--full"
                type="number"
                min={256}
                max={4096}
                value={site.max_tokens}
                onChange={(e) =>
                  setSite((prev) => ({ ...prev, max_tokens: Number(e.target.value) || 1024 }))
                }
              />
            </label>
            <label className="scc-field">
              <span>Extra system instructions</span>
              <textarea
                className="scc-textarea"
                rows={5}
                value={site.system_prompt_extra}
                onChange={(e) =>
                  setSite((prev) => ({ ...prev, system_prompt_extra: e.target.value }))
                }
              />
            </label>
          </section>
        )}

        {tab === 'context' && (
          <section className="scc-admin-section">
            <div className="scc-admin__row">
              <label className="scc-btn scc-btn--ghost scc-file-btn">
                Import .md
                <input type="file" accept=".md,.markdown,.txt" hidden onChange={handleImportMarkdown} />
              </label>
              <span className="scc-meta">
                {contextStats.words.toLocaleString()} words · {contextStats.chars.toLocaleString()} chars
              </span>
            </div>
            <textarea
              className="scc-textarea scc-textarea--tall"
              value={contextMarkdown}
              onChange={(e) => setContextMarkdown(e.target.value)}
              spellCheck={false}
            />
          </section>
        )}

        {tab === 'appearance' && (
          <section className="scc-admin-section">
            {['primary', 'primaryDark', 'secondary', 'accent'].map((key) => (
              <label key={key} className="scc-field">
                <span>{key}</span>
                <input
                  className="scc-input scc-input--full"
                  type="color"
                  value={site.appearance[key] ?? '#000000'}
                  onChange={(e) =>
                    setSite((prev) => ({
                      ...prev,
                      appearance: { ...prev.appearance, [key]: e.target.value },
                    }))
                  }
                />
              </label>
            ))}
            <label className="scc-field">
              <span>Welcome message</span>
              <textarea
                className="scc-textarea"
                rows={3}
                value={site.appearance.welcomeMessage ?? ''}
                onChange={(e) =>
                  setSite((prev) => ({
                    ...prev,
                    appearance: { ...prev.appearance, welcomeMessage: e.target.value },
                  }))
                }
              />
            </label>
            <label className="scc-field">
              <span>Input placeholder</span>
              <input
                className="scc-input scc-input--full"
                value={site.appearance.placeholder ?? ''}
                onChange={(e) =>
                  setSite((prev) => ({
                    ...prev,
                    appearance: { ...prev.appearance, placeholder: e.target.value },
                  }))
                }
              />
            </label>
          </section>
        )}

        {tab === 'activity' && (
          <AdminActivity supabase={supabase} adminSecret={adminSecret} siteId={siteId} />
        )}

        {tab === 'test' && (
          <section className="scc-admin-section">
            <p className="scc-help">Save first, then test against your deployed edge functions.</p>
            <div className="scc-admin-preview">
              <ChatbotProvider
                supabaseUrl={supabaseUrl}
                supabaseAnonKey={supabaseAnonKey}
                siteId={siteId}
              >
                <SiteChatWidget adminMode routePath="/admin/chat" />
              </ChatbotProvider>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
