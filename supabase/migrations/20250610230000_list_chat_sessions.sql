-- Admin: list chat sessions with summary metadata
CREATE OR REPLACE FUNCTION list_site_chat_sessions(
  p_site_id text,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  session_id text,
  message_count bigint,
  user_message_count bigint,
  started_at timestamptz,
  last_at timestamptz,
  last_route_path text,
  preview text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.session_id,
    COUNT(*)::bigint AS message_count,
    COUNT(*) FILTER (WHERE c.role = 'user')::bigint AS user_message_count,
    MIN(c.created_at) AS started_at,
    MAX(c.created_at) AS last_at,
    (ARRAY_AGG(c.route_path ORDER BY c.message_sequence DESC))[1] AS last_route_path,
    (
      SELECT u.content
      FROM site_chat_conversations u
      WHERE u.site_id = p_site_id
        AND u.session_id = c.session_id
        AND u.role = 'user'
      ORDER BY u.message_sequence ASC
      LIMIT 1
    ) AS preview
  FROM site_chat_conversations c
  WHERE c.site_id = p_site_id
  GROUP BY c.session_id
  ORDER BY MAX(c.created_at) DESC
  LIMIT GREATEST(p_limit, 1);
$$;

REVOKE ALL ON FUNCTION list_site_chat_sessions(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_site_chat_sessions(text, integer) TO service_role;
