import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-04-22.dahlia',
})

export type PlanId = 'free' | 'pro' | 'agency'

export interface Plan {
  id: PlanId
  name: string
  description: string
  monthlyPriceId: string | null  // Stripe price ID — null = free tier
  features: string[]
  limits: {
    workflows: number | null  // null = unlimited
    aiCallsPerMonth: number | null
    whiteLabel: boolean
    teamMembers: number | null
  }
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic workflow automation',
    monthlyPriceId: null,
    features: [
      'Up to 3 workflows',
      '100 AI calls / month',
      'Community templates',
      'Email support',
    ],
    limits: {
      workflows: 3,
      aiCallsPerMonth: 100,
      whiteLabel: false,
      teamMembers: 1,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Unlimited workflows for growing agencies',
    monthlyPriceId: process.env.STRIPE_PRO_PRICE_ID ?? '',
    features: [
      'Unlimited workflows',
      '5,000 AI calls / month',
      'All templates',
      'Priority support',
      'Up to 5 team members',
    ],
    limits: {
      workflows: null,
      aiCallsPerMonth: 5000,
      whiteLabel: false,
      teamMembers: 5,
    },
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    description: 'White-label platform for client delivery',
    monthlyPriceId: process.env.STRIPE_AGENCY_PRICE_ID ?? '',
    features: [
      'Everything in Pro',
      'Unlimited AI calls',
      'White-label branding',
      'Custom domains',
      'Unlimited team members',
      'Dedicated support',
    ],
    limits: {
      workflows: null,
      aiCallsPerMonth: null,
      whiteLabel: true,
      teamMembers: null,
    },
  },
}

export function getPlanById(planId: string): Plan {
  return PLANS[planId as PlanId] ?? PLANS.free
}
