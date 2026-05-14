import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import Stripe from "stripe"

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

/**
 * GET /api/marketplace/connect — current Connect status for this agency.
 * POST /api/marketplace/connect — create or refresh Stripe Express account
 *      and return the onboarding link.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const row = await prisma.sellerStripeConnect.findUnique({
    where: { agencyId: session.user.agencyId },
  })
  return NextResponse.json(row || { status: "NONE" })
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })

  let row = await prisma.sellerStripeConnect.findUnique({
    where: { agencyId: session.user.agencyId },
  })

  if (!row) {
    const account = await stripe.accounts.create({
      type: "express",
      capabilities: {
        transfers: { requested: true },
      },
      metadata: { agencyId: session.user.agencyId },
    })
    row = await prisma.sellerStripeConnect.create({
      data: { agencyId: session.user.agencyId, stripeAccountId: account.id, status: "PENDING" },
    })
  }

  const link = await stripe.accountLinks.create({
    account: row.stripeAccountId,
    refresh_url: `${process.env.NEXTAUTH_URL}/dashboard/marketplace?connect=refresh`,
    return_url: `${process.env.NEXTAUTH_URL}/dashboard/marketplace?connect=ok`,
    type: "account_onboarding",
  })

  return NextResponse.json({ url: link.url, accountId: row.stripeAccountId })
}
