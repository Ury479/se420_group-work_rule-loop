import { withAccountDatabase } from "@/db";
import { getUserId } from "@/lib/user";

export async function withAccount<T>(operation: () => Promise<T>): Promise<T> {
  return withAccountDatabase(await getUserId(), operation);
}

export async function withApiAccount(
  operation: () => Promise<Response>,
): Promise<Response> {
  try {
    return await withAccount(operation);
  } catch (error) {
    const unauthorized =
      error instanceof Error && error.message === "Unauthorized";
    return Response.json(
      { error: unauthorized ? "请先登录" : "请求未完成，请检查输入后重试" },
      { status: unauthorized ? 401 : 400 },
    );
  }
}
