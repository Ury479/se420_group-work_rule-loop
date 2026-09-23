// 熵减系统:外部供给渠道导航门面(Facade)
// ─────────────────────────────────────────────
// 根源问题:预览/宿主环境常运行在 iframe 中,而微信读书、模型树等外站
// 通过 X-Frame-Options / CSP frame-ancestors 禁止被嵌入 —— 同框架导航
// (location.assign、普通 <a>)会被目标站拒绝,表现为"点了没反应"。
//
// 设计:
// - ChannelRegistry(注册表):渠道配置的唯一来源,新增渠道只改这里。
// - NavigationStrategy(策略):按运行环境决定"怎么跳"。
//   · embedded(iframe 内)→ 必须新开标签页,绕过外站防嵌入限制
//   · top-level(独立标签页)→ 同样新开标签页,保留本站会话状态
// - ExternalNavigator(门面):调用方只面对 open(channel) 一个入口,
//   不感知 iframe 检测、弹窗拦截回退等细节。

export type SupplyTarget = "weread" | "model-tree" | "zcode"

// ── 渠道注册表 ──────────────────────────────

interface ChannelConfig {
  /** 官网地址,null 表示该渠道暂无可跳转的官网 */
  webUrl: string | null
}

const CHANNEL_REGISTRY: Record<SupplyTarget, ChannelConfig> = {
  weread: { webUrl: "https://weread.qq.com/" },
  "model-tree": { webUrl: "https://www.moxingshu.cn/article" },
  zcode: { webUrl: null },
}

// ── 环境探测 ──────────────────────────────

function isEmbedded(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.self !== window.top
  } catch {
    // 跨域访问 window.top 抛异常,说明一定在 iframe 里
    return true
  }
}

// ── 导航策略 ──────────────────────────────

type NavigationResult = { ok: true } | { ok: false; reason: "not-browser" | "not-configured" | "popup-blocked" }

/**
 * 在新标签页打开外站。
 * 用 window.open 而非修改当前地址:在 iframe 内是唯一可行方式,
 * 在顶层窗口则可保留本站页面状态(就寝清单、打卡进度不丢失)。
 * 若被弹窗拦截(window.open 返回 null),回退为动态 <a target="_blank"> 合成点击。
 */
function openInNewTab(url: string): NavigationResult {
  const win = window.open(url, "_blank", "noopener,noreferrer")
  if (win) return { ok: true }

  // 回退:合成一次真实的链接点击,绕过部分 window.open 拦截
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.target = "_blank"
  anchor.rel = "noopener noreferrer"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  return { ok: true }
}

// ── 门面:调用方唯一入口 ──────────────────────────────

export const externalNavigator = {
  /** 渠道是否可跳转(用于 UI 渲染可用态) */
  isAvailable(target: SupplyTarget): boolean {
    return CHANNEL_REGISTRY[target].webUrl !== null
  },

  /** 渠道官网地址(用于渲染真实 <a href>,保证可访问性与"复制链接"等原生行为) */
  urlOf(target: SupplyTarget): string | null {
    return CHANNEL_REGISTRY[target].webUrl
  },

  /** 打开渠道官网。内部自动处理 iframe 环境与弹窗拦截。 */
  open(target: SupplyTarget): NavigationResult {
    if (typeof window === "undefined") return { ok: false, reason: "not-browser" }

    const url = CHANNEL_REGISTRY[target].webUrl
    if (!url) return { ok: false, reason: "not-configured" }

    // iframe 内与顶层窗口目前策略一致(均新开标签页),
    // 但显式分支保留:若未来顶层要改为同页跳转,只改这里。
    if (isEmbedded()) return openInNewTab(url)
    return openInNewTab(url)
  },
}
