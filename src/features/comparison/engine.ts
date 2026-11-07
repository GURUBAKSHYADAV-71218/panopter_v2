import type {
  ComparisonInput,
  FindingCandidate,
  ExtractedField,
  Document,
  PriorityLevel,
  ScoreContribution,
  EvidenceCandidate,
} from '@/types'
import { PRIORITY_THRESHOLDS, SCORE_RULES } from '@/constants'
import {
  normalizeAmount,
  normalizeReferenceNumber,
  normalizeDate,
  normalizeOrganizationName,
  formatIndianCurrency,
} from '@/lib/normalization'


/**
 * Determine priority level from a numeric score.
 */
export function scoreToPriorityLevel(score: number): PriorityLevel {
  if (score >= PRIORITY_THRESHOLDS.critical) return 'critical'
  if (score >= PRIORITY_THRESHOLDS.high) return 'high'
  if (score >= PRIORITY_THRESHOLDS.moderate) return 'moderate'
  return 'low'
}

/**
 * Cap score at 100.
 */
function capScore(score: number): number {
  return Math.min(100, Math.max(0, score))
}

/**
 * Run the full comparison engine on the input data.
 * Returns all finding candidates (before deduplication).
 */
export function runComparisonEngine(input: ComparisonInput): FindingCandidate[] {
  const findings: FindingCandidate[] = []

  // Group fields by document
  const fieldsByDoc = groupFieldsByDocument(input.extractedFields, input.documents)

  // Run all comparison rules
  findings.push(...ruleAmountComparison(fieldsByDoc, input.documents))
  findings.push(...ruleMissingRequiredFields(fieldsByDoc, input.documents))
  findings.push(...ruleDuplicateReferences(fieldsByDoc, input.documents))
  findings.push(...ruleVendorMismatch(fieldsByDoc, input.documents))
  findings.push(...ruleDateInconsistency(fieldsByDoc, input.documents))

  // Deduplicate findings by rule + document pair
  return deduplicateFindings(findings)
}

interface DocFieldGroup {
  doc: Document
  fields: ExtractedField[]
  fieldMap: Map<string, ExtractedField[]>
}

function groupFieldsByDocument(
  fields: ExtractedField[],
  documents: Document[]
): DocFieldGroup[] {
  return documents.map(doc => {
    const docFields = fields.filter(f => f.document_id === doc.id)
    const fieldMap = new Map<string, ExtractedField[]>()
    for (const field of docFields) {
      const existing = fieldMap.get(field.field_name) ?? []
      existing.push(field)
      fieldMap.set(field.field_name, existing)
    }
    return { doc, fields: docFields, fieldMap }
  })
}

function getFirstField(group: DocFieldGroup, ...names: string[]): ExtractedField | null {
  for (const name of names) {
    const fields = group.fieldMap.get(name)
    if (fields && fields.length > 0) return fields[0]
  }
  return null
}

/**
 * Rule: Amount comparison between pairs of documents.
 */
