/**
 * Panopter Local Store — localStorage-backed data persistence.
 * Replaces Supabase for all data operations. No authentication required.
 */

import type {
  Investigation,
  Document,
  ExtractedField,
  Finding,
  FindingEvidence,
  Entity,
  EntityRelationship,
  InvestigationNote,
  ActivityLog,
  Bookmark,
  ReviewHistory,
  InvestigationStatus,
  DocumentProcessingStatus,
  DocumentType,
  ExtractionSource,
  FindingType,
  PriorityLevel,
  ReviewStatus,
  EntityType,
  RelationshipType,
  ActivityType,
  Json,
} from '@/types'
import { DEMO_INVESTIGATION, DEMO_DOCUMENTS, DEMO_FINDINGS, DEMO_EVIDENCE } from '@/lib/demo/demoData'

// ─── Storage keys ──────────────────────────────────────────────────────────────

const KEYS = {
  investigations: 'panopter:investigations',
  documents: 'panopter:documents',
  extractedFields: 'panopter:extracted_fields',
  findings: 'panopter:findings',
  findingEvidence: 'panopter:finding_evidence',
  entities: 'panopter:entities',
  entityRelationships: 'panopter:entity_relationships',
  investigationNotes: 'panopter:investigation_notes',
  activityLogs: 'panopter:activity_logs',
  bookmarks: 'panopter:bookmarks',
  reviewHistory: 'panopter:review_history',
} as const

// ─── Helpers ───────────────────────────────────────────────────────────────────

function readList<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    return JSON.parse(raw) as T[]
  } catch {
    return []
  }
}

