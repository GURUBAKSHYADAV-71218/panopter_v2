'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw, Share2 } from 'lucide-react'
import type { Entity, EntityRelationship, Document } from '@/types'
import { investigationsStore, documentsStore, entitiesStore, entityRelationshipsStore } from '@/lib/store'

// ── Node colours by entity type
const NODE_COLOR: Record<string, string> = {
  organization: '#dc2626',
  person: '#2563eb',
  document: '#7c3aed',
  account_reference: '#059669',
  transaction_reference: '#d97706',
}

interface GraphNode {
  id: string
  label: string
  type: string
  x: number
  y: number
  r: number
}

interface GraphEdge {
  id: string
  source: string
  target: string
  label: string
}

function circleLayout(count: number, cx: number, cy: number, radius: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
  })
}

function RelationshipGraph({
  entities,
  relationships,
  documents,
}: {
  entities: Entity[]
  relationships: EntityRelationship[]
  documents: Document[]
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const [selected, setSelected] = useState<GraphNode | null>(null)

  // Build nodes — combine entities + documents
  const docNodes: GraphNode[] = documents.map((doc, i) => ({
    id: `doc:${doc.id}`,
    label: doc.file_name.length > 16 ? doc.file_name.slice(0, 14) + '…' : doc.file_name,
    type: 'document',
    x: 0, y: 0, r: 26,
  }))

  const entityNodes: GraphNode[] = entities.map((e) => ({
    id: `ent:${e.id}`,
    label: e.display_name.length > 16 ? e.display_name.slice(0, 14) + '…' : e.display_name,
    type: e.entity_type,
    x: 0, y: 0, r: 22,
  }))

  const allNodes: GraphNode[] = [...docNodes, ...entityNodes]

  // Assign positions
  const cx = 350, cy = 300, outerR = 200
  const positions = circleLayout(allNodes.length, cx, cy, outerR)
  allNodes.forEach((n, i) => { n.x = positions[i].x; n.y = positions[i].y })
  const nodeMap = Object.fromEntries(allNodes.map(n => [n.id, n]))

  // Map entity IDs for relationships
  const entityIdToNodeId = Object.fromEntries(entities.map(e => [e.id, `ent:${e.id}`]))

  // Build edges from entity relationships
  const edges: GraphEdge[] = relationships.map(r => ({
    id: r.id,
    source: entityIdToNodeId[r.source_entity_id] ?? '',
    target: entityIdToNodeId[r.target_entity_id] ?? '',
    label: r.relationship_type.replace(/_/g, ' '),
  })).filter(e => e.source && e.target)

  // Also add doc → entity edges from supporting_document_id
  relationships.forEach(r => {
    if (r.supporting_document_id) {
      edges.push({
        id: `doc-edge:${r.id}`,
        source: `doc:${r.supporting_document_id}`,
        target: entityIdToNodeId[r.source_entity_id] ?? '',
        label: 'referenced in',
      })
    }
  })

  // Pan/zoom handlers
  function onMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if ((e.target as SVGElement).tagName === 'circle' || (e.target as SVGElement).tagName === 'text') return
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }
  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!dragging) return
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    })
  }
  function onMouseUp() { setDragging(false) }

  const viewBox = `${-pan.x / scale} ${-pan.y / scale} ${700 / scale} ${600 / scale}`

  if (allNodes.length === 0) return null

  return (
    <div className="relative">
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex gap-1">
        {[
          { icon: <ZoomIn className="w-4 h-4" />, action: () => setScale(s => Math.min(s * 1.3, 4)) },
          { icon: <ZoomOut className="w-4 h-4" />, action: () => setScale(s => Math.max(s / 1.3, 0.3)) },
          { icon: <RotateCcw className="w-4 h-4" />, action: () => { setScale(1); setPan({ x: 0, y: 0 }) } },
        ].map((btn, i) => (
          <button
            key={i}
            onClick={btn.action}
            className="p-1.5 bg-p-surface-2 border border-p-border rounded-lg text-p-text-2 hover:text-p-text hover:border-p-crimson/50 transition-colors"
          >
            {btn.icon}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        <svg
          ref={svgRef}
          viewBox={viewBox}
          className="w-full h-[500px] bg-p-bg rounded-xl border border-p-border cursor-grab active:cursor-grabbing"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* Edges */}
          {edges.map(e => {
            const src = nodeMap[e.source]
            const tgt = nodeMap[e.target]
            if (!src || !tgt) return null
            return (
              <g key={e.id}>
                <line
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7"
                />
              </g>
            )
          })}

          {/* Nodes */}
          {allNodes.map(node => (
            <g key={node.id} className="cursor-pointer" onClick={() => setSelected(node)}>
              <circle
                cx={node.x} cy={node.y} r={node.r}
                fill={NODE_COLOR[node.type] ?? '#6b7280'}
                stroke={selected?.id === node.id ? '#fff' : 'rgba(255,255,255,0.15)'}
                strokeWidth={selected?.id === node.id ? 2.5 : 1}
                opacity="0.9"
              />
              <text
                x={node.x} y={node.y + node.r + 14}
                textAnchor="middle"
                fontSize="10"
                fill="#d1d5db"
                fontFamily="sans-serif"
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Detail panel */}
        {selected && (
          <div className="w-56 shrink-0 bg-p-surface border border-p-border rounded-xl p-4 space-y-3 self-start mt-10">
            <h3 className="text-p-text font-semibold text-sm">{selected.label}</h3>
            <div className="text-xs text-p-text-3 capitalize">{selected.type.replace(/_/g, ' ')}</div>
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: NODE_COLOR[selected.type] ?? '#6b7280' }}
            />
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-p-text-3 hover:text-p-text"
            >
              Deselect
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-p-text-3">
        {Object.entries(NODE_COLOR).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="capitalize">{type.replace(/_/g, ' ')}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-6 border-t border-dashed border-gray-500" />
          <span>Relationship</span>
        </div>
      </div>
    </div>
  )
}

export default function RelationshipsPage() {
  const params = useParams()
  const investigationId = params.investigationId as string
  const [entities, setEntities] = useState<Entity[]>([])
  const [relationships, setRelationships] = useState<EntityRelationship[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [invName, setInvName] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setInvName(investigationsStore.get(investigationId)?.name ?? '')
    setEntities(entitiesStore.list(investigationId) as Entity[])
    setRelationships(entityRelationshipsStore.list(investigationId) as EntityRelationship[])
    setDocuments(documentsStore.list(investigationId) as Document[])
    setLoading(false)
  }, [investigationId])

  useEffect(() => { load() }, [load])

  const hasData = entities.length > 0 || documents.length > 0

  if (loading) return <PageLoader />

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/investigations/${investigationId}`} className="text-p-text-3 hover:text-p-text transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="text-p-text-3 text-xs mb-0.5">{invName}</div>
          <h1 className="text-p-text text-xl font-bold">Relationship Graph</h1>
        </div>
      </div>

      <p className="text-p-text-2 text-sm">
        Explore connections between entities (vendors, people, accounts) and documents within this investigation.
        Relationships are detected automatically during document comparison.
      </p>

      {!hasData ? (
        <EmptyState
          icon={<Share2 className="w-12 h-12" />}
          title="No relationship data yet"
          description="Process your documents first. The comparison engine will identify entity relationships automatically."
          action={{ label: 'Go to Documents', href: `/investigations/${investigationId}/documents` }}
        />
      ) : (
        <ErrorBoundary
          fallback={
            <div className="bg-p-surface border border-p-border rounded-xl p-6 text-center">
              <p className="text-p-text-2 text-sm mb-3">The relationship graph encountered an error.</p>
              <p className="text-p-text-3 text-xs">Documents and findings are still accessible from the navigation above.</p>
            </div>
          }
        >
          <div className="bg-p-surface border border-p-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-4 text-sm text-p-text-3">
                <span>{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
                <span>{entities.length} entit{entities.length !== 1 ? 'ies' : 'y'}</span>
                <span>{relationships.length} relationship{relationships.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <RelationshipGraph
              entities={entities}
              relationships={relationships}
              documents={documents}
            />
          </div>
        </ErrorBoundary>
      )}
    </div>
  )
}
