import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChatbot } from '../context/ChatbotProvider';
import { CANONICAL_WELCOME_MESSAGE, resolveWelcomeMessage } from '../lib/appearanceDefaults';
import { fetchSiteConfig, streamChatMessage, submitChatInquiry } from '../lib/api';
import { parseContactFormTrigger } from '../lib/contactForm';
import { mobileWidgetStorageKey, widgetStorageKey } from '../lib/session';
import ChatFab from './ChatFab';
import ChatPanel from './ChatPanel';
import DraggableChatbotWrapper from './DraggableChatbotWrapper.jsx';

/** TechLads wordmark: teal (lads) + orange (tech) — see src/app/components/Logo.tsx */
const DEFAULT_COLORS = {
  primary: '#5DA399',
  primaryDark: '#0F766E',
  secondary: '#F29F05',
  accent: '#F29F05',
  welcomeMessage: CANONICAL_WELCOME_MESSAGE,
  placeholder: 'Type your message...',
};

export default function SiteChatWidget({
  adminMode = false,
  routePath,
  /** When this element is on screen, the launcher FAB stays hidden (e.g. `#hero` on homepage). */
  hideFabWhenSelector,
  /** WordPress: keep the widget visible while loading or when config fetch fails. */
  forceMount = false,
}) {
  const {
    supabase,
    supabaseUrl,
    supabaseAnonKey,
    siteId,
    sessionId,
    messages,
    initializeSession,
    startNewConversation,
    addMessage,
    updateMessageById,
    finishMessageById,
    loadHistory,
    isChatOpen,
    openChat,
    closeChat,
  } = useChatbot();

  const isOpen = adminMode || isChatOpen;
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(forceMount);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [chatbotName, setChatbotName] = useState('AI Assistant');
  const [appearance, setAppearance] = useState(DEFAULT_COLORS);
  const [configError, setConfigError] = useState(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryDraft, setInquiryDraft] = useState('');
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquiryError, setInquiryError] = useState(null);
  const [fabHiddenByAnchor, setFabHiddenByAnchor] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState(null);
  const [size, setSize] = useState({ width: 320, height: 653 });
  const [mobileHeight, setMobileHeight] = useState(null);
  const [isResizingMobile, setIsResizingMobile] = useState(false);
  const [viewportMetrics, setViewportMetrics] = useState(() => {
    const layoutHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    return { visualHeight: layoutHeight, offsetTop: 0, layoutHeight };
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const mobileResizeStartRef = useRef(null);
  const sessionInitializedRef = useRef(false);
  const historyLoadedSessionRef = useRef(null);

  const orgColors = useMemo(
    () => ({
      primary: appearance.primary ?? DEFAULT_COLORS.primary,
      primaryDark: appearance.primaryDark ?? DEFAULT_COLORS.primaryDark,
      secondary: appearance.secondary ?? DEFAULT_COLORS.secondary,
      accent: appearance.accent ?? DEFAULT_COLORS.accent,
    }),
    [appearance],
  );

  const effectiveRoutePath = useMemo(() => {
    if (routePath) return routePath;
    if (typeof window !== 'undefined') return window.location.pathname;
    return '/';
  }, [routePath]);

  const keyboardInset = Math.max(
    0,
    viewportMetrics.layoutHeight - viewportMetrics.visualHeight - viewportMetrics.offsetTop,
  );
  const isKeyboardOpen = keyboardInset > 80;

  const effectiveMobileHeight = useMemo(() => {
    if (!isMobile) return null;
    const preferred = mobileHeight || viewportMetrics.layoutHeight * 0.8;
    if (isKeyboardOpen) {
      return Math.min(preferred, viewportMetrics.visualHeight);
    }
    return preferred;
  }, [isMobile, mobileHeight, viewportMetrics, isKeyboardOpen]);

  const mobileResizeViewportHeight = isKeyboardOpen
    ? viewportMetrics.visualHeight
    : viewportMetrics.layoutHeight;

  useEffect(() => {
    if (adminMode || !hideFabWhenSelector) {
      setFabHiddenByAnchor(false);
      return undefined;
    }

    let observer;
    let cancelled = false;

    const attach = () => {
      if (cancelled) return;
      const anchor = document.querySelector(hideFabWhenSelector);
      if (!anchor) {
        setFabHiddenByAnchor(false);
        return;
      }

      observer = new IntersectionObserver(
        ([entry]) => {
          setFabHiddenByAnchor(entry.isIntersecting);
        },
        { threshold: 0 },
      );
      observer.observe(anchor);
    };

    attach();

    if (!document.querySelector(hideFabWhenSelector)) {
      const retry = window.setTimeout(attach, 100);
      return () => {
        cancelled = true;
        window.clearTimeout(retry);
        observer?.disconnect();
      };
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [adminMode, hideFabWhenSelector, routePath]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile || !siteId) return;
    try {
      const saved = localStorage.getItem(widgetStorageKey(siteId));
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed.position) setPosition(parsed.position);
      if (parsed.size) setSize(parsed.size);
    } catch {
      // ignore
    }
  }, [isMobile, siteId]);

  useEffect(() => {
    if (!isMobile || !siteId) return;
    try {
      const saved = localStorage.getItem(mobileWidgetStorageKey(siteId));
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed.height) setMobileHeight(parsed.height);
    } catch {
      // ignore
    }
  }, [isMobile, siteId]);

  useEffect(() => {
    if (!isMobile || adminMode) return;
    const handleResize = () => {
      const layoutHeight = window.innerHeight;
      if (window.visualViewport) {
        setViewportMetrics({
          visualHeight: window.visualViewport.height,
          offsetTop: window.visualViewport.offsetTop || 0,
          layoutHeight,
        });
      } else {
        setViewportMetrics({ visualHeight: layoutHeight, offsetTop: 0, layoutHeight });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, [isMobile, adminMode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchSiteConfig(supabase, siteId);
        if (cancelled) return;
        if (!data?.success) {
          setConfigError(data?.error ?? 'Failed to load chatbot config');
          setEnabled(forceMount);
          return;
        }
        const config = data.config;
        setEnabled(!!config.enabled);
        setChatbotName(config.chatbot_name ?? 'AI Assistant');
        const loadedAppearance = { ...DEFAULT_COLORS, ...(config.appearance ?? {}) };
        loadedAppearance.welcomeMessage = resolveWelcomeMessage(loadedAppearance.welcomeMessage);
        setAppearance(loadedAppearance);
        setConfigError(null);
      } catch (error) {
        if (!cancelled) {
          setConfigError(error.message ?? 'Failed to load chatbot config');
          setEnabled(forceMount);
        }
      } finally {
        if (!cancelled) {
          setConfigLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId, supabase, forceMount]);

  useEffect(() => {
    if (!isOpen) {
      sessionInitializedRef.current = false;
      return;
    }
    if (!sessionId && !sessionInitializedRef.current) {
      sessionInitializedRef.current = true;
      initializeSession();
    }
  }, [isOpen, sessionId, initializeSession]);

  useEffect(() => {
    if (!isOpen || !sessionId) return;
    if (historyLoadedSessionRef.current === sessionId) return;

    historyLoadedSessionRef.current = sessionId;

    loadHistory(sessionId).catch((error) => {
      console.error('Failed to hydrate chat history:', error);
    });
  }, [isOpen, sessionId, loadHistory]);

  useEffect(() => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.closest('.scc-chat-panel__messages');
      if (container) {
        container.scrollTop = container.scrollHeight;
      } else {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, loading, isOpen]);

  const saveWidgetState = (newPosition, newSize) => {
    if (isMobile || !siteId) return;
    try {
      localStorage.setItem(
        widgetStorageKey(siteId),
        JSON.stringify({ position: newPosition ?? position, size: newSize ?? size }),
      );
    } catch {
      // ignore
    }
  };

  const saveMobileHeight = useCallback(
    (height) => {
      if (!isMobile || !siteId) return;
      try {
        localStorage.setItem(mobileWidgetStorageKey(siteId), JSON.stringify({ height }));
      } catch {
        // ignore
      }
    },
    [isMobile, siteId],
  );

  const handleDragStop = (_e, point) => {
    const newPosition = { x: point.x, y: point.y };
    setPosition(newPosition);
    saveWidgetState(newPosition, null);
  };

  const handleResizeStop = (_e, _direction, ref, _delta, newPosition) => {
    const newSize = {
      width: parseInt(ref.style.width, 10),
      height: parseInt(ref.style.height, 10),
    };
    setSize(newSize);
    if (newPosition) {
      setPosition(newPosition);
      saveWidgetState(newPosition, newSize);
    } else {
      saveWidgetState(position, newSize);
    }
  };

  const handleMobileResizeMove = useCallback(
    (e) => {
      if (!isResizingMobile || !mobileResizeStartRef.current) return;
      const touch = e.touches ? e.touches[0] : e;
      const deltaY = touch.clientY - mobileResizeStartRef.current.startY;
      const newHeight = mobileResizeStartRef.current.startHeight - deltaY;
      const minHeight = mobileResizeViewportHeight * 0.3;
      const maxHeight = mobileResizeViewportHeight * 0.95;
      setMobileHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)));
    },
    [isResizingMobile, mobileResizeViewportHeight],
  );

  const handleMobileResizeEnd = useCallback(() => {
    if (!isResizingMobile) return;
    setIsResizingMobile(false);
    setMobileHeight((current) => {
      if (current) saveMobileHeight(current);
      return current;
    });
    document.body.style.userSelect = '';
    document.body.style.touchAction = '';
    mobileResizeStartRef.current = null;
  }, [isResizingMobile, saveMobileHeight]);

  const handleMobileResizeStart = useCallback(
    (e) => {
      if (!isMobile) return;
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches ? e.touches[0] : e;
      const currentHeight = mobileHeight || mobileResizeViewportHeight * 0.8;
      setIsResizingMobile(true);
      mobileResizeStartRef.current = { startY: touch.clientY, startHeight: currentHeight };
      document.body.style.userSelect = 'none';
      document.body.style.touchAction = 'none';
    },
    [isMobile, mobileHeight, mobileResizeViewportHeight],
  );

  useEffect(() => {
    if (!isMobile || !isResizingMobile) return;
    document.addEventListener('touchmove', handleMobileResizeMove, { passive: false });
    document.addEventListener('touchend', handleMobileResizeEnd);
    document.addEventListener('mousemove', handleMobileResizeMove);
    document.addEventListener('mouseup', handleMobileResizeEnd);
    return () => {
      document.removeEventListener('touchmove', handleMobileResizeMove);
      document.removeEventListener('touchend', handleMobileResizeEnd);
      document.removeEventListener('mousemove', handleMobileResizeMove);
      document.removeEventListener('mouseup', handleMobileResizeEnd);
    };
  }, [isMobile, isResizingMobile, handleMobileResizeMove, handleMobileResizeEnd]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading || !enabled || !sessionId) return;

    const currentMessage = inputMessage.trim();
    const assistantId = `asst_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    setInputMessage('');
    setLoading(true);

    addMessage({
      id: `user_${Date.now()}`,
      role: 'user',
      content: currentMessage,
      timestamp: new Date(),
    });

    addMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      streaming: true,
      timestamp: new Date(),
    });

    let accumulated = '';

    try {
      await streamChatMessage(supabaseUrl, supabaseAnonKey, {
        siteId,
        sessionId,
        message: currentMessage,
        routeContext: { pathname: effectiveRoutePath },
        onDelta: (text) => {
          accumulated += text;
          setLoading(false);
          updateMessageById(assistantId, (message) => ({
            ...message,
            content: message.content + text,
          }));
        },
      });

      const { displayContent, draftMessage } = parseContactFormTrigger(accumulated);
      updateMessageById(assistantId, {
        content: displayContent || accumulated,
        streaming: false,
      });

      if (draftMessage) {
        setInquiryDraft(draftMessage);
        setInquiryError(null);
        setInquiryOpen(true);
      }
    } catch (error) {
      console.error('Chat error:', error);
      updateMessageById(assistantId, {
        content: 'Sorry, something went wrong. Please try again.',
        streaming: false,
      });
    } finally {
      setLoading(false);
      finishMessageById(assistantId);
    }
  };

  const handleInquirySubmit = async (contactFormData) => {
    if (!sessionId) return;

    setInquirySubmitting(true);
    setInquiryError(null);

    try {
      const data = await submitChatInquiry(supabaseUrl, supabaseAnonKey, {
        siteId,
        sessionId,
        contactFormData,
        routeContext: { pathname: effectiveRoutePath },
      });

      setInquiryOpen(false);
      addMessage({
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      });
    } catch (error) {
      setInquiryError(error.message ?? 'Failed to send inquiry');
    } finally {
      setInquirySubmitting(false);
    }
  };

  const panelProps = {
    orgColors,
    chatbotName,
    messages,
    loading,
    inputMessage,
    setInputMessage,
    onSendMessage: handleSendMessage,
    onNewChat: startNewConversation,
    onClose: closeChat,
    adminMode,
    showNewChat: true,
    isMobile,
    inputRef,
    messagesEndRef,
    welcomeMessage: resolveWelcomeMessage(appearance.welcomeMessage),
    placeholder: appearance.placeholder ?? DEFAULT_COLORS.placeholder,
    onMobileResizeStart: handleMobileResizeStart,
    inquiryModal: {
      open: inquiryOpen,
      draftMessage: inquiryDraft,
      onClose: () => setInquiryOpen(false),
      onSubmit: handleInquirySubmit,
      submitting: inquirySubmitting,
      error: inquiryError,
    },
  };

  const shouldRender =
    adminMode || enabled || (forceMount && (!configLoaded || !!configError));

  if (!shouldRender) {
    if (configError) {
      console.warn('Site chatbot disabled:', configError);
    }
    return null;
  }

  return (
    <>
      {!isOpen && !adminMode && (
        <div
          className={`scc-chat-fab-anchor${
            fabHiddenByAnchor ? ' scc-chat-fab-anchor--hidden' : ''
          }`}
          aria-hidden={fabHiddenByAnchor}
        >
          <ChatFab onClick={openChat} accent={orgColors.primary} />
        </div>
      )}

      {isOpen && (
        <>
          {!isMobile && !adminMode ? (
            <DraggableChatbotWrapper
              position={position}
              size={size}
              onDragStop={handleDragStop}
              onResizeStop={handleResizeStop}
            >
              <ChatPanel {...panelProps} isMobile={false} />
            </DraggableChatbotWrapper>
          ) : (
            <div
              className={`scc-panel-shell ${
                adminMode
                  ? 'scc-panel-shell--fill'
                  : isMobile
                    ? `scc-panel-shell--mobile scc-panel-shell--mobile-viewport${
                        isKeyboardOpen ? ' scc-panel-shell--keyboard-open' : ''
                      }`
                    : 'scc-panel-shell--anchored'
              }`}
              style={{
                '--scc-fab-accent': orgColors.primary,
                ...(isMobile && !adminMode
                  ? isKeyboardOpen
                    ? {
                        top: `${viewportMetrics.offsetTop}px`,
                        bottom: 'auto',
                        height: `${viewportMetrics.visualHeight}px`,
                      }
                    : {
                        top: 'auto',
                        bottom: 0,
                        height: `${effectiveMobileHeight}px`,
                        maxHeight: `${viewportMetrics.layoutHeight * 0.95}px`,
                        minHeight: `${viewportMetrics.layoutHeight * 0.3}px`,
                      }
                  : {}),
              }}
            >
              <ChatPanel {...panelProps} />
            </div>
          )}
        </>
      )}
    </>
  );
}
