// === Batch 11 Gaps & Frontend Mounts ===
'use client';
import GapFeaturePage from '@/components/GapFeaturePage';
export default function GapNlWorkflowDrafterPage() {
  return (
    <GapFeaturePage
      title="NL Workflow Drafter"
      description="NL Workflow Drafter"
      slug="nl-workflow-drafter"
      aiResultKey="workflow"
      fields={[{"name":"description","label":"Description","type":"textarea","rows":4,"required":true}]}
    />
  );
}
