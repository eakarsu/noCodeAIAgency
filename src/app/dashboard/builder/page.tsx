"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import {
  GitBranch,
  Plus,
  Search,
  Play,
  Pause,
  MoreVertical,
  Trash2,
  Edit,
  Copy,
  Zap,
  ArrowRight,
  Square,
  Clock,
  RefreshCw,
  GitMerge,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { WorkflowEditor } from "@/components/workflow/WorkflowEditor"
import { Node, Edge, MarkerType } from "@xyflow/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/modal"
import { formatDateTime } from "@/lib/utils"

interface WorkflowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    config?: Record<string, unknown>
  }
}

interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

interface Workflow {
  id: string
  name: string
  description: string | null
  status: string
  version: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt: string
  updatedAt: string
}

type ViewMode = "list" | "editor"

const NODE_ICONS: Record<string, typeof Zap> = {
  trigger: Zap,
  action: Square,
  condition: GitMerge,
  delay: Clock,
  loop: RefreshCw,
}

const NODE_COLORS: Record<string, string> = {
  trigger: "bg-yellow-500",
  action: "bg-blue-500",
  condition: "bg-purple-500",
  delay: "bg-orange-500",
  loop: "bg-green-500",
}

export default function BuilderPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Editor state
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null)
  const [isNewWorkflow, setIsNewWorkflow] = useState(false)

  // Run state
  const [runningWorkflowId, setRunningWorkflowId] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<{ id: string; success: boolean; message: string } | null>(null)

  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const fetchWorkflows = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set("search", searchQuery)
      params.set("pageSize", "100")

      const response = await fetch(`/api/workflows?${params}`)
      const data = await response.json()
      setWorkflows(data.data || [])
    } catch (error) {
      console.error("Error fetching workflows:", error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    fetchWorkflows()
  }, [fetchWorkflows])

  // Parse nodes from workflow (handle JSON string or array)
  const parseNodes = (nodes: unknown): WorkflowNode[] => {
    if (!nodes) return []
    if (typeof nodes === "string") {
      try {
        return JSON.parse(nodes)
      } catch {
        return []
      }
    }
    if (Array.isArray(nodes)) return nodes as WorkflowNode[]
    return []
  }

  const parseEdges = (edges: unknown): WorkflowEdge[] => {
    if (!edges) return []
    if (typeof edges === "string") {
      try {
        return JSON.parse(edges)
      } catch {
        return []
      }
    }
    if (Array.isArray(edges)) return edges as WorkflowEdge[]
    return []
  }

  const handleCreateNew = () => {
    setCurrentWorkflow(null)
    setIsNewWorkflow(true)
    setViewMode("editor")
  }

  const handleOpenEdit = (workflow: Workflow) => {
    setCurrentWorkflow(workflow)
    setIsNewWorkflow(false)
    setViewMode("editor")
  }

  const handleBackToList = () => {
    setViewMode("list")
    setCurrentWorkflow(null)
    setIsNewWorkflow(false)
    fetchWorkflows()
  }

  const handleDeleteWorkflow = async (id: string) => {
    if (!confirm("Are you sure you want to delete this workflow?")) return

    try {
      await fetch(`/api/workflows/${id}`, { method: "DELETE" })
      fetchWorkflows()
    } catch (error) {
      console.error("Error deleting workflow:", error)
    }
  }

  const handleDuplicateWorkflow = async (workflow: Workflow) => {
    try {
      const nodes = parseNodes(workflow.nodes)
      const edges = parseEdges(workflow.edges)
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${workflow.name} (Copy)`,
          description: workflow.description,
          nodes: nodes,
          edges: edges,
        }),
      })

      if (response.ok) {
        fetchWorkflows()
      }
    } catch (error) {
      console.error("Error duplicating workflow:", error)
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      fetchWorkflows()
    } catch (error) {
      console.error("Error updating workflow:", error)
    }
  }

  const handleRunWorkflow = async (workflowId: string) => {
    setRunningWorkflowId(workflowId)
    setRunResult(null)
    try {
      const res = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "sync", triggerData: {} }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRunResult({
          id: workflowId,
          success: false,
          message: data.error || `HTTP ${res.status}`,
        })
        return
      }
      if (data.success) {
        const nodeCount = data.nodesExecuted || 0
        const duration = data.totalDuration ? `${data.totalDuration}ms` : ""
        setRunResult({
          id: workflowId,
          success: true,
          message: `Done: ${nodeCount} nodes${duration ? ` in ${duration}` : ""}`,
        })
      } else {
        setRunResult({
          id: workflowId,
          success: false,
          message: data.error || "Execution failed",
        })
      }
    } catch (error) {
      setRunResult({
        id: workflowId,
        success: false,
        message: error instanceof Error ? error.message : "Network error",
      })
    } finally {
      setRunningWorkflowId(null)
      setTimeout(() => setRunResult(null), 5000)
    }
  }

  const handleSaveWorkflow = async (
    name: string,
    description: string,
    nodes: Node[],
    edges: Edge[]
  ) => {
    // Convert React Flow nodes/edges to our format
    const workflowNodes = nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    }))

    const workflowEdges = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    }))

    if (isNewWorkflow) {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          nodes: workflowNodes,
          edges: workflowEdges,
        }),
      })

      if (response.ok) {
        const newWorkflow = await response.json()
        setCurrentWorkflow(newWorkflow)
        setIsNewWorkflow(false)
      }
    } else if (currentWorkflow) {
      await fetch(`/api/workflows/${currentWorkflow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          nodes: workflowNodes,
          edges: workflowEdges,
        }),
      })
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "secondary",
      ACTIVE: "success",
      PAUSED: "warning",
      ARCHIVED: "default",
    }
    return colors[status] || "default"
  }

  // Convert workflow nodes to React Flow format
  const getInitialNodes = (): Node[] => {
    if (isNewWorkflow) {
      return [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 250, y: 50 },
          data: { label: "Start", config: { trigger: "manual" } },
        },
      ]
    }

    if (currentWorkflow) {
      const nodes = parseNodes(currentWorkflow.nodes)
      return nodes.map((node) => ({
        id: node.id,
        type: node.type || "action",
        position: node.position || { x: 100, y: 100 },
        data: {
          label: node.data?.label || "Node",
          config: node.data?.config || {},
        },
      }))
    }

    return []
  }

  const getInitialEdges = (): Edge[] => {
    if (isNewWorkflow || !currentWorkflow) return []

    const edges = parseEdges(currentWorkflow.edges)
    return edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: "smoothstep",
      animated: true,
      style: { strokeWidth: 2, stroke: "#6366f1" },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
    }))
  }

  // Render editor mode
  if (viewMode === "editor") {
    return (
      <WorkflowEditor
        workflowId={currentWorkflow?.id}
        workflowName={currentWorkflow?.name || "New Workflow"}
        workflowDescription={currentWorkflow?.description || ""}
        initialNodes={getInitialNodes()}
        initialEdges={getInitialEdges()}
        onSave={handleSaveWorkflow}
        onBack={handleBackToList}
        isNew={isNewWorkflow}
        status={currentWorkflow?.status}
        version={currentWorkflow?.version}
      />
    )
  }

  // Render list mode
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visual Builder</h1>
          <p className="text-gray-500">Design and manage your workflows with drag & drop</p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Node Types Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-500">Available Node Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(NODE_ICONS).map(([type, Icon]) => (
              <div
                key={type}
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className={`p-1 rounded ${NODE_COLORS[type]}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700 capitalize">{type}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search workflows..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Workflows Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : workflows.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No workflows yet"
          description="Create your first workflow to automate your processes"
          action={{
            label: "Create Workflow",
            onClick: handleCreateNew,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow) => {
            const nodes = parseNodes(workflow.nodes)
            return (
              <Card
                key={workflow.id}
                className="hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => { setSelectedWorkflow(workflow); setIsDetailOpen(true); }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                        <GitBranch className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {workflow.name}
                        </h3>
                        <p className="text-sm text-gray-500">v{workflow.version}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEdit(workflow)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDuplicateWorkflow(workflow)
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteWorkflow(workflow.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {workflow.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{workflow.description}</p>
                  )}

                  {/* Mini workflow preview */}
                  <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg mb-4">
                    {nodes.length > 0 ? (
                      <>
                        {nodes.slice(0, 4).map((node, i) => {
                          const Icon = NODE_ICONS[node.type] || Square
                          return (
                            <div key={node.id} className="flex items-center gap-1">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                  NODE_COLORS[node.type] || "bg-gray-500"
                                }`}
                                title={node.data?.label || node.type}
                              >
                                <Icon className="h-3.5 w-3.5 text-white" />
                              </div>
                              {i < Math.min(nodes.length - 1, 3) && (
                                <ArrowRight className="h-3 w-3 text-gray-400" />
                              )}
                            </div>
                          )
                        })}
                        {nodes.length > 4 && (
                          <span className="text-xs text-gray-500 ml-1">+{nodes.length - 4}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">No nodes yet</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge
                      variant={
                        getStatusColor(workflow.status) as
                          | "default"
                          | "success"
                          | "warning"
                          | "secondary"
                      }
                    >
                      {workflow.status}
                    </Badge>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {/* Run button */}
                      {runningWorkflowId === workflow.id ? (
                        <Button size="sm" variant="outline" disabled className="h-7 text-xs">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Running
                        </Button>
                      ) : runResult?.id === workflow.id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className={`h-7 text-xs ${runResult.success ? "text-green-600 border-green-300" : "text-red-600 border-red-300"}`}
                        >
                          {runResult.success ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {runResult.message}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRunWorkflow(workflow.id)}
                          className="h-7 text-xs text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Run
                        </Button>
                      )}

                      {/* Status toggle */}
                      {workflow.status === "ACTIVE" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(workflow.id, "PAUSED")}
                          className="h-7 text-xs"
                        >
                          <Pause className="h-3 w-3 mr-1" />
                          Pause
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(workflow.id, "ACTIVE")}
                          className="h-7 text-xs bg-green-600 hover:bg-green-700"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={(open) => { setIsDetailOpen(open); if (!open) setSelectedWorkflow(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Workflow Details</DialogTitle>
          </DialogHeader>
          {selectedWorkflow && (() => {
            const nodes = parseNodes(selectedWorkflow.nodes)
            const edges = parseEdges(selectedWorkflow.edges)
            return (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                    <GitBranch className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedWorkflow.name}</h3>
                    <p className="text-sm text-gray-500">v{selectedWorkflow.version}</p>
                  </div>
                </div>

                {selectedWorkflow.description && (
                  <p className="text-sm text-gray-700">{selectedWorkflow.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Status</span>
                    <div className="mt-1">
                      <Badge variant={getStatusColor(selectedWorkflow.status) as "default" | "success" | "warning" | "secondary"}>
                        {selectedWorkflow.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Version</span>
                    <p className="text-gray-600">v{selectedWorkflow.version}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Nodes</span>
                    <p className="text-gray-600">{nodes.length}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Edges</span>
                    <p className="text-gray-600">{edges.length}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Created</span>
                    <p className="text-gray-600">{new Date(selectedWorkflow.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Updated</span>
                    <p className="text-gray-600">{new Date(selectedWorkflow.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Mini node preview */}
                {nodes.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Node Preview</span>
                    <div className="flex flex-wrap items-center gap-2 mt-2 p-3 bg-gray-50 rounded-lg">
                      {nodes.slice(0, 6).map((node) => {
                        const Icon = NODE_ICONS[node.type] || Square
                        return (
                          <div
                            key={node.id}
                            className={`px-2 py-1 rounded text-xs text-white flex items-center gap-1 ${NODE_COLORS[node.type] || "bg-gray-500"}`}
                            title={node.data?.label}
                          >
                            <Icon className="h-3 w-3" />
                            {node.data?.label}
                          </div>
                        )
                      })}
                      {nodes.length > 6 && (
                        <span className="text-xs text-gray-500">+{nodes.length - 6} more</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="destructive" onClick={() => { if (selectedWorkflow) { handleDeleteWorkflow(selectedWorkflow.id); setIsDetailOpen(false); } }}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button onClick={() => { if (selectedWorkflow) { handleOpenEdit(selectedWorkflow); setIsDetailOpen(false); } }}>
              <Edit className="h-4 w-4 mr-2" />
              Open Editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
