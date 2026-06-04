import { useEffect, useCallback, useRef, useState, useMemo } from 'react'
import yaml from 'js-yaml'
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
  NodeChange,
  NodeMouseHandler,
  Connection,
  ConnectionMode,
} from 'reactflow'
import { toPng } from 'html-to-image'
import dagre from '@dagrejs/dagre'
import { Link, useSearchParams } from 'react-router-dom'
import { nodeTypes, getFlowType, getNodeSize } from './nodes/Node'
import { C4NodeData, MetaFile, YamlLayer, YamlEdge, YamlNode, DiagramType, YamlGroup } from './types'
import { loadYaml, loadRawText, saveRawText, saveYamlLayer, createDiagramIfMissing, loadMetaFile, loadPositions, savePositions, clearPositions, NodePositions, yamlCache } from './yamlLoader'
import { YamlEditor, EditorSaveStatus } from './YamlEditor'
import { Legend } from './Legend'
import { MetaOverlay } from './MetaOverlay'
import { edgeAppearance, edgeLabel } from './diagramUtils'
import { NodePalette } from './NodePalette'
import { NodeForm } from './NodeForm'
import { EdgeForm } from './EdgeForm'
import { useTheme } from './useTheme'

// ── Diagram type badge ────────────────────────────────────────────────────────

const DIAGRAM_META: Record<string, { level: string; color: string }> = {
  context:    { level: 'L1 · System Context',   color: '#7c6af7' },
  container:  { level: 'L2 · Container',         color: '#4f46e5' },
  component:  { level: 'L3 · Component',         color: '#0891b2' },
  code:       { level: 'L4 · Code',              color: '#16a34a' },
  landscape:  { level: 'System Landscape',       color: 'var(--subtle)' },
  dynamic:    { level: 'Dynamic Diagram',        color: '#ea7317' },
  deployment: { level: 'Deployment Diagram',     color: '#1d4ed8' },
}

