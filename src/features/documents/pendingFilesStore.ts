// Simple in-memory store for files pending processing (browser session only)
// Files are keyed by their documentId from the database

const pendingFiles = new Map<string, File>()

export function storePendingFile(documentId: string, file: File): void {
  pendingFiles.set(documentId, file)
}

export function getPendingFile(documentId: string): File | null {
  return pendingFiles.get(documentId) ?? null
}

export function hasPendingFiles(): boolean {
  return pendingFiles.size > 0
}

export function clearPendingFile(documentId: string): void {
  pendingFiles.delete(documentId)
}

export function getAllPendingDocumentIds(): string[] {
  return Array.from(pendingFiles.keys())
}
