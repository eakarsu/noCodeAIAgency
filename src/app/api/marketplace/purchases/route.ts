import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

/**
 * GET /api/marketplace/purchases?as=buyer|seller&page=&pageSize=
 * Paginated list of purchases for the current agency.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const as = searchParams.get("as") || "buyer"
  const page = parseInt(searchParams.get("page") || "1")
  const pageSize = parseInt(searchParams.get("pageSize") || "20")

  const where = as === "seller"
    ? { sellerAgencyId: session.user.agencyId }
    : { buyerAgencyId: session.user.agencyId }

  const [data, total] = await Promise.all([
    prisma.marketplacePurchase.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.marketplacePurchase.count({ where }),
  ])

  const totals = await prisma.marketplacePurchase.aggregate({
    where,
    _sum: { amountUsd: true, sellerNetUsd: true, platformFeeUsd: true },
  })

  return NextResponse.json({
    data,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    summary: totals._sum,
  })
}