function ruleAmountComparison(groups: DocFieldGroup[], docs: Document[]): FindingCandidate[] {
  const findings: FindingCandidate[] = []

  // Find relevant document types
  const invoiceGroups = groups.filter(g =>
    g.doc.document_type === 'invoice'
  )
  const poGroups = groups.filter(g =>
    g.doc.document_type === 'purchase_order'
  )
  const receiptGroups = groups.filter(g =>
    g.doc.document_type === 'receipt'
  )

  // Compare invoice vs PO amounts
  for (const inv of invoiceGroups) {
    for (const po of poGroups) {
      const invAmtField = getFirstField(inv, 'total_amount', 'amount')
      const poAmtField = getFirstField(po, 'total_amount', 'amount')

      if (!invAmtField || !poAmtField) continue

      const invAmt = normalizeAmount(invAmtField.field_value)
      const poAmt = normalizeAmount(poAmtField.field_value)

      if (invAmt === null || poAmt === null) continue

      const diff = Math.abs(invAmt - poAmt)
      if (diff < 0.01) continue // Amounts match — no finding

      const contribution: ScoreContribution = {
        rule: 'AMOUNT_MISMATCH',
        points: SCORE_RULES.AMOUNT_MISMATCH,
        reason: `Invoice amount differs from Purchase Order amount by ${formatIndianCurrency(diff)}`,
      }
      const score = capScore(SCORE_RULES.AMOUNT_MISMATCH)

      const evidence: EvidenceCandidate[] = [
        {
          documentId: inv.doc.id,
          pageNumber: invAmtField.page_number,
          fieldName: 'Total Amount',
          observedValue: invAmtField.field_value,
          comparedValue: poAmtField.field_value,
          sourceExcerpt: invAmtField.source_excerpt,
          evidenceType: 'amount_field',
        },
        {
          documentId: po.doc.id,
          pageNumber: poAmtField.page_number,
          fieldName: 'Total Amount',
          observedValue: poAmtField.field_value,
          comparedValue: invAmtField.field_value,
          sourceExcerpt: poAmtField.source_excerpt,
          evidenceType: 'amount_field',
        },
      ]

      findings.push({
        ruleId: `amount_inv_po_${inv.doc.id}_${po.doc.id}`,
        title: 'Invoice amount differs from Purchase Order',
        description: `The invoice total (${invAmtField.field_value}) is ${invAmt > poAmt ? 'higher' : 'lower'} than the purchase order total (${poAmtField.field_value}). The difference is ${formatIndianCurrency(diff)}. This potential discrepancy requires human review.`,
        findingType: 'amount_mismatch',
        priorityScore: score,
        priorityLevel: scoreToPriorityLevel(score),
        scoreContributions: [contribution],
        evidence,
      })
    }
  }

  // Compare invoice vs receipt amounts
  for (const inv of invoiceGroups) {
    for (const rcpt of receiptGroups) {
      const invAmtField = getFirstField(inv, 'total_amount', 'amount')
      const rcptAmtField = getFirstField(rcpt, 'total_amount', 'amount')

      if (!invAmtField || !rcptAmtField) continue

      const invAmt = normalizeAmount(invAmtField.field_value)
      const rcptAmt = normalizeAmount(rcptAmtField.field_value)

      if (invAmt === null || rcptAmt === null) continue

      const diff = Math.abs(invAmt - rcptAmt)
      if (diff < 0.01) continue

      const score = capScore(SCORE_RULES.AMOUNT_MISMATCH)
      findings.push({
        ruleId: `amount_inv_rcpt_${inv.doc.id}_${rcpt.doc.id}`,
        title: 'Invoice amount differs from Receipt amount',
        description: `The invoice total (${invAmtField.field_value}) differs from the receipt amount (${rcptAmtField.field_value}). The difference is ${formatIndianCurrency(diff)}. This potential discrepancy requires human review.`,
        findingType: 'amount_mismatch',
        priorityScore: score,
        priorityLevel: scoreToPriorityLevel(score),
        scoreContributions: [{
          rule: 'AMOUNT_MISMATCH',
          points: SCORE_RULES.AMOUNT_MISMATCH,
          reason: `Invoice amount differs from Receipt amount by ${formatIndianCurrency(diff)}`,
        }],
        evidence: [
          {
            documentId: inv.doc.id,
            pageNumber: invAmtField.page_number,
            fieldName: 'Total Amount',
            observedValue: invAmtField.field_value,
            comparedValue: rcptAmtField.field_value,
            sourceExcerpt: invAmtField.source_excerpt,
            evidenceType: 'amount_field',
          },
          {
            documentId: rcpt.doc.id,
            pageNumber: rcptAmtField.page_number,
            fieldName: 'Total Amount',
            observedValue: rcptAmtField.field_value,
            comparedValue: invAmtField.field_value,
            sourceExcerpt: rcptAmtField.source_excerpt,
            evidenceType: 'amount_field',
          },
        ],
      })
    }
  }

  return findings
}

/**
 * Rule: Check for missing required fields by document type.
 */
