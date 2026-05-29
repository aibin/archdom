# Archdom

> YAML-driven, browser-based software architecture diagrams with infinite drill-down.

**[archdom.org](https://archdom.org)** — live demo

Archdom lets you describe your software architecture in plain YAML files and renders them as an interactive diagram in the browser. Drill from a high-level system context all the way into component internals — no backend, no database, no build step for your diagrams.

---

## Features

- **Zero-backend** — diagrams are static YAML files served alongside the app
- **Infinite drill-down** — any node can link to a child YAML file; breadcrumb tracks your path
- **10 node types** — Service, SPA, Server App, Boundary, DB, S3, Directory, User, Deployment Node, Infrastructure Node
- **4 edge styles** — sync, async, event (animated), depends; plus bidirectional and self-loop variants
- **7 diagram types** — System Context (L1), Container (L2), Component (L3), Code (L4), System Landscape, Dynamic, Deployment
- **Bidirectional edges** — single edge with `bidirectional: true`; conflicting opposing edges are caught at load time
- **Self-loop edges** — `from`/`to` pointing to the same node adds an amber ↺ icon to the node; clicking it lists every self-reference with its label and style
- **Metadata overlays** — attach a YAML sidecar (`meta:`) to any node or edge; clicking the ⓘ button opens a rich info panel
- **External system flag** — grey styling for third-party dependencies
- **Dynamic diagrams** — numbered interaction steps (①②③…) for use-case walkthroughs
- **Deployment diagrams** — infrastructure nodes, deployment environments
- **Shareable URLs** — every diagram layer has its own route (`/platform/orders`)
- **Highlight mode** — click a node to dim everything except its connections
- **Search** — type to filter nodes by name or description
- **PNG export** — download the current view as an image
- **Legend panel** — toggle a key showing all shapes and edge styles

---

## Quick start

```bash
git clone https://github.com/aibin/archdom.git
cd archdom/ui
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), click **Open Folder**, and point it at any local folder that contains an `index.yaml`. The example diagrams shipped with the repo are in `example/` — you can open that folder to see a working demo.

> **Browser requirement** — Archdom uses the File System Access API. Use Chrome or Edge; Firefox and Safari are not supported.

---

## How it works

Archdom reads YAML files directly from a folder on your machine — nothing is uploaded anywhere. When you click **Open Folder**, the browser grants read access to the chosen directory. The app then loads `index.yaml` from that folder as the root diagram.

Nodes that set a `file:` field become drillable — clicking them navigates to a new URL and pushes a breadcrumb. Press **Escape** or click a breadcrumb item to go back.

Your diagram folder can look like this:

```
my-diagrams/
  index.yaml                  ← entry point  (L1 context)
  platform.yaml               ← linked from index.yaml
  platform/
    orders.yaml               ← linked from platform.yaml
    orders/
      logic.yaml              ← linked from orders.yaml
    checkout-flow.yaml        ← dynamic diagram
    deployment.yaml           ← deployment diagram
```

URL structure mirrors the file structure:

| URL | YAML file |
|---|---|
| `/` | `index.yaml` |
| `/platform` | `platform.yaml` |
| `/platform/orders` | `platform/orders.yaml` |
| `/platform/orders/logic` | `platform/orders/logic.yaml` |
| `/help` | Built-in authoring guide |

---

## Authoring diagrams

### File skeleton

```yaml
name: My Service          # breadcrumb label
diagramType: container    # optional — shows level badge on canvas
scope: My Platform        # optional — subtitle shown under the badge
environment: Production   # optional — for deployment diagrams

nodes:
  - id: api
    name: API Gateway
    description: Routes all client traffic
    technology: FastAPI
    type: server-app
    file: api/internals.yaml   # makes this node drillable

edges:
  - from: web
    to: api
    label: HTTPS/JSON
    style: sync
```

### Node properties

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | ✓ | Unique within this file; used in edge `from`/`to` |
| `name` | string | ✓ | Display name on the node |
| `description` | string | | Short responsibility statement |
| `technology` | string | | Runtime or platform, e.g. `React`, `PostgreSQL` |
| `type` | string | | Shape and colour (default: `service`) |
| `file` | string | | Path to a child YAML file — makes the node drillable |
| `external` | boolean | | Grey styling — marks systems outside your ownership |
| `meta` | string | | Path to a metadata YAML sidecar — adds a ⓘ button that opens an info overlay |

### Node types

| `type` | Shape | Use for |
|---|---|---|
| `service` | Rectangle | Any backend microservice or process |
| `spa` | Rectangle | Single-page web application |
| `server-app` | Rectangle | Server-side rendered application |
| `boundary` | Dashed rectangle | A group or system boundary |
| `db` | Cylinder | Database or data store (SQL / NoSQL) |
| `s3` | Cylinder | Object storage (S3, GCS, Azure Blob) |
| `directory` | Folder | Auth directory — LDAP, Active Directory |
| `user` | Circle | Person — end user, actor, or persona |
| `deployment-node` | Dashed rectangle | Deployment environment (EC2, VPC, cloud region) |
| `infrastructure-node` | Rectangle | Infrastructure component (load balancer, DNS, CDN) |

Add `external: true` to any node to render it in grey, marking it as a system or person outside your ownership boundary (third-party API, external team, etc.).

### Edge properties

| Field | Type | Required | Description |
|---|---|---|---|
| `from` | string | ✓ | Source node `id` |
| `to` | string | ✓ | Target node `id` |
| `label` | string | | Short description of the relationship |
| `technology` | string | | Protocol or technology, e.g. `gRPC`, `Kafka`, `HTTPS` |
| `style` | string | | Visual style (default: `sync`) |
| `step` | integer | | Sequence number for dynamic diagrams — prefixes the label with ①②③… |
| `bidirectional` | boolean | | Render arrows on both ends — use instead of two opposing edges |
| `sourceAnchor` | string | | Side of the source node the edge departs from: `top` \| `bottom` \| `left` \| `right`. Default: `bottom` |
| `targetAnchor` | string | | Side of the target node the edge arrives at: `top` \| `bottom` \| `left` \| `right`. Default: `top` |
| `meta` | string | | Path to a metadata YAML sidecar — clicking the edge opens an info overlay |

### Edge styles

| `style` | Appearance | Use for |
|---|---|---|
| `sync` | Solid arrow | Synchronous request / response (default) |
| `async` | Dashed arrow | Asynchronous message, queue, or fire-and-forget |
| `event` | Animated purple arrow | Domain event published to a bus or topic |
| `depends` | Dotted line | Dependency with no clear call direction |

Set `bidirectional: true` on any style to add an arrow at both ends (rendered in cyan). Setting `from` and `to` to the **same node id** creates a self-loop — it does not render as a canvas edge. Instead an amber ↺ icon appears in the node header; clicking it opens a detail overlay.

---

## Diagram types

Set `diagramType` to display a level badge at the top of the canvas. Inspired by the [C4 model](https://c4model.com/).

| `diagramType` | Badge | Use for |
|---|---|---|
| `context` | **L1 · System Context** | One system in scope, surrounded by users and external systems |
| `container` | **L2 · Container** | Applications and data stores inside one system |
| `component` | **L3 · Component** | Building blocks inside one container |
| `code` | **L4 · Code** | Class or module level detail |
| `landscape` | **System Landscape** | All systems across an organisation, no single focus |
| `dynamic` | **Dynamic Diagram** | Numbered interaction steps for a specific use case |
| `deployment` | **Deployment Diagram** | Infrastructure nodes and deployment environments |

---

## Dynamic diagrams

Show a numbered sequence of interactions for a specific use case. Add `step: N` to edges and set `diagramType: dynamic`.

```yaml
name: Checkout Flow
diagramType: dynamic
scope: Place Order Use Case

nodes:
  - id: customer
    name: Customer
    type: user
  - id: web
    name: Web App
    type: spa
  - id: api
    name: API Gateway
    type: server-app
  - id: orders
    name: Order Service
    type: service

edges:
  - from: customer
    to: web
    label: Submit order
    style: sync
    step: 1
  - from: web
    to: api
    label: POST /orders
    technology: HTTPS
    style: sync
    step: 2
  - from: api
    to: orders
    label: Create order
    technology: gRPC
    style: sync
    step: 3
```

Edge labels are automatically prefixed with ①②③… — only highlighted edges show their labels in highlight mode.

---

## Deployment diagrams

Use `deployment-node` for hosting environments and `infrastructure-node` for components like load balancers and CDNs. Set `environment` to label the deployment target.

```yaml
name: Production Deployment
diagramType: deployment
scope: My Platform
environment: Production

nodes:
  - id: vpc
    name: VPC
    description: Isolated network boundary
    technology: AWS VPC
    type: deployment-node

  - id: alb
    name: Load Balancer
    description: Routes HTTPS traffic across API instances
    technology: AWS ALB
    type: infrastructure-node

  - id: api
    name: API Server
    description: FastAPI application
    technology: EC2 · t3.medium
    type: server-app

  - id: db
    name: PostgreSQL
    description: Primary datastore
    technology: RDS · db.t3.large
    type: db

edges:
  - from: alb
    to: api
    label: Round-robin
    style: sync
  - from: api
    to: db
    label: SQL / TLS
    style: sync
```

---

## Bidirectional edges

When two nodes communicate in both directions define a **single** edge with `bidirectional: true`. Archdom renders it with arrowheads on both ends.

```yaml
edges:
  - from: api-gateway
    to: orders-service
    label: Read / write orders
    style: sync
    bidirectional: true
```

> **Validation rule:** Defining two opposing edges — `A → B` and `B → A` — is an error. The diagram will refuse to load with a clear message asking you to merge them into one bidirectional edge.

---

## Self-loop edges

Set `from` and `to` to the **same node id** to define a self-loop. Archdom does not draw a canvas arc — instead it adds an amber **↺ icon** to the node's header strip. Clicking the icon opens a compact overlay listing every self-loop on that node: its label, technology, and edge style. Attach `meta:` to a self-loop edge to get an ⓘ button inside the overlay.

```yaml
edges:
  - from: reconciliation-engine
    to: reconciliation-engine
    label: Retry on mismatch
    style: async
```

A node can have multiple self-loops; all appear as rows in the same overlay.

---

## Node & edge metadata files

Attach a YAML sidecar to any node or edge using the `meta:` field. The file path is relative to the root of your open folder.

```yaml
nodes:
  - id: ledger-api
    name: Ledger API
    type: server-app
    meta: platform/accounting/ledger-api.meta.yaml

edges:
  - from: ledger-api
    to: journal-processor
    label: Post journal entries
    meta: platform/accounting/journal-post.meta.yaml
```

- **Nodes** — a ⓘ button appears in the node header strip. Click it to open the overlay.
- **Edges** — clicking the edge opens the overlay (in addition to the normal red-highlight selection).

### Metadata file format

All fields are optional. Any extra key–value pairs are displayed as-is.

```yaml
title: Ledger API                      # overrides node name in the overlay header
owner: Finance Platform Team
status: active                         # active | stable | deprecated | planned | in-progress | beta
description: |
  Multi-line description shown in the overlay.
  Supports plain-text paragraphs.
sla: 99.9% uptime                      # arbitrary extra fields
links:
  - label: OpenAPI Spec
    url: https://docs.example.com/ledger-api/openapi
  - label: Runbook
    url: https://wiki.example.com/runbooks/ledger-api
```

The `status` field renders as a colour-coded badge: green for `active`/`stable`, amber for `planned`/`in-progress`/`beta`, red for `deprecated`.

---

## External systems

Mark any node `external: true` to render it in grey, visually separating it from systems your team owns.

```yaml
nodes:
  - id: stripe
    name: Stripe
    description: Payment processing
    technology: REST API
    type: service
    external: true

  - id: partner
    name: Partner API
    description: Third-party data feed
    type: service
    external: true
```

---

## Persisting custom layouts

Drag any node to rearrange a diagram. Archdom saves positions automatically the moment you release — no button needed. The header shows **Saving…** while writing, then **Saved** once done.

All layer positions live in a single **`archdom.positions.json`** file at the root of your open folder, keyed by yaml path:

```json
{
  "index.yaml":               { "finledger": { "x": 250, "y": 80 } },
  "platform.yaml":            { "api-gateway": { "x": 120, "y": 200 } },
  "platform/accounting.yaml": { "ledger-api": { "x": 180, "y": 60 } }
}
```

- New nodes added to a YAML after a save fall back to auto-layout; existing positions are preserved.
- Click **⊞ Reset layout** in the canvas toolbar to discard saved positions for the current layer.
- Commit `archdom.positions.json` to share custom layouts with your team, or add it to `.gitignore` to keep layouts local.

---

## Shareable links

Every diagram layer is a real URL. Copy the browser address bar to share a direct link to any level of your architecture with teammates. Deep links work on refresh — the app rebuilds the breadcrumb trail automatically from the URL.

---

## UI reference

| Action | How |
|---|---|
| Drill into a layer | Click any node that has a `file:` field (shows ⬇) |
| Go back | Press **Escape** or click a breadcrumb item in the header |
| Highlight connections | Click the 👁 icon on a node |
| Clear highlight | Click the highlighted node again, or click the canvas background |
| Drill highlighted node | Press **Enter** while a node is highlighted |
| Open metadata overlay | Click the ⓘ button on any node with `meta:` set; or click an edge with `meta:` set |
| Open self-loop overlay | Click the ↺ icon on any node that has self-loop edges |
| Close overlays | Click ✕ in the overlay, or click the canvas background |
| Save layout | Drag any node — positions auto-save to `archdom.positions.json` at the folder root. Header shows **Saving…** then **Saved**. |
| Reset layout | Click **⊞ Reset layout** in the canvas toolbar to revert the current layer to auto-layout |
| Search / filter | Type in the search box (top-right) — non-matching nodes dim to 12% opacity |
| Legend | Click **☰ Legend** to see all node shapes and edge styles |
| Export PNG | Click **⬇ PNG** — fits the view then downloads as `<diagram-name>.png` |
| Diagram badge | Top-centre overlay showing type, scope, and environment |
| Breadcrumb | Click any ancestor in the header to jump back to that layer |
| Minimap | Bottom-right — drag the viewport rectangle to pan quickly |
| Help page | Click **? Help** in the toolbar or navigate to `/help` |

---

## Project structure

```
archdom/
├── ui/                         # Vite + React frontend
│   ├── src/
│   │   ├── main.tsx            # App entry, BrowserRouter
│   │   ├── App.tsx             # Landing page, folder picker, routing
│   │   ├── DiagramView.tsx     # ReactFlow canvas, layout, validation, export
│   │   ├── Breadcrumb.tsx      # URL-driven breadcrumb nav
│   │   ├── Legend.tsx          # Toggleable legend panel
│   │   ├── Help.tsx            # /help full-page authoring guide
│   │   ├── MetaOverlay.tsx     # Node / edge metadata overlay
│   │   ├── SelfLoopOverlay.tsx # Self-loop detail overlay
│   │   ├── yamlLoader.ts       # File System Access API loader + position persistence
│   │   ├── types.ts            # TypeScript interfaces
│   │   ├── diagramUtils.ts     # Edge appearance helpers
│   │   └── nodes/
│   │       └── Node.tsx        # All node shape components
│   └── index.html
├── example/                    # Example diagrams (open this folder in the app)
│   ├── index.yaml
│   ├── platform.yaml
│   ├── archdom.positions.json  # saved layout positions (created on first drag)
│   └── platform/
├── .vscode/
│   └── settings.json
└── README.md
```

---

## Adding a new diagram

1. Create a YAML file in your diagrams folder, e.g. `my-diagrams/payments/internals.yaml`
2. Set `diagramType`, `scope`, and add your `nodes` and `edges`
3. In the parent diagram, add a node with `file: payments/internals.yaml` to make it drillable
4. Click **Resync** in the toolbar to reload from disk — no app restart needed

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Bundler | Vite |
| Diagram canvas | [React Flow](https://reactflow.dev/) v11 |
| Auto-layout | [Dagre](https://github.com/dagrejs/dagre) |
| YAML parsing | [js-yaml](https://github.com/nodeca/js-yaml) |
| Routing | [React Router](https://reactrouter.com/) v6 |
| PNG export | [html-to-image](https://github.com/bubkoo/html-to-image) |

---

## Contributing

Pull requests are welcome. Please open an issue first for significant changes.

When adding a new feature:

- **New node type** — add an entry to `TYPES` and `icons` in `src/nodes/C4Node.tsx`, wire up `getFlowType` and `getNodeSize`
- **New edge style** — add a case to `edgeAppearance()` in `DiagramView.tsx` and update the schema and legend
- **New diagram type** — add an entry to `DIAGRAM_META` in `DiagramView.tsx` and update the schema enum

---

## License

MIT
