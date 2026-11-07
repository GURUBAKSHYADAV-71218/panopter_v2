'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Search, AlertCircle, ChevronRight } from 'lucide-react'
import type { PriorityLevel, ReviewStatus } from '@/types'
import { isDemoMode, DEMO_INVESTIGATION, DEMO_FINDINGS } from '@/lib/demo/demoData'

type FindingWithInvestigation = {
  id: string
  title: string
  description: string
  finding_type: string
  priority_score: number
  priority_level: PriorityLevel
  review_status: ReviewStatus
  created_at: string
  investigation_id: string
  investigations: { name: string } | null
}

export default function AllFindingsPage() {
  const router = useRouter()
  const [findings, setFindings] = useState<FindingWithInvestigation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all')

  useEffect(() => {
    if (isDemoMode()) {
      const demoFindings = DEMO_FINDINGS.map(f => ({
        ...f,
        investigations: { name: DEMO_INVESTIGATION.name },
      }))
      setFindings(demoFindings as unknown as FindingWithInvestigation[])
      setLoading(false)
      return
    }

    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('findings')
        .select('id, title, description, finding_type, priority_score, priority_level, review_status, created_at, investigation_id, investigations(name)')
        .order('priority_score', { ascending: false })

      setFindings((data ?? []) as unknown as FindingWithInvestigation[])
      setLoading(false)
    }
    load()
  }, [router])

  const filtered = findings.filter(f => {
    const q = search.toLowerCase()
    const matchSearch = !q || f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
    const matchPriority = priorityFilter === 'all' || f.priority_level === priorityFilter
    const matchStatus = statusFilter === 'all' || f.review_status === statusFilter
    return matchSearch && matchPriority && matchStatus
  })

  const counts = {
    total: findings.length,
    critical: findings.filter(f => f.priority_level === 'critical').length,
    high: findings.filter(f => f.priority_level === 'high').length,
    needs_review: findings.filter(f => f.review_status === 'needs_review').length,
    confirmed: findings.filter(f => f.review_status === 'confirmed').length,
  }

  if (loading) return <PageLoader />

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-p-text text-xl font-bold">All Findings</h1>
        <p className="text-p-text-3 text-sm mt-0.5">Findings across all your investigations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total', value: counts.total, cls: 'text-p-text' },
          { label: 'Critical', value: counts.critical, cls: 'text-p-critical' },
          { label: 'High', value: counts.high, cls: 'text-p-high' },
          { label: 'Needs Review', value: counts.needs_review, cls: 'text-p-warning-2' },
          { label: 'Confirmed', value: counts.confirmed, cls: 'text-p-success-2' },
        ].map(s => (
          <div key={s.label} className="bg-p-surface border border-p-border rounded-lg p-3 text-center">
            <div className={`text-xl font-bold ${s.cls}`}>{s.value}</div>
            <div className="text-p-text-3 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-p-text-3" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search findings…"
            className="w-full bg-p-surface border border-p-border rounded-lg pl-9 pr-4 py-2 text-p-text text-sm placeholder:text-p-text-3 focus:outline-none focus:border-p-crimson"
          />
        </div>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value as PriorityLevel | 'all')}
          className="bg-p-surface border border-p-border rounded-lg px-3 py-2 text-p-text text-sm focus:outline-none focus:border-p-crimson"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="moderate">Moderate</option>
          <option value="low">Low</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as ReviewStatus | 'all')}
          className="bg-p-surface border border-p-border rounded-lg px-3 py-2 text-p-text text-sm focus:outline-none focus:border-p-crimson"
        >
          <option value="all">All Statuses</option>
          <option value="needs_review">Needs Review</option>
          <option value="confirmed">Confirmed</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<AlertCircle className="w-12 h-12" />}
          title={findings.length === 0 ? 'No findings yet' : 'No findings match your filters'}
          description={findings.length === 0
            ? 'Process documents within an investigation to generate findings.'
            : 'Try adjusting your search or filters.'}
          action={findings.length === 0 ? { label: 'Go to Investigations', href: '/investigations' } : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(f => (
            <Link
              key={f.id}
              href={`/investigations/${f.investigation_id}/findings/${f.id}`}
              className="block bg-p-surface border border-p-border rounded-xl p-4 hover:border-p-crimson/50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5"><PriorityBadge level={f.priority_level} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-p-text font-semibold group-hover:text-p-crimson transition-colors">
                      {f.title}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={f.review_status} />
                      <ChevronRight className="w-4 h-4 text-p-text-3 group-hover:text-p-crimson" />
                    </div>
                  </div>
                  <p className="text-p-text-2 text-sm mt-1 line-clamp-2">{f.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-p-text-3 text-xs">
                    <Link
                      href={`/investigations/${f.investigation_id}`}
                      onClick={e => e.stopPropagation()}
                      className="hover:text-p-crimson transition-colors"
                    >
                      {f.investigations?.name ?? 'Investigation'}
                    </Link>
                    <span>Score: {f.priority_score}/100</span>
                    <span>{new Date(f.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
