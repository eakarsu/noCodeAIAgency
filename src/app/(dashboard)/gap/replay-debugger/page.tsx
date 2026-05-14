// === Batch 11 Gaps & Frontend Mounts ===
'use client';
import GapFeaturePage from '@/components/GapFeaturePage';
export default function GapReplayDebuggerPage() {
  return (
    <GapFeaturePage
      title="Agent-Assisted Replay Debugger"
      description="Agent-Assisted Replay Debugger"
      slug="replay-debugger"
      aiResultKey="summary"
      fields={[{"name":"replayLog","label":"Replay Log","type":"textarea","rows":6,"required":true}]}
    />
  );
}
