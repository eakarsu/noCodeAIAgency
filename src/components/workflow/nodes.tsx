"use client"

import { memo } from "react"
import { Handle, Position, NodeProps } from "@xyflow/react"
import {
  Zap,
  Square,
  Clock,
  RefreshCw,
  Mail,
  MessageSquare,
  Globe,
  Database,
  Bell,
  Play,
  GitMerge,
  Webhook,
  Calendar,
  FileInput,
  MousePointer,
  Send,
  Pencil,
  Trash2,
  Plus,
  Upload,
  FileOutput,
  GitBranch,
  Timer,
  Filter,
  Split,
  Merge,
  Pause,
  Table,
  Building2,
  Users,
  CreditCard,
  ShoppingCart,
  Headphones,
  BarChart3,
  Sparkles,
  Brain,
  Bot,
  MessageCircle,
  Image,
  FileJson,
  Shuffle,
  Braces,
  Variable,
  Code,
  Terminal,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calculator,
  StopCircle,
  LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Icon mapping for all node types
const NODE_ICONS: Record<string, LucideIcon> = {
  // Triggers
  manual: MousePointer,
  schedule: Calendar,
  webhook: Webhook,
  form: FileInput,
  email: Mail,
  database: Database,
  event: Zap,
  // Actions
  send_email: Send,
  send_sms: MessageSquare,
  notification: Bell,
  http_request: Globe,
  create_record: Plus,
  update_record: Pencil,
  delete_record: Trash2,
  upload_file: Upload,
  generate_pdf: FileOutput,
  // Integrations
  slack_message: MessageSquare,
  gmail_send: Mail,
  sheets_add_row: Table,
  salesforce_create: Building2,
  hubspot_contact: Users,
  stripe_charge: CreditCard,
  twilio_sms: MessageSquare,
  shopify_order: ShoppingCart,
  zendesk_ticket: Headphones,
  track_event: BarChart3,
  // AI
  generate_text: Sparkles,
  chat: MessageCircle,
  classify: Brain,
  extract: FileJson,
  summarize: FileOutput,
  sentiment: Bot,
  image: Image,
  // Transform
  transform: Shuffle,
  map: Braces,
  aggregate: Calculator,
  lookup: Database,
  json: FileJson,
  variable: Variable,
  code: Code,
  script: Terminal,
  // Utilities
  error: AlertCircle,
  success: CheckCircle,
  fail: XCircle,
  log: Terminal,
}

const NODE_COLORS: Record<string, { gradient: string; bg: string; text: string }> = {
  trigger: { gradient: "from-amber-400 to-orange-500", bg: "bg-amber-100", text: "text-amber-600" },
  action: { gradient: "from-blue-400 to-blue-600", bg: "bg-blue-100", text: "text-blue-600" },
  condition: { gradient: "from-purple-400 to-purple-600", bg: "bg-purple-100", text: "text-purple-600" },
  switch: { gradient: "from-purple-400 to-pink-500", bg: "bg-purple-100", text: "text-purple-600" },
  loop: { gradient: "from-green-400 to-emerald-600", bg: "bg-green-100", text: "text-green-600" },
  delay: { gradient: "from-orange-400 to-orange-600", bg: "bg-orange-100", text: "text-orange-600" },
  wait: { gradient: "from-orange-400 to-amber-600", bg: "bg-orange-100", text: "text-orange-600" },
  filter: { gradient: "from-violet-400 to-purple-600", bg: "bg-violet-100", text: "text-violet-600" },
  split: { gradient: "from-pink-400 to-rose-600", bg: "bg-pink-100", text: "text-pink-600" },
  merge: { gradient: "from-pink-400 to-rose-600", bg: "bg-pink-100", text: "text-pink-600" },
  ai: { gradient: "from-violet-500 to-purple-600", bg: "bg-violet-100", text: "text-violet-600" },
  transform: { gradient: "from-cyan-400 to-teal-600", bg: "bg-cyan-100", text: "text-cyan-600" },
  code: { gradient: "from-gray-500 to-gray-700", bg: "bg-gray-100", text: "text-gray-600" },
  utility: { gradient: "from-gray-400 to-gray-600", bg: "bg-gray-100", text: "text-gray-600" },
  end: { gradient: "from-gray-400 to-gray-600", bg: "bg-gray-100", text: "text-gray-600" },
}

// Get icon for a node based on its config
const getNodeIcon = (type: string, config: Record<string, unknown> = {}): LucideIcon => {
  if (type === "trigger" && config.trigger) {
    return NODE_ICONS[config.trigger as string] || Zap
  }
  if (type === "action" && config.action) {
    return NODE_ICONS[config.action as string] || Square
  }
  if (type === "ai" && config.ai_action) {
    return NODE_ICONS[config.ai_action as string] || Brain
  }

  // Default icons by type
  const defaultIcons: Record<string, LucideIcon> = {
    trigger: Zap,
    action: Square,
    condition: GitMerge,
    switch: GitBranch,
    loop: RefreshCw,
    delay: Timer,
    wait: Pause,
    filter: Filter,
    split: Split,
    merge: Merge,
    ai: Brain,
    transform: Shuffle,
    code: Code,
    utility: Terminal,
    end: StopCircle,
  }

  return defaultIcons[type] || Square
}

// Base node wrapper
const NodeWrapper = ({
  children,
  selected,
  type = "action",
  hasInput = true,
  hasOutput = true,
  outputHandles,
}: {
  children: React.ReactNode
  selected?: boolean
  type?: string
  hasInput?: boolean
  hasOutput?: boolean
  outputHandles?: { id: string; position: string; color: string }[]
}) => {
  const colors = NODE_COLORS[type] || NODE_COLORS.action

  return (
    <div
      className={cn(
        "min-w-[220px] max-w-[280px] rounded-xl shadow-lg border-2 transition-all duration-200",
        selected ? "border-blue-500 shadow-blue-200 shadow-xl" : "border-white/50",
        "bg-white hover:shadow-xl"
      )}
    >
      <div className={cn("h-1.5 rounded-t-xl bg-gradient-to-r", colors.gradient)} />
      {hasInput && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white !-top-1.5"
        />
      )}
      {children}
      {hasOutput && !outputHandles && (
        <Handle
          type="source"
          position={Position.Bottom}
          className={cn(
            "!w-3 !h-3 !border-2 !border-white !-bottom-1.5",
            `!bg-gradient-to-r ${colors.gradient}`
          )}
        />
      )}
      {outputHandles?.map((handle) => (
        <Handle
          key={handle.id}
          type="source"
          position={Position.Bottom}
          id={handle.id}
          style={{ left: handle.position }}
          className={cn("!w-3 !h-3 !border-2 !border-white !-bottom-1.5", handle.color)}
        />
      ))}
    </div>
  )
}

