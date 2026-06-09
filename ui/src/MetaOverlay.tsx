import { MetaFile } from './types'

interface Props {
  title: string
  loading: boolean
  error: string | null
  meta: MetaFile | null
  onClose: () => void
}

const RESERVED = new Set(['title', 'description', 'links'])

export function MetaOverlay({ title, loading, error, meta, onClose }: Props) {
  const displayTitle = meta?.title ?? title

  const properties: { key: string; value: string }[] = meta
    ? Object.entries(meta)
        .filter(([k, v]) => !RESERVED.has(k) && (typeof v === 'string' || typeof v === 'number'))
        .map(([k, v]) => ({ key: k, value: String(v) }))
    : []

  const hasContent = meta && (meta.description || properties.length > 0 || (meta.links && meta.links.length > 0))

  return (
    <div style={styles.root}>
      <div style={styles.backdrop} onClick={onClose} />

      <div style={styles.panel}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.panelTitle} title={displayTitle}>{displayTitle}</span>
          <button style={styles.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {loading && <p style={styles.muted}>Loading…</p>}
          {error   && <pre style={styles.errorText}>{error}</pre>}

          {meta && !hasContent && (
            <p style={styles.muted}>No metadata content.</p>
          )}

          {meta && hasContent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Description */}
              {meta.description && (
                <p style={styles.description}>{meta.description as string}</p>
              )}

              {/* Properties grid */}
              {properties.length > 0 && (
                <div>
                  <div style={styles.sectionLabel}>Properties</div>
                  <div style={styles.propsGrid}>
                    {properties.map(({ key, value }) => (
                      <div key={key} style={styles.propRow}>
                        <span style={styles.propKey}>{key}</span>
                        <span style={styles.propVal}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              {meta.links && (meta.links as unknown[]).length > 0 && (
                <div>
                  <div style={styles.sectionLabel}>Links</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(meta.links as { label: string; url: string }[]).map((lnk, i) => (
                      <a
                        key={i}
                        href={lnk.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.link}
                      >
                        <span style={styles.linkIcon}>↗</span>
                        <span>{lnk.label || lnk.url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
    marginTop: 48,
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
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--subtle)', fontSize: 15, lineHeight: 1,
    padding: '0 2px', flexShrink: 0,
  },
  body: {
    overflowY: 'auto', padding: '14px 14px 16px', flex: 1,
  },
  muted: {
    color: 'var(--subtle)', fontSize: 13, margin: 0,
  },
  errorText: {
    color: '#f87171', fontSize: 11, fontFamily: 'monospace',
    margin: 0, whiteSpace: 'pre-wrap',
  },
  description: {
    fontSize: 13, color: 'var(--text)', lineHeight: 1.7,
    margin: 0, whiteSpace: 'pre-wrap',
  },
  sectionLabel: {
    fontSize: 10, fontWeight: 600, color: 'var(--faint)',
    textTransform: 'uppercase', letterSpacing: 0.7,
    marginBottom: 8,
  },
  propsGrid: {
    display: 'flex', flexDirection: 'column', gap: 0,
    border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
  },
  propRow: {
    display: 'grid', gridTemplateColumns: 'auto 1fr',
    borderBottom: '1px solid var(--border)',
  },
  propKey: {
    fontSize: 11, color: 'var(--faint)',
    padding: '7px 10px',
    background: 'rgba(255,255,255,0.03)',
    borderRight: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  propVal: {
    fontSize: 12, color: 'var(--muted)',
    padding: '7px 10px',
    wordBreak: 'break-word',
  },
  link: {
    display: 'flex', alignItems: 'center', gap: 8,
    color: '#7c6af7', fontSize: 12, textDecoration: 'none',
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid rgba(124,106,247,0.25)',
    background: 'rgba(124,106,247,0.06)',
  },
  linkIcon: {
    fontSize: 11, flexShrink: 0, opacity: 0.7,
  },
}
