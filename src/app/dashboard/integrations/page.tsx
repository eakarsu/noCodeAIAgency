"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Puzzle,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Link,
  Webhook,
  Key,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDateTime } from "@/lib/utils"

interface Integration {
  id: string
  name: string
  type: string
  provider: string
  status: string
  lastSyncAt: string | null
  createdAt: string
}

interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  isActive: boolean
  createdAt: string
}

const INTEGRATION_TYPES = [
  { value: "SAAS", label: "SaaS Platform" },
  { value: "AI_MODEL", label: "AI Model Provider" },
  { value: "HOSTING", label: "Hosting Platform" },
  { value: "PAYMENT", label: "Payment Processor" },
  { value: "SUPPORT", label: "Support Tool" },
  { value: "CUSTOM", label: "Custom API" },
]

const CONNECTORS = [
  { provider: "slack", name: "Slack", category: "SAAS", icon: "S" },
  { provider: "hubspot", name: "HubSpot", category: "SAAS", icon: "H" },
  { provider: "salesforce", name: "Salesforce", category: "SAAS", icon: "S" },
  { provider: "stripe", name: "Stripe", category: "PAYMENT", icon: "S" },
  { provider: "openai", name: "OpenAI", category: "AI_MODEL", icon: "O" },
  { provider: "anthropic", name: "Anthropic", category: "AI_MODEL", icon: "A" },
  { provider: "vercel", name: "Vercel", category: "HOSTING", icon: "V" },
  { provider: "aws", name: "AWS", category: "HOSTING", icon: "A" },
  { provider: "zendesk", name: "Zendesk", category: "SUPPORT", icon: "Z" },
  { provider: "intercom", name: "Intercom", category: "SUPPORT", icon: "I" },
]

