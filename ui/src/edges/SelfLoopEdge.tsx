import { EdgeProps, EdgeLabelRenderer } from 'reactflow'

const COLOR = '#f59e0b' // amber — visually distinct from all other edge styles

export function SelfLoopEdge({
  id, sourceX, sourceY,
  label, selected,
}: EdgeProps) {
  // Both source and target handles are on the right side of the node (same point).
  // Draw a teardrop oval that arcs out to the right and loops back.
  const rx = 50  // horizontal reach
  const ry = 28  // half-height of the loop attachment points

  const d = [
    `M ${sourceX} ${sourceY - ry}`,
    `C ${sourceX + rx} ${sourceY - ry * 2},`,
    `${sourceX + rx} ${sourceY + ry * 2},`,
    `${sourceX} ${sourceY + ry}`,
  ].join(' ')

  // Label sits at the rightmost tip of the loop
  const labelX = sourceX + rx + 8
  const labelY = sourceY

  const stroke = selected ? '#ef4444' : COLOR
  const markerId = `sl-marker-${id}`

  return (
    <>
      <defs>
        <marker
          id={markerId}
          markerWidth="6" markerHeight="6"
          refX="1" refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill={stroke} />
        </marker>
      </defs>
      <path
        id={id}
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeDasharray="4 2"
        markerEnd={`url(#${markerId})`}
        className="react-flow__edge-path"
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(0, -50%) translate(${labelX}px,${labelY}px)`,
              background: '#1e2235',
              color: stroke,
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 4,
              border: `1px solid ${stroke}55`,
              pointerEvents: 'none',
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
