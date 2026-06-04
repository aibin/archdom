import { MetaFile } from './types'

const STATUS_OPTIONS = ['active', 'stable', 'deprecated', 'planned', 'in-progress', 'beta']

export interface MetaSectionState {
  enabled: boolean
  filePath: string
  title: string
  description: string
  owner: string
  status: string
  links: { label: string; url: string }[]
}

export function initialMetaState(existingPath?: string): MetaSectionState {
  return { enabled: !!existingPath, filePath: existingPath ?? '', title: '', description: '', owner: '', status: '', links: [] }
}

export function applyMetaFile(state: MetaSectionState, data: MetaFile): MetaSectionState {
  return {
    ...state,
    title:       data.title       ?? '',
    description: data.description ?? '',
    owner:       data.owner       ?? '',
    status:      data.status      ?? '',
    links:       data.links       ?? [],
  }
}

export function collectMeta(state: MetaSectionState): { path: string; content: MetaFile } | null {
  if (!state.enabled || !state.filePath.trim()) return null
  const validLinks = state.links.filter(l => l.url.trim())
  const content: MetaFile = {
    ...(state.title.trim()       && { title:       state.title.trim() }),
    ...(state.description.trim() && { description: state.description.trim() }),
    ...(state.owner.trim()       && { owner:       state.owner.trim() }),
    ...(state.status             && { status:      state.status }),
    ...(validLinks.length        && { links:       validLinks }),
  }
  return { path: state.filePath.trim(), content }
}

interface Props {
  state: MetaSectionState
  loading?: boolean
  onChange: (s: MetaSectionState) => void
}

export function MetaSection({ state, loading, onChange }: Props) {
  const set = <K extends keyof MetaSectionState>(k: K, v: MetaSectionState[K]) =>
    onChange({ ...state, [k]: v })

  const setLink = (i: number, field: 'label' | 'url', v: string) =>
    onChange({ ...state, links: state.links.map((l, j) => j === i ? { ...l, [field]: v } : l) })

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)', cursor: 'pointer' }}>
        <input type="checkbox" checked={state.enabled} onChange={e => set('enabled', e.target.checked)} />
        Metadata file
      </label>

      {state.enabled && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && <div style={{ fontSize: 12, color: 'var(--faint)' }}>Loading existing metadata…</div>}

          <MF label="File path">
            <input
              style={{ ...inp, fontFamily: 'monospace' }}
              value={state.filePath}
              onChange={e => set('filePath', e.target.value)}
              placeholder="meta/my-node.yaml"
            />
            <span style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>Created / updated on save</span>
          </MF>

          <MF label="Title">
            <input style={inp} value={state.title} onChange={e => set('title', e.target.value)} placeholder="Defaults to node/edge name" />
          </MF>

          <MF label="Description">
            <textarea
              style={{ ...inp, resize: 'vertical', minHeight: 56, lineHeight: 1.5 }}
              value={state.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Extended notes"
              rows={2}
            />
          </MF>

          <MF label="Owner">
            <input style={inp} value={state.owner} onChange={e => set('owner', e.target.value)} placeholder="team / user@example.com" />
          </MF>

          <MF label="Status">
            <select style={{ ...inp, cursor: 'pointer' }} value={state.status} onChange={e => set('status', e.target.value)}>
              <option value="">— none —</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </MF>

          <div>
            <div style={labelStyle}>Links</div>
            {state.links.map((lnk, i) => (
              <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                <input
                  style={{ ...inp, flex: 1, minWidth: 0 }}
                  value={lnk.label}
                  onChange={e => setLink(i, 'label', e.target.value)}
                  placeholder="Label"
                />
                <input
                  style={{ ...inp, flex: 2, minWidth: 0 }}
                  value={lnk.url}
                  onChange={e => setLink(i, 'url', e.target.value)}
                  placeholder="https://…"
                />
                <button
                  type="button"
                  onClick={() => onChange({ ...state, links: state.links.filter((_, j) => j !== i) })}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--subtle)', cursor: 'pointer', padding: '0 8px', fontSize: 14 }}
                >×</button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => onChange({ ...state, links: [...state.links, { label: '', url: '' }] })}
              style={{ background: 'transparent', border: '1px dashed var(--border)', borderRadius: 6, color: 'var(--faint)', cursor: 'pointer', fontSize: 12, padding: '4px 10px', marginTop: 2 }}
            >+ Add link</button>
          </div>
        </div>
      )}
    </div>
  )
}

function MF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--subtle)',
  textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2,
}

const inp: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
  color: 'var(--text)', fontSize: 13, padding: '7px 10px', width: '100%',
  outline: 'none', boxSizing: 'border-box',
}
