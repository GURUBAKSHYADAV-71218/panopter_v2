'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Search, FileText, ExternalLink } from 'lucide-react'
import { documentsStore, investigationsStore } from '@/lib/store'

type DocumentWithInvestigation = {
  id: string
  file_name: string
  file_type: string
  file_size: number
  processing_status: string
  document_type: string
  created_at: string
  investigation_id: string
  investigations: { name: string } | null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AllDocumentsPage() {
  const [docs, setDocs] = useState<DocumentWithInvestigation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const invMap = new Map(investigationsStore.list().map(inv => [inv.id, inv.name]))
    const allDocs = documentsStore.listAll().map(d => ({
      ...d,
      investigations: { name: invMap.get(d.investigation_id) ?? '—' },
    }))
    setDocs(allDocs as unknown as DocumentWithInvestigation[])
    setLoading(false)
  }, [])

  const filtered = docs.filter(d => {
    const q = search.toLowerCase()
    const matchSearch = !q || d.file_name.toLowerCase().includes(q)
    const matchType = typeFilter === 'all' || d.document_type === typeFilter
    const matchStatus = statusFilter === 'all' || d.processing_status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  if (loading) return <PageLoader />

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-p-text text-xl font-bold">All Documents</h1>
          <p className="text-p-text-3 text-sm mt-0.5">{docs.length} document{docs.length !== 1 ? 's' : ''} across all investigations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-p-text-3" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by filename…"
            className="w-full bg-p-surface border border-p-border rounded-lg pl-9 pr-4 py-2 text-p-text text-sm placeholder:text-p-text-3 focus:outline-none focus:border-p-crimson"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-p-surface border border-p-border rounded-lg px-3 py-2 text-p-text text-sm focus:outline-none focus:border-p-crimson"
        >
          <option value="all">All Types</option>
          {['invoice', 'purchase_order', 'receipt', 'bank_statement', 'agreement', 'general', 'unknown'].map(t => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-p-surface border border-p-border rounded-lg px-3 py-2 text-p-text text-sm focus:outline-none focus:border-p-crimson"
        >
          <option value="all">All Statuses</option>
          {['pending', 'completed', 'failed', 'ocr_processing', 'extracting_text', 'classifying'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title={docs.length === 0 ? 'No documents yet' : 'No documents match your filters'}
          description={docs.length === 0 ? 'Upload documents within an investigation to get started.' : 'Try adjusting your search or filters.'}
          action={docs.length === 0 ? { label: 'Go to Investigations', href: '/investigations' } : undefined}
        />
      ) : (
        <div className="bg-p-surface border border-p-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-p-text-3 text-xs text-left border-b border-p-border bg-p-bg/50">
                <th className="px-4 py-3">File name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Investigation</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-p-border/50">
              {filtered.map(doc => (
                <tr key={doc.id} className="hover:bg-p-bg/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-p-text-3 shrink-0" />
                      <span className="text-p-text truncate max-w-48">{doc.file_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-p-text-2 capitalize">{doc.document_type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-p-text-3">{formatBytes(doc.file_size)}</td>
                  <td className="px-4 py-3"><StatusBadge status={doc.processing_status as never} /></td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/investigations/${doc.investigation_id}`}
                      className="text-p-text-2 hover:text-p-crimson transition-colors truncate max-w-32 block"
                    >
                      {doc.investigations?.name ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-p-text-3">{new Date(doc.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/investigations/${doc.investigation_id}/documents/${doc.id}`}
                      className="text-p-text-3 hover:text-p-crimson transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
