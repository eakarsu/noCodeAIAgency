import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import prisma from "@/lib/db"

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
const webhookSecret = process.env.STRIPE_MARKETPLACE_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 500 })
  }
  const sig = req.headers.get("stripe-signature")
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 })

  const raw = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret)
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid webhook signature: ${err instanceof Error ? err.message : ""}` },
      { status: 400 },
    )
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const sess = event.data.object as Stripe.Checkout.Session
      const meta = (sess.metadata || {}) as Record<string, string>
      const pi = await stripe.paymentIntents.retrieve(sess.payment_intent as string)
      const fee = pi.application_fee_amount || 0
      await prisma.marketplacePurchase.create({
        data: {
          templateId: meta.templateId,
          buyerAgencyId: meta.buyerAgencyId,
          sellerAgencyId: meta.sellerAgencyId,
          amountUsd: (sess.amount_total || 0) / 100,
          platformFeeUsd: fee / 100,
          sellerNetUsd: ((sess.amount_total || 0) - fee) / 100,
          stripeChargeId: pi.latest_charge as string | undefined,
          stripeConnectAcct: (pi.transfer_data?.destination as string) || undefined,
          status: "COMPLETED",
        },
      })
      break
    }
    case "account.updated": {
      const acct = event.data.object as Stripe.Account
      await prisma.sellerStripeConnect.updateMany({
        where: { stripeAccountId: acct.id },
        data: {
          status: acct.charges_enabled ? "ACTIVE" : "PENDING",
          payoutEnabled: !!acct.payouts_enabled,
        },
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}
