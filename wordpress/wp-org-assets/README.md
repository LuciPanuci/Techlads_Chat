# WordPress.org assets

Ready for SVN `/assets/` after plugin approval. **Do not** bundle these inside the plugin zip.

## Branding (verified)

| File | Size | Status |
|------|------|--------|
| `icon-256x256.png` | 256×256 | ✓ |
| `icon-128x128.png` | 128×128 | ✓ |
| `banner-772x250.png` | 772×250 | ✓ |
| `banner-1544x500.png` | 1544×500 | ✓ |

Source SVGs (`banner-*.svg`) are for edits only — wordpress.org expects PNG.

## Screenshots

| File | Content |
|------|---------|
| `screenshot-1.png` | Frontend — chat widget open |
| `screenshot-2.png` | WP **Settings → Site Context Chat** (status + credentials) |
| `screenshot-3.png` | Chat admin — **Context** tab (markdown) |
| `screenshot-4.png` | Chat admin — **Settings** tab (model + prompt) |
| `screenshot-5.png` | Chat admin — **Activity** tab |
| `screenshot-6.png` | Chat admin — **Appearance** tab |

Captions match `wordpress/site-context-chat/readme.txt` **== Screenshots ==** section.

## SVN upload (after approval)

```bash
svn co https://plugins.svn.wordpress.org/site-context-chat svn-site-context-chat
cd svn-site-context-chat/assets
cp /path/to/wp-org-assets/*.png .
svn add *.png
svn commit -m "Add plugin icons, banners, and screenshots"
```

Plugin code goes in `trunk/` (contents of `wordpress/site-context-chat/`, not this folder).
