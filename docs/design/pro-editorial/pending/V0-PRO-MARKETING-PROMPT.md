# v0 前端开发交接提示词（设计完成后使用）

状态：预备稿。Open Design 尚无页面产物，不能把本文件当作视觉已验收的授权；补齐设计截图和设计审查后再发送给 v0。

## 附件与阅读顺序

1. `AGENTS.md`：设计优先、本地 Next.js 文档、资源版本约束。
2. `docs/PRD-PRO-MARKETING.md`：商业范围、试用边界、权益与验收。
3. `docs/API.md`：拟实现 API、错误和账单/AI 语义。
4. `docs/design/pro-editorial/README.md` 与 `DESIGN-NOTES.md`：真实视觉令牌和审查状态。
5. `docs/design/pro-editorial/index.html`、`pricing.html`、CSS/JS/本地资产。
6. 1440px 与 390px 的首页、定价页 PNG；至少附四张完整截图。
7. `README.md`、`docs/ARCHITECTURE.md`、`docs/ROADMAP.md` 当前优先级说明。

如果 v0 只能接收有限附件，优先 PRD、API、两张桌面截图、两张移动截图、设计令牌，源码通过同仓库引用。不能只给审美形容词而省略实际设计。

## 可复制提示词

```text
Continue the existing RuleLoop repository. Build the English marketing homepage and pricing page from the attached approved Open Design concepts. This is an implementation task, not a request to invent a different design.

FIRST — verify the design gate:
Read AGENTS.md and the current design README. If the concept HTML, screenshots or visual review are missing/unverified, finish the isolated design review before editing production routes. Do not label missing images as approved. Use the actual latest files over older blue/gray or dark-game designs. Follow the user's chosen Hermès-inspired warm editorial direction without copying the Hermès logo, imagery or brand identity.

SOURCE OF TRUTH:
1. docs/PRD-PRO-MARKETING.md for scope and product behavior.
2. docs/API.md for API shape and errors.
3. docs/design/pro-editorial/ for visual layout, copy, tokens and assets.
4. Actual package.json/lockfile for stack versions.
Earlier eight-page rules requirements are historical; do not implement them wholesale.

PRODUCT:
RuleLoop combines AI subscription value reviews with contextual behavior reviews. The loop is Expectation → Evidence → Unknowns → One next experiment. Help people use the tools they buy and carry a lesson into the next decision. AI findings are candidates until confirmed; unknown stays unknown.

STACK:
Use existing Next.js 16.2.10 App Router, React 19.2, TypeScript and Tailwind 4. Before writing code, read the relevant guides inside node_modules/next/dist/docs/, especially route handlers, server/client components and layouts/pages. If those files are unavailable in v0, inspect the installed version and corresponding official docs; do not silently substitute conventions from an older Next.js. Keep marketing content server-rendered, with small client boundaries for the sampler, navigation, FAQ, pricing toggle and dialogs. No latest CDN; prefer local fonts and SVG assets. Preserve lockfile and avoid unnecessary dependencies.

ROUTES:
- / : English marketing and product sampler.
- /pricing : Free and Pro plans.
- Preserve the existing mock dashboard by moving its entry to /app before replacing /; check links and keep legacy /record, /review, /rules and /archive intact.
- Separate marketing layout from app layout; no old BottomNav on marketing pages.
- Do not create apparently working login, billing, privacy or terms routes using misleading placeholder success. For missing services, show the explicit preview/unavailable state specified below.

HOMEPAGE:
Reproduce Navigation, Hero, working product sampler, Features, Method, pricing invitation, CTA, FAQ and Footer from the design. Primary Try a decision scrolls to #try. The sampler permits editing tool, expectation and self-reported result; validates inputs and builds a deterministic four-part local preview. It is not a real AI call. Label Preview, not an AI analysis. Missing evidence remains unknown. Include reset and an accessible status announcement. Do not send user text to analytics, APIs or URL query strings.

Keep this loop in demo mode opens an honest account-not-connected dialog. In connected mode, authenticate first and then save using POST /api/v1/loops. Preserve a save-intent draft across login only after explaining local temporary storage; expire it after 30 minutes and clear after successful save. Do not upload automatically on every keystroke.

PRICING:
Pro monthly USD $5 ($5 billed monthly); Pro annual USD $60 ($60 billed annually; equivalent to $5/month). There is no annual discount. Never add Save 20%, crossed-out prices, Popular or fake urgency. All amounts and limits come from one catalog/config object.
Free proposal: 1 active loop, 1 AI review per UTC calendar month, manual reflections, history and export.
Pro proposal: 20 active loops, 20 AI reviews per UTC calendar month, cross-loop suggestions (consume the same AI quota), checkpoint reminders, history/export.
Both Pro billing intervals have the same monthly quota; no rollover. Show these as proposed prelaunch packages until the owner confirms launch terms. Confirm the user's final price clarification before deploying paid checkout.
Monthly is initially selected. The toggle updates price, actual billed total and demo order summary; it must be accessible and retain selection on errors. Existing Pro users get Manage subscription. Anonymous users authenticate before creating checkout. Only a signed server payment event can grant Pro, never a URL parameter or client state.

DATA ADAPTER:
Implement a typed RuleLoopClient with mock and real adapters matching docs/API.md. Start in explicit demo mode if no backend exists. Mock mode must not make real network calls, claim saved data, accept credit cards or fabricate payment completion. Display a discreet design-preview notice. Public catalog failure shows retry rather than inventing prices; checkout failure retains selection.
Prepare interfaces for GET plans, GET session, GET entitlements, POST checkout-sessions and POST portal-sessions. Never expose API keys or fixed demo-user authentication to public traffic. Real backend/payment/AI integration is separate from this frontend handoff unless explicitly requested.

CHECKOUT UI:
In preview mode, Choose Pro opens an accessible order summary showing interval, USD amount, monthly quota and Checkout is not connected in this design preview. In connected mode, create the session server-side, disable double submission, redirect only to an approved provider URL, then query entitlements on return. Pending confirmation stays pending. Failed/canceled checkout never displays success. Cancellation retains access through the verified paid-through date; historical records and export remain available after downgrade.

QUALITY:
Match actual typography, whitespace, original ribbon/loop illustration and responsive composition; keep readable HTML text. Test 1440, 768, 390 and 320 widths, no horizontal overflow. Native labels, visible focus, reduced motion, sufficient contrast, 44px mobile targets. Dialog Escape/focus return must work. No invented testimonials, customer logos, savings, integration badges or policy promises.

ACCEPTANCE PATHS:
1. Home → Try a decision → edit → preview with missing evidence → reset.
2. Save intention in demo mode shows honest unavailable/auth-required copy.
3. Home → Pricing → Monthly/Annual changes exact billing amounts consistently.
4. Choose Pro → summary → close with Escape, focus returns.
5. Mobile menu/anchors and FAQ work by touch and keyboard.
6. Mock backend tests: 401, 409 already subscribed, 429 quota, 503 checkout unavailable, pending payment and canceled checkout.
7. Legacy app routes remain reachable.

DELIVER:
Run available lint, TypeScript check and production build; do not claim uninstalled tests passed. Use meaningful interaction tests for sampler and billing selection, and verify desktop/mobile screenshots against the concepts. Report changed files, actual checks, remaining backend dependencies and any visual deviation. Do not deploy or accept real payments during this handoff.
```

## 发送前核对

- [ ] 用户价格解释最终确认。
- [ ] Open Design 两页及四张图实际存在。
- [ ] 截图审查记录区分通过/未验证/用户待确认。
- [ ] HTML、配额、PRD、API、提示词金额一致。
- [ ] 附件包含实际视觉文件，而非只有本提示词。
