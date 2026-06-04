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
              nothing is uploaded anywhere. Click <strong style={{ color: 'var(--text)' }}>Open Folder</strong> on
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
                ['meta',        'string',  'Path to a metadata YAML file. Adds an ⓘ info button that opens an overlay with ownership, links, and other detail.'],
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
                ['from',          'string',  'Required. Source node id.'],
                ['to',            'string',  'Required. Target node id.'],
                ['label',         'string',  'Short description of the relationship.'],
                ['technology',    'string',  'Protocol used, e.g. gRPC, Kafka, HTTPS.'],
                ['style',         'string',  'Visual style — sync | async | event | webhook | depends.'],
                ['step',          'integer', 'Sequence number for dynamic diagrams. Prefixes label with [1] [2] [3]…'],
                ['bidirectional', 'boolean', 'Renders arrows on both ends of the edge. Use instead of defining two opposing edges.'],
                ['sourceAnchor',  'string',  'Side of the source node the edge departs from: top | bottom | left | right. Default: bottom.'],
                ['targetAnchor',  'string',  'Side of the target node the edge arrives at: top | bottom | left | right. Default: top.'],
                ['meta',          'string',  'Path to a metadata YAML file. Clicking the edge opens the info overlay.'],
              ]}
            />
          </Section>

          <Section title="Edge styles">
            <Table
              cols={['style', 'Appearance', 'Use for']}
              rows={[
                ['sync',    'Solid arrow',                    'Synchronous request / response (default)'],
                ['async',   'Dashed arrow',                    'Asynchronous message, queue, or fire-and-forget'],
                ['event',   'Animated purple arrow',           'Domain event published to a bus or topic'],
                ['webhook', 'Animated orange dashed arrow',    'Outbound webhook callback or push notification'],
                ['depends', 'Dotted line',                     'Dependency with no clear call direction'],
                ['—',       'Double cyan arrow (bidirectional)', 'Two-way communication — add bidirectional: true to any style'],
              ]}
            />
          </Section>

          <Section title="Edge anchors">
            <p style={styles.p}>
              By default edges depart from the <strong style={{ color: 'var(--text)' }}>bottom</strong> of
              the source node and arrive at the <strong style={{ color: 'var(--text)' }}>top</strong> of the
              target node. Use <Code>sourceAnchor</Code> and <Code>targetAnchor</Code> to
              route an edge from any of the four sides instead.
            </p>
            <Pre>{`edges:
  # default — bottom of source → top of target
  - from: api
    to: db
    label: SQL

  # side-by-side flow — right of source → left of target
  - from: web
    to: api
    label: HTTPS
    sourceAnchor: right
    targetAnchor: left

  # reverse vertical — top of source → bottom of target
  - from: cache
    to: api
    label: Invalidate
    sourceAnchor: top
    targetAnchor: bottom`}</Pre>
          </Section>

          <Section title="Bidirectional edges">
            <p style={styles.p}>
              When two nodes communicate in both directions, define a single edge and set{' '}
              <Code>bidirectional: true</Code>. Defining two opposing edges (A→B and B→A) is
              a validation error — the diagram will refuse to load with a clear message.
            </p>
            <Pre>{`edges:
  - from: api-gateway
    to: orders-service
    label: Read / write orders
    style: sync
    bidirectional: true   # renders arrows on both ends`}</Pre>
          </Section>

          <Section title="Node & edge metadata files">
            <p style={styles.p}>
              Add <Code>meta: path/to/file.yaml</Code> to any node or edge. For nodes, an{' '}
              <strong style={{ color: 'var(--text)' }}>ⓘ info button</strong> appears in the node header.
              For edges, clicking the edge opens the overlay. Both show the same metadata overlay.
            </p>
            <Pre>{`# in your diagram YAML
nodes:
  - id: ledger-api
    name: Ledger API
    type: server-app
    meta: platform/accounting/ledger-api.meta.yaml

edges:
  - from: ledger-api
    to: journal-processor
    label: Post journal entries
    meta: platform/accounting/journal-post.meta.yaml`}</Pre>
            <p style={{ ...styles.p, marginTop: 8 }}>
              The metadata file itself supports these fields (all optional):
            </p>
            <Pre>{`title: Ledger API                    # overrides node name in the overlay header
owner: Finance Platform Team
status: active                       # active | stable | deprecated | planned | in-progress | beta
description: |
  REST + gRPC interface for posting journal entries.
  All mutations are append-only to the partitioned ledger table.
sla: 99.9%                           # any extra key: value pairs are displayed
links:
  - label: OpenAPI Spec
    url: https://docs.example.com/ledger-api
  - label: Runbook
    url: https://wiki.example.com/runbooks/ledger-api`}</Pre>
          </Section>

          <Section title="Dynamic diagram steps">
            <p style={styles.p}>
              On a <Code>diagramType: dynamic</Code> diagram, add <Code>step: N</Code> to
              edges. Labels are prefixed with [1] [2] [3]… to show interaction order.
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

          <Section title="Persisting custom layouts">
            <p style={styles.p}>
              Drag any node to rearrange the diagram. Archdom auto-saves positions the moment you
              release the drag — no button needed. The header shows{' '}
              <strong style={{ color: 'var(--text)' }}>Saving…</strong> while the write is in flight,
              then <strong style={{ color: 'var(--text)' }}>Saved</strong> once complete.
            </p>
            <p style={styles.p}>
              All layer positions are stored in a single{' '}
              <Code>archdom.positions.json</Code> file at the root of your open folder, keyed by
              diagram layer path:
            </p>
            <Pre>{`{
  "index.yaml":               { "finledger": { "x": 250, "y": 80 } },
  "platform.yaml":            { "api-gateway": { "x": 120, "y": 200 } },
  "platform/accounting.yaml": { "ledger-api":  { "x": 180, "y": 60 } }
}`}</Pre>
            <p style={{ ...styles.p, marginTop: 8 }}>
              New nodes added to a YAML after a save fall back to auto-layout; existing saved nodes
              keep their positions. Click <strong style={{ color: 'var(--text)' }}>⊞ Reset</strong> in
              the toolbar to discard saved positions for the current layer and revert to dagre
              auto-layout.
            </p>
            <p style={{ ...styles.p, marginTop: 4 }}>
              You can commit <Code>archdom.positions.json</Code> to version control to share
              custom layouts with your team, or add it to <Code>.gitignore</Code> to keep
              layouts local.
            </p>
          </Section>

          <Section title="YAML editor">
            <p style={styles.p}>
              Click the <strong style={{ color: 'var(--text)' }}>&lt;/&gt;</strong> icon at the
              top-left of the canvas to open a built-in YAML editor for the current layer.
              The diagram stays live on the right so you can see changes as you type.
            </p>
            <Table
              cols={['Behaviour', 'Detail']}
              rows={[
                ['Live preview',    'Diagram re-renders 350 ms after you stop typing. Invalid YAML shows an error bar at the bottom of the editor; the last valid diagram stays visible.'],
                ['Auto-save',       'Once the YAML parses successfully it is written back to disk automatically. The editor header shows Saving… then Saved.'],
                ['Cache clear',     'After saving, the in-memory YAML cache is cleared so navigating away and back loads the updated file.'],
                ['Resizable pane',  'Drag the divider between the editor and the canvas to resize — minimum 200 px, maximum 900 px.'],
                ['Tab key',         'Inserts 2 spaces instead of shifting focus.'],
              ]}
            />
            <p style={{ ...styles.p, marginTop: 8 }}>
              The folder must be opened with read-write permission — Archdom always requests{' '}
              <Code>readwrite</Code> mode from the browser. If the browser denies write access
              the live preview still works; only the disk write is skipped.
            </p>
          </Section>

          <Section title="Visual edit mode">
            <p style={styles.p}>
              Click <strong style={{ color: 'var(--text)' }}>✏ Edit</strong> in the canvas toolbar
              to enter edit mode. In this mode, drill-down clicks are disabled so you can
              interact with nodes directly. Click <strong style={{ color: '#10b981' }}>✏ Editing</strong> again
              to leave edit mode. All changes are written to disk immediately — no separate save step.
            </p>
            <Table
              cols={['Action', 'What happens']}
              rows={[
                ['Drag node from palette',   'A node-type palette appears at the bottom of the canvas. Drag any icon onto the canvas to open the Add Node form.'],
                ['Add Node form',            'Fill in name, ID (auto-derived), type, technology, description, external flag, link URL. Optionally enable drill-down — a blank sub-diagram YAML is created automatically if the file does not exist.'],
                ['Double-click a node',      'Opens the Edit Node form pre-filled with the node\'s current values. Save to write changes to disk.'],
                ['Delete node (×)',          'Click the × button on any node to remove it and all its connected edges from the YAML.'],
                ['Delete (keyboard)',        'Select one or more nodes/edges and press Backspace to remove them.'],
                ['Drag from handle to node', 'Drag from any directional handle (top / bottom / left / right) to another node to open the Add Edge form.'],
                ['Add / Edit Edge form',     'Set style (sync / async / event / webhook / depends), label, technology, bidirectional toggle, and optional step number.'],
                ['Click an edge',            'Opens the Edit Edge form for that connection. Includes a Delete button to remove the edge.'],
              ]}
            />
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
                ['ⓘ icon on node',          'Open the metadata overlay (only shown when meta: is set on the node)'],
                ['Click edge',              'Turn the edge red; also opens metadata overlay if meta: is set on the edge'],
                ['↵ Enter',                  'Drill into the currently highlighted node'],
                ['⎋ Escape',                 'Go back one layer (browser back)'],
              ]}
            />
          </Section>

          <Section title="UI features">
            <Table
              cols={['Feature', 'How to use']}
              rows={[
                ['Open Folder',   'Click Open Folder on the landing page to pick a local folder (read-write access is requested so the YAML editor can save)'],
                ['Edit mode',     'Click ✏ Edit in the toolbar to enter visual edit mode — drag nodes from the palette, connect handles to create edges, double-click to edit, Backspace to delete.'],
                ['YAML editor',   'Click </> at the top-left of the canvas to open a split-pane YAML editor. Live preview + auto-save. Drag the divider to resize.'],
                ['Resync',        'Click the ↺ Resync button in the header to reload all YAML files from disk after you edit them'],
                ['Save layout',   'Drag any node — positions are auto-saved to archdom.positions.json at the root of your open folder. The header shows "Saving…" then "Saved".'],
                ['Reset layout',  'Click ⊞ Reset in the canvas toolbar to clear the current layer\'s saved positions and return to auto-layout.'],
                ['Close Folder',  'Click × next to the folder badge in the header to close the current folder'],
                ['Search nodes',  'Type in the search box (top-right) — non-matching nodes dim'],
                ['Legend',        'Click ☰ Legend to see all shapes and edge styles'],
                ['Export PNG',    'Click ⬇ PNG to download the current view as an image'],
                ['Diagram info',  'Top-left shows diagram name, type badge, scope, and environment'],
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
    background: 'var(--bg)', color: 'var(--text)',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '10px 20px',
    background: 'var(--surface)', borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  logo: {
    fontWeight: 700, fontSize: 18, color: '#7c6af7',
    letterSpacing: 1, textDecoration: 'none', flexShrink: 0,
  },
  pageTitle: {
    flex: 1, fontSize: 14, color: 'var(--muted)', fontWeight: 500,
  },
  backLink: {
    fontSize: 13, color: 'var(--subtle)', textDecoration: 'none',
    padding: '4px 10px', border: '1px solid var(--border)',
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
    borderBottom: '1px solid var(--border)',
  },
  p: {
    fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 8px',
  },
  inlineCode: {
    background: 'var(--bg)', color: 'var(--code)',
    fontFamily: 'monospace', fontSize: 12,
    padding: '1px 5px', borderRadius: 4,
    border: '1px solid var(--border)',
  },
  pre: {
    background: 'var(--bg)', color: 'var(--code)',
    fontFamily: 'monospace', fontSize: 12,
    padding: 16, borderRadius: 8,
    border: '1px solid var(--border)',
    overflowX: 'auto', margin: '0 0 8px', lineHeight: 1.6,
  },
  table: {
    width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 8,
  },
  th: {
    textAlign: 'left', color: 'var(--faint)', fontWeight: 600,
    padding: '6px 12px', borderBottom: '1px solid var(--border)',
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  td: {
    padding: '7px 12px', color: 'var(--muted)', verticalAlign: 'top',
    borderBottom: '1px solid var(--border)',
  },
  tdCode: {
    padding: '7px 12px', color: 'var(--code)',
    fontFamily: 'monospace', fontSize: 12, verticalAlign: 'top',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
}
