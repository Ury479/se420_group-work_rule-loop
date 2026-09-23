"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateBoundaryStatus, deleteBoundary } from "@/app/actions/boundaries"
import { Button } from "@/components/ui/button"

export function BoundaryStatusActions({
  boundaryId,
  status,
}: {
  boundaryId: number
  status: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function setStatus(next: "active" | "completed" | "stopped" | "backlogged") {
    if (pending) return
    setPending(true)
    await updateBoundaryStatus(boundaryId, next)
    setPending(false)
    router.refresh()
  }

  async function handleDelete() {
    if (pending) return
    if (!window.confirm("确定删除这张边界卡吗?检查记录也会一起删除。")) return
    setPending(true)
    await deleteBoundary(boundaryId)
    router.push("/boundaries")
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "completed" && (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => setStatus("completed")}>
          标记完成
        </Button>
      )}
      {status !== "active" && (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => setStatus("active")}>
          重新激活
        </Button>
      )}
      {status !== "backlogged" && (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => setStatus("backlogged")}>
          放入 Backlog
        </Button>
      )}
      <Button variant="ghost" size="sm" disabled={pending} onClick={handleDelete}>
        删除
      </Button>
    </div>
  )
}
