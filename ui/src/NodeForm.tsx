import { useState, useEffect } from 'react'
import { YamlNode } from './types'
import { DiagramType } from './types'

const DIAGRAM_TYPES: DiagramType[] = ['container', 'component', 'context', 'dynamic', 'deployment', 'landscape']

const NODE_TYPES = [
  'server-app', 'container', 'software-system', 'component', 'service',
  'db', 's3', 'user', 'boundary', 'deployment-node', 'infrastructure-node', 'directory',
]

interface Props {
  initialType?: string
  initialData?: YamlNode
  existingIds: string[]
  currentYamlPath: string
  onSave: (node: YamlNode, createSubDiagram?: { file: string; diagramType: DiagramType }) => void
  onDelete?: () => void
  onCancel: () => void
}

function toId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function NodeForm({ initialType, initialData, existingIds, currentYamlPath, onSave, onDelete, onCancel }: Props) {
  const isEditing = !!initialData

  const [name, setName]               = useState(initialData?.name ?? '')
  const [id, setId]                   = useState(initialData?.id ?? '')
  const [description, setDesc]        = useState(initialData?.description ?? '')
  const [technology, setTech]         = useState(initialData?.technology ?? '')
  const [type, setType]               = useState(initialData?.type ?? initialType ?? 'server-app')
  const [external, setExternal]       = useState(initialData?.external ?? false)
  const [link, setLink]               = useState(initialData?.link ?? '')
  const [idTouched, setIdTouched]     = useState(isEditing)
  const [drilldown, setDrilldown]     = useState(!!initialData?.file)
  const [filePath, setFilePath]       = useState(initialData?.file ?? '')
  const [subDiagramType, setSubType]  = useState<DiagramType>('container')
  const [filePathTouched, setFileTouched] = useState(!!initialData?.file)

  useEffect(() => {
    if (!idTouched) setId(toId(name))
  }, [name, idTouched])

  // Auto-suggest file path based on node id, scoped to the current diagram's folder
  useEffect(() => {
    if (drilldown && !filePathTouched && id) {
      const folder = currentYamlPath.includes('/')
        ? currentYamlPath.slice(0, currentYamlPath.lastIndexOf('/') + 1)
        : ''
      setFilePath(`${folder}${id}.yaml`)
    }
  }, [drilldown, id, filePathTouched, currentYamlPath])

  const idConflict = !isEditing && id !== '' && existingIds.includes(id)
  const canSave    = name.trim() !== '' && id.trim() !== '' && !idConflict

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    const node: YamlNode = {
      id: id.trim(),
      name: name.trim(),
      ...(description.trim()  && { description:  description.trim() }),
      ...(technology.trim()   && { technology:   technology.trim() }),
      ...(type                && { type }),
      ...(external            && { external: true }),
      ...(link.trim()         && { link: link.trim() }),
      ...(drilldown && filePath.trim() && { file: filePath.trim() }),
    }
    const subDiagram = drilldown && filePath.trim() && !initialData?.file
      ? { file: filePath.trim(), diagramType: subDiagramType }
      : undefined
    onSave(node, subDiagram)
  }

  return (
    <Backdrop>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h2 style={styles.title}>{isEditing ? 'Edit Node' : 'Add Node'}</h2>

        <Field label="Name *">
          <input style={styles.input} value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="My Service" />
        </Field>

        <Field label={idConflict ? 'ID * — already exists' : 'ID *'} error={idConflict}>
          <input
            style={{ ...styles.input, fontFamily: 'monospace', borderColor: idConflict ? '#f87171' : '#2d3148' }}
            value={id}
            onChange={e => { setIdTouched(true); setId(e.target.value) }}
            placeholder="my-service"
          />
        </Field>

        <Field label="Type">
          <select style={{ ...styles.input, cursor: 'pointer' }} value={type} onChange={e => setType(e.target.value)}>
            {NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Technology">
          <input style={styles.input} value={technology} onChange={e => setTech(e.target.value)} placeholder="Python / FastAPI" />
        </Field>

        <Field label="Description">
          <textarea
            style={{ ...styles.input, resize: 'vertical', minHeight: 72, lineHeight: 1.5 }}
            value={description}
            onChange={e => setDesc(e.target.value)}
            placeholder="What this node does"
            rows={3}
          />
        </Field>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}>
          <input type="checkbox" checked={external} onChange={e => setExternal(e.target.checked)} />
          External system
        </label>

        <Field label="Link">
          <input style={styles.input} value={link} onChange={e => setLink(e.target.value)} type="url" placeholder="https://..." />
        </Field>

        {/* Drill-down section */}
        <div style={{ borderTop: '1px solid #2d3148', paddingTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}>
            <input type="checkbox" checked={drilldown} onChange={e => setDrilldown(e.target.checked)} />
            Enable drill-down into sub-diagram
          </label>

          {drilldown && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="Sub-diagram file path">
                <input
                  style={{ ...styles.input, fontFamily: 'monospace' }}
                  value={filePath}
                  onChange={e => { setFileTouched(true); setFilePath(e.target.value) }}
                  placeholder="my-service.yaml"
                />
                {!initialData?.file && (
                  <span style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                    A blank diagram will be created at this path if it doesn't exist
                  </span>
                )}
              </Field>

              {!initialData?.file && (
                <Field label="Sub-diagram type">
                  <select style={{ ...styles.input, cursor: 'pointer' }} value={subDiagramType} onChange={e => setSubType(e.target.value as DiagramType)}>
                    {DIAGRAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 4 }}>
          <div>
            {isEditing && onDelete && (
              <button type="button" onClick={onDelete} style={styles.deleteBtn}>Delete node</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={!canSave} style={{ ...styles.primaryBtn, opacity: canSave ? 1 : 0.4, cursor: canSave ? 'pointer' : 'default' }}>
              {isEditing ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </form>
    </Backdrop>
  )
}

function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </div>
  )
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: error ? '#f87171' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 12,
    padding: 24, width: 400, maxWidth: '90vw',
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  title: { margin: 0, fontSize: 16, color: '#e2e8f0', fontWeight: 600 },
  input: {
    background: '#0f1117', border: '1px solid #2d3148', borderRadius: 6,
    color: '#e2e8f0', fontSize: 13, padding: '7px 10px', width: '100%',
    outline: 'none', boxSizing: 'border-box',
  },
  cancelBtn: {
    background: 'transparent', border: '1px solid #2d3148', borderRadius: 8,
    color: '#64748b', fontSize: 13, padding: '7px 16px', cursor: 'pointer',
  },
  primaryBtn: {
    background: '#4f46e5', border: 'none', borderRadius: 8,
    color: '#fff', fontSize: 13, fontWeight: 600, padding: '7px 18px',
  },
  deleteBtn: {
    background: 'transparent', border: '1px solid #7f1d1d', borderRadius: 8,
    color: '#f87171', fontSize: 13, padding: '7px 14px', cursor: 'pointer',
  },
}
