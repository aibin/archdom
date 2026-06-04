import { MetaFile } from './types'

interface Props {
  title: string
  loading: boolean
  error: string | null
  meta: MetaFile | null
  onClose: () => void
}

const STATUS_COLOR: Record<string, string> = {
  active:        '#22c55e',
  stable:        '#22c55e',
  deprecated:    '#ef4444',
  planned:       '#f59e0b',
  'in-progress': '#f59e0b',
  beta:          '#a78bfa',
}

const RESERVED = new Set(['title', 'description', 'owner', 'status', 'links'])

export function MetaOverlay({ title, loading, error, meta, onClose }: Props) {
  const displayTitle = meta?.title ?? title
  const statusKey = meta?.status?.toLowerCase() ?? ''
  const statusColor = STATUS_COLOR[statusKey] ?? 'var(--muted)'

  const extraFields = meta
    ? Object.entries(meta).filter(([k, v]) => !RESERVED.has(k) && (typeof v === 'string' || typeof v === 'number'))
    : []

  return (
    <div style={styles.root}>
      {/* invisible click-away backdrop */}
      <div style={styles.backdrop} onClick={onClose} />

      <div style={styles.panel}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.panelTitle} title={displayTitle}>
            {displayTitle}
          </span>
          {meta?.status && (
            <span style={{
              ...styles.statusBadge,
              color: statusColor,
              background: `${statusColor}1a`,
              border: `1px solid ${statusColor}40`,
            }}>
              {meta.status}
            </span>
          )}
          <button style={styles.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {loading && <p style={styles.muted}>Loading…</p>}
          {error   && <pre style={styles.errorText}>{error}</pre>}
          {meta && (
            <>
              {meta.owner && (
                <div style={styles.field}>
                  <span style={styles.fieldKey}>Owner</span>
                  <span style={styles.fieldVal}>{meta.owner}</span>
                </div>
              )}
              {meta.description && (
                <p style={styles.description}>{meta.description}</p>
              )}
              {extraFields.map(([k, v]) => (
                <div key={k} style={styles.field}>
                  <span style={styles.fieldKey}>{k}</span>
                  <span style={styles.fieldVal}>{String(v)}</span>
                </div>
              ))}
              {meta.links && meta.links.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={styles.sectionLabel}>Links</div>
                  {meta.links.map((lnk, i) => (
                    <a
                      key={i}
                      href={lnk.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.link}
                    >
                      <span style={{ flexShrink: 0 }}>↗</span>
                      <span>{lnk.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute', inset: 0, zIndex: 50,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
    padding: 16,
    pointerEvents: 'none',
  },
  backdrop: {
    position: 'absolute', inset: 0,
    pointerEvents: 'all', cursor: 'default',
  },
  panel: {
    position: 'relative', zIndex: 1,
    pointerEvents: 'all',
    width: 340, maxHeight: '78vh',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    boxShadow: '0 16px 48px rgba(0,0,0,0.65)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    marginTop: 48, // clear toolbar row
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 14px 10px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  panelTitle: {
    flex: 1, fontWeight: 700, fontSize: 14, color: 'var(--text)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  statusBadge: {
    fontSize: 10, fontWeight: 700,
    padding: '2px 8px', borderRadius: 10,
    textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0,
  },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--subtle)', fontSize: 15, lineHeight: 1,
    padding: '0 2px', flexShrink: 0,
  },
  body: {
    overflowY: 'auto', padding: '12px 14px 14px', flex: 1,
  },
  muted: {
    color: 'var(--subtle)', fontSize: 13, margin: 0,
  },
  errorText: {
    color: '#f87171', fontSize: 11, fontFamily: 'monospace',
    margin: 0, whiteSpace: 'pre-wrap',
  },
  field: {
    display: 'flex', gap: 10, marginBottom: 6,
  },
  fieldKey: {
    fontSize: 11, color: 'var(--faint)',
    textTransform: 'capitalize' as const,
    minWidth: 72, flexShrink: 0,
    paddingTop: 1,
  },
  fieldVal: {
    fontSize: 12, color: 'var(--muted)',
  },
  description: {
    fontSize: 13, color: '#cbd5e1', lineHeight: 1.65,
    margin: '8px 0 10px', whiteSpace: 'pre-wrap',
  },
  sectionLabel: {
    fontSize: 10, color: 'var(--faint)',
    textTransform: 'uppercase' as const, letterSpacing: 0.6,
    marginBottom: 6,
  },
  link: {
    display: 'flex', alignItems: 'center', gap: 6,
    color: '#7c6af7', fontSize: 12, textDecoration: 'none',
    marginBottom: 6, padding: '3px 0',
  },
}
