'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/hooks/useToast'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { ArrowLeft, Download, FileText, CheckCircle } from 'lucide-react'
import type { Investigation, Document, Finding, FindingEvidence } from '@/types'
import { investigationsStore, documentsStore, findingsStore, findingEvidenceStore } from '@/lib/store'

export default function ReportPage() {
  const params = useParams()
  const investigationId = params.investigationId as string
  const { addToast } = useToast()

  const [investigation, setInvestigation] = useState<Investigation | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [findings, setFindings] = useState<Finding[]>([])
  const [evidence, setEvidence] = useState<FindingEvidence[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const load = useCallback(() => {
    const inv = investigationsStore.get(investigationId)
    setInvestigation(inv)
    setDocuments(documentsStore.list(investigationId))
    const fList = findingsStore.list(investigationId)
    setFindings(fList)
    if (fList.length > 0) {
      setEvidence(findingEvidenceStore.listForFindings(fList.map(f => f.id)))
    }
    setLoading(false)
  }, [investigationId])

  useEffect(() => { load() }, [load])

  // ── PDF download
  async function downloadPDF() {
    if (!investigation) return
    setGenerating(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210, margin = 15, lineH = 7
      let y = 20

      function addLine(text: string, fontSize = 10, color = [220, 220, 220] as [number, number, number]) {
        doc.setFontSize(fontSize)
        doc.setTextColor(...color)
        const lines = doc.splitTextToSize(text, W - margin * 2) as string[]
        lines.forEach((l: string) => {
          if (y > 270) { doc.addPage(); y = 20 }
          doc.text(l, margin, y)
          y += lineH
        })
      }

      function gap(h = 4) { y += h }

      // Header
      doc.setFillColor(30, 20, 30)
      doc.rect(0, 0, W, 40, 'F')
      doc.setFontSize(18)
      doc.setTextColor(220, 50, 50)
      doc.text('PANOPTER', margin, 18)
      doc.setFontSize(10)
      doc.setTextColor(180, 180, 180)
      doc.text('Investigation Report', margin, 26)
      doc.text(investigation.name, margin, 33)
      y = 48

      // Summary
      addLine('INVESTIGATION SUMMARY', 11, [200, 50, 50])
      gap(2)
      addLine(`Investigation: ${investigation.name}`)
      addLine(`Status: ${investigation.status}`)
      addLine(`Created: ${new Date(investigation.created_at).toLocaleDateString('en-IN')}`)
      addLine(`Generated: ${new Date().toLocaleString('en-IN')}`)
      gap(4)
      addLine(`Documents: ${documents.length}`, 10)
      addLine(`Total Findings: ${findings.length}`)
      addLine(`Critical: ${findings.filter(f => f.priority_level === 'critical').length}`)
      addLine(`High: ${findings.filter(f => f.priority_level === 'high').length}`)
      addLine(`Needs Review: ${findings.filter(f => f.review_status === 'needs_review').length}`)
      gap(6)

      // Documents
      addLine('DOCUMENTS', 11, [200, 50, 50])
      gap(2)
      documents.forEach((d, i) => {
        addLine(`${i + 1}. ${d.file_name} [${d.document_type}] — ${d.processing_status}`)
      })
      gap(6)

      // Findings
      addLine('FINDINGS', 11, [200, 50, 50])
      gap(2)
      findings.forEach((f, i) => {
        if (y > 240) { doc.addPage(); y = 20 }
        addLine(`${i + 1}. [${f.priority_level.toUpperCase()}] ${f.title}`, 10, [220, 180, 180])
        addLine(`   Status: ${f.review_status} · Score: ${f.priority_score}/100`, 9, [160, 160, 160])
        addLine(`   ${f.description}`, 9)

        const fev = evidence.filter(e => e.finding_id === f.id)
        fev.forEach(ev => {
          addLine(`   Evidence: ${ev.field_name}: ${ev.observed_value}${ev.compared_value ? ` vs ${ev.compared_value}` : ''}`, 9, [160, 160, 160])
        })
        gap(3)
      })

      gap(8)
      addLine('DISCLAIMER', 9, [200, 50, 50])
      addLine('All findings require human review. This report does not constitute proof of fraud,', 8, [140, 140, 140])
      addLine('forgery, or any other legal conclusion. Engage a qualified professional for legal assessment.', 8, [140, 140, 140])

      doc.save(`panopter-report-${investigationId.slice(0, 8)}.pdf`)
      addToast({ type: 'success', title: 'PDF downloaded' })
    } catch (err) {
      addToast({ type: 'error', title: 'PDF generation failed', message: String(err) })
    } finally {
      setGenerating(false)
    }
  }

  // ── CSV export
  function downloadCSV() {
    const headers = ['id', 'title', 'type', 'priority_level', 'priority_score', 'review_status', 'description', 'created_at']
    const rows = findings.map(f => [
      f.id, f.title, f.finding_type, f.priority_level, f.priority_score, f.review_status,
      `"${f.description.replace(/"/g, '""')}"`, f.created_at,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    downloadBlob(csv, `panopter-findings-${investigationId.slice(0, 8)}.csv`, 'text/csv')
    addToast({ type: 'success', title: 'CSV downloaded' })
  }

  // ── JSON export
  function downloadJSON() {
    const data = { investigation, documents, findings, evidence }
    downloadBlob(JSON.stringify(data, null, 2), `panopter-data-${investigationId.slice(0, 8)}.json`, 'application/json')
    addToast({ type: 'success', title: 'JSON downloaded' })
  }

  function downloadBlob(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: filename })
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <PageLoader />

  const critical = findings.filter(f => f.priority_level === 'critical').length
  const high = findings.filter(f => f.priority_level === 'high').length

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href={`/investigations/${investigationId}`} className="text-p-text-3 hover:text-p-text transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="text-p-text-3 text-xs mb-0.5">{investigation?.name}</div>
            <h1 className="text-p-text text-xl font-bold">Investigation Report</h1>
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={downloadPDF}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-p-crimson hover:bg-p-crimson-2 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            {generating ? 'Generating…' : 'Download PDF'}
          </button>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-p-surface border border-p-border hover:border-p-crimson/50 text-p-text rounded-lg text-sm transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={downloadJSON}
            className="flex items-center gap-2 px-4 py-2 bg-p-surface border border-p-border hover:border-p-crimson/50 text-p-text rounded-lg text-sm transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Report preview */}
      <div className="bg-p-surface border border-p-border rounded-xl divide-y divide-p-border">
        {/* Cover */}
        <div className="p-6 bg-gradient-to-r from-p-bg to-p-surface rounded-t-xl">
          <div className="flex items-center gap-2 text-p-crimson font-bold text-lg mb-1">
            🔍 PANOPTER
          </div>
          <div className="text-p-text text-xl font-semibold mb-1">{investigation?.name}</div>
          <div className="text-p-text-3 text-sm">
            Generated {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Summary stats */}
        <div className="p-6">
          <h2 className="text-p-text font-semibold mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Documents', value: documents.length },
              { label: 'Total Findings', value: findings.length },
              { label: 'Critical', value: critical },
              { label: 'High', value: high },
              { label: 'Needs Review', value: findings.filter(f => f.review_status === 'needs_review').length },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-p-text">{s.value}</div>
                <div className="text-p-text-3 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="px-6 py-3 bg-p-warning/5">
          <p className="text-p-warning-2 text-xs">
            ⚠ All findings require human review. This report does not constitute proof of fraud,
            forgery, or any other legal conclusion.
          </p>
        </div>

        {/* Documents table */}
        <div className="p-6">
          <h2 className="text-p-text font-semibold mb-4">Documents ({documents.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-p-text-3 text-xs text-left border-b border-p-border">
                  <th className="pb-2 pr-4">File name</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Pages</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-p-border/50">
                {documents.map(doc => (
                  <tr key={doc.id}>
                    <td className="py-2 pr-4 text-p-text truncate max-w-48">{doc.file_name}</td>
                    <td className="py-2 pr-4 text-p-text-2 capitalize">{doc.document_type.replace(/_/g, ' ')}</td>
                    <td className="py-2 pr-4 text-p-text-2">{doc.page_count ?? '—'}</td>
                    <td className="py-2"><StatusBadge status={doc.processing_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Findings list */}
        <div className="p-6">
          <h2 className="text-p-text font-semibold mb-4">Findings ({findings.length})</h2>
          {findings.length === 0 ? (
            <p className="text-p-text-3 text-sm">No findings generated yet.</p>
          ) : (
            <div className="space-y-4">
              {findings.map((f, i) => {
                const fev = evidence.filter(e => e.finding_id === f.id)
                return (
                  <div key={f.id} className="border border-p-border-2 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-p-text-3 text-xs">F-{String(i + 1).padStart(3, '0')}</span>
                      <PriorityBadge level={f.priority_level} />
                      <span className="text-p-text font-medium">{f.title}</span>
                      <StatusBadge status={f.review_status} />
                    </div>
                    <p className="text-p-text-2 text-sm">{f.description}</p>
                    {fev.length > 0 && (
                      <div className="text-xs text-p-text-3 space-y-0.5">
                        {fev.map(ev => (
                          <div key={ev.id}>
                            <span className="text-p-text-2">{ev.field_name}:</span>{' '}
                            <span className="font-mono">{ev.observed_value}</span>
                            {ev.compared_value && (
                              <> vs <span className="font-mono text-p-error-2">{ev.compared_value}</span></>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 flex items-center gap-2 text-p-text-3 text-xs">
          <CheckCircle className="w-3.5 h-3.5 text-p-success-2" />
          Generated by Panopter — DataOps Innovation Hackathon 2026
        </div>
      </div>
    </div>
  )
}
