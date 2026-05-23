import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { C4NodeData } from '../types'

// ── Icon base ─────────────────────────────────────────────────────────────────

const Ic = ({ size = 15, children }: { size?: number; children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    {children}
  </svg>
)

// ── Icons ─────────────────────────────────────────────────────────────────────

export const icons: Record<string, React.ReactNode> = {
  'software-system': (
    <Ic>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </Ic>
  ),
  container: (
    <Ic>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </Ic>
  ),
  component: (
    <Ic>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
      <line x1="14" y1="4" x2="10" y2="20" />
    </Ic>
  ),
  service: (
    <Ic>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </Ic>
  ),
  boundary: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3"
      style={{ flexShrink: 0 }}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  ),
  s3: (
    <Ic>
      <path d="M7 6h10l-1.5 12H8.5L7 6z" />
      <line x1="5" y1="6" x2="19" y2="6" />
      <path d="M10 6V4a2 2 0 0 1 4 0v2" />
    </Ic>
  ),
  directory: (
    <Ic>
      <path d="M3 8c0-1.1.9-2 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
    </Ic>
  ),
  db: (
    <Ic>
      <ellipse cx="12" cy="7" rx="8" ry="3" />
      <path d="M4 7v10c0 1.66 3.58 3 8 3s8-1.34 8-3V7" />
      <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </Ic>
  ),
  spa: (
    <Ic>
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <line x1="2" y1="9" x2="22" y2="9" />
      <circle cx="6" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="6" r="1" fill="currentColor" stroke="none" />
    </Ic>
  ),
  'server-app': (
    <Ic>
      <rect x="2" y="3" width="20" height="7" rx="1" />
      <rect x="2" y="14" width="20" height="7" rx="1" />
      <circle cx="18" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
      <line x1="5" y1="6.5" x2="13" y2="6.5" />
      <line x1="5" y1="17.5" x2="13" y2="17.5" />
    </Ic>
  ),
  user: (
    <Ic>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </Ic>
  ),
  'deployment-node': (
    <Ic>
      <rect x="2" y="2" width="20" height="8" rx="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" />
      <circle cx="19" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="18" r="1.5" fill="currentColor" stroke="none" />
      <line x1="5" y1="6" x2="14" y2="6" />
      <line x1="5" y1="18" x2="14" y2="18" />
      <line x1="12" y1="10" x2="12" y2="14" strokeDasharray="2 2" />
    </Ic>
  ),
  'infrastructure-node': (
    <Ic>
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </Ic>
  ),
}

// ── Type config ───────────────────────────────────────────────────────────────

interface TypeConfig { color: string; label: string }

export const TYPES: Record<string, TypeConfig> = {
  // ── Primary types ─────────────────────────────────────────────────────────
  'software-system':   { color: '#1d6fb8', label: 'Software System'  },
  container:           { color: '#0e7490', label: 'Container'         },
  component:           { color: '#059669', label: 'Component'         },
  // ── Specialised sub-types ────────────────────────────────────────────────────
  service:             { color: '#4f46e5', label: 'Service'           },
  boundary:            { color: '#64748b', label: 'Boundary'          },
  s3:                  { color: '#ea7317', label: 'AWS S3'            },
  directory:           { color: '#ca8a04', label: 'Directory'         },
  db:                  { color: '#0891b2', label: 'DB / RDS'          },
  spa:                 { color: '#9333ea', label: 'SPA'               },
  'server-app':        { color: '#16a34a', label: 'Server App'        },
  user:                { color: '#2563eb', label: 'User'              },
  'deployment-node':   { color: '#1d4ed8', label: 'Deployment Node'   },
  'infrastructure-node': { color: '#64748b', label: 'Infrastructure'  },
}
const FALLBACK = TYPES.service

