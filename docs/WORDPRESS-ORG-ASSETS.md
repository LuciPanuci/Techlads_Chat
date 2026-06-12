# WordPress.org — assets & screenshot checklist

Use this when submitting **Site Context Chat** to the [WordPress Plugin Directory](https://wordpress.org/plugins/developers/).

Replace `lucipanuci` in `readme.txt` **Contributors** with your wordpress.org username before submit.

---

## Folder layout (after approval)

WordPress.org uses SVN. Assets live in `/assets/` (not inside the plugin zip):

```
site-context-chat/
├── assets/
│   ├── icon-256x256.png
│   ├── icon-128x128.png
│   ├── banner-772x250.png
│   ├── banner-1544x500.png    (optional, retina banner)
│   ├── screenshot-1.png
│   ├── screenshot-2.png
│   ├── screenshot-3.png
│   ├── screenshot-4.png
│   └── screenshot-5.png
└── trunk/
    └── (plugin files — same as wordpress/site-context-chat/)
```

Plugin code goes in `trunk/`. Tag releases as `tags/0.1.5/`.

---

## Required images

### Plugin icon (required for a polished listing)

| File | Size | Notes |
|------|------|--------|
| `icon-256x256.png` | 256 × 256 px | Square, PNG, no rounded corners (WP applies mask) |
| `icon-128x128.png` | 128 × 128 px | Same design, smaller |

**Shot ideas:** Teal + orange chat bubble (TechLads colours), minimal “speech + spark” mark, or letter **D** for Dalia. Keep it readable at 128px.

---

### Plugin banner (highly recommended)

| File | Size | Notes |
|------|------|--------|
| `banner-772x250.png` | 772 × 250 px | Standard banner on plugin page |
| `banner-1544x500.png` | 1544 × 500 px | Optional 2× for retina |

**Draft SVGs (edit or export to PNG):**

| File | Path |
|------|------|
| Banner 772×250 | `wordpress/wp-org-assets/banner-772x250.svg` |
| Banner 1544×500 | `wordpress/wp-org-assets/banner-1544x500.svg` |
| Icon 256×256 | `wordpress/wp-org-assets/icon-256x256.svg` |
| Icon 128×128 | `wordpress/wp-org-assets/icon-128x128.svg` |

Export PNG for wordpress.org (SVN requires PNG/JPEG for assets):

```bash
# macOS — open SVG in browser, screenshot, or use Inkscape:
inkscape banner-772x250.svg --export-filename=banner-772x250.png -w 772 -h 250
inkscape banner-1544x500.svg --export-filename=banner-1544x500.png -w 1544 -h 500
inkscape icon-256x256.svg --export-filename=icon-256x256.png -w 256 -h 256
inkscape icon-128x128.svg --export-filename=icon-128x128.png -w 128 -h 128
```

Banner copy: **Site Context Chat** · *Your content. Your Claude key. Your data.* · pills: Open Source · BYOK · Supabase · Claude. Dark teal background, robot mark on the right.

---

## Screenshots (plugin page gallery)

**Format:** PNG or JPEG  
**Recommended width:** 1200–1600 px (4:3 or 16:10)  
**Naming:** `screenshot-1.png` … `screenshot-5.png` (order matches `readme.txt`)

Capture on a **clean site** (default Twenty Twenty-Five theme or your Lusto site with minimal distractions). Hide admin bar on frontend shots if possible.

### Screenshot 1 — Frontend widget (hero shot)

**What to capture:** Public page with **chat launcher** visible (bottom-right).

**Optional second frame:** Same page with **panel open** showing welcome message + one exchange.

**Caption (readme):** Chat widget on the frontend

**Tips:** Use dark or light theme — pick whichever looks best. Avoid overlapping other chat plugins.

---

### Screenshot 2 — Plugin settings (connected)

**What to capture:** **Settings → Site Context Chat** with:

- Green status checks (credentials saved, widget enabled)
- Supabase URL + anon key filled (blur anon key middle if you prefer)
- Theme dropdown visible

**Caption:** Plugin settings — connection and status

---

### Screenshot 3 — Setup guide

**What to capture:** Same settings page, scrolled to **Setup guide** with **Part 2 — Backend** expanded (SQL + secrets + CLI block visible).

**Caption:** Embedded backend setup guide

---

### Screenshot 4 — Chat admin unlock

**What to capture:** Frontend `/chat-admin` page — **unlock screen** (“Enter your SITE_CHAT_ADMIN_SECRET”).

**Caption:** Chat admin — secure unlock

Do not show the real secret in the screenshot.

---

### Screenshot 5 — Chat admin Context tab

**What to capture:** Unlocked admin → **Context** tab with sample markdown (generic “Services / FAQ” text, not client confidential data).

**Caption:** Train the bot with markdown site context

**Bonus tabs** (optional screenshot-6): **Appearance** or **Activity** if you want a sixth image later.

---

## Optional extras (not required)

| Asset | Use |
|-------|-----|
| `screenshot-6.png` | Admin **Test** tab with widget preview |
| `screenshot-7.png` | **Appearance** — light theme on frontend |
| Video/GIF | Not hosted on wp.org; link from GitHub README instead |

---

## Asset inventory (ready)

All PNGs live in `wordpress/wp-org-assets/`. See that folder’s `README.md` for the file list.

```
Branding
[x] icon-256x256.png (256×256)
[x] icon-128x128.png (128×128)
[x] banner-772x250.png (772×250)
[x] banner-1544x500.png (1544×500)

Screenshots
[x] screenshot-1.png — Frontend chat open
[x] screenshot-2.png — WP plugin settings
[x] screenshot-3.png — Chat admin Context
[x] screenshot-4.png — Chat admin Settings
[x] screenshot-5.png — Chat admin Activity
[x] screenshot-6.png — Chat admin Appearance
```

**Optional later:** setup guide expanded, admin unlock screen (not required for submit).

---

## Submission checklist (after assets ready)

1. [ ] Create/login [wordpress.org](https://login.wordpress.org) account
2. [ ] Update `Contributors:` in `readme.txt` to your WP username
3. [ ] [Submit plugin](https://wordpress.org/plugins/developers/add/) — upload zip of `site-context-chat` folder only
4. [ ] Wait for review email (often 1–3+ weeks)
5. [ ] On approval: SVN access → copy `trunk/`, upload `assets/`, tag `0.1.5`
6. [ ] Verify plugin page screenshots and banner render correctly

---

## readme.txt ↔ screenshot mapping

Defined in `wordpress/site-context-chat/readme.txt`:

1. Frontend chat widget  
2. WordPress plugin settings  
3. Chat admin — Context  
4. Chat admin — Settings  
5. Chat admin — Activity  
6. Chat admin — Appearance  
