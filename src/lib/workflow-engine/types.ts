import { WorkflowNode, WorkflowEdge } from '@/types'

export interface ExecutionContext {
  instanceId: string
  workflowId: string
  workspaceId: string
  triggerData: Record<string, unknown>
  variables: Record<string, unknown>
  nodeOutputs: Record<string, unknown>
  executionMode: 'sync' | 'async'
  startedAt: Date
  maxNodeExecutions: number
  nodeExecutionCount: number
  stopped: boolean
}

export interface NodeExecutionResult {
  success: boolean
  output: Record<string, unknown>
  error?: string
  nextNodeIds?: string[]
  duration: number
}

export interface NodeExecutor {
  type: string
  execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult>
}

export interface WorkflowGraph {
  nodes: Map<string, WorkflowNode>
  edges: WorkflowEdge[]
  adjacencyList: Map<string, string[]>
  reverseAdjacencyList: Map<string, string[]>
}

export interface EngineOptions {
  maxNodeExecutions?: number
  executionMode?: 'sync' | 'async'
}
