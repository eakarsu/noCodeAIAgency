import { NextResponse, type NextRequest } from "next/server"

const supportedProductionPaths = [
  /^\/$/,
  /^\/login\/?$/,
  /^\/governed(?:\/|$)/,
  /^\/api\/auth(?:\/|$)/,
  /^\/api\/governed(?:\/|$)/,
  /^\/favicon\.ico$/,
]

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") return NextResponse.next()
  if (supportedProductionPaths.some((pattern) => pattern.test(request.nextUrl.pathname))) {
    const response = NextResponse.next()
    response.headers.set("X-Supported-Product-Surface", "governed-ai-recommendation-v1")
    return response
  }
  return NextResponse.json(
    { error: "UNSUPPORTED_LEGACY_SURFACE", message: "This generated prototype route is disabled in production." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  )
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|robots.txt).*)"],
}
