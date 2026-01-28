"use client"

import { useState, DragEvent } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Search,
  ChevronDown,
  ChevronRight,
  // Triggers
  Zap,
  Clock,
  Webhook,
  Calendar,
  FileInput,
  Database,
  Mail,
  MousePointer,
  Globe,
  // Actions
  Send,
  MessageSquare,
  Bell,
  FileOutput,
  Pencil,
  Trash2,
  Plus,
  Upload,
  Download,
  // Logic
  GitBranch,
  GitMerge,
  RefreshCw,
  Timer,
  Filter,
  Split,
  Merge,
  // Integrations
  Slack,
  // Using generic icons for services
  ShoppingCart,
  CreditCard,
  Users,
  BarChart3,
  Headphones,
  Building2,
  // Data
  Code,
  FileJson,
  Table,
  Calculator,
  Shuffle,
  // AI
  Bot,
  Brain,
  Sparkles,
  MessageCircle,
  Image,
  // Utilities
  Variable,
  Braces,
  Terminal,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pause,
  Play,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NodeDefinition {
  type: string
  nodeType: string
  label: string
  description: string
  icon: typeof Zap
  color: string
  bgColor: string
  config?: Record<string, unknown>
}

interface NodeCategory {
  id: string
  label: string
  icon: typeof Zap
  nodes: NodeDefinition[]
}

