'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ArrowLeft, Calendar, AlertTriangle, FileText } from 'lucide-react'
import type { ExtractedField, Document } from '@/types'
import { isDemoMode, DEMO_INVESTIGATION_ID, DEMO_INVESTIGATION, DEMO_DOCUMENTS } from '@/lib/demo/demoData'

const DATE_FIELD_NAMES = [
  'document_date', 'date', 'invoice_date', 'po_date', 'receipt_date',
  'due_date', 'payment_date', 'delivery_date', 'order_date', 'issue_date',
]

function parseDate(value: string): Date | null {
  if (!value) return null
  // Try ISO
  let d = new Date(value)
  if (!isNaN(d.getTime())) return d
  // DD MMM YYYY
  const dmy = value.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/)
  if (dmy) {
    d = new Date(`${dmy[2]} ${dmy[1]}, ${dmy[3]}`)
    if (!isNaN(d.getTime())) return d
  }
  // DD/MM/YYYY or DD-MM-YYYY
  const parts = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (parts) {
    d = new Date(`${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

interface TimelineEvent {
  date: Date
  dateStr: string
  fieldName: string
  fieldValue: string
  excerpt: string | null
  documentId: string
  documentName: string
  documentType: string
  pageNumber: number | null
  flagged: boolean
  flagReason: string | null
}

export default function TimelinePage() {
  const params = useParams()
  const investigationId = params.investigationId as string
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [invName, setInvName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showFlagged, setShowFlagged] = useState(false)

  const load = useCallback(async () => {
    // Demo mode: provide pre-seeded timeline events
    if (isDemoMode() && investigationId === DEMO_INVESTIGATION_ID) {
      setInvName(DEMO_INVESTIGATION.name)
      const demoEvents: TimelineEvent[] = [
        {
          date: new Date('2026-10-12T00:00:00Z'),
          dateStr: '12 Oct 2026',
          fieldName: 'po_date',
          fieldValue: '12 Oct 2026',
          excerpt: 'Date: 12 Oct 2026',
          documentId: DEMO_DOCUMENTS[0].id,
          documentName: DEMO_DOCUMENTS[0].file_name,
          documentType: 'purchase_order',
          pageNumber: 1,
          flagged: false,
          flagReason: null,
        },
        {
          date: new Date('2026-10-13T00:00:00Z'),
          dateStr: '13 Oct 2026',
          fieldName: 'invoice_date',
          fieldValue: '13 Oct 2026',
          excerpt: 'Invoice Date: 13 Oct 2026',
          documentId: DEMO_DOCUMENTS[1].id,
          documentName: DEMO_DOCUMENTS[1].file_name,
          documentType: 'invoice',
          pageNumber: 1,
          flagged: false,
          flagReason: null,
        },
        {
          date: new Date('2026-10-14T00:00:00Z'),
          dateStr: '14 Oct 2026',
          fieldName: 'receipt_date',
          fieldValue: '14 Oct 2026',
          excerpt: 'Date Received: 14 Oct 2026',
          documentId: DEMO_DOCUMENTS[2].id,
          documentName: DEMO_DOCUMENTS[2].file_name,
          documentType: 'receipt',
          pageNumber: 1,
          flagged: false,
          flagReason: null,
        },
      ]
      setEvents(demoEvents)
      setLoading(false)
      return
    }

    const supabase = createClient()
    const [{ data: inv }, { data: docs }] = await Promise.all([
      supabase.from('investigations').select('name').eq('id', investigationId).single(),
      supabase.from('documents').select('id, file_name, document_type').eq('investigation_id', investigationId),
    ])
    setInvName(inv?.name ?? '')

    const docList = (docs ?? []) as Document[]
    const docMap = Object.fromEntries(docList.map(d => [d.id, d]))
    const docIds = docList.map(d => d.id)

    if (docIds.length === 0) { setLoading(false); return }

    const { data: fields } = await supabase
      .from('extracted_fields')
      .select('*')
      .in('document_id', docIds)
      .in('field_name', DATE_FIELD_NAMES)

    const rawFields = (fields ?? []) as ExtractedField[]

    // Parse and sort
    const rawParsed: TimelineEvent[] = []
    for (const f of rawFields) {
      const date = parseDate(f.field_value)
      if (!date) continue
      const doc = docMap[f.document_id]
      rawParsed.push({
        date,
        dateStr: f.field_value,
        fieldName: f.field_name,
        fieldValue: f.field_value,
        excerpt: f.source_excerpt,
        documentId: f.document_id,
        documentName: doc?.file_name ?? f.document_id,
        documentType: doc?.document_type ?? '',
        pageNumber: f.page_number,
        flagged: false,
        flagReason: null,
      })
    }

    const parsed = rawParsed.sort((a, b) => a.date.getTime() - b.date.getTime())

    // Flag issues
    const invoiceEvents = parsed.filter(e => e.documentType === 'invoice')
    const poEvents = parsed.filter(e => e.documentType === 'purchase_order')
    const now = new Date()

    // Invoice before PO
    if (invoiceEvents.length > 0 && poEvents.length > 0) {
      const earliestPO = poEvents[0].date
      invoiceEvents.forEach(e => {
        if (e.date < earliestPO) {
          e.flagged = true
          e.flagReason = 'Invoice date precedes Purchase Order date — potential chronology issue'
        }
      })
    }

    // Future dates
    parsed.forEach(e => {
      if (e.date > now) {
        e.flagged = true
        e.flagReason = 'Date is in the future — possible error or post-dated document'
      }
    })

    setEvents(parsed)
    setLoading(false)
  }, [investigationId])

  useEffect(() => { load() }, [load])

  const displayed = showFlagged ? events.filter(e => e.flagged) : events
  const flaggedCount = events.filter(e => e.flagged).length

  if (loading) return <PageLoader />

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/investigations/${investigationId}`} className="text-p-text-3 hover:text-p-text transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="text-p-text-3 text-xs mb-0.5">{invName}</div>
          <h1 className="text-p-text text-xl font-bold">Document Timeline</h1>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-12 h-12" />}
          title="No date data found"
          description="Process your documents first. Date fields extracted from documents will appear here."
          action={{ label: 'Go to Documents', href: `/investigations/${investigationId}/documents` }}
        />
      ) : (
        <>
          {/* Filter bar */}
          <div className="flex items-center justify-between">
            <div className="text-p-text-3 text-sm">
              {events.length} date event{events.length !== 1 ? 's' : ''} found
              {flaggedCount > 0 && (
                <span className="ml-2 text-p-warning-2">· {flaggedCount} flagged</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFlagged(false)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${!showFlagged ? 'bg-p-crimson text-white' : 'bg-p-surface text-p-text-2 border border-p-border hover:border-p-crimson/50'}`}
              >
                All Events
              </button>
              <button
                onClick={() => setShowFlagged(true)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${showFlagged ? 'bg-p-warning/80 text-white' : 'bg-p-surface text-p-text-2 border border-p-border hover:border-p-warning/50'}`}
              >
                Flagged Only ({flaggedCount})
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-p-border" />

            <div className="space-y-6 pl-14">
              {displayed.length === 0 ? (
                <p className="text-p-text-3 text-sm">No flagged events.</p>
              ) : displayed.map((event, i) => (
                <div key={`${event.documentId}-${event.fieldName}-${i}`} className="relative">
                  {/* Circle indicator */}
                  <div className={`absolute -left-9 top-1 w-4 h-4 rounded-full border-2 border-p-bg
                    ${event.flagged ? 'bg-p-warning' : 'bg-p-crimson'}`}
                  />

                  <div className={`bg-p-surface border rounded-xl p-4 space-y-2.5
                    ${event.flagged ? 'border-p-warning/40' : 'border-p-border'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-p-text font-semibold">
                          {event.date.toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })}
                        </div>
                        <div className="text-p-text-3 text-xs mt-0.5 capitalize">
                          {event.fieldName.replace(/_/g, ' ')} · {event.fieldValue}
                        </div>
                      </div>
                      {event.flagged && (
                        <div className="flex items-center gap-1.5 text-xs text-p-warning-2 bg-p-warning/10 border border-p-warning/30 rounded-lg px-2.5 py-1 shrink-0">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Flagged
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-p-text-2">
                      <FileText className="w-3.5 h-3.5 text-p-text-3 shrink-0" />
                      <Link
                        href={`/investigations/${investigationId}/documents/${event.documentId}`}
                        className="hover:text-p-crimson transition-colors"
                      >
                        {event.documentName}
                      </Link>
                      {event.pageNumber !== null && (
                        <span className="text-p-text-3">· Page {event.pageNumber}</span>
                      )}
                    </div>

                    {event.flagReason && (
                      <p className="text-p-warning-2 text-xs bg-p-warning/10 rounded-lg px-3 py-1.5">
                        ⚠ {event.flagReason}
                      </p>
                    )}

                    {event.excerpt && (
                      <div className="font-mono text-xs text-p-text-3 bg-p-bg rounded-lg px-3 py-2 leading-relaxed">
                        {event.excerpt.slice(0, 200)}{event.excerpt.length > 200 ? '…' : ''}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
