import type { Metadata } from "next"
import Link from "next/link"
import { getAshMemos } from "@/app/actions/intercept"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AshMemoList } from "@/components/ash-memo-list"
import { Flame, Plus } from "lucide-react"

export const metadata: Metadata = {
  title: "灰烬备忘录 | 关键动作拦截台",
  description: "把刺痛的经历转化为原则和拦截规则。",
}

export default async function AshMemosPage() {
  const memos = await getAshMemos()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-balance">灰烬备忘录</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            犯错之后,把痛苦、教训、跳步沉淀为原则和拦截规则。
          </p>
        </div>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/ash-memos/new" />}
        >
          <Plus className="size-4" aria-hidden="true" />
          新建
        </Button>
      </header>

      {memos.length === 0 ? (
        <Card className="py-10">
          <CardContent className="flex flex-col items-center gap-4 px-5 text-center">
            <Flame className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              还没有灰烬备忘录。出错不可怕,可怕的是同一个错误再来一次。
            </p>
            <Button nativeButton={false} render={<Link href="/ash-memos/new" />}>
              <Plus className="size-4" aria-hidden="true" />
              记录第一条
            </Button>
          </CardContent>
        </Card>
      ) : (
        <AshMemoList memos={memos} />
      )}
    </div>
  )
}
