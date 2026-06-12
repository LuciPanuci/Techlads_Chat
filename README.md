# site-context-chat

Markdown-backed **site chatbot** for static sites. Includes:

- **Draggable/resizable chat widget** (from production InstaBuild UX)
- **Supabase Edge Functions** (`site-chat`, `site-chat-admin`)
- **Server-side conversation threading** (`sessionId` + Postgres history)
- **Admin panel** for context, appearance, and model settings
- **BYOK Anthropic** — API key lives in Supabase secrets only

## Architecture

```
Visitor widget  →  site-chat (edge)  →  Anthropic API
                      ↑
              site_chat_context (markdown)
              site_chat_conversations (history by sessionId)
```

Threading: the widget sends **one message + sessionId**. The edge function loads recent history from the DB, calls Claude, then stores both turns.

## Setup

### 1. Supabase project

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy site-chat
supabase functions deploy site-chat-admin
```

### 2. Edge secrets

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set SITE_CHAT_ADMIN_SECRET=your-long-random-secret
```

`ANTHROPIC_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are available automatically in Edge Functions.

### 3. Run migration

Applies `site_chat_sites`, `site_chat_context`, `site_chat_conversations`, and RPCs. Seeds a `default` site.

### 4. Install package in your app

```bash
npm install site-context-chat @supabase/supabase-js
```

```jsx
import { ChatbotProvider, SiteChatWidget } from 'site-context-chat';
import 'site-context-chat/styles.css';

export function AppShell({ children }) {
  return (
    <ChatbotProvider
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL}
      supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
      siteId="default"
    >
      {children}
      <SiteChatWidget routePath={typeof window !== 'undefined' ? window.location.pathname : '/'} />
    </ChatbotProvider>
  );
}
```

### 5. Admin panel (private route)

```jsx
import { AdminPanel } from 'site-context-chat';
import 'site-context-chat/styles.css';

export default function ChatAdminPage() {
  return (
    <AdminPanel
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL}
      supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
      siteId="default"
    />
  );
}
```

Unlock with `SITE_CHAT_ADMIN_SECRET`, paste/import markdown context, save.

## Export site markdown

```bash
npx site-context-chat export ./content-docs ./context.md
```

Upload `context.md` via the admin **Context** tab.

## Smoke test

```bash
SUPABASE_URL=... SUPABASE_ANON_KEY=... npm run test:edge
# optional:
SITE_CHAT_ADMIN_SECRET=... npm run test:edge
```

## Edge API

### `site-chat` POST

| action | body | response |
|--------|------|----------|
| `config` | `{ siteId }` | public widget config |
| `history` | `{ siteId, sessionId }` | `{ messages[] }` for UI hydration |
| `chat` | `{ siteId, sessionId, message, routeContext? }` | `{ response }` |

Requires `Authorization: Bearer <SUPABASE_ANON_KEY>`.

### `site-chat-admin` POST

| action | headers | body |
|--------|---------|------|
| `get` | `x-admin-secret` | `{ siteId }` |
| `save` | `x-admin-secret` | `{ siteId, site, contextMarkdown }` |

## History enhancements

- UI hydration: `history` action on widget open
- Model window: last 20 messages sent to Claude
- `sessionId` persisted in `localStorage` per site

## WordPress

A frontend plugin lives in [`wordpress/`](wordpress/README.md). Build assets with `npm run build:wp`, zip `wordpress/site-context-chat/`, and install via **Plugins → Upload**.

**Backend tutorial (WP-friendly):** [docs/BACKEND-SETUP.md](docs/BACKEND-SETUP.md) — dashboard for SQL & secrets, CLI for function deploy.

## License

MIT