function writeList<T>(key: string, list: T[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // Ignore quota errors
  }
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function now(): string {
  return new Date().toISOString()
}

// ─── Seed — ensure demo data is always present ─────────────────────────────────

function ensureSeeded(): void {
  if (typeof window === 'undefined') return
  const existing = readList<Investigation>(KEYS.investigations)
  const hasDemo = existing.some(i => i.id === DEMO_INVESTIGATION.id)
  if (!hasDemo) {
    writeList(KEYS.investigations, [DEMO_INVESTIGATION, ...existing])
    const existingDocs = readList<Document>(KEYS.documents)
    writeList(KEYS.documents, [...DEMO_DOCUMENTS, ...existingDocs])
    const existingFindings = readList<Finding>(KEYS.findings)
    writeList(KEYS.findings, [...DEMO_FINDINGS, ...existingFindings])
    const existingEvidence = readList<FindingEvidence>(KEYS.findingEvidence)
    writeList(KEYS.findingEvidence, [...DEMO_EVIDENCE, ...existingEvidence])
  }
}

// ─── Investigations ────────────────────────────────────────────────────────────

export const investigationsStore = {
  list(): Investigation[] {
    ensureSeeded()
    return readList<Investigation>(KEYS.investigations).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  },

  get(id: string): Investigation | null {
    ensureSeeded()
    return readList<Investigation>(KEYS.investigations).find(i => i.id === id) ?? null
  },

  create(data: { name: string; description?: string }): Investigation {
    ensureSeeded()
    const inv: Investigation = {
      id: uuid(),
      user_id: 'local',
      name: data.name,
      description: data.description ?? null,
      status: 'draft',
      created_at: now(),
      updated_at: now(),
    }
    const list = readList<Investigation>(KEYS.investigations)
    writeList(KEYS.investigations, [inv, ...list])
    activityLogsStore.add({
      investigation_id: inv.id,
      activity_type: 'investigation_created',
      description: `Investigation created: ${inv.name}`,
    })
    return inv
  },

  update(id: string, data: Partial<Pick<Investigation, 'name' | 'description' | 'status'>>): Investigation | null {
    const list = readList<Investigation>(KEYS.investigations)
    const idx = list.findIndex(i => i.id === id)
    if (idx === -1) return null
    list[idx] = { ...list[idx], ...data, updated_at: now() }
    writeList(KEYS.investigations, list)
    return list[idx]
  },

  delete(id: string): void {
    writeList(KEYS.investigations, readList<Investigation>(KEYS.investigations).filter(i => i.id !== id))
    // Cascade delete
    writeList(KEYS.documents, readList<Document>(KEYS.documents).filter(d => d.investigation_id !== id))
    const removedDocIds = readList<Document>(KEYS.documents).filter(d => d.investigation_id !== id).map(d => d.id)
    writeList(KEYS.extractedFields, readList<ExtractedField>(KEYS.extractedFields).filter(f => !removedDocIds.includes(f.document_id)))
    writeList(KEYS.findings, readList<Finding>(KEYS.findings).filter(f => f.investigation_id !== id))
    writeList(KEYS.findingEvidence, readList<FindingEvidence>(KEYS.findingEvidence).filter(() => true))
    writeList(KEYS.investigationNotes, readList<InvestigationNote>(KEYS.investigationNotes).filter(n => n.investigation_id !== id))
    writeList(KEYS.activityLogs, readList<ActivityLog>(KEYS.activityLogs).filter(a => a.investigation_id !== id))
  },

  countDocuments(id: string): number {
    return readList<Document>(KEYS.documents).filter(d => d.investigation_id === id).length
  },

  countFindings(id: string): number {
    return readList<Finding>(KEYS.findings).filter(f => f.investigation_id === id).length
  },
}

// ─── Documents ────────────────────────────────────────────────────────────────

export const documentsStore = {
  list(investigationId: string): Document[] {
    return readList<Document>(KEYS.documents)
      .filter(d => d.investigation_id === investigationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  },

  listAll(): Document[] {
    return readList<Document>(KEYS.documents).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  },

  get(id: string): Document | null {
    return readList<Document>(KEYS.documents).find(d => d.id === id) ?? null
  },

  create(data: {
    investigationId: string
    fileName: string
    fileType: string
    fileSize: number
    fileHash: string | null
  }): Document {
    const doc: Document = {
      id: uuid(),
      investigation_id: data.investigationId,
      user_id: 'local',
      file_name: data.fileName,
      file_type: data.fileType,
      file_size: data.fileSize,
      file_hash: data.fileHash,
      processing_status: 'pending',
      document_type: 'unknown',
      extraction_source: null,
      page_count: null,
      processing_error: null,
      created_at: now(),
      updated_at: now(),
    }
    const list = readList<Document>(KEYS.documents)
    writeList(KEYS.documents, [...list, doc])
    return doc
  },

  update(id: string, data: Partial<Document>): Document | null {
    const list = readList<Document>(KEYS.documents)
    const idx = list.findIndex(d => d.id === id)
    if (idx === -1) return null
    list[idx] = { ...list[idx], ...data, updated_at: now() }
    writeList(KEYS.documents, list)
    return list[idx]
  },

  findByHash(hash: string, investigationId: string): Document | null {
    return readList<Document>(KEYS.documents).find(
      d => d.file_hash === hash && d.investigation_id === investigationId
    ) ?? null
  },
}

// ─── Extracted Fields ──────────────────────────────────────────────────────────

export const extractedFieldsStore = {
  list(documentId: string): ExtractedField[] {
    return readList<ExtractedField>(KEYS.extractedFields)
      .filter(f => f.document_id === documentId)
      .sort((a, b) => (a.page_number ?? 0) - (b.page_number ?? 0))
  },

  listForInvestigation(investigationId: string): ExtractedField[] {
    const docIds = new Set(
      readList<Document>(KEYS.documents)
        .filter(d => d.investigation_id === investigationId)
        .map(d => d.id)
    )
    return readList<ExtractedField>(KEYS.extractedFields).filter(f => docIds.has(f.document_id))
  },

  insertBatch(fields: Omit<ExtractedField, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]): void {
    const existing = readList<ExtractedField>(KEYS.extractedFields)
    const newFields: ExtractedField[] = fields.map(f => ({
      ...f,
      id: uuid(),
      user_id: 'local',
      normalized_value: (f as ExtractedField).normalized_value ?? null,
      created_at: now(),
      updated_at: now(),
    }))
    writeList(KEYS.extractedFields, [...existing, ...newFields])
  },

  deleteForDocument(documentId: string): void {
    writeList(KEYS.extractedFields, readList<ExtractedField>(KEYS.extractedFields).filter(f => f.document_id !== documentId))
  },
}

// ─── Findings ─────────────────────────────────────────────────────────────────

export const findingsStore = {
  list(investigationId: string): Finding[] {
    return readList<Finding>(KEYS.findings)
      .filter(f => f.investigation_id === investigationId)
      .sort((a, b) => b.priority_score - a.priority_score)
  },

  listAll(): Finding[] {
    return readList<Finding>(KEYS.findings).sort((a, b) => b.priority_score - a.priority_score)
  },

  get(id: string): Finding | null {
    return readList<Finding>(KEYS.findings).find(f => f.id === id) ?? null
  },

  insertBatch(findings: Omit<Finding, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]): Finding[] {
    const existing = readList<Finding>(KEYS.findings)
    const newFindings: Finding[] = findings.map(f => ({
      ...f,
      id: uuid(),
      user_id: 'local',
      created_at: now(),
      updated_at: now(),
    }))
    writeList(KEYS.findings, [...existing, ...newFindings])
    return newFindings
  },

  update(id: string, data: Partial<Pick<Finding, 'review_status' | 'updated_at'>>): Finding | null {
    const list = readList<Finding>(KEYS.findings)
    const idx = list.findIndex(f => f.id === id)
    if (idx === -1) return null
    list[idx] = { ...list[idx], ...data, updated_at: now() }
    writeList(KEYS.findings, list)
    return list[idx]
  },

  deleteForInvestigation(investigationId: string): void {
    writeList(KEYS.findings, readList<Finding>(KEYS.findings).filter(f => f.investigation_id !== investigationId))
  },
}