function ruleMissingRequiredFields(groups: DocFieldGroup[], docs: Document[]): FindingCandidate[] {
  const findings: FindingCandidate[] = []

  const requiredFields: Partial<Record<string, string[]>> = {
    invoice: ['invoice_number', 'total_amount', 'vendor_name', 'document_date'],
    purchase_order: ['po_number', 'total_amount'],
    receipt: ['receipt_number', 'total_amount'],
  }

  for (const group of groups) {
    const required = requiredFields[group.doc.document_type] ?? []
    for (const fieldName of required) {
      const hasField = group.fieldMap.has(fieldName) && (group.fieldMap.get(fieldName)?.length ?? 0) > 0
      if (!hasField) {
        const score = capScore(SCORE_RULES.MISSING_REQUIRED_FIELD)
        findings.push({
          ruleId: `missing_${fieldName}_${group.doc.id}`,
          title: `Missing field: ${fieldName.replace(/_/g, ' ')}`,
          description: `The required field "${fieldName.replace(/_/g, ' ')}" could not be extracted from "${group.doc.file_name}". This may indicate an incomplete document or an extraction limitation.`,
          findingType: 'missing_field',
          priorityScore: score,
          priorityLevel: scoreToPriorityLevel(score),
          scoreContributions: [{
            rule: 'MISSING_REQUIRED_FIELD',
            points: SCORE_RULES.MISSING_REQUIRED_FIELD,
            reason: `Required field "${fieldName}" not found in ${group.doc.document_type} document`,
          }],
          evidence: [{
            documentId: group.doc.id,
            pageNumber: null,
            fieldName,
            observedValue: 'NOT FOUND',
            comparedValue: null,
            sourceExcerpt: null,
            evidenceType: 'missing_field',
          }],
        })
      }
    }
  }

  return findings
}

/**
 * Rule: Detect duplicate reference numbers across documents.
 */
function ruleDuplicateReferences(groups: DocFieldGroup[], docs: Document[]): FindingCandidate[] {
  const findings: FindingCandidate[] = []

  // Check all invoice_number fields across all docs
  const refFields = ['invoice_number', 'po_number', 'receipt_number', 'transaction_reference']

  for (const refField of refFields) {
    const allRefs: Array<{ group: DocFieldGroup; field: ExtractedField }> = []
    for (const group of groups) {
      const fields = group.fieldMap.get(refField) ?? []
      for (const field of fields) {
        allRefs.push({ group, field })
      }
    }

    // Group by normalized value
    const byNorm = new Map<string, typeof allRefs>()
    for (const ref of allRefs) {
      const norm = normalizeReferenceNumber(ref.field.field_value)
      if (!norm) continue
      const existing = byNorm.get(norm) ?? []
      existing.push(ref)
      byNorm.set(norm, existing)
    }

    // Multiple docs with same ref AND different document types → not a duplicate
    for (const [norm, refs] of byNorm) {
      const docIds = new Set(refs.map(r => r.group.doc.id))
      if (docIds.size > 1) {
        // Same ref number in multiple documents — potential duplicate
        const score = capScore(SCORE_RULES.REFERENCE_MISMATCH)
        const evidence: EvidenceCandidate[] = refs.map(r => ({
          documentId: r.group.doc.id,
          pageNumber: r.field.page_number,
          fieldName: refField.replace(/_/g, ' '),
          observedValue: r.field.field_value,
          comparedValue: null,
          sourceExcerpt: r.field.source_excerpt,
          evidenceType: 'duplicate_reference',
        }))

        findings.push({
          ruleId: `dup_ref_${refField}_${norm}`,
          title: `Duplicate reference number: ${norm}`,
          description: `The ${refField.replace(/_/g, ' ')} "${norm}" appears in ${docIds.size} documents. This requires verification to confirm whether these references are legitimately shared.`,
          findingType: 'duplicate_reference',
          priorityScore: score,
          priorityLevel: scoreToPriorityLevel(score),
          scoreContributions: [{
            rule: 'REFERENCE_MISMATCH',
            points: SCORE_RULES.REFERENCE_MISMATCH,
            reason: `Same ${refField.replace(/_/g, ' ')} found in ${docIds.size} different documents`,
          }],
          evidence,
        })
      }
    }
  }

  return findings
}

/**
 * Rule: Vendor name inconsistency across documents.
 */
