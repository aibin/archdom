import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom'
import { DiagramView } from './DiagramView'
import { Breadcrumb } from './Breadcrumb'
import { Help } from './Help'
import { BreadcrumbItem } from './types'
import { loadYaml, setDirectoryHandle, yamlCache } from './yamlLoader'

type ShowDirectoryPicker = (opts?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>
const _showDirectoryPicker = (window as unknown as { showDirectoryPicker?: ShowDirectoryPicker }).showDirectoryPicker
const FSA_SUPPORTED = !!_showDirectoryPicker

// ── Landing page ──────────────────────────────────────────────────────────────

function LandingPage({ onOpenFolder }: { onOpenFolder: () => void }) {
  return (
    <div style={landing.root}>
      <div style={landing.card}>
        <div style={landing.logo}>Archdom</div>
        <p style={landing.tagline}>
          Visualise your software architecture from plain YAML files — no account, no upload, everything stays local.
        </p>

        {FSA_SUPPORTED ? (
          <button onClick={onOpenFolder} style={landing.btn}>
            Open Folder
          </button>
        ) : (
          <div style={landing.unsupported}>
            Folder access requires Chrome or Edge. Open the app in a supported browser.
          </div>
        )}

        <div style={landing.hint}>
          Point to any folder that contains an <code style={landing.code}>index.yaml</code>.
          Nested diagrams are loaded on demand as you drill in.
        </div>

        <div style={landing.structure}>
          <div style={landing.structureTitle}>Expected folder layout</div>
          <pre style={landing.pre}>{`my-diagrams/
  index.yaml          ← root diagram
  services.yaml       ← drill-in target
  services/
    auth.yaml         ← deeper drill-in
    payments.yaml`}</pre>
        </div>

        <Link to="/help" style={landing.helpLink}>Read the authoring guide →</Link>
        <a href="https://github.com/aibin/archdom" target="_blank" rel="noreferrer" style={landing.ghLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          GitHub
        </a>
      </div>
    </div>
  )
}

const landing: Record<string, React.CSSProperties> = {
  root: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    maxWidth: 500,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    textAlign: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: 800,
    color: '#7c6af7',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 1.6,
    margin: 0,
  },
  btn: {
    background: '#7c6af7',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    padding: '12px 32px',
    cursor: 'pointer',
    letterSpacing: 0.3,
  },
  unsupported: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8,
    color: '#fca5a5',
    fontSize: 13,
    padding: '12px 20px',
  },
  hint: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.6,
  },
  code: {
    background: 'rgba(124,106,247,0.15)',
    borderRadius: 3,
    color: '#c4b5fd',
    padding: '1px 5px',
    fontFamily: 'monospace',
  },
  structure: {
    width: '100%',
    textAlign: 'left',
  },
  structureTitle: {
    fontSize: 12,
    color: '#475569',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  pre: {
    background: '#1a1d27',
    border: '1px solid #2d3148',
    borderRadius: 8,
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'monospace',
    padding: '14px 16px',
    lineHeight: 1.7,
    margin: 0,
  },
  helpLink: {
    color: '#7c6af7',
    fontSize: 13,
    textDecoration: 'none',
  },
  ghLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#64748b',
    fontSize: 13,
    textDecoration: 'none',
  },
}

// ── Breadcrumb derived from URL ───────────────────────────────────────────────

function useBreadcrumb(splat: string, refreshToken: number): BreadcrumbItem[] {
  const [items, setItems] = useState<BreadcrumbItem[]>([])

  useEffect(() => {
    const segments = splat ? splat.split('/') : []
    const pathEntries = [
      { yamlPath: 'index.yaml', urlPath: '/' },
      ...segments.map((_, i) => {
        const partial = segments.slice(0, i + 1).join('/')
        return { yamlPath: `${partial}.yaml`, urlPath: `/${partial}` }
      }),
    ]

    Promise.all(
      pathEntries.map(async ({ yamlPath, urlPath }) => {
        try {
          const layer = await loadYaml(yamlPath)
          return { path: urlPath, name: layer.name ?? yamlPath }
        } catch {
          return { path: urlPath, name: yamlPath }
        }
      })
    ).then(setItems)
  }, [splat, refreshToken])

  return items
}

// ── Diagram layout ────────────────────────────────────────────────────────────

interface DiagramLayoutProps {
  folderName: string | null
  refreshToken: number
  onOpenFolder: () => void
  onResync: () => void
  onCloseFolder: () => void
}

