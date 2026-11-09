'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/hooks/useToast'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ArrowLeft, PenLine, Trash2, Save, MessageSquare } from 'lucide-react'
import type { InvestigationNote } from '@/types'
import { investigationsStore, investigationNotesStore } from '@/lib/store'

export default function ReviewPage() {
  const params = useParams()
  const { addToast } = useToast()
  const investigationId = params.investigationId as string

  const [notes, setNotes] = useState<InvestigationNote[]>([])
  const [invName, setInvName] = useState('')
  const [loading, setLoading] = useState(true)
  const [noteContent, setNoteContent] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const load = useCallback(() => {
    setInvName(investigationsStore.get(investigationId)?.name ?? '')
    setNotes(investigationNotesStore.list(investigationId))
    setLoading(false)
  }, [investigationId])

  useEffect(() => { load() }, [load])

  function addNote() {
    const content = noteContent.trim()
    if (!content) return
    setSavingNote(true)
    const note = investigationNotesStore.create({ investigationId, content })
    setNoteContent('')
    setNotes(prev => [note, ...prev])
    addToast({ type: 'success', title: 'Note added' })
    setSavingNote(false)
  }

  function saveEdit(noteId: string) {
    const content = editContent.trim()
    if (!content) return
    investigationNotesStore.update(noteId, content)
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content } : n))
    setEditingId(null)
    addToast({ type: 'success', title: 'Note updated' })
  }

  function deleteNote(noteId: string) {
    investigationNotesStore.delete(noteId)
    setNotes(prev => prev.filter(n => n.id !== noteId))
    addToast({ type: 'info', title: 'Note deleted' })
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

      {/* New note input */}
      <div className="bg-p-surface border border-p-border rounded-xl p-5 space-y-3">
        <h2 className="text-p-text font-semibold text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-p-crimson" /> Add a Note
        </h2>
        <textarea
          value={noteContent}
          onChange={e => setNoteContent(e.target.value)}
          placeholder="Write an investigation note, observation, or decision…"
          rows={4}
          className="w-full bg-p-bg-mid border border-p-border rounded-p px-3 py-2.5 text-sm text-p-text placeholder:text-p-text-3 focus:outline-none focus:border-p-crimson resize-none"
        />
        <div className="flex justify-end">
          <button
            onClick={addNote}
            disabled={!noteContent.trim() || savingNote}
            className="flex items-center gap-2 bg-p-crimson hover:bg-p-crimson-2 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-p transition-colors"
          >
            <Save className="w-4 h-4" /> Save Note
          </button>
        </div>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-12 h-12" />}
          title="No notes yet"
          description="Add notes, observations or decisions about this investigation."
        />
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="bg-p-surface border border-p-border rounded-xl p-4 space-y-2">
              {editingId === note.id ? (
                <>
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full bg-p-bg-mid border border-p-border rounded-p px-3 py-2 text-sm text-p-text focus:outline-none focus:border-p-crimson resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} className="text-xs text-p-text-3 hover:text-p-text px-3 py-1.5 rounded-p hover:bg-p-surface-2 transition-colors">Cancel</button>
                    <button onClick={() => saveEdit(note.id)} className="text-xs bg-p-crimson hover:bg-p-crimson-2 text-white px-3 py-1.5 rounded-p transition-colors flex items-center gap-1.5">
                      <Save className="w-3 h-3" /> Save
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-p-text-2 text-sm whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-p-text-3">{new Date(note.created_at).toLocaleString('en-IN')}</span>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingId(note.id); setEditContent(note.content) }}
                        className="p-1.5 rounded-p text-p-text-3 hover:text-p-info-2 hover:bg-p-info/10 transition-colors" title="Edit">
                        <PenLine className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteNote(note.id)}
                        className="p-1.5 rounded-p text-p-text-3 hover:text-p-error-2 hover:bg-p-error/10 transition-colors" title="Delete">
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
