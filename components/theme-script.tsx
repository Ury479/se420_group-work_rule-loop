export function ThemeScript() {
  const script = `
(function() {
  try {
    const stored = localStorage.getItem('ruleloop.theme.v2');
    if (!stored) {
      document.documentElement.setAttribute('data-theme', 'graphite');
      document.documentElement.setAttribute('data-mode', 'light');
      return;
    }
    const parsed = JSON.parse(stored);
    const validThemes = ['graphite', 'petrol', 'wine'];
    const validModes = ['light', 'dark', 'system'];
    const theme = validThemes.includes(parsed.theme) ? parsed.theme : 'graphite';
    let mode = validModes.includes(parsed.mode) ? parsed.mode : 'light';
    if (mode === 'system') {
      mode = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-mode', mode);
  } catch {
    document.documentElement.setAttribute('data-theme', 'graphite');
    document.documentElement.setAttribute('data-mode', 'light');
  }
})();
`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