export function getColor(nodeType: string, theme?: Record<string, string>, isExternal = false): string {
  if (isExternal) return '#475569'
  return theme?.[nodeType] ?? TYPES[nodeType]?.color ?? FALLBACK.color
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const sh = {
  handle: { background: '#475569', border: 'none', width: 8, height: 8 } as React.CSSProperties,
  name:   { fontWeight: 700, fontSize: 13, color: '#e2e8f0', padding: '7px 10px 2px', lineHeight: 1.3 } as React.CSSProperties,
  tech:   { fontSize: 11, color: '#94a3b8', padding: '0 10px 2px', fontStyle: 'italic' } as React.CSSProperties,
  desc:   { fontSize: 11, color: '#94a3b8', padding: '0 10px 8px', lineHeight: 1.4 } as React.CSSProperties,
  strip:  { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', color: '#fff' } as React.CSSProperties,
  lbl:    { flex: 1, fontSize: 11, fontWeight: 600 as const, letterSpacing: 0.5, textTransform: 'uppercase' as const, opacity: 0.95 },
}

function DrillBadge({ file }: { file?: string }) {
  return file ? <span style={{ fontSize: 11 }}>⬇</span> : null
}

function LinkBtn({ link }: { link?: string }) {
  if (!link) return null
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      title="Open link"
      style={{
        display: 'flex', alignItems: 'center', flexShrink: 0,
        color: 'rgba(255,255,255,0.55)', padding: '0 2px',
        textDecoration: 'none',
      }}
    >
      <Ic size={13}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </Ic>
    </a>
  )
}

function HighlightBtn({ id, highlighted, onHighlight }: {
  id: string
  highlighted?: boolean
  onHighlight?: (id: string) => void
}) {
  if (!onHighlight) return null
  return (
    <button
      onClick={e => { e.stopPropagation(); onHighlight(id) }}
      title={highlighted ? 'Clear highlight' : 'Highlight connections'}
      style={{
        background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer',
        color: highlighted ? '#fbbf24' : 'rgba(255,255,255,0.55)',
        display: 'flex', alignItems: 'center', flexShrink: 0,
      }}
    >
      <Ic size={13}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </Ic>
    </button>
  )
}

// ── Rectangle node  (service · spa · server-app · boundary · infrastructure-node) ──

export const RectNode = memo(({ id, data }: NodeProps<C4NodeData>) => {
  const cfg = TYPES[data.nodeType] ?? FALLBACK
  const icon = icons[data.nodeType] ?? icons.service
  const isBoundary = data.nodeType === 'boundary'
  const color = getColor(data.nodeType, data.theme, data.external)
  const label = `${cfg.label}${data.external ? ' · External' : ''}`
  return (
    <div style={{
      width: 220,
      background: isBoundary ? 'rgba(30,34,53,0.55)' : '#1e2235',
      border: `2px ${isBoundary ? 'dashed' : 'solid'} ${color}`,
      borderRadius: 8, overflow: 'hidden',
      cursor: data.file ? 'pointer' : 'default',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      opacity: data.external ? 0.85 : 1,
    }}>
      <Handle type="target" position={Position.Top} style={sh.handle} />
      <div style={{ ...sh.strip, background: color }}>
        {icon}
        <span style={sh.lbl}>{label}</span>
        <DrillBadge file={data.file} />
        <LinkBtn link={data.link} />
        <HighlightBtn id={id} highlighted={data.highlighted} onHighlight={data.onHighlight} />
      </div>
      <div style={sh.name}>{data.name}</div>
      {data.technology && <div style={sh.tech}>[{data.technology}]</div>}
      {data.description && <div style={sh.desc}>{data.description}</div>}
      <Handle type="source" position={Position.Bottom} style={sh.handle} />
    </div>
  )
})
RectNode.displayName = 'RectNode'

// ── Cylinder node  (db · s3) ──────────────────────────────────────────────────

export const CylinderNode = memo(({ id, data }: NodeProps<C4NodeData>) => {
  const cfg = TYPES[data.nodeType] ?? FALLBACK
  const icon = icons[data.nodeType] ?? icons.db
  const color = getColor(data.nodeType, data.theme, data.external)
  const label = `${cfg.label}${data.external ? ' · Ext' : ''}`
  return (
    <div style={{ width: 200, cursor: data.file ? 'pointer' : 'default', position: 'relative' }}>
      <Handle type="target" position={Position.Top} style={{ ...sh.handle, top: 10 }} />

      <div style={{
        height: 22, borderRadius: '50%',
        background: color, border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 5, color: '#fff', position: 'relative', zIndex: 1,
      }}>
        {icon}
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {label}
        </span>
        <DrillBadge file={data.file} />
        <LinkBtn link={data.link} />
        <HighlightBtn id={id} highlighted={data.highlighted} onHighlight={data.onHighlight} />
      </div>

      <div style={{
        background: '#1e2235',
        borderLeft: `2px solid ${color}`,
        borderRight: `2px solid ${color}`,
        padding: '6px 12px 10px',
        marginTop: -2, marginBottom: -2,
      }}>
        <div style={sh.name}>{data.name}</div>
        {data.technology && <div style={sh.tech}>[{data.technology}]</div>}
        {data.description && <div style={sh.desc}>{data.description}</div>}
      </div>

      <div style={{
        height: 22, borderRadius: '50%',
        background: '#161924',
        border: `2px solid ${color}`,
        position: 'relative', zIndex: 1,
      }} />

      <Handle type="source" position={Position.Bottom} style={{ ...sh.handle, bottom: 10 }} />
    </div>
  )
})
CylinderNode.displayName = 'CylinderNode'

// ── Folder node  (directory) ──────────────────────────────────────────────────

export const FolderNode = memo(({ id, data }: NodeProps<C4NodeData>) => {
  const color = getColor('directory', data.theme, data.external)
  return (
    <div style={{ width: 210, cursor: data.file ? 'pointer' : 'default' }}>
      <Handle type="target" position={Position.Top} style={{ ...sh.handle, top: 4 }} />

      <div style={{
        width: '45%', height: 12,
        background: color,
        borderRadius: '5px 5px 0 0',
        marginLeft: 10,
      }} />

      <div style={{
        background: '#1e2235',
        border: `2px solid ${color}`,
        borderRadius: '0 6px 6px 6px',
        overflow: 'hidden',
      }}>
        <div style={{ ...sh.strip, background: color }}>
          {icons.directory}
          <span style={sh.lbl}>{TYPES.directory.label}{data.external ? ' · Ext' : ''}</span>
          <DrillBadge file={data.file} />
          <LinkBtn link={data.link} />
          <HighlightBtn id={id} highlighted={data.highlighted} onHighlight={data.onHighlight} />
        </div>
        <div style={sh.name}>{data.name}</div>
        {data.technology && <div style={sh.tech}>[{data.technology}]</div>}
        {data.description && <div style={sh.desc}>{data.description}</div>}
      </div>

      <Handle type="source" position={Position.Bottom} style={sh.handle} />
    </div>
  )
})
FolderNode.displayName = 'FolderNode'

// ── Person node  (user) ───────────────────────────────────────────────────────

export const PersonNode = memo(({ id, data }: NodeProps<C4NodeData>) => {
  const color = getColor('user', data.theme, data.external)
  return (
    <div style={{
      width: 120, height: 120,
      borderRadius: '50%',
      background: '#1e2235',
      border: `2px solid ${color}`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      cursor: data.file ? 'pointer' : 'default',
      textAlign: 'center', padding: '0 8px', boxSizing: 'border-box',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    }}>
      <Handle type="target" position={Position.Top} style={{ ...sh.handle, top: 6 }} />

      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </svg>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#e2e8f0', marginTop: 4, lineHeight: 1.2 }}>
        {data.name}
      </div>
      <div style={{ fontSize: 9, color, fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {data.external ? 'External User' : TYPES.user.label}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
        {data.file && <span style={{ fontSize: 9, color: '#94a3b8' }}>⬇</span>}
        <LinkBtn link={data.link} />
        <HighlightBtn id={id} highlighted={data.highlighted} onHighlight={data.onHighlight} />
      </div>

      <Handle type="source" position={Position.Bottom} style={{ ...sh.handle, bottom: 6 }} />
    </div>
  )
})
PersonNode.displayName = 'PersonNode'

// ── Deployment node ───────────────────────────────────────────────────────────

export const DeploymentNode = memo(({ id, data }: NodeProps<C4NodeData>) => {
  const color = getColor('deployment-node', data.theme)
  return (
    <div style={{
      width: 240,
      background: 'rgba(29,78,216,0.06)',
      border: `2px dashed ${color}`,
      borderRadius: 10, overflow: 'hidden',
      cursor: data.file ? 'pointer' : 'default',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    }}>
      <Handle type="target" position={Position.Top} style={sh.handle} />
      <div style={{ ...sh.strip, background: 'rgba(29,78,216,0.35)' }}>
        {icons['deployment-node']}
        <span style={sh.lbl}>{TYPES['deployment-node'].label}</span>
        {data.technology && (
          <span style={{ fontSize: 10, opacity: 0.85, whiteSpace: 'nowrap' }}>
            [{data.technology}]
          </span>
        )}
        <DrillBadge file={data.file} />
        <LinkBtn link={data.link} />
        <HighlightBtn id={id} highlighted={data.highlighted} onHighlight={data.onHighlight} />
      </div>
      <div style={sh.name}>{data.name}</div>
      {data.description && <div style={sh.desc}>{data.description}</div>}
      <Handle type="source" position={Position.Bottom} style={sh.handle} />
    </div>
  )
})
DeploymentNode.displayName = 'DeploymentNode'

// ── Group / boundary node ─────────────────────────────────────────────────────

export const GroupNode = memo(({ data }: NodeProps<C4NodeData>) => (
  <div style={{
    width: '100%', height: '100%', boxSizing: 'border-box',
    border: '2px dashed #475569', borderRadius: 10,
    background: 'rgba(100,116,139,0.05)',
    pointerEvents: 'none',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }}>
      {icons.boundary}
      <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>{data.name}</span>
    </div>
    {data.description && (
      <div style={{ fontSize: 10, color: '#64748b', padding: '0 12px 4px', fontStyle: 'italic' }}>
        {data.description}
      </div>
    )}
  </div>
))
GroupNode.displayName = 'GroupNode'

// ── Node type registry + dimension helpers ────────────────────────────────────

export const nodeTypes = {
  rect:       RectNode,
  cylinder:   CylinderNode,
  folder:     FolderNode,
  person:     PersonNode,
  deployment: DeploymentNode,
  group:      GroupNode,
}

export function getFlowType(nodeType: string): keyof typeof nodeTypes {
  if (nodeType === 'db' || nodeType === 's3')    return 'cylinder'
  if (nodeType === 'user')                        return 'person'
  if (nodeType === 'directory')                   return 'folder'
  if (nodeType === 'deployment-node')             return 'deployment'
  return 'rect'
}

export function getNodeSize(nodeType: string): { w: number; h: number } {
  if (nodeType === 'db' || nodeType === 's3')    return { w: 200, h: 130 }
  if (nodeType === 'user')                        return { w: 120, h: 120 }
  if (nodeType === 'directory')                   return { w: 210, h: 115 }
  if (nodeType === 'deployment-node')             return { w: 240, h: 115 }
  return { w: 220, h: 110 }
}
