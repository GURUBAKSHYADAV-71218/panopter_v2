'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { ArrowLeft, FileText, AlertTriangle, Clock, Play, ChevronRight } from 'lucide-react'
import type { Investigation, Document, Finding } from '@/types'
import { investigationsStore, documentsStore, findingsStore } from '@/lib/store'

const TABS = [
  { id: 'documents', label: 'Documents' },
  { id: 'findings', label: 'Findings' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'report', label: 'Report' },
  { id: 'review', label: 'Notes' },
]

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) {
    const hrs = Math.floor(diff / 3600000)
    if (hrs === 0) return `${Math.floor(diff / 60000)}m ago`
    return `${hrs}h ago`
  }
  if (days < 7) return `${days}d ago`
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function InvestigationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.investigationId as string

  const [inv, setInv] = useState<Investigation | null>(null)
  const [docs, setDocs] = useState<Document[]>([])
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const investigation = investigationsStore.get(id)
    if (!investigation) { setNotFound(true); setLoading(false); return }
    setInv(investigation)
    setDocs(documentsStore.list(id))
    setFindings(findingsStore.list(id).slice(0, 5))
    setLoading(false)
  }, [id])

  if (loading) return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="h-8 w-64 bg-p-border rounded animate-pulse" />
      <div className="h-32 bg-p-surface border border-p-border rounded-p-lg animate-pulse" />
    </div>
  )

  if (notFound) return (
    <div className="max-w-5xl mx-auto text-center py-20">
      <p className="text-p-text-2 font-medium">Investigation not found</p>
      <Link href="/investigations" className="text-p-crimson text-sm mt-2 inline-block hover:text-p-crimson-2">← Back to Investigations</Link>
    </div>
  )

  if (!inv) return null

  const pendingDocs = docs.filter(d => d.processing_status === 'pending')

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => router.back()} className="mt-1 p-1.5 rounded-p text-p-text-3 hover:text-p-text hover:bg-p-surface-2 transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-p-text">{inv.name}</h1>
              <StatusBadge status={inv.status as never} />
            </div>
            {inv.description && <p className="text-p-text-3 text-sm mt-1">{inv.description}</p>}
            <p className="text-p-text-3 text-xs mt-1">Created {timeAgo(inv.created_at)}</p>
          </div>
        </div>
        {pendingDocs.length > 0 && (
          <Link href={`/investigations/${id}/documents`}
            className="flex items-center gap-2 bg-p-crimson hover:bg-p-crimson-2 text-white text-sm font-semibold px-4 py-2 rounded-p transition-colors shrink-0">
            <Play className="w-4 h-4" /> Process Documents
          </Link>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-p-surface border border-p-border rounded-p-lg p-4 text-center">
          <div className="text-2xl font-bold text-p-text">{docs.length}</div>
          <div className="text-xs text-p-text-3 mt-0.5">Documents</div>
        </div>
        <div className="bg-p-surface border border-p-border rounded-p-lg p-4 text-center">
          <div className="text-2xl font-bold text-p-text">{findings.length}</div>
          <div className="text-xs text-p-text-3 mt-0.5">Findings</div>
        </div>
        <div className="bg-p-surface border border-p-border rounded-p-lg p-4 text-center">
          <div className="text-2xl font-bold text-p-crimson">{findings.filter(f => f.review_status === 'needs_review').length}</div>
          <div className="text-xs text-p-text-3 mt-0.5">Needs Review</div>
        </div>
      </div>

      {/* Quick nav tabs */}
      <div className="flex gap-1 bg-p-surface border border-p-border rounded-p-lg p-1">
        {TABS.map(tab => (
          <Link key={tab.id} href={`/investigations/${id}/${tab.id}`}
            className="flex-1 text-center text-xs font-medium py-2 rounded-p text-p-text-2 hover:bg-p-surface-2 hover:text-p-text transition-colors">
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Document status overview */}
      <div className="bg-p-surface border border-p-border rounded-p-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-p-border">
          <h2 className="font-semibold text-p-text text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-p-crimson" />Documents</h2>
          <Link href={`/investigations/${id}/documents`} className="text-xs text-p-crimson hover:text-p-crimson-2 flex items-center gap-1 transition-colors">
            Manage <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {docs.length === 0 ? (
          <div className="px-5 py-8 text-center text-p-text-3 text-sm">No documents added yet.</div>
        ) : (
          <div className="divide-y divide-p-border">
            {docs.map(doc => (
              <div key={doc.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-p-text-3 shrink-0" />
                  <span className="text-sm text-p-text truncate">{doc.file_name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <StatusBadge status={doc.processing_status as never} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top findings preview */}
      {findings.length > 0 && (
        <div className="bg-p-surface border border-p-border rounded-p-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-p-border">
            <h2 className="font-semibold text-p-text text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-p-crimson" />Top Findings</h2>
            <Link href={`/investigations/${id}/findings`} className="text-xs text-p-crimson hover:text-p-crimson-2 flex items-center gap-1 transition-colors">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-p-border">
            {findings.map(f => (
              <Link key={f.id} href={`/investigations/${id}/findings/${f.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-p-surface-2 transition-colors group">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-p-text group-hover:text-p-crimson transition-colors truncate">{f.title}</p>
                  <p className="text-xs text-p-text-3 mt-0.5 truncate">{f.description.slice(0, 80)}…</p>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <PriorityBadge level={f.priority_level as never} />
                  <StatusBadge status={f.review_status as never} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
