import { describe, it, expect } from 'vitest'
import { edgeLabel, stepPrefix, edgeAppearance } from '../diagramUtils'

describe('stepPrefix', () => {
  it('returns [n] format', () => {
    expect(stepPrefix(1)).toBe('[1] ')
    expect(stepPrefix(5)).toBe('[5] ')
    expect(stepPrefix(10)).toBe('[10] ')
  })

  it('works for any number', () => {
    expect(stepPrefix(0)).toBe('[0] ')
    expect(stepPrefix(11)).toBe('[11] ')
  })
})

describe('edgeLabel', () => {
  it('returns undefined when no label, technology, or step', () => {
    expect(edgeLabel({ from: 'a', to: 'b' })).toBeUndefined()
  })

  it('returns label when present', () => {
    expect(edgeLabel({ from: 'a', to: 'b', label: 'calls' })).toBe('calls')
  })

  it('falls back to technology when no label', () => {
    expect(edgeLabel({ from: 'a', to: 'b', technology: 'HTTP/REST' })).toBe('HTTP/REST')
  })

  it('prefers label over technology', () => {
    expect(edgeLabel({ from: 'a', to: 'b', label: 'calls', technology: 'HTTP' })).toBe('calls')
  })

  it('prepends step prefix to label', () => {
    expect(edgeLabel({ from: 'a', to: 'b', step: 3, label: 'calls' })).toBe('[3] calls')
  })

  it('renders step-only when no label or technology', () => {
    expect(edgeLabel({ from: 'a', to: 'b', step: 2 })).toBe('[2] ')
  })
})

describe('edgeAppearance', () => {
  it('animates event edges', () => {
    expect(edgeAppearance('event').animated).toBe(true)
  })

  it('dashes async edges', () => {
    const result = edgeAppearance('async')
    expect((result.style as React.CSSProperties & { strokeDasharray?: string }).strokeDasharray).toBe('8 4')
    expect(result.animated).toBeUndefined()
  })

  it('dashes depends edges with a tighter pattern', () => {
    const result = edgeAppearance('depends')
    expect((result.style as React.CSSProperties & { strokeDasharray?: string }).strokeDasharray).toBe('3 5')
  })

  it('produces solid stroke for sync style', () => {
    const result = edgeAppearance('sync')
    expect((result.style as React.CSSProperties & { strokeDasharray?: string }).strokeDasharray).toBeUndefined()
    expect(result.animated).toBeUndefined()
  })

  it('produces solid stroke when style is undefined', () => {
    const result = edgeAppearance(undefined)
    expect((result.style as React.CSSProperties & { strokeDasharray?: string }).strokeDasharray).toBeUndefined()
  })
})
