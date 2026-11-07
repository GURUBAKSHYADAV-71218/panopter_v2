import { describe, it, expect } from 'vitest'
import {
  normalizeAmount,
  normalizeDate,
  normalizeReferenceNumber,
  normalizeOrganizationName,
  compareAmounts,
} from '@/lib/normalization'

describe('normalizeAmount', () => {
  it('parses plain number', () => {
    expect(normalizeAmount('450000')).toBe(450000)
  })
  it('strips ₹ symbol and commas', () => {
    expect(normalizeAmount('₹4,50,000')).toBe(450000)
  })
  it('strips Rs. prefix', () => {
    expect(normalizeAmount('Rs. 4,85,000')).toBe(485000)
  })
  it('returns null for empty string', () => {
    expect(normalizeAmount('')).toBeNull()
  })
  it('returns null for non-numeric', () => {
    expect(normalizeAmount('N/A')).toBeNull()
  })
})

describe('normalizeDate', () => {
  it('passes through ISO date', () => {
    expect(normalizeDate('2026-10-12')).toBe('2026-10-12')
  })
  it('parses DD/MM/YYYY', () => {
    expect(normalizeDate('12/10/2026')).toBe('2026-10-12')
  })
  it('parses DD-MM-YYYY', () => {
    expect(normalizeDate('12-10-2026')).toBe('2026-10-12')
  })
  it('parses DD MMM YYYY', () => {
    expect(normalizeDate('12 Oct 2026')).toBe('2026-10-12')
  })
  it('returns null for empty string', () => {
    expect(normalizeDate('')).toBeNull()
  })
  it('returns null for clearly invalid date', () => {
    expect(normalizeDate('not-a-date')).toBeNull()
  })
})

describe('normalizeReferenceNumber', () => {
  it('removes spaces and uppercases', () => {
    expect(normalizeReferenceNumber('inv 2026 104')).toBe('INV2026104')
  })
  it('removes dashes', () => {
    expect(normalizeReferenceNumber('PO-2026-104')).toBe('PO2026104')
  })
})

describe('normalizeOrganizationName', () => {
  it('strips Pvt. Ltd. suffix', () => {
    const result = normalizeOrganizationName('ABC Supplies Pvt. Ltd.')
    expect(result).toBe('ABC SUPPLIES')
  })
  it('is case-insensitive comparison ready', () => {
    const a = normalizeOrganizationName('ABC Supplies Pvt. Ltd.')
    const b = normalizeOrganizationName('ABC SUPPLIES PVT LTD')
    expect(a).toBe(b)
  })
})

describe('compareAmounts', () => {
  it('detects matching amounts', () => {
    const result = compareAmounts('₹4,50,000', '450000')
    expect(result.match).toBe(true)
    expect(result.diff).toBe(0)
  })
  it('detects mismatching amounts', () => {
    const result = compareAmounts('₹4,85,000', '₹4,50,000')
    expect(result.match).toBe(false)
    expect(result.diff).toBe(35000)
  })
  it('returns match=false when either value is null', () => {
    const result = compareAmounts(null, '450000')
    expect(result.match).toBe(false)
    expect(result.diff).toBeNull()
  })
})
