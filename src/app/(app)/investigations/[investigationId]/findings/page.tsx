'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Search, ArrowLeft, AlertCircle, ChevronRight } from 'lucide-react'
import type { Finding, PriorityLevel, ReviewStatus } from '@/types'
import { investigationsStore, findingsStore } from '@/lib/store'

const FINDING_TYPE_LABELS: Record<string, string> = {
  amount_mismatch: 'Amount Mismatch',
  date_inconsistency: 'Date Inconsistency',
  vendor_mismatch: 'Vendor Mismatch',
  missing_field: 'Missing Field',
  duplicate_reference: 'Duplicate Reference',
  reference_mismatch: 'Reference Mismatch',
  account_mismatch: 'Account Mismatch',
  chronology_inconsistency: 'Chronology Issue',
  general_inconsistency: 'General Inconsistency',
}

export default function FindingsPage() {
  const params = useParams()
  const investigationId = params.investigationId as string

  const [findings, setFindings] = useState<Finding[]>([])
  const [invName, setInvName] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all')

  const load = useCallback(() => {
    setInvName(investigationsStore.get(investigationId)?.name ?? 'Investigation')
    setFindings(findingsStore.list(investigationId))
    setLoading(false)
  }, [investigationId])

  useEffect(() => { load() }, [load])

  const filtered = findings.filter(f => {
    const q = search.toLowerCase()
    const matchSearch = !q || f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
    const matchPriority = priorityFilter === 'all' || f.priority_level === priorityFilter
    const matchStatus = statusFilter === 'all' || f.review_status === statusFilter
    return matchSearch && matchPriority && matchStatus
  })

  // Counts
  const counts = {
    total: findings.length,
    critical: findings.filter(f => f.priority_level === 'critical').length,
    high: findings.filter(f => f.priority_level === 'high').length,
    moderate: findings.filter(f => f.priority_level === 'moderate').length,
    low: findings.filter(f => f.priority_level === 'low').length,
    needs_review: findings.filter(f => f.review_status === 'needs_review').length,
    confirmed: findings.filter(f => f.review_status === 'confirmed').length,
    dismissed: findings.filter(f => f.review_status === 'dismissed').length,
  }

  if (loading) return <PageLoader />

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/investigations/${investigationId}`} className="text-p-text-3 hover:text-p-text transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="text-p-text-3 text-xs mb-0.5">{invName}</div>
          <h1 className="text-p-text text-xl font-bold">Findings &amp; Evidence</h1>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        {[
          { label: 'Total', value: counts.total, cls: 'text-p-text' },
          { label: 'Critical', value: counts.critical, cls: 'text-p-critical' },
          { label: 'High', value: counts.high, cls: 'text-p-high' },
          { label: 'Moderate', value: counts.moderate, cls: 'text-p-moderate' },
          { label: 'Low', value: counts.low, cls: 'text-p-low' },
          { label: 'Needs Review', value: counts.needs_review, cls: 'text-p-warning-2' },
          { label: 'Confirmed', value: counts.confirmed, cls: 'text-p-success-2' },
          { label: 'Dismissed', value: counts.dismissed, cls: 'text-p-text-3' },
        ].map(s => (
          <div key={s.label} className="bg-p-surface border border-p-border rounded-lg p-3 text-center">
            <div className={`text-xl font-bold ${s.cls}`}>{s.value}</div>
            <div className="text-p-text-3 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
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

      {/* Findings list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<AlertCircle className="w-12 h-12" />}
          title={findings.length === 0 ? 'No findings yet' : 'No findings match your filters'}
          description={findings.length === 0
            ? 'Process documents first. The comparison engine will generate findings automatically.'
            : 'Try adjusting your search or filter criteria.'}
          action={findings.length === 0 ? {
            label: 'Go to Documents',
            href: `/investigations/${investigationId}/documents`,
          } : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(finding => (
            <Link
              key={finding.id}
              href={`/investigations/${investigationId}/findings/${finding.id}`}
              className="block bg-p-surface border border-p-border rounded-xl p-4 hover:border-p-crimson/50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <PriorityBadge level={finding.priority_level} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-p-text font-semibold group-hover:text-p-crimson transition-colors">
                        {finding.title}
                      </span>
                      <span className="ml-2 text-p-text-3 text-xs bg-p-bg px-2 py-0.5 rounded-full">
                        {FINDING_TYPE_LABELS[finding.finding_type] ?? finding.finding_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={finding.review_status} />
                      <ChevronRight className="w-4 h-4 text-p-text-3 group-hover:text-p-crimson transition-colors" />
                    </div>
                  </div>
                  <p className="text-p-text-2 text-sm mt-1 line-clamp-2">
                    {finding.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-p-text-3 text-xs">
                    <span>Score: {finding.priority_score}/100</span>
                    <span>{new Date(finding.created_at).toLocaleDateString('en-IN')}</span>
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
