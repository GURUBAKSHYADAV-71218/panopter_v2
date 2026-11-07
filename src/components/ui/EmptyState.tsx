import React from 'react'
import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-p-text-3 mb-4">
        {icon ?? <FileQuestion className="w-12 h-12" />}
      </div>
      <h3 className="text-p-text font-semibold text-lg mb-2">{title}</h3>
      {description && (
        <p className="text-p-text-2 text-sm max-w-sm mb-6">{description}</p>
      )}
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="px-4 py-2 bg-p-crimson hover:bg-p-crimson-2 text-white rounded-lg text-sm transition-colors"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="px-4 py-2 bg-p-crimson hover:bg-p-crimson-2 text-white rounded-lg text-sm transition-colors"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  )
}
