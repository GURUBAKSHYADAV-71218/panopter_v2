'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/hooks/useToast'
import {
  ArrowLeft, CheckCircle, XCircle, Clock, FileText, AlertCircle, History, Bookmark, BookmarkCheck
} from 'lucide-react'
import type { Finding, FindingEvidence, ReviewHistory, Document, ReviewStatus } from '@/types'
import {
  isDemoMode, DEMO_INVESTIGATION_ID, DEMO_INVESTIGATION, DEMO_FINDINGS,
  DEMO_EVIDENCE, DEMO_DOCUMENTS,
} from '@/lib/demo/demoData'

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

export default function FindingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { addToast } = useToast()
  const investigationId = params.investigationId as string
  const findingId = params.findingId as string

  const [finding, setFinding] = useState<Finding | null>(null)
  const [evidence, setEvidence] = useState<FindingEvidence[]>([])
  const [docs, setDocs] = useState<Document[]>([])
  const [history, setHistory] = useState<ReviewHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)
  const [invName, setInvName] = useState('')
  const [bookmarked, setBookmarked] = useState(false)
  const [bookmarking, setBookmarking] = useState(false)

  const load = useCallback(async () => {
    // Demo mode fallback
    if (isDemoMode() && investigationId === DEMO_INVESTIGATION_ID) {
      const demoFinding = DEMO_FINDINGS.find(f => f.id === findingId) ?? DEMO_FINDINGS[0]
      const demoEvidence = DEMO_EVIDENCE.filter(e => e.finding_id === demoFinding.id)
      const docIds = [...new Set(demoEvidence.map(e => e.document_id))]
      const relatedDocs = DEMO_DOCUMENTS.filter(d => docIds.includes(d.id))
      setInvName(DEMO_INVESTIGATION.name)
      setFinding(demoFinding)
      setEvidence(demoEvidence)
      setDocs(relatedDocs)
      setHistory([])
      setBookmarked(false)
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: inv }, { data: f }, { data: ev }, { data: h }, { data: bm }] = await Promise.all([
      supabase.from('investigations').select('name').eq('id', investigationId).single(),
      supabase.from('findings').select('*').eq('id', findingId).single(),
      supabase.from('finding_evidence').select('*').eq('finding_id', findingId),
      supabase.from('review_history').select('*').eq('finding_id', findingId).order('created_at'),
      user ? supabase.from('bookmarks').select('id').eq('finding_id', findingId).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    ])
    setInvName(inv?.name ?? '')
    setFinding(f as Finding | null)
    const evList = (ev ?? []) as FindingEvidence[]
    setEvidence(evList)
    setHistory((h ?? []) as ReviewHistory[])
    setBookmarked(!!bm)

    // Load related documents
    const docIds = [...new Set(evList.map(e => e.document_id))]
    if (docIds.length > 0) {
      const { data: d } = await supabase.from('documents').select('*').in('id', docIds)
      setDocs((d ?? []) as Document[])
    }
    setLoading(false)
  }, [investigationId, findingId])

  useEffect(() => { load() }, [load])

  async function updateReviewStatus(newStatus: ReviewStatus) {
    if (!finding) return

    // In demo mode, update state locally without persisting
    if (isDemoMode()) {
      setFinding(prev => prev ? { ...prev, review_status: newStatus } : null)
      addToast({ type: 'info', title: 'Demo mode', message: 'Status updated locally — not persisted without Supabase credentials.' })
      return
    }

    setReviewing(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [updateResult] = await Promise.all([
      supabase.from('findings').update({
        review_status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', findingId),
      supabase.from('review_history').insert({
        finding_id: findingId,
        user_id: user.id,
        previous_status: finding.review_status,
        new_status: newStatus,
        review_note: null,
      }),
    ])

    if (updateResult.error) {
      addToast({ type: 'error', title: 'Failed to update status', message: updateResult.error.message })
    } else {
      addToast({ type: 'success', title: 'Status updated' })
      setFinding(prev => prev ? { ...prev, review_status: newStatus } : null)
      await load()
    }
    setReviewing(false)
  }

  async function toggleBookmark() {
    if (!finding) return

    // In demo mode, toggle locally
    if (isDemoMode()) {
      setBookmarked(prev => !prev)
      addToast({ type: 'info', title: 'Demo mode', message: bookmarked ? 'Bookmark removed (not persisted)' : 'Bookmarked locally (not persisted)' })
      return
    }

    setBookmarking(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    if (bookmarked) {
      await supabase.from('bookmarks').delete().eq('finding_id', findingId).eq('user_id', user.id)
      setBookmarked(false)
      addToast({ type: 'info', title: 'Bookmark removed' })
    } else {
      await supabase.from('bookmarks').insert({ finding_id: findingId, user_id: user.id })
      setBookmarked(true)
      addToast({ type: 'success', title: 'Finding bookmarked' })
    }
    setBookmarking(false)
  }

  if (loading) return <PageLoader />
  if (!finding) {
    return (
      <div className="p-6 text-center text-p-text-3">
        Finding not found. <Link href={`/investigations/${investigationId}/findings`} className="text-p-crimson underline">Back to findings</Link>
      </div>
    )
  }

  const docMap = Object.fromEntries(docs.map(d => [d.id, d]))

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/investigations/${investigationId}/findings`} className="text-p-text-3 hover:text-p-text transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="text-p-text-3 text-xs mb-0.5">{invName} · Findings</div>
            <h1 className="text-p-text text-xl font-bold">{finding.title}</h1>
          </div>
        </div>
        <button
          onClick={toggleBookmark}
          disabled={bookmarking}
          title={bookmarked ? 'Remove bookmark' : 'Bookmark this finding'}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors
            ${bookmarked
              ? 'bg-p-warning/20 text-p-warning-2 border-p-warning/40'
              : 'bg-p-surface border-p-border text-p-text-3 hover:border-p-warning/50 hover:text-p-warning-2'
            }`}
        >
          {bookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          {bookmarked ? 'Bookmarked' : 'Bookmark'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Finding overview */}
          <div className="bg-p-surface border border-p-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <PriorityBadge level={finding.priority_level} />
              <span className="text-p-text-3 text-xs bg-p-bg px-2 py-0.5 rounded-full">
                {FINDING_TYPE_LABELS[finding.finding_type] ?? finding.finding_type}
              </span>
              <StatusBadge status={finding.review_status} />
            </div>

            <p className="text-p-text-2 text-sm leading-relaxed">{finding.description}</p>

            {/* Priority score bar */}
            <div>
              <div className="flex justify-between text-xs text-p-text-3 mb-1.5">
                <span>Priority Score</span>
                <span className="font-semibold text-p-text">{finding.priority_score} / 100</span>
              </div>
              <div className="h-2 bg-p-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-p-crimson rounded-full transition-all"
                  style={{ width: `${finding.priority_score}%` }}
                />
              </div>
            </div>

            <div className="text-p-text-3 text-xs">
              Generated {new Date(finding.created_at).toLocaleString('en-IN')}
            </div>
          </div>

          {/* Evidence */}
          <div className="bg-p-surface border border-p-border rounded-xl p-5 space-y-4">
            <h2 className="text-p-text font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-p-crimson" />
              Evidence ({evidence.length})
            </h2>

            {evidence.length === 0 ? (
              <p className="text-p-text-3 text-sm">No evidence records found for this finding.</p>
            ) : (
              <div className="space-y-4">
                {evidence.map(ev => {
                  const doc = docMap[ev.document_id]
                  return (
                    <div key={ev.id} className="border border-p-border-2 rounded-lg p-4 space-y-3">
                      {/* Doc reference */}
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-p-text-3 shrink-0" />
                        <span className="text-p-text text-sm font-medium">
                          {doc?.file_name ?? ev.document_id}
                        </span>
                        {ev.page_number !== null && (
                          <span className="text-p-text-3 text-xs">· Page {ev.page_number}</span>
                        )}
                      </div>

                      {/* Compared values */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-p-text-3 text-xs mb-1 uppercase tracking-wide">
                            {ev.field_name}
                          </div>
                          <div className="text-p-text font-mono text-sm bg-p-bg rounded-lg px-3 py-2">
                            {ev.observed_value}
                          </div>
                        </div>
                        {ev.compared_value !== null && (
                          <div>
                            <div className="text-p-text-3 text-xs mb-1 uppercase tracking-wide">
                              Compared value
                            </div>
                            <div className="text-p-error-2 font-mono text-sm bg-p-bg rounded-lg px-3 py-2">
                              {ev.compared_value}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Source excerpt */}
                      {ev.source_excerpt && (
                        <div>
                          <div className="text-p-text-3 text-xs mb-1 uppercase tracking-wide">Source excerpt</div>
                          <div className="font-mono text-xs text-p-text-2 bg-p-bg rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap">
                            {ev.source_excerpt}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Review history */}
          {history.length > 0 && (
            <div className="bg-p-surface border border-p-border rounded-xl p-5 space-y-3">
              <h2 className="text-p-text font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-p-text-3" />
                Review History
              </h2>
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="flex items-center gap-3 text-sm">
                    <div className="text-p-text-3 text-xs w-36 shrink-0">
                      {new Date(h.created_at).toLocaleString('en-IN')}
                    </div>
                    <span className="text-p-text-3 text-xs">{h.previous_status}</span>
                    <span className="text-p-text-3">→</span>
                    <StatusBadge status={h.new_status} />
                    {h.review_note && <span className="text-p-text-2 text-xs italic">"{h.review_note}"</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — review panel */}
        <div className="space-y-4">
          {/* Review Status card */}
          <div className="bg-p-surface border border-p-border rounded-xl p-5 space-y-3">
            <h2 className="text-p-text font-semibold">Review Status</h2>
            <p className="text-p-text-3 text-xs">
              All findings require human review. Never interpret these as proof of fraud or forgery.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => updateReviewStatus('confirmed')}
                disabled={reviewing || finding.review_status === 'confirmed'}
                className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${finding.review_status === 'confirmed'
                    ? 'bg-p-success/20 text-p-success-2 border border-p-success/40 cursor-default'
                    : 'bg-p-surface-2 hover:bg-p-success/20 text-p-text border border-p-border hover:border-p-success/40'
                  }`}
              >
                <CheckCircle className="w-4 h-4" />
                Confirm Finding
              </button>

              <button
                onClick={() => updateReviewStatus('needs_review')}
                disabled={reviewing || finding.review_status === 'needs_review'}
                className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${finding.review_status === 'needs_review'
                    ? 'bg-p-warning/20 text-p-warning-2 border border-p-warning/40 cursor-default'
                    : 'bg-p-surface-2 hover:bg-p-warning/20 text-p-text border border-p-border hover:border-p-warning/40'
                  }`}
              >
                <Clock className="w-4 h-4" />
                Needs Review
              </button>

              <button
                onClick={() => updateReviewStatus('dismissed')}
                disabled={reviewing || finding.review_status === 'dismissed'}
                className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${finding.review_status === 'dismissed'
                    ? 'bg-p-error/20 text-p-error-2 border border-p-error/30 cursor-default'
                    : 'bg-p-surface-2 hover:bg-p-error/20 text-p-text border border-p-border hover:border-p-error/30'
                  }`}
              >
                <XCircle className="w-4 h-4" />
                Dismiss
              </button>
            </div>
          </div>

          {/* Related Documents */}
          {docs.length > 0 && (
            <div className="bg-p-surface border border-p-border rounded-xl p-5 space-y-3">
              <h2 className="text-p-text font-semibold">Related Documents</h2>
              <div className="space-y-2">
                {docs.map(doc => (
                  <Link
                    key={doc.id}
                    href={`/investigations/${investigationId}/documents/${doc.id}`}
                    className="flex items-center gap-2 text-sm text-p-text-2 hover:text-p-crimson transition-colors"
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate">{doc.file_name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back link */}
          <Link
            href={`/investigations/${investigationId}/findings`}
            className="block text-center text-sm text-p-text-3 hover:text-p-crimson transition-colors py-2"
          >
            ← Back to all findings
          </Link>
        </div>
      </div>
    </div>
  )
}