// Generic Node Component
const GenericNode = memo(({ data, selected, type }: NodeProps & { type: string }) => {
  const colors = NODE_COLORS[type] || NODE_COLORS.action
  const config = (data.config || {}) as Record<string, unknown>
  const Icon = getNodeIcon(type, config)

  const getDescription = () => {
    if (type === "trigger") {
      const triggers: Record<string, string> = {
        manual: "Triggered manually",
        schedule: "Runs on schedule",
        webhook: "HTTP webhook",
        form: "Form submission",
        email: "New email received",
        database: "Database change",
        event: "Event triggered",
      }
      return triggers[(config.trigger as string) || "manual"] || "Configure trigger"
    }
    if (type === "action") {
      const actions: Record<string, string> = {
        send_email: "Send email",
        send_sms: "Send SMS",
        notification: "Push notification",
        http_request: "Make API call",
        create_record: "Create record",
        update_record: "Update record",
        delete_record: "Delete record",
        upload_file: "Upload file",
        generate_pdf: "Generate PDF",
        slack_message: "Slack message",
        gmail_send: "Gmail send",
        sheets_add_row: "Add spreadsheet row",
        salesforce_create: "Salesforce create",
        hubspot_contact: "HubSpot contact",
        stripe_charge: "Stripe payment",
        twilio_sms: "Twilio SMS",
        shopify_order: "Shopify order",
        zendesk_ticket: "Zendesk ticket",
        track_event: "Track analytics",
      }
      return actions[(config.action as string) || ""] || "Configure action"
    }
    if (type === "delay") {
      const duration = config.duration || "?"
      const unit = config.unit || "minutes"
      return `Wait ${duration} ${unit}`
    }
    if (type === "condition") {
      return (config.condition as string) || "Set condition..."
    }
    if (type === "loop") {
      return `Iterate ${config.iterations || "N"} times`
    }
    if (type === "ai") {
      const aiActions: Record<string, string> = {
        generate_text: "Generate text",
        chat: "AI conversation",
        classify: "Classify data",
        extract: "Extract info",
        summarize: "Summarize content",
        sentiment: "Analyze sentiment",
        image: "Process image",
      }
      return aiActions[(config.ai_action as string) || ""] || "AI operation"
    }
    return (data.description as string) || ""
  }

  const typeLabels: Record<string, string> = {
    trigger: "TRIGGER",
    action: "ACTION",
    condition: "CONDITION",
    switch: "SWITCH",
    loop: "LOOP",
    delay: "DELAY",
    wait: "WAIT",
    filter: "FILTER",
    split: "SPLIT",
    merge: "MERGE",
    ai: "AI",
    transform: "TRANSFORM",
    code: "CODE",
    utility: "UTILITY",
    end: "END",
  }

  return (
    <NodeWrapper
      selected={selected}
      type={type}
      hasInput={type !== "trigger"}
      hasOutput={type !== "end"}
      outputHandles={
        type === "condition"
          ? [
              { id: "true", position: "30%", color: "!bg-green-500" },
              { id: "false", position: "70%", color: "!bg-red-500" },
            ]
          : undefined
      }
    >
      <div className="p-3">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", colors.bg)}>
            <Icon className={cn("h-5 w-5", colors.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={cn("text-[10px] font-semibold uppercase tracking-wider", colors.text)}>
              {typeLabels[type] || type.toUpperCase()}
            </div>
            <div className="font-semibold text-gray-900 truncate text-sm">
              {data.label as string}
            </div>
          </div>
        </div>
        {getDescription() && (
          <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1.5 truncate">
            {getDescription()}
          </div>
        )}
        {type === "condition" && (
          <div className="flex justify-between mt-2 text-[10px] font-medium px-1">
            <span className="text-green-600">✓ True</span>
            <span className="text-red-600">✗ False</span>
          </div>
        )}
      </div>
    </NodeWrapper>
  )
})
GenericNode.displayName = "GenericNode"

// Create specific node components
export const TriggerNode = memo((props: NodeProps) => <GenericNode {...props} type="trigger" />)
TriggerNode.displayName = "TriggerNode"

export const ActionNode = memo((props: NodeProps) => <GenericNode {...props} type="action" />)
ActionNode.displayName = "ActionNode"

export const ConditionNode = memo((props: NodeProps) => <GenericNode {...props} type="condition" />)
ConditionNode.displayName = "ConditionNode"

export const SwitchNode = memo((props: NodeProps) => <GenericNode {...props} type="switch" />)
SwitchNode.displayName = "SwitchNode"

export const LoopNode = memo((props: NodeProps) => <GenericNode {...props} type="loop" />)
LoopNode.displayName = "LoopNode"

export const DelayNode = memo((props: NodeProps) => <GenericNode {...props} type="delay" />)
DelayNode.displayName = "DelayNode"

export const WaitNode = memo((props: NodeProps) => <GenericNode {...props} type="wait" />)
WaitNode.displayName = "WaitNode"

export const FilterNode = memo((props: NodeProps) => <GenericNode {...props} type="filter" />)
FilterNode.displayName = "FilterNode"

export const SplitNode = memo((props: NodeProps) => <GenericNode {...props} type="split" />)
SplitNode.displayName = "SplitNode"

export const MergeNode = memo((props: NodeProps) => <GenericNode {...props} type="merge" />)
MergeNode.displayName = "MergeNode"

export const AINode = memo((props: NodeProps) => <GenericNode {...props} type="ai" />)
AINode.displayName = "AINode"

export const TransformNode = memo((props: NodeProps) => <GenericNode {...props} type="transform" />)
TransformNode.displayName = "TransformNode"

export const CodeNode = memo((props: NodeProps) => <GenericNode {...props} type="code" />)
CodeNode.displayName = "CodeNode"

export const UtilityNode = memo((props: NodeProps) => <GenericNode {...props} type="utility" />)
UtilityNode.displayName = "UtilityNode"

export const EndNode = memo((props: NodeProps) => <GenericNode {...props} type="end" />)
EndNode.displayName = "EndNode"

export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  switch: SwitchNode,
  loop: LoopNode,
  delay: DelayNode,
  wait: WaitNode,
  filter: FilterNode,
  split: SplitNode,
  merge: MergeNode,
  ai: AINode,
  transform: TransformNode,
  code: CodeNode,
  utility: UtilityNode,
  end: EndNode,
}