// ─── Finding Evidence ──────────────────────────────────────────────────────────

export const findingEvidenceStore = {
  list(findingId: string): FindingEvidence[] {
    return readList<FindingEvidence>(KEYS.findingEvidence).filter(e => e.finding_id === findingId)
  },

  listForFindings(findingIds: string[]): FindingEvidence[] {
    const ids = new Set(findingIds)
    return readList<FindingEvidence>(KEYS.findingEvidence).filter(e => ids.has(e.finding_id))
  },

  insertBatch(evidence: Omit<FindingEvidence, 'id' | 'user_id' | 'created_at'>[]): void {
    const existing = readList<FindingEvidence>(KEYS.findingEvidence)
    const newEvidence: FindingEvidence[] = evidence.map(e => ({
      ...e,
      id: uuid(),
      user_id: 'local',
      created_at: now(),
    }))
    writeList(KEYS.findingEvidence, [...existing, ...newEvidence])
  },
}

// ─── Entities ─────────────────────────────────────────────────────────────────

export const entitiesStore = {
  list(investigationId: string): Entity[] {
    return readList<Entity>(KEYS.entities).filter(e => e.investigation_id === investigationId)
  },

  findByNormalizedName(investigationId: string, normalizedName: string): Entity | null {
    return readList<Entity>(KEYS.entities).find(
      e => e.investigation_id === investigationId && e.normalized_name === normalizedName
    ) ?? null
  },

  create(data: { investigationId: string; entityType: EntityType; displayName: string; normalizedName: string }): Entity {
    const entity: Entity = {
      id: uuid(),
      investigation_id: data.investigationId,
      user_id: 'local',
      entity_type: data.entityType,
      display_name: data.displayName,
      normalized_name: data.normalizedName,
      created_at: now(),
    }
    const list = readList<Entity>(KEYS.entities)
    writeList(KEYS.entities, [...list, entity])
    return entity
  },
}

// ─── Entity Relationships ──────────────────────────────────────────────────────

export const entityRelationshipsStore = {
  list(investigationId: string): EntityRelationship[] {
    return readList<EntityRelationship>(KEYS.entityRelationships).filter(r => r.investigation_id === investigationId)
  },

  create(data: {
    investigationId: string
    sourceEntityId: string
    targetEntityId: string
    relationshipType: RelationshipType
    supportingDocumentId?: string
  }): EntityRelationship {
    const rel: EntityRelationship = {
      id: uuid(),
      investigation_id: data.investigationId,
      user_id: 'local',
      source_entity_id: data.sourceEntityId,
      target_entity_id: data.targetEntityId,
      relationship_type: data.relationshipType,
      supporting_document_id: data.supportingDocumentId ?? null,
      created_at: now(),
    }
    const list = readList<EntityRelationship>(KEYS.entityRelationships)
    writeList(KEYS.entityRelationships, [...list, rel])
    return rel
  },
}

// ─── Investigation Notes ───────────────────────────────────────────────────────

