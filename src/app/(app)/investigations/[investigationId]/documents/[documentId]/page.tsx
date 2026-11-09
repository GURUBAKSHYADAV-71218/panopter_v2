'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/Badge'
import { ArrowLeft, FileText } from 'lucide-react'
import type { Document, ExtractedField } from '@/types'
import { formatFileSize } from '@/lib/validation/fileValidation'
import { getPendingFile } from '@/features/documents/pendingFilesStore'
import { documentsStore, extractedFieldsStore } from '@/lib/store'

// Demo extracted fields for each document type
const DEMO_FIELDS: Record<string, { field_name: string; field_value: string; page_number: number; source_excerpt: string | null }[]> = {
  'demo-doc-po': [
    { field_name: 'po_number', field_value: 'PO-2026-104', page_number: 1, source_excerpt: 'PO Number: PO-2026-104' },
    { field_name: 'vendor_name', field_value: 'ABC Supplies Pvt. Ltd.', page_number: 1, source_excerpt: 'Vendor: ABC Supplies Pvt. Ltd.' },
    { field_name: 'po_date', field_value: '12 Oct 2026', page_number: 1, source_excerpt: 'Date: 12 Oct 2026' },
    { field_name: 'total_amount', field_value: '₹4,50,000', page_number: 2, source_excerpt: 'Grand Total: ₹4,50,000' },
    { field_name: 'description', field_value: 'Consulting Services', page_number: 2, source_excerpt: 'Description: Consulting Services' },
  ],
  'demo-doc-inv': [
    { field_name: 'invoice_number', field_value: 'INV-2026-211', page_number: 1, source_excerpt: 'Invoice No: INV-2026-211' },
    { field_name: 'vendor_name', field_value: 'ABC Supplies Pvt. Ltd.', page_number: 1, source_excerpt: 'From: ABC Supplies Pvt. Ltd.' },
    { field_name: 'po_reference', field_value: 'PO-2026-104', page_number: 1, source_excerpt: 'Ref PO: PO-2026-104' },
    { field_name: 'invoice_date', field_value: '13 Oct 2026', page_number: 1, source_excerpt: 'Invoice Date: 13 Oct 2026' },
    { field_name: 'total_amount', field_value: '₹4,85,000', page_number: 2, source_excerpt: 'Invoice Total: ₹4,85,000' },
  ],
  'demo-doc-rcpt': [
    { field_name: 'receipt_number', field_value: 'RCPT-2026-087', page_number: 1, source_excerpt: 'Receipt No: RCPT-2026-087' },
    { field_name: 'vendor_name', field_value: 'ABC Supplies Pvt. Ltd.', page_number: 1, source_excerpt: 'Received from: ABC Supplies Pvt. Ltd.' },
    { field_name: 'po_reference', field_value: 'PO-2026-104', page_number: 1, source_excerpt: 'PO Reference: PO-2026-104' },
    { field_name: 'receipt_date', field_value: '14 Oct 2026', page_number: 1, source_excerpt: 'Date: 14 Oct 2026' },
    { field_name: 'total_amount', field_value: '₹4,50,000', page_number: 1, source_excerpt: 'Payment Received: ₹4,50,000' },
  ],
}

