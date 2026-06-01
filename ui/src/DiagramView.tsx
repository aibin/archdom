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
import { C4NodeData, MetaFile, SelfLoop, YamlLayer, YamlEdge, YamlNode, DiagramType, YamlGroup } from './types'
import { loadYaml, loadRawText, saveRawText, saveYamlLayer, createDiagramIfMissing, loadMetaFile, loadPositions, savePositions, clearPositions, NodePositions, yamlCache } from './yamlLoader'
import { YamlEditor, EditorSaveStatus } from './YamlEditor'
import { Legend } from './Legend'
import { MetaOverlay } from './MetaOverlay'
import { SelfLoopOverlay } from './SelfLoopOverlay'
import { edgeAppearance, edgeLabel } from './diagramUtils'
import { NodePalette } from './NodePalette'
import { NodeForm } from './NodeForm'
import { EdgeForm } from './EdgeForm'

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
          fontSize: 13, fontWeight: 700, color: '#e2e8f0',
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
            background: 'rgba(26,29,39,0.88)', backdropFilter: 'blur(4px)',
            color: '#64748b', fontSize: 10,
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

function validateEdges(edges: YamlEdge[]): void {
  const seen = new Set<string>()
  for (const e of edges) {
    if (e.from === e.to) continue  // self-loops are intentional
    const fwd = `${e.from}→${e.to}`
    const rev = `${e.to}→${e.from}`
    if (seen.has(rev)) {
      throw new Error(
        `Edge conflict: "${e.from} → ${e.to}" and "${e.to} → ${e.from}" are both defined.\n` +
        `Remove one and add  bidirectional: true  to the remaining edge instead.`
      )
    }
    seen.add(fwd)
  }
}

// ── Layout ────────────────────────────────────────────────────────────────────

const GPAD       = 28  // horizontal / bottom padding inside the group box
const GHEAD_BASE = 40  // top padding when no description
const GHEAD_DESC = 62  // top padding when description is present

