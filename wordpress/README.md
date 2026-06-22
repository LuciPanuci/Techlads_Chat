# Site Context Chat — WordPress plugin

Frontend-only WordPress wrapper around the React chat widget and admin panel.

**Backend setup:** embedded in **Settings → Site Context Chat → Setup guide** (full markdown: [docs/BACKEND-SETUP.md](../docs/BACKEND-SETUP.md)).

**WordPress.org submission:** `readme.txt` is in this folder; asset shot list: [docs/WORDPRESS-ORG-ASSETS.md](../docs/WORDPRESS-ORG-ASSETS.md).

## Build assets

From the package root:

```bash
npm install
npm run build:wp
```

This writes self-contained bundles to `wordpress/site-context-chat/assets/`:

- `widget.js` — public chat bubble
- `admin.js` — admin panel mount
- `site-context-chat.css` — shared styles

## Install in WordPress

1. Zip the `site-context-chat` folder inside `wordpress/` (the folder that contains `site-context-chat.php`).
2. WordPress admin → **Plugins → Add New → Upload Plugin** → activate.
3. **Settings → Site Context Chat** — paste Supabase URL and anon key.
4. Create a page (e.g. slug `chat-admin`) with shortcode:

   ```
   [techlads_chat_admin]
   ```

5. Use **Open chat admin** in plugin settings to manage context (unlock with `SITE_CHAT_ADMIN_SECRET`).

## Appearance (WordPress settings)

Under **Settings → Site Context Chat → Appearance**:

- **Theme** — Dark, Light, or Auto (follows visitor OS)

Brand colours and welcome message are configured in the chat admin panel (Supabase).

## Test checklist

- [ ] `npm run build:wp` completed without errors
- [ ] Plugin activated; settings saved
- [ ] Chat FAB appears on the frontend
- [ ] Sending a message hits your deployed `site-chat` edge function
- [ ] Admin page loads; secret unlock works; context saves

## Package for distribution

```bash
npm run build:wp
cd wordpress
zip -r site-context-chat.zip site-context-chat
```
