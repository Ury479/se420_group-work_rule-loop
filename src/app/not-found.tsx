import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-[55dvh] content-center justify-items-center gap-3 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="font-serif text-2xl">页面未找到</h1>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-lg border border-input px-4 text-sm hover:bg-muted"
      >
        返回首页
      </Link>
    </main>
  );
}
