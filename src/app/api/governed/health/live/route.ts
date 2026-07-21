import { NextResponse } from "next/server"

export function GET() {
  return NextResponse.json({ status: "live", service: "governed-ai-recommendation" }, { headers: { "Cache-Control": "no-store" } })
}
