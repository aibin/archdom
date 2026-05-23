import { useEffect, useCallback, useRef, useState, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  NodeMouseHandler,
} from 'reactflow'
import { toPng } from 'html-to-image'
import dagre from '@dagrejs/dagre'
import { Link, useSearchParams } from 'react-router-dom'
import { nodeTypes, getFlowType, getNodeSize } from './nodes/Node'
import { C4NodeData, YamlLayer, YamlEdge, DiagramType, YamlGroup } from './types'
import { loadYaml, yamlCache } from './yamlLoader'
import { Legend } from './Legend'
import { edgeAppearance, edgeLabel } from './diagramUtils'

// ── Diagram type badge ────────────────────────────────────────────────────────

const DIAGRAM_META: Record<string, { level: string; color: string }> = {
  context:    { level: 'L1 · System Context',   color: '#7c6af7' },
  container:  { level: 'L2 · Container',         color: '#4f46e5' },
  component:  { level: 'L3 · Component',         color: '#0891b2' },
  code:       { level: 'L4 · Code',              color: '#16a34a' },
  landscape:  { level: 'System Landscape',       color: '#64748b' },
  dynamic:    { level: 'Dynamic Diagram',        color: '#ea7317' },
  deployment: { level: 'Deployment Diagram',     color: '#1d4ed8' },
}

