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
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Ticket,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  Clock,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  User,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNow } from "date-fns"

interface TicketMessage {
  id: string
  content: string
  senderType: string
  senderId: string
  createdAt: string
}

interface SupportTicket {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  client: {
    id: string
    name: string
    email: string
  }
  messages: TicketMessage[]
}

interface Client {
  id: string
  name: string
  email: string
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  // Create dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    clientId: "",
    subject: "",
    description: "",
    priority: "MEDIUM",
  })

  // Detail modal
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editStatus, setEditStatus] = useState("")
  const [editPriority, setEditPriority] = useState("")

  // Message
  const [newMessage, setNewMessage] = useState("")

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams({ pageSize: "100" })
      if (statusFilter) params.set("status", statusFilter)
      if (priorityFilter) params.set("priority", priorityFilter)

      const response = await fetch(`/api/support-tickets?${params}`)
      const data = await response.json()
      setTickets(data.data || [])
    } catch (error) {
      console.error("Error fetching tickets:", error)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, priorityFilter])

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
    fetchTickets()
    fetchClients()
  }, [fetchTickets])

  const handleCreateTicket = async () => {
    if (!formData.clientId || !formData.subject || !formData.description) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setIsCreateOpen(false)
        setFormData({ clientId: "", subject: "", description: "", priority: "MEDIUM" })
        fetchTickets()
      }
    } catch (error) {
      console.error("Error creating ticket:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTicket = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ticket?")) return

    try {
      await fetch(`/api/support-tickets/${id}`, { method: "DELETE" })
      setIsDetailOpen(false)
      setSelectedTicket(null)
      fetchTickets()
    } catch (error) {
      console.error("Error deleting ticket:", error)
    }
  }

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return

    try {
      const response = await fetch(`/api/support-tickets/${selectedTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus, priority: editPriority }),
      })

      if (response.ok) {
        const updated = await response.json()
        setSelectedTicket(updated)
        setIsEditing(false)
        fetchTickets()
      }
    } catch (error) {
      console.error("Error updating ticket:", error)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return

    try {
      const response = await fetch(`/api/support-tickets/${selectedTicket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      })

      if (response.ok) {
        setNewMessage("")
        // Refetch the ticket to get updated messages
        const ticketRes = await fetch(`/api/support-tickets/${selectedTicket.id}`)
        if (ticketRes.ok) {
          const updated = await ticketRes.json()
          setSelectedTicket(updated)
        }
        fetchTickets()
      }
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const openDetail = (ticket: SupportTicket) => {
    // Fetch full ticket with all messages
    fetch(`/api/support-tickets/${ticket.id}`)
      .then((res) => res.json())
      .then((data) => {
        setSelectedTicket(data)
        setEditStatus(data.status)
        setEditPriority(data.priority)
        setIsDetailOpen(true)
        setIsEditing(false)
      })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="warning">Open</Badge>
      case "IN_PROGRESS":
        return <Badge variant="default">In Progress</Badge>
      case "RESOLVED":
        return <Badge variant="success">Resolved</Badge>
      case "CLOSED":
        return <Badge variant="secondary">Closed</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <Badge variant="destructive">Urgent</Badge>
      case "HIGH":
        return <Badge variant="warning">High</Badge>
      case "MEDIUM":
        return <Badge variant="default">Medium</Badge>
      case "LOW":
        return <Badge variant="secondary">Low</Badge>
      default:
        return <Badge>{priority}</Badge>
    }
  }

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return "recently"
    }
  }

  // Filter tickets based on active tab and search
  const filteredTickets = tickets.filter((ticket) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "open" && ticket.status === "OPEN") ||
      (activeTab === "in_progress" && ticket.status === "IN_PROGRESS") ||
      (activeTab === "resolved" && (ticket.status === "RESOLVED" || ticket.status === "CLOSED"))

    const matchesSearch =
      !searchQuery ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesTab && matchesSearch
  })

  const openCount = tickets.filter((t) => t.status === "OPEN").length
  const inProgressCount = tickets.filter((t) => t.status === "IN_PROGRESS").length
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-500">Manage client support requests</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-50">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Open</p>
                <p className="text-2xl font-bold text-gray-900">{openCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{inProgressCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Resolved</p>
                <p className="text-2xl font-bold text-gray-900">{resolvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50">
                <Ticket className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{tickets.length}</p>
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
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter || "all"} onValueChange={(val) => setPriorityFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({tickets.length})</TabsTrigger>
          <TabsTrigger value="open">Open ({openCount})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({inProgressCount})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolvedCount})</TabsTrigger>
        </TabsList>

        {["all", "open", "in_progress", "resolved"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-6">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Loading tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title="No tickets found"
                description={tab === "all" ? "Create your first support ticket" : `No ${tab.replace("_", " ")} tickets`}
                action={
                  tab === "all"
                    ? { label: "New Ticket", onClick: () => setIsCreateOpen(true) }
                    : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openDetail(ticket)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-orange-50">
                            <Ticket className="h-5 w-5 text-orange-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 truncate">{ticket.subject}</h3>
                            <p className="text-sm text-gray-500">{ticket.client.name}</p>
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
                                openDetail(ticket)
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              View / Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteTicket(ticket.id)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{ticket.description}</p>

                      <div className="flex items-center gap-2 mb-3">
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(ticket.createdAt)}
                        </span>
                        {ticket.messages?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {ticket.messages.length}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create Ticket Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Support Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select
              value={formData.clientId || "none"}
              onValueChange={(value) => setFormData({ ...formData, clientId: value === "none" ? "" : value })}
            >
              <SelectTrigger label="Client">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a client</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              label="Subject"
              placeholder="Ticket subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
            <Textarea
              label="Description"
              placeholder="Describe the issue..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger label="Priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTicket} isLoading={isSubmitting}>
              Create Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={(open) => {
        setIsDetailOpen(open)
        if (!open) {
          setSelectedTicket(null)
          setIsEditing(false)
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-6 py-4">
              {/* Ticket Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedTicket.subject}</h3>
                  <p className="text-sm text-gray-500">
                    Client: {selectedTicket.client.name} ({selectedTicket.client.email})
                  </p>
                </div>

                <p className="text-sm text-gray-700">{selectedTicket.description}</p>

                {isEditing ? (
                  <div className="flex gap-4">
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger label="Status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={editPriority} onValueChange={setEditPriority}>
                      <SelectTrigger label="Priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedTicket.status)}
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                  <div>
                    <span className="font-medium text-gray-700">Created:</span>{" "}
                    {formatTime(selectedTicket.createdAt)}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Updated:</span>{" "}
                    {formatTime(selectedTicket.updatedAt)}
                  </div>
                </div>
              </div>

              {/* Messages Thread */}
              {selectedTicket.messages && selectedTicket.messages.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Messages</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedTicket.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg text-sm ${
                          msg.senderType === "agent"
                            ? "bg-blue-50 text-blue-900"
                            : "bg-gray-50 text-gray-900"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-3 w-3" />
                          <span className="font-medium text-xs">
                            {msg.senderType === "agent" ? "Agent" : "Client"}
                          </span>
                          <span className="text-xs text-gray-500">{formatTime(msg.createdAt)}</span>
                        </div>
                        <p>{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply Box */}
              <div className="flex gap-2">
                <Input
                  placeholder="Type a reply..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  Send
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateTicket}>Save Changes</Button>
              </>
            ) : (
              <>
                <Button
                  variant="destructive"
                  onClick={() => selectedTicket && handleDeleteTicket(selectedTicket.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedTicket) {
                      setEditStatus(selectedTicket.status)
                      setEditPriority(selectedTicket.priority)
                      setIsEditing(true)
                    }
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
