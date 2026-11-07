/**
 * Text and field normalization utilities.
 * Always preserve original values — normalization is for comparison only.
 */

/**
 * Normalize whitespace: trim and collapse multiple spaces.
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Normalize to uppercase for case-insensitive comparison.
 */
export function normalizeCase(text: string): string {
  return text.toUpperCase().trim()
}

/**
 * Normalize a currency amount string to a numeric value.
 * Handles: ₹, Rs., INR, $, commas, spaces.
 * Returns null if parsing fails.
 */
export function normalizeAmount(raw: string): number | null {
  if (!raw) return null

  // Remove currency symbols and labels — be aggressive, not word-boundary dependent
  let cleaned = raw
    .replace(/[₹\$£€]/g, '')
    .replace(/Rs\.?\s*/gi, '')  // Handle Rs, Rs., Rs. with trailing space
    .replace(/\b(INR|USD|GBP|EUR)\b/gi, '')
    .replace(/,/g, '')     // Remove Indian comma separators
    .replace(/\s/g, '')    // Remove spaces
    .trim()

  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Format a number as Indian currency (₹).
 */
export function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Normalize a date string to ISO 8601 format (YYYY-MM-DD).
 * Handles: DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY, YYYY-MM-DD, etc.
 * Returns null if parsing fails.
 */
export function normalizeDate(raw: string): string | null {
  if (!raw) return null

  const trimmed = raw.trim()

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed)
    return isNaN(d.getTime()) ? null : trimmed
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    const d = new Date(iso + 'T00:00:00Z')
    return isNaN(d.getTime()) ? null : iso
  }

  // DD MMM YYYY (e.g., 12 Oct 2026)
  const dMonthY = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (dMonthY) {
    const [, day, month, year] = dMonthY
    // Parse month name to number
    const monthNum = new Date(`${month} 1, 2000`).getMonth()
    if (isNaN(monthNum)) return null
    const iso = `${year}-${String(monthNum + 1).padStart(2, '0')}-${day.padStart(2, '0')}`
    const d = new Date(iso + 'T00:00:00Z')
    return isNaN(d.getTime()) ? null : iso
  }

  // Try native Date parse as fallback (may have timezone issues)
  const fallback = new Date(trimmed)
  return isNaN(fallback.getTime()) ? null : fallback.toISOString().split('T')[0]
}

/**
 * Normalize an organization or vendor name for comparison.
 * Removes common suffixes (Pvt., Ltd., Inc., etc.) and normalizes case.
 */
export function normalizeOrganizationName(raw: string): string {
  return raw
    .replace(/\b(Pvt\.?|Ltd\.?|Inc\.?|Corp\.?|Co\.?|LLP|LLC|Limited|Private)\b/gi, '')
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

/**
 * Normalize a reference number (invoice, PO, receipt number).
 * Removes spaces, dashes, and normalizes case.
 */
export function normalizeReferenceNumber(raw: string): string {
  return raw.replace(/[\s\-_]/g, '').toUpperCase().trim()
}

/**
 * Compare two normalized amounts and return the difference if they differ.
 * Returns null if both are null (cannot compare).
 */
export function compareAmounts(
  amountA: string | null,
  amountB: string | null
): { match: boolean; diff: number | null; normA: number | null; normB: number | null } {
  const normA = amountA ? normalizeAmount(amountA) : null
  const normB = amountB ? normalizeAmount(amountB) : null

  if (normA === null || normB === null) {
    return { match: false, diff: null, normA, normB }
  }

  const diff = Math.abs(normA - normB)
  const match = diff < 0.01 // Treat sub-paisa differences as equal

  return { match, diff, normA, normB }
}

/**
 * Compare two date strings (normalized) and return whether they match.
 */
export function compareDates(
  dateA: string | null,
  dateB: string | null
): { match: boolean; normA: string | null; normB: string | null } {
  const normA = dateA ? normalizeDate(dateA) : null
  const normB = dateB ? normalizeDate(dateB) : null

  if (normA === null || normB === null) {
    return { match: false, normA, normB }
  }

  return { match: normA === normB, normA, normB }
}
