// === Batch 11 Gaps & Frontend Mounts ===
// Non-AI gap: Approval Workflows (noCodeAIAgency)
import { NextRequest, NextResponse } from 'next/server';

const gapFeatures: Array<{ at: string; slug: string; payload: unknown }> = (globalThis as unknown as { __gapFeatures?: typeof gapFeatures }).__gapFeatures ?? [];
(globalThis as unknown as { __gapFeatures?: typeof gapFeatures }).__gapFeatures = gapFeatures;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const record = { id: 'approval-workflows_' + Date.now(), ...body, createdAt: new Date().toISOString() };
    gapFeatures.push({ at: record.createdAt, slug: 'approval-workflows', payload: record });
    return NextResponse.json({ approval: record, status: 'recorded' });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'request failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ feature: 'approval-workflows', events: gapFeatures.filter(r => r.slug === 'approval-workflows').length });
}
