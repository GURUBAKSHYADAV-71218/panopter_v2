// Document processing pipeline — orchestrates validation, extraction, OCR, classification, field extraction
// Uses local store (localStorage) — no Supabase required.
import { documentsStore, extractedFieldsStore } from '@/lib/store'
import { validateFile } from '@/lib/validation/fileValidation'
import { extractPdfText } from '@/lib/pdf/pdfProcessor'
import { recognizeImage, initOcrWorker, ocrPdfPage } from '@/lib/ocr/ocrProcessor'
import { classifyDocument } from '@/features/extraction/classifier'
import { extractFields } from '@/features/extraction/fieldExtractor'
import type { DocumentProcessingStatus, ExtractedText, RawExtractedField } from '@/types'

export interface ProcessingProgress {
  documentId: string
  status: DocumentProcessingStatus
  stageName: string
  error?: string
}

export type ProgressCallback = (progress: ProcessingProgress) => void

export interface ProcessingResult {
  documentId: string
  status: DocumentProcessingStatus
  error?: string
}

function updateStatus(
  documentId: string,
  status: DocumentProcessingStatus,
  extras: Record<string, unknown> = {}
) {
  documentsStore.update(documentId, { processing_status: status, ...extras } as Parameters<typeof documentsStore.update>[1])
}

export async function processDocument(
  documentId: string,
  file: File,
  onProgress: ProgressCallback,
  signal?: AbortSignal
): Promise<ProcessingResult> {
  function progress(status: DocumentProcessingStatus, stageName: string) {
    onProgress({ documentId, status, stageName })
  }

  function aborted(): boolean {
    return signal?.aborted ?? false
  }

  try {
    // ── Stage 1: Validate ──────────────────────────────────────────────────
    progress('validating', 'Validating file…')
    updateStatus(documentId, 'validating')

    const validation = validateFile(file)
    if (!validation.valid) {
      updateStatus(documentId, 'failed', { processing_error: validation.error })
      return { documentId, status: 'failed', error: validation.error }
    }
    if (aborted()) { updateStatus(documentId, 'cancelled'); return { documentId, status: 'cancelled' } }

    // ── Stage 2: Extract text ──────────────────────────────────────────────
    progress('extracting_text', 'Extracting text…')
    updateStatus(documentId, 'extracting_text')

    const pageTexts: ExtractedText[] = []
    let pageCount = 1
    let extractionSource: 'embedded_text' | 'ocr' = 'embedded_text'

    if (file.type === 'application/pdf') {
      const pdfResult = await extractPdfText(file)

      if (pdfResult.error && pdfResult.pageTexts.length === 0) {
        updateStatus(documentId, 'failed', { processing_error: pdfResult.error })
        return { documentId, status: 'failed', error: pdfResult.error }
      }

      pageCount = pdfResult.pageCount
      updateStatus(documentId, 'extracting_text', { page_count: pageCount })

      for (const p of pdfResult.pageTexts) {
        if (aborted()) { updateStatus(documentId, 'cancelled'); return { documentId, status: 'cancelled' } }

        if (p.hasUsableText) {
          pageTexts.push({ page: p.page, text: p.text, source: 'embedded_text' })
        } else {
          progress('ocr_processing', `OCR page ${p.page}…`)
          updateStatus(documentId, 'ocr_processing')
          try {
            await initOcrWorker('eng')
            const ocrResult = await ocrPdfPage(file, p.page)
            pageTexts.push({
              page: p.page,
              text: ocrResult.error ? '' : ocrResult.text,
              source: 'ocr',
              confidence: ocrResult.confidence,
            })
            if (ocrResult.text) extractionSource = 'ocr'
          } catch {
            pageTexts.push({ page: p.page, text: '', source: 'ocr' })
          }
        }
      }

      if (pdfResult.needsOcr) extractionSource = 'ocr'

    } else {
      // Image file — run OCR directly
      progress('ocr_processing', 'Running OCR on image…')
      updateStatus(documentId, 'ocr_processing')
      extractionSource = 'ocr'

      try {
        await initOcrWorker('eng')
        const blob = new Blob([await file.arrayBuffer()], { type: file.type })
        const ocrResult = await recognizeImage(blob)
        pageTexts.push({
          page: 1,
          text: ocrResult.error ? '' : ocrResult.text,
          source: 'ocr',
          confidence: ocrResult.confidence,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'OCR failed'
        updateStatus(documentId, 'failed', { processing_error: msg })
        return { documentId, status: 'failed', error: msg }
      }
    }

    if (aborted()) { updateStatus(documentId, 'cancelled'); return { documentId, status: 'cancelled' } }

    // ── Stage 3: Classify ──────────────────────────────────────────────────
    progress('classifying', 'Classifying document…')
    updateStatus(documentId, 'classifying')

    const classification = classifyDocument(pageTexts, file.name)
    updateStatus(documentId, 'classifying', {
      document_type: classification.documentType,
      extraction_source: extractionSource,
    })

    if (aborted()) { updateStatus(documentId, 'cancelled'); return { documentId, status: 'cancelled' } }

    // ── Stage 4: Extract fields ────────────────────────────────────────────
    progress('extracting_fields', 'Extracting fields…')
    updateStatus(documentId, 'extracting_fields')

    const rawFields: RawExtractedField[] = extractFields(pageTexts)

    if (rawFields.length > 0) {
      const dbFields = rawFields.map(f => ({
        document_id: documentId,
        investigation_id: documentsStore.get(documentId)?.investigation_id ?? '',
        field_name: f.fieldName,
        field_value: f.fieldValue,
        normalized_value: f.normalizedValue,
        page_number: f.pageNumber,
        source_excerpt: f.sourceExcerpt,
        source_type: f.sourceType,
        confidence: f.confidence,
      }))
      extractedFieldsStore.insertBatch(dbFields)
    }

    // ── Complete ───────────────────────────────────────────────────────────
    const finalStatus: DocumentProcessingStatus = 'completed'
    updateStatus(documentId, finalStatus, {
      document_type: classification.documentType,
      extraction_source: extractionSource,
    })
    progress(finalStatus, 'Complete')

    return { documentId, status: finalStatus }

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected processing error'
    updateStatus(documentId, 'failed', { processing_error: message })
    return { documentId, status: 'failed', error: message }
  }
}
