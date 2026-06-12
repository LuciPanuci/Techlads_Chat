/** Resolve WP / host theme setting to a concrete light|dark value. */
export function resolveTheme(theme) {
  const value = String(theme ?? 'dark').toLowerCase();
  if (value === 'light' || value === 'dark') {
    return value;
  }
  if (value === 'auto' && typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return 'dark';
}

/** Apply data-theme on a mount root; re-sync when OS theme changes (auto mode). */
export function applyThemeToRoot(element, themeSetting) {
  if (!element) {
    return () => {};
  }

  const setting = String(themeSetting ?? 'dark').toLowerCase();

  const sync = () => {
    element.setAttribute('data-theme', resolveTheme(setting));
  };

  sync();

  if (setting !== 'auto' || typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }

  const media = window.matchMedia('(prefers-color-scheme: light)');
  const onChange = () => sync();

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }

  media.addListener(onChange);
  return () => media.removeListener(onChange);
}
