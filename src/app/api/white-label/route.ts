import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// White-Label SaaS Marketplace — reseller-tier branded instance configuration.
// TODO: configure credentials — wire STRIPE_CONNECT_CLIENT_ID for payouts.

interface Instance {
  id: string
  resellerId: string
  brandName: string
  primaryColor: string
  domain?: string
  stripeAccountId?: string
  createdAt: string
}

const instances = new Map<string, Instance>()

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ instances: Array.from(instances.values()) })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Partial<Instance>
  if (!body.brandName || !body.resellerId) {
    return NextResponse.json({ error: 'resellerId and brandName required' }, { status: 400 })
  }

  const id = `wl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const instance: Instance = {
    id,
    resellerId: body.resellerId,
    brandName: body.brandName,
    primaryColor: body.primaryColor || '#6366f1',
    domain: body.domain,
    stripeAccountId: body.stripeAccountId, // TODO: configure credentials — STRIPE_CONNECT_CLIENT_ID
    createdAt: new Date().toISOString(),
  }
  instances.set(id, instance)
  return NextResponse.json({ instance })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as Partial<Instance> & { id?: string }
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const existing = instances.get(body.id)
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const updated = { ...existing, ...body, id: existing.id }
  instances.set(existing.id, updated)
  return NextResponse.json({ instance: updated })
}
