// === Batch 11 Gaps & Frontend Mounts ===
'use client';
import GapFeaturePage from '@/components/GapFeaturePage';
export default function GapDeploymentAnomalyDetectionPage() {
  return (
    <GapFeaturePage
      title="Deployment Anomaly Detection"
      description="Deployment Anomaly Detection"
      slug="deployment-anomaly-detection"
      aiResultKey="analysis"
      fields={[{"name":"metrics","label":"Metrics (JSON)","type":"json"},{"name":"windowMinutes","label":"Window (minutes)","required":false,"placeholder":""}]}
    />
  );
}
