import { Edge, MarkerType } from 'reactflow'
import { YamlEdge, EdgeStyle } from './types'

const LABEL_STYLE = {
  labelStyle: { fill: 'var(--muted)', fontSize: 11 },
  labelBgStyle: { fill: 'var(--surface2)', fillOpacity: 0.85 },
}

const BIDIR_COLOR = '#06b6d4'  // cyan-500 — reserved for bidirectional edges

function marker(color: string) {
  return { type: MarkerType.ArrowClosed, color }
}

export function edgeAppearance(style?: EdgeStyle, bidirectional = false): Partial<Edge> {
  if (bidirectional) {
    const dasharray =
      style === 'async'   ? '8 4' :
      style === 'depends' ? '3 5' : undefined
    return {
      ...LABEL_STYLE,
      animated: style === 'event',
      style: { stroke: BIDIR_COLOR, strokeWidth: 1.5, ...(dasharray && { strokeDasharray: dasharray }) },
      markerEnd:   marker(BIDIR_COLOR),
      markerStart: marker(BIDIR_COLOR),
    }
  }

  // markerStart must be explicitly undefined so spreading this result onto an
  // existing edge object clears any previous bidirectional arrowhead.
  switch (style) {
    case 'async':
      return {
        ...LABEL_STYLE, markerStart: undefined,
        style: { stroke: 'var(--subtle)', strokeWidth: 1.5, strokeDasharray: '8 4' },
        markerEnd: marker('var(--subtle)'),
      }
    case 'event':
      return {
        ...LABEL_STYLE, animated: true, markerStart: undefined,
        style: { stroke: '#7c6af7', strokeWidth: 1.5 },
        markerEnd: marker('#7c6af7'),
      }
    case 'webhook':
      return {
        ...LABEL_STYLE, animated: true, markerStart: undefined,
        style: { stroke: '#f97316', strokeWidth: 1.5, strokeDasharray: '6 3' },
        markerEnd: marker('#f97316'),
      }
    case 'depends':
      return {
        ...LABEL_STYLE, markerStart: undefined,
        style: { stroke: 'var(--faint)', strokeWidth: 1.5, strokeDasharray: '3 5' },
        markerEnd: marker('var(--faint)'),
      }
    default:
      return {
        ...LABEL_STYLE, markerStart: undefined,
        style: { stroke: 'var(--faint)', strokeWidth: 1.5 },
        markerEnd: marker('var(--faint)'),
      }
  }
}

export function stepPrefix(n: number): string {
  const circles = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
  return (n >= 1 && n <= 10 ? circles[n - 1] : `(${n})`) + ' '
}

export function edgeLabel(e: YamlEdge): string | undefined {
  const base = e.label || e.technology || undefined
  if (e.step != null) return `${stepPrefix(e.step)}${base ?? ''}`
  return base
}
