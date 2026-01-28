'use client'

import { Star, Download, Tag } from 'lucide-react'

interface TemplateCardProps {
  template: {
    id: string
    name: string
    description?: string | null
    category: string
    industry?: string | null
    tags: string[]
    isBuiltIn: boolean
    downloads: number
    rating: number
    ratingCount: number
  }
  onSelect: (id: string) => void
}

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <div
      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
      onClick={() => onSelect(template.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-sm line-clamp-2">{template.name}</h3>
        {template.isBuiltIn && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap ml-2">
            Built-in
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500 mb-3 line-clamp-2">
        {template.description || 'No description'}
      </p>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
          {template.category}
        </span>
        {template.industry && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
            {template.industry}
          </span>
        )}
      </div>

      {template.tags.length > 0 && (
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          <Tag className="w-3 h-3 text-gray-400" />
          {template.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs text-gray-400">
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="text-xs text-gray-400">+{template.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-medium">{template.rating.toFixed(1)}</span>
          <span className="text-xs text-gray-400">({template.ratingCount})</span>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <Download className="w-3.5 h-3.5" />
          <span className="text-xs">{template.downloads}</span>
        </div>
      </div>
    </div>
  )
}
