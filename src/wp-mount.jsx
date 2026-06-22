import { createRoot } from 'react-dom/client';
import { ChatbotProvider, SiteChatWidget } from './index.js';
import { applyThemeToRoot } from './lib/theme.js';
import './styles.css';

function mountWidget() {
  const root = document.getElementById('scc-root');
  const config = window.techladsWidgetConfig;

  if (!root || !config?.url || !config?.anonKey) {
    return;
  }

  applyThemeToRoot(root, config.theme);

  const hideFabWhenSelector = config.hideFabSelector?.trim() || undefined;

  createRoot(root).render(
    <ChatbotProvider
      supabaseUrl={config.url}
      supabaseAnonKey={config.anonKey}
      siteId={config.siteId || 'default'}
    >
      <SiteChatWidget
        routePath={window.location.pathname}
        hideFabWhenSelector={hideFabWhenSelector}
        forceMount
      />
    </ChatbotProvider>,
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountWidget);
} else {
  mountWidget();
}
