// ─── Core Application Types ────────────────────────────────────────────────

export type UUID = string

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ─── Enums ─────────────────────────────────────────────────────────────────

export type InvestigationStatus =
  | 'draft'
  | 'processing'
  | 'completed'
  | 'completed_with_warnings'
  | 'failed'
  | 'archived'

export type DocumentProcessingStatus =
  | 'pending'
  | 'validating'
  | 'extracting_text'
  | 'ocr_processing'
  | 'classifying'
  | 'extracting_fields'
  | 'comparing'
  | 'completed'
  | 'completed_with_warnings'
  | 'failed'
  | 'cancelled'

export type DocumentType =
  | 'invoice'
  | 'purchase_order'
  | 'receipt'
  | 'bank_statement'
  | 'agreement'
  | 'general'
  | 'unknown'

export type ExtractionSource = 'embedded_text' | 'ocr' | 'manual'

export type FindingType =
  | 'amount_mismatch'
  | 'date_inconsistency'
  | 'vendor_mismatch'
  | 'missing_field'
  | 'duplicate_reference'
  | 'reference_mismatch'
  | 'account_mismatch'
  | 'chronology_inconsistency'
  | 'general_inconsistency'

export type PriorityLevel = 'low' | 'moderate' | 'high' | 'critical'

export type ReviewStatus = 'needs_review' | 'confirmed' | 'dismissed'

export type EntityType =
  | 'person'
  | 'organization'
  | 'account_reference'
  | 'transaction_reference'
  | 'document'

export type RelationshipType =
  | 'references'
  | 'matches_reference'
  | 'shared_identifier'
  | 'vendor_to_document'
  | 'person_to_document'

export type ActivityType =
  | 'investigation_created'
  | 'document_added'
  | 'document_processing_completed'
  | 'document_processing_failed'
  | 'finding_generated'
  | 'finding_reviewed'
  | 'finding_bookmarked'
  | 'note_added'
  | 'note_updated'
  | 'report_generated'

// ─── Database Record Types ──────────────────────────────────────────────────

export interface Profile {
  id: UUID
  full_name: string | null
  created_at: string
  updated_at: string
}

export interface Investigation {
  id: UUID
  user_id: UUID
  name: string
  description: string | null
  status: InvestigationStatus
  created_at: string
  updated_at: string
}

export interface Document {
  id: UUID
  investigation_id: UUID
  user_id: UUID
  file_name: string
  file_type: string
  file_size: number
  file_hash: string | null
  processing_status: DocumentProcessingStatus
  document_type: DocumentType
  extraction_source: ExtractionSource | null
  page_count: number | null
  processing_error: string | null
  created_at: string
  updated_at: string
}

export interface ExtractedField {
  id: UUID
  document_id: UUID
  user_id: UUID
  field_name: string
  field_value: string
  normalized_value: string | null
  page_number: number | null
  source_excerpt: string | null
  source_type: ExtractionSource
  confidence: number | null
  created_at: string
  updated_at: string
}

export interface Finding {
  id: UUID
  investigation_id: UUID
  user_id: UUID
  title: string
  description: string
  finding_type: FindingType
  priority_score: number
  priority_level: PriorityLevel
  review_status: ReviewStatus
  created_at: string
  updated_at: string
}

export interface FindingEvidence {
  id: UUID
  finding_id: UUID
  document_id: UUID
  user_id: UUID
  page_number: number | null
  field_name: string
  observed_value: string
  compared_value: string | null
  source_excerpt: string | null
  evidence_type: string
  created_at: string
}

export interface Entity {
  id: UUID
  investigation_id: UUID
  user_id: UUID
  entity_type: EntityType
  display_name: string
  normalized_name: string
  created_at: string
}

export interface EntityRelationship {
  id: UUID
  investigation_id: UUID
  user_id: UUID
  source_entity_id: UUID
  target_entity_id: UUID
  relationship_type: RelationshipType
  supporting_document_id: UUID | null
  created_at: string
}

export interface InvestigationNote {
  id: UUID
  investigation_id: UUID
  user_id: UUID
  content: string
  created_at: string
  updated_at: string
}

export interface Bookmark {
  id: UUID
  finding_id: UUID
  user_id: UUID
  created_at: string
}

export interface ReviewHistory {
  id: UUID
  finding_id: UUID
  user_id: UUID
  previous_status: ReviewStatus
  new_status: ReviewStatus
  review_note: string | null
  created_at: string
}

