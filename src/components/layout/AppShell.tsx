'use client'

import React, { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { ToastProvider } from '@/components/ui/ToastContext'
import { ToastContainer } from '@/components/ui/Toast'
import type { User } from '@/types'

// ─── Props ───────────────────────────────────────────────────────────────────

interface AppShellProps {
  user: User
  children: React.ReactNode
}

const SIDEBAR_KEY = 'panopter:sidebar-collapsed'

// ─── Component ───────────────────────────────────────────────────────────────

export function AppShell({ user, children }: AppShellProps) {
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
