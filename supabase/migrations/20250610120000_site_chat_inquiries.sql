-- Inquiries submitted via the site chatbot contact form

CREATE TABLE IF NOT EXISTS site_chat_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL REFERENCES site_chat_sites(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL DEFAULT '',
  message text NOT NULL,
  route_path text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_chat_inquiries_site_created
  ON site_chat_inquiries (site_id, created_at DESC);

ALTER TABLE site_chat_inquiries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON site_chat_inquiries FROM anon, authenticated;
