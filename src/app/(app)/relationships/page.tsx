'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Share2, ArrowRight } from 'lucide-react'
import type { Investigation } from '@/types'
import { investigationsStore } from '@/lib/store'

export default function GlobalRelationshipsPage() {
  const [investigations, setInvestigations] = useState<Investigation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setInvestigations(investigationsStore.list())
    setLoading(false)
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-p-text text-xl font-bold">Relationship Graphs</h1>
        <p className="text-p-text-2 text-sm mt-1">
          Explore entity connections — vendors, people, accounts — across your investigations.
          Relationships are detected automatically when documents are compared.
        </p>
      </div>

      {investigations.length === 0 ? (
        <EmptyState
          icon={<Share2 className="w-12 h-12" />}
          title="No investigations yet"
          description="Create an investigation, upload documents, and run analysis to see relationship graphs."
          action={{ label: 'New Investigation', href: '/investigations/new' }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {investigations.map(inv => (
            <Link
              key={inv.id}
              href={`/investigations/${inv.id}/relationships`}
              className="bg-p-surface border border-p-border rounded-xl p-5 hover:border-p-crimson/50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Share2 className="w-4 h-4 text-p-text-3" />
                    <span className="text-p-text font-semibold group-hover:text-p-crimson transition-colors">
                      {inv.name}
                    </span>
                  </div>
                  <div className="text-p-text-3 text-xs">
                    {new Date(inv.created_at).toLocaleDateString('en-IN')}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-p-text-3 group-hover:text-p-crimson transition-colors shrink-0" />
              </div>
              <div className="mt-3 text-xs text-p-crimson/80 font-medium">
                View relationship graph →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
