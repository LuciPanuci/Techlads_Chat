-- site-context-chat: schema for markdown-backed site chatbot

CREATE TABLE IF NOT EXISTS site_chat_sites (
  id text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  chatbot_name text NOT NULL DEFAULT 'AI Assistant',
  business_name text NOT NULL DEFAULT '',
  appearance jsonb NOT NULL DEFAULT '{
    "primary": "#5DA399",
    "primaryDark": "#0F766E",
    "secondary": "#F29F05",
    "accent": "#F29F05",
    "welcomeMessage": "Hi! How can I help you today?",
    "placeholder": "Type your message..."
  }'::jsonb,
  model text NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  max_tokens integer NOT NULL DEFAULT 1024,
  system_prompt_extra text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_chat_context (
  site_id text PRIMARY KEY REFERENCES site_chat_sites(id) ON DELETE CASCADE,
  context_markdown text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL REFERENCES site_chat_sites(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  message_sequence integer NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  route_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_chat_conversations_unique_sequence UNIQUE (site_id, session_id, message_sequence)
);

CREATE INDEX IF NOT EXISTS idx_site_chat_conversations_session
  ON site_chat_conversations (site_id, session_id, message_sequence);

CREATE OR REPLACE FUNCTION get_site_chat_history(
  p_site_id text,
  p_session_id text,
  p_limit integer DEFAULT 40
)
RETURNS TABLE (
  role text,
  content text,
  message_sequence integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT recent.role, recent.content, recent.message_sequence, recent.created_at
  FROM (
    SELECT c.role, c.content, c.message_sequence, c.created_at
    FROM site_chat_conversations c
    WHERE c.site_id = p_site_id
      AND c.session_id = p_session_id
    ORDER BY c.message_sequence DESC
    LIMIT GREATEST(p_limit, 1)
  ) recent
  ORDER BY recent.message_sequence ASC;
$$;

CREATE OR REPLACE FUNCTION get_site_chat_user_message_count(
  p_site_id text,
  p_session_id text
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM site_chat_conversations
  WHERE site_id = p_site_id
    AND session_id = p_session_id
    AND role = 'user';
$$;

CREATE OR REPLACE FUNCTION touch_site_chat_site_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS site_chat_sites_updated_at ON site_chat_sites;
CREATE TRIGGER site_chat_sites_updated_at
  BEFORE UPDATE ON site_chat_sites
  FOR EACH ROW
  EXECUTE FUNCTION touch_site_chat_site_updated_at();

DROP TRIGGER IF EXISTS site_chat_context_updated_at ON site_chat_context;
CREATE TRIGGER site_chat_context_updated_at
  BEFORE UPDATE ON site_chat_context
  FOR EACH ROW
  EXECUTE FUNCTION touch_site_chat_site_updated_at();

ALTER TABLE site_chat_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_chat_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_chat_conversations ENABLE ROW LEVEL SECURITY;

-- Public can read enabled site metadata (no markdown context).
CREATE POLICY site_chat_sites_public_read
  ON site_chat_sites FOR SELECT
  USING (enabled = true);

-- Edge functions use service role; no public write policies by default.
REVOKE ALL ON site_chat_context FROM anon, authenticated;
REVOKE ALL ON site_chat_conversations FROM anon, authenticated;

GRANT SELECT ON site_chat_sites TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_site_chat_history(text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION get_site_chat_user_message_count(text, text) TO service_role;

INSERT INTO site_chat_sites (id, chatbot_name, business_name)
VALUES ('default', 'AI Assistant', 'our team')
ON CONFLICT (id) DO NOTHING;

INSERT INTO site_chat_context (site_id, context_markdown)
VALUES ('default', '# Site context\n\nAdd markdown content via the admin panel or SQL.')
ON CONFLICT (site_id) DO NOTHING;
