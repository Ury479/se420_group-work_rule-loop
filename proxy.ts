import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/lib/auth"

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (pathname.startsWith("/api/auth/")) return NextResponse.next()
  if (!pathname.startsWith("/api/") && /\.(?:png|jpe?g|webp|svg|ico|gif|woff2?|css|js)$/.test(pathname)) {
    return NextResponse.next()
  }

  const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up"
  const session = await auth.api.getSession({ headers: request.headers })

  if (isAuthPage) {
    return session?.user ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next()
  }

  if (!session?.user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }
    const signInUrl = new URL("/sign-in", request.url)
    signInUrl.searchParams.set("next", pathname + search)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml).*)"],
}
