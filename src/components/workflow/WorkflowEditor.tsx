"use client"

import { useCallback, useRef, useState, DragEvent } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  ReactFlowProvider,
  useReactFlow,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Save,
  ArrowLeft,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Settings,
  X,
  Undo2,
  Redo2,
  Lock,
  Unlock,
  Download,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { nodeTypes } from "./nodes"
import { NodePalette, NodeDefinition } from "./NodePalette"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface WorkflowEditorProps {
  workflowId?: string
  workflowName: string
  workflowDescription: string
  initialNodes: Node[]
  initialEdges: Edge[]
  onSave: (name: string, description: string, nodes: Node[], edges: Edge[]) => Promise<void>
  onBack: () => void
  isNew?: boolean
  status?: string
  version?: string
}

function WorkflowEditorInner({
  workflowId,
  workflowName: initialName,
  workflowDescription: initialDescription,
  initialNodes,
  initialEdges,
  onSave,
  onBack,
  isNew,
  status,
  version,
}: WorkflowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [workflowName, setWorkflowName] = useState(initialName)
  const [workflowDescription, setWorkflowDescription] = useState(initialDescription)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [runResult, setRunResult] = useState<{ success: boolean; message: string } | null>(null)

  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow()

  const onConnect = useCallback(
    (params: Connection) => {
      if (isLocked) return
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            style: { strokeWidth: 2, stroke: "#6366f1" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
          },
          eds
        )
      )
      setHasChanges(true)
    },
    [setEdges, isLocked]
  )

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      if (isLocked) return

      const dataStr = event.dataTransfer.getData("application/reactflow")
      if (!dataStr) return

      try {
        const nodeData: { nodeType: string; nodeDefinition: NodeDefinition } = JSON.parse(dataStr)
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })

        const newNode: Node = {
          id: `${nodeData.nodeType}-${Date.now()}`,
          type: nodeData.nodeType,
          position,
          data: {
            label: nodeData.nodeDefinition.label,
            config: nodeData.nodeDefinition.config || {},
          },
        }

        setNodes((nds) => nds.concat(newNode))
        setHasChanges(true)
      } catch (e) {
        console.error("Failed to parse dropped node data", e)
      }
    },
    [screenToFlowPosition, setNodes, isLocked]
  )

  const onDragStart = (event: DragEvent, nodeType: string, nodeDefinition: NodeDefinition) => {
    event.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({ nodeType, nodeDefinition })
    )
    event.dataTransfer.effectAllowed = "move"
  }

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const updateNodeData = useCallback(
    (nodeId: string, newData: Record<string, unknown>) => {
      if (isLocked) return
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, ...newData },
            }
          }
          return node
        })
      )
      setSelectedNode((prev) =>
        prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...newData } } : prev
      )
      setHasChanges(true)
    },
    [setNodes, isLocked]
  )

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode || isLocked) return
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id))
    setEdges((eds) =>
      eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id)
    )
    setSelectedNode(null)
    setHasChanges(true)
  }, [selectedNode, setNodes, setEdges, isLocked])

  const duplicateSelectedNode = useCallback(() => {
    if (!selectedNode || isLocked) return
    const newNode: Node = {
      ...selectedNode,
      id: `${selectedNode.type}-${Date.now()}`,
      position: {
        x: selectedNode.position.x + 50,
        y: selectedNode.position.y + 50,
      },
      selected: false,
    }
    setNodes((nds) => nds.concat(newNode))
    setHasChanges(true)
  }, [selectedNode, setNodes, isLocked])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(workflowName, workflowDescription, nodes, edges)
      setHasChanges(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    if (hasChanges) {
      if (!confirm("You have unsaved changes. Are you sure you want to leave?")) {
        return
      }
    }
    onBack()
  }

  const handleRun = async () => {
    if (!workflowId || isNew) {
      setRunResult({ success: false, message: "Save the workflow first" })
      setTimeout(() => setRunResult(null), 3000)
      return
    }

    setIsRunning(true)
    setRunResult(null)

    try {
      const res = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "sync", triggerData: {} }),
      })

      const data = await res.json()

      if (!res.ok) {
        setRunResult({ success: false, message: data.error || `HTTP ${res.status}` })
        return
      }

      if (data.success) {
        const nodeCount = data.nodesExecuted || 0
        const duration = data.totalDuration ? `${data.totalDuration}ms` : ""
        setRunResult({
          success: true,
          message: `Done: ${nodeCount} nodes${duration ? ` in ${duration}` : ""}`,
        })
      } else {
        setRunResult({ success: false, message: data.error || "Execution failed" })
      }
    } catch (error) {
      setRunResult({ success: false, message: error instanceof Error ? error.message : "Run failed" })
    } finally {
      setIsRunning(false)
      setTimeout(() => setRunResult(null), 5000)
    }
  }

  const exportWorkflow = () => {
    const data = {
      name: workflowName,
      description: workflowDescription,
      nodes,
      edges,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${workflowName.replace(/\s+/g, "_")}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-white border-b shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <Input
              value={workflowName}
              onChange={(e) => {
                setWorkflowName(e.target.value)
                setHasChanges(true)
              }}
              className="text-lg font-bold border-none shadow-none p-0 h-auto focus-visible:ring-0 bg-transparent"
              placeholder="Workflow Name"
              disabled={isLocked}
            />
            <Input
              value={workflowDescription}
              onChange={(e) => {
                setWorkflowDescription(e.target.value)
                setHasChanges(true)
              }}
              className="text-sm text-gray-500 border-none shadow-none p-0 h-auto focus-visible:ring-0 bg-transparent"
              placeholder="Add description..."
              disabled={isLocked}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <Badge
              variant={
                status === "ACTIVE"
                  ? "success"
                  : status === "PAUSED"
                  ? "warning"
                  : "secondary"
              }
            >
              {status}
            </Badge>
          )}
          {version && <span className="text-sm text-gray-500">v{version}</span>}
          {hasChanges && (
            <Badge variant="outline" className="text-orange-500 border-orange-300">
              Unsaved
            </Badge>
          )}
          <div className="w-px h-6 bg-gray-200 mx-2" />
          <Button variant="outline" size="sm" onClick={() => setIsLocked(!isLocked)}>
            {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={exportWorkflow}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleBack}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            onClick={handleRun}
            disabled={isRunning || isNew}
            size="sm"
            variant={runResult?.success === true ? "outline" : runResult?.success === false ? "destructive" : "default"}
            className={cn(
              !runResult && "bg-green-600 hover:bg-green-700 text-white"
            )}
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : runResult?.success === true ? (
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            ) : runResult?.success === false ? (
              <XCircle className="h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isRunning ? "Running..." : runResult?.message || "Run"}
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette */}
        <div className="w-72 bg-white border-r shadow-sm">
          <NodePalette onDragStart={onDragStart} />
        </div>

        {/* Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={isLocked ? undefined : (changes) => {
              onNodesChange(changes)
              setHasChanges(true)
            }}
            onEdgesChange={isLocked ? undefined : (changes) => {
              onEdgesChange(changes)
              setHasChanges(true)
            }}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[20, 20]}
            nodesDraggable={!isLocked}
            nodesConnectable={!isLocked}
            elementsSelectable={!isLocked}
            defaultEdgeOptions={{
              type: "smoothstep",
              animated: true,
              style: { strokeWidth: 2, stroke: "#6366f1" },
              markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d1d5db" />
            <Controls
              position="bottom-left"
              showInteractive={false}
              className="!shadow-lg !rounded-lg !border !border-gray-200"
            />
            <MiniMap
              position="bottom-right"
              nodeColor={(node) => {
                const colors: Record<string, string> = {
                  trigger: "#f59e0b",
                  action: "#3b82f6",
                  condition: "#a855f7",
                  switch: "#ec4899",
                  loop: "#22c55e",
                  delay: "#f97316",
                  wait: "#f97316",
                  filter: "#8b5cf6",
                  split: "#ec4899",
                  merge: "#ec4899",
                  ai: "#7c3aed",
                  transform: "#06b6d4",
                  code: "#6b7280",
                  utility: "#6b7280",
                  end: "#6b7280",
                }
                return colors[node.type || "action"] || "#6b7280"
              }}
              maskColor="rgba(0,0,0,0.08)"
              className="!shadow-lg !rounded-lg !border !border-gray-200"
            />

            {/* Floating Toolbar */}
            <Panel position="top-center">
              <div className="flex items-center gap-1 bg-white rounded-xl shadow-lg border p-1.5">
                <Button variant="ghost" size="sm" onClick={() => zoomIn()} className="h-8 w-8 p-0">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => zoomOut()} className="h-8 w-8 p-0">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fitView({ padding: 0.2 })}
                  className="h-8 w-8 p-0"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={duplicateSelectedNode}
                  disabled={!selectedNode || isLocked}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deleteSelectedNode}
                  disabled={!selectedNode || isLocked}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Panel>

            {/* Lock indicator */}
            {isLocked && (
              <Panel position="top-left">
                <div className="bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Canvas is locked
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Properties Panel */}
        <div className="w-80 bg-white border-l shadow-sm overflow-y-auto">
          {selectedNode ? (
            (() => {
              const nodeConfig = (selectedNode.data.config || {}) as Record<string, unknown>
              return (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Node Properties
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setSelectedNode(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                    Node Label
                  </label>
                  <Input
                    value={selectedNode.data.label as string}
                    onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                    placeholder="Node label"
                    disabled={isLocked}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                    Node Type
                  </label>
                  <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 capitalize">
                    {selectedNode.type}
                  </div>
                </div>

                {selectedNode.type === "trigger" && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                      Trigger Type
                    </label>
                    <Select
                      value={(nodeConfig.trigger as string) || "manual"}
                      onValueChange={(value) =>
                        updateNodeData(selectedNode.id, {
                          config: { ...nodeConfig, trigger: value },
                        })
                      }
                      disabled={isLocked}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select trigger" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual Trigger</SelectItem>
                        <SelectItem value="schedule">Scheduled</SelectItem>
                        <SelectItem value="webhook">Webhook</SelectItem>
                        <SelectItem value="form">Form Submission</SelectItem>
                        <SelectItem value="email">New Email</SelectItem>
                        <SelectItem value="database">Database Change</SelectItem>
                        <SelectItem value="event">On Event</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedNode.type === "action" && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                      Action Type
                    </label>
                    <Select
                      value={(nodeConfig.action as string) || "send_email"}
                      onValueChange={(value) =>
                        updateNodeData(selectedNode.id, {
                          config: { ...nodeConfig, action: value },
                        })
                      }
                      disabled={isLocked}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="send_email">Send Email</SelectItem>
                        <SelectItem value="send_sms">Send SMS</SelectItem>
                        <SelectItem value="notification">Push Notification</SelectItem>
                        <SelectItem value="http_request">HTTP Request</SelectItem>
                        <SelectItem value="create_record">Create Record</SelectItem>
                        <SelectItem value="update_record">Update Record</SelectItem>
                        <SelectItem value="delete_record">Delete Record</SelectItem>
                        <SelectItem value="slack_message">Slack Message</SelectItem>
                        <SelectItem value="gmail_send">Gmail Send</SelectItem>
                        <SelectItem value="sheets_add_row">Google Sheets</SelectItem>
                        <SelectItem value="salesforce_create">Salesforce</SelectItem>
                        <SelectItem value="hubspot_contact">HubSpot</SelectItem>
                        <SelectItem value="stripe_charge">Stripe</SelectItem>
                        <SelectItem value="twilio_sms">Twilio SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedNode.type === "condition" && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                      Condition Expression
                    </label>
                    <Input
                      value={(nodeConfig.condition as string) || ""}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          config: { ...nodeConfig, condition: e.target.value },
                        })
                      }
                      placeholder="e.g., data.status === 'active'"
                      disabled={isLocked}
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      Green = True path, Red = False path
                    </p>
                  </div>
                )}

                {selectedNode.type === "delay" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                        Duration
                      </label>
                      <Input
                        type="number"
                        value={(nodeConfig.duration as string) || ""}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, {
                            config: { ...nodeConfig, duration: e.target.value },
                          })
                        }
                        placeholder="5"
                        disabled={isLocked}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Unit</label>
                      <Select
                        value={(nodeConfig.unit as string) || "minutes"}
                        onValueChange={(value) =>
                          updateNodeData(selectedNode.id, {
                            config: { ...nodeConfig, unit: value },
                          })
                        }
                        disabled={isLocked}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="seconds">Seconds</SelectItem>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {selectedNode.type === "loop" && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                      Iterations
                    </label>
                    <Input
                      type="number"
                      value={(nodeConfig.iterations as string) || ""}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          config: { ...nodeConfig, iterations: e.target.value },
                        })
                      }
                      placeholder="Number of times"
                      disabled={isLocked}
                    />
                  </div>
                )}

                {selectedNode.type === "ai" && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                      AI Operation
                    </label>
                    <Select
                      value={(nodeConfig.ai_action as string) || "generate_text"}
                      onValueChange={(value) =>
                        updateNodeData(selectedNode.id, {
                          config: { ...nodeConfig, ai_action: value },
                        })
                      }
                      disabled={isLocked}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select AI operation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="generate_text">Generate Text</SelectItem>
                        <SelectItem value="chat">AI Chat</SelectItem>
                        <SelectItem value="classify">Classify</SelectItem>
                        <SelectItem value="extract">Extract Data</SelectItem>
                        <SelectItem value="summarize">Summarize</SelectItem>
                        <SelectItem value="sentiment">Sentiment Analysis</SelectItem>
                        <SelectItem value="image">Image Analysis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {!isLocked && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={deleteSelectedNode}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Node
                    </Button>
                  </div>
                )}
              </div>
            </div>
              )
            })()
          ) : (
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Settings className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No node selected</h3>
              <p className="text-xs text-gray-500">
                Click on a node to view and edit its properties
              </p>
            </div>
          )}

          {/* Workflow Stats */}
          <div className="p-4 border-t bg-gray-50 mt-auto">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Workflow Stats
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-2xl font-bold text-gray-900">{nodes.length}</div>
                <div className="text-xs text-gray-500">Nodes</div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-2xl font-bold text-gray-900">{edges.length}</div>
                <div className="text-xs text-gray-500">Connections</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function WorkflowEditor(props: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner {...props} />
    </ReactFlowProvider>
  )
}
