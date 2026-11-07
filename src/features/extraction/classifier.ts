import type { DocumentType } from '@/types'
import type { ExtractedText } from '@/types'

/**
 * Deterministic document classification using extracted text.
 * Returns a document type and reason for classification.
 */
export function classifyDocument(
  pageTexts: ExtractedText[],
  fileName: string
): { documentType: DocumentType; reason: string } {
  const fullText = pageTexts.map(p => p.text).join('\n').toUpperCase()
  const fileNameUpper = fileName.toUpperCase()

  // Score each type
  const scores: Record<DocumentType, number> = {
    invoice: 0,
    purchase_order: 0,
    receipt: 0,
    bank_statement: 0,
    agreement: 0,
    general: 0,
    unknown: 0,
  }

  // Invoice signals
  if (/\bINVOICE\b/.test(fullText) || /\bINV[-\s]?\d/.test(fullText)) scores.invoice += 10
  if (/\bBILL\s+TO\b/.test(fullText)) scores.invoice += 5
  if (/\bTAX\s+INVOICE\b/.test(fullText)) scores.invoice += 8
  if (/\bGST\s+INVOICE\b/.test(fullText)) scores.invoice += 8
  if (fileNameUpper.includes('INV')) scores.invoice += 3

  // Purchase Order signals
  if (/\bPURCHASE\s+ORDER\b/.test(fullText) || /\bP\.?O\.?\b/.test(fullText)) scores.purchase_order += 10
  if (/\bPO[-\s]?\d/.test(fullText)) scores.purchase_order += 8
  if (/\bPROCUREMENT\b/.test(fullText)) scores.purchase_order += 3
  if (fileNameUpper.includes('PO') || fileNameUpper.includes('PURCHASE')) scores.purchase_order += 3

  // Receipt / Delivery Receipt signals
  if (/\bRECEIPT\b/.test(fullText) || /\bRCPT\b/.test(fullText)) scores.receipt += 10
  if (/\bDELIVERY\s+RECEIPT\b/.test(fullText)) scores.receipt += 8
  if (/\bGOODS\s+RECEIVED\b/.test(fullText)) scores.receipt += 6
  if (/\bACKNOWLEDGEMENT\b/.test(fullText)) scores.receipt += 3
  if (fileNameUpper.includes('RECEIPT') || fileNameUpper.includes('RCPT')) scores.receipt += 3

  // Bank Statement signals
  if (/\bBANK\s+STATEMENT\b/.test(fullText)) scores.bank_statement += 10
  if (/\bACCOUNT\s+STATEMENT\b/.test(fullText)) scores.bank_statement += 8
  if (/\bOPENING\s+BALANCE\b/.test(fullText)) scores.bank_statement += 6
  if (/\bCLOSING\s+BALANCE\b/.test(fullText)) scores.bank_statement += 6
  if (/\bDEBIT\b.*\bCREDIT\b/.test(fullText)) scores.bank_statement += 4
  if (fileNameUpper.includes('BANK') || fileNameUpper.includes('STATEMENT')) scores.bank_statement += 3

  // Agreement signals
  if (/\bAGREEMENT\b/.test(fullText) || /\bCONTRACT\b/.test(fullText)) scores.agreement += 10
  if (/\bHEREINAFTER\b/.test(fullText)) scores.agreement += 6
  if (/\bTERMS\s+AND\s+CONDITIONS\b/.test(fullText)) scores.agreement += 4
  if (/\bWHEREAS\b/.test(fullText)) scores.agreement += 4
  if (fileNameUpper.includes('AGREEMENT') || fileNameUpper.includes('CONTRACT')) scores.agreement += 3

  // Find highest score
  let maxScore = 0
  let winner: DocumentType = 'unknown'
  let winnerReason = 'No matching document type patterns found in extracted text.'

  const reasons: Partial<Record<DocumentType, string>> = {
    invoice: 'Invoice keywords detected (INVOICE, BILL TO, TAX INVOICE)',
    purchase_order: 'Purchase order keywords detected (PURCHASE ORDER, PO number)',
    receipt: 'Receipt keywords detected (RECEIPT, DELIVERY RECEIPT, GOODS RECEIVED)',
    bank_statement: 'Bank statement keywords detected (BANK STATEMENT, OPENING/CLOSING BALANCE)',
    agreement: 'Agreement keywords detected (AGREEMENT, CONTRACT, WHEREAS)',
  }

  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      winner = type as DocumentType
      winnerReason = reasons[type as DocumentType] ?? 'Matched document patterns.'
    }
  }

  if (maxScore < 3) {
    winner = 'general'
    winnerReason = 'No specific document type pattern detected. Classified as general supporting document.'
  }

  return { documentType: winner, reason: winnerReason }
}
