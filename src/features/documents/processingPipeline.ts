// Document processing pipeline — orchestrates validation, extraction, OCR, classification, field extraction
import { createClient } from '@/lib/supabase/client'
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

type SupabaseClient = ReturnType<typeof createClient>

async function updateStatus(
  supabase: SupabaseClient,
  documentId: string,
  status: DocumentProcessingStatus,
  extras: Record<string, unknown> = {}
) {
  await supabase.from('documents').update({ processing_status: status, updated_at: new Date().toISOString(), ...extras }).eq('id', documentId)
}

export async function processDocument(
  documentId: string,
  file: File,
  userId: string,
  supabase: SupabaseClient,
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
    await updateStatus(supabase, documentId, 'validating')

    const validation = validateFile(file)
    if (!validation.valid) {
      await updateStatus(supabase, documentId, 'failed', { processing_error: validation.error })
      return { documentId, status: 'failed', error: validation.error }
    }
    if (aborted()) { await updateStatus(supabase, documentId, 'cancelled'); return { documentId, status: 'cancelled' } }

    // ── Stage 2: Extract text ──────────────────────────────────────────────
    progress('extracting_text', 'Extracting text…')
    await updateStatus(supabase, documentId, 'extracting_text')

    const pageTexts: ExtractedText[] = []
    let pageCount = 1
    let extractionSource: 'embedded_text' | 'ocr' = 'embedded_text'

    if (file.type === 'application/pdf') {
      const pdfResult = await extractPdfText(file)

      if (pdfResult.error && pdfResult.pageTexts.length === 0) {
        await updateStatus(supabase, documentId, 'failed', { processing_error: pdfResult.error })
        return { documentId, status: 'failed', error: pdfResult.error }
      }

      pageCount = pdfResult.pageCount
      await updateStatus(supabase, documentId, 'extracting_text', { page_count: pageCount })

      // For pages with usable text, use it. For scanned pages, run OCR.
      for (const p of pdfResult.pageTexts) {
        if (aborted()) { await updateStatus(supabase, documentId, 'cancelled'); return { documentId, status: 'cancelled' } }

        if (p.hasUsableText) {
          pageTexts.push({ page: p.page, text: p.text, source: 'embedded_text' })
        } else {
          // OCR this page
          progress('ocr_processing', `OCR page ${p.page}…`)
          await updateStatus(supabase, documentId, 'ocr_processing')
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
      await updateStatus(supabase, documentId, 'ocr_processing')
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
        await updateStatus(supabase, documentId, 'failed', { processing_error: msg })
        return { documentId, status: 'failed', error: msg }
      }
    }

    if (aborted()) { await updateStatus(supabase, documentId, 'cancelled'); return { documentId, status: 'cancelled' } }

    // ── Stage 3: Classify ──────────────────────────────────────────────────
    progress('classifying', 'Classifying document…')
    await updateStatus(supabase, documentId, 'classifying')

    const classification = classifyDocument(pageTexts, file.name)
    await updateStatus(supabase, documentId, 'classifying', {
      document_type: classification.documentType,
      extraction_source: extractionSource,
    })

    if (aborted()) { await updateStatus(supabase, documentId, 'cancelled'); return { documentId, status: 'cancelled' } }

    // ── Stage 4: Extract fields ────────────────────────────────────────────
    progress('extracting_fields', 'Extracting fields…')
    await updateStatus(supabase, documentId, 'extracting_fields')

    const rawFields: RawExtractedField[] = extractFields(pageTexts)

    // Insert extracted fields into DB
    if (rawFields.length > 0) {
      const dbFields = rawFields.map(f => ({
        document_id: documentId,
        user_id: userId,
        field_name: f.fieldName,
        field_value: f.fieldValue,
        normalized_value: f.normalizedValue,
        page_number: f.pageNumber,
        source_excerpt: f.sourceExcerpt,
        source_type: f.sourceType,
        confidence: f.confidence,
      }))

      // Insert in batches of 50 to avoid payload limits
      for (let i = 0; i < dbFields.length; i += 50) {
        const batch = dbFields.slice(i, i + 50)
        const { error } = await supabase.from('extracted_fields').insert(batch)
        // eslint-disable-next-line no-console
        if (error) console.warn('Field insert error:', error.message)
      }
    }

    // ── Complete ───────────────────────────────────────────────────────────
    const finalStatus: DocumentProcessingStatus = 'completed'
    await updateStatus(supabase, documentId, finalStatus, {
      document_type: classification.documentType,
      extraction_source: extractionSource,
    })
    progress(finalStatus, 'Complete')

    return { documentId, status: finalStatus }

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected processing error'
    await updateStatus(supabase, documentId, 'failed', { processing_error: message }).catch(() => {})
    return { documentId, status: 'failed', error: message }
  }
}
