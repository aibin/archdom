import { TYPES, icons, getColor } from './nodes/Node'

interface Props {
  onClose: () => void
  theme?: Record<string, string>
}

const EDGE_STYLES = [
  { label: 'Sync',          stroke: 'var(--faint)', dasharray: undefined, animated: false, bidir: false },
  { label: 'Async',         stroke: 'var(--subtle)', dasharray: '8 4',     animated: false, bidir: false },
  { label: 'Depends',       stroke: 'var(--faint)', dasharray: '3 5',     animated: false, bidir: false },
  { label: 'Event',         stroke: '#7c6af7', dasharray: undefined, animated: true,  bidir: false },
  { label: 'Bidirectional', stroke: '#06b6d4', dasharray: undefined, animated: false, bidir: true  },
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
        <span style={{ ...styles.dot, background: 'var(--faint)', opacity: 0.7 }} />
        <span style={styles.icon} />
        <span style={{ ...styles.rowLabel, opacity: 0.7 }}>Any type · External</span>
      </div>

      <div style={styles.divider} />

      <div style={styles.section}>Edge Styles</div>
      {EDGE_STYLES.map(e => (
        <div key={e.label} style={styles.row}>
          <svg width={44} height={18} style={{ flexShrink: 0 }}>
            <defs>
              <marker id={`arr-${e.label}`} markerWidth="6" markerHeight="6"
                refX="3" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill={e.stroke} />
              </marker>
              <marker id={`arr-rev-${e.label}`} markerWidth="6" markerHeight="6"
                refX="3" refY="3" orient="auto-start-reverse">
                <path d="M0,0 L6,3 L0,6 Z" fill={e.stroke} />
              </marker>
            </defs>
            <line x1="2" y1="9" x2="38" y2="9"
              stroke={e.stroke} strokeWidth="1.5"
              strokeDasharray={e.dasharray}
              markerEnd={`url(#arr-${e.label})`}
              markerStart={e.bidir ? `url(#arr-rev-${e.label})` : undefined}
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
    background: 'var(--surface)',
    border: '1px solid var(--border)',
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
    fontWeight: 700, fontSize: 12, color: 'var(--text)', letterSpacing: 0.5, textTransform: 'uppercase',
  },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--subtle)', fontSize: 13, padding: '0 2px', lineHeight: 1,
  },
  section: {
    fontSize: 10, fontWeight: 700, color: 'var(--faint)',
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
    width: 15, height: 15, flexShrink: 0, color: 'var(--muted)',
    display: 'flex', alignItems: 'center',
  },
  rowLabel: {
    fontSize: 12, color: 'var(--muted)',
  },
  divider: {
    borderTop: '1px solid var(--border)', margin: '8px 0',
  },
}
