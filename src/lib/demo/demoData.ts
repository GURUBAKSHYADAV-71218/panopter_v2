// Demo mode — clearly labelled in-memory data
// Used when NEXT_PUBLIC_SUPABASE_URL is not configured
// All data is fictional and labelled as [DEMO]

import type { Investigation, Document, Finding, FindingEvidence } from '@/types'

export const DEMO_INVESTIGATION_ID = 'demo-inv-001'
export const DEMO_PO_ID = 'demo-doc-po'
export const DEMO_INV_DOC_ID = 'demo-doc-inv'
export const DEMO_RCPT_ID = 'demo-doc-rcpt'

export const DEMO_INVESTIGATION: Investigation = {
  id: DEMO_INVESTIGATION_ID,
  user_id: 'demo-user',
  name: '[DEMO] Vendor Payment Verification — ABC Supplies',
  description: 'Scenario A: PO ₹4,50,000 · Invoice ₹4,85,000 · Receipt ₹4,50,000. Detects ₹35,000 discrepancy.',
  status: 'completed',
  created_at: '2026-10-12T09:00:00Z',
  updated_at: '2026-10-14T16:30:00Z',
}

export const DEMO_DOCUMENTS: Document[] = [
  {
    id: DEMO_PO_ID,
    investigation_id: DEMO_INVESTIGATION_ID,
    user_id: 'demo-user',
    file_name: '[DEMO] Purchase_Order_PO-2026-104.pdf',
    file_type: 'application/pdf',
    file_size: 245000,
    file_hash: null,
    processing_status: 'completed',
    document_type: 'purchase_order',
    extraction_source: 'embedded_text',
    page_count: 4,
    processing_error: null,
    created_at: '2026-10-12T09:05:00Z',
    updated_at: '2026-10-12T09:12:00Z',
  },
  {
    id: DEMO_INV_DOC_ID,
    investigation_id: DEMO_INVESTIGATION_ID,
    user_id: 'demo-user',
    file_name: '[DEMO] Invoice_INV-2026-211.pdf',
    file_type: 'application/pdf',
    file_size: 189000,
    file_hash: null,
    processing_status: 'completed',
    document_type: 'invoice',
    extraction_source: 'embedded_text',
    page_count: 3,
    processing_error: null,
    created_at: '2026-10-13T10:20:00Z',
    updated_at: '2026-10-13T10:28:00Z',
  },
  {
    id: DEMO_RCPT_ID,
    investigation_id: DEMO_INVESTIGATION_ID,
    user_id: 'demo-user',
    file_name: '[DEMO] Delivery_Receipt_RCPT-2026-087.pdf',
    file_type: 'application/pdf',
    file_size: 95000,
    file_hash: null,
    processing_status: 'completed',
    document_type: 'receipt',
    extraction_source: 'embedded_text',
    page_count: 1,
    processing_error: null,
    created_at: '2026-10-14T14:00:00Z',
    updated_at: '2026-10-14T14:05:00Z',
  },
]

export const DEMO_FINDINGS: Finding[] = [
  {
    id: 'demo-finding-001',
    investigation_id: DEMO_INVESTIGATION_ID,
    user_id: 'demo-user',
    title: '[DEMO] Invoice amount exceeds Purchase Order total',
    description:
      'The invoice total (₹4,85,000) is ₹35,000 higher than the approved purchase order amount (₹4,50,000). The delivery receipt confirms payment of ₹4,50,000, matching the original PO. This discrepancy requires human review.',
    finding_type: 'amount_mismatch',
    priority_score: 92,
    priority_level: 'critical',
    review_status: 'needs_review',
    created_at: '2026-10-14T16:00:00Z',
    updated_at: '2026-10-14T16:00:00Z',
  },
  {
    id: 'demo-finding-002',
    investigation_id: DEMO_INVESTIGATION_ID,
    user_id: 'demo-user',
    title: '[DEMO] PO reference consistent across all documents',
    description:
      'All three documents reference PO-2026-104 consistently. This confirms document linkage.',
    finding_type: 'duplicate_reference',
    priority_score: 15,
    priority_level: 'low',
    review_status: 'confirmed',
    created_at: '2026-10-14T16:00:00Z',
    updated_at: '2026-10-14T16:00:00Z',
  },
  {
    id: 'demo-finding-003',
    investigation_id: DEMO_INVESTIGATION_ID,
    user_id: 'demo-user',
    title: '[DEMO] Document date sequence is consistent',
    description: 'PO (12 Oct), Invoice (13 Oct), and Receipt (14 Oct) follow a logical chronological order.',
    finding_type: 'date_inconsistency',
    priority_score: 10,
    priority_level: 'low',
    review_status: 'confirmed',
    created_at: '2026-10-14T16:00:00Z',
    updated_at: '2026-10-14T16:00:00Z',
  },
]

export const DEMO_EVIDENCE: FindingEvidence[] = [
  {
    id: 'demo-ev-001',
    finding_id: 'demo-finding-001',
    document_id: DEMO_PO_ID,
    user_id: 'demo-user',
    page_number: 2,
    field_name: 'amount',
    observed_value: '₹4,50,000',
    compared_value: '₹4,85,000',
    source_excerpt: 'Grand Total: ₹4,50,000',
    evidence_type: 'primary',
    created_at: '2026-10-14T16:00:00Z',
  },
  {
    id: 'demo-ev-002',
    finding_id: 'demo-finding-001',
    document_id: DEMO_INV_DOC_ID,
    user_id: 'demo-user',
    page_number: 2,
    field_name: 'amount',
    observed_value: '₹4,85,000',
    compared_value: '₹4,50,000',
    source_excerpt: 'Invoice Total: ₹4,85,000',
    evidence_type: 'primary',
    created_at: '2026-10-14T16:00:00Z',
  },
  {
    id: 'demo-ev-003',
    finding_id: 'demo-finding-001',
    document_id: DEMO_RCPT_ID,
    user_id: 'demo-user',
    page_number: 1,
    field_name: 'amount',
    observed_value: '₹4,50,000',
    compared_value: null,
    source_excerpt: 'Payment Received: ₹4,50,000',
    evidence_type: 'corroborating',
    created_at: '2026-10-14T16:00:00Z',
  },
]

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !url || url === 'your-project-url' || url.includes('placeholder')
}
