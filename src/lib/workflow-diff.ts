import { WorkflowNode, WorkflowEdge, WorkflowDiff } from '@/types'

export function computeWorkflowDiff(
  beforeNodes: WorkflowNode[],
  beforeEdges: WorkflowEdge[],
  afterNodes: WorkflowNode[],
  afterEdges: WorkflowEdge[]
): WorkflowDiff {
  const beforeNodeMap = new Map(beforeNodes.map(n => [n.id, n]))
  const afterNodeMap = new Map(afterNodes.map(n => [n.id, n]))

  const nodesAdded: WorkflowNode[] = []
  const nodesRemoved: WorkflowNode[] = []
  const nodesModified: { before: WorkflowNode; after: WorkflowNode }[] = []

  // Find added and modified nodes
  for (const [id, afterNode] of afterNodeMap) {
    const beforeNode = beforeNodeMap.get(id)
    if (!beforeNode) {
      nodesAdded.push(afterNode)
    } else if (!nodesEqual(beforeNode, afterNode)) {
      nodesModified.push({ before: beforeNode, after: afterNode })
    }
  }

  // Find removed nodes
  for (const [id, beforeNode] of beforeNodeMap) {
    if (!afterNodeMap.has(id)) {
      nodesRemoved.push(beforeNode)
    }
  }

  // Edge diffs
  const beforeEdgeIds = new Set(beforeEdges.map(e => edgeKey(e)))
  const afterEdgeIds = new Set(afterEdges.map(e => edgeKey(e)))

  const edgesAdded = afterEdges.filter(e => !beforeEdgeIds.has(edgeKey(e)))
  const edgesRemoved = beforeEdges.filter(e => !afterEdgeIds.has(edgeKey(e)))

  return {
    nodesAdded,
    nodesRemoved,
    nodesModified,
    edgesAdded,
    edgesRemoved,
  }
}

function nodesEqual(a: WorkflowNode, b: WorkflowNode): boolean {
  return (
    a.type === b.type &&
    a.position.x === b.position.x &&
    a.position.y === b.position.y &&
    a.data.label === b.data.label &&
    a.data.type === b.data.type &&
    JSON.stringify(a.data.config) === JSON.stringify(b.data.config)
  )
}

function edgeKey(edge: WorkflowEdge): string {
  return `${edge.source}:${edge.sourceHandle || ''}→${edge.target}:${edge.targetHandle || ''}`
}
