'use strict';

const scenarios = {
  scope: {
    title: '给 RuleLoop 加入 Personal Agent',
    action: '先定一个验收标准',
    label: 'Agent 已起草',
    draft: '打开现有布防页，能看到一条有来源的经验和一个可立即开始的动作，并把准备结果存回布防草稿。',
    reasonTitle: '为什么建议先定验收标准？',
    reason: '上一次写了 5 小时，复盘时记下「想法模糊」。这次先定好能当场检查的结果，再开始改页面。',
    cost: '做了很久才发现方向偏离，需要返工。',
    risk: '验收标准还没定，就开始实现整套功能。',
  },
  build: {
    title: '修复已定位的编译错误',
    action: '记下第一条报错',
    label: 'Agent 已准备复现记录',
    draft: '运行的命令：\n第一条报错与文件位置：\n修复判定：同一命令通过，原有页面能打开。',
    reasonTitle: '为什么这次从报错开始？',
    reason: '本次的目标和验收标准已经明确。旧复盘提到的方向模糊不适用，先保留现场报错更有帮助。',
    cost: '修了一处却不能确认原报错是否消失。',
    risk: '同时改动多个文件，把第一条报错的原因混在一起。',
  },
};

const $ = id => document.getElementById(id);
const form = $('arm-page').querySelector('form');
const pageHeader = $('arm-page').querySelector('header');
form.before($('prep-template').content.cloneNode(true));

const carry = document.createElement('section');
carry.className = 'prep-carry';
carry.innerHTML = '<strong>准备草稿</strong><p id="prep-carry-text"></p>';
form.before(carry);
const formStatus = document.createElement('p');
formStatus.setAttribute('role', 'status');
formStatus.className = 'prep-status';
form.after(formStatus);

const origin = JSON.parse($('prep-origin-data').textContent);
$('prep-origin').textContent = `「${origin.review.whyNotDiscovered}」`;
$('prep-origin-title').textContent = `原复盘 · ${origin.title} · 2026-10-31`;

const fields = ['title', 'costIfFailed', 'likelyMistake', 'domain', 'finalActionType'];
const storageKey = 'ruleloop-preparation-preview';
const drafts = new Map();
let scenarioKey = 'scope';
let saved = null;
try { saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null'); } catch {}
if (saved?.status !== 'draft') saved = null;

function setMode(preparing) {
  $('prep').hidden = !preparing;
  $('prep-mode').hidden = preparing;
  $('form-mode').hidden = !preparing;
  pageHeader.hidden = preparing;
  form.hidden = preparing;
  formStatus.hidden = preparing;
  carry.hidden = preparing || !saved?.preparationDraft;
}

function showStatus() {
  const draftMatches = saved?.title === scenarios[scenarioKey].title
    && saved?.preparationDraft === $('prep-text').value.trim();
  $('prep-status').textContent = draftMatches ? '已存入草稿' : '';
  $('prep-status').dataset.saved = String(draftMatches);
  $('prep-save').textContent = draftMatches ? '查看布防草稿' : '存入布防草稿';
  return draftMatches;
}

function selectScenario(key) {
  scenarioKey = key;
  const scenario = scenarios[key];
  $('prep-task').textContent = scenario.title;
  $('prep-action').textContent = scenario.action;
  $('prep-label').textContent = scenario.label;
  const savedText = saved?.title === scenario.title ? saved.preparationDraft : null;
  $('prep-text').value = drafts.get(key) ?? savedText ?? scenario.draft;
  $('prep-reason-title').textContent = scenario.reasonTitle;
  $('prep-source-note').textContent = scenario.reason;
  $('prep-reason').open = false;
  setMode(true);
  showStatus();
}

function fillForm() {
  if (!saved) return;
  for (const field of fields) {
    if (typeof saved[field] === 'string') form.elements.namedItem(field).value = saved[field];
  }
  $('prep-carry-text').textContent = saved.preparationDraft ?? '';
}

function save(record) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(record));
    saved = record;
    fillForm();
    return true;
  } catch {
    return false;
  }
}

$('prep-text').addEventListener('input', () => {
  drafts.set(scenarioKey, $('prep-text').value);
  showStatus();
});
$('prep-save').addEventListener('click', () => {
  if (showStatus()) {
    setMode(false);
    form.elements.namedItem('title').focus();
    return;
  }
  const preparationDraft = $('prep-text').value.trim();
  if (!preparationDraft) {
    $('prep-status').textContent = '请输入一段准备内容。';
    $('prep-text').focus();
    return;
  }
  const scenario = scenarios[scenarioKey];
  if (save({
    title: scenario.title,
    costIfFailed: scenario.cost,
    likelyMistake: scenario.risk,
    domain: 'custom',
    finalActionType: 'custom',
    preparationDraft,
    status: 'draft',
  })) showStatus();
  else $('prep-status').textContent = '本机暂时无法保存，草稿仍在编辑框中。';
});

document.querySelectorAll('[data-example]').forEach(button => {
  button.addEventListener('click', () => {
    selectScenario(button.dataset.example);
    button.closest('details').open = false;
  });
});
$('prep-mode').addEventListener('click', () => setMode(true));
$('form-mode').addEventListener('click', () => setMode(false));

const optionalButton = form.querySelector('button[aria-expanded]');
if (optionalButton) optionalButton.hidden = true;
form.querySelector('button[type="submit"]').textContent = '保存布防草稿';
form.addEventListener('submit', event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  const preparationDraft = saved?.title === values.title ? saved.preparationDraft : '';
  formStatus.textContent = save({ ...values, preparationDraft, status: 'draft' })
    ? '已存入本机草稿，等待执行。'
    : '本机暂时无法保存，草稿仍在表单中。';
  carry.hidden = !saved?.preparationDraft;
  showStatus();
});

document.querySelectorAll('nav a, aside a').forEach(link => {
  link.addEventListener('click', event => event.preventDefault());
});

fillForm();
selectScenario('scope');
