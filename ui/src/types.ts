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
}

export type EdgeStyle = 'sync' | 'async' | 'event' | 'depends'

export interface YamlEdge {
  from: string
  to: string
  label?: string
  technology?: string
  style?: EdgeStyle
  step?: number
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

export interface C4NodeData {
  name: string
  description: string
  technology: string
  nodeType: NodeType | string
  file?: string
  external?: boolean
  link?: string
  theme?: Record<string, string>
  highlighted?: boolean
  onHighlight?: (id: string) => void
}

export interface BreadcrumbItem {
  path: string
  name: string
}
