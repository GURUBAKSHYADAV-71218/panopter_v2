'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import {
  Plus, FileText, AlertTriangle, TrendingUp, Clock,
  ArrowRight, BarChart2, Eye, Layers
} from 'lucide-react'
import type { Investigation, ActivityLog, Finding } from '@/types'
import {
  isDemoMode,
  DEMO_INVESTIGATION,
  DEMO_FINDINGS,
  DEMO_DOCUMENTS,
} from '@/lib/demo/demoData'

interface Stats {
  totalInvestigations: number
  documentsProcessed: number
  findingsGenerated: number
  needsReviewCount: number
}

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

// ─── Demo data helpers ────────────────────────────────────────────────────────

function buildDemoState() {
  const priorityCounts: Record<string, number> = { critical: 0, high: 0, moderate: 0, low: 0 }
  DEMO_FINDINGS.forEach(f => { if (f.priority_level in priorityCounts) priorityCounts[f.priority_level]++ })

  const stats: Stats = {
    totalInvestigations: 1,
    documentsProcessed: DEMO_DOCUMENTS.length,
    findingsGenerated: DEMO_FINDINGS.length,
    needsReviewCount: DEMO_FINDINGS.filter(f => f.review_status === 'needs_review').length,
  }

  const investigations = [{
    ...DEMO_INVESTIGATION,
    finding_count: DEMO_FINDINGS.length,
  }]

  const activity: ActivityLog[] = [
    {
      id: 'act-1',
      investigation_id: DEMO_INVESTIGATION.id,
      user_id: 'demo-user',
      activity_type: 'finding_generated',
      description: '[DEMO] Critical finding: Invoice amount exceeds PO total by ₹35,000',
      metadata: null,
      created_at: DEMO_FINDINGS[0].created_at,
    },
    {
      id: 'act-2',
      investigation_id: DEMO_INVESTIGATION.id,
      user_id: 'demo-user',
      activity_type: 'document_processing_completed',
      description: '[DEMO] 3 documents processed — Purchase Order, Invoice, Delivery Receipt',
      metadata: null,
      created_at: DEMO_DOCUMENTS[2].created_at,
    },
    {
      id: 'act-3',
      investigation_id: DEMO_INVESTIGATION.id,
      user_id: 'demo-user',
      activity_type: 'investigation_created',
      description: '[DEMO] Investigation created: Vendor Payment Verification',
      metadata: null,
      created_at: DEMO_INVESTIGATION.created_at,
    },
  ]

  return { stats, investigations, activity, priorityCounts }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [investigations, setInvestigations] = useState<(Investigation & { finding_count: number })[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [priorityCounts, setPriorityCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    if (isDemoMode()) {
      const { stats: s, investigations: invs, activity: act, priorityCounts: pc } = buildDemoState()
      setStats(s)
      setInvestigations(invs as (Investigation & { finding_count: number })[])
      setActivity(act)
      setPriorityCounts(pc)
      setUserName('Demo User')
      setLoading(false)
      return
    }

    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get profile name
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setUserName((profile as { full_name: string } | null)?.full_name ?? user.email ?? '')

      const [
        { count: invCount },
        { count: docCount },
        { count: findCount },
        { count: reviewCount },
        { data: recentInv },
        { data: recentActivity },
        { data: findings },
      ] = await Promise.all([
        supabase.from('investigations').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('documents').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('processing_status', 'completed'),
        supabase.from('findings').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('findings').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('review_status', 'needs_review'),
        supabase.from('investigations').select('id, name, status, created_at, updated_at, description').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('activity_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
        supabase.from('findings').select('priority_level').eq('user_id', user.id),
      ])

      setStats({
        totalInvestigations: invCount ?? 0,
        documentsProcessed: docCount ?? 0,
        findingsGenerated: findCount ?? 0,
        needsReviewCount: reviewCount ?? 0,
      })

      // Attach finding counts to investigations
      if (recentInv) {
        const withCounts = await Promise.all(recentInv.map(async (inv) => {
          const { count } = await supabase.from('findings').select('*', { count: 'exact', head: true }).eq('investigation_id', inv.id)
          return { ...inv, finding_count: count ?? 0 }
        }))
        setInvestigations(withCounts as (Investigation & { finding_count: number })[])
      }

      setActivity(recentActivity as ActivityLog[] ?? [])

      // Priority breakdown
      const counts: Record<string, number> = { critical: 0, high: 0, moderate: 0, low: 0 }
      ;(findings as Finding[] ?? []).forEach(f => { if (f.priority_level in counts) counts[f.priority_level]++ })
      setPriorityCounts(counts)
      setLoading(false)
    }
    load()
  }, [])

  const firstName = userName.split(' ')[0] || userName.split('@')[0] || 'there'

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
        ) : (
          <>
            <StatCard label="Total Investigations" value={stats?.totalInvestigations ?? 0} icon={Layers} color="bg-p-accent/30 text-p-crimson" />
            <StatCard label="Documents Processed" value={stats?.documentsProcessed ?? 0} icon={FileText} color="bg-p-info/30 text-p-info-2" />
            <StatCard label="Findings Generated" value={stats?.findingsGenerated ?? 0} icon={AlertTriangle} color="bg-p-warning/30 text-p-warning-2" />
            <StatCard label="Needs Review" value={stats?.needsReviewCount ?? 0} icon={Eye} color="bg-p-error/30 text-p-error-2" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Investigations */}
        <div className="lg:col-span-2 bg-p-surface border border-p-border rounded-p-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-p-border">
            <h2 className="font-semibold text-p-text text-sm">Recent Investigations</h2>
            <Link href="/investigations" className="text-xs text-p-crimson hover:text-p-crimson-2 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-p-border">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-4 animate-pulse flex gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-p-border rounded" />
                    <div className="h-3 w-32 bg-p-border rounded" />
                  </div>
                </div>
              ))
            ) : investigations.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Layers className="w-8 h-8 text-p-text-3 mx-auto mb-2" />
                <p className="text-p-text-2 text-sm font-medium">No investigations yet</p>
                <p className="text-p-text-3 text-xs mt-1">Create your first investigation to get started.</p>
                <Link href="/investigations/new" className="inline-flex items-center gap-1.5 mt-3 text-xs text-p-crimson hover:text-p-crimson-2 font-medium transition-colors">
                  <Plus className="w-3.5 h-3.5" /> New Investigation
                </Link>
              </div>
            ) : (
              investigations.map(inv => (
                <Link key={inv.id} href={`/investigations/${inv.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-p-surface-2 transition-colors group">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-p-text truncate group-hover:text-p-crimson transition-colors">{inv.name}</span>
                      <StatusBadge status={inv.status as never} />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-p-text-3">{inv.finding_count} finding{inv.finding_count !== 1 ? 's' : ''}</span>
                      <span className="text-xs text-p-text-3">{timeAgo(inv.created_at)}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-p-text-3 group-hover:text-p-crimson shrink-0 ml-3 transition-colors" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Priority Overview */}
          <div className="bg-p-surface border border-p-border rounded-p-lg">
            <div className="px-5 py-4 border-b border-p-border">
              <h2 className="font-semibold text-p-text text-sm flex items-center gap-2"><BarChart2 className="w-4 h-4 text-p-crimson" /> Finding Priority</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              {[
                { level: 'critical', label: 'Critical', color: 'bg-p-critical', textColor: 'text-p-critical' },
                { level: 'high', label: 'High', color: 'bg-p-high', textColor: 'text-p-high' },
                { level: 'moderate', label: 'Moderate', color: 'bg-p-moderate', textColor: 'text-p-moderate' },
                { level: 'low', label: 'Low', color: 'bg-p-low', textColor: 'text-p-low' },
              ].map(({ level, label, color, textColor }) => {
                const count = priorityCounts[level] ?? 0
                const total = Object.values(priorityCounts).reduce((a, b) => a + b, 0)
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={level}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={`font-medium ${textColor}`}>{label}</span>
                      <span className="text-p-text-3">{count}</span>
                    </div>
                    <div className="h-1.5 bg-p-bg-mid rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              {Object.values(priorityCounts).every(v => v === 0) && (
                <p className="text-xs text-p-text-3 text-center py-2">No findings yet</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-p-surface border border-p-border rounded-p-lg">
            <div className="px-5 py-4 border-b border-p-border">
              <h2 className="font-semibold text-p-text text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-p-crimson" /> Recent Activity</h2>
            </div>
            <div className="px-5 py-3 space-y-3 max-h-64 overflow-y-auto">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-p-border/40 rounded animate-pulse" />)
              ) : activity.length === 0 ? (
                <p className="text-xs text-p-text-3 text-center py-4">No recent activity</p>
              ) : (
                activity.map(log => (
                  <div key={log.id} className="flex gap-2.5 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-p-crimson/60 mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-p-text-2 leading-snug">{log.description}</p>
                      <p className="text-xs text-p-text-3 mt-0.5">{timeAgo(log.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick links for demo */}
      {!loading && isDemoMode() && (
        <div className="bg-p-surface border border-p-border rounded-p-lg p-5">
          <h2 className="font-semibold text-p-text text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-p-crimson" />
            Demo Quick Links
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href={`/investigations/${DEMO_INVESTIGATION.id}`}
              className="text-xs bg-p-surface-2 border border-p-border hover:border-p-crimson text-p-text-2 hover:text-p-crimson px-3 py-1.5 rounded-p transition-colors">
              View Demo Investigation →
            </Link>
            <Link href={`/investigations/${DEMO_INVESTIGATION.id}/findings`}
              className="text-xs bg-p-surface-2 border border-p-border hover:border-p-crimson text-p-text-2 hover:text-p-crimson px-3 py-1.5 rounded-p transition-colors">
              View Demo Findings →
            </Link>
            <Link href={`/investigations/${DEMO_INVESTIGATION.id}/documents`}
              className="text-xs bg-p-surface-2 border border-p-border hover:border-p-crimson text-p-text-2 hover:text-p-crimson px-3 py-1.5 rounded-p transition-colors">
              View Demo Documents →
            </Link>
            <Link href={`/investigations/${DEMO_INVESTIGATION.id}/report`}
              className="text-xs bg-p-surface-2 border border-p-border hover:border-p-crimson text-p-text-2 hover:text-p-crimson px-3 py-1.5 rounded-p transition-colors">
              Generate Demo Report →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
