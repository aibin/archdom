import { Edge, MarkerType } from 'reactflow'
import { YamlEdge, EdgeStyle } from './types'

const LABEL_STYLE = {
  labelStyle: { fill: '#94a3b8', fontSize: 11 },
  labelBgStyle: { fill: '#1e2235', fillOpacity: 0.85 },
}

export function edgeAppearance(style?: EdgeStyle): Partial<Edge> {
  switch (style) {
    case 'async':
      return { ...LABEL_STYLE, style: { stroke: '#64748b', strokeWidth: 1.5, strokeDasharray: '8 4' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' } }
    case 'event':
      return { ...LABEL_STYLE, animated: true, style: { stroke: '#7c6af7', strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#7c6af7' } }
    case 'depends':
      return { ...LABEL_STYLE, style: { stroke: '#475569', strokeWidth: 1.5, strokeDasharray: '3 5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' } }
    default:
      return { ...LABEL_STYLE, style: { stroke: '#475569', strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' } }
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
