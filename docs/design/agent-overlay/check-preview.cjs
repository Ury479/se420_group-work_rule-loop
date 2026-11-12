// Focused acceptance of the design interactions, never the application test database.
const { createRequire } = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const req = createRequire(path.resolve(__dirname, '../../../package.json'));
const { chromium, expect } = req('@playwright/test');
const output = path.join(__dirname, 'renders');
fs.mkdirSync(output, { recursive: true });
const checks = [];
async function check(name, operation) { await operation(); checks.push(name); }
async function main() {
  const executablePath = fs.existsSync(chromium.executablePath()) ? chromium.executablePath() : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
    const page = await context.newPage();
    const errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:8788/')) external.push(request.url()); });
    await check('direct link opens the Agent below the fixed toolbar', async () => {
      await page.goto('http://127.0.0.1:8788/#existing-context');
      const panel = page.getByRole('region',{name:'Agent 分析',exact:true});
      await expect(panel.getByRole('heading',{name:'把这次教训用到下一次判断'})).toBeInViewport();
      await expect.poll(() => page.evaluate(() =>
        document.querySelector('#existing-context').getBoundingClientRect().top >= document.querySelector('.preview-bar').getBoundingClientRect().bottom
      )).toBe(true);
    });
    await page.goto('http://127.0.0.1:8788/');
    await check('original case text, root-cause selection and candidate status remain visible', async () => {
      await expect(page.getByRole('heading', {name:'vibe coding 5h',exact:true})).toBeVisible();
      await expect(page.getByText('离开时未检查',{exact:true})).toBeVisible();
      await expect(page.getByText('候选',{exact:true})).toBeVisible();
    });
    await check('original baseline keeps navigation and removes the proposed panel', async () => {
      await page.getByRole('button',{name:'原有界面',exact:true}).click();
      await expect(page.getByRole('region',{name:'Agent 分析',exact:true})).toHaveCount(0);
      await expect(page.getByRole('navigation',{name:'主导航',exact:true})).toBeVisible();
      await page.screenshot({path:path.join(output,'01-original-page.png')});
    });
    await check('enhancement expands in the existing event and preserves original review', async () => {
      await page.getByRole('button',{name:'叠加 Agent',exact:true}).click();
      await expect(page.getByRole('region',{name:'Agent 分析',exact:true})).toBeVisible();
      await expect(page.getByText('coding 5h,思路混乱，缺乏灵感',{exact:true})).toBeVisible();
      await page.locator('#existing-context').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(output,'02-inline-agent.png')});
    });
    await check('source distinguishes quoted user review from proposed interpretation', async () => {
      await page.getByRole('button',{name:'来源：这条事件的原复盘 ↗',exact:true}).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('dialog')).toContainText('用户自述，未经独立验证');
      await expect(page.getByRole('dialog')).toContainText('所选根因：离开时未检查');
      await page.screenshot({path:path.join(output,'03-source.png')});
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
    await check('empty draft cannot become an action card', async () => {
      await page.getByLabel('可编辑草稿',{exact:true}).fill('');
      await page.getByRole('button',{name:'采纳到原有行动卡',exact:true}).click();
      await expect(page.locator('.preview-card')).toHaveCount(0);
      await expect(page.locator('#preview-notice')).toContainText('先填写');
    });
    const title = '先检查原方向，再决定是否实现';
    const draft = '问题：Agent 应叠加到原闭环\n保留：原事件、规则、卡片\n验证：先比较原页面增量';
    await check('editable draft survives refresh before adoption', async () => {
      await page.getByLabel('行动卡标题',{exact:true}).fill(title);
      await page.getByLabel('可编辑草稿',{exact:true}).fill(draft);
      await page.reload();
      await expect(page.getByLabel('可编辑草稿',{exact:true})).toHaveValue(draft);
    });
    await check('timeout retains draft and does not retry or pretend success', async () => {
      await page.getByText('演示边界与异常',{exact:true}).click();
      await page.getByRole('button',{name:'预览模型不可用时',exact:true}).click();
      await expect(page.getByText('本次分析没有完成',{exact:true})).toBeVisible();
      await page.getByRole('button',{name:'重新预览分析',exact:true}).click();
      await expect(page.getByLabel('可编辑草稿',{exact:true})).toHaveValue(draft);
    });
    await check('unsupported free text is not portrayed as a successful AI match', async () => {
      await page.getByText('代入下一次类似情况',{exact:true}).click();
      await page.getByLabel('你现在准备做什么？',{exact:true}).fill('想确认一段代码为什么编译失败');
      await page.getByRole('button',{name:'对照这条经验',exact:true}).click();
      await expect(page.locator('#future-result')).toContainText('无法可靠分析任意输入');
      await page.getByRole('button',{name:'填入演示场景',exact:true}).click();
      await page.getByRole('button',{name:'对照这条经验',exact:true}).click();
      await expect(page.locator('#future-result')).toContainText('原规则仍是候选');
    });
    await check('not applicable keeps the rule and permits the user to make another choice', async () => {
      await page.getByRole('button',{name:'这次不适用',exact:true}).click();
      await expect(page.getByText('候选',{exact:true})).toBeVisible();
      await expect(page.getByRole('button',{name:'采纳到原有行动卡',exact:true})).toBeEnabled();
    });
    await check('adoption creates one action card and does not imply execution', async () => {
      await page.getByRole('button',{name:'采纳到原有行动卡',exact:true}).click();
      await expect(page.locator('.preview-card')).toHaveCount(1);
      await expect(page.locator('.preview-card')).toContainText(title);
      await expect(page.locator('.preview-card')).toContainText('采纳不等于已经执行');
      await expect(page.getByRole('button',{name:'已存入下方行动卡',exact:true})).toBeDisabled();
      await page.reload();
      await expect(page.locator('.preview-card')).toHaveCount(1);
    });
    await check('blank actual outcome does not create a review', async () => {
      await page.getByText('记录实际做了什么',{exact:true}).click();
      await page.getByRole('button',{name:'保存演示结果',exact:true}).click();
      await expect(page.locator('.preview-card')).toHaveCount(1);
    });
    await check('actual outcome becomes a linked review card and unknown remains unknown', async () => {
      await page.getByLabel('实际行动或产物',{exact:true}).fill('写出了三行需求；还没有实际使用 Agent，是否有效仍未知。');
      await page.getByRole('button',{name:'保存演示结果',exact:true}).click();
      await expect(page.locator('.preview-card')).toHaveCount(2);
      await expect(page.locator('.preview-card').nth(1)).toContainText('复盘卡');
      await expect(page.locator('.preview-card').nth(1)).toContainText('还不确定');
      await page.getByRole('button',{name:'整理下次经验候选',exact:true}).click();
      await expect(page.locator('.preview-card').nth(1)).toContainText('不足以确认该经验有效');
      await expect(page.getByText('候选',{exact:true})).toBeVisible();
      await page.locator('[aria-label="卡片流"]').scrollIntoViewIfNeeded();
      await expect(page.locator('#preview-notice')).not.toHaveClass(/visible/, {timeout:6000});
      await page.screenshot({path:path.join(output,'04-existing-card-loop.png')});
    });
    await check('desktop and mobile layouts have no horizontal overflow', async () => {
      for (const width of [1440,768,390]) {
        await page.setViewportSize({width,height:1000});
        const size = await page.evaluate(() => ({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
        expect(size.scroll).toBeLessThanOrEqual(size.viewport);
      }
      await page.locator('#existing-context').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(output,'05-mobile.png')});
    });
    await check('no browser exceptions or off-origin requests', async () => { expect(errors).toEqual([]); expect(external).toEqual([]); });
    await check('all original source files still match the read-only render manifest', async () => {
      const manifest = JSON.parse(fs.readFileSync(path.join(__dirname,'source-manifest.json'),'utf8'));
      for(const source of manifest.readOnlySources) expect(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../../..',source.file))).digest('hex')).toBe(source.sha256);
    });
    fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify({time:new Date().toISOString(),passed:checks.length,checks,errors,externalRequests:external,scope:'Static design and local browser interactions only; not production integration or Hermes acceptance'},null,2));
    console.log(JSON.stringify({passed:checks.length,report:path.join(__dirname,'verification.json')}));
    await context.close();
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode=1; });
