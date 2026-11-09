'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import {
  Plus, FileText, AlertTriangle, TrendingUp, Clock,
  ArrowRight, BarChart2, Eye, Layers
} from 'lucide-react'
import type { Investigation, ActivityLog, Finding } from '@/types'
import { investigationsStore, findingsStore, activityLogsStore, documentsStore, statsStore } from '@/lib/store'

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string
}) {
  return (
    <div className="bg-p-surface border border-p-border rounded-p-lg p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-p flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-p-text">{value.toLocaleString()}</p>
        <p className="text-xs text-p-text-3 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-p-surface border border-p-border rounded-p-lg p-5 animate-pulse">
      <div className="h-8 w-16 bg-p-border rounded mb-2" />
      <div className="h-3 w-28 bg-p-border rounded" />
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Stats {
  totalInvestigations: number
  documentsProcessed: number
  findingsGenerated: number
  needsReviewCount: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [investigations, setInvestigations] = useState<(Investigation & { finding_count: number })[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [priorityCounts, setPriorityCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const s = statsStore.get()
    setStats({
      totalInvestigations: s.totalInvestigations,
      documentsProcessed: s.documentsProcessed,
      findingsGenerated: s.findingsGenerated,
      needsReviewCount: s.needsReviewCount,
    })
    setPriorityCounts(s.priorityCounts)

    const invList = investigationsStore.list().slice(0, 5).map(inv => ({
      ...inv,
      finding_count: findingsStore.list(inv.id).length,
    }))
    setInvestigations(invList as (Investigation & { finding_count: number })[])

    setActivity(activityLogsStore.list(8))
    setLoading(false)
  }, [])

  const firstName = 'there'

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-p-text">Welcome back, {firstName}</h1>
          <p className="text-p-text-3 text-sm mt-1">Here is what is happening with your investigations.</p>
        </div>
        <Link
          href="/investigations/new"
          className="flex items-center gap-2 bg-p-crimson hover:bg-p-crimson-2 text-white text-sm font-semibold px-4 py-2 rounded-p transition-colors"
        >
          <Plus className="w-4 h-4" /> New Investigation
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : stats ? (
          <>
            <StatCard label="Investigations" value={stats.totalInvestigations} icon={Layers} color="bg-p-accent text-p-crimson" />
            <StatCard label="Documents Processed" value={stats.documentsProcessed} icon={FileText} color="bg-p-info/20 text-p-info-2" />
            <StatCard label="Findings" value={stats.findingsGenerated} icon={AlertTriangle} color="bg-p-warning/20 text-p-warning-2" />
            <StatCard label="Needs Review" value={stats.needsReviewCount} icon={Eye} color="bg-p-critical/20 text-p-critical" />
          </>
        ) : null}
      </div>

      {/* Priority breakdown */}
      {!loading && stats && stats.findingsGenerated > 0 && (
        <div className="bg-p-surface border border-p-border rounded-p-lg p-5">
          <h2 className="font-semibold text-p-text text-sm flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-p-crimson" /> Finding Priority Breakdown
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {(['critical', 'high', 'moderate', 'low'] as const).map(level => (
              <div key={level} className="text-center">
                <div className={`text-xl font-bold ${
                  level === 'critical' ? 'text-p-critical' :
                  level === 'high' ? 'text-p-high' :
                  level === 'moderate' ? 'text-p-moderate' : 'text-p-low'
                }`}>{priorityCounts[level] ?? 0}</div>
                <div className="text-xs text-p-text-3 capitalize mt-0.5">{level}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Investigations */}
        <div className="bg-p-surface border border-p-border rounded-p-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-p-border">
            <h2 className="font-semibold text-p-text text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-p-crimson" /> Recent Investigations
            </h2>
            <Link href="/investigations" className="text-xs text-p-crimson hover:text-p-crimson-2 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {investigations.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-p-text-3 text-sm">No investigations yet.</p>
              <Link href="/investigations/new" className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-p-crimson hover:text-p-crimson-2">
                <Plus className="w-3.5 h-3.5" /> Create one
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-p-border">
              {investigations.map(inv => (
                <Link key={inv.id} href={`/investigations/${inv.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-p-surface-2 transition-colors group">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-p-text group-hover:text-p-crimson transition-colors truncate">{inv.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <StatusBadge status={inv.status as never} />
                      <span className="text-xs text-p-text-3">{inv.finding_count} findings</span>
                      <span className="text-xs text-p-text-3 flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(inv.created_at)}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-p-text-3 group-hover:text-p-crimson shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-p-surface border border-p-border rounded-p-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-p-border">
            <h2 className="font-semibold text-p-text text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-p-crimson" /> Recent Activity
            </h2>
          </div>
          {activity.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-p-text-3 text-sm">No activity yet. Start by creating an investigation.</p>
            </div>
          ) : (
            <div className="divide-y divide-p-border">
              {activity.map(log => (
                <div key={log.id} className="px-5 py-3.5 flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-p-crimson mt-2 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-p-text-2 leading-snug">{log.description}</p>
                    <p className="text-xs text-p-text-3 mt-0.5">{timeAgo(log.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