export interface ActivityLog {
  id: UUID
  user_id: UUID
  investigation_id: UUID | null
  activity_type: ActivityType
  description: string
  metadata: Json | null
  created_at: string
}

// ─── Application-Level Types ────────────────────────────────────────────────

export interface User {
  id: UUID
  email: string
  full_name: string | null
}

export interface InvestigationWithStats extends Investigation {
  document_count: number
  finding_count: number
  needs_review_count: number
}

export interface FindingWithEvidence extends Finding {
  evidence: FindingEvidence[]
  documents: Document[]
}

export interface EntityWithRelationships extends Entity {
  relationships: EntityRelationship[]
}

// ─── Document Processing Types ──────────────────────────────────────────────

export interface FileValidationResult {
  valid: boolean
  error?: string
  mimeType?: string
  fileSize?: number
}

export interface ProcessingStage {
  stage: DocumentProcessingStatus
  label: string
  completed: boolean
  error?: string
}

export interface ProcessingProgress {
  documentId: string
  status: DocumentProcessingStatus
  stages: ProcessingStage[]
  currentStageLabel: string
  error?: string
}

export interface ExtractedText {
  page: number
  text: string
  source: ExtractionSource
  confidence?: number
}

export interface ExtractedDocumentData {
  documentType: DocumentType
  extractedFields: RawExtractedField[]
  fullText: string
  pageTexts: ExtractedText[]
  classificationReason: string
}

export interface RawExtractedField {
  fieldName: string
  fieldValue: string
  normalizedValue: string | null
  pageNumber: number | null
  sourceExcerpt: string | null
  sourceType: ExtractionSource
  confidence: number | null
}

// ─── Comparison Engine Types ────────────────────────────────────────────────

export interface ComparisonInput {
  investigationId: UUID
  userId: UUID
  documents: Document[]
  extractedFields: ExtractedField[]
}

export interface FindingCandidate {
  ruleId: string
  title: string
  description: string
  findingType: FindingType
  priorityScore: number
  priorityLevel: PriorityLevel
  scoreContributions: ScoreContribution[]
  evidence: EvidenceCandidate[]
}

export interface ScoreContribution {
  rule: string
  points: number
  reason: string
}

export interface EvidenceCandidate {
  documentId: UUID
  pageNumber: number | null
  fieldName: string
  observedValue: string
  comparedValue: string | null
  sourceExcerpt: string | null
  evidenceType: string
}

// ─── UI State Types ─────────────────────────────────────────────────────────

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

export interface UploadedFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  hash: string | null
  hashStatus: 'pending' | 'computing' | 'done' | 'failed'
  validationStatus: 'pending' | 'valid' | 'invalid'
  validationError?: string
  isDuplicate: boolean
  duplicateOf?: string
}

export interface DashboardStats {
  totalInvestigations: number
  documentsProcessed: number
  findingsGenerated: number
  needsReviewCount: number
}

// ─── Timeline Types ─────────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string
  date: Date
  dateString: string
  description: string
  documentId: UUID
  documentName: string
  pageNumber: number | null
  sourceExcerpt: string | null
  category: 'document_date' | 'invoice_date' | 'payment_date' | 'delivery_date' | 'other'
  isInconsistency: boolean
  inconsistencyNote?: string
}

// ─── Report Types ───────────────────────────────────────────────────────────

export interface ReportData {
  investigation: Investigation
  documents: Document[]
  findings: FindingWithEvidence[]
  entities: Entity[]
  timelineEvents: TimelineEvent[]
  generatedAt: string
}

// ─── i18n Types ─────────────────────────────────────────────────────────────

export type Language = 'en' | 'hi'

export interface Translations {
  nav: {
    dashboard: string
    investigations: string
    documents: string
    findings: string
    relationships: string
    timeline: string
    reports: string
    settings: string
  }
  common: {
    loading: string
    error: string
    retry: string
    cancel: string
    save: string
    delete: string
    confirm: string
    dismiss: string
    close: string
    back: string
    next: string
    view: string
    edit: string
    search: string
    filter: string
    sort: string
    export: string
    download: string
    noData: string
    success: string
  }
  status: {
    needsReview: string
    confirmed: string
    dismissed: string
    pending: string
    processing: string
    completed: string
    failed: string
    cancelled: string
  }
  priority: {
    low: string
    moderate: string
    high: string
    critical: string
  }
}