function DiagramBadge({ layer }: { layer: YamlLayer | null }) {
  if (!layer?.diagramType) return null
  const meta = DIAGRAM_META[layer.diagramType as DiagramType]
  if (!meta) return null
  return (
    <div style={{
      position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      pointerEvents: 'none', zIndex: 5,
    }}>
      <div style={{
        background: meta.color, color: '#fff',
        fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase',
        padding: '3px 12px', borderRadius: 20,
      }}>
        {meta.level}
      </div>
      {(layer.scope || layer.environment) && (
        <div style={{
          background: 'rgba(26,29,39,0.85)', backdropFilter: 'blur(4px)',
          color: '#94a3b8', fontSize: 11,
          padding: '2px 10px', borderRadius: 12,
        }}>
          {[layer.scope, layer.environment].filter(Boolean).join(' · ')}
        </div>
      )}
    </div>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────

const GPAD       = 28  // horizontal / bottom padding inside the group box
const GHEAD_BASE = 40  // top padding when no description
const GHEAD_DESC = 62  // top padding when description is present

function applyLayout(layer: YamlLayer): { nodes: Node<C4NodeData>[]; edges: Edge[] } {
  const groups: YamlGroup[] = layer.groups ?? []
  const nodeGroupOf = new Map<string, string>()
  groups.forEach(grp => grp.nodeIds.forEach(id => nodeGroupOf.set(id, grp.id)))

  // ── Pass 1: lay out each group's members in their own mini-dagre ──────────
  // This gives us the group's required width/height before the outer layout.
  type InnerLayout = { posMap: Map<string, { x: number; y: number; w: number; h: number }>; w: number; h: number; ghead: number }
  const innerLayouts = new Map<string, InnerLayout>()

  groups.forEach(grp => {
    const ig = new dagre.graphlib.Graph()
    ig.setDefaultEdgeLabel(() => ({}))
    ig.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 60 })

    grp.nodeIds.forEach(id => {
      const n = layer.nodes.find(n => n.id === id)
      if (!n) return
      const { w, h } = getNodeSize(n.type ?? 'service')
      ig.setNode(id, { width: w, height: h })
    })
    // Only edges between this group's own members
    ;(layer.edges ?? []).forEach(e => {
      if (nodeGroupOf.get(e.from) === grp.id && nodeGroupOf.get(e.to) === grp.id)
        ig.setEdge(e.from, e.to)
    })
    dagre.layout(ig)

    const posMap = new Map<string, { x: number; y: number; w: number; h: number }>()
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    grp.nodeIds.forEach(id => {
      const n = layer.nodes.find(n => n.id === id)
      if (!n) return
      const { w, h } = getNodeSize(n.type ?? 'service')
      const dn = ig.node(id)
      if (!dn) return
      const x = dn.x - w / 2, y = dn.y - h / 2
      posMap.set(id, { x, y, w, h })
      minX = Math.min(minX, x);     minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h)
    })
    // Normalize child positions to (0, 0) origin
    posMap.forEach((p, id) => posMap.set(id, { ...p, x: p.x - minX, y: p.y - minY }))
    const ghead  = grp.description ? GHEAD_DESC : GHEAD_BASE
    const innerW = isFinite(maxX) ? maxX - minX : 220
    const innerH = isFinite(maxY) ? maxY - minY : 120
    innerLayouts.set(grp.id, { posMap, w: innerW + GPAD * 2, h: innerH + ghead + GPAD, ghead })
  })

  // ── Pass 2: outer dagre — standalone nodes + one virtual node per group ───
  const og = new dagre.graphlib.Graph()
  og.setDefaultEdgeLabel(() => ({}))
  og.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100 })

  layer.nodes.forEach(n => {
    if (nodeGroupOf.has(n.id)) return
    const { w, h } = getNodeSize(n.type ?? 'service')
    og.setNode(n.id, { width: w, height: h })
  })
  groups.forEach(grp => {
    const il = innerLayouts.get(grp.id)
    if (il) og.setNode(grp.id, { width: il.w, height: il.h })
  })

  // Edges: remap endpoints inside groups to the group's virtual node
  const outerSeen = new Set<string>()
  ;(layer.edges ?? []).forEach(e => {
    const from = nodeGroupOf.get(e.from) ?? e.from
    const to   = nodeGroupOf.get(e.to)   ?? e.to
    if (from === to) return
    const key = `${from}→${to}`
    if (!outerSeen.has(key)) { outerSeen.add(key); og.setEdge(from, to) }
  })
  dagre.layout(og)

  // ── Build final React Flow nodes ──────────────────────────────────────────
  const flowNodes: Node<C4NodeData>[] = []

  // Group background boxes (z=0)
  groups.forEach(grp => {
    const il = innerLayouts.get(grp.id)
    const on = og.node(grp.id)
    if (!il || !on) return
    const gx = on.x - il.w / 2, gy = on.y - il.h / 2
    flowNodes.push({
      id: grp.id, type: 'group',
      position: { x: gx, y: gy },
      width: il.w, height: il.h,
      style: { width: il.w, height: il.h, pointerEvents: 'none' },
      zIndex: 0, selectable: false, draggable: false, connectable: false,
      data: { name: grp.name, description: grp.description ?? '', technology: '', nodeType: 'boundary' },
    })
    // Group members positioned relative to the group box (z=1)
    grp.nodeIds.forEach(id => {
      const n = layer.nodes.find(n => n.id === id)
      const rel = il.posMap.get(id)
      if (!n || !rel) return
      const nodeType = n.type ?? 'service'
      flowNodes.push({
        id: n.id, type: getFlowType(nodeType),
        position: { x: gx + GPAD + rel.x, y: gy + il.ghead + rel.y },
        width: rel.w, height: rel.h, zIndex: 1,
        data: {
          name: n.name, description: n.description ?? '', technology: n.technology ?? '',
          nodeType, file: n.file, external: n.external, link: n.link, theme: layer.theme,
        },
      })
    })
  })

  // Standalone nodes (z=1)
  layer.nodes.forEach(n => {
    if (nodeGroupOf.has(n.id)) return
    const nodeType = n.type ?? 'service'
    const { w, h } = getNodeSize(nodeType)
    const on = og.node(n.id)
    if (!on) return
    flowNodes.push({
      id: n.id, type: getFlowType(nodeType),
      position: { x: on.x - w / 2, y: on.y - h / 2 },
      width: w, height: h, zIndex: 1,
      data: {
        name: n.name, description: n.description ?? '', technology: n.technology ?? '',
        nodeType, file: n.file, external: n.external, link: n.link, theme: layer.theme,
      },
    })
  })

  const edges: Edge[] = (layer.edges ?? []).map((e, i) => ({
    id: `e-${i}`, source: e.from, target: e.to,
    label: edgeLabel(e), ...edgeAppearance(e.style),
  }))

  return { nodes: flowNodes, edges }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  yamlPath: string
  onDrillIn: (path: string, name: string) => void
  refreshToken?: number
}

