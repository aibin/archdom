import { useEffect, useRef, useState } from 'react'
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge, useReactFlow } from 'reactflow'

// Ternary search: finds the t in [0,1] on the path closest to (px, py)
function closestT(d: string, px: number, py: number): number {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  el.setAttribute('d', d)
  const len = el.getTotalLength()
  let lo = 0, hi = 1
  for (let i = 0; i < 20; i++) {
    const m1 = lo + (hi - lo) / 3
    const m2 = hi - (hi - lo) / 3
    const p1 = el.getPointAtLength(m1 * len)
    const p2 = el.getPointAtLength(m2 * len)
    const d1 = (p1.x - px) ** 2 + (p1.y - py) ** 2
    const d2 = (p2.x - px) ** 2 + (p2.y - py) ** 2
    if (d1 < d2) hi = m2; else lo = m1
  }
  return Math.max(0.05, Math.min(0.95, (lo + hi) / 2))
}

function pointAt(d: string, t: number): { x: number; y: number } {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  el.setAttribute('d', d)
  const { x, y } = el.getPointAtLength(t * el.getTotalLength())
  return { x, y }
}

export function ArchdomEdge({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, label, labelStyle, labelBgStyle,
  markerEnd, markerStart, style, interactionWidth,
}: EdgeProps) {
  const { screenToFlowPosition } = useReactFlow()
  const editMode: boolean = data?.editMode ?? false
  const savedOffset: number = data?.labelOffset ?? 0.5

  // Local offset used during drag — cleared once parent syncs the new value
  const [dragOffset, setDragOffset] = useState<number | null>(null)
  const dragging = useRef(false)

  useEffect(() => {
    if (!dragging.current) setDragOffset(null)
  }, [savedOffset])

  const labelOffset = dragOffset ?? savedOffset

  const [edgePath, midX, midY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  let labelX = midX
  let labelY = midY
  if (labelOffset !== 0.5) {
    const pt = pointAt(edgePath, labelOffset)
    labelX = pt.x
    labelY = pt.y
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!editMode) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !(e.buttons & 1)) return
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    setDragOffset(closestT(edgePath, pos.x, pos.y))
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    dragging.current = false
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const t = closestT(edgePath, pos.x, pos.y)
    setDragOffset(t)
    data?.onLabelOffsetChange?.(id, t)
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={style}
        interactionWidth={interactionWidth}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: editMode ? 'all' : 'none',
              cursor: editMode ? (dragging.current ? 'grabbing' : 'grab') : 'default',
              background: (labelBgStyle as React.CSSProperties & { fill?: string })?.fill ?? 'var(--surface2)',
              opacity: (labelBgStyle as React.CSSProperties & { fillOpacity?: number })?.fillOpacity ?? 0.9,
              color: (labelStyle as React.CSSProperties & { fill?: string })?.fill ?? 'var(--muted)',
              fontSize: (labelStyle as React.CSSProperties & { fontSize?: number })?.fontSize ?? 11,
              padding: '2px 6px',
              borderRadius: 3,
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {label as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const edgeTypes = { archdom: ArchdomEdge }