function DiagramInfo({ layer }: { layer: YamlLayer | null }) {
  if (!layer) return null
  const meta = layer.diagramType ? DIAGRAM_META[layer.diagramType as DiagramType] : null
  return (
    <div style={{
      position: 'absolute', top: 44, left: 12, zIndex: 5,
      pointerEvents: 'none',
      display: 'flex', flexDirection: 'column', gap: 3,
    }}>
      {layer.name && (
        <div style={{
          fontSize: 13, fontWeight: 700, color: 'var(--text)',
          maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {layer.name}
        </div>
      )}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {meta && (
          <div style={{
            background: meta.color, color: '#fff',
            fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
            padding: '2px 8px', borderRadius: 20,
          }}>
            {meta.level}
          </div>
        )}
        {(layer.scope || layer.environment) && (
          <div style={{
            background: 'var(--surface-overlay)', backdropFilter: 'blur(4px)',
            color: 'var(--subtle)', fontSize: 10,
            padding: '2px 8px', borderRadius: 20,
          }}>
            {[layer.scope, layer.environment].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Edge validation ───────────────────────────────────────────────────────────

// Canonical key for the physical connection between two anchor-dots, direction-independent.
// a(top)→b(top) and b(top)→a(top) produce the same key; a(top)→b(top) and b(left)→a(top) do not.
function connectionKey(from: string, fromAnchor: string | undefined, to: string, toAnchor: string | undefined): string {
  const a = `${from}:${fromAnchor ?? ''}`
  const b = `${to}:${toAnchor ?? ''}`
  return a < b ? `${a}↔${b}` : `${b}↔${a}`
}

function validateEdges(edges: YamlEdge[]): void {
  const seen = new Set<string>()
  for (const e of edges) {
    if (e.from === e.to) throw new Error(`"${e.from}" has an edge pointing to itself — from and to must be different nodes.`)
    const key = connectionKey(e.from, e.sourceAnchor, e.to, e.targetAnchor)
    if (seen.has(key)) {
      const fromLabel = `${e.from}${e.sourceAnchor ? `(${e.sourceAnchor})` : ''}`
      const toLabel   = `${e.to}${e.targetAnchor   ? `(${e.targetAnchor})` : ''}`
      throw new Error(
        `Edge conflict: "${fromLabel} → ${toLabel}" duplicates an existing connection.\n` +
        `Remove one and add  bidirectional: true  to the remaining edge instead.`
      )
    }
    seen.add(key)
  }
}

// ── Layout ────────────────────────────────────────────────────────────────────

const GPAD       = 28  // horizontal / bottom padding inside the group box
const GHEAD_BASE = 40  // top padding when no description
const GHEAD_DESC = 62  // top padding when description is present

function applyLayout(layer: YamlLayer, savedPos: NodePositions = {}): { nodes: Node<C4NodeData>[]; edges: Edge[] } {
  validateEdges(layer.edges ?? [])
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
    ig.setGraph({ rankdir: 'TB', nodesep: 70, ranksep: 90 })

    grp.nodeIds.forEach(id => {
      const n = layer.nodes.find(n => n.id === id)
      if (!n) return
      const { w, h } = getNodeSize(n.type ?? 'service')
      ig.setNode(id, { width: w, height: h })
    })
    // Only edges between this group's own members
    ;(layer.edges ?? []).forEach(e => {
      if (nodeGroupOf.get(e.from) === grp.id && nodeGroupOf.get(e.to) === grp.id) {
        const lbl = edgeLabel(e) ?? ''
        ig.setEdge(e.from, e.to, { width: lbl.length * 6, height: lbl ? 18 : 0 })
      }
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
  og.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 130 })

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
    if (from === to) return  // skip intra-group edges (both endpoints in same group)
    const key = `${from}→${to}`
    if (!outerSeen.has(key)) {
      const lbl = edgeLabel(e) ?? ''
      outerSeen.add(key)
      og.setEdge(from, to, { width: lbl.length * 6, height: lbl ? 18 : 0 })
    }
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
          nodeType, file: n.file, external: n.external, link: n.link, meta: n.meta,
          theme: layer.theme,
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
    const dagrePos = { x: on.x - w / 2, y: on.y - h / 2 }
    flowNodes.push({
      id: n.id, type: getFlowType(nodeType),
      position: savedPos[n.id] ?? dagrePos,
      width: w, height: h, zIndex: 1,
      data: {
        name: n.name, description: n.description ?? '', technology: n.technology ?? '',
        nodeType, file: n.file, external: n.external, link: n.link, meta: n.meta, theme: layer.theme,
      },
    })
  })

  // Map YAML anchor value → React Flow handle id.
  // "top"/"bottom" as sourceAnchor use their id'd handles; default source (no anchor) falls
  // back to the id-less bottom handle. Same logic inverted for targetAnchor.
  const srcHandle = (a?: string) => a ?? undefined           // all four ids are valid; undefined = default
  const tgtHandle = (a?: string) => a ?? undefined

  const edges: Edge[] = (layer.edges ?? [])
    .map((e, i) => ({
      id: `e-${i}`, source: e.from, target: e.to,
      label: edgeLabel(e), ...edgeAppearance(e.style, e.bidirectional ?? false),
      ...(e.sourceAnchor && { sourceHandle: srcHandle(e.sourceAnchor) }),
      ...(e.targetAnchor && { targetHandle: tgtHandle(e.targetAnchor) }),
      data: { meta: e.meta, yamlFrom: e.from, yamlTo: e.to, yamlSourceAnchor: e.sourceAnchor, yamlTargetAnchor: e.targetAnchor },
    }))

  return { nodes: flowNodes, edges }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  yamlPath: string
  onDrillIn: (path: string, name: string) => void
  refreshToken?: number
  onLayoutSaving?: () => void
  onLayoutSaved?: () => void
}

function FlowCanvas({ yamlPath, onDrillIn, refreshToken, onLayoutSaving, onLayoutSaved }: Props) {
  const { isDark } = useTheme()
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

  type MetaState = { path: string; title: string; loading: boolean; data: MetaFile | null; error: string | null }
  const [metaOverlay, setMetaOverlay] = useState<MetaState | null>(null)


  // ── Edit mode state ────────────────────────────────────────────────────────
  const [editMode, setEditMode]             = useState(false)
  const [pendingEdge, setPendingEdge]       = useState<{ source: string; target: string; sourceHandle: string | null; targetHandle: string | null } | null>(null)
  const [pendingNode, setPendingNode]       = useState<{ position: { x: number; y: number }; nodeType: string } | null>(null)
  const [editingNode, setEditingNode]       = useState<YamlNode | null>(null)
  const [editingEdge, setEditingEdge]       = useState<{ from: string; to: string; sourceAnchor?: string; targetAnchor?: string } | null>(null)
  const [edgeConflictError, setEdgeConflictError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const { fitView, setViewport, project } = useReactFlow()
  const fitViewRef = useRef(fitView)
  fitViewRef.current = fitView

  const [editorOpen,       setEditorOpen]       = useState(false)
  const [editorWidth,      setEditorWidth]      = useState(400)
  const [editorText,       setEditorText]       = useState('')
  const [editorError,      setEditorError]      = useState<string | null>(null)
  const [editorSaveStatus, setEditorSaveStatus] = useState<EditorSaveStatus>('idle')
  const parseTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resizeDragRef  = useRef<{ startX: number; startW: number } | null>(null)

  const nodesRef   = useRef(nodes)
  nodesRef.current = nodes

  // ── Fit view after layout ──────────────────────────────────────────────────
  useEffect(() => {
    if (!fitPending) return
    setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 0 })
    fitViewRef.current({ padding: 0.2, duration: 0 })
    setFitPending(false)
  }, [fitPending, setViewport])

  // ── Load YAML ──────────────────────────────────────────────────────────────
  const loadAndLayout = useCallback(async (path: string, resetPos = false) => {
    try {
      const [l, savedPos, rawText] = await Promise.all([
        loadYaml(path),
        resetPos ? Promise.resolve({} as NodePositions) : loadPositions(path),
        loadRawText(path),
      ])
      setEditorText(rawText)
      setEditorError(null)
      setLayer(l)
      setError(null)
      const { nodes: ln, edges: le } = applyLayout(l, savedPos)
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
    setEditorSaveStatus('idle')
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

  // ── YAML editor live-parse + save ─────────────────────────────────────────
  const handleEditorChange = useCallback((text: string) => {
    setEditorText(text)
    setEditorSaveStatus('idle')
    if (parseTimerRef.current) clearTimeout(parseTimerRef.current)
    parseTimerRef.current = setTimeout(async () => {
      try {
        const parsed = yaml.load(text) as YamlLayer
        if (!parsed || !Array.isArray(parsed.nodes)) throw new Error('Missing required "nodes" array')
        validateEdges(parsed.edges ?? [])
        const savedPos = await loadPositions(yamlPath)
        const { nodes: ln, edges: le } = applyLayout(parsed, savedPos)
        setLayer(parsed)
        setNodes(ln)
        setEdges(le)
        setEditorError(null)
        setError(null)
        // Persist to disk and invalidate parse cache so navigating away + back reloads fresh
        setEditorSaveStatus('saving')
        await saveRawText(yamlPath, text)
        yamlCache.delete(yamlPath)
        setEditorSaveStatus('saved')
      } catch (e) {
        setEditorError(String(e))
        setEditorSaveStatus('idle')
      }
    }, 350)
  }, [yamlPath, setNodes, setEdges])

  // ── Meta overlay ──────────────────────────────────────────────────────────
  const handleShowMeta = useCallback((metaPath: string, title: string) => {
    setMetaOverlay({ path: metaPath, title, loading: true, data: null, error: null })
    loadMetaFile(metaPath)
      .then(data => setMetaOverlay(prev => prev?.path === metaPath ? { ...prev, loading: false, data } : prev))
      .catch(err => setMetaOverlay(prev => prev?.path === metaPath ? { ...prev, loading: false, error: String(err) } : prev))
  }, [])

  // ── YAML sync helper ──────────────────────────────────────────────────────
  const syncYaml = useCallback(async (newLayer: YamlLayer) => {
    const text = yaml.dump(newLayer, { lineWidth: -1, noRefs: true })
    setEditorText(text)
    await saveYamlLayer(yamlPath, newLayer)
  }, [yamlPath])

  // ── Edit mode: delete node via × button ───────────────────────────────────
  const handleDeleteNode = useCallback(async (nodeId: string) => {
    if (!layer) return
    const newLayer: YamlLayer = {
      ...layer,
      nodes: layer.nodes.filter(n => n.id !== nodeId),
      edges: (layer.edges ?? []).filter(e => e.from !== nodeId && e.to !== nodeId),
    }
    setNodes(prev => prev.filter(n => n.id !== nodeId))
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId))
    const pos: NodePositions = {}
    nodesRef.current.filter(n => n.type !== 'group' && n.id !== nodeId).forEach(n => { pos[n.id] = n.position })
    await savePositions(yamlPath, pos)
    setLayer(newLayer)
    await syncYaml(newLayer)
  }, [layer, yamlPath, setNodes, setEdges, syncYaml])

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
      if (n.type === 'group') return { ...n, data: { ...n.data, onHighlight: handleHighlight, onInfo: handleShowMeta } }

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
        data: { ...n.data, highlighted: n.id === highlightId, onHighlight: handleHighlight, onInfo: handleShowMeta },
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
  }, [nodes, edges, highlightId, selectedEdgeId, searchQuery, handleHighlight, handleShowMeta])

  // ── Node drag → auto-save positions ───────────────────────────────────────
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes)

    // Only act on drag-end events
    const dragEnds = changes.filter(c => c.type === 'position' && c.dragging === false)
    if (!dragEnds.length) return

    onLayoutSaving?.()

    // Snapshot positions NOW (before any navigation updates state).
    // nodesRef reflects the pre-change state, so override the moved
    // node(s) with the final position from the change event itself.
    const pos: NodePositions = {}
    nodesRef.current
      .filter(n => n.type !== 'group')
      .forEach(n => { pos[n.id] = n.position })
    dragEnds.forEach(c => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ch = c as any
      if (ch.position) pos[ch.id as string] = ch.position
    })

    // Save immediately — no debounce needed since each drag produces exactly
    // one drag-end event, and the path + positions are already captured above.
    savePositions(yamlPath, pos).then(() => onLayoutSaved?.())
  }, [onNodesChange, yamlPath, onLayoutSaving, onLayoutSaved])

  // ── Editor panel resize ────────────────────────────────────────────────────
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizeDragRef.current = { startX: e.clientX, startW: editorWidth }
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    const onMove = (ev: MouseEvent) => {
      if (!resizeDragRef.current) return
      const delta = ev.clientX - resizeDragRef.current.startX
      setEditorWidth(Math.max(200, Math.min(900, resizeDragRef.current.startW + delta)))
    }
    const onUp = () => {
      resizeDragRef.current = null
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [editorWidth])

  // ── Reset layout ───────────────────────────────────────────────────────────
  const handleResetLayout = useCallback(async () => {
    if (!window.confirm('Reset layout? This clears saved positions for this layer and reverts to auto-layout.')) return
    await clearPositions(yamlPath)
    loadAndLayout(yamlPath, true)
  }, [yamlPath, loadAndLayout])

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
    if (editMode) return
    if (node.data.file) {
      setHighlightId(null)
      onDrillIn(node.data.file, node.data.name)
    }
  }, [onDrillIn, editMode])

  const handleEdgeClick = useCallback((_e: React.MouseEvent, edge: Edge) => {
    if (editMode) {
      const d = (edge.data ?? {}) as { yamlFrom?: string; yamlTo?: string; yamlSourceAnchor?: string; yamlTargetAnchor?: string }
      if (d.yamlFrom && d.yamlTo) setEditingEdge({ from: d.yamlFrom, to: d.yamlTo, sourceAnchor: d.yamlSourceAnchor, targetAnchor: d.yamlTargetAnchor })
      return
    }
    setSelectedEdgeId(prev => prev === edge.id ? null : edge.id)
    if (edge.data?.meta) {
      const title = (typeof edge.label === 'string' ? edge.label : undefined) ?? `${edge.source} → ${edge.target}`
      handleShowMeta(edge.data.meta as string, title)
    }
  }, [editMode, handleShowMeta])


  // ── Edit mode: connect two nodes → edge form ───────────────────────────────
  const handleConnect = useCallback((connection: Connection) => {
    if (!editMode || !connection.source || !connection.target) return
    if (connection.source === connection.target) return
    setPendingEdge({ source: connection.source, target: connection.target, sourceHandle: connection.sourceHandle ?? null, targetHandle: connection.targetHandle ?? null })
  }, [editMode])

  // ── Edit mode: drag node from palette → canvas ─────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!editMode) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [editMode])

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (!editMode) return
    e.preventDefault()
    const nodeType = e.dataTransfer.getData('application/archdom-nodetype')
    if (!nodeType) return
    const rfBounds = containerRef.current?.querySelector('.react-flow')?.getBoundingClientRect()
    if (!rfBounds) return
    const position = project({ x: e.clientX - rfBounds.left, y: e.clientY - rfBounds.top })
    setPendingNode({ position, nodeType })
  }, [editMode, project])

  // ── Edit mode: double-click node → node form ───────────────────────────────
  const handleNodeDoubleClick: NodeMouseHandler = useCallback((_e, node) => {
    if (!editMode || !layer || node.type === 'group') return
    const yn = layer.nodes.find(n => n.id === node.id)
    if (yn) setEditingNode(yn)
  }, [editMode, layer])

  // ── Edit mode: save node (create or update) ────────────────────────────────
  const handleNodeFormSave = useCallback(async (nodeData: YamlNode, createSubDiagram?: { file: string; diagramType: string }) => {
    if (!layer) return
    let newLayer: YamlLayer

    if (editingNode) {
      newLayer = { ...layer, nodes: layer.nodes.map(n => n.id === editingNode.id ? nodeData : n) }
      setNodes(prev => prev.map(n => {
        if (n.id !== editingNode.id) return n
        return {
          ...n, type: getFlowType(nodeData.type ?? 'server-app'),
          data: { ...n.data, name: nodeData.name, description: nodeData.description ?? '', technology: nodeData.technology ?? '', external: nodeData.external, link: nodeData.link, file: nodeData.file, meta: nodeData.meta, nodeType: nodeData.type ?? 'server-app' },
        }
      }))
      setEditingNode(null)
    } else if (pendingNode) {
      if (layer.nodes.some(n => n.id === nodeData.id)) return
      newLayer = { ...layer, nodes: [...layer.nodes, nodeData] }
      const nodeType = nodeData.type ?? 'server-app'
      const { w, h } = getNodeSize(nodeType)
      const newFlowNode: Node<C4NodeData> = {
        id: nodeData.id, type: getFlowType(nodeType),
        position: pendingNode.position, width: w, height: h, zIndex: 1,
        data: {
          name: nodeData.name, description: nodeData.description ?? '',
          technology: nodeData.technology ?? '', nodeType,
          external: nodeData.external, link: nodeData.link, file: nodeData.file, meta: nodeData.meta,
          theme: layer.theme,
        },
      }
      setNodes(prev => [...prev, newFlowNode])
      // Persist drop position
      const pos: NodePositions = {}
      nodesRef.current.filter(n => n.type !== 'group').forEach(n => { pos[n.id] = n.position })
      pos[nodeData.id] = pendingNode.position
      await savePositions(yamlPath, pos)
      setPendingNode(null)
    } else {
      return
    }
    setLayer(newLayer!)
    await syncYaml(newLayer!)
    if (createSubDiagram) {
      await createDiagramIfMissing(createSubDiagram.file, nodeData.name, createSubDiagram.diagramType)
    }
  }, [editingNode, pendingNode, layer, yamlPath, setNodes, syncYaml])

  // ── Edit mode: save edge (create or update) ────────────────────────────────
  const handleEdgeFormSave = useCallback(async (edgeProps: Partial<YamlEdge>) => {
    if (!layer) return
    let newLayer: YamlLayer

    if (editingEdge) {
      const editKey = connectionKey(editingEdge.from, editingEdge.sourceAnchor, editingEdge.to, editingEdge.targetAnchor)
      const newKey  = connectionKey(editingEdge.from, edgeProps.sourceAnchor, editingEdge.to, edgeProps.targetAnchor)
      // If anchors changed, check the new key doesn't conflict with another edge
      if (newKey !== editKey) {
        const conflict = (layer.edges ?? []).find(e =>
          connectionKey(e.from, e.sourceAnchor, e.to, e.targetAnchor) !== editKey &&
          connectionKey(e.from, e.sourceAnchor, e.to, e.targetAnchor) === newKey
        )
        if (conflict) {
          const fromLabel = `${editingEdge.from}${edgeProps.sourceAnchor ? `(${edgeProps.sourceAnchor})` : ''}`
          const toLabel   = `${editingEdge.to}${edgeProps.targetAnchor   ? `(${edgeProps.targetAnchor})`   : ''}`
          setEdgeConflictError(`"${fromLabel} → ${toLabel}" duplicates an existing connection.`)
          return
        }
      }
      setEdgeConflictError(null)
      newLayer = {
        ...layer,
        edges: (layer.edges ?? []).map(e =>
          connectionKey(e.from, e.sourceAnchor, e.to, e.targetAnchor) === editKey
            ? { from: e.from, to: e.to, ...edgeProps, bidirectional: edgeProps.bidirectional || undefined } as YamlEdge
            : e
        ),
      }
      setEdges(prev => prev.map(e => {
        const d = (e.data ?? {}) as { yamlFrom?: string; yamlTo?: string; yamlSourceAnchor?: string; yamlTargetAnchor?: string }
        if (connectionKey(d.yamlFrom ?? '', d.yamlSourceAnchor, d.yamlTo ?? '', d.yamlTargetAnchor) !== editKey) return e
        const ye: YamlEdge = { from: editingEdge.from, to: editingEdge.to, ...edgeProps }
        // Rebuild from scratch so no stale visual properties (e.g. markerStart) survive from ...e
        return {
          id: e.id, source: e.source, target: e.target,
          ...(edgeProps.sourceAnchor && { sourceHandle: edgeProps.sourceAnchor }),
          ...(edgeProps.targetAnchor && { targetHandle: edgeProps.targetAnchor }),
          ...(e.type                 && { type: e.type }),
          ...(e.zIndex != null       && { zIndex: e.zIndex }),
          label: edgeLabel(ye),
          ...edgeAppearance(ye.style, ye.bidirectional ?? false),
          data: { ...d, meta: ye.meta, yamlSourceAnchor: edgeProps.sourceAnchor, yamlTargetAnchor: edgeProps.targetAnchor },
        }
      }))
      setEditingEdge(null)
    } else if (pendingEdge) {
      const { source, target } = pendingEdge
      // Use edgeProps anchors (form values) as the authoritative source — they're pre-filled from the drag handle
      const key = connectionKey(source, edgeProps.sourceAnchor, target, edgeProps.targetAnchor)
      const conflict = (layer.edges ?? []).find(e => e.from !== e.to && connectionKey(e.from, e.sourceAnchor, e.to, e.targetAnchor) === key)
      if (conflict) {
        const fromLabel = `${source}${edgeProps.sourceAnchor ? `(${edgeProps.sourceAnchor})` : ''}`
        const toLabel   = `${target}${edgeProps.targetAnchor ? `(${edgeProps.targetAnchor})` : ''}`
        setEdgeConflictError(`"${fromLabel} → ${toLabel}" duplicates an existing connection. Remove one or use bidirectional: true.`)
        return
      }
      setEdgeConflictError(null)
      const newYamlEdge: YamlEdge = { from: source, to: target, ...edgeProps, bidirectional: edgeProps.bidirectional || undefined }
      newLayer = { ...layer, edges: [...(layer.edges ?? []), newYamlEdge] }
      const newFlowEdge: Edge = {
        id: `e-${Date.now()}`,
        source: newYamlEdge.from, target: newYamlEdge.to,
        label: edgeLabel(newYamlEdge),
        ...edgeAppearance(newYamlEdge.style, newYamlEdge.bidirectional ?? false),
        ...(edgeProps.sourceAnchor && { sourceHandle: edgeProps.sourceAnchor }),
        ...(edgeProps.targetAnchor && { targetHandle: edgeProps.targetAnchor }),
        data: { meta: newYamlEdge.meta, yamlFrom: newYamlEdge.from, yamlTo: newYamlEdge.to, yamlSourceAnchor: edgeProps.sourceAnchor, yamlTargetAnchor: edgeProps.targetAnchor },
      }
      setEdges(prev => [...prev, newFlowEdge])
      setPendingEdge(null)
    } else {
      return
    }
    setLayer(newLayer!)
    await syncYaml(newLayer!)
  }, [editingEdge, pendingEdge, layer, setEdges, syncYaml])

  // ── Edit mode: delete edge via form ───────────────────────────────────────
  const handleEdgeFormDelete = useCallback(async () => {
    if (!editingEdge || !layer) return
    const editKey = connectionKey(editingEdge.from, editingEdge.sourceAnchor, editingEdge.to, editingEdge.targetAnchor)
    const newLayer = { ...layer, edges: (layer.edges ?? []).filter(e => connectionKey(e.from, e.sourceAnchor, e.to, e.targetAnchor) !== editKey) }
    setEdges(prev => prev.filter(e => {
      const d = (e.data ?? {}) as { yamlFrom?: string; yamlTo?: string; yamlSourceAnchor?: string; yamlTargetAnchor?: string }
      return connectionKey(d.yamlFrom ?? '', d.yamlSourceAnchor, d.yamlTo ?? '', d.yamlTargetAnchor) !== editKey
    }))
    setLayer(newLayer)
    setEditingEdge(null)
    await syncYaml(newLayer)
  }, [editingEdge, layer, setEdges, syncYaml])

  // ── Edit mode: delete nodes via keyboard ──────────────────────────────────
  const handleNodesDelete = useCallback(async (deleted: Node[]) => {
    if (!layer) return
    const deletedIds = new Set(deleted.filter(n => n.type !== 'group').map(n => n.id))
    if (!deletedIds.size) return
    const newLayer: YamlLayer = {
      ...layer,
      nodes: layer.nodes.filter(n => !deletedIds.has(n.id)),
      edges: (layer.edges ?? []).filter(e => !deletedIds.has(e.from) && !deletedIds.has(e.to)),
    }
    const pos: NodePositions = {}
    nodesRef.current.filter(n => n.type !== 'group' && !deletedIds.has(n.id)).forEach(n => { pos[n.id] = n.position })
    await savePositions(yamlPath, pos)
    setLayer(newLayer)
    await syncYaml(newLayer)
  }, [layer, yamlPath, syncYaml])

  // ── Edit mode: delete edges via keyboard ──────────────────────────────────
  const handleEdgesDelete = useCallback(async (deleted: Edge[]) => {
    if (!layer) return
    const deletedKeys = new Set(deleted.map(e => {
      const d = (e.data ?? {}) as { yamlFrom?: string; yamlTo?: string; yamlSourceAnchor?: string; yamlTargetAnchor?: string }
      return d.yamlFrom && d.yamlTo ? connectionKey(d.yamlFrom, d.yamlSourceAnchor, d.yamlTo, d.yamlTargetAnchor) : ''
    }).filter(Boolean))
    if (!deletedKeys.size) return
    const newLayer = { ...layer, edges: (layer.edges ?? []).filter(e => !deletedKeys.has(connectionKey(e.from, e.sourceAnchor, e.to, e.targetAnchor))) }
    setLayer(newLayer)
    await syncYaml(newLayer)
  }, [layer, syncYaml])

  const handlePaneClick = useCallback(() => {
    setHighlightId(null)
    setSelectedEdgeId(null)
    setMetaOverlay(null)
  }, [])

  // ── Export PNG ─────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (!containerRef.current || exporting) return
    setExporting(true)
    try {
      const flowEl = containerRef.current.querySelector<HTMLElement>('.react-flow')
      if (!flowEl) return
      const dataUrl = await toPng(flowEl, { backgroundColor: 'var(--bg)' })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${layer?.name ?? 'diagram'}.png`
      a.click()
    } finally {
      setExporting(false)
    }
  }, [exporting, layer])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex' }}>
      {editorOpen && (
        <>
          <div style={{ width: editorWidth, flexShrink: 0, overflow: 'hidden', display: 'flex' }}>
            <YamlEditor
              text={editorText}
              error={editorError}
              saveStatus={editorSaveStatus}
              onChange={handleEditorChange}
            />
          </div>
          <div
            onMouseDown={handleResizeStart}
            style={styles.resizeHandle}
          />
        </>
      )}
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onConnect={handleConnect}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        deleteKeyCode={editMode ? 'Backspace' : null}
        nodesDraggable={editMode}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={40}
        minZoom={0.1}
        proOptions={{ hideAttribution: true }}
      >
        <Background color={isDark ? '#2d3148' : '#cbd5e1'} gap={24} />
        <Controls style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }} />
        <MiniMap style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} nodeColor="#4f46e5" maskColor={isDark ? 'rgba(15,17,23,0.7)' : 'rgba(241,245,249,0.7)'} />
      </ReactFlow>

      {/* Diagram name + type below the YAML toggle */}
      <DiagramInfo layer={layer} />

      {/* YAML editor toggle */}
      <button
        onClick={() => setEditorOpen(v => !v)}
        title={editorOpen ? 'Close YAML editor' : 'Open YAML editor'}
        style={{ ...styles.editorToggleBtn, color: editorOpen ? '#7c6af7' : 'var(--subtle)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
      </button>

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
          onClick={() => setEditMode(v => !v)}
          title={editMode ? 'Exit edit mode' : 'Enter edit mode — drag nodes, reposition, connect edges'}
          style={{ ...styles.iconBtn, color: editMode ? '#10b981' : 'var(--muted)', borderColor: editMode ? '#10b981' : 'var(--border)' }}
        >
          {editMode ? '✏ Editing' : '✏ Edit'}
        </button>
        <button
          onClick={handleResetLayout}
          title="Reset to auto-layout (clears saved positions)"
          style={styles.iconBtn}
        >
          ⊞ Reset
        </button>
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
          style={{ ...styles.iconBtn, color: legendOpen ? '#7c6af7' : 'var(--muted)' }}
        >
          ☰ Legend
        </button>
        <Link to="/help" style={styles.iconBtn}>
          ? Help
        </Link>
      </div>

      {/* Legend panel */}
      {legendOpen && <Legend onClose={() => setLegendOpen(false)} theme={layer?.theme} />}

      {/* Metadata overlay */}
      {metaOverlay && (
        <MetaOverlay
          title={metaOverlay.title}
          loading={metaOverlay.loading}
          error={metaOverlay.error}
          meta={metaOverlay.data}
          onClose={() => setMetaOverlay(null)}
        />
      )}

      {/* Keyboard hint */}
      <div style={styles.hint}>
        {editMode
          ? 'drag from palette · connect handles · click edge to edit · Backspace to delete'
          : 'click to open · 👁 to highlight connections · ⎋ go back'}
      </div>

      {/* Edit mode: node palette */}
      {editMode && <NodePalette />}

      {/* Edit mode: node create/edit form */}
      {(pendingNode || editingNode) && layer && (
        <NodeForm
          initialType={pendingNode?.nodeType}
          initialData={editingNode ?? undefined}
          existingIds={layer.nodes.map(n => n.id)}
          currentYamlPath={yamlPath}
          onSave={handleNodeFormSave}
          onDelete={editingNode ? () => { handleDeleteNode(editingNode.id); setEditingNode(null) } : undefined}
          onCancel={() => { setPendingNode(null); setEditingNode(null) }}
        />
      )}

      {/* Edit mode: edge create/edit form */}
      {(pendingEdge || editingEdge) && (
        <EdgeForm
          key={editingEdge ? connectionKey(editingEdge.from, editingEdge.sourceAnchor, editingEdge.to, editingEdge.targetAnchor) : 'pending'}
          source={pendingEdge?.source ?? editingEdge?.from ?? ''}
          target={pendingEdge?.target ?? editingEdge?.to ?? ''}
          currentYamlPath={yamlPath}
          initialData={editingEdge
            ? (layer?.edges ?? []).find(e => connectionKey(e.from, e.sourceAnchor, e.to, e.targetAnchor) === connectionKey(editingEdge.from, editingEdge.sourceAnchor, editingEdge.to, editingEdge.targetAnchor))
            : { ...(pendingEdge?.sourceHandle && { sourceAnchor: pendingEdge.sourceHandle as YamlEdge['sourceAnchor'] }), ...(pendingEdge?.targetHandle && { targetAnchor: pendingEdge.targetHandle as YamlEdge['targetAnchor'] }) }
          }
          errorMsg={edgeConflictError ?? undefined}
          onSave={handleEdgeFormSave}
          onCancel={() => { setPendingEdge(null); setEditingEdge(null); setEdgeConflictError(null) }}
          onDelete={editingEdge ? handleEdgeFormDelete : undefined}
        />
      )}

      {nodes.length === 0 && !error && (
        <div style={styles.empty}>No nodes defined in {yamlPath}</div>
      )}
      {error && (
        <div style={styles.error}>
          <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>✕</button>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{error}</pre>
        </div>
      )}
      </div> {/* end canvas pane */}
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

export type { Props as DiagramViewProps }

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  resizeHandle: {
    width: 4,
    flexShrink: 0,
    cursor: 'col-resize',
    background: 'var(--border)',
    transition: 'background 0.15s',
    zIndex: 5,
  },
  editorToggleBtn: {
    position: 'absolute', top: 12, left: 12, zIndex: 5,
    background: 'var(--backdrop-heavy)', backdropFilter: 'blur(4px)',
    border: '1px solid var(--border)', borderRadius: 8,
    padding: '5px 8px', cursor: 'pointer',
    display: 'flex', alignItems: 'center',
  },
  toolbar: {
    position: 'absolute', top: 12, right: 12,
    display: 'flex', alignItems: 'center', gap: 6, zIndex: 5,
  },
  search: {
    background: 'var(--backdrop-heavy)', backdropFilter: 'blur(4px)',
    border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text)', fontSize: 12, padding: '5px 10px',
    outline: 'none', width: 160,
  },
  iconBtn: {
    background: 'var(--backdrop-heavy)', backdropFilter: 'blur(4px)',
    border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--muted)', fontSize: 12, padding: '5px 10px',
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  hint: {
    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
    fontSize: 11, color: 'var(--faint)',
    background: 'var(--hint-bg)', backdropFilter: 'blur(4px)',
    padding: '4px 12px', borderRadius: 20,
    pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap',
  },
  empty: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--faint)', fontSize: 16, pointerEvents: 'none',
  },
  error: {
    position: 'absolute', top: 44, left: 12, right: 12,
    background: '#1a0a0a', color: '#f87171',
    padding: '10px 14px', borderRadius: 8, border: '1px solid #7f1d1d',
    fontSize: 12, maxHeight: 140, overflow: 'auto', fontFamily: 'monospace',
    zIndex: 20,
  },
}
