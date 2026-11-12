import { DEFAULT_THEME, LEGACY_PALETTE_COOKIE, MODES, THEMES, THEME_STORAGE_KEY } from "@/lib/ruleloop-palette";

// Read the preference before the first paint. The provider reads these same
// attributes on hydration, so it never reapplies a different initial palette.
const config = JSON.stringify({
  defaultTheme: DEFAULT_THEME,
  cookie: LEGACY_PALETTE_COOKIE,
  storage: THEME_STORAGE_KEY,
  themes: THEMES.map(({ id }) => id),
  modes: MODES,
});
const script = `
(function(c) {
  var root = document.documentElement;
  var theme = c.defaultTheme;
  var mode = 'system';
  var raw = null;
  try {
    raw = localStorage.getItem(c.storage);
    if (raw !== null) {
      var stored = JSON.parse(raw);
      if (stored && c.themes.includes(stored.theme)) theme = stored.theme;
      mode = stored && c.modes.includes(stored.mode) ? stored.mode : 'light';
    } else {
      var legacy = document.cookie.split('; ').find(function(pair) {
        return pair.startsWith(c.cookie + '=');
      });
      if (legacy === c.cookie + '=stone' || legacy === c.cookie + '=indigo') {
        theme = legacy.split('=')[1];
        localStorage.setItem(c.storage, JSON.stringify({ theme: theme, mode: mode }));
        document.cookie = c.cookie + '=; Max-Age=0; Path=/; SameSite=Lax';
      }
    }
  } catch {
    if (raw !== null) mode = 'light';
  }
  root.dataset.theme = theme;
  root.dataset.themeMode = mode;
  root.dataset.mode = theme === 'indigo' ? 'dark' : theme === 'stone' ? 'light' :
    mode === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode;
})(${config});
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
