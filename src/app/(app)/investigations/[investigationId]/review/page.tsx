'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ArrowLeft, PenLine, Trash2, Save, MessageSquare, AlertCircle } from 'lucide-react'
import type { InvestigationNote } from '@/types'
import { isDemoMode, DEMO_INVESTIGATION_ID, DEMO_INVESTIGATION } from '@/lib/demo/demoData'

export default function ReviewPage() {
  const params = useParams()
  const router = useRouter()
  const { addToast } = useToast()
  const investigationId = params.investigationId as string

  const [notes, setNotes] = useState<InvestigationNote[]>([])
  const [invName, setInvName] = useState('')
  const [loading, setLoading] = useState(true)
  const [noteContent, setNoteContent] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const isDemo = isDemoMode() && investigationId === DEMO_INVESTIGATION_ID

  const load = useCallback(async () => {
    if (isDemo) {
      setInvName(DEMO_INVESTIGATION.name)
      setNotes([])
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: inv }, { data: n }] = await Promise.all([
      supabase.from('investigations').select('name').eq('id', investigationId).single(),
      supabase.from('investigation_notes').select('*').eq('investigation_id', investigationId).order('created_at', { ascending: false }),
    ])
    setInvName(inv?.name ?? '')
    setNotes((n ?? []) as InvestigationNote[])
    setLoading(false)
  }, [investigationId, router, isDemo])

  useEffect(() => { load() }, [load])

  async function addNote() {
    const content = noteContent.trim()
    if (!content) return
    setSavingNote(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data, error } = await supabase.from('investigation_notes').insert({
      investigation_id: investigationId,
      user_id: user.id,
      content,
    }).select().single()

    setSavingNote(false)
    if (error) {
      addToast({ type: 'error', title: 'Failed to save note', message: error.message })
    } else {
      setNoteContent('')
      setNotes(prev => [data as InvestigationNote, ...prev])
      addToast({ type: 'success', title: 'Note added' })
    }
  }

  async function saveEdit(noteId: string) {
    const content = editContent.trim()
    if (!content) return
    const supabase = createClient()
    const { error } = await supabase.from('investigation_notes').update({
      content,
      updated_at: new Date().toISOString(),
    }).eq('id', noteId)

    if (error) {
      addToast({ type: 'error', title: 'Failed to update note' })
    } else {
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content } : n))
      setEditingId(null)
      addToast({ type: 'success', title: 'Note updated' })
    }
  }

  async function deleteNote(noteId: string) {
    const supabase = createClient()
    const { error } = await supabase.from('investigation_notes').delete().eq('id', noteId)
    if (error) {
      addToast({ type: 'error', title: 'Failed to delete note' })
    } else {
      setNotes(prev => prev.filter(n => n.id !== noteId))
      addToast({ type: 'info', title: 'Note deleted' })
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/investigations/${investigationId}`} className="text-p-text-3 hover:text-p-text transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="text-p-text-3 text-xs mb-0.5">{invName}</div>
          <h1 className="text-p-text text-xl font-bold">Investigation Notes</h1>
        </div>
      </div>

      {isDemo && (
        <div className="flex items-start gap-2.5 bg-amber-900/20 border border-amber-700/40 text-amber-300 text-sm rounded-p px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Notes require Supabase credentials to persist. In demo mode, notes are not saved.</p>
        </div>
      )}

      {/* Add note */}
      <div className="bg-p-surface border border-p-border rounded-xl p-5 space-y-3">
        <h2 className="text-p-text font-semibold flex items-center gap-2">
          <PenLine className="w-4 h-4 text-p-crimson" />
          Add Note
        </h2>
        <textarea
          value={noteContent}
          onChange={e => setNoteContent(e.target.value)}
          placeholder={isDemo ? 'Notes are read-only in demo mode…' : 'Record observations, questions, or instructions for review…'}
          rows={4}
          disabled={isDemo}
          className="w-full bg-p-bg border border-p-border rounded-lg px-4 py-3 text-p-text text-sm placeholder:text-p-text-3 focus:outline-none focus:border-p-crimson resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex justify-end">
          <button
            onClick={addNote}
            disabled={savingNote || !noteContent.trim() || isDemo}
            className="flex items-center gap-2 px-4 py-2 bg-p-crimson hover:bg-p-crimson-2 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {savingNote ? 'Saving…' : 'Save Note'}
          </button>
        </div>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-12 h-12" />}
          title="No notes yet"
          description="Add notes to record your investigation observations and review progress."
        />
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="bg-p-surface border border-p-border rounded-xl p-4 space-y-3">
              {editingId === note.id ? (
                <>
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={4}
                    className="w-full bg-p-bg border border-p-border rounded-lg px-4 py-3 text-p-text text-sm focus:outline-none focus:border-p-crimson resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-sm text-p-text-2 hover:text-p-text"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(note.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-p-crimson hover:bg-p-crimson-2 text-white rounded-lg text-sm transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" /> Save
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-p-text text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-p-text-3 text-xs">
                      {new Date(note.created_at).toLocaleString('en-IN')}
                      {note.updated_at !== note.created_at && ' (edited)'}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditingId(note.id); setEditContent(note.content) }}
                        className="p-1.5 text-p-text-3 hover:text-p-text hover:bg-p-surface-2 rounded-lg transition-colors"
                      >
                        <PenLine className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1.5 text-p-text-3 hover:text-p-error-2 hover:bg-p-error/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
