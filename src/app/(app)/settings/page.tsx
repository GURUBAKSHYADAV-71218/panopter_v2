'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/useToast'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Settings } from 'lucide-react'

type TabId = 'preferences'

export default function SettingsPage() {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)

  // Preferences
  const [language, setLanguage] = useState('en')
  const [ocrLang, setOcrLang] = useState('eng')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLanguage(localStorage.getItem('panopter:language') ?? 'en')
      setOcrLang(localStorage.getItem('panopter:ocr-language') ?? 'eng')
    }
    setLoading(false)
  }, [])

  function savePreferences() {
    localStorage.setItem('panopter:language', language)
    localStorage.setItem('panopter:ocr-language', ocrLang)
    addToast({ type: 'success', title: 'Preferences saved' })
  }

  if (loading) return <PageLoader />

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-p-text text-xl font-bold">Settings</h1>
        <p className="text-p-text-3 text-sm mt-0.5">Configure your Panopter preferences</p>
      </div>

      <div className="bg-p-surface border border-p-border rounded-xl p-6 space-y-5">
        <h2 className="text-p-text font-semibold flex items-center gap-2">
          <Settings className="w-4 h-4 text-p-crimson" /> Preferences
        </h2>

        <div>
          <label className="block text-p-text-2 text-sm mb-1.5">Interface language</label>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="w-full bg-p-bg border border-p-border rounded-lg px-4 py-2.5 text-p-text focus:outline-none focus:border-p-crimson"
          >
            <option value="en">English</option>
            <option value="hi">Hindi (हिंदी)</option>
          </select>
        </div>

        <div>
          <label className="block text-p-text-2 text-sm mb-1.5">OCR language</label>
          <select
            value={ocrLang}
            onChange={e => setOcrLang(e.target.value)}
            className="w-full bg-p-bg border border-p-border rounded-lg px-4 py-2.5 text-p-text focus:outline-none focus:border-p-crimson"
          >
            <option value="eng">English only</option>
            <option value="hin+eng">Hindi + English</option>
            <option value="eng+hin+fra">Multi-language (slower)</option>
          </select>
          <p className="text-p-text-3 text-xs mt-1">
            Used when processing scanned documents or images. Models are loaded from CDN on first use.
          </p>
        </div>

        <button
          onClick={savePreferences}
          className="px-6 py-2.5 bg-p-crimson hover:bg-p-crimson-2 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Save Preferences
        </button>
      </div>

      <div className="bg-p-surface border border-p-border rounded-xl p-6 space-y-3">
        <h2 className="text-p-text font-semibold">About</h2>
        <div className="text-p-text-2 text-sm space-y-1">
          <p><span className="text-p-text-3">Application:</span> Panopter — DataOps Innovation</p>
          <p><span className="text-p-text-3">Storage:</span> Local (browser localStorage)</p>
          <p><span className="text-p-text-3">Version:</span> v1.0 — Hackathon Edition</p>
        </div>
      </div>
    </div>
  )
}
