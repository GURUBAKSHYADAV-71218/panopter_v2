'use client'

import React, { useId } from 'react'
import { Menu, Search } from 'lucide-react'

// ─── Props ───────────────────────────────────────────────────────────────────

interface TopBarProps {
  user: { email: string; full_name: string | null }
  onSidebarToggle: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(email: string, fullName: string | null): string {
  if (fullName) {
    return fullName
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TopBar({ user, onSidebarToggle }: TopBarProps) {
  const searchId = useId()
  const initials = getInitials(user.email, user.full_name)
  const displayName = user.full_name ?? user.email.split('@')[0]

  return (
    <header className="flex items-center h-14 bg-p-bg-mid border-b border-p-border px-4 gap-4 shrink-0">
      {/* Sidebar toggle */}
      <button
        onClick={onSidebarToggle}
        aria-label="Toggle sidebar"
        className="p-1.5 rounded-p text-p-text-2 hover:bg-p-surface hover:text-p-text transition-colors duration-150"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-xl relative">
        <label htmlFor={searchId} className="sr-only">
          Search investigations
        </label>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-p-text-3 pointer-events-none" />
        <input
          id={searchId}
          type="search"
          placeholder="Search investigations..."
          className={[
            'w-full pl-9 pr-4 py-1.5 text-sm',
            'bg-p-surface border border-p-border rounded-p',
            'text-p-text placeholder:text-p-text-3',
            'focus:outline-none focus:border-p-border-2 focus:ring-1 focus:ring-p-border-2',
            'transition-colors duration-150',
          ].join(' ')}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User identity */}
      <div className="flex items-center gap-2.5">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-p-text leading-tight truncate max-w-[12rem]">
            {displayName}
          </p>
          <p className="text-xs text-p-text-3 leading-tight truncate max-w-[12rem]">
            {user.email}
          </p>
        </div>

        <div
          className="w-8 h-8 rounded-full bg-p-accent flex items-center justify-center shrink-0"
          aria-label={`User: ${displayName}`}
        >
          <span className="text-xs font-bold text-p-text select-none">
            {initials}
          </span>
        </div>
      </div>
    </header>
  )
}
