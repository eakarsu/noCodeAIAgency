import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe, PLANS, getPlanById, type PlanId } from '@/lib/stripe'
import prisma from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { planId } = body as { planId: PlanId }

    const plan = getPlanById(planId)
    if (!plan.monthlyPriceId) {
      return NextResponse.json({ error: 'Free plan does not require checkout' }, { status: 400 })
    }

    // Load user to get/create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let customerId = user.stripeCustomerId ?? undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      })
      customerId = customer.id
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.monthlyPriceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/billing?canceled=true`,
      metadata: {
        userId: user.id,
        planId,
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('[Billing] Create checkout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
