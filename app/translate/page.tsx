import { TranslateTool } from "@/components/translate-tool"
import { getTranslations } from "@/app/actions/translate"

export const metadata = {
  title: "中转英 | 关键动作拦截台",
}

export default async function TranslatePage() {
  const history = await getTranslations()

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-balance">中文转英文</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          把需求、作业说明、消息或复盘规则翻译成英文,用于项目提示词或正式沟通。
        </p>
      </header>
      <TranslateTool
        history={history.map((h) => ({
          id: h.id,
          sourceText: h.sourceText,
          translatedText: h.translatedText,
          usageScene: h.usageScene,
          tone: h.tone,
          createdAt: h.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
