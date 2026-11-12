# RuleLoop 微信小程序 · 需求与验收

> v0.1 · 2026-11-11 · **待人工核对，尚未开发**  
> 本稿以 [微信小程序产品方案](PRODUCT-WECHAT-MINIPROGRAM.md) 的方案 A 为评审对象。方案 B 如被选中，需另写原生页面与接口规格。

## 1. 本机核对

检索了 `~/Downloads`、`~/Documents` 和 `~/Desktop` 中的项目配置与 WXML 源文件，排除依赖和构建目录。下表路径相对 `/Users/ury/Downloads/project/`。以配置指向的源码目录和 `app.json` 核对项目，内外两份配置指向同一套源码时合并展示。

| 项目 | 看到的状态 | 与本次的关系 |
| --- | --- | --- |
| [`rule-loop/`](../project.config.json) | 根目录有 `project.config.json` 和 `project.private.config.json`，未指定 `miniprogramRoot`；根目录无 `app.json` 或 `app.js`，也没有 `miniprogram/` 源码目录。私有配置中 `urlCheck: false`。 | 当前账号版工作区；现有配置不足以编译小程序，后续应把小程序包限定在独立源码目录。 |
| [`yuri-manageSystem/rule-loop/miniprogram/`](../../yuri-manageSystem/rule-loop/miniprogram/app.json) | 旧版 RuleLoop。五个原生标签用 `web-view` 分别打开旧 `rule-loop.vercel.app` 的 `/`、`/spending-review`、`/arm`、`/rules`、`/event-library`。`authMode: 0`，配套旧项目默认单用户。 | 可参考项目结构和容器写法；旧域名、登录假设及标签编排需按当前账号版重定。 |
| [`yuri-manageSystem/miniprogram/`](../../yuri-manageSystem/miniprogram/README.md) | 个人仪表盘，八个已登记页面，含 H5 登录、配置与加载错误处理；另有上层项目配置。 | 可参考失败提示和环境隔离，认证属于另一产品。 |
| [`sleep/wechat-miniprogram/`](../../sleep/wechat-miniprogram/README.md) | 睡眠项目有独立网页容器及内外两份项目配置。 | 参考体验环境配置，与 RuleLoop 数据独立。 |
| 其他本机项目 | `personal-website/ugly-diary`、`little_02/ocupation_job/JadeAI`、`github/liubai/liubai-frontends/liubai-weixin`、`星球项目/yupi_learn01` 有小程序源码；`little_02/ocupation_job` 外层另有配置但缺默认入口。 | 独立项目，本次只做识别。 |

