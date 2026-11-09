'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/Badge'
import { Plus, Search, FileText, AlertTriangle, Clock, Layers, ChevronRight } from 'lucide-react'
import type { Investigation } from '@/types'
import { investigationsStore, findingsStore, documentsStore } from '@/lib/store'

type SortOption = 'newest' | 'oldest' | 'name'
type StatusFilter = 'all' | 'draft' | 'processing' | 'completed' | 'completed_with_warnings' | 'failed' | 'archived'

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function InvestigationsPage() {
  const [investigations, setInvestigations] = useState<(Investigation & { doc_count: number; finding_count: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortOption>('newest')

  useEffect(() => {
    const invList = investigationsStore.list().map(inv => ({
      ...inv,
      doc_count: documentsStore.list(inv.id).length,
      finding_count: findingsStore.list(inv.id).length,
    }))
    setInvestigations(invList as (Investigation & { doc_count: number; finding_count: number })[])
    setLoading(false)
  }, [])

  const filtered = investigations
    .filter(inv => status === 'all' || inv.status === status)
    .filter(inv => !search || inv.name.toLowerCase().includes(search.toLowerCase()) || (inv.description ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return a.name.localeCompare(b.name)
    })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-p-text">Investigations</h1>
          <p className="text-p-text-3 text-sm mt-0.5">Manage and review your document investigations.</p>
        </div>
        <Link href="/investigations/new" className="flex items-center gap-2 bg-p-crimson hover:bg-p-crimson-2 text-white text-sm font-semibold px-4 py-2 rounded-p transition-colors">
          <Plus className="w-4 h-4" /> New Investigation
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-p-text-3" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search investigations…"
            className="w-full bg-p-surface border border-p-border rounded-p pl-9 pr-3 py-2 text-sm text-p-text placeholder:text-p-text-3 focus:outline-none focus:border-p-crimson"
          />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value as StatusFilter)}
          className="bg-p-surface border border-p-border rounded-p px-3 py-2 text-sm text-p-text focus:outline-none focus:border-p-crimson">
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="completed_with_warnings">With Warnings</option>
          <option value="failed">Failed</option>
          <option value="archived">Archived</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value as SortOption)}
          className="bg-p-surface border border-p-border rounded-p px-3 py-2 text-sm text-p-text focus:outline-none focus:border-p-crimson">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-p-surface border border-p-border rounded-p-lg p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-p-surface border border-p-border rounded-p-lg py-16 text-center">
          <Layers className="w-10 h-10 text-p-text-3 mx-auto mb-3" />
          <p className="text-p-text-2 font-medium">{search || status !== 'all' ? 'No investigations match your filters' : 'No investigations yet'}</p>
          <p className="text-p-text-3 text-sm mt-1">{search || status !== 'all' ? 'Try adjusting your search or filters.' : 'Create your first investigation to begin document analysis.'}</p>
          {!search && status === 'all' && (
            <Link href="/investigations/new" className="inline-flex items-center gap-1.5 mt-4 bg-p-crimson hover:bg-p-crimson-2 text-white text-sm font-medium px-4 py-2 rounded-p transition-colors">
              <Plus className="w-4 h-4" /> New Investigation
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => (
            <Link key={inv.id} href={`/investigations/${inv.id}`}
              className="flex items-center gap-4 bg-p-surface border border-p-border rounded-p-lg p-5 hover:bg-p-surface-2 hover:border-p-border-2 transition-all group">
              <div className="w-9 h-9 rounded-p bg-p-accent/30 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4 text-p-crimson" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-p-text text-sm group-hover:text-p-crimson transition-colors truncate">{inv.name}</span>
                  <StatusBadge status={inv.status as never} />
                </div>
                {inv.description && <p className="text-xs text-p-text-3 mt-0.5 truncate">{inv.description}</p>}
                <div className="flex items-center gap-4 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-p-text-3"><FileText className="w-3 h-3" />{inv.doc_count} doc{inv.doc_count !== 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-1 text-xs text-p-text-3"><AlertTriangle className="w-3 h-3" />{inv.finding_count} finding{inv.finding_count !== 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-1 text-xs text-p-text-3"><Clock className="w-3 h-3" />{timeAgo(inv.created_at)}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-p-text-3 group-hover:text-p-crimson shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
