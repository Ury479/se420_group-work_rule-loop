'use strict';
// Authored UI scenarios only. No fetch, no credentials, no model or production writes.
const $ = selector => document.querySelector(selector);
const storageKey = 'ruleloop-original-page-agent-design-v1';
const initial = { mode: 'enhanced', open: false, phase: 'analysis', title: '动手前，先确认这次要验证什么', draft: '我这次要解决的问题：\n这次必须沿用的现有能力：\n做完后，用什么可见结果判断方向正确：', card: null, outcome: null, revision: null, future: '', rejected: false };
let state;
try { state = { ...initial, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }; } catch { state = { ...initial }; }
let noticeTimer;
const originalCards = $('[aria-label="卡片流"]');
const cardHeading = originalCards.querySelector('h2');
const emptyCardText = originalCards.querySelector('p');
const cardList = originalCards.querySelector('ul');
const contextButtons = [...$('#existing-context').querySelectorAll('button')];
const gptButton = contextButtons.find(button => button.textContent.includes('用 GPT 分析'));
function esc(text) { return String(text).replace(/[&<>"']/g, character => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[character])); }
function persist() { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { notice('浏览器无法保存；本次演示内容仅留在当前页面。'); } }
function notice(text) { clearTimeout(noticeTimer); $('#preview-notice').textContent = text; $('#preview-notice').classList.add('visible'); noticeTimer = setTimeout(() => $('#preview-notice').classList.remove('visible'), 4500); }
function sourceButton(key, text) { return `<button class="agent-source" data-source="${key}">${text}</button>`; }
function agentContent() {
  const header = `<div class="agent-head"><div><div class="agent-kicker">AGENT · 当前事件</div><h3>把这次教训用到下一次判断</h3></div><button class="agent-button" data-action="collapse">收起</button></div>`;
  if (state.phase === 'manual') return header + `<div class="agent-body"><p>原入口当前提供的是上下文导出。叠加 Agent 后，可在这个位置直接分析及采纳。</p><pre class="agent-note">事件：vibe coding 5h\n用户复盘：coding 5h,思路混乱，缺乏灵感\n未及时发现的原因：想法模糊\n用户预防设想：用 AI 进行苏格拉底提问法进行提问</pre><p class="agent-muted">此处为原有文本导出行为的演示。</p></div>`;
  if (state.phase === 'failure') return header + `<div class="agent-body"><h4>本次分析没有完成</h4><p>模拟 Hermes 超时。原复盘、规则和草稿均保留，没有自动重试。</p><div class="agent-actions"><button class="agent-button primary" data-action="retry">重新预览分析</button><button class="agent-button" data-action="manual">查看原上下文</button></div><p class="agent-muted">故障演示没有发起真实请求，也不产生 API 费用。</p></div>`;
  return header + `<div class="agent-body">
    <div class="agent-block"><h4>从你已经记录的内容出发</h4><p>你写下“想法模糊”，却已经连续 coding 5h。一个值得确认的解释是：<strong>在目标还没收敛时，就进入了实现。</strong></p><p class="agent-muted">这是待你确认的解释，不会覆盖你原先选择的根因。当前“离开时未检查”标签与这段叙述的关系也需要你判断。</p><div>${sourceButton('review','来源：这条事件的原复盘 ↗')}</div></div>
    <div class="agent-block"><h4>已有经验如何用于下一次</h4><div class="agent-rule-draft">${esc('启用 grill me skills 进行排查，收敛方向')}</div><p class="agent-muted">这条规则目前是候选，没有已验证有效的证据。</p><div>${sourceButton('rule','来源：本案例生成的候选规则 ↗')}</div><p><strong>适用：</strong>目标／验收不清楚，却准备继续实现。<br><strong>不适用：</strong>目标明确，只是一个具体技术问题卡住。</p></div>
    <div class="agent-block"><h4>先做一个能判断方向的动作</h4><p>先写清三行，再决定是否继续写代码。你可编辑后保存到下面原有的行动卡。</p><label for="draft-title">行动卡标题</label><input id="draft-title" class="agent-input" maxlength="300" value="${esc(state.title)}"><label for="action-draft">可编辑草稿</label><textarea id="action-draft" class="agent-input" rows="5" maxlength="2000">${esc(state.draft)}</textarea><div class="agent-actions"><button class="agent-button primary" data-action="adopt" ${state.card?'disabled':''}>${state.card?'已存入下方行动卡':'采纳到原有行动卡'}</button><button class="agent-button" data-action="reject">这次不适用</button></div>${state.rejected?'<p class="agent-muted" role="status">已标记本次不适用，原规则和复盘保持原样。你仍可编辑后采纳。</p>':''}</div>
    <details class="agent-block"><summary>代入下一次类似情况</summary><label for="future-context">你现在准备做什么？</label><textarea id="future-context" class="agent-input" rows="2" placeholder="例如：想再写一个新原型，但还没有明确这次要验证什么">${esc(state.future)}</textarea><div class="agent-actions"><button class="agent-button" data-action="future-match">对照这条经验</button><button class="agent-button" data-action="future-example">填入演示场景</button></div><div id="future-result" class="agent-muted"></div><p class="agent-muted">此项是固定场景演示，不是开放式智能分析；不会查询其他线上档案。</p></details>
    <details class="agent-block"><summary>演示边界与异常</summary><p class="agent-muted">只读取当前可见事件的副本；建议、条件及下一次情景是人工编写的模拟结果。尚未检索你的其他记录，也未连接 Hermes。所有演示保存只发生在此浏览器。</p><button class="agent-button" data-action="failure">预览模型不可用时</button></details>
  </div>`;
}
function renderCards() {
  const visible = Boolean(state.card) && state.mode === 'enhanced';
  cardHeading.textContent = `卡片流 · ${visible ? (state.outcome ? 2 : 1) : 0}`;
  emptyCardText.hidden = visible;
  cardList.innerHTML = visible ? `<li class="preview-card"><div class="agent-row"><span class="agent-chip">行动卡</span><span class="agent-chip">${state.outcome?'已记录结果':'待行动'}</span><span class="agent-muted">演示保存</span></div><h3>${esc(state.card.title)}</h3><p>${esc(state.card.content)}</p><div class="agent-muted">来自本事件的 Agent 候选，经你采纳；采纳不等于已经执行。</div><div>${sourceButton('review','查看经验原始来源 ↗')}</div><details id="action-outcome"><summary>${state.outcome?'查看／修改实际行动记录':'记录实际做了什么'}</summary><label for="actual-action">实际行动或产物</label><textarea class="agent-input" id="actual-action" rows="4" placeholder="写下实际做了什么，以及可以核对的产物。没有完成也可以如实记录。" maxlength="2000">${esc(state.outcome?.actual || '')}</textarea><label for="helpfulness">这条建议的帮助程度</label><select class="agent-input" id="helpfulness"><option value="unclear">还不确定</option><option value="helpful">有帮助</option><option value="neutral">没有明显帮助</option><option value="harmful">反而不合适</option></select><div class="agent-actions"><button class="agent-button primary" data-action="outcome">保存演示结果</button></div></details>${state.outcome ? `<div class="agent-result"><h4>你记录的实际情况</h4><p>${esc(state.outcome.actual)}</p><p class="agent-muted">帮助程度：${({unclear:'还不确定',helpful:'有帮助',neutral:'没有明显帮助',harmful:'反而不合适'})[state.outcome.helpfulness]}</p><button class="agent-button" data-action="revise">整理下次经验候选</button></div>`:''}${state.revision ? `<div class="agent-result"><h4>下次经验 · 待确认候选</h4><p>${esc(state.revision)}</p><p class="agent-muted">来源：本事件复盘 + 你刚记录的实际行动。尚未改写或激活原规则。</p></div>`:''}</li>` : '';
  if (visible && state.outcome) {
    // Present feedback as the existing review-card type linked to the action card,
    // rather than inventing a parallel Agent action-record domain.
    const reviewCard = document.createElement('li');
    reviewCard.className = 'preview-card';
    reviewCard.style.borderLeftColor = 'var(--chart-4)';
    reviewCard.innerHTML = '<div class="agent-row"><span class="agent-chip">复盘卡</span><span class="agent-muted">关联上方行动卡 · 演示保存</span></div><p class="agent-muted">实际情况由你填写；本次判断不会自动修改规则的有效次数。</p>';
    for (const block of cardList.querySelectorAll('.preview-card > .agent-result')) reviewCard.append(block);
    cardList.append(reviewCard);
  }
  if (state.outcome && $('#helpfulness')) $('#helpfulness').value = state.outcome.helpfulness;
}
function render() {
  document.body.dataset.mode = state.mode;
  $('#baseline').setAttribute('aria-pressed', String(state.mode === 'baseline'));
  $('#enhanced').setAttribute('aria-pressed', String(state.mode === 'enhanced'));
  gptButton.setAttribute('aria-expanded', String(state.open));
  gptButton.title = state.mode === 'enhanced' ? '在原位置展开 Agent 分析；模拟响应' : '演示现有的文本上下文导出';
  $('#agent-slot').innerHTML = state.open ? `<section class="agent-panel" aria-label="Agent 分析">${agentContent()}</section>` : '';
  renderCards();
}
function source(key) {
  const rule = key === 'rule';
  $('#source-body').innerHTML = `<div class="agent-kicker">经验溯源 · 原始记录</div><h2 id="source-heading">${rule?'本案例的候选规则':'vibe coding 5h · 原复盘'}</h2><dl class="source-grid"><dt>来源</dt><dd>事件案例库 / 事件 #3 / ${rule?'本案例生成的规则':'复盘记录'}</dd><dt>记录日期</dt><dd>2026-10-31</dd><dt>证据性质</dt><dd>${rule?'候选规则，未证明有效':'用户自述，未经独立验证'}</dd></dl><blockquote>${rule?esc('启用 grill me skills 进行排查，收敛方向'):esc('发生了什么：coding 5h,思路混乱，缺乏灵感\n为什么没有立即发现：想法模糊\n所选根因：离开时未检查\n如何防止：用 AI 进行苏格拉底提问法进行提问')}</blockquote><p class="agent-muted" style="margin:14px 0">此处显示线上原记录的只读副本。适用条件及分析由预览另行提出，不是这段原文已有的事实。</p>`;
  $('#source-dialog').showModal();
}
gptButton.addEventListener('click', () => { state.open = !state.open; state.phase = state.mode === 'baseline' ? 'manual' : 'analysis'; persist(); render(); });
$('#close-source').addEventListener('click', () => $('#source-dialog').close());
$('#source-dialog').addEventListener('click', event => { if (event.target === $('#source-dialog')) $('#source-dialog').close(); });
document.addEventListener('input', event => {
  if (event.target.id === 'draft-title') state.title = event.target.value;
  if (event.target.id === 'action-draft') state.draft = event.target.value;
  if (event.target.id === 'future-context') state.future = event.target.value;
  if (['draft-title','action-draft','future-context'].includes(event.target.id)) persist();
});
document.addEventListener('click', event => {
  const sourceTarget = event.target.closest('[data-source]');
  if (sourceTarget) { source(sourceTarget.dataset.source); return; }
  if (event.target.closest('#baseline')) { state.mode = 'baseline'; state.open = false; persist(); render(); return; }
  if (event.target.closest('#enhanced')) { state.mode = 'enhanced'; state.open = true; state.phase = 'analysis'; persist(); render(); return; }
  if (event.target.closest('#reset')) { if (confirm('清空此原型的演示记录和草稿？不会影响线上数据。')) { state = { ...initial }; persist(); render(); } return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'collapse') state.open = false;
  if (action === 'failure') state.phase = 'failure';
  if (action === 'retry') state.phase = 'analysis';
  if (action === 'manual') state.phase = 'manual';
  if (action === 'adopt') {
    if (!state.title.trim() || !state.draft.trim()) { notice('先填写行动卡标题和内容，草稿会保留。'); return; }
    if (!state.card) state.card = { title: state.title.trim(), content: state.draft.trim() };
    notice('已保存到下方原有卡片流的演示副本；尚未记录实际行动。');
  }
  if (action === 'reject') { state.rejected = true; notice('已标记本次不适用，不改写原规则。'); }
  if (action === 'future-example') { state.future = '想再写一个新原型，但还没有明确这次要验证什么'; $('#future-context').value = state.future; persist(); return; }
  if (action === 'future-match') {
    if (!state.future.trim()) { notice('先写下你现在准备做的事。'); return; }
    const isScenario = state.future.trim() === '想再写一个新原型，但还没有明确这次要验证什么';
    $('#future-result').textContent = isScenario ? '这个演示场景符合“目标不清却准备实现”的条件。可参考本次已保存的复盘，先用上方三行草稿明确目标，再决定是否继续。原规则仍是候选，不代表一定有效。' : '这是固定场景原型，无法可靠分析任意输入。可点击“填入演示场景”体验关联效果；你的输入不会被当成匹配成功。';
    return;
  }
  if (action === 'outcome') {
    const actual = $('#actual-action').value.trim();
    if (!actual) { notice('请先记录实际发生的情况；没有行动也可以如实写下。'); return; }
    state.outcome = { actual, helpfulness: $('#helpfulness').value }; state.revision = null;
    notice('演示结果已保存；未知仍保持未知，不自动增加改善次数。');
  }
  if (action === 'revise' && state.outcome) {
    state.revision = state.outcome.helpfulness === 'helpful' ? '暂时保留“目标不清时先澄清再实现”作为候选经验；这次自评有帮助，仍需在后续相似情境中验证。' : '这次结果不足以确认该经验有效。保留原始行动记录，下一次先核对“是否确实因为目标不清”，再决定沿用、修改或暂停这条候选。';
  }
  if (action) { persist(); render(); if (action === 'adopt') originalCards.scrollIntoView({behavior:'smooth',block:'center'}); return; }
  const originalLink = event.target.closest('a');
  if (originalLink) { event.preventDefault(); notice('这是原页面导航的保真展示；未连接线上页面或写入。'); return; }
  if (event.target.closest('button') && !event.target.closest('.preview-bar') && !event.target.closest('#existing-context') && !event.target.closest('dialog')) notice('原有操作仅作布局展示，未连接线上写入。');
  if (event.target.closest('#existing-context button') && event.target.closest('button') !== gptButton && !action) notice('Daily Review 入口保持原位；本次只演示 Agent 增量。');
});
function openAgentLink() {
  if (window.location.hash !== '#existing-context') return false;
  state.mode = 'enhanced';
  state.open = true;
  state.phase = 'analysis';
  render();
  requestAnimationFrame(() => $('#existing-context').scrollIntoView());
  return true;
}

window.addEventListener('hashchange', openAgentLink);
if (!openAgentLink()) render();
