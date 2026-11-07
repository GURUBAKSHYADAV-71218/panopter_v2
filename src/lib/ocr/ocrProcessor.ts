// Tesseract.js OCR processor — browser-side only
// Worker is initialized lazily on first use

export interface OcrResult {
  text: string
  confidence?: number
  language: string
  error?: string
}

type WorkerStatus = 'uninitialized' | 'initializing' | 'ready' | 'error'

let workerStatus: WorkerStatus = 'uninitialized'
let workerInstance: import('tesseract.js').Worker | null = null
let currentLanguage = ''

export function getWorkerStatus(): WorkerStatus {
  return workerStatus
}

export async function initOcrWorker(language = 'eng'): Promise<void> {
  if (workerStatus === 'ready' && currentLanguage === language) return
  if (workerStatus === 'initializing') {
    // Wait for initialization
    await new Promise<void>(resolve => {
      const check = setInterval(() => {
        if (workerStatus !== 'initializing') { clearInterval(check); resolve() }
      }, 200)
    })
    const statusAfterWait: string = workerStatus
    if (statusAfterWait === 'ready' && currentLanguage === language) return
  }

  workerStatus = 'initializing'

  try {
    if (workerInstance) {
      await workerInstance.terminate()
      workerInstance = null
    }

    const Tesseract = await import('tesseract.js')
    const worker = await Tesseract.createWorker(language, 1, {
      // Using CDN for language data — explicit fallback if local models unavailable
      langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast',
      logger: () => {}, // Suppress console noise
    })

    workerInstance = worker
    currentLanguage = language
    workerStatus = 'ready'
  } catch (err) {
    workerStatus = 'error'
    throw new Error(`OCR worker initialization failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function recognizeImage(imageData: string | Blob): Promise<OcrResult> {
  if (workerStatus !== 'ready' || !workerInstance) {
    await initOcrWorker('eng')
  }
  if (!workerInstance) {
    return { text: '', language: currentLanguage, error: 'OCR worker not available' }
  }

  try {
    const result = await workerInstance.recognize(imageData)
    return {
      text: result.data.text,
      confidence: result.data.confidence,
      language: currentLanguage,
    }
  } catch (err) {
    return {
      text: '',
      language: currentLanguage,
      error: `OCR recognition failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

export async function ocrPdfPage(file: File, pageNum: number): Promise<OcrResult> {
  try {
    const pdfjsLib = await import('pdfjs-dist')
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
    }

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const page = await pdf.getPage(pageNum)

    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!

    await page.render({ canvasContext: ctx, viewport }).promise

    // Convert canvas to blob for OCR
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas to blob failed')), 'image/png')
    })

    return recognizeImage(blob)
  } catch (err) {
    return {
      text: '',
      language: currentLanguage || 'eng',
      error: `PDF page OCR failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

export async function terminateOcrWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.terminate()
    workerInstance = null
    workerStatus = 'uninitialized'
    currentLanguage = ''
  }
}
