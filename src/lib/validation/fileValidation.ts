import {
  SUPPORTED_FILE_TYPES,
  SUPPORTED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
} from '@/constants'
import type { FileValidationResult } from '@/types'

/**
 * Validates a file for upload.
 * Checks: extension, MIME type, size, and emptiness.
 */
export function validateFile(file: File): FileValidationResult {
  if (file.size === 0) {
    return { valid: false, error: 'File is empty. Please select a non-empty file.' }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1)
    return {
      valid: false,
      error: `File is too large (${sizeMB} MB). Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`,
    }
  }

  // Check MIME type
  if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type (${file.type || 'unknown'}). Supported: PDF, JPG, PNG.`,
    }
  }

  // Check extension
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file extension (${ext}). Supported: .pdf, .jpg, .jpeg, .png.`,
    }
  }

  return {
    valid: true,
    mimeType: file.type,
    fileSize: file.size,
  }
}

/**
 * Formats a file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * Returns a friendly label for a MIME type.
 */
export function getMimeTypeLabel(mimeType: string): string {
  const labels: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPEG Image',
    'image/png': 'PNG Image',
  }
  return labels[mimeType] ?? mimeType
}
