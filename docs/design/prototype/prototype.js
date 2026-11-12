const icons = {
  back: '<svg class="icon" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
  more: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/></svg>',
  home: '<svg class="icon" viewBox="0 0 24 24"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
  review: '<svg class="icon" viewBox="0 0 24 24"><path d="M9 5h6"/><path d="M9 3h6v4H9z"/><path d="M7 5H5v16h14V5h-2"/><path d="M8 12h8M8 16h5"/></svg>',
  plus: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  rules: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M8 7h8M8 11h6"/></svg>',
  archive: '<svg class="icon" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M5 6v15h14V6"/><path d="M4 3h16v3H4z"/><path d="M9 11h6"/></svg>',
  event: '<svg class="icon" viewBox="0 0 24 24"><path d="M13 2 4.5 13H12l-1 9 8.5-11H12z"/></svg>',
  edit: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="m16.5 3.5 4 4L8 20H4v-4Z"/></svg>',
  chevron: '<svg class="icon" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
  check: '<svg class="icon" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
};

function logo() {
  return '<span class="brand"><span class="loop-mark" aria-hidden="true"></span><span>RuleLoop</span></span>';
}

function pageTop(title, right = '') {
  return `<header class="simple-top"><a class="icon-button" href="?screen=home" aria-label="返回">${icons.back}</a><strong>${title}</strong><span>${right}</span></header>`;
}

function nav(active) {
  const items = [
    ['home', '首页', icons.home],
    ['reviews', '待复盘', icons.review],
    ['record', '记录', icons.plus],
    ['rules', '规则', icons.rules],
    ['archive', '档案', icons.archive],
  ];
  return `<nav class="bottom-nav" aria-label="主导航">${items.map(([id, label, icon]) => `
    <a class="nav-item ${active === id ? 'active' : ''} ${id === 'record' ? 'record' : ''}" href="?screen=${id}">
      <span class="nav-icon">${icon}</span><span>${label}</span>
    </a>`).join('')}</nav>`;
}

function traceNode(shape, title, copy) {
  return `<div class="trace-step"><span class="trace-node ${shape}" aria-hidden="true"></span><div class="trace-copy"><strong>${title}</strong><p>${copy}</p></div></div>`;
}

function mobileShell(content, active) {
  return `<article class="mobile-shell ${active ? 'with-nav' : ''}"><div class="screen">${content}</div>${active ? nav(active) : ''}</article>`;
}

function home() {
  return mobileShell(`
    <header class="app-top">${logo()}<span class="date">07.21 / MON</span></header>
    <section class="action-thesis">
      <small>现在值得做的事</small>
      <h1>完成“文件误提交”的复盘</h1>
      <p class="reason">因为：<strong>高影响</strong></p>
      <a class="primary-button" href="?screen=review">继续复盘</a>
    </section>
    <section class="trace" aria-label="当前闭环进度">
      ${traceNode('circle', '已记录', '提交重要文件时选错了版本')}
      ${traceNode('diamond', '复盘中', '已找到风险信号，等待最小行动')}
      ${traceNode('square', '等待规则', '完成复盘后关联或创建规则')}
      ${traceNode('check', '等待证据', '在真实场景中验证是否改善')}
    </section>
    <div class="section-head"><h2>最近轨迹</h2><span>查看全部</span></div>
    <div class="rows">
      <a class="row" href="?screen=event"><span class="row-marker"></span><span><span class="row-title">文件误提交</span><span class="row-meta">高影响 · 复盘中</span></span><span class="row-end">07.20</span></a>
      <a class="row" href="?screen=rule"><span class="row-marker square"></span><span><span class="row-title">21:00 后先设定结束时间</span><span class="row-meta">已验证 · 结果改善</span></span><span class="row-end">07.18</span></a>
      <a class="row" href="?screen=event"><span class="row-marker diamond"></span><span><span class="row-title">临时会议迟到 5 分钟</span><span class="row-meta">普通存档</span></span><span class="row-end">07.17</span></a>
    </div>
    <div class="period-summary" aria-label="本周期结果">
      <div class="metric"><b>本周期</b><span>07.15—07.21</span></div>
      <div class="metric"><b>2</b><span>重复事件</span></div>
      <div class="metric"><b>1</b><span>有效规则</span></div>
      <div class="metric"><b>3</b><span>改善次数</span></div>
    </div>`, 'home');
}

