'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Calendar, ArrowRight } from 'lucide-react'
import type { Investigation } from '@/types'
import { isDemoMode, DEMO_INVESTIGATION } from '@/lib/demo/demoData'

export default function GlobalTimelinePage() {
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
        <h1 className="text-p-text text-xl font-bold">Document Timelines</h1>
        <p className="text-p-text-2 text-sm mt-1">
          Track date chronology across documents in each investigation. Chronology issues
          like invoices issued before purchase orders are flagged automatically.
        </p>
      </div>

      {investigations.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-12 h-12" />}
          title="No investigations yet"
          description="Create an investigation and process documents to view timelines."
          action={{ label: 'New Investigation', href: '/investigations/new' }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {investigations.map(inv => (
            <Link
              key={inv.id}
              href={`/investigations/${inv.id}/timeline`}
              className="bg-p-surface border border-p-border rounded-xl p-5 hover:border-p-crimson/50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-p-text-3" />
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
                View timeline →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
