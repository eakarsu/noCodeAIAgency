import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Managed API Integrations — pre-built connectors with simulated sync agents.
// TODO: configure credentials — SALESFORCE_CLIENT_ID, HUBSPOT_API_KEY, SLACK_BOT_TOKEN.

type Provider = 'salesforce' | 'hubspot' | 'slack'

interface SyncJob {
  id: string
  provider: Provider
  direction: 'pull' | 'push' | 'bidi'
  startedAt: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'auth_required'
  recordsProcessed: number
  errorMessage?: string
}

const jobs = new Map<string, SyncJob>()

function credsAvailable(p: Provider): boolean {
  if (p === 'salesforce') return !!process.env.SALESFORCE_CLIENT_ID && !!process.env.SALESFORCE_CLIENT_SECRET
  if (p === 'hubspot') return !!process.env.HUBSPOT_API_KEY
  if (p === 'slack') return !!process.env.SLACK_BOT_TOKEN
  return false
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { provider?: Provider; direction?: SyncJob['direction'] }
  if (!body.provider) return NextResponse.json({ error: 'provider required (salesforce|hubspot|slack)' }, { status: 400 })

  const id = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const status: SyncJob['status'] = credsAvailable(body.provider) ? 'running' : 'auth_required'

  const job: SyncJob = {
    id,
    provider: body.provider,
    direction: body.direction || 'pull',
    startedAt: new Date().toISOString(),
    status,
    recordsProcessed: 0,
    errorMessage: status === 'auth_required' ? `Missing credentials for ${body.provider}. TODO: configure credentials.` : undefined,
  }
  jobs.set(id, job)

  // Lean v0: simulate progression — in production, dispatch to a queue / worker.
  if (status === 'running') {
    setTimeout(() => {
      const j = jobs.get(id)
      if (j) {
        j.recordsProcessed = Math.floor(Math.random() * 500) + 50
        j.status = 'succeeded'
      }
    }, 200)
  }

  return NextResponse.json({ job })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (id) {
    const j = jobs.get(id)
    if (!j) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ job: j })
  }
  return NextResponse.json({ jobs: Array.from(jobs.values()) })
}
