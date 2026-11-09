'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/Badge'
import { processDocument } from '@/features/documents/processingPipeline'
import { getPendingFile, getAllPendingDocumentIds, storePendingFile } from '@/features/documents/pendingFilesStore'
import { runComparisonEngine } from '@/features/comparison/engine'
import { useToast } from '@/hooks/useToast'
import {
  ArrowLeft, FileText, Play, RotateCcw, X, Upload, AlertCircle, CheckCircle,
  Loader2, ChevronRight, Image as ImageIcon
} from 'lucide-react'
import type { Document, DocumentProcessingStatus, ExtractedField } from '@/types'
import { formatFileSize } from '@/lib/validation/fileValidation'
import { investigationsStore, documentsStore, extractedFieldsStore, findingsStore, findingEvidenceStore, entitiesStore, activityLogsStore } from '@/lib/store'

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
    const inv = investigationsStore.get(investigationId)
    setInvName(inv?.name ?? '')
    setDocuments(documentsStore.list(investigationId))
    setPendingDocIds(getAllPendingDocumentIds())
    setLoading(false)
  }, [investigationId])

  const updateDocProgress = useCallback((documentId: string, prog: DocProgress) => {
    setProgress(prev => ({ ...prev, [documentId]: prog }))
    setDocuments(prev => prev.map(d =>
      d.id === documentId ? { ...d, processing_status: prog.status } : d
    ))
  }, [])

  async function startProcessing() {
    const pendingDocs = documents.filter(d => d.processing_status === 'pending' || d.processing_status === 'failed')
    if (pendingDocs.length === 0) { addToast({ type: 'info', title: 'Nothing to process' }); return }

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

    investigationsStore.update(investigationId, { status: 'processing' })

    // Process each document
    const results = await Promise.allSettled(
      docsWithFiles.map(doc => {
        const file = getPendingFile(doc.id)!
        return processDocument(doc.id, file, (p) => updateDocProgress(p.documentId, p), abortRef.current?.signal)
      })
    )

    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.status === 'completed')
    const failed = results.filter(r => r.status === 'fulfilled' && (r.value as { status: string }).status === 'failed')

    // Run comparison engine if we have >= 2 successful documents
    if (succeeded.length >= 2) {
      try {
        const allFields = extractedFieldsStore.listForInvestigation(investigationId)
        const allDocs = documentsStore.list(investigationId)

        const findings = runComparisonEngine({
          investigationId,
          userId: 'local',
          documents: allDocs as Document[],
          extractedFields: allFields as ExtractedField[],
        })

        // Save findings + evidence to local store
        for (const finding of findings) {
          const savedFindings = findingsStore.insertBatch([{
            investigation_id: investigationId,
            title: finding.title,
            description: finding.description,
            finding_type: finding.findingType,
            priority_score: finding.priorityScore,
            priority_level: finding.priorityLevel,
            review_status: 'needs_review',
          }])

          const savedFinding = savedFindings[0]
          if (savedFinding && finding.evidence.length > 0) {
            findingEvidenceStore.insertBatch(finding.evidence.map(ev => ({
              finding_id: savedFinding.id,
              document_id: ev.documentId,
              page_number: ev.pageNumber,
              field_name: ev.fieldName,
              observed_value: ev.observedValue,
              compared_value: ev.comparedValue,
              source_excerpt: ev.sourceExcerpt,
              evidence_type: ev.evidenceType,
            })))
          }
        }

        // Extract entities from vendor/org fields
        try {
          const vendorFields = allFields.filter((f: ExtractedField) =>
            ['vendor_name', 'vendor', 'payee', 'payer', 'organization', 'company'].includes(f.field_name)
          )
          for (const vf of vendorFields) {
            const norm = vf.field_value.toLowerCase().trim()
            const existing = entitiesStore.findByNormalizedName(investigationId, norm)
            if (!existing) {
              entitiesStore.create({
                investigationId,
                entityType: 'organization',
                displayName: vf.field_value.trim(),
                normalizedName: norm,
              })
            }
          }
        } catch (_entityErr) {
          // eslint-disable-next-line no-console
          console.warn('Entity extraction skipped:', _entityErr)
        }

        activityLogsStore.add({
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
    investigationsStore.update(investigationId, { status: finalStatus })

    activityLogsStore.add({
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
          {processing ? (
            <button onClick={cancelProcessing} className="flex items-center gap-2 border border-p-border text-p-text-2 hover:bg-p-surface-2 text-sm font-medium px-3 py-2 rounded-p transition-colors">
              <X className="w-4 h-4" /> Cancel
            </button>
          ) : (
            canProcess && (
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
              const files = Array.from(e.target.files)
              for (const doc of documents.filter(d => d.processing_status === 'pending')) {
                const match = files.find(f => f.name === doc.file_name)
                if (match) storePendingFile(doc.id, match)
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
                    <button onClick={() => {
                      documentsStore.update(doc.id, { processing_status: 'pending', processing_error: null })
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
