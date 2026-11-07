'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Search,
  FileText,
  AlertTriangle,
  Network,
  Clock,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  user: { email: string; full_name: string | null }
}

// ─── Navigation definition ───────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/investigations', label: 'Investigations',  icon: Search },
  { href: '/documents',      label: 'Documents',       icon: FileText },
  { href: '/findings',       label: 'Findings',        icon: AlertTriangle },
  { href: '/relationships',  label: 'Relationships',   icon: Network },
  { href: '/timeline',       label: 'Timeline',        icon: Clock },
  { href: '/reports',        label: 'Reports',         icon: FileBarChart },
  { href: '/settings',       label: 'Settings',        icon: Settings },
]

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

// ─── Single nav item ─────────────────────────────────────────────────────────

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
}) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={[
        'relative flex items-center gap-3 px-3 py-2.5 rounded-p transition-colors duration-150 group',
        'border-l-2',
        active
          ? 'bg-p-accent text-p-text border-p-crimson'
          : 'text-p-text-2 border-transparent hover:bg-p-surface-2 hover:text-p-text',
      ].join(' ')}
    >
      <Icon className="w-5 h-5 shrink-0" />

      {/* Label – hidden when collapsed */}
      <span
        className={[
          'text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300',
          collapsed ? 'w-0 opacity-0' : 'w-full opacity-100',
        ].join(' ')}
      >
        {item.label}
      </span>

      {/* Tooltip for collapsed state */}
      {collapsed && (
        <span
          role="tooltip"
          className={[
            'absolute left-full ml-2 px-2 py-1 text-xs font-medium',
            'bg-p-surface-2 text-p-text border border-p-border rounded-p shadow-p-md',
            'opacity-0 group-hover:opacity-100 pointer-events-none',
            'transition-opacity duration-150 whitespace-nowrap z-50',
          ].join(' ')}
        >
          {item.label}
        </span>
      )}
    </Link>
  )
}

// ─── Sidebar component ───────────────────────────────────────────────────────

export function Sidebar({ collapsed, onToggle, user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = getInitials(user.email, user.full_name)
  const displayName = user.full_name ?? user.email

  return (
    <aside
      className={[
        'relative flex flex-col h-screen bg-p-sidebar border-r border-p-border',
        'transition-[width] duration-300 ease-in-out overflow-hidden shrink-0',
        collapsed ? 'w-[60px]' : 'w-[240px]',
      ].join(' ')}
    >
      {/* ── Logo ──────────────────────────────────────────────────────── */}
      <div
        className={[
          'flex items-center h-14 border-b border-p-border shrink-0',
          collapsed ? 'justify-center px-0' : 'px-4 gap-2',
        ].join(' ')}
      >
        {/* Logo mark */}
        <div className="w-7 h-7 rounded-p bg-p-crimson flex items-center justify-center shrink-0">
          <span className="text-p-text text-xs font-black select-none">P</span>
        </div>

        <span
          className={[
            'text-p-text font-bold text-base tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300',
            collapsed ? 'w-0 opacity-0' : 'w-full opacity-100',
          ].join(' ')}
        >
          Panopter
        </span>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <NavLink
              key={item.href}
              item={item}
              active={active}
              collapsed={collapsed}
            />
          )
        })}
      </nav>

      {/* ── User + controls ───────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-p-border px-2 py-3 space-y-1">
        {/* User row */}
        <div
          className={[
            'flex items-center gap-3 px-2 py-2 rounded-p',
            collapsed ? 'justify-center' : '',
          ].join(' ')}
          title={collapsed ? displayName : undefined}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-p-accent flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-p-text select-none">
              {initials}
            </span>
          </div>

          <div
            className={[
              'flex flex-col min-w-0 overflow-hidden transition-all duration-300',
              collapsed ? 'w-0 opacity-0' : 'w-full opacity-100',
            ].join(' ')}
          >
            <span className="text-xs font-semibold text-p-text truncate leading-tight">
              {displayName}
            </span>
            <span className="text-xs text-p-text-3 truncate leading-tight">
              {user.email}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={[
            'flex items-center gap-3 w-full px-3 py-2 rounded-p',
            'text-p-text-2 hover:bg-p-surface-2 hover:text-p-error-2',
            'transition-colors duration-150 text-sm',
            collapsed ? 'justify-center' : '',
          ].join(' ')}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span
            className={[
              'whitespace-nowrap overflow-hidden transition-all duration-300',
              collapsed ? 'w-0 opacity-0' : 'w-full opacity-100',
            ].join(' ')}
          >
            Sign out
          </span>
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={[
            'flex items-center gap-2 w-full px-3 py-2 rounded-p',
            'text-p-text-3 hover:bg-p-surface-2 hover:text-p-text',
            'transition-colors duration-150 text-xs',
            collapsed ? 'justify-center' : '',
          ].join(' ')}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
