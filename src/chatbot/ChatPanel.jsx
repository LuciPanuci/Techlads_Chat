import React from 'react';
import { FaPaperPlane, FaPlus, FaSpinner, FaTimes } from 'react-icons/fa';
import ChatBubbleIcon from './ChatBubbleIcon';
import ContactFormModal from './ContactFormModal';
import LoadingSpinner from './LoadingSpinner';

export default function ChatPanel({
  orgColors,
  chatbotName,
  messages,
  loading,
  inputMessage,
  setInputMessage,
  onSendMessage,
  onNewChat,
  onClose,
  adminMode,
  showNewChat,
  isMobile,
  inputRef,
  messagesEndRef,
  onInputFocus,
  onInputBlur,
  onMobileResizeStart,
  welcomeMessage,
  placeholder,
  inquiryModal,
}) {
  const isStreaming = messages.some((message) => message.streaming);
  const showLoadingSpinner = loading && !isStreaming;

  return (
    <div
      className="scc-chat-panel"
      style={{ '--scc-fab-accent': orgColors.primary }}
    >
      <div
        className={`scc-chat-panel__header chatbot-header-drag-handle${
          isMobile ? ' scc-chat-panel__header--mobile' : ''
        }`}
        onTouchStart={onMobileResizeStart}
        onMouseDown={isMobile ? onMobileResizeStart : undefined}
        title={isMobile ? 'Drag to resize' : 'Drag to move'}
      >
        <div className="scc-chat-panel__header-main">
          <div className="scc-chat-panel__grip" aria-hidden>
            <span />
            <span />
          </div>
        </div>
        <div className="scc-chat-panel__header-actions">
          {showNewChat && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNewChat();
              }}
              className="scc-chat-panel__icon-btn"
              title="Start new chat"
            >
              <FaPlus className="scc-icon-sm" />
            </button>
          )}
          {!adminMode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="scc-chat-panel__icon-btn"
              aria-label="Close chat"
            >
              <FaTimes className="scc-icon-sm" />
            </button>
          )}
        </div>
      </div>

      <div
        className="scc-chat-panel__messages"
        onWheel={(e) => {
          const container = e.currentTarget;
          const canScrollUp = container.scrollTop > 0;
          const canScrollDown =
            container.scrollTop < container.scrollHeight - container.clientHeight;
          if ((canScrollUp && e.deltaY < 0) || (canScrollDown && e.deltaY > 0)) {
            e.stopPropagation();
          }
        }}
      >
        {messages.length === 0 ? (
          <div className="scc-chat-panel__welcome">
            <ChatBubbleIcon className="scc-chat-panel__welcome-icon" />
            <p className="scc-chat-panel__welcome-title">Hi, I&apos;m {chatbotName}.</p>
            <p className="scc-chat-panel__welcome-body">{welcomeMessage}</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id ?? `${message.role}-${index}`}
              className={`scc-chat-panel__row scc-chat-panel__row--${message.role}`}
            >
              <div className={`scc-chat-panel__bubble scc-chat-panel__bubble--${message.role}`}>
                <p className="scc-chat-panel__bubble-text">
                  {message.content}
                  {message.streaming && <span className="scc-chat-panel__cursor">▍</span>}
                </p>
                {message.timestamp && !message.streaming && (
                  <p className="scc-chat-panel__bubble-time">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          ))
        )}

        {showLoadingSpinner && (
          <div className="scc-chat-panel__row scc-chat-panel__row--assistant">
            <div className="scc-chat-panel__bubble scc-chat-panel__bubble--assistant scc-chat-panel__bubble--typing">
              <LoadingSpinner size="sm" color={orgColors.primary} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div
        ref={inputRef}
        className={`scc-chat-panel__composer${isMobile ? ' scc-chat-panel__composer--mobile' : ''}`}
      >
        <div className="scc-chat-panel__composer-row">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
            placeholder={placeholder}
            disabled={loading}
            className="scc-chat-panel__input"
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
          <button
            type="button"
            onClick={onSendMessage}
            disabled={loading || !inputMessage.trim()}
            className="scc-chat-panel__send"
            aria-label="Send message"
          >
            {loading ? <FaSpinner className="scc-spinner scc-icon-md" /> : <FaPaperPlane className="scc-icon-sm" />}
          </button>
        </div>
      </div>

      {inquiryModal ? (
        <ContactFormModal
          open={inquiryModal.open}
          draftMessage={inquiryModal.draftMessage}
          onClose={inquiryModal.onClose}
          onSubmit={inquiryModal.onSubmit}
          submitting={inquiryModal.submitting}
          error={inquiryModal.error}
          accent={orgColors.primary}
        />
      ) : null}
    </div>
  );
}
