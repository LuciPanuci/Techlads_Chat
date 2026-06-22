import { createRoot } from 'react-dom/client';
import { AdminPanel } from './index.js';
import { applyThemeToRoot } from './lib/theme.js';
import './styles.css';

function mountAdmin() {
  const root = document.getElementById('scc-admin-root');
  const config = window.techladsAdminConfig;

  if (!root) {
    return;
  }

  if (!config?.url || !config?.anonKey) {
    root.innerHTML =
      '<p style="padding:1rem;border:1px solid #c00;background:#fff5f5;">Site Context Chat: Supabase URL and anon key are missing. Check Settings → Site Context Chat.</p>';
    return;
  }

  applyThemeToRoot(root, config.theme);

  createRoot(root).render(
    <AdminPanel
      supabaseUrl={config.url}
      supabaseAnonKey={config.anonKey}
      siteId={config.siteId || 'default'}
    />,
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAdmin);
} else {
  mountAdmin();
}
