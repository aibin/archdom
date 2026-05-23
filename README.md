# Archdom

> YAML-driven, browser-based software architecture diagrams with infinite drill-down.

**[archdom.org](https://archdom.org)** — live demo

Archdom lets you describe your software architecture in plain YAML files and renders them as an interactive diagram in the browser. Drill from a high-level system context all the way into component internals — no backend, no database, no build step for your diagrams.

---

## Features

- **Zero-backend** — diagrams are static YAML files served alongside the app
- **Infinite drill-down** — any node can link to a child YAML file; breadcrumb tracks your path
- **10 node types** — Service, SPA, Server App, Boundary, DB, S3, Directory, User, Deployment Node, Infrastructure Node
- **4 edge styles** — sync, async, event (animated), depends
- **7 diagram types** — System Context (L1), Container (L2), Component (L3), Code (L4), System Landscape, Dynamic, Deployment
- **External system flag** — grey styling for third-party dependencies
- **Dynamic diagrams** — numbered interaction steps (①②③…) for use-case walkthroughs
- **Deployment diagrams** — infrastructure nodes, deployment environments
- **Shareable URLs** — every diagram layer has its own route (`/d/platform/orders`)
- **Highlight mode** — click a node to dim everything except its connections
- **Search** — type to filter nodes by name or description
- **PNG export** — download the current view as an image
- **Legend panel** — toggle a key showing all shapes and edge styles

---

## Quick start

```bash
git clone https://github.com/YOUR_USERNAME/archdom.git
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

### Edge styles

| `style` | Appearance | Use for |
|---|---|---|
| `sync` | Solid arrow | Synchronous request / response (default) |
| `async` | Dashed arrow | Asynchronous message, queue, or fire-and-forget |
| `event` | Animated purple arrow | Domain event published to a bus or topic |
| `depends` | Dotted line | Dependency with no clear call direction |

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

## Shareable links

Every diagram layer is a real URL. Copy the browser address bar to share a direct link to any level of your architecture with teammates. Deep links work on refresh — the app rebuilds the breadcrumb trail automatically from the URL.

---

## UI reference

| Action | How |
|---|---|
| Drill into a layer | Click any node that has a `file:` field (shows ⬇) |
| Go back | Press **Escape** or click a breadcrumb item in the header |
| Highlight connections | Click a node |
| Clear highlight | Click the highlighted node again, or click the canvas background |
| Drill highlighted node | Press **Enter** while a node is highlighted |
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
│   │   ├── DiagramView.tsx     # ReactFlow canvas, layout, highlight, search, export
│   │   ├── Breadcrumb.tsx      # URL-driven breadcrumb nav
│   │   ├── Legend.tsx          # Toggleable legend panel
│   │   ├── Help.tsx            # /help full-page authoring guide
│   │   ├── yamlLoader.ts       # File System Access API loader + cache
│   │   ├── types.ts            # TypeScript interfaces
│   │   └── nodes/
│   │       └── C4Node.tsx      # All 10 node shape components
│   └── index.html
├── example/                    # Example diagrams (open this folder in the app)
│   ├── index.yaml
│   ├── platform.yaml
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
