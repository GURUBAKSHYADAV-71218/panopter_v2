// PDF text extraction using PDF.js (browser-side only)
// Dynamic import to avoid SSR issues

export interface PageText {
  page: number
  text: string
  hasUsableText: boolean
}

export interface PdfExtractionResult {
  pageTexts: PageText[]
  pageCount: number
  needsOcr: boolean
  error?: string
}

const MIN_TEXT_LENGTH_FOR_USABLE = 30

export async function extractPdfText(file: File): Promise<PdfExtractionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdfjsLib = await import('pdfjs-dist')

    // Set worker source — use CDN for the worker (browser-side only)
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
    }

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const pageCount = pdf.numPages
    const pageTexts: PageText[] = []
    let needsOcr = false

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()

      const hasUsableText = text.length >= MIN_TEXT_LENGTH_FOR_USABLE
      if (!hasUsableText) needsOcr = true

      pageTexts.push({ page: i, text, hasUsableText })
    }

    return { pageTexts, pageCount, needsOcr }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF parsing failed'
    // Check common failure modes
    if (message.toLowerCase().includes('password')) {
      return { pageTexts: [], pageCount: 0, needsOcr: false, error: 'PDF is password-protected and cannot be processed.' }
    }
    return { pageTexts: [], pageCount: 0, needsOcr: false, error: `PDF extraction failed: ${message}` }
  }
}

export async function getPdfPageCount(file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdfjsLib = await import('pdfjs-dist')
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
    }
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    return pdf.numPages
  } catch {
    return 0
  }
}