function record() {
  return mobileShell(`
    ${pageTop('记录刚发生的事', '<span class="save-state">草稿已保存</span>')}
    <form class="form-stack">
      <div class="field"><label class="field-label" for="event-title">发生了什么？</label><textarea id="event-title" class="textarea" placeholder="描述事实，不解释原因……">提交重要文件时选错了版本</textarea><p class="field-help">只写可以被观察到的事实，原因留到复盘。</p></div>
      <div class="field"><span class="field-label">场景</span><div class="choices"><button class="choice" type="button" aria-pressed="true">学习 / 工作</button><button class="choice" type="button" aria-pressed="false">时间</button><button class="choice" type="button" aria-pressed="false">消费</button><button class="choice" type="button" aria-pressed="false">人际</button><button class="choice" type="button" aria-pressed="false">健康</button></div></div>
      <div class="field"><span class="field-label">实际影响</span><div class="choices"><button class="choice" type="button" aria-pressed="false">低</button><button class="choice" type="button" aria-pressed="false">中</button><button class="choice high" type="button" aria-pressed="true">高</button></div><p class="field-help">高：会造成明显损失，或很难补救。</p></div>
      <div class="field"><span class="field-label">以前发生过吗？</span><div class="choices"><button class="choice" type="button" aria-pressed="true">第一次</button><button class="choice repeat" type="button" aria-pressed="false">曾经发生过</button></div></div>
      <button class="disclosure" type="button"><span>更多信息（可选）</span><span>＋</span></button>
      <div class="form-action"><a class="primary-button full" href="?screen=review">保存事件</a></div>
    </form>`);
}

function eventDetail() {
  return mobileShell(`
    ${pageTop('事件详情', `<button class="icon-button" aria-label="更多操作">${icons.more}</button>`)}
    <h1 class="page-title">提交重要文件时选错了版本</h1>
    <p class="page-note mono">2026-07-20 22:10 · 学习 / 工作</p>
    <div class="status-pair"><span class="status-label high">高影响</span><span class="status-label">第一次发生</span></div>
    <dl class="detail-fact"><dt>实际后果</dt><dd>需要联系老师重新提交，结果仍未确认。</dd></dl>
    <div class="section-head"><h2>处理轨迹</h2><span>可追溯</span></div>
    <section class="trace">
      ${traceNode('circle', '已记录', '7月20日 22:10')}
      ${traceNode('diamond', '已复盘', '最早信号：感到赶时间')}
      ${traceNode('square', '已建立规则', '提交前重新打开附件确认')}
      ${traceNode('check', '等待验证', '下一次相似场景出现后记录')}
    </section>
    <a class="primary-button full" href="?screen=rule">查看关联规则</a>`, 'home');
}

function reviews() {
  return mobileShell(`
    <header class="app-top">${logo()}<span class="date">2 件待处理</span></header>
    <h1 class="page-title">待复盘</h1><p class="page-note">只保留重复发生或影响较高的事件。</p>
    <div class="segmented"><button class="segment active">待复盘</button><button class="segment">已完成</button></div>
    <div class="review-list">
      <a class="review-item" href="?screen=review"><span class="review-shape"></span><span><span class="priority">高影响</span><h2>提交重要文件时选错了版本</h2><p>7月20日 · 已找到风险信号，等待完成最小行动</p></span>${icons.chevron}</a>
      <a class="review-item" href="?screen=review"><span class="review-shape"></span><span><span class="priority">重复发生</span><h2>疲惫时又刷视频超过两小时</h2><p>7月18日 · 尚未开始</p></span>${icons.chevron}</a>
    </div>`, 'reviews');
}

