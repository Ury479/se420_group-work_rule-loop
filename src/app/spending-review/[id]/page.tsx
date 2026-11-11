import { notFound } from "next/navigation";
import { SpendingReviewWorkspace } from "@/components/spending-review-workspace";

export const metadata = { title: "支出审核 | 决策拦截台" };

export default async function SpendingReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || Number(id) > 2_147_483_647) notFound();
  return <SpendingReviewWorkspace selectedId={Number(id)} />;
}
