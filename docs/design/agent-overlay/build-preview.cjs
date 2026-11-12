// Design-only renderer. Reads existing components; never opens a database or model connection.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const req = Module.createRequire(path.join(root, 'package.json'));
const React = req('react');
const { renderToStaticMarkup: render } = req('react-dom/server');
const ts = req('typescript');
const h = React.createElement;
const output = __dirname;
const actionFirst = process.argv.includes('--action-first');
const cache = new Map();
const consumed = new Set();

// Transcribed from the user's visible event detail on 2026-10-31.
// IDs/dates beyond the visible case are preview identifiers, never production write targets.
const fixture = {
  eventCase: { id: 3, title: 'vibe coding 5h', eventType: 'study', scene: 'classroom',
    itemName: null, status: 'searching', createdAt: new Date('2026-10-31T00:00:00Z'),
    searchMinutes: 0, moneyLoss: 0, impactLevel: 'normal' },
  reviews: [{ whatHappened: 'coding 5h,思路混乱，缺乏灵感', whyNotDiscovered: '想法模糊',
    rootCause: 'leaving_without_checking', prevention: '用 AI 进行苏格拉底提问法进行提问',
    systemRule: '启用 grill me skills 进行排查，收敛方向' }],
  rules: [{ id: 'preview-candidate', status: 'candidate', ruleText: '启用 grill me skills 进行排查，收敛方向' }],
  related: [],
};
const link = ({ href, children, ...props }) => h('a', { href, ...props }, children);
const button = ({ children }) => h('button', { type: 'button', className: 'preview-translate', title: '原有语言入口，仅展示' }, children || 'EN');
const actionStubs = new Proxy({}, { get: (_, key) => {
  if (key === 'getEventCase') return async () => fixture;
  if (key === 'getCards') return async () => [];
  return () => { throw new Error('Design preview forbids business actions: ' + String(key)); };
}});

function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  consumed.add(path.relative(root, file));
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  function localRequire(name) {
    if (name === 'next/link') return { __esModule: true, default: link };
    if (name === 'next/navigation') return { usePathname: () => actionFirst ? '/arm' : '/event-library/3', useRouter: () => ({}), notFound: () => { throw Error('not found'); } };
    if (name.startsWith('@/app/actions/')) return actionStubs;
    if (name === '@/components/action-feedback') return { ActionFeedback: () => null, reportActionError: () => {} };
    if (name === '@/components/page-translator') return { TranslatorFallbackToggle: actionFirst ? () => null : button };
    if (name === '@/components/mini-review-form') return { MiniReviewForm: () => null }; // Reviewed branch is used.
    if (actionFirst && name === '@/components/ui/select') {
      // The original form is rendered statically. Native selects preserve its choices without React hydration.
      const fragment = ({ children }) => children;
      return {
        Select: ({ items, value, children }) => {
          const field = 'study' in items ? 'domain' : 'finalActionType';
          return h('select', { name: field, defaultValue: value, 'aria-label': field === 'domain' ? '场景' : '最终动作', className: 'prep-select' }, children);
        },
        SelectContent: fragment,
        SelectItem: ({ value, children }) => h('option', { value }, children),
        SelectTrigger: () => null,
        SelectValue: () => null,
      };
    }
    if (name === '@/components/event-context-actions') {
      const actual = resolveSource(name);
      return { EventContextActions: (props) => h('div', { id: 'existing-context' }, h(actual.EventContextActions, props), h('div', { id: 'agent-slot' })) };
    }
    if (name.startsWith('@/')) return resolveSource(name);
    if (name.startsWith('.')) {
      const base = path.resolve(path.dirname(file), name);
      return load(resolveFile(base));
    }
    return req(name);
  }
  new Function('require', 'module', 'exports', compiled)(localRequire, mod, mod.exports);
  return mod.exports;
}
function resolveFile(base) {
  for (const suffix of ['', '.tsx', '.ts', '.js']) if (fs.existsSync(base + suffix) && fs.statSync(base + suffix).isFile()) return base + suffix;
  throw new Error('Missing source: ' + base);
}
function resolveSource(name) { return load(resolveFile(path.join(root, 'src', name.slice(2)))); }

