import { TYPES, icons, getColor } from './nodes/Node'

interface Props {
  onClose: () => void
  theme?: Record<string, string>
}

const EDGE_STYLES = [
  { label: 'Sync',           stroke: '#475569', dasharray: undefined,  animated: false },
  { label: 'Async',          stroke: '#64748b', dasharray: '8 4',      animated: false },
  { label: 'Depends',        stroke: '#475569', dasharray: '3 5',      animated: false },
  { label: 'Event',          stroke: '#7c6af7', dasharray: undefined,  animated: true  },
]

export function Legend({ onClose, theme }: Props) {
  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Legend</span>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
      </div>

      <div style={styles.section}>Node Types</div>
      {Object.entries(TYPES).map(([key, cfg]) => (
        <div key={key} style={styles.row}>
          <span style={{ ...styles.dot, background: getColor(key, theme), borderRadius: key === 'user' ? '50%' : 3 }} />
          <span style={styles.icon}>{icons[key]}</span>
          <span style={styles.rowLabel}>{cfg.label}</span>
        </div>
      ))}
      <div style={{ ...styles.row, marginTop: 2 }}>
        <span style={{ ...styles.dot, background: '#475569', opacity: 0.7 }} />
        <span style={styles.icon} />
        <span style={{ ...styles.rowLabel, opacity: 0.7 }}>Any type · External</span>
      </div>

      <div style={styles.divider} />

      <div style={styles.section}>Edge Styles</div>
      {EDGE_STYLES.map(e => (
        <div key={e.label} style={styles.row}>
          <svg width={44} height={14} style={{ flexShrink: 0 }}>
            <defs>
              <marker id={`arr-${e.label}`} markerWidth="6" markerHeight="6"
                refX="3" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill={e.stroke} />
              </marker>
            </defs>
            <line x1="2" y1="7" x2="38" y2="7"
              stroke={e.stroke} strokeWidth="1.5"
              strokeDasharray={e.dasharray}
              markerEnd={`url(#arr-${e.label})`}
            />
          </svg>
          <span style={styles.rowLabel}>
            {e.label}
            {e.animated && <span style={{ color: '#7c6af7', marginLeft: 4 }}>(animated)</span>}
          </span>
        </div>
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'absolute',
    bottom: 60,
    left: 12,
    background: '#1a1d27',
    border: '1px solid #2d3148',
    borderRadius: 10,
    padding: '10px 14px 12px',
    minWidth: 210,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontWeight: 700, fontSize: 12, color: '#e2e8f0', letterSpacing: 0.5, textTransform: 'uppercase',
  },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#64748b', fontSize: 13, padding: '0 2px', lineHeight: 1,
  },
  section: {
    fontSize: 10, fontWeight: 700, color: '#475569',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 6, marginBottom: 4,
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
  },
  dot: {
    width: 12, height: 12, flexShrink: 0,
  },
  icon: {
    width: 15, height: 15, flexShrink: 0, color: '#94a3b8',
    display: 'flex', alignItems: 'center',
  },
  rowLabel: {
    fontSize: 12, color: '#94a3b8',
  },
  divider: {
    borderTop: '1px solid #2d3148', margin: '8px 0',
  },
}
