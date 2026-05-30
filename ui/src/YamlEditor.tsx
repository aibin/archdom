import { useRef, useCallback } from 'react'

export type EditorSaveStatus = 'idle' | 'saving' | 'saved'

interface Props {
  text: string
  error: string | null
  saveStatus: EditorSaveStatus
  onChange: (text: string) => void
}

export function YamlEditor({ text, error, saveStatus, onChange }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Insert 2 spaces on Tab instead of shifting focus
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const el = e.currentTarget
    const start = el.selectionStart
    const end   = el.selectionEnd
    const next  = text.slice(0, start) + '  ' + text.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + 2
    })
  }, [text, onChange])

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="#7c6af7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
        <span style={styles.title}>YAML</span>
        <span style={error ? styles.errBadge : styles.okBadge}>
          {error ? 'error' : '✓'}
        </span>
        {saveStatus !== 'idle' && (
          <span style={styles.saveStatus}>
            {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
          </span>
        )}
      </div>

      <textarea
        ref={taRef}
        value={text}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        style={styles.textarea}
        spellCheck={false}
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
      />

      {error && (
        <div style={styles.errorBar}>
          <pre style={styles.errorText}>{error}</pre>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#0f1117',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '8px 12px',
    background: '#1a1d27',
    borderBottom: '1px solid #2d3148',
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontSize: 12,
    fontWeight: 700,
    color: '#94a3b8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  okBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: '#22c55e',
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid rgba(34,197,94,0.25)',
    borderRadius: 8,
    padding: '1px 7px',
    flexShrink: 0,
  },
  errBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: '#f87171',
    background: 'rgba(248,113,113,0.1)',
    border: '1px solid rgba(248,113,113,0.25)',
    borderRadius: 8,
    padding: '1px 7px',
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    resize: 'none',
    border: 'none',
    outline: 'none',
    background: '#0f1117',
    color: '#a5f3fc',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    lineHeight: 1.65,
    padding: '12px 14px',
    tabSize: 2,
    overflowY: 'auto',
  },
  errorBar: {
    flexShrink: 0,
    maxHeight: 120,
    overflowY: 'auto',
    background: '#1a0a0a',
    borderTop: '1px solid #7f1d1d',
    padding: '8px 12px',
  },
  saveStatus: {
    fontSize: 11,
    color: '#64748b',
    whiteSpace: 'nowrap' as const,
    marginLeft: 4,
  },
  errorText: {
    margin: 0,
    fontSize: 11,
    color: '#f87171',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
}