const NODE_CATEGORIES: NodeCategory[] = [
  {
    id: "triggers",
    label: "Triggers",
    icon: Zap,
    nodes: [
      {
        type: "trigger_manual",
        nodeType: "trigger",
        label: "Manual Trigger",
        description: "Start workflow manually",
        icon: MousePointer,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        config: { trigger: "manual" },
      },
      {
        type: "trigger_schedule",
        nodeType: "trigger",
        label: "Schedule",
        description: "Run on a schedule (cron)",
        icon: Calendar,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        config: { trigger: "schedule" },
      },
      {
        type: "trigger_webhook",
        nodeType: "trigger",
        label: "Webhook",
        description: "Trigger via HTTP webhook",
        icon: Webhook,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        config: { trigger: "webhook" },
      },
      {
        type: "trigger_form",
        nodeType: "trigger",
        label: "Form Submission",
        description: "When a form is submitted",
        icon: FileInput,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        config: { trigger: "form" },
      },
      {
        type: "trigger_email",
        nodeType: "trigger",
        label: "New Email",
        description: "When email is received",
        icon: Mail,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        config: { trigger: "email" },
      },
      {
        type: "trigger_database",
        nodeType: "trigger",
        label: "Database Change",
        description: "When database record changes",
        icon: Database,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        config: { trigger: "database" },
      },
    ],
  },
  {
    id: "actions",
    label: "Actions",
    icon: Play,
    nodes: [
      {
        type: "action_email",
        nodeType: "action",
        label: "Send Email",
        description: "Send an email message",
        icon: Send,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        config: { action: "send_email" },
      },
      {
        type: "action_sms",
        nodeType: "action",
        label: "Send SMS",
        description: "Send text message",
        icon: MessageSquare,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        config: { action: "send_sms" },
      },
      {
        type: "action_notification",
        nodeType: "action",
        label: "Push Notification",
        description: "Send push notification",
        icon: Bell,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        config: { action: "notification" },
      },
      {
        type: "action_http",
        nodeType: "action",
        label: "HTTP Request",
        description: "Make API call",
        icon: Globe,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        config: { action: "http_request" },
      },
      {
        type: "action_create",
        nodeType: "action",
        label: "Create Record",
        description: "Create database record",
        icon: Plus,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        config: { action: "create_record" },
      },
      {
        type: "action_update",
        nodeType: "action",
        label: "Update Record",
        description: "Update database record",
        icon: Pencil,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        config: { action: "update_record" },
      },
      {
        type: "action_delete",
        nodeType: "action",
        label: "Delete Record",
        description: "Delete database record",
        icon: Trash2,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        config: { action: "delete_record" },
      },
      {
        type: "action_upload",
        nodeType: "action",
        label: "Upload File",
        description: "Upload file to storage",
        icon: Upload,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        config: { action: "upload_file" },
      },
      {
        type: "action_generate_pdf",
        nodeType: "action",
        label: "Generate PDF",
        description: "Create PDF document",
        icon: FileOutput,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        config: { action: "generate_pdf" },
      },
    ],
  },
  {
    id: "logic",
    label: "Logic & Flow",
    icon: GitBranch,
    nodes: [
      {
        type: "condition",
        nodeType: "condition",
        label: "If/Else",
        description: "Branch based on condition",
        icon: GitMerge,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        config: {},
      },
      {
        type: "switch",
        nodeType: "switch",
        label: "Switch",
        description: "Multiple branch routing",
        icon: GitBranch,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        config: {},
      },
      {
        type: "loop",
        nodeType: "loop",
        label: "Loop",
        description: "Iterate over items",
        icon: RefreshCw,
        color: "text-green-600",
        bgColor: "bg-green-100",
        config: {},
      },
      {
        type: "delay",
        nodeType: "delay",
        label: "Delay",
        description: "Wait before continuing",
        icon: Timer,
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        config: { duration: "5", unit: "minutes" },
      },
      {
        type: "filter",
        nodeType: "filter",
        label: "Filter",
        description: "Filter data items",
        icon: Filter,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        config: {},
      },
      {
        type: "split",
        nodeType: "split",
        label: "Split",
        description: "Split into parallel paths",
        icon: Split,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        config: {},
      },
      {
        type: "merge",
        nodeType: "merge",
        label: "Merge",
        description: "Merge parallel paths",
        icon: Merge,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        config: {},
      },
      {
        type: "wait",
        nodeType: "wait",
        label: "Wait for Event",
        description: "Pause until event occurs",
        icon: Pause,
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        config: {},
      },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Zap,
    nodes: [
      {
        type: "slack",
        nodeType: "action",
        label: "Slack",
        description: "Send Slack message",
        icon: MessageSquare,
        color: "text-[#4A154B]",
        bgColor: "bg-[#4A154B]/10",
        config: { action: "slack_message", integration: "slack" },
      },
      {
        type: "gmail",
        nodeType: "action",
        label: "Gmail",
        description: "Send via Gmail",
        icon: Mail,
        color: "text-red-600",
        bgColor: "bg-red-100",
        config: { action: "gmail_send", integration: "gmail" },
      },
      {
        type: "sheets",
        nodeType: "action",
        label: "Google Sheets",
        description: "Add row to spreadsheet",
        icon: Table,
        color: "text-green-600",
        bgColor: "bg-green-100",
        config: { action: "sheets_add_row", integration: "google_sheets" },
      },
      {
        type: "salesforce",
        nodeType: "action",
        label: "Salesforce",
        description: "Create/Update lead",
        icon: Building2,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        config: { action: "salesforce_create", integration: "salesforce" },
      },
      {
        type: "hubspot",
        nodeType: "action",
        label: "HubSpot",
        description: "CRM operations",
        icon: Users,
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        config: { action: "hubspot_contact", integration: "hubspot" },
      },
      {
        type: "stripe",
        nodeType: "action",
        label: "Stripe",
        description: "Payment operations",
        icon: CreditCard,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        config: { action: "stripe_charge", integration: "stripe" },
      },
      {
        type: "twilio",
        nodeType: "action",
        label: "Twilio",
        description: "SMS/Voice via Twilio",
        icon: MessageSquare,
        color: "text-red-600",
        bgColor: "bg-red-100",
        config: { action: "twilio_sms", integration: "twilio" },
      },
      {
        type: "shopify",
        nodeType: "action",
        label: "Shopify",
        description: "E-commerce operations",
        icon: ShoppingCart,
        color: "text-green-600",
        bgColor: "bg-green-100",
        config: { action: "shopify_order", integration: "shopify" },
      },
      {
        type: "zendesk",
        nodeType: "action",
        label: "Zendesk",
        description: "Support ticket ops",
        icon: Headphones,
        color: "text-green-600",
        bgColor: "bg-green-100",
        config: { action: "zendesk_ticket", integration: "zendesk" },
      },
      {
        type: "analytics",
        nodeType: "action",
        label: "Analytics",
        description: "Track event",
        icon: BarChart3,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        config: { action: "track_event", integration: "analytics" },
      },
    ],
  },
  {
    id: "ai",
    label: "AI & ML",
    icon: Brain,
    nodes: [
      {
        type: "ai_generate",
        nodeType: "ai",
        label: "AI Generate Text",
        description: "Generate text with AI",
        icon: Sparkles,
        color: "text-violet-600",
        bgColor: "bg-violet-100",
        config: { ai_action: "generate_text" },
      },
      {
        type: "ai_chat",
        nodeType: "ai",
        label: "AI Chat",
        description: "Conversational AI",
        icon: MessageCircle,
        color: "text-violet-600",
        bgColor: "bg-violet-100",
        config: { ai_action: "chat" },
      },
      {
        type: "ai_classify",
        nodeType: "ai",
        label: "AI Classify",
        description: "Classify/categorize data",
        icon: Brain,
        color: "text-violet-600",
        bgColor: "bg-violet-100",
        config: { ai_action: "classify" },
      },
      {
        type: "ai_extract",
        nodeType: "ai",
        label: "AI Extract",
        description: "Extract data from text",
        icon: FileJson,
        color: "text-violet-600",
        bgColor: "bg-violet-100",
        config: { ai_action: "extract" },
      },
      {
        type: "ai_summarize",
        nodeType: "ai",
        label: "AI Summarize",
        description: "Summarize content",
        icon: FileOutput,
        color: "text-violet-600",
        bgColor: "bg-violet-100",
        config: { ai_action: "summarize" },
      },
      {
        type: "ai_sentiment",
        nodeType: "ai",
        label: "Sentiment Analysis",
        description: "Analyze sentiment",
        icon: Bot,
        color: "text-violet-600",
        bgColor: "bg-violet-100",
        config: { ai_action: "sentiment" },
      },
      {
        type: "ai_image",
        nodeType: "ai",
        label: "AI Image",
        description: "Generate/analyze images",
        icon: Image,
        color: "text-violet-600",
        bgColor: "bg-violet-100",
        config: { ai_action: "image" },
      },
    ],
  },
  {
    id: "data",
    label: "Data & Transform",
    icon: Database,
    nodes: [
      {
        type: "data_transform",
        nodeType: "transform",
        label: "Transform",
        description: "Transform data structure",
        icon: Shuffle,
        color: "text-cyan-600",
        bgColor: "bg-cyan-100",
        config: {},
      },
      {
        type: "data_map",
        nodeType: "transform",
        label: "Map Fields",
        description: "Map data fields",
        icon: Braces,
        color: "text-cyan-600",
        bgColor: "bg-cyan-100",
        config: {},
      },
      {
        type: "data_aggregate",
        nodeType: "transform",
        label: "Aggregate",
        description: "Aggregate/group data",
        icon: Calculator,
        color: "text-cyan-600",
        bgColor: "bg-cyan-100",
        config: {},
      },
      {
        type: "data_lookup",
        nodeType: "transform",
        label: "Lookup",
        description: "Lookup from database",
        icon: Database,
        color: "text-cyan-600",
        bgColor: "bg-cyan-100",
        config: {},
      },
      {
        type: "data_json",
        nodeType: "transform",
        label: "Parse JSON",
        description: "Parse JSON data",
        icon: FileJson,
        color: "text-cyan-600",
        bgColor: "bg-cyan-100",
        config: {},
      },
      {
        type: "data_variable",
        nodeType: "transform",
        label: "Set Variable",
        description: "Set workflow variable",
        icon: Variable,
        color: "text-cyan-600",
        bgColor: "bg-cyan-100",
        config: {},
      },
      {
        type: "data_code",
        nodeType: "code",
        label: "Run Code",
        description: "Execute custom code",
        icon: Code,
        color: "text-gray-600",
        bgColor: "bg-gray-100",
        config: {},
      },
      {
        type: "data_script",
        nodeType: "code",
        label: "JavaScript",
        description: "Run JavaScript",
        icon: Terminal,
        color: "text-gray-600",
        bgColor: "bg-gray-100",
        config: {},
      },
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: Zap,
    nodes: [
      {
        type: "approval",
        nodeType: "wait",
        label: "Approval",
        description: "Wait for human approval",
        icon: CheckCircle,
        color: "text-amber-600",
        bgColor: "bg-amber-100",
        config: { waitType: "approval" },
      },
      {
        type: "webhook_response",
        nodeType: "wait",
        label: "Webhook Response",
        description: "Wait for webhook callback",
        icon: Globe,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        config: { waitType: "webhook_response" },
      },
      {
        type: "wait_event",
        nodeType: "wait",
        label: "Wait for Event",
        description: "Pause until event fires",
        icon: Pause,
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        config: { waitType: "event" },
      },
      {
        type: "db_query",
        nodeType: "action",
        label: "Database Query",
        description: "Query database directly",
        icon: Database,
        color: "text-indigo-600",
        bgColor: "bg-indigo-100",
        config: { action: "http_request", actionType: "db_query" },
      },
      {
        type: "whatsapp",
        nodeType: "action",
        label: "WhatsApp",
        description: "Send WhatsApp message",
        icon: MessageSquare,
        color: "text-green-600",
        bgColor: "bg-green-100",
        config: { action: "send_sms", integration: "whatsapp" },
      },
      {
        type: "math",
        nodeType: "transform",
        label: "Math",
        description: "Math operations",
        icon: Calculator,
        color: "text-cyan-600",
        bgColor: "bg-cyan-100",
        config: { operation: "math" },
      },
      {
        type: "date_time",
        nodeType: "transform",
        label: "Date/Time",
        description: "Date/time operations",
        icon: Calendar,
        color: "text-cyan-600",
        bgColor: "bg-cyan-100",
        config: { operation: "date_operation" },
      },
      {
        type: "string_ops",
        nodeType: "transform",
        label: "String",
        description: "String operations",
        icon: Code,
        color: "text-cyan-600",
        bgColor: "bg-cyan-100",
        config: { operation: "string_operation" },
      },
      {
        type: "array_ops",
        nodeType: "transform",
        label: "Array",
        description: "Array/list operations",
        icon: Braces,
        color: "text-cyan-600",
        bgColor: "bg-cyan-100",
        config: { operation: "array_operation" },
      },
    ],
  },
  {
    id: "utilities",
    label: "Utilities",
    icon: Braces,
    nodes: [
      {
        type: "util_error",
        nodeType: "utility",
        label: "Error Handler",
        description: "Handle errors",
        icon: AlertCircle,
        color: "text-red-600",
        bgColor: "bg-red-100",
        config: {},
      },
      {
        type: "util_success",
        nodeType: "utility",
        label: "Success",
        description: "Mark as success",
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-100",
        config: {},
      },
      {
        type: "util_fail",
        nodeType: "utility",
        label: "Fail",
        description: "Mark as failed",
        icon: XCircle,
        color: "text-red-600",
        bgColor: "bg-red-100",
        config: {},
      },
      {
        type: "util_log",
        nodeType: "utility",
        label: "Log",
        description: "Log to console",
        icon: Terminal,
        color: "text-gray-600",
        bgColor: "bg-gray-100",
        config: {},
      },
      {
        type: "util_end",
        nodeType: "end",
        label: "End",
        description: "End workflow",
        icon: XCircle,
        color: "text-gray-600",
        bgColor: "bg-gray-100",
        config: {},
      },
    ],
  },
]

interface NodePaletteProps {
  onDragStart: (event: DragEvent, nodeType: string, nodeData: NodeDefinition) => void
}

export function NodePalette({ onDragStart }: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["triggers", "actions"])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const filteredCategories = NODE_CATEGORIES.map((category) => ({
    ...category,
    nodes: category.nodes.filter(
      (node) =>
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((category) => category.nodes.length > 0)

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Categories */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredCategories.map((category) => (
            <div key={category.id} className="mb-2">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {expandedCategories.includes(category.id) ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
                <category.icon className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{category.label}</span>
                <span className="ml-auto text-xs text-gray-400">{category.nodes.length}</span>
              </button>

              {/* Nodes */}
              {expandedCategories.includes(category.id) && (
                <div className="ml-2 mt-1 space-y-1">
                  {category.nodes.map((node) => (
                    <div
                      key={node.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, node.nodeType, node)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border border-transparent",
                        "cursor-grab active:cursor-grabbing",
                        "hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm",
                        "transition-all duration-150"
                      )}
                    >
                      <div className={cn("p-1.5 rounded-md", node.bgColor)}>
                        <node.icon className={cn("h-4 w-4", node.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {node.label}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{node.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Drag nodes to canvas to build your workflow
        </p>
      </div>
    </div>
  )
}

export { NODE_CATEGORIES, type NodeDefinition }
