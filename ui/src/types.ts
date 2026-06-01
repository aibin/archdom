export type NodeType =
  | 'software-system'
  | 'container'
  | 'component'
  | 'service'
  | 'boundary'
  | 's3'
  | 'directory'
  | 'db'
  | 'spa'
  | 'server-app'
  | 'user'
  | 'deployment-node'
  | 'infrastructure-node'

export type DiagramType =
  | 'context'
  | 'container'
  | 'component'
  | 'code'
  | 'landscape'
  | 'dynamic'
  | 'deployment'

export interface YamlNode {
  id: string
  name: string
  description?: string
  technology?: string
  type?: NodeType | string
  file?: string
  external?: boolean
  link?: string
  meta?: string  // path to metadata YAML file (relative to folder root)
}

export type EdgeStyle = 'sync' | 'async' | 'event' | 'webhook' | 'depends'
export type EdgeAnchor = 'top' | 'bottom' | 'left' | 'right'

export interface YamlEdge {
  from: string
  to: string
  label?: string
  technology?: string
  style?: EdgeStyle
  step?: number
  bidirectional?: boolean  // render with arrows on both ends
  meta?: string            // path to metadata YAML file
  sourceAnchor?: EdgeAnchor  // which side of the source node the edge departs from
  targetAnchor?: EdgeAnchor  // which side of the target node the edge arrives at
}

export interface MetaFile {
  title?: string
  description?: string
  owner?: string
  status?: string
  links?: { label: string; url: string }[]
  [key: string]: unknown
}

export interface YamlGroup {
  id: string
  name: string
  description?: string
  nodeIds: string[]
}

export interface YamlLayer {
  name?: string
  diagramType?: DiagramType | string
  scope?: string
  environment?: string
  nodes: YamlNode[]
  edges?: YamlEdge[]
  groups?: YamlGroup[]
  theme?: Record<string, string>
}

export interface SelfLoop {
  label?: string
  technology?: string
  style?: EdgeStyle
  meta?: string
}

export interface C4NodeData {
  name: string
  description: string
  technology: string
  nodeType: NodeType | string
  file?: string
  external?: boolean
  link?: string
  meta?: string
  selfLoops?: SelfLoop[]
  theme?: Record<string, string>
  highlighted?: boolean
  onHighlight?: (id: string) => void
  onInfo?: (metaPath: string, title: string) => void
  onSelfLoop?: (loops: SelfLoop[], nodeName: string) => void
}

export interface BreadcrumbItem {
  path: string
  name: string
}
