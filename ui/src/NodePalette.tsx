import { useState } from 'react'
import { icons, TYPES } from './nodes/Node'

const PALETTE_ITEMS: { type: string }[] = [
  { type: 'server-app'          },
  { type: 'container'           },
  { type: 'software-system'     },
  { type: 'component'           },
  { type: 'db'                  },
  { type: 's3'                  },
  { type: 'user'                },
  { type: 'boundary'            },
  { type: 'deployment-node'     },
  { type: 'infrastructure-node' },
]

export function NodePalette() {
  const onDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('application/archdom-nodetype', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 44,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      background: 'rgba(20,22,32,0.95)',
      backdropFilter: 'blur(8px)',
      border: '1px solid #2d3148',
      borderRadius: 40,
      padding: '6px 10px',
    }}>
      {PALETTE_ITEMS.map(({ type }) => (
        <PaletteIcon key={type} type={type} onDragStart={onDragStart} />
      ))}
    </div>
  )
}

function PaletteIcon({
  type,
  onDragStart,
}: {
  type: string
  onDragStart: (e: React.DragEvent, t: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const color = TYPES[type]?.color ?? '#475569'
  const label = TYPES[type]?.label ?? type

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0f1117',
          border: '1px solid #2d3148',
          borderRadius: 6,
          padding: '4px 8px',
          fontSize: 11,
          color: '#e2e8f0',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 20,
        }}>
          {label}
          {/* Arrow */}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: `5px solid #2d3148`,
          }} />
        </div>
      )}

      {/* Icon button */}
      <div
        draggable
        onDragStart={e => onDragStart(e, type)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          color: hovered ? color : '#64748b',
          background: hovered ? `${color}18` : 'transparent',
          border: `1px solid ${hovered ? color + '55' : 'transparent'}`,
          transition: 'all 0.12s ease',
          userSelect: 'none',
        }}
      >
        {icons[type] ?? icons['server-app']}
      </div>
    </div>
  )
}
