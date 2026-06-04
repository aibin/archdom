import { ThemeMode, useTheme } from './useTheme'

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2"  x2="12" y2="5"  />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22"  y1="4.22"  x2="6.34"  y2="6.34"  />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2"  y1="12" x2="5"  y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22"  y1="19.78" x2="6.34"  y2="17.66" />
      <line x1="17.66" y1="6.34"  x2="19.78" y2="4.22"  />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function MonitorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8"  y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

const OPTIONS: { mode: ThemeMode; icon: React.ReactNode; title: string }[] = [
  { mode: 'light', icon: <SunIcon />,     title: 'Light mode'    },
  { mode: 'dark',  icon: <MoonIcon />,    title: 'Dark mode'     },
  { mode: 'auto',  icon: <MonitorIcon />, title: 'System (auto)' },
]

export function ThemeToggle() {
  const { mode, setMode } = useTheme()

  return (
    <div style={{
      display: 'flex', gap: 2,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: 2,
    }}>
      {OPTIONS.map(o => (
        <button
          key={o.mode}
          onClick={() => setMode(o.mode)}
          title={o.title}
          style={{
            background:   mode === o.mode ? 'var(--surface2)' : 'transparent',
            border:       'none',
            borderRadius: 6,
            color:        mode === o.mode ? 'var(--text)' : 'var(--subtle)',
            cursor:       'pointer',
            padding:      '5px 7px',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            lineHeight:   1,
          }}
        >
          {o.icon}
        </button>
      ))}
    </div>
  )
}
