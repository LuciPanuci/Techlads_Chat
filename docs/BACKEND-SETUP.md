# Site Context Chat — setup guide

Get the WordPress plugin installed first (a few minutes), then connect your backend (one-time, ~30–45 minutes).

**The plugin is the easy part.** The chatbot won’t reply until the Supabase backend is connected — but you can install everything in WordPress while you work through Part 2.

---

## Overview

| Part | What | Time |
|------|------|------|
| **1** | Install the WordPress plugin | ~5 min |
| **2** | Set up Supabase + Claude (backend) | ~30–45 min |
| **3** | Connect WordPress to your backend | ~5 min |
| **4** | Train your chatbot (content) | ~15 min |

---

## Part 1 — Install the WordPress plugin

### 1. Download and install

1. Get `site-context-chat.zip` from the [GitHub releases](https://github.com/LuciPanuci/Techlads_Chat) page (or build it from the repo).
2. WordPress admin → **Plugins → Add New → Upload Plugin**.
3. Choose the zip → **Install Now** → **Activate**.

<!-- screenshot: wp-plugin-upload.png -->

### 2. Create the admin page

1. **Pages → Add New** → title e.g. **Chat Admin**.
2. Set the slug to `chat-admin` (or note your slug for plugin settings later).
3. Add a **Shortcode** block (not a plain paragraph) containing:

   ```
   [techlads_chat_admin]
   ```

4. **Publish**.

<!-- screenshot: wp-admin-page-shortcode.png -->

### 3. Open plugin settings (credentials come in Part 3)

1. **Settings → Site Context Chat**.
2. Skim the page — you’ll paste your Supabase URL and anon key here after Part 2.
3. Optional now: pick **Theme** (Dark / Light / Auto) on the settings page.

<!-- screenshot: wp-plugin-settings-empty.png -->

You’re done with Part 1. The chat button won’t work yet — that’s expected until the backend is live.

---

## Part 2 — Backend setup (Supabase + Claude)

This powers the AI: conversation history, your site content, and Claude. You own the project and the API bill (BYOK).

### Dashboard vs CLI — what we recommend

| Step | Easiest method | Why |
|------|----------------|-----|
| Create Supabase project | **Dashboard** | Point and click |
| Copy URL + anon key | **Dashboard** | Settings → API |
| Database tables | **Dashboard** (SQL Editor) | Paste SQL, click Run |
| Edge Function secrets | **Dashboard** | Project Settings → Edge Functions → Secrets |
| Deploy edge functions | **CLI** (copy-paste commands) | Functions share helper files; CLI deploys the whole folder reliably |

**Bottom line:** use the **dashboard for almost everything**. For deploying functions, run **a few terminal commands once** (or ask your developer/host to do Step 2.4 only).

> **No terminal at all?** See [Appendix: dashboard-only function deploy](#appendix-dashboard-only-function-deploy-harder).

### What you need

- [ ] [Supabase](https://supabase.com) account
- [ ] [Anthropic](https://console.anthropic.com) account + API key (`sk-ant-…`)
- [ ] A long random **admin secret** (password manager → generate 32+ chars)
- [ ] For function deploy only: [Supabase CLI](https://supabase.com/docs/guides/cli) **or** someone who can run commands for you
- [ ] This repo on your computer (Download ZIP from GitHub, or `git clone`)

Optional (inquiry emails):

- [ ] [Resend](https://resend.com) API key + notification email

---

### Step 2.1 — Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Pick an organisation, name, database password, and region (closest to your visitors).
3. Wait until the project status is **Active**.

<!-- screenshot: supabase-new-project.png -->

**Save these — you’ll need them in Part 3:**

| Item | Where to find it |
|------|------------------|
| **Project URL** | Settings → API → Project URL (`https://xxxx.supabase.co`) |
| **Anon public key** | Settings → API → `anon` `public` |
| **Project ref** | Settings → General → Reference ID (e.g. `abcdefghijklmnop`) |

> Never put the **service_role** key in WordPress or the browser. Edge functions use it automatically on the server.

---

### Step 2.2 — Run database migrations (SQL Editor)

1. Supabase dashboard → **SQL Editor** → **New query**.
2. From this repo, open each migration file **in order**, paste, and click **Run**:

| Order | File |
|-------|------|
| 1 | `supabase/migrations/20250610000000_site_context_chat.sql` |
| 2 | `supabase/migrations/20250610120000_site_chat_inquiries.sql` |
| 3 | `supabase/migrations/20250610220000_update_welcome_message.sql` |
| 4 | `supabase/migrations/20250610230000_list_chat_sessions.sql` |

<!-- screenshot: supabase-sql-editor-run.png -->

**Check it worked:**

- **Table Editor** → `site_chat_sites`, `site_chat_context`, `site_chat_conversations`, `site_chat_inquiries`
- `site_chat_sites` has one row: `id = default`

---

### Step 2.3 — Set Edge Function secrets (Dashboard)

1. Dashboard → **Project Settings** → **Edge Functions** → **Secrets**.
2. Add:

| Secret name | Value | Required |
|-------------|-------|----------|
| `ANTHROPIC_API_KEY` | Your Claude API key (`sk-ant-…`) | Yes |
| `SITE_CHAT_ADMIN_SECRET` | Long random string you choose | Yes |
| `RESEND_API_KEY` | Resend API key | No (email notifications) |
| `SITE_CHAT_NOTIFY_EMAIL` | Email that receives inquiries | No |
| `SITE_CHAT_FROM_EMAIL` | Verified sender in Resend | No |

<!-- screenshot: supabase-edge-secrets.png -->

**Write down `SITE_CHAT_ADMIN_SECRET`** — you’ll enter it in the chat admin UI (Part 3).

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically; do **not** set those manually.

---

### Step 2.4 — Deploy edge functions (CLI)

From the folder that contains `supabase/` (the `site-context-chat` package root).

**Install CLI (once per computer)**

macOS:

```bash
brew install supabase/tap/supabase
```

Windows / other: [Supabase CLI install](https://supabase.com/docs/guides/cli/getting-started).

**Log in, link, deploy**

```bash
cd path/to/site-context-chat

supabase login

supabase link --project-ref YOUR_PROJECT_REF

supabase db push
supabase functions deploy site-chat
supabase functions deploy site-chat-admin
```

Replace `YOUR_PROJECT_REF` with the Reference ID from Step 2.1.

<!-- screenshot: terminal-supabase-link.png -->
<!-- screenshot: terminal-functions-deploy.png -->

If `db push` says migrations are already applied (from Step 2.2), that’s fine.

**Smoke test (optional)**

```bash
export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
npm run test:edge
```

With admin check:

```bash
export SITE_CHAT_ADMIN_SECRET="your-admin-secret"
npm run test:edge
```

Expect: `✅ Edge smoke test passed`.

---

## Part 3 — Connect WordPress to your backend

Back to **Settings → Site Context Chat**:

1. **Supabase URL** — Project URL from Step 2.1  
2. **Supabase anon key** — anon public key  
3. **Site ID** — `default`  
4. **Enable widget** — checked  
5. **Admin page slug** — `chat-admin` (or your slug from Part 1)  
6. **Save Changes** — status checks should show green  

<!-- screenshot: wp-plugin-settings.png -->

**Test the widget**

1. Open your public site (hard refresh: `Cmd+Shift+R`).
2. Chat button should appear bottom-right.
3. Send a test message — you should get a reply from Claude.

**Test the admin**

1. **Settings → Open chat admin ↗** (or visit `/chat-admin`).
2. Enter your `SITE_CHAT_ADMIN_SECRET` → unlock.
3. Open the **Test** tab and send a message.

<!-- screenshot: wp-chat-admin-unlock.png -->

---

## Part 4 — Train your chatbot (content)

1. Gather site copy as markdown (services, FAQs, how you work).
2. Chat admin → **Context** → paste or import `.md` → **Save**.
3. **Appearance** → colours and welcome message.
4. **Test** tab again before announcing it live.

Bundle markdown from a folder (optional, from a machine with Node):

```bash
npx site-context-chat export ./your-content-folder ./context.md
```

Paste `context.md` into the admin **Context** tab.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| No chat button | Widget disabled or no credentials saved | Part 3 — enable + save URL/key |
| Button but chat errors | Functions not deployed | Part 2, Step 2.4 |
| `ANTHROPIC_API_KEY not configured` | Missing secret | Part 2, Step 2.3 |
| Admin stuck on “Loading…” | Old plugin JS cached | Reinstall zip, hard refresh |
| Admin won’t unlock | Wrong admin secret | Match Part 2, Step 2.3 exactly |
| `process is not defined` | Outdated plugin zip | Use latest `site-context-chat.zip` |
| 401 / CORS errors | Wrong anon key | Re-copy from Supabase Settings → API |

**Browser check:** DevTools → Network → filter `site-chat` → read the response body.

---

## Appendix: dashboard-only function deploy (harder)

Only if you **cannot** run the CLI.

Functions share code under `supabase/functions/_shared/`. The dashboard does not deploy that folder structure automatically — you’d paste and wire up each file by hand.

We recommend the CLI for Step 2.4 even if everything else is dashboard-based.

---

## Quick checklist

```
Part 1 — WordPress
[ ] Plugin installed + activated
[ ] Admin page published with [techlads_chat_admin] shortcode block

Part 2 — Backend
[ ] Supabase project created
[ ] SQL migrations run (4 files)
[ ] Secrets: ANTHROPIC_API_KEY, SITE_CHAT_ADMIN_SECRET
[ ] CLI: supabase link + functions deploy (x2)

Part 3 — Connect
[ ] WP settings: URL + anon key + widget enabled
[ ] Live test: chat reply on public site
[ ] Admin unlocks with SITE_CHAT_ADMIN_SECRET

Part 4 — Content
[ ] Context markdown saved
[ ] Appearance / theme set
[ ] Final test before go-live
```

---

## Costs (rough)

- **Supabase free tier** — enough for small business traffic to start  
- **Anthropic** — pay per message (your API key, your bill)  
- **Resend** — free tier for low email volume  

No traffic is routed through TechLads servers — you own the stack.
