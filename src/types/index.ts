// ==================== Template Types ====================
export interface Template {
  id: string
  agencyId?: string
  name: string
  description?: string
  type: TemplateType
  category: string
  industry?: string
  thumbnail?: string
  content: Record<string, unknown>
  isPublic: boolean
  isBuiltIn: boolean
  version: string
  downloads: number
  rating: number
  createdAt: Date
  updatedAt: Date
}

export type TemplateType = 'INDUSTRY' | 'WORKFLOW' | 'INTEGRATION' | 'UI' | 'FORM' | 'DASHBOARD' | 'REPORT'

// ==================== Workflow Types ====================
export interface WorkflowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    type: NodeType
    config: Record<string, unknown>
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
  type?: string
}

export type NodeType =
  | 'trigger'
  | 'action'
  | 'condition'
  | 'switch'
  | 'loop'
  | 'delay'
  | 'wait'
  | 'filter'
  | 'split'
  | 'merge'
  | 'webhook'
  | 'api'
  | 'email'
  | 'transform'
  | 'code'
  | 'ai'
  | 'utility'
  | 'end'

export interface Workflow {
  id: string
  agencyId: string
  name: string
  description?: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  variables: Record<string, unknown>
  settings: Record<string, unknown>
  status: WorkflowStatus
  version: string
  createdAt: Date
  updatedAt: Date
}

export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'

// ==================== Client Types ====================
export interface Client {
  id: string
  agencyId: string
  name: string
  email: string
  company?: string
  phone?: string
  avatar?: string
  status: ClientStatus
  createdAt: Date
  updatedAt: Date
  workspace?: ClientWorkspace
  billing?: ClientBilling
}

export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export interface ClientWorkspace {
  id: string
  clientId: string
  name: string
  settings: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface ClientBilling {
  id: string
  clientId: string
  plan: string
  monthlyRate: number
  billingCycle: string
  nextBillingDate?: Date
  paymentMethod?: string
  stripeCustomerId?: string
  createdAt: Date
  updatedAt: Date
}

// ==================== Integration Types ====================
export interface Integration {
  id: string
  agencyId: string
  name: string
  type: IntegrationType
  provider: string
  config: Record<string, unknown>
  credentials: Record<string, unknown>
  status: IntegrationStatus
  lastSyncAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type IntegrationType = 'SAAS' | 'AI_MODEL' | 'HOSTING' | 'PAYMENT' | 'SUPPORT' | 'CUSTOM'
export type IntegrationStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR'

export interface ConnectorDefinition {
  id: string
  name: string
  provider: string
  category: string
  icon?: string
  description?: string
  authType: string
  configSchema: Record<string, unknown>
  endpoints: Record<string, unknown>[]
  isBuiltIn: boolean
}

// ==================== Webhook Types ====================
export interface Webhook {
  id: string
  agencyId: string
  name: string
  url: string
  events: string[]
  secret: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ==================== Deployment Types ====================
export interface Deployment {
  id: string
  agencyId: string
  clientId?: string
  name: string
  environment: DeploymentEnv
  status: DeploymentStatus
  version: string
  config: Record<string, unknown>
  url?: string
  deployedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type DeploymentEnv = 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION'
export type DeploymentStatus = 'PENDING' | 'DEPLOYING' | 'DEPLOYED' | 'FAILED' | 'ROLLED_BACK'

// ==================== Support Types ====================
export interface SupportTicket {
  id: string
  clientId: string
  userId?: string
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  createdAt: Date
  updatedAt: Date
  messages?: TicketMessage[]
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface TicketMessage {
  id: string
  ticketId: string
  content: string
  senderType: string
  senderId: string
  createdAt: Date
}

// ==================== Form Builder Types ====================
export interface FormField {
  id: string
  type: FormFieldType
  label: string
  name: string
  placeholder?: string
  required: boolean
  options?: { label: string; value: string }[]
  validation?: Record<string, unknown>
}

export type FormFieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'file'
  | 'phone'

export interface FormDefinition {
  id: string
  name: string
  description?: string
  fields: FormField[]
  settings: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

// ==================== Dashboard Types ====================
export interface DashboardWidget {
  id: string
  type: WidgetType
  title: string
  position: { x: number; y: number; w: number; h: number }
  config: Record<string, unknown>
}

export type WidgetType =
  | 'chart'
  | 'stat'
  | 'table'
  | 'list'
  | 'calendar'
  | 'map'
  | 'custom'

export interface Dashboard {
  id: string
  name: string
  description?: string
  layout: Record<string, unknown>[]
  widgets: DashboardWidget[]
  settings: Record<string, unknown>
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

// ==================== Workflow Execution Types ====================
export type InstanceStatus = 'running' | 'completed' | 'failed' | 'stopped' | 'waiting'

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

export interface ExecutionLog {
  nodeId: string
  nodeType: string
  status: 'success' | 'error' | 'skipped'
  input: Record<string, unknown>
  output: Record<string, unknown>
  error?: string
  duration: number
  timestamp: Date
}

export interface WorkflowGraph {
  nodes: Map<string, WorkflowNode>
  edges: WorkflowEdge[]
  adjacencyList: Map<string, string[]>
}

// ==================== AI Types ====================
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'openrouter'

export type AIModelId =
  | 'gpt-4'
  | 'gpt-3.5-turbo'
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  | 'gemini-pro'

export type AIAction =
  | 'classify'
  | 'extract'
  | 'summarize'
  | 'sentiment'
  | 'generate'
  | 'transform'

export interface AIRequest {
  provider: AIProvider
  model: AIModelId
  action: AIAction
  input: string
  systemPrompt?: string
  parameters?: {
    temperature?: number
    maxTokens?: number
    topP?: number
  }
}

export interface AIResponse {
  success: boolean
  output: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  error?: string
  provider: AIProvider
  model: AIModelId
}

export interface AIProviderConnector {
  provider: AIProvider
  models: AIModelId[]
  execute(request: AIRequest, apiKey: string): Promise<AIResponse>
}

// ==================== Webhook Trigger Types ====================
export interface WebhookTriggerConfig {
  id: string
  workflowId: string
  agencyId: string
  name: string
  secret: string
  isActive: boolean
  rateLimitPerMinute: number
  lastTriggeredAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface WebhookTriggerLogEntry {
  id: string
  triggerId: string
  method: string
  headers: Record<string, string>
  body: Record<string, unknown>
  statusCode: number
  instanceId?: string
  duration?: number
  createdAt: Date
}

// ==================== Workflow Versioning Types ====================
export interface WorkflowDiff {
  nodesAdded: WorkflowNode[]
  nodesRemoved: WorkflowNode[]
  nodesModified: { before: WorkflowNode; after: WorkflowNode }[]
  edgesAdded: WorkflowEdge[]
  edgesRemoved: WorkflowEdge[]
}

// ==================== Template Marketplace Types ====================
export interface TemplateRatingEntry {
  id: string
  templateId: string
  userId: string
  rating: number
  review?: string
  createdAt: Date
  updatedAt: Date
}

// ==================== API Response Types ====================
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
