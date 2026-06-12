import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { fetchChatHistory } from '../lib/api';
import {
  clearStoredSessionId,
  createSessionId,
  getStoredSessionId,
  storeSessionId,
} from '../lib/session';

const ChatbotContext = createContext(null);

export function ChatbotProvider({ supabaseUrl, supabaseAnonKey, siteId = 'default', children }) {
  const supabase = useMemo(
    () => createClient(supabaseUrl, supabaseAnonKey),
    [supabaseUrl, supabaseAnonKey],
  );

  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const historyLoadedForRef = useRef(null);

  useEffect(() => {
    setSessionId(getStoredSessionId(siteId));
  }, [siteId]);

  const openChat = useCallback(() => setIsChatOpen(true), []);
  const closeChat = useCallback(() => setIsChatOpen(false), []);

  const initializeSession = useCallback(() => {
    const existing = getStoredSessionId(siteId);
    if (existing) {
      setSessionId(existing);
      return existing;
    }
    const created = createSessionId();
    storeSessionId(siteId, created);
    setSessionId(created);
    setMessages([]);
    historyLoadedForRef.current = null;
    return created;
  }, [siteId]);

  const startNewConversation = useCallback(() => {
    const created = createSessionId();
    storeSessionId(siteId, created);
    setSessionId(created);
    setMessages([]);
    historyLoadedForRef.current = null;
    return created;
  }, [siteId]);

  const addMessage = useCallback((message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateMessageById = useCallback((id, updater) => {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id !== id) return message;
        return typeof updater === 'function' ? updater(message) : { ...message, ...updater };
      }),
    );
  }, []);

  const finishMessageById = useCallback((id) => {
    setMessages((prev) =>
      prev.map((message) => (message.id === id ? { ...message, streaming: false } : message)),
    );
  }, []);

  const setConversationMessages = useCallback((nextMessages) => {
    setMessages(nextMessages);
  }, []);

  const loadHistory = useCallback(
    async (activeSessionId) => {
      if (!activeSessionId) return;
      if (historyLoadedForRef.current === activeSessionId) return;

      const data = await fetchChatHistory(supabase, siteId, activeSessionId);
      if (!data?.success) {
        throw new Error(data?.error ?? 'Failed to load chat history');
      }

      const hydrated = (data.messages ?? []).map((row) => ({
        role: row.role,
        content: row.content,
        timestamp: row.createdAt ? new Date(row.createdAt) : new Date(),
      }));

      setMessages(hydrated);
      historyLoadedForRef.current = activeSessionId;
    },
    [siteId, supabase],
  );

  const value = useMemo(
    () => ({
      supabase,
      supabaseUrl,
      supabaseAnonKey,
      siteId,
      sessionId,
      messages,
      isChatOpen,
      openChat,
      closeChat,
      initializeSession,
      startNewConversation,
      addMessage,
      updateMessageById,
      finishMessageById,
      setConversationMessages,
      loadHistory,
      clearSession: () => {
        clearStoredSessionId(siteId);
        setSessionId(null);
        setMessages([]);
        historyLoadedForRef.current = null;
      },
    }),
    [
      supabase,
      supabaseUrl,
      supabaseAnonKey,
      siteId,
      sessionId,
      messages,
      isChatOpen,
      openChat,
      closeChat,
      initializeSession,
      startNewConversation,
      addMessage,
      updateMessageById,
      finishMessageById,
      setConversationMessages,
      loadHistory,
    ],
  );

  return <ChatbotContext.Provider value={value}>{children}</ChatbotContext.Provider>;
}

export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error('useChatbot must be used within ChatbotProvider');
  }
  return context;
}

export function useChatbotOptional() {
  return useContext(ChatbotContext);
}
