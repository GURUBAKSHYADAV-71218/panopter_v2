import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Empty turbopack config — allows the default Turbopack bundler to run
  // without the webpack mismatch warning. PDF.js and Tesseract.js run
  // entirely in the browser and do not require server-side webpack config.
  turbopack: {},

  // Headers required for SharedArrayBuffer (used by Tesseract.js workers)
  async headers() {
    return [
      {
        // Apply COOP/COEP to all app routes for Tesseract.js worker support
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ]
  },
}

export default nextConfig
