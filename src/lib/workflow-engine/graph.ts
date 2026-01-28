import { WorkflowNode, WorkflowEdge } from '@/types'
import { WorkflowGraph } from './types'

export function buildWorkflowGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowGraph {
  const nodeMap = new Map<string, WorkflowNode>()
  const adjacencyList = new Map<string, string[]>()
  const reverseAdjacencyList = new Map<string, string[]>()

  for (const node of nodes) {
    nodeMap.set(node.id, node)
    adjacencyList.set(node.id, [])
    reverseAdjacencyList.set(node.id, [])
  }

  for (const edge of edges) {
    const targets = adjacencyList.get(edge.source) || []
    targets.push(edge.target)
    adjacencyList.set(edge.source, targets)

    const sources = reverseAdjacencyList.get(edge.target) || []
    sources.push(edge.source)
    reverseAdjacencyList.set(edge.target, sources)
  }

  return { nodes: nodeMap, edges, adjacencyList, reverseAdjacencyList }
}

export function findTriggerNode(graph: WorkflowGraph): WorkflowNode | null {
  // Check both node.type and node.data.type for trigger nodes
  for (const [, node] of graph.nodes) {
    const nodeType = node.data?.type || node.type
    if (nodeType === 'trigger' || nodeType === 'webhook') {
      return node
    }
  }

  // Fallback: find root node (no incoming edges)
  for (const [nodeId, node] of graph.nodes) {
    const incomingEdges = graph.edges.filter(e => e.target === nodeId)
    if (incomingEdges.length === 0) {
      return node
    }
  }

  return null
}

export function getOutgoingEdges(graph: WorkflowGraph, nodeId: string): WorkflowEdge[] {
  return graph.edges.filter(e => e.source === nodeId)
}

export function getOutgoingNodeIds(graph: WorkflowGraph, nodeId: string): string[] {
  return graph.adjacencyList.get(nodeId) || []
}

export function detectCycles(graph: WorkflowGraph): boolean {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function dfs(nodeId: string): boolean {
    visited.add(nodeId)
    recursionStack.add(nodeId)

    const neighbors = graph.adjacencyList.get(nodeId) || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true
      } else if (recursionStack.has(neighbor)) {
        return true
      }
    }

    recursionStack.delete(nodeId)
    return false
  }

  for (const [nodeId] of graph.nodes) {
    if (!visited.has(nodeId)) {
      if (dfs(nodeId)) return true
    }
  }

  return false
}
