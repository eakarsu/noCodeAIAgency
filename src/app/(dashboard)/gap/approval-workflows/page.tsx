// === Batch 11 Gaps & Frontend Mounts ===
'use client';
import GapFeaturePage from '@/components/GapFeaturePage';
export default function GapApprovalWorkflowsPage() {
  return (
    <GapFeaturePage
      title="Approval Workflows"
      description="Approval Workflows"
      slug="approval-workflows"
      aiResultKey="approval"
      fields={[{"name":"subjectId","label":"Subject ID","required":true,"placeholder":""},{"name":"approver","label":"Approver","required":true,"placeholder":""},{"name":"decision","label":"Decision","required":false,"placeholder":"approve / reject"}]}
    />
  );
}