function review() {
  return mobileShell(`
    ${pageTop('复盘', '<span class="save-state">草稿已保存</span>')}
    <section class="source-block"><small>来源事件</small><h1>提交重要文件时选错了版本</h1><div class="status-pair"><span class="status-label high">高影响</span><span class="status-label">学习 / 工作</span></div></section>
    <form class="review-form-trace">
      <div class="review-field"><span class="trace-node circle"></span><div><label class="field-label" for="signal">风险信号</label><textarea id="signal" class="textarea" placeholder="最早出现了什么信号？">已经感到时间不够，想跳过附件检查。</textarea></div></div>
      <div class="review-field"><span class="trace-node diamond"></span><div><label class="field-label" for="decision">决策点</label><textarea id="decision" class="textarea" placeholder="哪里本可以不同？为什么没做到？">点击提交之前，本可以重新打开附件；当时把赶快完成放在了确认正确之前。</textarea></div></div>
      <div class="review-field"><span class="trace-node square"></span><div><label class="field-label" for="minimum">最小行动</label><textarea id="minimum" class="textarea" placeholder="下次同一信号出现时，先做什么？">先重新打开附件，确认内容和版本。</textarea></div></div>
      <div class="candidate"><span><b>可能相关的规则</b><br><span class="row-meta">提交前重新打开附件确认</span></span><button type="button">关联</button></div>
      <div class="form-action"><a class="primary-button full" href="?screen=rule">完成复盘</a></div>
    </form>`);
}

function rules() {
  return mobileShell(`
    <header class="app-top">${logo()}<span class="date">2 条启用</span></header>
    <h1 class="page-title">规则库</h1><p class="page-note">只保留在关键时刻真正能执行的约束。</p>
    <div class="segmented"><button class="segment active">启用</button><button class="segment">草稿</button><button class="segment">暂停</button><button class="segment">归档</button></div>
    <div class="rule-list">
      <a class="rule-row" href="?screen=rule"><h2>提交重要文件前，先重新打开附件确认</h2><p><b>信号：</b>赶时间、文件名含 draft<br><b>最小行动：</b>重新打开附件确认版本</p><footer><span>待观察</span><span>2 次验证</span></footer></a>
      <a class="rule-row" href="?screen=rule"><h2>21:00 后开始娱乐前，先设定结束时间</h2><p><b>信号：</b>疲惫、自动连播<br><b>最小行动：</b>先设置 20 分钟计时</p><footer><span>有效</span><span>4 次验证</span></footer></a>
    </div>`, 'rules');
}

function ruleDetail() {
  return mobileShell(`
    ${pageTop('规则详情', '<button class="icon-button" aria-label="编辑">' + icons.edit + '</button>')}
    <div class="status-pair"><span class="status-label active">■ 已启用</span><span class="status-label">待观察</span></div>
    <section class="rule-statement"><h1>当准备提交重要文件，并注意到自己正在赶时间时，先重新打开附件确认内容和版本。</h1><a class="primary-button" href="#validation">记录一次验证</a></section>
    <div class="section-head"><h2>证据轨迹</h2><span>2 次触发</span></div>
    <section id="validation">
      <div class="evidence-item"><span class="evidence-dot">✓</span><div><h3>想起 · 遵守 · 结果改善</h3><p><span class="mono">2026-07-20 09:42</span><br>重新打开附件后发现版本不是最终稿，替换后提交。</p></div></div>
      <div class="evidence-item"><span class="evidence-dot missed">×</span><div><h3>未想起 · 未遵守</h3><p><span class="mono">2026-07-12 17:15</span><br>匆忙提交，之后需要重新确认并延迟处理。</p></div></div>
    </section>
    <div class="section-head"><h2>来源</h2><span>事件 → 复盘 → 规则</span></div>
    <a class="row" href="?screen=event"><span class="row-marker"></span><span><span class="row-title">提交重要文件时选错了版本</span><span class="row-meta">高影响 · 已复盘</span></span>${icons.chevron}</a>`, 'rules');
}