function FlowCanvas({ yamlPath, onDrillIn, refreshToken }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [fitPending, setFitPending] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [layer, setLayer]           = useState<YamlLayer | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  const [highlightId, setHighlightId] = useState<string | null>(() => searchParams.get('node'))
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [legendOpen, setLegendOpen] = useState(false)
  const [exporting, setExporting]   = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const { fitView, setViewport } = useReactFlow()
  const fitViewRef = useRef(fitView)
  fitViewRef.current = fitView

  // ── Fit view after layout ──────────────────────────────────────────────────
  useEffect(() => {
    if (!fitPending) return
    setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 0 })
    fitViewRef.current({ padding: 0.2, duration: 0 })
    setFitPending(false)
  }, [fitPending, setViewport])

  // ── Load YAML ──────────────────────────────────────────────────────────────
  const loadAndLayout = useCallback(async (path: string) => {
    try {
      const l = await loadYaml(path)
      setLayer(l)
      setError(null)
      const { nodes: ln, edges: le } = applyLayout(l)
      setNodes(ln)
      setEdges(le)
      setFitPending(true)
      l.nodes
        .filter(n => n.file && !yamlCache.has(n.file))
        .forEach(n => loadYaml(n.file!).catch(() => {}))
    } catch (e) {
      setError(String(e))
      setNodes([])
      setEdges([])
      setLayer(null)
    }
  }, [setNodes, setEdges])

  useEffect(() => {
    setHighlightId(searchParamsRef.current.get('node'))
    setSearchQuery('')
    loadAndLayout(yamlPath)
  }, [yamlPath, loadAndLayout, refreshToken])

  // ── Sync highlight → ?node= URL param ────────────────────────────────────
  useEffect(() => {
    setSearchParams(highlightId ? { node: highlightId } : {}, { replace: true })
  }, [highlightId, setSearchParams])

  // ── Highlight callback ─────────────────────────────────────────────────────
  const handleHighlight = useCallback((id: string) => {
    setHighlightId(prev => prev === id ? null : id)
  }, [])

  // ── Display nodes/edges: highlight + search + inject callbacks ─────────────
  const [displayNodes, displayEdges] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    const linkedEdgeIds = new Set<string>()
    const linked = new Set<string>()
    if (highlightId) {
      linked.add(highlightId)
      edges.forEach(e => {
        if (e.source === highlightId || e.target === highlightId) {
          linked.add(e.source)
          linked.add(e.target)
          linkedEdgeIds.add(e.id)
        }
      })
    }

    const mappedNodes = nodes.map(n => {
      // Group nodes are structural context — never dim them
      if (n.type === 'group') return { ...n, data: { ...n.data, onHighlight: handleHighlight } }

      let opacity = 1
      if (highlightId) {
        opacity = linked.has(n.id) ? 1 : 0.12
      } else if (q) {
        const text = `${n.data.name} ${n.data.description}`.toLowerCase()
        opacity = text.includes(q) ? 1 : 0.12
      }
      return {
        ...n,
        style: opacity < 1 ? { opacity } : {},
        data: { ...n.data, highlighted: n.id === highlightId, onHighlight: handleHighlight },
      }
    })

    const mappedEdges = (highlightId
      ? edges.map(e => {
          const active = linkedEdgeIds.has(e.id)
          return {
            ...e,
            label: active ? e.label : undefined,
            style: { ...(e.style as object), opacity: active ? 1 : 0.06 },
          }
        })
      : edges
    ).map(e => {
      if (e.id !== selectedEdgeId) return e
      return {
        ...e,
        zIndex: 1000,
        style: { ...(e.style as object), stroke: '#ef4444', strokeWidth: 2.5 },
        labelStyle: { fill: '#ef4444', fontSize: 12, fontWeight: 700 },
        labelBgStyle: { fill: '#1e0a0a', fillOpacity: 1 },
      }
    })

    return [mappedNodes, mappedEdges]
  }, [nodes, edges, highlightId, selectedEdgeId, searchQuery, handleHighlight])

  // ── Keyboard: Enter → drill into highlighted node ──────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !highlightId) return
      const node = nodes.find(n => n.id === highlightId)
      if (node?.data.file) {
        setHighlightId(null)
        onDrillIn(node.data.file, node.data.name)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [highlightId, nodes, onDrillIn])

  // ── Click handlers ─────────────────────────────────────────────────────────
  const handleNodeClick: NodeMouseHandler = useCallback((_e, node) => {
    if (node.data.file) {
      setHighlightId(null)
      onDrillIn(node.data.file, node.data.name)
    }
  }, [onDrillIn])

  const handleEdgeClick = useCallback((_e: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(prev => prev === edge.id ? null : edge.id)
  }, [])

  const handlePaneClick = useCallback(() => {
    setHighlightId(null)
    setSelectedEdgeId(null)
  }, [])

  // ── Export PNG ─────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (!containerRef.current || exporting) return
    setExporting(true)
    try {
      const flowEl = containerRef.current.querySelector<HTMLElement>('.react-flow')
      if (!flowEl) return
      const dataUrl = await toPng(flowEl, { backgroundColor: '#0f1117' })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${layer?.name ?? 'diagram'}.png`
      a.click()
    } finally {
      setExporting(false)
    }
  }, [exporting, layer])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        minZoom={0.1}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#2d3148" gap={24} />
        <Controls style={{ background: '#1a1d27', borderColor: '#2d3148', color: '#94a3b8' }} />
        <MiniMap style={{ background: '#1a1d27', borderColor: '#2d3148' }} nodeColor="#4f46e5" maskColor="rgba(15,17,23,0.7)" />
      </ReactFlow>

      {/* Diagram type badge */}
      <DiagramBadge layer={layer} />

      {/* Toolbar: search + export + legend */}
      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="Search nodes…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={styles.search}
        />
        <button
          onClick={handleExport}
          disabled={exporting}
          title="Export as PNG"
          style={styles.iconBtn}
        >
          {exporting ? '…' : '⬇ PNG'}
        </button>
        <button
          onClick={() => setLegendOpen(v => !v)}
          title="Toggle legend"
          style={{ ...styles.iconBtn, color: legendOpen ? '#7c6af7' : '#94a3b8' }}
        >
          ☰ Legend
        </button>
        <Link to="/help" style={styles.iconBtn}>
          ? Help
        </Link>
      </div>

      {/* Legend panel */}
      {legendOpen && <Legend onClose={() => setLegendOpen(false)} theme={layer?.theme} />}

      {/* Keyboard hint */}
      <div style={styles.hint}>
        click to open · 👁 to highlight connections · ⎋ go back
      </div>

      {nodes.length === 0 && !error && (
        <div style={styles.empty}>No nodes defined in {yamlPath}</div>
      )}
      {error && <pre style={styles.error}>{error}</pre>}
    </div>
  )
}

export function DiagramView(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    position: 'absolute', top: 12, right: 12,
    display: 'flex', alignItems: 'center', gap: 6, zIndex: 5,
  },
  search: {
    background: 'rgba(26,29,39,0.9)', backdropFilter: 'blur(4px)',
    border: '1px solid #2d3148', borderRadius: 8,
    color: '#e2e8f0', fontSize: 12, padding: '5px 10px',
    outline: 'none', width: 160,
  },
  iconBtn: {
    background: 'rgba(26,29,39,0.9)', backdropFilter: 'blur(4px)',
    border: '1px solid #2d3148', borderRadius: 8,
    color: '#94a3b8', fontSize: 12, padding: '5px 10px',
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  hint: {
    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
    fontSize: 11, color: '#475569',
    background: 'rgba(26,29,39,0.85)', backdropFilter: 'blur(4px)',
    padding: '4px 12px', borderRadius: 20,
    pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap',
  },
  empty: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#475569', fontSize: 16, pointerEvents: 'none',
  },
  error: {
    position: 'absolute', inset: 20,
    background: '#1a0a0a', color: '#f87171',
    padding: 20, borderRadius: 8, border: '1px solid #7f1d1d',
    fontSize: 12, overflow: 'auto', fontFamily: 'monospace',
  },
}
