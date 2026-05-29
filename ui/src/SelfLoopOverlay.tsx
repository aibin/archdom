import { SelfLoop } from './types'

interface Props {
  nodeName: string
  loops: SelfLoop[]
  onClose: () => void
  onMeta: (path: string, title: string) => void
}

const STYLE_META: Record<string, { label: string; color: string; dash?: string }> = {
  sync:    { label: 'Sync',    color: '#475569' },
  async:   { label: 'Async',   color: '#64748b', dash: '6 3' },
  event:   { label: 'Event',   color: '#7c6af7' },
  depends: { label: 'Depends', color: '#475569', dash: '2 4' },
}

function StyleLine({ style }: { style?: string }) {
  const m = STYLE_META[style ?? 'sync'] ?? STYLE_META.sync
  return (
    <svg width={32} height={14} style={{ flexShrink: 0 }}>
      <defs>
        <marker id={`sl-arr-${style}`} markerWidth="5" markerHeight="5" refX="3" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill={m.color} />
        </marker>
      </defs>
      <line x1="2" y1="7" x2="26" y2="7"
        stroke={m.color} strokeWidth="1.5"
        strokeDasharray={m.dash}
        markerEnd={`url(#sl-arr-${style})`}
      />
    </svg>
  )
}

export function SelfLoopOverlay({ nodeName, loops, onClose, onMeta }: Props) {
  return (
    <div style={styles.root}>
      <div style={styles.backdrop} onClick={onClose} />

      <div style={styles.panel}>
        {/* Header */}
        <div style={styles.header}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0 }}>
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          <span style={styles.title}>Self-references · {nodeName}</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Loop list */}
        <div style={styles.body}>
          {loops.map((loop, i) => (
            <div key={i} style={styles.row}>
              <StyleLine style={loop.style} />
              <div style={styles.rowContent}>
                {loop.label && <div style={styles.label}>{loop.label}</div>}
                {loop.technology && <div style={styles.tech}>[{loop.technology}]</div>}
              </div>
              {loop.meta && (
                <button
                  style={styles.infoBtn}
                  title="Show metadata"
                  onClick={() => onMeta(loop.meta!, loop.label ?? nodeName)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4m0-4h.01" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute', inset: 0, zIndex: 50,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
    padding: 16, pointerEvents: 'none',
  },
  backdrop: {
    position: 'absolute', inset: 0,
    pointerEvents: 'all', cursor: 'default',
  },
  panel: {
    position: 'relative', zIndex: 1,
    pointerEvents: 'all',
    minWidth: 260, maxWidth: 340,
    background: '#1a1d27',
    border: '1px solid #2d3148',
    borderRadius: 12,
    boxShadow: '0 16px 48px rgba(0,0,0,0.65)',
    overflow: 'hidden',
    marginTop: 48,
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px 8px',
    borderBottom: '1px solid #2d3148',
  },
  title: {
    flex: 1, fontSize: 13, fontWeight: 700, color: '#e2e8f0',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#64748b', fontSize: 15, lineHeight: 1, padding: '0 2px', flexShrink: 0,
  },
  body: {
    padding: '8px 14px 12px',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '6px 0',
    borderBottom: '1px solid rgba(45,49,72,0.5)',
  },
  rowContent: {
    flex: 1, minWidth: 0,
  },
  label: {
    fontSize: 13, color: '#cbd5e1',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  tech: {
    fontSize: 11, color: '#64748b', fontStyle: 'italic', marginTop: 2,
  },
  infoBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#64748b', padding: '0 2px', flexShrink: 0,
    display: 'flex', alignItems: 'center',
  },
}