function archive() {
  return mobileShell(`
    <header class="app-top">${logo()}<span class="date">07.15—07.21</span></header>
    <h1 class="page-title">成长档案</h1><p class="page-note">不是记录了多少，而是改变了多少。</p>
    <section class="archive-summary"><div><b>2</b><span>重复事件</span></div><div><b>1</b><span>有效规则</span></div><div><b>3</b><span>改善次数</span></div></section>
    <div class="segmented"><button class="segment active">全部</button><button class="segment">事件</button><button class="segment">规则</button><button class="segment">验证</button></div>
    <section class="archive-trace">
      <a class="archive-event" href="?screen=rule"><span class="trace-node check"></span><span><h2>7月20日 · 行为改善</h2><p>提交前想起规则，并重新确认了附件。<br>来源：提交重要文件前重新打开附件确认</p></span></a>
      <a class="archive-event" href="?screen=rule"><span class="trace-node square"></span><span><h2>7月18日 · 规则启用</h2><p>21:00 后开始娱乐前，先设定结束时间。</p></span></a>
      <a class="archive-event" href="?screen=event"><span class="trace-node circle"></span><span><h2>7月17日 · 普通存档</h2><p>临时会议迟到 5 分钟。首次发生，中等影响。</p></span></a>
      <a class="archive-event" href="?screen=event"><span class="trace-node diamond"></span><span><h2>7月15日 · 完成复盘</h2><p>识别出“赶时间时跳过检查”的决策模式。</p></span></a>
    </section>`, 'archive');
}

function rail(active) {
  const items = [['home','首页',icons.home],['reviews','复盘',icons.review],['record','记录',icons.plus],['rules','规则',icons.rules],['archive','档案',icons.archive]];
  return `<nav class="desktop-rail" aria-label="主导航"><span class="loop-mark"></span>${items.map(([id,label,icon]) => `<a class="rail-link ${active===id?'active':''}" href="?screen=${id}">${icon}<span>${label}</span></a>`).join('')}</nav>`;
}

function desktopShell(active, main, context) {
  return `<article class="desktop-shell">${rail(active)}<main class="desktop-main">${main}</main><aside class="desktop-context">${context}</aside></article>`;
}

function desktopHome() {
  return desktopShell('home', `
    <header class="desktop-head"><span class="desktop-title">首页</span><span class="date">2026.07.21 / MON</span></header>
    <section class="desktop-rule" style="border-left-color:var(--cobalt)"><span class="status-label">现在值得做的事</span><h1>完成“文件误提交”的复盘。</h1><p class="reason">因为：<strong>高影响</strong></p><a class="primary-button" href="?screen=desktop-review">继续复盘</a></section>
    <section class="desktop-evidence"><div class="section-head"><h2>最近轨迹</h2><span>事件、规则与验证</span></div><div class="rows"><div class="row"><span class="row-marker"></span><span><span class="row-title">文件误提交</span><span class="row-meta">高影响 · 复盘中</span></span><span class="row-end">07.20</span></div><div class="row"><span class="row-marker square"></span><span><span class="row-title">21:00 后先设定结束时间</span><span class="row-meta">已验证 · 结果改善</span></span><span class="row-end">07.18</span></div><div class="row"><span class="row-marker diamond"></span><span><span class="row-title">临时会议迟到 5 分钟</span><span class="row-meta">普通存档</span></span><span class="row-end">07.17</span></div></div></section>`, `
    <div class="context-section"><h2>当前闭环</h2><section class="trace">${traceNode('circle','已记录','文件误提交')}${traceNode('diamond','复盘中','等待最小行动')}${traceNode('square','等待规则','关联或创建')}${traceNode('check','等待证据','真实场景验证')}</section></div>
    <div class="context-section"><h2>本周期</h2><p>重复事件 <b class="mono">2</b></p><p>有效规则 <b class="mono">1</b></p><p>改善次数 <b class="mono">3</b></p></div>`);
}

function desktopReview() {
  return desktopShell('reviews', `
    <header class="desktop-head"><span class="desktop-title">复盘</span><span class="save-state">草稿已保存</span></header>
    <section class="source-block" style="max-width:780px;margin:32px auto 0"><small>来源事件</small><h1>提交重要文件时选错了版本</h1><div class="status-pair"><span class="status-label high">高影响</span><span class="status-label">学习 / 工作</span></div></section>
    <form class="review-form-trace" style="max-width:780px;margin:36px auto 0">${review().match(/<form class="review-form-trace">([\s\S]*?)<\/form>/)[1]}</form>`, `
    <div class="context-section"><h2>为什么进入复盘</h2><p>这是一次高影响事件。普通事件会直接存档，不增加规则。</p></div>
    <div class="context-section"><h2>候选规则</h2><p><b>提交前重新打开附件确认</b></p><p>场景与风险信号高度相关，优先关联可避免重复规则。</p></div>`);
}

