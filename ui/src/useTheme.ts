import { useEffect, useState } from 'react'

export type ThemeMode     = 'dark' | 'light' | 'auto'
export type ResolvedTheme = 'dark' | 'light'

const STORAGE_KEY = 'archdom-theme'

function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolve(mode: ThemeMode): ResolvedTheme {
  return mode === 'auto' ? systemTheme() : mode
}

function applyToDOM(resolved: ResolvedTheme) {
  if (resolved === 'dark') {
    delete document.documentElement.dataset.theme
  } else {
    document.documentElement.dataset.theme = 'light'
  }
}

// ── Singleton so all hook instances share state ───────────────────────────────

let _mode: ThemeMode = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? 'auto'
const _listeners = new Set<() => void>()

// Apply immediately on module load (before first render)
applyToDOM(resolve(_mode))

export function setThemeMode(mode: ThemeMode) {
  _mode = mode
  localStorage.setItem(STORAGE_KEY, mode)
  applyToDOM(resolve(mode))
  _listeners.forEach(fn => fn())
}

export function useTheme() {
  const [mode,     setMode]     = useState<ThemeMode>(_mode)
  const [resolved, setResolved] = useState<ResolvedTheme>(resolve(_mode))

  useEffect(() => {
    const sync = () => {
      setMode(_mode)
      setResolved(resolve(_mode))
    }
    _listeners.add(sync)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystem = () => {
      if (_mode === 'auto') {
        applyToDOM(systemTheme())
        setResolved(systemTheme())
      }
    }
    mq.addEventListener('change', onSystem)

    return () => {
      _listeners.delete(sync)
      mq.removeEventListener('change', onSystem)
    }
  }, [])

  return { mode, resolved, isDark: resolved === 'dark', setMode: setThemeMode }
}
