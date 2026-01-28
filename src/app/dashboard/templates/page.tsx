"use client"

import { useEffect, useState } from "react"
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
import {
  FileText,
  Plus,
  Search,
  Download,
  Star,
  MoreVertical,
  Trash2,
  Edit,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface Template {
  id: string
  name: string
  description: string | null
  type: string
  category: string
  industry: string | null
  isBuiltIn: boolean
  isPublic: boolean
  downloads: number
  rating: number
  createdAt: string
}

const TEMPLATE_TYPES = [
  { value: "INDUSTRY", label: "Industry" },
  { value: "WORKFLOW", label: "Workflow" },
  { value: "INTEGRATION", label: "Integration" },
  { value: "UI", label: "UI" },
  { value: "FORM", label: "Form" },
  { value: "DASHBOARD", label: "Dashboard" },
  { value: "REPORT", label: "Report" },
]

const CATEGORIES = [
  "Marketing",
  "Sales",
  "Support",
  "Operations",
  "Finance",
  "HR",
  "Analytics",
  "Healthcare",
  "Events",
  "Customer Success",
  "CRM",
  "Payments",
  "Custom",
]

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<string>("")
  const [activeTab, setActiveTab] = useState("all")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "WORKFLOW",
    category: "Custom",
  })

  const fetchTemplates = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set("search", searchQuery)
      if (selectedType) params.set("type", selectedType)
      params.set("pageSize", "100")

      const response = await fetch(`/api/templates?${params}`)
      const data = await response.json()
      setTemplates(data.data || [])
    } catch (error) {
      console.error("Error fetching templates:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [searchQuery, selectedType])

  // Filter templates based on active tab
  const filteredTemplates = templates.filter((template) => {
    switch (activeTab) {
      case "my":
        return !template.isBuiltIn
      case "builtin":
        return template.isBuiltIn
      case "public":
        return template.isPublic
      default:
        return true
    }
  })

  const handleCreateTemplate = async () => {
    if (!formData.name) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          content: {},
        }),
      })

      if (response.ok) {
        setIsCreateOpen(false)
        setFormData({ name: "", description: "", type: "WORKFLOW", category: "Custom" })
        fetchTemplates()
      }
    } catch (error) {
      console.error("Error creating template:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return

    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" })
      fetchTemplates()
    } catch (error) {
      console.error("Error deleting template:", error)
    }
  }

  const handleOpenEdit = (template: Template) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || "",
      type: template.type,
      category: template.category,
    })
    setIsEditOpen(true)
  }

  const handleEditTemplate = async () => {
    if (!editingTemplate || !formData.name) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/templates/${editingTemplate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setIsEditOpen(false)
        setEditingTemplate(null)
        setFormData({ name: "", description: "", type: "WORKFLOW", category: "Custom" })
        fetchTemplates()
      }
    } catch (error) {
      console.error("Error updating template:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUseTemplate = async (template: Template) => {
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          description: template.description,
          type: template.type,
          category: template.category,
          content: {},
        }),
      })

      if (response.ok) {
        fetchTemplates()
        alert(`Template "${template.name}" copied successfully!`)
      }
    } catch (error) {
      console.error("Error copying template:", error)
    }
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      INDUSTRY: "bg-blue-100 text-blue-800",
      WORKFLOW: "bg-green-100 text-green-800",
      INTEGRATION: "bg-purple-100 text-purple-800",
      UI: "bg-orange-100 text-orange-800",
      FORM: "bg-pink-100 text-pink-800",
      DASHBOARD: "bg-cyan-100 text-cyan-800",
      REPORT: "bg-yellow-100 text-yellow-800",
    }
    return colors[type] || "bg-gray-100 text-gray-800"
  }

  const renderTemplateGrid = (templatesToRender: Template[]) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (templatesToRender.length === 0) {
      return (
        <EmptyState
          icon={FileText}
          title="No templates found"
          description={
            activeTab === "my"
              ? "Create your first custom template to get started"
              : activeTab === "builtin"
              ? "Built-in templates will appear here"
              : activeTab === "public"
              ? "Public templates from the community will appear here"
              : "No templates match your search criteria"
          }
          action={
            activeTab === "my" || activeTab === "all"
              ? {
                  label: "Create Template",
                  onClick: () => setIsCreateOpen(true),
                }
              : undefined
          }
        />
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templatesToRender.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-500">{template.category}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenEdit(template)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUseTemplate(template)}>
                      <Download className="h-4 w-4 mr-2" />
                      Use Template
                    </DropdownMenuItem>
                    {!template.isBuiltIn && (
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {template.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {template.description}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getTypeColor(template.type)}>{template.type}</Badge>
                  {template.isBuiltIn && (
                    <Badge variant="outline" className="text-xs">
                      Built-in
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {template.downloads}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {template.rating.toFixed(1)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Template Library</h1>
          <p className="text-gray-500">Browse and manage templates for your agency</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedType || "all"} onValueChange={(val) => setSelectedType(val === "all" ? "" : val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TEMPLATE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="my">
            My Templates ({templates.filter((t) => !t.isBuiltIn).length})
          </TabsTrigger>
          <TabsTrigger value="builtin">
            Built-in ({templates.filter((t) => t.isBuiltIn).length})
          </TabsTrigger>
          <TabsTrigger value="public">
            Public ({templates.filter((t) => t.isPublic).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {renderTemplateGrid(filteredTemplates)}
        </TabsContent>

        <TabsContent value="my" className="mt-6">
          {renderTemplateGrid(filteredTemplates)}
        </TabsContent>

        <TabsContent value="builtin" className="mt-6">
          {renderTemplateGrid(filteredTemplates)}
        </TabsContent>

        <TabsContent value="public" className="mt-6">
          {renderTemplateGrid(filteredTemplates)}
        </TabsContent>
      </Tabs>

      {/* Create Template Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              label="Template Name"
              placeholder="My Template"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Textarea
              label="Description"
              placeholder="Describe your template..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger label="Type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger label="Category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} isLoading={isSubmitting}>
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open)
        if (!open) {
          setEditingTemplate(null)
          setFormData({ name: "", description: "", type: "WORKFLOW", category: "Custom" })
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              label="Template Name"
              placeholder="My Template"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Textarea
              label="Description"
              placeholder="Describe your template..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger label="Type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger label="Category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTemplate} isLoading={isSubmitting}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
