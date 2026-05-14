import prisma from '@/lib/db'

/**
 * For an active A/B test, randomly select which variant (workflow) to run.
 * Returns the chosen workflowId + variant tag for result logging.
 */
export async function pickVariant(testId: string): Promise<{ workflowId: string; variant: 'A' | 'B' }> {
  const test = await prisma.workflowABTest.findUnique({ where: { id: testId } })
  if (!test || test.status !== 'RUNNING') {
    throw new Error('Test not running')
  }
  const roll = Math.random() * 100
  if (roll < test.trafficSplit) {
    return { workflowId: test.workflowAId, variant: 'A' }
  }
  return { workflowId: test.workflowBId, variant: 'B' }
}

export async function recordABResult(params: {
  testId: string
  variant: 'A' | 'B'
  workflowId: string
  instanceId?: string
  durationMs?: number
  costUsd?: number
  succeeded: boolean
}) {
  await prisma.workflowABResult.create({
    data: {
      testId: params.testId,
      variant: params.variant,
      workflowId: params.workflowId,
      instanceId: params.instanceId,
      durationMs: params.durationMs,
      costUsd: params.costUsd,
      succeeded: params.succeeded,
    },
  })
}