async function main() {
  if (actionFirst) {
    const ArmPage = load(path.join(root, 'src/app/arm/page.tsx')).default;
    const { AppShell } = resolveSource('@/components/app-shell');
    const shell = render(h(AppShell, { navOrder: null }, h('main', { id: 'arm-page' }, h(ArmPage))));
    const template = fs.readFileSync(path.join(output, 'action-first.template.html'), 'utf8');
    const origin = JSON.stringify({ title: fixture.eventCase.title, review: fixture.reviews[0] }).replaceAll('<', '\\u003c');
    const revision = crypto.createHash('sha256')
      .update(fs.readFileSync(path.join(output, 'action-first.css')))
      .update(fs.readFileSync(path.join(output, 'action-first.js')))
      .digest('hex').slice(0, 12);
    fs.writeFileSync(path.join(output, 'action-first.html'), template.replaceAll('PREVIEW_ASSET_REV', revision).replace('<!-- APP_SHELL -->', () => shell).replace('<!-- CASE_SOURCE -->', () => origin));
    console.log(JSON.stringify({ html: path.join(output, 'action-first.html'), sources: [...consumed].sort() }));
    return;
  }
  const Page = load(path.join(root, 'src/app/event-library/[id]/page.tsx')).default;
  const { AppShell } = resolveSource('@/components/app-shell');
  const page = await Page({ params: Promise.resolve({ id: '3' }) });
  const shell = render(h(AppShell, { navOrder: ['/archive','/convert','/event-library','/rules','/spending-review','/ash-memos','/weakness','/morning-routine','/night-ritual','/lifespan'] }, page));
  const toolbar = `<div class="preview-bar" aria-label="设计预览工具"><div><strong>RuleLoop 原页面增量</strong><span>原记录副本 · 模拟 Agent · 不写入线上</span></div><div class="preview-controls" role="group" aria-label="预览模式"><button id="baseline" aria-pressed="false">原有界面</button><button id="enhanced" aria-pressed="true">叠加 Agent</button><button id="reset">重置演示</button></div></div>`;
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>RuleLoop · 原页面上的 Agent 增强</title><link rel="stylesheet" href="base.css"><link rel="stylesheet" href="fonts.css"><link rel="stylesheet" href="overlay.css"></head><body>${toolbar}${shell}<div id="preview-notice" role="status" aria-live="polite"></div><dialog id="source-dialog" aria-labelledby="source-heading"><div id="source-body"></div><button id="close-source" class="agent-button">关闭来源</button></dialog><script src="overlay.js"></script></body></html>`;
  fs.writeFileSync(path.join(output, 'index.html'), html);
  const css = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8') + `\n@source "${root}/src";\n`;
  const postcss = req('postcss');
  const tailwind = req('@tailwindcss/postcss');
  const result = await postcss([tailwind()]).process(css, { from: path.join(root, 'src/app/globals.css'), to: path.join(output, 'base.css') });
  fs.writeFileSync(path.join(output, 'base.css'), result.css);
  fs.writeFileSync(path.join(output, 'fonts.css'), fs.readFileSync(path.join(root, 'src/app/fonts.css'), 'utf8').replaceAll('/fonts/', './fonts/'));
  fs.cpSync(path.join(root, 'public/fonts'), path.join(output, 'fonts'), { recursive: true });
  const sources = [...consumed].sort().map(file => ({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') }));
  fs.writeFileSync(path.join(output, 'source-manifest.json'), JSON.stringify({ createdAt: new Date().toISOString(), type: 'design-only-static-render', readOnlySources: sources, fixture: 'Visible event /event-library/3; reviewed content copied, no API or database access', mocked: ['Next navigation', 'all business actions', 'translation toggle', 'unused empty-review branch'], originalComponentsRendered: ['event detail page', 'AppShell', 'AppNav', 'EventStatusActions', 'EventContextActions', 'CardContainer', 'Button'], limitations: ['SSR snapshot, not production hydration', 'Agent responses are authored scenarios', 'Preview saves use localStorage only'] }, null, 2));
  console.log(JSON.stringify({ html: path.join(output, 'index.html'), sourceFilesRendered: sources.length, databaseAccess: false, modelCalls: false }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
