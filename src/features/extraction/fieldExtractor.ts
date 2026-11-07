import type { ExtractedText, RawExtractedField } from '@/types'
import { normalizeAmount, normalizeDate, normalizeReferenceNumber, normalizeOrganizationName } from '@/lib/normalization'

/**
 * Extract structured fields from document text.
 * Uses regex patterns for deterministic extraction.
 */
export function extractFields(pageTexts: ExtractedText[]): RawExtractedField[] {
  const fields: RawExtractedField[] = []

  for (const page of pageTexts) {
    const { text, page: pageNum, source } = page
    const lines = text.split('\n')

    // Extract amounts
    extractAmounts(text, pageNum, source, fields)

    // Extract dates
    extractDates(text, pageNum, source, fields)

    // Extract reference numbers (invoice, PO, receipt)
    extractReferenceNumbers(text, pageNum, source, fields)

    // Extract vendor/organization names
    extractOrganizationNames(lines, pageNum, source, fields)

    // Extract email addresses
    extractEmails(text, pageNum, source, fields)
  }

  return deduplicateFields(fields)
}

function extractAmounts(
  text: string,
  pageNum: number,
  source: RawExtractedField['sourceType'],
  fields: RawExtractedField[]
): void {
  // Match Indian currency amounts: ₹4,50,000 or Rs. 4,50,000 or INR 450000
  const amountPatterns = [
    { regex: /(?:grand\s+total|total\s+amount|net\s+amount)[:\s]+([₹Rs\.INR\s]*[\d,]+(?:\.\d{1,2})?)/gi, fieldName: 'total_amount' },
    { regex: /(?:amount)[:\s]+([₹Rs\.INR\s]*[\d,]+(?:\.\d{1,2})?)/gi, fieldName: 'amount' },
    { regex: /[₹][\s]*([\d,]+(?:\.\d{1,2})?)/g, fieldName: 'amount' },
  ]

  for (const { regex, fieldName } of amountPatterns) {
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      const raw = match[1]?.trim() || match[0]?.trim()
      if (!raw) continue
      const normalized = normalizeAmount(raw)
      fields.push({
        fieldName,
        fieldValue: raw,
        normalizedValue: normalized !== null ? normalized.toString() : null,
        pageNumber: pageNum,
        sourceExcerpt: extractExcerpt(text, match.index, 80),
        sourceType: source,
        confidence: null,
      })
    }
  }
}

