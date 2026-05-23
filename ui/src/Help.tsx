import { Link } from 'react-router-dom'

export function Help() {
  return (
    <div style={styles.root}>
      {/* Header */}
      <header style={styles.header}>
        <Link to="/" style={styles.logo}>Archdom</Link>
        <span style={styles.pageTitle}>Authoring Guide</span>
        <Link to="/" style={styles.backLink}>← Back to diagram</Link>
      </header>

      <div style={styles.body}>
        <div style={styles.content}>

          <Section title="Overview">
            <p style={styles.p}>
              Archdom reads <Code>.yaml</Code> files directly from a local folder on your machine —
              nothing is uploaded anywhere. Click <strong style={{ color: '#e2e8f0' }}>Open Folder</strong> on
              the landing page and pick any folder that contains an <Code>index.yaml</Code>.
              Nested diagrams load on demand as you drill in. Everything stays in your browser.
            </p>
            <p style={styles.p}>
              Every diagram layer gets its own URL — copy it from the address bar to
              share a direct link with teammates (they will need to re-open the folder on their machine).
            </p>
          </Section>

          <Section title="File skeleton">
            <Pre>{`name: My Service          # breadcrumb label
diagramType: container    # optional — shows level badge
scope: My Platform        # optional — shown under badge
environment: Production   # optional — for deployment diagrams

nodes:
  - id: api
    name: API Gateway
    description: Routes all client traffic
    technology: FastAPI
    type: server-app
    file: api/internals.yaml   # makes node drillable (shows ⬇)
    link: https://docs.example.com/api   # optional external link

edges:
  - from: web
    to: api
    label: HTTPS/JSON
    style: sync

groups:
  - id: backend-boundary
    name: Backend Services
    description: Internal services owned by the platform team
    nodeIds:
      - api
      - orders`}</Pre>
          </Section>

          <Section title="diagramType values">
            <Table
              cols={['Value', 'Badge', 'Use for']}
              rows={[
                ['context',    'L1 · System Context',  'Top-level: your system + external users/systems'],
                ['container',  'L2 · Container',        'Apps & data stores inside one system'],
                ['component',  'L3 · Component',        'Building blocks inside one container'],
                ['code',       'L4 · Code',             'Class / module level detail'],
                ['landscape',  'System Landscape',      'All systems across an org (no single focus)'],
                ['dynamic',    'Dynamic Diagram',       'Numbered interaction steps for one use case'],
                ['deployment', 'Deployment Diagram',    'Infrastructure nodes & deployment environments'],
              ]}
            />
          </Section>

          <Section title="Node properties">
            <Table
              cols={['Field', 'Type', 'Description']}
              rows={[
                ['id',          'string',  'Required. Unique within this file. Used in edge from/to.'],
                ['name',        'string',  'Required. Display name on the node.'],
                ['description', 'string',  'Short responsibility statement.'],
                ['technology',  'string',  'Runtime or platform, e.g. React, PostgreSQL.'],
                ['type',        'string',  'Shape and colour — see node types below.'],
                ['file',        'string',  'Path to a child YAML file — makes the node drillable (⬇).'],
                ['link',        'string',  'URL opened in a new tab — shows a 🔗 icon on the node.'],
                ['external',    'boolean', 'Grey styling — marks systems outside your ownership.'],
              ]}
            />
          </Section>

          <Section title="Node types">
            <Table
              cols={['type', 'Shape', 'Use for']}
              rows={[
                ['software-system',      'Rectangle',       'An entire software system (C4 L1)'],
                ['container',            'Rectangle',       'An application or data store (C4 L2)'],
                ['component',            'Rectangle',       'A building block inside a container (C4 L3)'],
                ['service',              'Rectangle',       'Any backend microservice or process'],
                ['spa',                  'Rectangle',       'Single-page web application'],
                ['server-app',           'Rectangle',       'Server-side rendered application'],
                ['boundary',             'Dashed rectangle','A standalone boundary marker or grouping'],
                ['db',                   'Cylinder',        'Database or data store (SQL / NoSQL)'],
                ['s3',                   'Cylinder',        'Object storage (S3, GCS, Azure Blob)'],
                ['directory',            'Folder',          'Auth directory — LDAP, Active Directory'],
                ['user',                 'Circle',          'Person — end user, actor, or persona'],
                ['deployment-node',      'Dashed rectangle','Deployment environment (EC2, VPC, region)'],
                ['infrastructure-node',  'Rectangle',       'Infrastructure component (ALB, DNS, CDN)'],
              ]}
            />
            <p style={{ ...styles.p, marginTop: 8 }}>
              Add <Code>external: true</Code> to any node to render it in grey — marks
              systems or users outside your ownership boundary (e.g. a third-party API).
            </p>
          </Section>

          <Section title="Theme (colour overrides)">
            <p style={styles.p}>
              Add a <Code>theme</Code> map to any YAML file to override the default colours for
              node types in that diagram. Keys are node type names; values are any valid CSS colour.
              Put it in <Code>index.yaml</Code> to apply a consistent palette across every layer.
            </p>
            <Pre>{`theme:
  service: '#6366f1'          # override the Service colour
  db: '#0891b2'               # override the DB colour
  software-system: '#7c3aed'  # override Software System
  user: '#0284c7'             # override User (person circle)`}</Pre>
            <p style={styles.p}>
              Any node type not listed in <Code>theme</Code> falls back to the built-in default.
              The Legend panel reflects the active colours.
            </p>
          </Section>

          <Section title="Groups / Boundaries">
            <p style={styles.p}>
              Use the <Code>groups</Code> section to wrap a set of nodes inside a dashed boundary box.
              Groups represent teams, org units, bounded contexts, or any logical cluster.
              Nodes listed in a group are laid out together inside the boundary; nodes not in any group
              are placed outside.
            </p>
            <Pre>{`groups:
  - id: core-accounting
    name: Core Accounting
    description: Period management and balance tracking   # optional
    nodeIds:
      - period-close
      - coa-manager
      - reconciliation-engine`}</Pre>
            <Table
              cols={['Field', 'Type', 'Description']}
              rows={[
                ['id',          'string',    'Required. Unique identifier for the group.'],
                ['name',        'string',    'Required. Label shown at the top of the boundary box.'],
                ['description', 'string',    'Optional subtitle shown below the name inside the box.'],
                ['nodeIds',     'string[]',  'Required. List of node ids that belong to this group.'],
              ]}
            />
          </Section>

          <Section title="Edge properties">
            <Table
              cols={['Field', 'Type', 'Description']}
              rows={[
                ['from',       'string',  'Required. Source node id.'],
                ['to',         'string',  'Required. Target node id.'],
                ['label',      'string',  'Short description of the relationship.'],
                ['technology', 'string',  'Protocol used, e.g. gRPC, Kafka, HTTPS.'],
                ['style',      'string',  'Visual style — sync | async | event | depends.'],
                ['step',       'integer', 'Sequence number for dynamic diagrams. Prefixes label with ①②③…'],
              ]}
            />
          </Section>

          <Section title="Edge styles">
            <Table
              cols={['style', 'Appearance', 'Use for']}
              rows={[
                ['sync',    'Solid arrow',           'Synchronous request / response (default)'],
                ['async',   'Dashed arrow',           'Asynchronous message, queue, or fire-and-forget'],
                ['event',   'Animated purple arrow',  'Domain event published to a bus or topic'],
                ['depends', 'Dotted line',            'Dependency with no clear call direction'],
              ]}
            />
          </Section>

          <Section title="Dynamic diagram steps">
            <p style={styles.p}>
              On a <Code>diagramType: dynamic</Code> diagram, add <Code>step: N</Code> to
              edges. Labels are prefixed with ①②③… to show interaction order.
            </p>
            <Pre>{`diagramType: dynamic
scope: Place Order Use Case

edges:
  - from: web
    to: api
    label: POST /orders
    technology: HTTPS
    style: sync
    step: 1
  - from: api
    to: orders
    label: Create order
    technology: gRPC
    style: sync
    step: 2`}</Pre>
          </Section>

          <Section title="Deployment diagram example">
            <Pre>{`diagramType: deployment
scope: My Platform
environment: Production

nodes:
  - id: vpc
    name: VPC
    technology: AWS VPC
    type: deployment-node

  - id: alb
    name: Load Balancer
    technology: AWS ALB
    type: infrastructure-node

  - id: db
    name: PostgreSQL
    technology: RDS · db.t3.large
    type: db

edges:
  - from: alb
    to: vpc
    label: Routes traffic
    style: sync`}</Pre>
          </Section>

          <Section title="URL structure & sharing">
            <Table
              cols={['URL', 'Loads']}
              rows={[
                ['/',                          'index.yaml'],
                ['/platform',                  'platform.yaml'],
                ['/platform/orders',           'platform/orders.yaml'],
                ['/platform/orders/logic',     'platform/orders/logic.yaml'],
                ['/help',                      'This page'],
              ]}
            />
            <p style={{ ...styles.p, marginTop: 8 }}>
              Every diagram layer has a stable URL — copy it from the browser address bar
              to share a direct link with teammates. Note: the recipient needs to open the same
              local folder after loading the URL.
            </p>
          </Section>

          <Section title="Keyboard shortcuts">
            <Table
              cols={['Key / Action', 'What happens']}
              rows={[
                ['Click node (with file:)',  'Drill into that layer'],
                ['👁 icon on node',          'Highlight that node\'s direct connections; click again or click the canvas to clear'],
                ['Click edge label',         'Turn the edge and label red so it pops above overlapping elements; click again or click canvas to clear'],
                ['↵ Enter',                  'Drill into the currently highlighted node'],
                ['⎋ Escape',                 'Go back one layer (browser back)'],
              ]}
            />
          </Section>

          <Section title="UI features">
            <Table
              cols={['Feature', 'How to use']}
              rows={[
                ['Open Folder',   'Click Open Folder on the landing page to pick a local folder'],
                ['Resync',        'Click the ↺ Resync button in the header to reload all YAML files from disk after you edit them'],
                ['Close Folder',  'Click × next to the folder badge in the header to close the current folder'],
                ['Search nodes',  'Type in the search box (top-right) — non-matching nodes dim'],
                ['Legend',        'Click ☰ Legend to see all shapes and edge styles'],
                ['Export PNG',    'Click ⬇ PNG to download the current view as an image'],
                ['Diagram badge', 'Top-centre shows diagram type, scope, and environment'],
                ['Breadcrumb',    'Click any crumb in the header to jump back to that layer'],
                ['Minimap',       'Bottom-right — drag the viewport rectangle to pan'],
              ]}
            />
          </Section>

        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {children}
    </div>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return <code style={styles.inlineCode}>{children}</code>
}

function Pre({ children }: { children: string }) {
  return <pre style={styles.pre}>{children}</pre>
}

function Table({ cols, rows }: { cols: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={styles.table}>
        <thead>
          <tr>{cols.map(c => <th key={c} style={styles.th}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
              {row.map((cell, j) => (
                <td key={j} style={j === 0 ? styles.tdCode : styles.td}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex', flexDirection: 'column', minHeight: '100vh',
    background: '#0f1117', color: '#e2e8f0',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '10px 20px',
    background: '#1a1d27', borderBottom: '1px solid #2d3148',
    flexShrink: 0,
  },
  logo: {
    fontWeight: 700, fontSize: 18, color: '#7c6af7',
    letterSpacing: 1, textDecoration: 'none', flexShrink: 0,
  },
  pageTitle: {
    flex: 1, fontSize: 14, color: '#94a3b8', fontWeight: 500,
  },
  backLink: {
    fontSize: 13, color: '#64748b', textDecoration: 'none',
    padding: '4px 10px', border: '1px solid #2d3148',
    borderRadius: 6, whiteSpace: 'nowrap',
  },
  body: {
    flex: 1, overflowY: 'auto', padding: '40px 24px',
  },
  content: {
    maxWidth: 780, margin: '0 auto',
  },
  sectionTitle: {
    fontSize: 15, fontWeight: 700, color: '#7c6af7',
    textTransform: 'uppercase', letterSpacing: 0.8,
    margin: '0 0 12px', paddingBottom: 6,
    borderBottom: '1px solid #2d3148',
  },
  p: {
    fontSize: 14, color: '#94a3b8', lineHeight: 1.7, margin: '0 0 8px',
  },
  inlineCode: {
    background: '#0f1117', color: '#a5f3fc',
    fontFamily: 'monospace', fontSize: 12,
    padding: '1px 5px', borderRadius: 4,
    border: '1px solid #2d3148',
  },
  pre: {
    background: '#0f1117', color: '#a5f3fc',
    fontFamily: 'monospace', fontSize: 12,
    padding: 16, borderRadius: 8,
    border: '1px solid #2d3148',
    overflowX: 'auto', margin: '0 0 8px', lineHeight: 1.6,
  },
  table: {
    width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 8,
  },
  th: {
    textAlign: 'left', color: '#475569', fontWeight: 600,
    padding: '6px 12px', borderBottom: '1px solid #2d3148',
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  td: {
    padding: '7px 12px', color: '#94a3b8', verticalAlign: 'top',
    borderBottom: '1px solid rgba(45,49,72,0.5)',
  },
  tdCode: {
    padding: '7px 12px', color: '#a5f3fc',
    fontFamily: 'monospace', fontSize: 12, verticalAlign: 'top',
    borderBottom: '1px solid rgba(45,49,72,0.5)',
    whiteSpace: 'nowrap',
  },
}
