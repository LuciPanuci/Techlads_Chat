-- Replace legacy welcome copy with discovery/handoff messaging
UPDATE site_chat_sites
SET
  appearance = jsonb_set(
    appearance,
    '{welcomeMessage}',
    to_jsonb(
      'Tell me what you''re working on — I''ll gather the details and pass them to our team.'::text
    )
  ),
  updated_at = now()
WHERE appearance->>'welcomeMessage' IN (
  'Hi! How can I help you today?',
  'Hi — ask me about our services, projects, or how we work.',
  'Ask me about our services, projects, or how we work.',
  'How can I help you today?'
);
