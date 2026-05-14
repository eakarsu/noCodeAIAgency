// === Batch 11 Gaps & Frontend Mounts ===
// Non-AI gap: Role-Based Access Control (noCodeAIAgency)
import { NextRequest, NextResponse } from 'next/server';

const gapFeatures: Array<{ at: string; slug: string; payload: unknown }> = (globalThis as unknown as { __gapFeatures?: typeof gapFeatures }).__gapFeatures ?? [];
(globalThis as unknown as { __gapFeatures?: typeof gapFeatures }).__gapFeatures = gapFeatures;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const record = { id: 'rbac_' + Date.now(), ...body, createdAt: new Date().toISOString() };
    gapFeatures.push({ at: record.createdAt, slug: 'rbac', payload: record });
    return NextResponse.json({ rule: record, status: 'recorded' });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'request failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ feature: 'rbac', events: gapFeatures.filter(r => r.slug === 'rbac').length });
}
