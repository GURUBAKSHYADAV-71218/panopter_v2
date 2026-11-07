'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/ui/Badge'
import { processDocument } from '@/features/documents/processingPipeline'
import { getPendingFile, getAllPendingDocumentIds } from '@/features/documents/pendingFilesStore'
import { runComparisonEngine } from '@/features/comparison/engine'
import { useToast } from '@/hooks/useToast'
import {
  ArrowLeft, FileText, Play, RotateCcw, X, Upload, AlertCircle, CheckCircle,
  Loader2, ChevronRight, Image as ImageIcon
} from 'lucide-react'
import type { Document, DocumentProcessingStatus, ExtractedField } from '@/types'
import { formatFileSize } from '@/lib/validation/fileValidation'
import { isDemoMode, DEMO_INVESTIGATION_ID, DEMO_INVESTIGATION, DEMO_DOCUMENTS } from '@/lib/demo/demoData'

interface DocProgress {
  status: DocumentProcessingStatus
  stageName: string
  error?: string
}

export default function InvestigationDocumentsPage() {
  const params = useParams()
  const router = useRouter()
  const { addToast } = useToast()
  const investigationId = params.investigationId as string

  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<Record<string, DocProgress>>({})
  const [processing, setProcessing] = useState(false)
  const [invName, setInvName] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingDocIds, setPendingDocIds] = useState<string[]>([])

  useEffect(() => {
    if (isDemoMode() && investigationId === DEMO_INVESTIGATION_ID) {
      setInvName(DEMO_INVESTIGATION.name)
      setDocuments(DEMO_DOCUMENTS)
      setPendingDocIds([])
      setLoading(false)
      return
    }

    async function load() {
      const supabase = createClient()
      const { data: inv } = await supabase.from('investigations').select('name').eq('id', investigationId).single()
      setInvName(inv?.name ?? '')
      const { data: docs } = await supabase.from('documents').select('*').eq('investigation_id', investigationId).order('created_at')
      setDocuments(docs as Document[] ?? [])
      setPendingDocIds(getAllPendingDocumentIds())
      setLoading(false)
    }
    load()
  }, [investigationId])

  const updateDocProgress = useCallback((documentId: string, prog: DocProgress) => {
    setProgress(prev => ({ ...prev, [documentId]: prog }))
    // Also update the document in state so the status badge reflects live status
    setDocuments(prev => prev.map(d =>
      d.id === documentId ? { ...d, processing_status: prog.status } : d
    ))
  }, [])

  async function startProcessing() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const pendingDocs = documents.filter(d => d.processing_status === 'pending' || d.processing_status === 'failed')
    if (pendingDocs.length === 0) { addToast({ type: 'info', title: 'Nothing to process' }); return }

    // Check all have files available
    const missingFiles = pendingDocs.filter(d => !getPendingFile(d.id))
    if (missingFiles.length > 0) {
      addToast({ type: 'warning', title: 'Files needed', message: `${missingFiles.length} file(s) need to be re-uploaded. Original files are not stored after upload.` })
    }

    const docsWithFiles = pendingDocs.filter(d => getPendingFile(d.id))
    if (docsWithFiles.length === 0) {
      addToast({ type: 'error', title: 'No files available', message: 'Please re-upload the documents to process them.' })
      return
    }

    setProcessing(true)
    abortRef.current = new AbortController()

    // Update investigation status
    await supabase.from('investigations').update({ status: 'processing' }).eq('id', investigationId)

    // Process each document independently
    const results = await Promise.allSettled(
      docsWithFiles.map(doc => {
        const file = getPendingFile(doc.id)!
        return processDocument(doc.id, file, user.id, supabase, (p) => updateDocProgress(p.documentId, p), abortRef.current?.signal)
      })
    )

    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.status === 'completed')
    const failed = results.filter(r => r.status === 'fulfilled' && (r.value as { status: string }).status === 'failed')

    // Run comparison engine if we have successful documents
    if (succeeded.length >= 2) {
      try {
        const { data: allFields } = await supabase.from('extracted_fields').select('*').eq('user_id', user.id)
          .in('document_id', docsWithFiles.map(d => d.id))

        const { data: allDocs } = await supabase.from('documents').select('*').eq('investigation_id', investigationId)

        const findings = runComparisonEngine({
          investigationId,
          userId: user.id,
          documents: (allDocs ?? []) as Document[],
          extractedFields: (allFields ?? []) as ExtractedField[],
        })

        // Save findings + evidence
        for (const finding of findings) {
          const { data: savedFinding, error: fErr } = await supabase.from('findings').insert({
            investigation_id: investigationId,
            user_id: user.id,
            title: finding.title,
            description: finding.description,
            finding_type: finding.findingType,
            priority_score: finding.priorityScore,
            priority_level: finding.priorityLevel,
            review_status: 'needs_review',
          }).select().single()

          if (!fErr && savedFinding) {
            const evidenceRows = finding.evidence.map(ev => ({
              finding_id: savedFinding.id,
              document_id: ev.documentId,
              user_id: user.id,
              page_number: ev.pageNumber,
              field_name: ev.fieldName,
              observed_value: ev.observedValue,
              compared_value: ev.comparedValue,
              source_excerpt: ev.sourceExcerpt,
              evidence_type: ev.evidenceType,
            }))
            if (evidenceRows.length) await supabase.from('finding_evidence').insert(evidenceRows)
          }
        }

        // Extract entities from vendor/org fields and create relationship records
        try {
          const vendorFields = (allFields ?? []).filter((f: ExtractedField) =>
            ['vendor_name', 'vendor', 'payee', 'payer', 'organization', 'company'].includes(f.field_name)
          )
          const entityMap = new Map<string, { docId: string; fieldId: string }>()
          for (const vf of vendorFields) {
            const norm = vf.field_value.toLowerCase().trim()
            if (!entityMap.has(norm)) {
              entityMap.set(norm, { docId: vf.document_id, fieldId: vf.id })
              await supabase.from('entities').insert({
                investigation_id: investigationId,
                user_id: user.id,
                entity_type: 'organization',
                display_name: vf.field_value.trim(),
                normalized_name: norm,
              }).select().single()
            }
          }
        } catch (_entityErr) {
          // Entity extraction failure must not block findings
          // eslint-disable-next-line no-console
          console.warn('Entity extraction skipped:', _entityErr)
        }

        await supabase.from('activity_logs').insert({
          user_id: user.id,
          investigation_id: investigationId,
          activity_type: 'finding_generated',
          description: `${findings.length} finding${findings.length !== 1 ? 's' : ''} generated from document comparison`,
        })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Comparison engine error:', err)
      }
    }

    const finalStatus = failed.length === 0 ? 'completed' : succeeded.length > 0 ? 'completed_with_warnings' : 'failed'
    await supabase.from('investigations').update({ status: finalStatus }).eq('id', investigationId)

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      investigation_id: investigationId,
      activity_type: 'document_processing_completed',
      description: `Document processing complete: ${succeeded.length} succeeded, ${failed.length} failed`,
    })

    setProcessing(false)
    addToast({
      type: finalStatus === 'completed' ? 'success' : 'warning',
      title: finalStatus === 'completed' ? 'Processing complete' : 'Processing complete with warnings',
      message: `${succeeded.length} document${succeeded.length !== 1 ? 's' : ''} processed.`,
    })

    if (succeeded.length > 0) {
      router.push(`/investigations/${investigationId}/findings`)
    }
  }

  function cancelProcessing() {
    abortRef.current?.abort()
    setProcessing(false)
    addToast({ type: 'info', title: 'Processing cancelled' })
  }

  const pendingCount = documents.filter(d => d.processing_status === 'pending').length
  const failedCount = documents.filter(d => d.processing_status === 'failed').length
  const canProcess = !processing && (pendingCount > 0 || failedCount > 0)

  if (loading) return <div className="max-w-4xl mx-auto"><div className="h-64 bg-p-surface border border-p-border rounded-p-lg animate-pulse" /></div>

  const isDemo = isDemoMode() && investigationId === DEMO_INVESTIGATION_ID

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {isDemo && (
        <div className="flex items-start gap-2.5 bg-amber-900/20 border border-amber-700/40 text-amber-300 text-sm rounded-p px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Demo Mode — Read-only document view</p>
            <p className="text-xs mt-0.5">These are sample documents. Upload and processing require Supabase credentials. Findings for the ₹35,000 discrepancy are pre-seeded in the demo investigation.</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/investigations/${investigationId}`} className="p-1.5 rounded-p text-p-text-3 hover:text-p-text hover:bg-p-surface-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-p-text">Documents</h1>
            <p className="text-p-text-3 text-xs">{invName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isDemo && processing ? (
            <button onClick={cancelProcessing} className="flex items-center gap-2 border border-p-border text-p-text-2 hover:bg-p-surface-2 text-sm font-medium px-3 py-2 rounded-p transition-colors">
              <X className="w-4 h-4" /> Cancel
            </button>
          ) : (
            !isDemo && canProcess && (
              <button onClick={startProcessing} className="flex items-center gap-2 bg-p-crimson hover:bg-p-crimson-2 text-white text-sm font-semibold px-4 py-2 rounded-p transition-colors">
                <Play className="w-4 h-4" /> Process {pendingCount + failedCount} Document{pendingCount + failedCount !== 1 ? 's' : ''}
              </button>
            )
          )}
        </div>
      </div>

      {/* File availability warning */}
      {pendingDocIds.length === 0 && pendingCount > 0 && (
        <div className="flex items-start gap-2.5 bg-p-warning/20 border border-p-warning-2/40 text-p-warning-2 text-sm rounded-p px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Files not available for processing</p>
            <p className="text-xs mt-0.5">Original files are not stored after the browser session. Use the button below to re-upload them for processing.</p>
            <button onClick={() => fileInputRef.current?.click()} className="mt-2 text-xs font-medium underline hover:no-underline">Re-upload files</button>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={async e => {
              if (!e.target.files) return
              const supabase = createClient()
              const files = Array.from(e.target.files)
              for (const doc of documents.filter(d => d.processing_status === 'pending')) {
                const match = files.find(f => f.name === doc.file_name)
                if (match) {
                  const { storePendingFile: spf } = await import('@/features/documents/pendingFilesStore')
                  spf(doc.id, match)
                }
              }
              setPendingDocIds(getAllPendingDocumentIds())
              addToast({ type: 'success', title: 'Files loaded', message: 'Ready to process.' })
            }} />
          </div>
        </div>
      )}

      {/* Documents list */}
      <div className="bg-p-surface border border-p-border rounded-p-lg divide-y divide-p-border">
        {documents.length === 0 ? (
          <div className="py-12 text-center">
            <Upload className="w-8 h-8 text-p-text-3 mx-auto mb-2" />
            <p className="text-p-text-2 text-sm">No documents</p>
          </div>
        ) : documents.map(doc => {
          const prog = progress[doc.id]
          const status = prog?.status ?? doc.processing_status
          const isActive = processing && prog && !['completed', 'completed_with_warnings', 'failed', 'cancelled'].includes(status)

          return (
            <div key={doc.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="mt-0.5 shrink-0">
                    {doc.file_type === 'application/pdf' ? <FileText className="w-5 h-5 text-p-crimson" aria-hidden="true" /> : <ImageIcon className="w-5 h-5 text-p-info-2" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-p-text truncate">{doc.file_name}</span>
                      <StatusBadge status={status as never} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-p-text-3">{formatFileSize(doc.file_size)}</span>
                      {doc.page_count && <span className="text-xs text-p-text-3">{doc.page_count} pages</span>}
                      {doc.document_type && doc.document_type !== 'unknown' && (
                        <span className="text-xs text-p-text-3 capitalize">{doc.document_type.replace(/_/g, ' ')}</span>
                      )}
                    </div>
                    {isActive && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-p-info-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {prog?.stageName}
                      </div>
                    )}
                    {status === 'failed' && (prog?.error || doc.processing_error) && (
                      <div className="mt-1.5 flex items-start gap-1.5 text-xs text-p-error-2">
                        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                        {prog?.error ?? doc.processing_error}
                      </div>
                    )}
                    {status === 'completed' && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-p-success-2">
                        <CheckCircle className="w-3 h-3" /> Processed successfully
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {status === 'failed' && !processing && getPendingFile(doc.id) && (
                    <button onClick={async () => {
                      const supabase = createClient()
                      const { data: { user } } = await supabase.auth.getUser()
                      if (!user) return
                      const file = getPendingFile(doc.id)!
                      await supabase.from('documents').update({ processing_status: 'pending', processing_error: null }).eq('id', doc.id)
                      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, processing_status: 'pending' as DocumentProcessingStatus } : d))
                      addToast({ type: 'info', title: 'Document reset', message: 'Click Process to retry.' })
                    }} className="p-1.5 rounded-p text-p-text-3 hover:text-p-warning-2 hover:bg-p-warning/10 transition-colors" title="Reset for retry">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  {(status === 'completed' || status === 'completed_with_warnings') && (
                    <Link href={`/investigations/${investigationId}/documents/${doc.id}`}
                      className="p-1.5 rounded-p text-p-text-3 hover:text-p-crimson hover:bg-p-accent/10 transition-colors" title="View document">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
