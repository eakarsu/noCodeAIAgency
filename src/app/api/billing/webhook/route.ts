import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import prisma from '@/lib/db'
import Stripe from 'stripe'

// Disable body parsing — Stripe needs raw bytes for signature verification
export const config = { api: { bodyParser: false } }

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const rawBody = await request.text()
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(sub)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(sub)
        break
      }

      default:
        // Unhandled event — just acknowledge
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Stripe Webhook] Handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const planId = session.metadata?.planId

  if (!userId || !planId) {
    console.error('[Stripe Webhook] Missing userId or planId in session metadata')
    return
  }

  // Fetch the subscription to get full details
  let priceId: string | null = null
  let subscriptionId: string | null = null
  let currentPeriodEnd: Date | null = null

  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    )
    subscriptionId = subscription.id
    priceId = subscription.items.data[0]?.price.id ?? null
    // current_period_end is available at runtime but may not be in all type defs
    const periodEnd = (subscription as unknown as Record<string, unknown>).current_period_end
    if (typeof periodEnd === 'number') {
      currentPeriodEnd = new Date(periodEnd * 1000)
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: planId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      planExpiresAt: currentPeriodEnd,
    },
  })

  console.log(`[Stripe Webhook] User ${userId} upgraded to plan: ${planId}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  })
  if (!user) return

  const priceId = subscription.items.data[0]?.price.id ?? null
  const periodEnd = (subscription as unknown as Record<string, unknown>).current_period_end
  const currentPeriodEnd = typeof periodEnd === 'number' ? new Date(periodEnd * 1000) : null

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripePriceId: priceId,
      planExpiresAt: currentPeriodEnd,
    },
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  })
  if (!user) return

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: 'free',
      stripeSubscriptionId: null,
      stripePriceId: null,
      planExpiresAt: null,
    },
  })

  console.log(`[Stripe Webhook] User ${user.id} downgraded to free plan`)
}
