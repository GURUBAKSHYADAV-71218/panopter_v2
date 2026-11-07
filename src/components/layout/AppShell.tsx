'use client'

import React, { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { ToastProvider } from '@/components/ui/ToastContext'
import { ToastContainer } from '@/components/ui/Toast'
import type { User } from '@/types'
import { FlaskConical } from 'lucide-react'

// ─── Props ───────────────────────────────────────────────────────────────────

interface AppShellProps {
  user: User
  children: React.ReactNode
  demoMode?: boolean
}

const SIDEBAR_KEY = 'panopter:sidebar-collapsed'

// ─── Component ───────────────────────────────────────────────────────────────

export function AppShell({ user, children, demoMode = false }: AppShellProps) {
  // Initialise from localStorage; default false (expanded)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY)
    if (stored !== null) {
      setSidebarCollapsed(stored === 'true')
    }
    setHydrated(true)
  }, [])

  function handleToggle() {
    setSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_KEY, String(next))
      return next
    })
  }

  // Avoid layout flash before hydration
  if (!hydrated) {
    return (
      <div className="flex h-screen bg-p-bg overflow-hidden items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-p-crimson border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <ToastProvider>
      <div className="flex h-screen bg-p-bg overflow-hidden flex-col">
        {/* Demo mode banner */}
        {demoMode && (
          <div className="shrink-0 flex items-center justify-center gap-2 bg-amber-900/40 border-b border-amber-700/50 text-amber-300 text-xs font-medium py-1.5 px-4">
            <FlaskConical className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              <strong>DEMO MODE</strong> — No Supabase credentials configured. Showing sample data only. Add{' '}
              <code className="font-mono bg-amber-900/60 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> to{' '}
              <code className="font-mono bg-amber-900/60 px-1 rounded">.env.local</code> to enable full functionality.
            </span>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={handleToggle}
            user={user}
          />

          <div className="flex-1 flex flex-col overflow-hidden">
            <TopBar user={user} onSidebarToggle={handleToggle} />

            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </div>

      {/* Toast portal rendered outside main scroll area */}
      <ToastContainer />
    </ToastProvider>
  )
}
