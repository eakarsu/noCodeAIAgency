"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
  Rocket,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  RefreshCw,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RotateCcw,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDateTime } from "@/lib/utils"

interface Deployment {
  id: string
  name: string
  environment: string
  status: string
  version: string
  url: string | null
  deployedAt: string | null
  createdAt: string
  client: {
    id: string
    name: string
    email: string
  } | null
}

interface Client {
  id: string
  name: string
  email: string
}

const ENVIRONMENTS = [
  { value: "DEVELOPMENT", label: "Development" },
  { value: "STAGING", label: "Staging" },
  { value: "PRODUCTION", label: "Production" },
]

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [envFilter, setEnvFilter] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    clientId: "",
    environment: "STAGING",
    version: "1.0.0",
  })

  const fetchDeployments = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (envFilter) params.set("environment", envFilter)

      const response = await fetch(`/api/deployments?${params}`)
      const data = await response.json()
      setDeployments(data.data || [])
    } catch (error) {
      console.error("Error fetching deployments:", error)
    } finally {
      setIsLoading(false)
    }
  }, [envFilter])

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients?pageSize=100")
      const data = await response.json()
      setClients(data.data || [])
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }

  useEffect(() => {
    fetchDeployments()
    fetchClients()
  }, [fetchDeployments])

  const handleCreateDeployment = async () => {
    if (!formData.name) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setIsCreateOpen(false)
        setFormData({ name: "", clientId: "", environment: "STAGING", version: "1.0.0" })
        fetchDeployments()
      }
    } catch (error) {
      console.error("Error creating deployment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeploy = async (id: string) => {
    try {
      await fetch(`/api/deployments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DEPLOYING" }),
      })

      // Simulate deployment completion after 2 seconds
      setTimeout(async () => {
        await fetch(`/api/deployments/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "DEPLOYED",
            url: `https://app-${id.slice(0, 8)}.example.com`,
          }),
        })
        fetchDeployments()
      }, 2000)

      fetchDeployments()
    } catch (error) {
      console.error("Error deploying:", error)
    }
  }

  const handleRollback = async (id: string) => {
    if (!confirm("Are you sure you want to rollback this deployment?")) return

    try {
      await fetch(`/api/deployments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ROLLED_BACK" }),
      })
      fetchDeployments()
    } catch (error) {
      console.error("Error rolling back:", error)
    }
  }

  const handleDeleteDeployment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this deployment?")) return

    try {
      await fetch(`/api/deployments/${id}`, { method: "DELETE" })
      fetchDeployments()
    } catch (error) {
      console.error("Error deleting deployment:", error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DEPLOYED":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "DEPLOYING":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "ROLLED_BACK":
        return <RotateCcw className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DEPLOYED":
        return <Badge variant="success">Deployed</Badge>
      case "DEPLOYING":
        return <Badge variant="default">Deploying</Badge>
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>
      case "ROLLED_BACK":
        return <Badge variant="warning">Rolled Back</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  const getEnvBadge = (env: string) => {
    switch (env) {
      case "PRODUCTION":
        return <Badge variant="destructive">Production</Badge>
      case "STAGING":
        return <Badge variant="warning">Staging</Badge>
      default:
        return <Badge variant="secondary">Development</Badge>
    }
  }

  const filteredDeployments = deployments.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deployments</h1>
          <p className="text-gray-500">Manage your application deployments</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Deployment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Deployed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {deployments.filter((d) => d.status === "DEPLOYED").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Loader2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {deployments.filter((d) => d.status === "DEPLOYING").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Failed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {deployments.filter((d) => d.status === "FAILED").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-50">
                <Clock className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {deployments.filter((d) => d.status === "PENDING").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search deployments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={envFilter || "all"} onValueChange={(val) => setEnvFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Environments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Environments</SelectItem>
            {ENVIRONMENTS.map((env) => (
              <SelectItem key={env.value} value={env.value}>
                {env.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Deployments */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="staging">Staging</TabsTrigger>
          <TabsTrigger value="development">Development</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading deployments...</div>
          ) : filteredDeployments.length === 0 ? (
            <EmptyState
              icon={Rocket}
              title="No deployments yet"
              description="Create your first deployment to get started"
              action={{
                label: "New Deployment",
                onClick: () => setIsCreateOpen(true),
              }}
            />
          ) : (
            <div className="space-y-4">
              {filteredDeployments.map((deployment) => (
                <Card key={deployment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-blue-50">
                          {getStatusIcon(deployment.status)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{deployment.name}</h3>
                            <span className="text-sm text-gray-500">v{deployment.version}</span>
                          </div>
                          {deployment.client && (
                            <p className="text-sm text-gray-500">
                              Client: {deployment.client.name}
                            </p>
                          )}
                          {deployment.url && (
                            <a
                              href={deployment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {deployment.url}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            {getEnvBadge(deployment.environment)}
                            {getStatusBadge(deployment.status)}
                          </div>
                          {deployment.deployedAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              Deployed: {formatDateTime(deployment.deployedAt)}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {deployment.status === "PENDING" && (
                              <DropdownMenuItem onClick={() => handleDeploy(deployment.id)}>
                                <Rocket className="h-4 w-4 mr-2" />
                                Deploy Now
                              </DropdownMenuItem>
                            )}
                            {deployment.status === "DEPLOYED" && (
                              <>
                                <DropdownMenuItem onClick={() => handleDeploy(deployment.id)}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Redeploy
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRollback(deployment.id)}>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Rollback
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteDeployment(deployment.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="production" className="mt-6">
          <EmptyState
            icon={Rocket}
            title="No production deployments"
            description="Production deployments will appear here"
          />
        </TabsContent>

        <TabsContent value="staging" className="mt-6">
          <EmptyState
            icon={Rocket}
            title="No staging deployments"
            description="Staging deployments will appear here"
          />
        </TabsContent>

        <TabsContent value="development" className="mt-6">
          <EmptyState
            icon={Rocket}
            title="No development deployments"
            description="Development deployments will appear here"
          />
        </TabsContent>
      </Tabs>

      {/* Create Deployment Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Deployment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              label="Deployment Name"
              placeholder="My Deployment"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Select
              value={formData.clientId || "none"}
              onValueChange={(value) => setFormData({ ...formData, clientId: value === "none" ? "" : value })}
            >
              <SelectTrigger label="Client (Optional)">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={formData.environment}
              onValueChange={(value) => setFormData({ ...formData, environment: value })}
            >
              <SelectTrigger label="Environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENVIRONMENTS.map((env) => (
                  <SelectItem key={env.value} value={env.value}>
                    {env.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              label="Version"
              placeholder="1.0.0"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDeployment} isLoading={isSubmitting}>
              Create Deployment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
