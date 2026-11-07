'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react'
import { useToast } from '@/components/ui/ToastContext'
import type { ToastMessage } from '@/types'

// ─── Icon map ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<ToastMessage['type'], React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 shrink-0 text-p-success-2" />,
  error: <XCircle className="w-5 h-5 shrink-0 text-p-error-2" />,
  warning: <AlertTriangle className="w-5 h-5 shrink-0 text-p-warning-2" />,
  info: <Info className="w-5 h-5 shrink-0 text-p-info-2" />,
}

const BG_MAP: Record<ToastMessage['type'], string> = {
  success: 'bg-p-success border-p-success-2/30',
  error:   'bg-p-error border-p-error-2/30',
  warning: 'bg-p-warning border-p-warning-2/30',
  info:    'bg-p-info border-p-info-2/30',
}

// ─── Single Toast Item ───────────────────────────────────────────────────────

function ToastItem({ toast }: { toast: ToastMessage }) {
  const { removeToast } = useToast()
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Trigger slide-in after mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Auto-dismiss with slide-out
  useEffect(() => {
    const duration = toast.duration ?? 5000
    if (duration <= 0) return

    const dismissAt = duration - 300 // start fade 300 ms before removal
    timerRef.current = setTimeout(() => setVisible(false), dismissAt)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [toast.duration, toast.id])

  function handleClose() {
    setVisible(false)
    setTimeout(() => removeToast(toast.id), 300)
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        'relative flex items-start gap-3 w-80 max-w-full px-4 py-3',
        'rounded-p border shadow-p-md',
        'transition-all duration-300 ease-out',
        BG_MAP[toast.type],
        visible
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-8',
      ].join(' ')}
    >
      {ICON_MAP[toast.type]}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-p-text leading-tight">
          {toast.title}
        </p>
        {toast.message && (
          <p className="mt-0.5 text-xs text-p-text-2 leading-snug">
            {toast.message}
          </p>
        )}
      </div>

      <button
        onClick={handleClose}
        aria-label="Dismiss notification"
        className="shrink-0 p-0.5 rounded text-p-text-3 hover:text-p-text transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Toast Container ─────────────────────────────────────────────────────────

export function ToastContainer() {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  )
}
