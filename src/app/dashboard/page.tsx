"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FileText,
  GitBranch,
  Users,
  Rocket,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Plug,
  Ticket,
} from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface Activity {
  id: string
  action: string
  entityType: string
  description: string
  createdAt: string
  user?: {
    name: string
  }
}

interface DashboardStats {
  templates: number
  workflows: number
  clients: number
  deployments: number
  integrations: { active: number; total: number }
  webhooks: number
  tickets: { open: number; inProgress: number; resolved: number }
  recentActivity: Activity[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    templates: 0,
    workflows: 0,
    clients: 0,
    deployments: 0,
    integrations: { active: 0, total: 0 },
    webhooks: 0,
    tickets: { open: 0, inProgress: 0, resolved: 0 },
    recentActivity: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          templatesRes,
          workflowsRes,
          clientsRes,
          deploymentsRes,
          integrationsRes,
          webhooksRes,
          ticketsRes,
          activityRes,
        ] = await Promise.all([
          fetch("/api/templates?pageSize=1"),
          fetch("/api/workflows?pageSize=1"),
          fetch("/api/clients?pageSize=1"),
          fetch("/api/deployments?pageSize=1"),
          fetch("/api/integrations?pageSize=100"),
          fetch("/api/webhooks?pageSize=1"),
          fetch("/api/support-tickets?pageSize=100"),
          fetch("/api/activity?limit=5"),
        ])

        const [templates, workflows, clients, deployments, integrations, webhooks, tickets, activity] =
          await Promise.all([
            templatesRes.json(),
            workflowsRes.json(),
            clientsRes.json(),
            deploymentsRes.json(),
            integrationsRes.json(),
            webhooksRes.json(),
            ticketsRes.json(),
            activityRes.json(),
          ])

        // Count integrations by status
        const activeIntegrations = integrations.data?.filter(
          (i: { status: string }) => i.status === "ACTIVE"
        ).length || 0

        // Count tickets by status
        const ticketData = tickets.data || []
        const openTickets = ticketData.filter((t: { status: string }) => t.status === "OPEN").length
        const inProgressTickets = ticketData.filter((t: { status: string }) => t.status === "IN_PROGRESS").length
        const resolvedTickets = ticketData.filter(
          (t: { status: string }) => t.status === "RESOLVED" || t.status === "CLOSED"
        ).length

        setStats({
          templates: templates.total || 0,
          workflows: workflows.total || 0,
          clients: clients.total || 0,
          deployments: deployments.total || 0,
          integrations: {
            active: activeIntegrations,
            total: integrations.total || 0,
          },
          webhooks: webhooks.total || 0,
          tickets: {
            open: openTickets,
            inProgress: inProgressTickets,
            resolved: resolvedTickets,
          },
          recentActivity: activity.data || [],
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      title: "Templates",
      value: stats.templates,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/dashboard/templates",
    },
    {
      title: "Workflows",
      value: stats.workflows,
      icon: GitBranch,
      color: "text-green-600",
      bgColor: "bg-green-50",
      href: "/dashboard/builder",
    },
    {
      title: "Clients",
      value: stats.clients,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      href: "/dashboard/clients",
    },
    {
      title: "Deployments",
      value: stats.deployments,
      icon: Rocket,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      href: "/dashboard/deployments",
    },
  ]

  const quickActions = [
    { title: "Create Template", href: "/dashboard/templates", icon: FileText },
    { title: "Build Workflow", href: "/dashboard/builder", icon: GitBranch },
    { title: "Add Client", href: "/dashboard/clients", icon: Users },
    { title: "New Deployment", href: "/dashboard/deployments", icon: Rocket },
  ]

  const getActivityIcon = (entityType: string) => {
    switch (entityType?.toLowerCase()) {
      case "template":
        return <FileText className="h-4 w-4 text-blue-600" />
      case "workflow":
        return <GitBranch className="h-4 w-4 text-green-600" />
      case "deployment":
        return <Rocket className="h-4 w-4 text-orange-600" />
      case "client":
        return <Users className="h-4 w-4 text-purple-600" />
      case "integration":
        return <Plug className="h-4 w-4 text-cyan-600" />
      case "supportticket":
      case "ticket":
        return <Ticket className="h-4 w-4 text-yellow-600" />
      default:
        return <CheckCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return "recently"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome to your No-Code AI Agency Builder</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {isLoading ? "..." : stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Plus className="h-4 w-4" />
                  {action.title}
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-gray-50"
                  >
                    <div className="p-2 rounded-lg bg-white">
                      {getActivityIcon(activity.entityType)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description || `${activity.action} ${activity.entityType}`}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(activity.createdAt)}
                        {activity.user?.name && ` by ${activity.user.name}`}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No recent activity yet. Start by creating a template or workflow!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">API Uptime</span>
                <Badge variant="success">99.9%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Avg Response</span>
                <Badge variant="default">124ms</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Error Rate</span>
                <Badge variant="success">0.1%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              Active Integrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Connected</span>
                <Badge variant="default">{isLoading ? "..." : stats.integrations.active}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Webhooks</span>
                <Badge variant="default">{isLoading ? "..." : stats.webhooks}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total</span>
                <Badge variant="default">{isLoading ? "..." : stats.integrations.total}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Link href="/dashboard/support-tickets">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Support Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Open</span>
                  <Badge variant="warning">{isLoading ? "..." : stats.tickets.open}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">In Progress</span>
                  <Badge variant="default">{isLoading ? "..." : stats.tickets.inProgress}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Resolved</span>
                  <Badge variant="success">{isLoading ? "..." : stats.tickets.resolved}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