- **已核实的工具和源码：** 本机安装微信开发者工具 `2.01.2510280` 和 `2.01.2510290`。旧 RuleLoop 的 6 个 JS 文件通过语法检查、8 个 JSON 可解析，五个页面及标签图标引用均存在。静态检查尚不能证明可以编译、登录或扫码使用。
- **AppID 重复：** 当前目录和旧 RuleLoop 的配置值相同；个人仪表盘和睡眠项目的部分配置、`ugly-diary` 也填写了相同值。无法由本机文件确定这个 AppID 的主体、成员权限、域名权限或线上发布内容。由账号管理员在[微信公众平台](https://mp.weixin.qq.com/)核对后，指定本项目使用的 AppID。
- **候选线上目标：** 本轮以未登录 GET 访问 [`https://ruleloop.xiaobulab.cn/`](https://ruleloop.xiaobulab.cn/)，HTTPS 正常，根地址跳到 `/sign-in?next=%2F`，登录页返回 200。当前源码使用 [Better Auth](../src/lib/auth.ts) 和 [账号事务](../src/lib/action.ts)。本轮未在微信内登录、写数据或检查微信公众平台配置，亦未核对线上部署是否与当前所有本机页面一致。

## 2. 首期功能要求

以当前账号版路由和组件为准，沿用原字段、校验和状态。小程序使用已有服务端账户体系与数据库。同一记录在两端使用同一个标识，新增记录以服务端保存为准。

| 编号 | 当前网页基线 | 微信端应可完成 |
| --- | --- | --- |
| WX-01 入口与会话 | `/`、`/sign-in`、`/sign-up`；[路由鉴权](../src/proxy.ts) | 从微信打开首页；未登录走现有账号登录，成功回到原站内页面；处理错密码、会话过期、退出和切换账号。登录有效时重开保持可用会话。 |
| WX-02 首页与工作台 | [`/`](../src/app/page.tsx)、[`/dashboard`](../src/app/dashboard/page.tsx)、`/tasks` | 空账号看到空态；有数据时查看未来一周的日期、状态与今日质量分，从相应入口打开原任务和原换算记录。首页可进入「继续上次」。 |
| WX-03 接续与打卡 | `/habits` · [继续上次](PRD-CONTINUE-LAST.md) | 显示下一步或最近进展；开发产出必填，已选论文可一键记录；保持两项启用上限、暂存切换与历史。手机点按热力图能查日期与次数；只写下一步不增加计数。 |
| WX-04 金额换算 | `/convert`、`/convert/[id]`、`/convert/catalog` · [换算需求](PRD-CONSUMPTION-CONVERTER.md) | 录入有效金额，查看比较和价格／汇率快照；验证表单、冷静期、历史与最终结果。重新进入定位同一条记录。使用现有单位和金额口径，保留用户备注原文。 |
| WX-05 支出审核 | `/spending-review`、`/spending-review/new`、`/spending-review/[id]` · [支出审核需求](PRD-SPENDING-REVIEW.md) | 查看及提交计划；需要冷静期时，到期后由用户选择是否发起审核；可退出后再查状态，同一记录内重试，由用户保存最终决定。等待、失败、完成与待确认状态应能区分。 |
| WX-06 界面与恢复 | [账号版页面容器](../src/components/app-shell.tsx)、`/settings` | 只显示一套业务导航。保留中英文切换及石白／靛夜，刷新后仍能恢复选择；应用日期边界与网页一致。适配安全区、键盘和返回；加载、断网、网页错误有反馈和重试入口，失败时不把输入标为已保存。 |

现有的规则库、事件库和记录入口继续由网页导航访问，首期对可达性做抽查。外部链接和下载单列兼容性，验收记录应列明未覆盖项。首期不新增微信身份绑定、微信支付、推送、离线写入或业务内容分享。

## 3. 封装与平台前提

1. **正式身份与域名。** 先确认 AppID、主体、成员权限及已有线上版本，再核对 `ruleloop.xiaobulab.cn` 是否能登记为该 AppID 的业务域名并通过所有权校验。检查 HTTPS 证书、备案状态和跳转链；如平台要求根目录校验文件，按平台结果准备。网页的业务域名与原生 `wx.request` 的服务器域名是不同配置。网页容器方案不需要为未使用的原生 API 添加域名。参考[微信网页容器](https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html)、[腾讯云业务域名校验示例](https://cloud.tencent.com/document/product/1301/100434)和[微信网络请求](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)。
2. **项目与环境。** 拟在当前工作区的 `miniprogram/` 建立独立小程序包，从仓库根目录配置 `miniprogramRoot` 指向该包；验证包内没有网页源码、环境文件或测试数据。体验测试使用获准且可在微信内访问的 HTTPS 环境与隔离测试账号数据；正式包只加载核准域名。最终验收关闭跳过域名与证书校验的选项，手机关闭调试模式。参考[微信项目配置](https://developers.weixin.qq.com/miniprogram/dev/devtools/projectconfig.html)。
3. **身份和链接边界。** 网页容器内沿用 Better Auth 会话与服务端账号隔离，不迁移旧版 `default-user` 或 Vercel 数据。容器入口及登录返回路径只接受允许的站内目标。受鉴权保护的网页详情保留现有记录 ID；小程序启动和分享参数、调试日志不得暴露私人记录标识、金额、任务标题、口令或会话。业务链接不自动分享，也不通过 `postMessage` 传递会话。若改做微信原生登录，另审账号绑定、服务端换取会话与接口契约，参考[微信小程序登录](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html)。
4. **平台资料与范围变更。** 体验或提审前核对平台服务类目、备案与隐私指引所需资料。按实际数据处理说明现有支出审核会使用必要字段，避免在新增的小程序日志中记录输入。方案 A 预计无需改数据库结构；若真机验证发现要改变鉴权、数据结构或业务规则，先更新需求并重新核对该变更。

## 4. 验收与证据

| 验收 | 操作与通过条件 | 证据 |
| --- | --- | --- |
| A1 项目与域名 | 当前目录可导入编译；指定 AppID 下的业务域名通过校验；iOS 与 Android 的微信在非调试模式下都能打开，加载失败可重试，返回不进空白页。 | 项目配置检查、已脱敏的平台配置截图、两台真机打开与返回记录 |
| A2 账号与数据隔离 | 测错密码、登录回原路由、退出及会话过期。账号 A 在微信新增测试习惯，网页显示同一项并改名，微信刷新后看到新名称。账号 B 即使在容器内访问 A 的测试换算详情地址，也读不到该记录。 | 使用隔离数据的两端操作记录、失败状态截图 |
| A3 首页与习惯 | 分别用空账号和有任务账号检查一周日期、状态、按钮和读屏文案。进入继续上次，跑通新增、打卡、满两项后暂存与启用、重开后接续，核对记录及计数。 | 双平台关键页面与浏览器对照、记录 ID 或次数对照 |
| A4 金额换算 | 比较无效与有效输入；查看详情、价值目录、冷静期和结果；在换算和首页的原入口能找回同一条记录。中 → 英 → 中切换及刷新后显示正确，备注保持原文。 | 带测试数据的表单、详情与历史截图 |
| A5 支出审核 | 用隔离环境覆盖直接审核、冷静期后确认、同记录失败重试、用户决定归档。切出微信再回到详情，仍能查进度和最终结果；重复点击或请求中断后无重复业务记录。可控审核响应和实际审核连通性分别记录。 | 端到端记录、同一记录的状态和尝试次数 |
| A6 手机可用性 | 检查微信返回／前后台恢复、弱网、长文本、键盘、安全区、切语言及外观、敏感信息不出现在分享路径或日志。失败有可执行的下一步。 | iOS、Android 的设备、微信版本、场景与结果 |

开发阶段按 [AGENTS.md](../AGENTS.md) 和 [README](../README.md) 运行与改动相关的账号版回归；浏览器验证与同目录生产构建顺序执行。开发者工具、iOS、Android 结果分别登记，网页可访问、模拟器预览、体验包和平台发布分别记状态。

## 5. 核对与开工顺序

1. **当前：** 核对方案 A、首期范围、拟用账号主体及域名条件。AppID 或资格未核实前，状态保持待核对。
2. **需求确认后：** 依项目的 Design-First 流程，使用 `guizang-ppt-skill` 的视觉方法准备手机高保真基线，覆盖进入、登录、正常操作、断网恢复等关键状态，用浏览器或截图评审。
3. **视觉确认或达到明确验收后：** 开发小程序包，进行隔离环境与真机测试。本稿只规划体验交付；平台提审、公开发布和线上切换不在本轮范围。
