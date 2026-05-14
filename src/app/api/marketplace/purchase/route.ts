import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import Stripe from "stripe"

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
const PLATFORM_FEE_PCT = parseInt(process.env.MARKETPLACE_PLATFORM_FEE_PCT || "20", 10)

/**
 * POST /api/marketplace/purchase
 * Body: { templateId, amountUsd }
 * Creates a Stripe Checkout session that splits funds with the seller via
 * Stripe Connect (Express account on the seller side).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.agencyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })

  const { templateId, amountUsd } = await req.json()
  if (!templateId || !amountUsd) {
    return NextResponse.json({ error: "templateId and amountUsd required" }, { status: 400 })
  }

  const template = await prisma.template.findUnique({ where: { id: templateId } })
  if (!template?.agencyId) {
    return NextResponse.json({ error: "Template has no seller" }, { status: 400 })
  }
  const sellerConnect = await prisma.sellerStripeConnect.findUnique({
    where: { agencyId: template.agencyId },
  })
  if (!sellerConnect || !sellerConnect.payoutEnabled) {
    return NextResponse.json({ error: "Seller has no active Stripe Connect account" }, { status: 400 })
  }

  const amountCents = Math.round(amountUsd * 100)
  const platformFeeCents = Math.round(amountCents * (PLATFORM_FEE_PCT / 100))

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: template.name },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: platformFeeCents,
      transfer_data: { destination: sellerConnect.stripeAccountId },
      metadata: {
        templateId: template.id,
        buyerAgencyId: session.user.agencyId,
        sellerAgencyId: template.agencyId,
      },
    },
    success_url: `${process.env.NEXTAUTH_URL}/dashboard/marketplace?purchase=ok&template=${template.id}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/marketplace?purchase=cancelled`,
  })

  return NextResponse.json({ url: checkout.url, sessionId: checkout.id })
}
