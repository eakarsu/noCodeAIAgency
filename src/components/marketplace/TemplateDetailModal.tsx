'use client'

import { useState } from 'react'
import { Star, Download, Tag, X, Loader2 } from 'lucide-react'

interface TemplateDetail {
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

interface TemplateDetailModalProps {
  template: TemplateDetail
  onClose: () => void
  onUse: (templateId: string, name?: string) => Promise<void>
}

export function TemplateDetailModal({ template, onClose, onUse }: TemplateDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [workflowName, setWorkflowName] = useState(`${template.name} (Copy)`)

  const handleUse = async () => {
    setLoading(true)
    try {
      await onUse(template.id, workflowName)
      onClose()
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{template.name}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              {template.category}
            </span>
            {template.industry && (
              <span className="text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {template.industry}
              </span>
            )}
            {template.isBuiltIn && (
              <span className="text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded">
                Official
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600">
            {template.description || 'No description available.'}
          </p>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-medium">{template.rating.toFixed(1)}</span>
              <span className="text-sm text-gray-400">({template.ratingCount} reviews)</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <Download className="w-4 h-4" />
              <span className="text-sm">{template.downloads} uses</span>
            </div>
          </div>

          {template.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-4 h-4 text-gray-400" />
              {template.tags.map(tag => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="text-xs text-gray-400">
            Version {template.version} &middot; Added {new Date(template.createdAt).toLocaleDateString()}
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium mb-1">Workflow Name</label>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Enter workflow name"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleUse}
            disabled={loading || !workflowName.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Use Template
          </button>
        </div>
      </div>
    </div>
  )
}