function DiagramLayout({ folderName, refreshToken, onOpenFolder, onResync, onCloseFolder }: DiagramLayoutProps) {
  const params = useParams<{ '*': string }>()
  const navigate = useNavigate()
  const splat = params['*'] ?? ''
  const yamlPath = splat ? `${splat}.yaml` : 'index.yaml'
  const breadcrumb = useBreadcrumb(splat, refreshToken)

  type SaveStatus = 'idle' | 'saving' | 'saved'
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const handleLayoutSaving = useCallback(() => setSaveStatus('saving'), [])
  const handleLayoutSaved  = useCallback(() => setSaveStatus('saved'),  [])

  const handleDrillIn = useCallback((path: string) => {
    navigate(`/${path.replace(/\.yaml$/, '')}`)
  }, [navigate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  useEffect(() => {
    if (!folderName && splat) navigate('/', { replace: true })
  }, [folderName, splat, navigate])

  if (!folderName) {
    return <LandingPage onOpenFolder={onOpenFolder} />
  }

  return (
    <>
      <header style={styles.header}>
        <Link to="/" style={styles.logo}>Archdom</Link>
        <Breadcrumb items={breadcrumb} />
        <div style={{ flex: 1 }} />
        {saveStatus !== 'idle' && (
          <span style={styles.saveStatus}>
            {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
          </span>
        )}
        <a href="https://github.com/aibin/archdom" target="_blank" rel="noreferrer" style={styles.ghBtn} title="View on GitHub">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
        </a>
        <button onClick={onResync} style={styles.resyncBtn} title="Resync — reload all YAML from disk">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Resync
        </button>
        <div style={styles.folderBadge}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#7c6af7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8c0-1.1.9-2 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
          </svg>
          <span style={styles.folderName}>{folderName}</span>
          <button onClick={onCloseFolder} style={styles.folderClose} title="Close folder">×</button>
        </div>
      </header>
      <main style={styles.main}>
        <DiagramView yamlPath={yamlPath} onDrillIn={handleDrillIn} refreshToken={refreshToken} onLayoutSaving={handleLayoutSaving} onLayoutSaved={handleLayoutSaved} />
      </main>
    </>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [folderName, setFolderName] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const navigate = useNavigate()

  const openFolder = useCallback(async () => {
    if (!FSA_SUPPORTED) return
    try {
      const handle = await _showDirectoryPicker!({ mode: 'readwrite' })
      setDirectoryHandle(handle)
      setFolderName(handle.name)
      navigate('/', { replace: true })
      setRefreshToken(t => t + 1)
    } catch {
      // User cancelled
    }
  }, [navigate])

  const resync = useCallback(() => {
    yamlCache.clear()
    setRefreshToken(t => t + 1)
  }, [])

  const closeFolder = useCallback(() => {
    setDirectoryHandle(null)
    setFolderName(null)
    navigate('/', { replace: true })
    setRefreshToken(t => t + 1)
  }, [navigate])

  return (
    <div style={styles.root}>
      <Routes>
        <Route path="/help" element={<Help />} />
        <Route path="/*" element={
          <DiagramLayout
            folderName={folderName}
            refreshToken={refreshToken}
            onOpenFolder={openFolder}
            onResync={resync}
            onCloseFolder={closeFolder}
          />
        } />
      </Routes>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f1117' },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '10px 20px',
    background: '#1a1d27',
    borderBottom: '1px solid #2d3148',
    flexShrink: 0,
  },
  logo: {
    fontWeight: 700,
    fontSize: 18,
    color: '#7c6af7',
    letterSpacing: 1,
    flexShrink: 0,
    textDecoration: 'none',
  },
  main: { flex: 1, overflow: 'hidden' },
  saveStatus: {
    fontSize: 12,
    color: '#64748b',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  ghBtn: {
    display: 'flex',
    alignItems: 'center',
    color: '#64748b',
    flexShrink: 0,
  },
  resyncBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    background: 'none', border: '1px solid #2d3148', borderRadius: 6,
    color: '#64748b', fontSize: 12, padding: '4px 10px',
    cursor: 'pointer', flexShrink: 0,
  },
  folderBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(124,106,247,0.1)',
    border: '1px solid rgba(124,106,247,0.3)',
    borderRadius: 6,
    padding: '4px 8px 4px 10px',
    flexShrink: 0,
  },
  folderName: {
    fontSize: 12,
    color: '#c4b5fd',
    maxWidth: 180,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  folderClose: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: 16,
    lineHeight: 1,
    padding: '0 2px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
}