function extractDates(
  text: string,
  pageNum: number,
  source: RawExtractedField['sourceType'],
  fields: RawExtractedField[]
): void {
  const datePatterns = [
    { regex: /(?:date|dated|invoice\s+date|po\s+date|order\s+date)[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/gi, fieldName: 'document_date' },
    { regex: /(?:date|dated|invoice\s+date|po\s+date|order\s+date)[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/gi, fieldName: 'document_date' },
    // Standalone dates
    { regex: /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/g, fieldName: 'date' },
    { regex: /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/gi, fieldName: 'date' },
  ]

  for (const { regex, fieldName } of datePatterns) {
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      const raw = match[1]?.trim() || match[0]?.trim()
      if (!raw) continue
      const normalized = normalizeDate(raw)
      fields.push({
        fieldName,
        fieldValue: raw,
        normalizedValue: normalized,
        pageNumber: pageNum,
        sourceExcerpt: extractExcerpt(text, match.index, 80),
        sourceType: source,
        confidence: null,
      })
    }
  }
}

function extractReferenceNumbers(
  text: string,
  pageNum: number,
  source: RawExtractedField['sourceType'],
  fields: RawExtractedField[]
): void {
  const refPatterns = [
    { regex: /(?:invoice\s+(?:no|number|#))[:\s]+([A-Z0-9\-\/]+)/gi, fieldName: 'invoice_number' },
    { regex: /\bINV[-\s]?([A-Z0-9\-\/]+)/gi, fieldName: 'invoice_number' },
    { regex: /(?:purchase\s+order\s+(?:no|number|#)|PO\s+(?:no|number|#))[:\s]+([A-Z0-9\-\/]+)/gi, fieldName: 'po_number' },
    { regex: /\bPO[-\s]?(\d{4}[-\s]?\d+)/gi, fieldName: 'po_number' },
    { regex: /(?:receipt\s+(?:no|number|#)|RCPT\s+(?:no|number|#))[:\s]+([A-Z0-9\-\/]+)/gi, fieldName: 'receipt_number' },
    { regex: /(?:reference\s+(?:no|number|#))[:\s]+([A-Z0-9\-\/]+)/gi, fieldName: 'reference_number' },
    { regex: /(?:transaction\s+(?:id|no|ref))[:\s]+([A-Z0-9\-\/]+)/gi, fieldName: 'transaction_reference' },
  ]

  for (const { regex, fieldName } of refPatterns) {
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      const raw = match[1]?.trim() || match[0]?.trim()
      if (!raw || raw.length < 3) continue
      fields.push({
        fieldName,
        fieldValue: raw,
        normalizedValue: normalizeReferenceNumber(raw),
        pageNumber: pageNum,
        sourceExcerpt: extractExcerpt(text, match.index, 80),
        sourceType: source,
        confidence: null,
      })
    }
  }
}

function extractOrganizationNames(
  lines: string[],
  pageNum: number,
  source: RawExtractedField['sourceType'],
  fields: RawExtractedField[]
): void {
  const vendorPatterns = [
    /(?:vendor|supplier|sold\s+by|from)[:\s]+(.+?)(?:\n|$)/i,
    /(?:bill\s+from|issued\s+by)[:\s]+(.+?)(?:\n|$)/i,
  ]

  for (const line of lines) {
    for (const pattern of vendorPatterns) {
      const match = line.match(pattern)
      if (match?.[1]) {
        const raw = match[1].trim()
        if (raw.length > 2 && raw.length < 100) {
          fields.push({
            fieldName: 'vendor_name',
            fieldValue: raw,
            normalizedValue: normalizeOrganizationName(raw),
            pageNumber: pageNum,
            sourceExcerpt: line.trim().substring(0, 100),
            sourceType: source,
            confidence: null,
          })
        }
      }
    }

    // Look for Pvt. Ltd. patterns as vendor names
    const orgMatch = line.match(/([A-Z][A-Za-z\s]+(?:Pvt\.?\s*Ltd\.?|Inc\.?|Corp\.?|Limited))/g)
    if (orgMatch) {
      for (const org of orgMatch) {
        const raw = org.trim()
        if (raw.length > 5) {
          fields.push({
            fieldName: 'organization_name',
            fieldValue: raw,
            normalizedValue: normalizeOrganizationName(raw),
            pageNumber: pageNum,
            sourceExcerpt: line.trim().substring(0, 100),
            sourceType: source,
            confidence: null,
          })
        }
      }
    }
  }
}

function extractEmails(
  text: string,
  pageNum: number,
  source: RawExtractedField['sourceType'],
  fields: RawExtractedField[]
): void {
  const emailRegex = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g
  let match: RegExpExecArray | null
  while ((match = emailRegex.exec(text)) !== null) {
    fields.push({
      fieldName: 'email',
      fieldValue: match[0],
      normalizedValue: match[0].toLowerCase(),
      pageNumber: pageNum,
      sourceExcerpt: extractExcerpt(text, match.index, 60),
      sourceType: source,
      confidence: null,
    })
  }
}

function extractExcerpt(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 20)
  const end = Math.min(text.length, index + length)
  return text.substring(start, end).replace(/\s+/g, ' ').trim()
}

function deduplicateFields(fields: RawExtractedField[]): RawExtractedField[] {
  const seen = new Set<string>()
  return fields.filter(f => {
    const key = `${f.fieldName}:${f.fieldValue}:${f.pageNumber}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
