'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { validateFile, formatFileSize } from '@/lib/validation/fileValidation'
import { computeFileHash, detectDuplicates } from '@/lib/hashing'
import { useToast } from '@/hooks/useToast'
import { Upload, X, AlertCircle, CheckCircle, FileText, Image as ImageIcon, Loader2, ChevronRight, ArrowLeft } from 'lucide-react'
import type { UploadedFile } from '@/types'
import { MAX_FILES_PER_INVESTIGATION } from '@/constants'
import { storePendingFile } from '@/features/documents/pendingFilesStore'
import { isDemoMode } from '@/lib/demo/demoData'

type Step = 1 | 2 | 3

function FileIcon({ type }: { type: string }) {
  if (type === 'application/pdf') return <FileText className="w-5 h-5 text-p-crimson" aria-hidden="true" />
  return <ImageIcon className="w-5 h-5 text-p-info-2" aria-hidden="true" />
}

export default function NewInvestigationPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [step, setStep] = useState<Step>(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [creating, setCreating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(async (rawFiles: FileList | File[]) => {
    const arr = Array.from(rawFiles)
    const remaining = MAX_FILES_PER_INVESTIGATION - files.length
    const toAdd = arr.slice(0, remaining)

    const newEntries: UploadedFile[] = toAdd.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f,
      name: f.name,
      size: f.size,
      type: f.type,
      hash: null,
      hashStatus: 'computing',
      validationStatus: 'pending',
      isDuplicate: false,
    }))

    setFiles(prev => {
      const updated = [...prev, ...newEntries]
      return updated
    })

    // Validate and hash each file
    for (const entry of newEntries) {
      const validation = validateFile(entry.file)
      const hash = validation.valid ? await computeFileHash(entry.file) : null

      setFiles(prev => {
        const updated = prev.map(f =>
          f.id === entry.id
            ? { ...f, hash, hashStatus: 'done' as const, validationStatus: validation.valid ? 'valid' as const : 'invalid' as const, validationError: validation.error }
            : f
        )
        // Detect duplicates across all files
        const hashes = updated.map(f => f.hash)
        const dupes = detectDuplicates(hashes)
        return updated.map((f, i) => ({
          ...f,
          isDuplicate: dupes.has(i),
          duplicateOf: dupes.has(i) ? updated[dupes.get(i)!]?.name : undefined,
        }))
      })
    }

    if (arr.length > remaining) {
      addToast({ type: 'warning', title: 'File limit reached', message: `Maximum ${MAX_FILES_PER_INVESTIGATION} files per investigation.` })
    }
  }, [files.length, addToast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files)
  }, [processFiles])

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id))

  const validFiles = files.filter(f => f.validationStatus === 'valid' && !f.isDuplicate)
  const canProceedStep1 = name.trim().length >= 2
  const canProceedStep2 = validFiles.length >= 1

  async function createInvestigation() {
    if (isDemoMode()) {
      addToast({
        type: 'warning',
        title: 'Demo mode — write disabled',
        message: 'Creating investigations requires Supabase credentials. Configure .env.local to enable this feature.',
      })
      return
    }

    setCreating(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: inv, error: invErr } = await supabase.from('investigations').insert({
        user_id: user.id, name: name.trim(), description: description.trim() || null, status: 'draft'
      }).select().single()
      if (invErr || !inv) throw new Error(invErr?.message ?? 'Failed to create investigation')

      const docInserts = validFiles.map(f => ({
        investigation_id: inv.id,
        user_id: user.id,
        file_name: f.name,
        file_type: f.type,
        file_size: f.size,
        file_hash: f.hash,
        processing_status: 'pending',
        document_type: 'unknown',
      }))
      const { data: docs, error: docErr } = await supabase.from('documents').insert(docInserts).select()
      if (docErr) throw new Error(docErr.message)

      // Store pending files in memory store for processing page
      docs?.forEach((doc, i) => {
        const uploadedFile = validFiles[i]
        if (uploadedFile) storePendingFile(doc.id, uploadedFile.file)
      })

      await supabase.from('activity_logs').insert({
        user_id: user.id,
        investigation_id: inv.id,
        activity_type: 'investigation_created',
        description: `Investigation "${name.trim()}" created with ${validFiles.length} document${validFiles.length !== 1 ? 's' : ''}`,
      })

      addToast({ type: 'success', title: 'Investigation created', message: 'Ready to process documents.' })
      router.push(`/investigations/${inv.id}`)
    } catch (err) {
      addToast({ type: 'error', title: 'Creation failed', message: err instanceof Error ? err.message : 'Unknown error' })
      setCreating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-p text-p-text-3 hover:text-p-text hover:bg-p-surface-2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-p-text">New Investigation</h1>
          <p className="text-p-text-3 text-sm">Upload documents and let Panopter analyse them for inconsistencies.</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= s ? 'bg-p-crimson text-white' : 'bg-p-surface-2 text-p-text-3 border border-p-border'}`}>{s}</div>
            <span className={`text-xs font-medium ${step >= s ? 'text-p-text' : 'text-p-text-3'}`}>{['Details', 'Documents', 'Review'][i]}</span>
            {i < 2 && <ChevronRight className="w-3 h-3 text-p-text-3 mx-1" />}
          </div>
        ))}
      </div>

      <div className="bg-p-surface border border-p-border rounded-p-lg p-6">
        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-p-text">Investigation Details</h2>
            <div>
              <label className="block text-p-text-2 text-sm font-medium mb-1.5">Investigation Name <span className="text-p-crimson">*</span></label>
              <input value={name} onChange={e => { setName(e.target.value); setNameError('') }}
                placeholder="e.g. Vendor Payment Verification Q4 2026"
                className={`w-full bg-p-bg-mid border rounded-p px-3 py-2.5 text-sm text-p-text placeholder:text-p-text-3 focus:outline-none focus:border-p-crimson transition-colors ${nameError ? 'border-p-error-2' : 'border-p-border'}`}
              />
              {nameError && <p className="text-p-error-2 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{nameError}</p>}
            </div>
            <div>
              <label className="block text-p-text-2 text-sm font-medium mb-1.5">Description <span className="text-p-text-3 font-normal">(optional)</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="Brief description of the investigation scope…"
                className="w-full bg-p-bg-mid border border-p-border rounded-p px-3 py-2.5 text-sm text-p-text placeholder:text-p-text-3 focus:outline-none focus:border-p-crimson transition-colors resize-none"
              />
            </div>
            <button onClick={() => { if (!name.trim() || name.trim().length < 2) { setNameError('Name must be at least 2 characters.'); return } setStep(2) }}
              className="w-full bg-p-crimson hover:bg-p-crimson-2 text-white font-semibold text-sm py-2.5 rounded-p transition-colors flex items-center justify-center gap-2">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-p-text">Upload Documents</h2>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-p-lg p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-p-crimson bg-p-crimson/5' : 'border-p-border hover:border-p-border-2 bg-p-bg-mid'}`}
            >
              <Upload className="w-8 h-8 text-p-text-3 mx-auto mb-2" />
              <p className="text-sm font-medium text-p-text-2">Drop files here or <span className="text-p-crimson">browse</span></p>
              <p className="text-xs text-p-text-3 mt-1">PDF, JPG, PNG — max 20 MB each, up to {MAX_FILES_PER_INVESTIGATION} files</p>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                onChange={e => { if (e.target.files) processFiles(e.target.files); e.target.value = '' }} />
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map(f => (
                  <div key={f.id} className={`flex items-start gap-3 p-3 rounded-p border ${f.validationStatus === 'invalid' || f.isDuplicate ? 'border-p-error-2/40 bg-p-error/10' : f.validationStatus === 'valid' ? 'border-p-success-2/30 bg-p-success/10' : 'border-p-border bg-p-bg-mid'}`}>
                    <FileIcon type={f.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-p-text font-medium truncate">{f.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-p-text-3">{formatFileSize(f.size)}</span>
                        {f.hashStatus === 'computing' && <span className="text-xs text-p-text-3 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Validating…</span>}
                        {f.validationStatus === 'invalid' && <span className="text-xs text-p-error-2">{f.validationError}</span>}
                        {f.isDuplicate && <span className="text-xs text-p-error-2">Duplicate of {f.duplicateOf}</span>}
                        {f.validationStatus === 'valid' && !f.isDuplicate && <span className="text-xs text-p-success-2 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Valid</span>}
                      </div>
                    </div>
                    <button onClick={() => removeFile(f.id)} className="p-1 rounded text-p-text-3 hover:text-p-error-2 transition-colors shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 border border-p-border text-p-text-2 hover:bg-p-surface-2 text-sm font-medium py-2.5 rounded-p transition-colors">Back</button>
              <button onClick={() => setStep(3)} disabled={!canProceedStep2}
                className="flex-1 bg-p-crimson hover:bg-p-crimson-2 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 rounded-p transition-colors flex items-center justify-center gap-2">
                Review <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-semibold text-p-text">Review & Create</h2>
            <div className="bg-p-bg-mid rounded-p p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-p-text-3">Name</span><span className="text-p-text font-medium">{name}</span></div>
              {description && <div className="flex justify-between text-sm"><span className="text-p-text-3">Description</span><span className="text-p-text-2 text-xs max-w-xs text-right">{description}</span></div>}
              <div className="flex justify-between text-sm"><span className="text-p-text-3">Documents</span><span className="text-p-text font-medium">{validFiles.length} valid file{validFiles.length !== 1 ? 's' : ''}</span></div>
            </div>
            <div className="space-y-1.5">
              {validFiles.map(f => (
                <div key={f.id} className="flex items-center gap-2 text-sm">
                  <FileIcon type={f.type} />
                  <span className="text-p-text-2 truncate">{f.name}</span>
                  <span className="text-p-text-3 text-xs ml-auto shrink-0">{formatFileSize(f.size)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 border border-p-border text-p-text-2 hover:bg-p-surface-2 text-sm font-medium py-2.5 rounded-p transition-colors">Back</button>
              <button onClick={createInvestigation} disabled={creating}
                className="flex-1 bg-p-crimson hover:bg-p-crimson-2 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-p transition-colors flex items-center justify-center gap-2">
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : 'Create Investigation'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
