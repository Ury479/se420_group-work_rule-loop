import { vi } from "vitest";

vi.mock("@/lib/user", async () => {
  const { identity } = await import("./identity");
  const { currentAccountId } = await import("@/db");
  return {
    getUserId: async () => {
      const id = currentAccountId() ?? identity.userId;
      if (!id) throw new Error("Unauthorized");
      return id;
    },
  };
});
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock("ai", () => ({
  generateText: vi.fn(async () => ({ text: "Verified translation" })),
}));
