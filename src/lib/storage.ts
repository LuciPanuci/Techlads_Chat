import { DEFAULT_CONFIG, STORAGE_KEY, type SiteChatConfig } from '../types';

export function loadConfig(): SiteChatConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_CONFIG };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<SiteChatConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      appearance: { ...DEFAULT_CONFIG.appearance, ...parsed.appearance },
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: SiteChatConfig): void {
  if (typeof window === 'undefined') return;
  const payload: SiteChatConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function exportConfigJson(config: SiteChatConfig): string {
  return JSON.stringify(
    {
      ...config,
      updatedAt: config.updatedAt || new Date().toISOString(),
    },
    null,
    2,
  );
}
