// 卡片类型配置(唯一扩展点)
// 新增卡片类型:在这里加一项即可,不需要改表结构、组件或页面。

export type CardTypeKey =
  | "boundary"
  | "decision"
  | "risk"
  | "execution"
  | "review"
  | "action"
  | "backlog"
  | "note"

export interface CardTypeConfig {
  key: CardTypeKey
  label: string
  // 用于卡片左侧色条与徽标的语义色(Tailwind 类)
  accentClass: string
  badgeClass: string
  // 内容输入框的占位提示
  placeholder: string
}

export const CARD_TYPE_CONFIGS: CardTypeConfig[] = [
  {
    key: "boundary",
    label: "边界卡",
    accentClass: "bg-primary",
    badgeClass: "bg-primary/10 text-primary",
    placeholder: "最低做到什么程度就够?什么时候必须停?",
  },
  {
    key: "decision",
    label: "决策卡",
    accentClass: "bg-chart-2",
    badgeClass: "bg-accent text-accent-foreground",
    placeholder: "决定做什么/不做什么?依据是什么?",
  },
  {
    key: "risk",
    label: "风险卡",
    accentClass: "bg-destructive",
    badgeClass: "bg-destructive/10 text-destructive",
    placeholder: "可能出什么问题?代价多大?如何兜底?",
  },
  {
    key: "execution",
    label: "执行卡",
    accentClass: "bg-chart-3",
    badgeClass: "bg-secondary text-secondary-foreground",
    placeholder: "具体做什么?时间盒多久?产出证据是什么?",
  },
  {
    key: "review",
    label: "复盘卡",
    accentClass: "bg-chart-4",
    badgeClass: "bg-muted text-muted-foreground",
    placeholder: "结果如何?学到什么?下次怎么改?",
  },
  {
    key: "action",
    label: "行动卡",
    accentClass: "bg-chart-5",
    badgeClass: "bg-accent text-accent-foreground",
    placeholder: "下一步的具体动作是什么?",
  },
  {
    key: "backlog",
    label: "Backlog 卡",
    accentClass: "bg-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground",
    placeholder: "好想法先停在这里,写清楚为什么暂缓。",
  },
  {
    key: "note",
    label: "笔记卡",
    accentClass: "bg-border",
    badgeClass: "bg-muted text-muted-foreground",
    placeholder: "任何补充说明。",
  },
]

export function getCardTypeConfig(key: string): CardTypeConfig {
  return CARD_TYPE_CONFIGS.find((c) => c.key === key) ?? CARD_TYPE_CONFIGS[CARD_TYPE_CONFIGS.length - 1]
}
