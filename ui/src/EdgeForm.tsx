import { useState } from 'react'
import { EdgeStyle, YamlEdge } from './types'

const EDGE_STYLES: { value: EdgeStyle; label: string; color: string }[] = [
  { value: 'sync',    label: 'Sync',    color: '#475569' },
  { value: 'async',   label: 'Async',   color: '#64748b' },
  { value: 'event',   label: 'Event',   color: '#7c6af7' },
  { value: 'webhook', label: 'Webhook', color: '#f97316' },
  { value: 'depends', label: 'Depends', color: '#475569' },
]

interface Props {
  source: string
  target: string
  initialData?: Partial<YamlEdge>
  onSave: (edge: Partial<YamlEdge>) => void
  onCancel: () => void
  onDelete?: () => void
}

export function EdgeForm({ source, target, initialData, onSave, onCancel, onDelete }: Props) {
  const isEditing = !!(initialData?.style || initialData?.label || initialData?.technology)
  const [label,         setLabel]   = useState(initialData?.label ?? '')
  const [technology,    setTech]    = useState(initialData?.technology ?? '')
  const [style,         setStyle]   = useState<EdgeStyle>(initialData?.style ?? 'sync')
  const [bidirectional, setBidir]   = useState(initialData?.bidirectional ?? false)
  const [step,          setStep]    = useState(initialData?.step != null ? String(initialData.step) : '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const stepNum = parseInt(step)
    onSave({
      ...(label.trim()      && { label: label.trim() }),
      ...(technology.trim() && { technology: technology.trim() }),
      style,
      ...(bidirectional     && { bidirectional: true }),
      ...(step.trim() && !isNaN(stepNum) && stepNum > 0 && { step: stepNum }),
    })
  }

  const selectedStyle = EDGE_STYLES.find(s => s.value === style)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <div>
          <h2 style={styles.title}>{isEditing ? 'Edit Edge' : 'Add Edge'}</h2>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 4, fontFamily: 'monospace' }}>
            {source} <span style={{ color: selectedStyle?.color }}>→</span> {target}
          </div>
        </div>

        <div>
          <label style={styles.label}>Style</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {EDGE_STYLES.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStyle(s.value)}
                style={{
                  background:   style === s.value ? '#1e2235' : 'transparent',
                  border:       `1px solid ${style === s.value ? s.color : '#2d3148'}`,
                  borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                  fontSize:     11, color: style === s.value ? s.color : '#64748b',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={styles.label}>Label</label>
          <input style={styles.input} value={label} onChange={e => setLabel(e.target.value)} placeholder="HTTP / REST" autoFocus />
        </div>

        <div>
          <label style={styles.label}>Technology</label>
          <input style={styles.input} value={technology} onChange={e => setTech(e.target.value)} placeholder="gRPC, HTTPS…" />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}>
            <input type="checkbox" checked={bidirectional} onChange={e => setBidir(e.target.checked)} />
            Bidirectional
          </label>
          <div>
            <label style={styles.label}>Step #</label>
            <input
              style={{ ...styles.input, width: 60 }}
              value={step}
              onChange={e => setStep(e.target.value)}
              type="number" min={1} max={20} placeholder="—"
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
          <div>
            {onDelete && (
              <button type="button" onClick={onDelete} style={styles.deleteBtn}>Delete</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" style={styles.primaryBtn}>
              {isEditing ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 12,
    padding: 24, width: 380, maxWidth: '90vw',
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  title:  { margin: 0, fontSize: 16, color: '#e2e8f0', fontWeight: 600 },
  label:  { fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 4 },
  input:  {
    background: '#0f1117', border: '1px solid #2d3148', borderRadius: 6,
    color: '#e2e8f0', fontSize: 13, padding: '7px 10px', width: '100%',
    outline: 'none', boxSizing: 'border-box',
  },
  cancelBtn:  { background: 'transparent', border: '1px solid #2d3148', borderRadius: 8, color: '#64748b', fontSize: 13, padding: '7px 16px', cursor: 'pointer' },
  primaryBtn: { background: '#4f46e5', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, padding: '7px 18px', cursor: 'pointer' },
  deleteBtn:  { background: 'transparent', border: '1px solid #7f1d1d', borderRadius: 8, color: '#f87171', fontSize: 13, padding: '7px 14px', cursor: 'pointer' },
}