export default function DocumentDetailPage() {
  const params = useParams()
  const investigationId = params.investigationId as string
  const documentId = params.documentId as string

  const [doc, setDoc] = useState<Document | null>(null)
  const [fields, setFields] = useState<ExtractedField[]>([])
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [fileAvailable, setFileAvailable] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const imageUrlRef = useRef<string | null>(null)

  useEffect(() => {
    const document = documentsStore.get(documentId)
    setDoc(document)
    setFields(extractedFieldsStore.list(documentId))
    setDocs(documentsStore.list(investigationId))

    const file = getPendingFile(documentId)
    if (file) {
      setFileAvailable(true)
      if (file.type !== 'application/pdf') {
        const url = URL.createObjectURL(file)
        imageUrlRef.current = url
        setImageUrl(url)
      }
    }
    setLoading(false)
    return () => { if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current) }
  }, [documentId, investigationId])

  if (loading) return <div className="h-96 bg-p-surface border border-p-border rounded-p-lg animate-pulse" />
  if (!doc) return <div className="text-center py-20 text-p-text-3">Document not found</div>

  const fieldGroups: Record<string, ExtractedField[]> = {}
  for (const f of fields) {
    if (!fieldGroups[f.field_name]) fieldGroups[f.field_name] = []
    fieldGroups[f.field_name].push(f)
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0 -mx-6 -mt-6">
      {/* Left: document list */}
      <div className="w-56 shrink-0 bg-p-sidebar border-r border-p-border flex flex-col overflow-hidden">
        <div className="px-3 py-3 border-b border-p-border">
          <Link href={`/investigations/${investigationId}/documents`} className="flex items-center gap-1.5 text-xs text-p-text-3 hover:text-p-text transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {docs.map(d => (
            <Link key={d.id} href={`/investigations/${investigationId}/documents/${d.id}`}
              className={`flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${d.id === documentId ? 'bg-p-accent/30 text-p-text border-l-2 border-p-crimson' : 'text-p-text-2 hover:bg-p-surface-2'}`}>
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{d.file_name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Center: document viewer */}
      <div className="flex-1 flex flex-col overflow-hidden bg-p-bg-mid">
        <div className="px-4 py-3 border-b border-p-border flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-p-crimson shrink-0" />
            <span className="text-sm font-medium text-p-text truncate">{doc.file_name}</span>
            <StatusBadge status={doc.processing_status as never} />
          </div>
          <button onClick={() => setRightPanelOpen(v => !v)} className="text-xs text-p-text-3 hover:text-p-text transition-colors px-2 py-1 rounded-p hover:bg-p-surface-2">
            {rightPanelOpen ? 'Hide' : 'Show'} Info
          </button>
        </div>
        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
          {!fileAvailable ? (
            <div className="text-center max-w-sm">
              <FileText className="w-12 h-12 text-p-text-3 mx-auto mb-3" />
              <p className="text-p-text-2 font-medium">File not available</p>
              <p className="text-p-text-3 text-sm mt-1">The original file is no longer in browser memory. Document metadata and extracted fields are still available in the right panel.</p>
            </div>
          ) : imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={doc.file_name} className="max-w-full max-h-full object-contain rounded shadow-p-md" />
          ) : (
            <div className="text-center">
              <FileText className="w-10 h-10 text-p-crimson mx-auto mb-2" />
              <p className="text-p-text-2 text-sm">PDF viewer</p>
              <p className="text-p-text-3 text-xs mt-1">Extracted content is shown in the right panel.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: extracted info */}
      {rightPanelOpen && (
        <div className="w-80 shrink-0 bg-p-surface border-l border-p-border flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-p-border">
            <h3 className="text-sm font-semibold text-p-text">Extracted Information</h3>
            <p className="text-xs text-p-text-3 mt-0.5 capitalize">{doc.document_type?.replace(/_/g, ' ')} · {doc.extraction_source?.replace(/_/g, ' ') ?? '—'}</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {Object.keys(fieldGroups).length === 0 ? (
              <p className="text-xs text-p-text-3 text-center pt-4">No fields extracted from this document.</p>
            ) : (
              Object.entries(fieldGroups).map(([fieldName, fieldValues]) => (
                <div key={fieldName}>
                  <p className="text-xs font-semibold text-p-text-3 uppercase tracking-wide mb-1.5">{fieldName.replace(/_/g, ' ')}</p>
                  {fieldValues.slice(0, 2).map(fv => (
                    <div key={fv.id} className="bg-p-bg-mid border border-p-border rounded-p p-2.5 mb-1.5">
                      <p className="text-sm text-p-text font-medium">{fv.field_value}</p>
                      {fv.normalized_value && fv.normalized_value !== fv.field_value && (
                        <p className="text-xs text-p-text-3 mt-0.5">Normalized: {fv.normalized_value}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {fv.page_number && <span className="text-xs text-p-text-3">p.{fv.page_number}</span>}
                        <span className={`text-xs px-1.5 py-0.5 rounded ${fv.source_type === 'ocr' ? 'bg-p-warning/20 text-p-warning-2' : 'bg-p-success/20 text-p-success-2'}`}>
                          {fv.source_type === 'ocr' ? 'OCR' : 'Text'}
                        </span>
                      </div>
                      {fv.source_excerpt && (
                        <p className="text-xs text-p-text-3 mt-1 italic border-l-2 border-p-border pl-2">"{fv.source_excerpt.slice(0, 80)}"</p>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