function desktopRule() {
  return desktopShell('rules', `
    <header class="desktop-head"><span class="desktop-title">规则详情</span><button class="icon-button" aria-label="编辑">${icons.edit}</button></header>
    <section class="desktop-rule"><span class="status-label active">■ 已启用 · 待观察</span><h1>当准备提交重要文件，并注意到自己正在赶时间时，先重新打开附件确认内容和版本。</h1><a class="primary-button" href="#desktop-evidence">记录一次验证</a></section>
    <section class="desktop-evidence" id="desktop-evidence"><div class="section-head"><h2>证据轨迹</h2><span>2 次触发</span></div><div class="evidence-panel"><b>想起 · 遵守 · 结果改善</b><p class="mono">2026-07-20 09:42</p><p>重新打开附件后发现版本不是最终稿，替换后提交。</p></div><div class="evidence-panel missed"><b>未想起 · 未遵守</b><p class="mono">2026-07-12 17:15</p><p>匆忙提交，之后需要重新确认并延迟处理。</p></div></section>`, `
    <div class="context-section"><h2>状态</h2><span class="status-label active">已启用 · 待观察</span><p class="mono">2026-07-20 更新</p></div>
    <div class="context-section"><h2>来源</h2><p><b>事件</b><br>提交重要文件时选错了版本</p><p><b>复盘</b><br>赶时间时跳过了附件检查</p></div>
    <div class="context-section"><h2>统计定义</h2><div class="definition"><b>触发</b><p>相似情境真实出现。</p></div><div class="definition"><b>想起</b><p>当时意识到规则存在。</p></div><div class="definition"><b>遵守</b><p>采取了规则建议的动作。</p></div><div class="definition"><b>改善</b><p>结果比过去更好。</p></div></div>`);
}

const screens = {
  home,
  record,
  event: eventDetail,
  reviews,
  review,
  rules,
  rule: ruleDetail,
  archive,
  'desktop-home': desktopHome,
  'desktop-review': desktopReview,
  'desktop-rule': desktopRule,
};

const labels = {
  home: '01 首页', record: '02 快速记录', event: '03 事件详情', reviews: '04 待复盘', review: '05 复盘工作台', rules: '06 规则库', rule: '07 规则详情', archive: '08 成长档案', 'desktop-home': 'Desktop · 首页', 'desktop-review': 'Desktop · 复盘', 'desktop-rule': 'Desktop · 规则详情',
};

function bindInteractions(root) {
  root.querySelectorAll('.choice').forEach((button) => {
    button.addEventListener('click', () => {
      const siblings = button.parentElement.querySelectorAll('.choice');
      siblings.forEach((item) => item.setAttribute('aria-pressed', 'false'));
      button.setAttribute('aria-pressed', 'true');
    });
  });
  root.querySelectorAll('.segment').forEach((button) => {
    button.addEventListener('click', () => {
      button.parentElement.querySelectorAll('.segment').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
    });
  });
}

function render() {
  const params = new URLSearchParams(location.search);
  const selected = params.get('screen');
  const app = document.querySelector('#app');
  if (selected && screens[selected]) {
    document.body.classList.add('single');
    if (params.get('render') === 'chrome') document.body.classList.add('chrome-capture');
    app.innerHTML = screens[selected]();
  } else {
    const index = Object.keys(screens).map((id) => `<a href="?screen=${id}">${labels[id]}</a>`).join('');
    app.innerHTML = `<div class="gallery"><header class="gallery-intro"><div><h1>Decision Trace</h1><p>RuleLoop v0.2 高保真样式原型。唯一的标志性元素是贯穿事件、复盘、规则和证据的 Loop Spine。</p></div><nav class="screen-index">${index}</nav></header><div class="gallery-grid">${Object.entries(screens).map(([id, factory]) => `<section class="gallery-item ${id.startsWith('desktop-') ? 'wide' : ''}"><header class="gallery-label"><span>${labels[id]}</span><a href="?screen=${id}">单独查看</a></header>${factory()}</section>`).join('')}</div></div>`;
  }
  bindInteractions(app);
}

render();
