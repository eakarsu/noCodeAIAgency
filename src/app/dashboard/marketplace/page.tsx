'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { TemplateCard } from '@/components/marketplace/TemplateCard'
import { TemplateDetailModal } from '@/components/marketplace/TemplateDetailModal'
import { useRouter } from 'next/navigation'

interface MarketplaceTemplate {
  id: string
  name: string
  description?: string | null
  type: string
  category: string
  industry?: string | null
  tags: string[]
  isBuiltIn: boolean
  version: string
  downloads: number
  rating: number
  ratingCount: number
  createdAt: string
}

interface MarketplaceResponse {
  templates: MarketplaceTemplate[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  filters: {
    categories: string[]
    industries: string[]
  }
}

export default function MarketplacePage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sortBy, setSortBy] = useState('downloads')
  const [categories, setCategories] = useState<string[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<MarketplaceTemplate | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '12',
        sortBy,
      })
      if (search) params.set('search', search)
      if (category) params.set('category', category)

      const res = await fetch(`/api/templates/marketplace?${params}`)
      const data: MarketplaceResponse = await res.json()

      setTemplates(data.templates)
      setTotalPages(data.totalPages)
      if (data.filters?.categories) {
        setCategories(data.filters.categories)
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search, category, sortBy])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleUseTemplate = async (templateId: string, name?: string) => {
    const res = await fetch(`/api/templates/${templateId}/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })

    if (!res.ok) throw new Error('Failed to use template')

    const data = await res.json()
    router.push(`/dashboard/builder?workflowId=${data.workflow.id}`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchTemplates()
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Template Marketplace</h1>
        <p className="text-gray-500 text-sm">
          Browse and use pre-built workflow templates to get started quickly.
        </p>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </form>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-gray-400" />
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1) }}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1) }}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="downloads">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="newest">Newest</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-full mb-1" />
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-4" />
              <div className="h-6 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No templates found</p>
          <p className="text-sm">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {templates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={(id) => {
                  const t = templates.find(t => t.id === id)
                  if (t) setSelectedTemplate(t)
                }}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {selectedTemplate && (
        <TemplateDetailModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onUse={handleUseTemplate}
        />
      )}
    </div>
  )
}
