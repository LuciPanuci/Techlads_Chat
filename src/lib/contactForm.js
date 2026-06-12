const CONTACT_FORM_TRIGGER_RE = /\[CONTACT_FORM_TRIGGER:([\s\S]*?)\]/;

export function parseContactFormTrigger(content) {
  const match = content.match(CONTACT_FORM_TRIGGER_RE);
  if (!match) {
    return { displayContent: content, draftMessage: null };
  }

  return {
    displayContent: content.replace(CONTACT_FORM_TRIGGER_RE, '').trim(),
    draftMessage: match[1].trim(),
  };
}