function ruleVendorMismatch(groups: DocFieldGroup[], docs: Document[]): FindingCandidate[] {
  const findings: FindingCandidate[] = []

  const allVendorFields: Array<{ group: DocFieldGroup; field: ExtractedField }> = []
  for (const group of groups) {
    const vendorFields = [
      ...(group.fieldMap.get('vendor_name') ?? []),
      ...(group.fieldMap.get('organization_name') ?? []),
    ]
    for (const field of vendorFields) {
      allVendorFields.push({ group, field })
    }
  }

  if (allVendorFields.length < 2) return findings

  // Normalize all vendor names and check for significant differences
  const normalized = allVendorFields.map(v => ({
    ...v,
    norm: normalizeOrganizationName(v.field.field_value),
  }))

  const uniqueNorms = new Set(normalized.map(v => v.norm))
  if (uniqueNorms.size <= 1) return findings // All match

  // Build pairs that differ
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      if (normalized[i].norm !== normalized[j].norm &&
          normalized[i].group.doc.id !== normalized[j].group.doc.id) {

        const score = capScore(SCORE_RULES.AMOUNT_MISMATCH - 5) // slightly less than amount mismatch
        findings.push({
          ruleId: `vendor_mismatch_${normalized[i].group.doc.id}_${normalized[j].group.doc.id}`,
          title: 'Vendor name inconsistency across documents',
          description: `Different vendor or organization names were detected across documents: "${normalized[i].field.field_value}" vs "${normalized[j].field.field_value}". This may indicate different entities or a data entry inconsistency.`,
          findingType: 'vendor_mismatch',
          priorityScore: score,
          priorityLevel: scoreToPriorityLevel(score),
          scoreContributions: [{
            rule: 'VENDOR_MISMATCH',
            points: score,
            reason: 'Vendor names do not match after normalization',
          }],
          evidence: [
            {
              documentId: normalized[i].group.doc.id,
              pageNumber: normalized[i].field.page_number,
              fieldName: 'Vendor Name',
              observedValue: normalized[i].field.field_value,
              comparedValue: normalized[j].field.field_value,
              sourceExcerpt: normalized[i].field.source_excerpt,
              evidenceType: 'vendor_name_field',
            },
            {
              documentId: normalized[j].group.doc.id,
              pageNumber: normalized[j].field.page_number,
              fieldName: 'Vendor Name',
              observedValue: normalized[j].field.field_value,
              comparedValue: normalized[i].field.field_value,
              sourceExcerpt: normalized[j].field.source_excerpt,
              evidenceType: 'vendor_name_field',
            },
          ],
        })
        break // One finding per document pair
      }
    }
  }

  return findings
}

/**
 * Rule: Date inconsistency (invoice date before PO date, etc.)
 */
function ruleDateInconsistency(groups: DocFieldGroup[], docs: Document[]): FindingCandidate[] {
  const findings: FindingCandidate[] = []

  const poGroups = groups.filter(g => g.doc.document_type === 'purchase_order')
  const invoiceGroups = groups.filter(g => g.doc.document_type === 'invoice')

  for (const po of poGroups) {
    for (const inv of invoiceGroups) {
      const poDateField = getFirstField(po, 'document_date', 'date')
      const invDateField = getFirstField(inv, 'document_date', 'date')

      if (!poDateField || !invDateField) continue

      const normPoDate = normalizeDate(poDateField.field_value)
      const normInvDate = normalizeDate(invDateField.field_value)

      if (!normPoDate || !normInvDate) continue

      // Invoice should not be dated before PO
      if (normInvDate < normPoDate) {
        const score = capScore(SCORE_RULES.DATE_INCONSISTENCY)
        findings.push({
          ruleId: `date_inv_before_po_${inv.doc.id}_${po.doc.id}`,
          title: 'Invoice date precedes Purchase Order date',
          description: `The invoice date (${invDateField.field_value}) appears to be earlier than the purchase order date (${poDateField.field_value}). An invoice dated before its corresponding purchase order may indicate a chronology inconsistency.`,
          findingType: 'chronology_inconsistency',
          priorityScore: score,
          priorityLevel: scoreToPriorityLevel(score),
          scoreContributions: [{
            rule: 'DATE_INCONSISTENCY',
            points: SCORE_RULES.DATE_INCONSISTENCY,
            reason: 'Invoice date is earlier than Purchase Order date',
          }],
          evidence: [
            {
              documentId: inv.doc.id,
              pageNumber: invDateField.page_number,
              fieldName: 'Invoice Date',
              observedValue: invDateField.field_value,
              comparedValue: poDateField.field_value,
              sourceExcerpt: invDateField.source_excerpt,
              evidenceType: 'date_field',
            },
            {
              documentId: po.doc.id,
              pageNumber: poDateField.page_number,
              fieldName: 'Purchase Order Date',
              observedValue: poDateField.field_value,
              comparedValue: invDateField.field_value,
              sourceExcerpt: poDateField.source_excerpt,
              evidenceType: 'date_field',
            },
          ],
        })
      }
    }
  }

  return findings
}

function deduplicateFindings(findings: FindingCandidate[]): FindingCandidate[] {
  const seen = new Set<string>()
  return findings.filter(f => {
    if (seen.has(f.ruleId)) return false
    seen.add(f.ruleId)
    return true
  })
}