export const investigationNotesStore = {
  list(investigationId: string): InvestigationNote[] {
    return readList<InvestigationNote>(KEYS.investigationNotes)
      .filter(n => n.investigation_id === investigationId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  create(data: { investigationId: string; content: string }): InvestigationNote {
    const note: InvestigationNote = {
      id: uuid(),
      investigation_id: data.investigationId,
      user_id: 'local',
      content: data.content,
      created_at: now(),
      updated_at: now(),
    }
    const list = readList<InvestigationNote>(KEYS.investigationNotes)
    writeList(KEYS.investigationNotes, [note, ...list])
    return note
  },

  update(id: string, content: string): InvestigationNote | null {
    const list = readList<InvestigationNote>(KEYS.investigationNotes)
    const idx = list.findIndex(n => n.id === id)
    if (idx === -1) return null
    list[idx] = { ...list[idx], content, updated_at: now() }
    writeList(KEYS.investigationNotes, list)
    return list[idx]
  },

  delete(id: string): void {
    writeList(KEYS.investigationNotes, readList<InvestigationNote>(KEYS.investigationNotes).filter(n => n.id !== id))
  },
}

// ─── Activity Logs ────────────────────────────────────────────────────────────

export const activityLogsStore = {
  list(limit = 10): ActivityLog[] {
    return readList<ActivityLog>(KEYS.activityLogs)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
  },

  add(data: { investigation_id?: string | null; activity_type: ActivityType; description: string; metadata?: Json }): ActivityLog {
    const log: ActivityLog = {
      id: uuid(),
      user_id: 'local',
      investigation_id: data.investigation_id ?? null,
      activity_type: data.activity_type,
      description: data.description,
      metadata: data.metadata ?? null,
      created_at: now(),
    }
    const list = readList<ActivityLog>(KEYS.activityLogs)
    // Keep only last 100 logs
    writeList(KEYS.activityLogs, [log, ...list].slice(0, 100))
    return log
  },
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export const bookmarksStore = {
  isBookmarked(findingId: string): boolean {
    return readList<Bookmark>(KEYS.bookmarks).some(b => b.finding_id === findingId)
  },

  add(findingId: string): Bookmark {
    const bm: Bookmark = {
      id: uuid(),
      finding_id: findingId,
      user_id: 'local',
      created_at: now(),
    }
    const list = readList<Bookmark>(KEYS.bookmarks)
    if (!list.some(b => b.finding_id === findingId)) {
      writeList(KEYS.bookmarks, [bm, ...list])
    }
    return bm
  },

  remove(findingId: string): void {
    writeList(KEYS.bookmarks, readList<Bookmark>(KEYS.bookmarks).filter(b => b.finding_id !== findingId))
  },
}

// ─── Review History ────────────────────────────────────────────────────────────

export const reviewHistoryStore = {
  list(findingId: string): ReviewHistory[] {
    return readList<ReviewHistory>(KEYS.reviewHistory)
      .filter(r => r.finding_id === findingId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  },

  add(data: { findingId: string; previousStatus: ReviewStatus; newStatus: ReviewStatus; reviewNote?: string }): ReviewHistory {
    const rh: ReviewHistory = {
      id: uuid(),
      finding_id: data.findingId,
      user_id: 'local',
      previous_status: data.previousStatus,
      new_status: data.newStatus,
      review_note: data.reviewNote ?? null,
      created_at: now(),
    }
    const list = readList<ReviewHistory>(KEYS.reviewHistory)
    writeList(KEYS.reviewHistory, [...list, rh])
    return rh
  },
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export const statsStore = {
  get() {
    ensureSeeded()
    const investigations = readList<Investigation>(KEYS.investigations)
    const documents = readList<Document>(KEYS.documents)
    const findings = readList<Finding>(KEYS.findings)
    return {
      totalInvestigations: investigations.length,
      documentsProcessed: documents.filter(d => d.processing_status === 'completed').length,
      findingsGenerated: findings.length,
      needsReviewCount: findings.filter(f => f.review_status === 'needs_review').length,
      priorityCounts: {
        critical: findings.filter(f => f.priority_level === 'critical').length,
        high: findings.filter(f => f.priority_level === 'high').length,
        moderate: findings.filter(f => f.priority_level === 'moderate').length,
        low: findings.filter(f => f.priority_level === 'low').length,
      },
    }
  },
}

// Re-export types for convenience
export type {
  Investigation, Document, ExtractedField, Finding, FindingEvidence,
  Entity, EntityRelationship, InvestigationNote, ActivityLog, Bookmark, ReviewHistory,
  InvestigationStatus, DocumentProcessingStatus, DocumentType, ExtractionSource,
  FindingType, PriorityLevel, ReviewStatus, EntityType, RelationshipType, ActivityType,
}