const WEBHOOK_EVENTS = [
  "workflow.started",
  "workflow.completed",
  "workflow.failed",
  "client.created",
  "client.updated",
  "deployment.started",
  "deployment.completed",
]

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateIntegrationOpen, setIsCreateIntegrationOpen] = useState(false)
  const [isCreateWebhookOpen, setIsCreateWebhookOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [integrationForm, setIntegrationForm] = useState({
    name: "",
    type: "SAAS",
    provider: "",
  })
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    events: [] as string[],
  })
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [isIntegrationDetailOpen, setIsIntegrationDetailOpen] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)
  const [isWebhookDetailOpen, setIsWebhookDetailOpen] = useState(false)

  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await fetch("/api/integrations")
      const data = await response.json()
      setIntegrations(data.data || [])
    } catch (error) {
      console.error("Error fetching integrations:", error)
    }
  }, [])

  const fetchWebhooks = useCallback(async () => {
    try {
      const response = await fetch("/api/webhooks")
      const data = await response.json()
      setWebhooks(data.data || [])
    } catch (error) {
      console.error("Error fetching webhooks:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIntegrations()
    fetchWebhooks()
  }, [fetchIntegrations, fetchWebhooks])

  const handleCreateIntegration = async () => {
    if (!integrationForm.name || !integrationForm.provider) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(integrationForm),
      })

      if (response.ok) {
        setIsCreateIntegrationOpen(false)
        setIntegrationForm({ name: "", type: "SAAS", provider: "" })
        fetchIntegrations()
      }
    } catch (error) {
      console.error("Error creating integration:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateWebhook = async () => {
    if (!webhookForm.name || !webhookForm.url || webhookForm.events.length === 0) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookForm),
      })

      if (response.ok) {
        setIsCreateWebhookOpen(false)
        setWebhookForm({ name: "", url: "", events: [] })
        fetchWebhooks()
      }
    } catch (error) {
      console.error("Error creating webhook:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteIntegration = async (id: string) => {
    if (!confirm("Are you sure you want to delete this integration?")) return

    try {
      await fetch(`/api/integrations/${id}`, { method: "DELETE" })
      fetchIntegrations()
    } catch (error) {
      console.error("Error deleting integration:", error)
    }
  }

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm("Are you sure you want to delete this webhook?")) return

    try {
      await fetch(`/api/webhooks/${id}`, { method: "DELETE" })
      fetchWebhooks()
    } catch (error) {
      console.error("Error deleting webhook:", error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "INACTIVE":
        return <XCircle className="h-4 w-4 text-gray-400" />
      case "ERROR":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const toggleWebhookEvent = (event: string) => {
    if (webhookForm.events.includes(event)) {
      setWebhookForm({
        ...webhookForm,
        events: webhookForm.events.filter((e) => e !== event),
      })
    } else {
      setWebhookForm({
        ...webhookForm,
        events: [...webhookForm.events, event],
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integration Hub</h1>
          <p className="text-gray-500">Connect your favorite tools and services</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="integrations">
        <TabsList>
          <TabsTrigger value="integrations">
            <Puzzle className="h-4 w-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="h-4 w-4 mr-2" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="connectors">
            <Link className="h-4 w-4 mr-2" />
            Connectors
          </TabsTrigger>
        </TabsList>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setIsCreateIntegrationOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading integrations...</div>
          ) : integrations.length === 0 ? (
            <EmptyState
              icon={Puzzle}
              title="No integrations yet"
              description="Connect your first integration to get started"
              action={{
                label: "Add Integration",
                onClick: () => setIsCreateIntegrationOpen(true),
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.map((integration) => (
                <Card key={integration.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedIntegration(integration); setIsIntegrationDetailOpen(true); }}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-50">
                          <Puzzle className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                          <p className="text-sm text-gray-500">{integration.provider}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync Now
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={(e) => { e.stopPropagation(); handleDeleteIntegration(integration.id); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(integration.status)}
                        <Badge variant={integration.status === "ACTIVE" ? "success" : "secondary"}>
                          {integration.status}
                        </Badge>
                      </div>
                      {integration.lastSyncAt && (
                        <span className="text-xs text-gray-500">
                          Last sync: {formatDateTime(integration.lastSyncAt)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="mt-6 space-y-6">
          <div className="flex items-center justify-end">
            <Button onClick={() => setIsCreateWebhookOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Webhook
            </Button>
          </div>

          {webhooks.length === 0 ? (
            <EmptyState
              icon={Webhook}
              title="No webhooks configured"
              description="Create webhooks to receive real-time notifications"
              action={{
                label: "Create Webhook",
                onClick: () => setIsCreateWebhookOpen(true),
              }}
            />
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <Card key={webhook.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedWebhook(webhook); setIsWebhookDetailOpen(true); }}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-blue-50">
                        <Webhook className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{webhook.name}</h3>
                        <p className="text-sm text-gray-500 truncate max-w-md">{webhook.url}</p>
                        <div className="flex gap-1 mt-1">
                          {webhook.events.map((event) => (
                            <Badge key={event} variant="secondary" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={webhook.isActive ? "success" : "secondary"}>
                        {webhook.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleDeleteWebhook(webhook.id); }}
                      >
                        <Trash2 className="h-4 w-4 text-gray-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="mt-6">
          <EmptyState
            icon={Key}
            title="No API keys"
            description="Generate API keys for external access"
            action={{
              label: "Generate API Key",
              onClick: () => {},
            }}
          />
        </TabsContent>

        {/* Connectors Tab */}
        <TabsContent value="connectors" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Connectors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {CONNECTORS.map((connector) => (
                  <div
                    key={connector.provider}
                    className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => {
                      setIntegrationForm({
                        name: connector.name,
                        type: connector.category,
                        provider: connector.provider,
                      })
                      setIsCreateIntegrationOpen(true)
                    }}
                  >
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-600 mb-2">
                      {connector.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{connector.name}</span>
                    <span className="text-xs text-gray-500">{connector.category}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Integration Dialog */}
      <Dialog open={isCreateIntegrationOpen} onOpenChange={setIsCreateIntegrationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Integration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              label="Name"
              placeholder="My Integration"
              value={integrationForm.name}
              onChange={(e) => setIntegrationForm({ ...integrationForm, name: e.target.value })}
            />
            <Select
              value={integrationForm.type}
              onValueChange={(value) => setIntegrationForm({ ...integrationForm, type: value })}
            >
              <SelectTrigger label="Type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTEGRATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              label="Provider"
              placeholder="e.g., slack, hubspot, stripe"
              value={integrationForm.provider}
              onChange={(e) => setIntegrationForm({ ...integrationForm, provider: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateIntegrationOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateIntegration} isLoading={isSubmitting}>
              Add Integration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Webhook Dialog */}
      <Dialog open={isCreateWebhookOpen} onOpenChange={setIsCreateWebhookOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              label="Name"
              placeholder="My Webhook"
              value={webhookForm.name}
              onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
            />
            <Input
              label="URL"
              placeholder="https://example.com/webhook"
              value={webhookForm.url}
              onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Events</label>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <Badge
                    key={event}
                    variant={webhookForm.events.includes(event) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleWebhookEvent(event)}
                  >
                    {event}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateWebhookOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWebhook} isLoading={isSubmitting}>
              Create Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Integration Detail Modal */}
      <Dialog open={isIntegrationDetailOpen} onOpenChange={(open) => { setIsIntegrationDetailOpen(open); if (!open) setSelectedIntegration(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Integration Details</DialogTitle>
          </DialogHeader>
          {selectedIntegration && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-50">
                  <Puzzle className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedIntegration.name}</h3>
                  <p className="text-sm text-gray-500">{selectedIntegration.provider}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Provider</span>
                  <p className="text-gray-600">{selectedIntegration.provider}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Type</span>
                  <p className="text-gray-600">{selectedIntegration.type}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status</span>
                  <div className="mt-1 flex items-center gap-2">
                    {getStatusIcon(selectedIntegration.status)}
                    <Badge variant={selectedIntegration.status === "ACTIVE" ? "success" : "secondary"}>
                      {selectedIntegration.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Last Sync</span>
                  <p className="text-gray-600">{selectedIntegration.lastSyncAt ? formatDateTime(selectedIntegration.lastSyncAt) : "Never"}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Created</span>
                  <p className="text-gray-600">{new Date(selectedIntegration.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="destructive" onClick={() => { if (selectedIntegration) { handleDeleteIntegration(selectedIntegration.id); setIsIntegrationDetailOpen(false); } }}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Webhook Detail Modal */}
      <Dialog open={isWebhookDetailOpen} onOpenChange={(open) => { setIsWebhookDetailOpen(open); if (!open) setSelectedWebhook(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Webhook Details</DialogTitle>
          </DialogHeader>
          {selectedWebhook && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-50">
                  <Webhook className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedWebhook.name}</h3>
                  <Badge variant={selectedWebhook.isActive ? "success" : "secondary"}>
                    {selectedWebhook.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">URL</span>
                  <p className="text-gray-600 break-all">{selectedWebhook.url}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Events</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedWebhook.events.map((event) => (
                      <Badge key={event} variant="secondary" className="text-xs">{event}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Created</span>
                  <p className="text-gray-600">{new Date(selectedWebhook.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="destructive" onClick={() => { if (selectedWebhook) { handleDeleteWebhook(selectedWebhook.id); setIsWebhookDetailOpen(false); } }}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
