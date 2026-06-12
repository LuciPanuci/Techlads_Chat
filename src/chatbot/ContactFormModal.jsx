import React, { useEffect, useState } from 'react';
import { FaPaperPlane, FaSpinner, FaTimes } from 'react-icons/fa';

export default function ContactFormModal({
  open,
  draftMessage,
  onClose,
  onSubmit,
  submitting,
  error,
  accent = '#5DA399',
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setMessage(draftMessage ?? '');
    setName('');
    setEmail('');
    setPhone('');
  }, [open, draftMessage]);

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      message: message.trim(),
    });
  };

  return (
    <div className="scc-inquiry-modal" role="dialog" aria-modal="true" aria-labelledby="scc-inquiry-title">
      <button type="button" className="scc-inquiry-modal__backdrop" onClick={onClose} aria-label="Close" />
      <div className="scc-inquiry-modal__card" style={{ '--scc-fab-accent': accent }}>
        <div className="scc-inquiry-modal__header">
          <div>
            <h4 id="scc-inquiry-title" className="scc-inquiry-modal__title">
              Send your inquiry
            </h4>
            <p className="scc-inquiry-modal__lead">
              We&apos;ll pass this to the team. Review the message, add your details, and send.
            </p>
          </div>
          <button type="button" className="scc-chat-panel__icon-btn" onClick={onClose} aria-label="Close">
            <FaTimes className="scc-icon-sm" />
          </button>
        </div>

        <form className="scc-inquiry-modal__form" onSubmit={handleSubmit}>
          <div className="scc-inquiry-modal__row">
            <label className="scc-inquiry-modal__field">
              <span>Name</span>
              <input
                className="scc-chat-panel__input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="scc-inquiry-modal__field">
              <span>Email</span>
              <input
                className="scc-chat-panel__input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
          </div>

          <label className="scc-inquiry-modal__field">
            <span>Phone (optional)</span>
            <input
              className="scc-chat-panel__input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </label>

          <label className="scc-inquiry-modal__field">
            <span>Message</span>
            <textarea
              className="scc-chat-panel__input scc-inquiry-modal__textarea"
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>

          {error ? <p className="scc-inquiry-modal__error">{error}</p> : null}

          <div className="scc-inquiry-modal__actions">
            <button type="button" className="scc-inquiry-modal__cancel" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="scc-inquiry-modal__submit" disabled={submitting}>
              {submitting ? (
                <FaSpinner className="scc-spinner scc-icon-md" />
              ) : (
                <>
                  <FaPaperPlane className="scc-icon-sm" />
                  Send inquiry
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
