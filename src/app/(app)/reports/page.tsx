'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/Badge'
import { FileText, ArrowRight } from 'lucide-react'
import type { Investigation } from '@/types'
import { isDemoMode, DEMO_INVESTIGATION } from '@/lib/demo/demoData'

export default function ReportsPage() {
  const router = useRouter()
  const [investigations, setInvestigations] = useState<Investigation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemoMode()) {
      setInvestigations([DEMO_INVESTIGATION])
      setLoading(false)
      return
    }

    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('investigations').select('*').order('created_at', { ascending: false })
      setInvestigations((data ?? []) as Investigation[])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <PageLoader />

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-p-text text-xl font-bold">Reports</h1>
        <p className="text-p-text-2 text-sm mt-1">
          Generate and download PDF, CSV, and JSON reports for your investigations.
        </p>
      </div>

      {investigations.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No investigations yet"
          description="Create an investigation and process documents to generate reports."
          action={{ label: 'New Investigation', href: '/investigations/new' }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {investigations.map(inv => (
            <div key={inv.id} className="bg-p-surface border border-p-border rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-p-text font-semibold mb-1">{inv.name}</div>
                  <div className="text-p-text-3 text-xs">
                    Created {new Date(inv.created_at).toLocaleDateString('en-IN')}
                  </div>
                </div>
                <StatusBadge status={inv.status} />
              </div>
              {inv.description && (
                <p className="text-p-text-2 text-sm line-clamp-2">{inv.description}</p>
              )}
              <div className="flex gap-2 pt-1">
                <Link
                  href={`/investigations/${inv.id}/report`}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-p-crimson hover:bg-p-crimson-2 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Generate Report
                </Link>
                <Link
                  href={`/investigations/${inv.id}`}
                  className="flex items-center gap-1.5 px-3 py-2 bg-p-surface-2 border border-p-border hover:border-p-crimson/50 text-p-text rounded-lg text-sm transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
