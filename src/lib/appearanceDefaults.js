export const CANONICAL_WELCOME_MESSAGE =
  "Tell me what you're working on — I'll gather the details and pass them to our team.";

const STALE_WELCOME_MESSAGES = new Set([
  'Hi! How can I help you today?',
  'Hi — ask me about our services, projects, or how we work.',
  'Ask me about our services, projects, or how we work.',
  'How can I help you today?',
]);

export function resolveWelcomeMessage(stored) {
  const trimmed = typeof stored === 'string' ? stored.trim() : '';
  if (!trimmed || STALE_WELCOME_MESSAGES.has(trimmed)) {
    return CANONICAL_WELCOME_MESSAGE;
  }
  return trimmed;
}
