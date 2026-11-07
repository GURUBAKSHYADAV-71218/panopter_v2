/**
 * SHA-256 file hashing using Web Crypto API.
 * Returns hex string or null if hashing fails.
 */
export async function computeFileHash(file: File): Promise<string | null> {
  try {
    if (!window.crypto?.subtle) {
      // eslint-disable-next-line no-console
      console.warn('Web Crypto API not available — skipping hash computation')
      return null
    }

    const buffer = await file.arrayBuffer()
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('File hashing failed:', error)
    return null
  }
}

/**
 * Detect duplicate files within a list by comparing SHA-256 hashes.
 * Returns a map of file index → original file index (if duplicate).
 */
export function detectDuplicates(
  hashes: (string | null)[]
): Map<number, number> {
  const duplicates = new Map<number, number>()
  const seen = new Map<string, number>()

  hashes.forEach((hash, index) => {
    if (hash === null) return // Cannot determine — skip
    const originalIndex = seen.get(hash)
    if (originalIndex !== undefined) {
      duplicates.set(index, originalIndex)
    } else {
      seen.set(hash, index)
    }
  })

  return duplicates
}