function applyLayout(layer: YamlLayer, savedPos: NodePositions = {}): { nodes: Node<C4NodeData>[]; edges: Edge[] } {
  validateEdges(layer.edges ?? [])
  const groups: YamlGroup[] = layer.groups ?? []

  // Collect self-loops per node (rendered as an icon, not a canvas edge)
  const selfLoopMap = new Map<string, SelfLoop[]>()
  ;(layer.edges ?? []).filter(e => e.from === e.to).forEach(e => {
    const list = selfLoopMap.get(e.from) ?? []
    list.push({ label: e.label, technology: e.technology, style: e.style, meta: e.meta })
    selfLoopMap.set(e.from, list)
  })
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
    // Only edges between this group's own members (skip self-loops)
    ;(layer.edges ?? []).forEach(e => {
      if (e.from === e.to) return
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
    if (from === to) return  // skip self-loops and intra-group edges
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
          selfLoops: selfLoopMap.get(n.id), theme: layer.theme,
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
    .filter(e => e.from !== e.to)  // self-loops become node icons, not canvas edges
    .map((e, i) => ({
      id: `e-${i}`, source: e.from, target: e.to,
      label: edgeLabel(e), ...edgeAppearance(e.style, e.bidirectional ?? false),
      ...(e.sourceAnchor && { sourceHandle: srcHandle(e.sourceAnchor) }),
      ...(e.targetAnchor && { targetHandle: tgtHandle(e.targetAnchor) }),
      data: { meta: e.meta, yamlFrom: e.from, yamlTo: e.to },
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

  type SelfLoopState = { loops: SelfLoop[]; nodeName: string }
  const [selfLoopOverlay, setSelfLoopOverlay] = useState<SelfLoopState | null>(null)

  // ── Edit mode state ────────────────────────────────────────────────────────
  const [editMode, setEditMode]         = useState(false)
  const [pendingEdge, setPendingEdge]   = useState<{ source: string; target: string; sourceHandle: string | null; targetHandle: string | null } | null>(null)
  const [pendingNode, setPendingNode]   = useState<{ position: { x: number; y: number }; nodeType: string } | null>(null)
  const [editingNode, setEditingNode]   = useState<YamlNode | null>(null)
  const [editingEdge, setEditingEdge]   = useState<{ from: string; to: string } | null>(null)

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

  // ── Self-loop overlay ─────────────────────────────────────────────────────
  const handleShowSelfLoop = useCallback((loops: SelfLoop[], nodeName: string) => {
    setSelfLoopOverlay({ loops, nodeName })
    setMetaOverlay(null)
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
      if (n.type === 'group') return { ...n, data: { ...n.data, onHighlight: handleHighlight, onInfo: handleShowMeta, onSelfLoop: handleShowSelfLoop } }

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
        data: { ...n.data, highlighted: n.id === highlightId, onHighlight: handleHighlight, onInfo: handleShowMeta, onSelfLoop: handleShowSelfLoop },
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
  }, [nodes, edges, highlightId, selectedEdgeId, searchQuery, handleHighlight, handleShowMeta, handleShowSelfLoop])

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
      const d = (edge.data ?? {}) as { yamlFrom?: string; yamlTo?: string }
      if (d.yamlFrom && d.yamlTo) setEditingEdge({ from: d.yamlFrom, to: d.yamlTo })
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
          data: { ...n.data, name: nodeData.name, description: nodeData.description ?? '', technology: nodeData.technology ?? '', external: nodeData.external, link: nodeData.link, file: nodeData.file, nodeType: nodeData.type ?? 'server-app' },
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
      newLayer = {
        ...layer,
        edges: (layer.edges ?? []).map(e =>
          e.from === editingEdge.from && e.to === editingEdge.to
            ? { from: e.from, to: e.to, ...edgeProps } as YamlEdge
            : e
        ),
      }
      setEdges(prev => prev.map(e => {
        const d = (e.data ?? {}) as { yamlFrom?: string; yamlTo?: string }
        if (d.yamlFrom !== editingEdge.from || d.yamlTo !== editingEdge.to) return e
        const ye: YamlEdge = { from: editingEdge.from, to: editingEdge.to, ...edgeProps }
        return { ...e, label: edgeLabel(ye), ...edgeAppearance(ye.style, ye.bidirectional ?? false), data: { ...d, meta: ye.meta } }
      }))
      setEditingEdge(null)
    } else if (pendingEdge) {
      const { source, target, sourceHandle, targetHandle } = pendingEdge
      const anchorProps: Partial<YamlEdge> = {
        ...(sourceHandle && { sourceAnchor: sourceHandle as YamlEdge['sourceAnchor'] }),
        ...(targetHandle && { targetAnchor: targetHandle as YamlEdge['targetAnchor'] }),
      }
      const newYamlEdge: YamlEdge = { from: source, to: target, ...anchorProps, ...edgeProps }
      newLayer = { ...layer, edges: [...(layer.edges ?? []), newYamlEdge] }
      const newFlowEdge: Edge = {
        id: `e-${Date.now()}`,
        source: newYamlEdge.from, target: newYamlEdge.to,
        label: edgeLabel(newYamlEdge),
        ...edgeAppearance(newYamlEdge.style, newYamlEdge.bidirectional ?? false),
        ...(sourceHandle && { sourceHandle }),
        ...(targetHandle && { targetHandle }),
        data: { meta: newYamlEdge.meta, yamlFrom: newYamlEdge.from, yamlTo: newYamlEdge.to },
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
    const newLayer = { ...layer, edges: (layer.edges ?? []).filter(e => !(e.from === editingEdge.from && e.to === editingEdge.to)) }
    setEdges(prev => prev.filter(e => {
      const d = (e.data ?? {}) as { yamlFrom?: string; yamlTo?: string }
      return !(d.yamlFrom === editingEdge.from && d.yamlTo === editingEdge.to)
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
    const deletedPairs = new Set(deleted.map(e => {
      const d = (e.data ?? {}) as { yamlFrom?: string; yamlTo?: string }
      return d.yamlFrom && d.yamlTo ? `${d.yamlFrom}→${d.yamlTo}` : ''
    }).filter(Boolean))
    if (!deletedPairs.size) return
    const newLayer = { ...layer, edges: (layer.edges ?? []).filter(e => !deletedPairs.has(`${e.from}→${e.to}`)) }
    setLayer(newLayer)
    await syncYaml(newLayer)
  }, [layer, syncYaml])

  const handlePaneClick = useCallback(() => {
    setHighlightId(null)
    setSelectedEdgeId(null)
    setMetaOverlay(null)
    setSelfLoopOverlay(null)
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
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={40}
        minZoom={0.1}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#2d3148" gap={24} />
        <Controls style={{ background: '#1a1d27', borderColor: '#2d3148', color: '#94a3b8' }} />
        <MiniMap style={{ background: '#1a1d27', borderColor: '#2d3148' }} nodeColor="#4f46e5" maskColor="rgba(15,17,23,0.7)" />
      </ReactFlow>

      {/* Diagram name + type below the YAML toggle */}
      <DiagramInfo layer={layer} />

      {/* YAML editor toggle */}
      <button
        onClick={() => setEditorOpen(v => !v)}
        title={editorOpen ? 'Close YAML editor' : 'Open YAML editor'}
        style={{ ...styles.editorToggleBtn, color: editorOpen ? '#7c6af7' : '#64748b' }}
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
          title={editMode ? 'Exit edit mode' : 'Enter edit mode — drag nodes, connect edges'}
          style={{ ...styles.iconBtn, color: editMode ? '#10b981' : '#94a3b8', borderColor: editMode ? '#10b981' : '#2d3148' }}
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

      {/* Self-loop overlay */}
      {selfLoopOverlay && (
        <SelfLoopOverlay
          nodeName={selfLoopOverlay.nodeName}
          loops={selfLoopOverlay.loops}
          onClose={() => setSelfLoopOverlay(null)}
          onMeta={(path, title) => { setSelfLoopOverlay(null); handleShowMeta(path, title) }}
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
          source={pendingEdge?.source ?? editingEdge?.from ?? ''}
          target={pendingEdge?.target ?? editingEdge?.to ?? ''}
          initialData={editingEdge ? (layer?.edges ?? []).find(e => e.from === editingEdge.from && e.to === editingEdge.to) : undefined}
          onSave={handleEdgeFormSave}
          onCancel={() => { setPendingEdge(null); setEditingEdge(null) }}
          onDelete={editingEdge ? handleEdgeFormDelete : undefined}
        />
      )}

      {nodes.length === 0 && !error && (
        <div style={styles.empty}>No nodes defined in {yamlPath}</div>
      )}
      {error && <pre style={styles.error}>{error}</pre>}
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
    background: '#2d3148',
    transition: 'background 0.15s',
    zIndex: 5,
  },
  editorToggleBtn: {
    position: 'absolute', top: 12, left: 12, zIndex: 5,
    background: 'rgba(26,29,39,0.9)', backdropFilter: 'blur(4px)',
    border: '1px solid #2d3148', borderRadius: 8,
    padding: '5px 8px', cursor: 'pointer',
    display: 'flex', alignItems: 'center',
  },
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
