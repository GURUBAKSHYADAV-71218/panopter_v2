import type { PriorityLevel, ReviewStatus, InvestigationStatus, DocumentProcessingStatus } from '@/types'

// ─── Priority badge ───────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<PriorityLevel, string> = {
  critical: 'bg-p-critical/20 text-p-critical border-p-critical/30',
  high:     'bg-p-high/20 text-p-high border-p-high/30',
  moderate: 'bg-p-moderate/20 text-p-moderate border-p-moderate/30',
  low:      'bg-p-low/20 text-p-low border-p-low/30',
}

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  critical: 'Critical',
  high:     'High',
  moderate: 'Moderate',
  low:      'Low',
}

export function PriorityBadge({ level }: { level: PriorityLevel }) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 text-xs font-semibold',
        'rounded border tracking-wide uppercase',
        PRIORITY_STYLES[level],
      ].join(' ')}
    >
      {PRIORITY_LABELS[level]}
    </span>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

type AnyStatus = ReviewStatus | InvestigationStatus | DocumentProcessingStatus

const STATUS_STYLES: Partial<Record<AnyStatus, string>> = {
  // ReviewStatus
  needs_review: 'bg-p-warning/20 text-p-warning-2 border-p-warning-2/30',
  confirmed:    'bg-p-success/20 text-p-success-2 border-p-success-2/30',
  dismissed:    'bg-p-surface-2 text-p-text-3 border-p-border',

  // InvestigationStatus
  draft:                   'bg-p-surface-2 text-p-text-2 border-p-border',
  processing:              'bg-p-info/20 text-p-info-2 border-p-info-2/30',
  completed:               'bg-p-success/20 text-p-success-2 border-p-success-2/30',
  completed_with_warnings: 'bg-p-warning/20 text-p-warning-2 border-p-warning-2/30',
  failed:                  'bg-p-error/20 text-p-error-2 border-p-error-2/30',
  archived:                'bg-p-surface-2 text-p-text-3 border-p-border',

  // DocumentProcessingStatus — reuse shared states
  pending:           'bg-p-surface-2 text-p-text-2 border-p-border',
  validating:        'bg-p-info/20 text-p-info-2 border-p-info-2/30',
  extracting_text:   'bg-p-info/20 text-p-info-2 border-p-info-2/30',
  ocr_processing:    'bg-p-info/20 text-p-info-2 border-p-info-2/30',
  classifying:       'bg-p-info/20 text-p-info-2 border-p-info-2/30',
  extracting_fields: 'bg-p-info/20 text-p-info-2 border-p-info-2/30',
  comparing:         'bg-p-info/20 text-p-info-2 border-p-info-2/30',
  cancelled:         'bg-p-surface-2 text-p-text-3 border-p-border',
}

const STATUS_LABELS: Partial<Record<AnyStatus, string>> = {
  needs_review:            'Needs Review',
  confirmed:               'Confirmed',
  dismissed:               'Dismissed',
  draft:                   'Draft',
  processing:              'Processing',
  completed:               'Completed',
  completed_with_warnings: 'Warnings',
  failed:                  'Failed',
  archived:                'Archived',
  pending:                 'Pending',
  validating:              'Validating',
  extracting_text:         'Extracting',
  ocr_processing:          'OCR',
  classifying:             'Classifying',
  extracting_fields:       'Extracting Fields',
  comparing:               'Comparing',
  cancelled:               'Cancelled',
}

export function StatusBadge({
  status,
}: {
  status: ReviewStatus | InvestigationStatus | DocumentProcessingStatus
}) {
  const style =
    STATUS_STYLES[status] ?? 'bg-p-surface-2 text-p-text-2 border-p-border'
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, ' ')

  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 text-xs font-medium',
        'rounded border capitalize',
        style,
      ].join(' ')}
    >
      {label}
    </span>
  )
}
