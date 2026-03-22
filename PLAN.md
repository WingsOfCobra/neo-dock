# Neo-Dock — Implementation Plan

## Vision

A self-hosted, cyberpunk-themed monitoring dashboard (Neo Militarism aesthetic from Cyberpunk 2077) that aggregates server metrics, GitHub activity, emails, todos, logs, and Docker status into a single, real-time, customizable interface.

---

## Tech Stack

| Layer | Technology | Reasoning |
|---|---|---|
| **Framework** | Vite + React 19 | SPA — no SSR needed for a private dashboard. Fastest HMR, simplest config, zero framework tax |
| **Language** | TypeScript (strict) | End-to-end type safety |
| **State** | Zustand | ~1KB, trivial WebSocket integration, natural store-shaped state |
| **Real-time** | Native WebSocket + `reconnecting-websocket` | Lightest option for single-user push. No Socket.io overhead needed |
| **Styling** | Tailwind CSS 4 + CSS custom properties | Zero runtime, first-class responsive, custom cyberpunk theme via `--neon-*` vars |
| **Time-series charts** | uPlot | ~35KB canvas-based, handles live data at 60fps with 100k+ points |
| **Simple charts** | Recharts | For pie charts, bar charts, static visualizations |
| **Grid layout** | react-grid-layout | De facto dashboard grid — drag, drop, resize, responsive breakpoints |
| **3D background** | react-three-fiber + @react-three/drei + postprocessing | Declarative Three.js in React, auto-disposal, `frameloop="demand"` for perf |
| **Backend** | Fastify + `ws` | Serves static build, proxies chef-api, manages WebSocket push |
| **IMAP** | imapflow (via chef-api) | Already integrated in chef-api email routes |
| **Auth** | API key middleware (`X-Neo-Dock-Key` header + httpOnly cookie for browser) | Simple, private, single-user |
| **Deployment** | Docker (multi-stage build) | Single container: Fastify serves Vite build + WS |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (SPA)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Three.js │ │ Widgets  │ │ Grid     │ │ Zustand   │  │
│  │ BG Scene │ │ (React)  │ │ Layout   │ │ Stores    │  │
│  └──────────┘ └──────────┘ └──────────┘ └─────┬─────┘  │
│                                                │        │
│                          WebSocket ◄───────────┘        │
│                          + REST                         │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  Neo-Dock Server (Fastify)               │
│                                                          │
│  ┌─────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Static  │  │ WS Manager   │  │ Chef-API Proxy     │  │
│  │ Files   │  │ (push loop)  │  │ (localhost:4242)   │  │
│  └─────────┘  └──────┬───────┘  └────────┬───────────┘  │
│                      │                    │              │
│         ┌────────────▼────────────────────▼──────┐      │
│         │         Chef-API (port 4242)           │      │
│         │  GitHub · Docker · SSH · System · Todo │      │
│         │  Cron · Hooks · Logs · Email (IMAP)    │      │
│         └────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────┘
```

**Data flow:**
1. Neo-Dock server polls chef-api on intervals (configurable per widget)
2. Pushes updates to browser via WebSocket
3. Browser also makes REST calls for on-demand data (search, create todo, etc.)
4. Auth: API key sent as cookie (set on login page) — server validates on every request

---

## Design System — Red Terminal (Cyberpunk 2077 Access Point)

### Color Palette

```
--neo-bg-deep:      #0A0000     /* deepest background — near black with red tint */
--neo-bg-base:      #120505     /* base background */
--neo-bg-surface:   #1A0808     /* card/widget surface */
--neo-bg-elevated:  #220C0C     /* hover states, elevated panels */
--neo-border:       #3A1515     /* default borders — dark red */

--neo-red:          #FF0033     /* primary accent — EVERYTHING */
--neo-red-dim:      #990020     /* secondary red — backgrounds, subtle */
--neo-red-glow:     #FF003366   /* glow effects */

--neo-cyan:         #FF4444     /* remapped to red variant (no cyan) */
--neo-yellow:       #FF6600     /* warning accent — sparingly */

--neo-text-primary: #FF8888     /* primary text — light red */
--neo-text-secondary: #AA4444  /* secondary/label text */
--neo-text-disabled: #552222   /* disabled/hint text */

--neo-glow:         0 0 20px rgba(255, 0, 51, 0.3)
```

### Typography

| Role | Font | Style |
|---|---|---|
| Display / Headers | **Orbitron** | Uppercase, letter-spacing: 0.15em, weight 700 |
| Labels / Nav | **Rajdhani** | Uppercase, letter-spacing: 0.08em, weight 600 |
| Body / Data | **Rajdhani** | Normal case, weight 400–500 |
| Monospace / Metrics | **JetBrains Mono** | For numbers, logs, code |

### UI Elements

- **Cards**: `clip-path` chamfered corners, terminal-style headers with `> TITLE [STATUS]`, red pulse glow
- **Buttons**: Flat, angular, uppercase monospace text, `[LABEL]` bracketed style
- **Scan-lines**: Red-tinted CSS pseudo-element overlay, animated scroll
- **CRT flicker**: Subtle opacity animation on entire viewport
- **Glitch text**: CSS `::before`/`::after` pseudo-elements with offset clipping
- **Noise texture**: SVG filter `feTurbulence` overlay at 6% with overlay blend
- **Terminal cursor**: Blinking `_` after prompt text
- **Animated borders**: Red gradient sweep on card tops
- **Dividers**: Red gradient fade-out lines
- **Scrollbars**: 4px thin, red-themed

### 3D Background (react-three-fiber)

A layered combination for the Cyberpunk feel:
1. **Wireframe grid floor** — infinite perspective grid scrolling forward, all-red (#FF0033 cells, #990020 sections)
2. **Floating particles** — sparse, slow-moving, red shades only, instanced geometry
3. **Geometric wireframe shapes** — 1-2 slowly rotating polyhedra in red shades
4. **Post-processing** — chromatic aberration, heavy vignette (0.8 darkness), noise overlay

Interactive: gentle mouse parallax on the camera (±2° max). Subtle, not distracting.

Performance guards:
- `frameloop="demand"` when tab is inactive
- DPR capped at 1.5
- `PerformanceMonitor` to auto-downgrade on frame drops
- Particles via `InstancedMesh` (single draw call)

---

## Widgets (Phase 1 — Core)

### 1. Server Monitor
- **Data source**: chef-api `GET /system/health`, `GET /system/disk`, `GET /system/processes`, SSH service
- **Displays**: CPU usage (live line chart), RAM usage (bar + percentage), disk usage (segmented bar per mount), uptime
- **Update**: WebSocket push every 2s
- **Missing from chef-api**: CPU/RAM live time-series endpoint — needs a new route or the neo-dock server polls `GET /system/health` and caches history

### 2. Docker Containers
- **Data source**: chef-api `GET /docker/containers`, `GET /docker/stats/:id`
- **Displays**: Container list with status badges (running/stopped/error), CPU/mem per container, quick actions (restart, stop, logs)
- **Update**: WebSocket push every 5s
- **Container logs**: On-demand via `GET /docker/logs/:id`

### 3. Services Status
- **Data source**: chef-api SSH routes to run `systemctl status` on configured services
- **Displays**: Service name + status (active/inactive/failed) as a compact grid
- **Update**: WebSocket push every 30s
- **Missing from chef-api**: No dedicated service status endpoint — use SSH `POST /ssh/run` with `systemctl is-active` commands. Consider adding a dedicated route to chef-api later.

### 4. GitHub Dashboard
- **Data source**: chef-api `GET /github/repos`, `GET /github/prs`, `GET /github/issues`, `GET /github/workflows`, `GET /github/notifications`
- **Displays**: Repo list with stars/forks, open PRs with status checks, recent issues, workflow run status, unread notifications count
- **Update**: WebSocket push every 60s (GitHub rate limits)

### 5. Email (IMAP)
- **Data source**: chef-api `GET /email/unread`, `GET /email/search`, `GET /email/thread/:id`
- **Displays**: Unread count (prominent badge), recent email list (from, subject, date), preview on click
- **Update**: WebSocket push every 30s

### 6. Todo List
- **Data source**: chef-api `GET /todo`, `POST /todo`, `PATCH /todo/:id`
- **Displays**: Combined DB + file todos, checkbox toggle, add new todo inline, edit title
- **Update**: REST (optimistic UI) + WebSocket sync

### 7. Logs Viewer
- **Data source**: chef-api `GET /logs/tail/:source`, `GET /logs/search`
- **Displays**: Real-time log tail (terminal-style, monospace), log level color coding, search/filter
- **Update**: WebSocket push (live tail mode)

### 8. Cron Jobs
- **Data source**: chef-api `GET /cron/jobs`, `GET /cron/history`
- **Displays**: Job list with schedule, last run status/time, execution history sparkline
- **Update**: WebSocket push every 10s

---

## Chef-API Integration

See **[API-PLAN.md](API-PLAN.md)** for the full contract between Neo-Dock and Chef-API — every endpoint we consume, response shapes we depend on, and new endpoints we need.

**Summary of what's still needed from chef-api:**

| # | What | Priority |
|---|---|---|
| 1 | Extend `/system/health` with CPU usage + network bytes | High — blocks main gauge |
| 2 | `GET /docker/containers/:id/stats` — per-container resources | High — blocks Docker widget |
| 3 | `GET /services/status` — systemd service health | Medium — workaround via SSH |
| 4 | `DELETE /todo/:id` | Low |
| 5 | `GET /github/summary` — combined endpoint | Low |

Neo-Dock server includes a `metricsBuffer` service as a fallback — it polls snapshot endpoints and maintains a rolling time-series buffer internally.

---

## Project Structure

```
neo-dock/
├── client/                          # Vite + React SPA
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── public/
│   │   └── fonts/                   # Orbitron, Rajdhani, JetBrains Mono
│   ├── src/
│   │   ├── main.tsx                 # Entry point
│   │   ├── App.tsx                  # Root: auth gate, layout, 3D bg
│   │   ├── assets/
│   │   │   └── styles/
│   │   │       ├── globals.css      # CSS vars, scan-lines, noise, base
│   │   │       └── tailwind.css     # Tailwind directives
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Shell.tsx        # Main layout shell (sidebar + grid)
│   │   │   │   ├── Sidebar.tsx      # Nav sidebar (collapsible)
│   │   │   │   ├── TopBar.tsx       # Status bar (clock, notifications)
│   │   │   │   └── WidgetGrid.tsx   # react-grid-layout wrapper
│   │   │   ├── widgets/
│   │   │   │   ├── ServerMonitor.tsx
│   │   │   │   ├── DockerContainers.tsx
│   │   │   │   ├── ServicesStatus.tsx
│   │   │   │   ├── GitHubDashboard.tsx
│   │   │   │   ├── EmailInbox.tsx
│   │   │   │   ├── TodoList.tsx
│   │   │   │   ├── LogsViewer.tsx
│   │   │   │   └── CronJobs.tsx
│   │   │   ├── three/
│   │   │   │   ├── Background.tsx   # Canvas wrapper
│   │   │   │   ├── GridFloor.tsx    # Wireframe grid
│   │   │   │   ├── Particles.tsx    # Floating particles
│   │   │   │   ├── Geometry.tsx     # Wireframe shapes
│   │   │   │   └── Effects.tsx      # Post-processing
│   │   │   ├── ui/                  # Reusable Neo Militarism components
│   │   │   │   ├── Card.tsx         # Angular card with chamfered corners
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── StatusBar.tsx    # Colored status indicator bar
│   │   │   │   ├── Chart.tsx        # uPlot wrapper
│   │   │   │   └── Modal.tsx
│   │   │   └── auth/
│   │   │       └── LoginGate.tsx    # API key input screen
│   │   ├── stores/
│   │   │   ├── metricsStore.ts      # Real-time server/docker metrics
│   │   │   ├── layoutStore.ts       # Widget grid positions + sizes
│   │   │   ├── settingsStore.ts     # User preferences, theme
│   │   │   └── authStore.ts         # API key, auth state
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts      # WS connection + reconnect
│   │   │   ├── useChefApi.ts        # REST calls to neo-dock server
│   │   │   └── useMouseParallax.ts  # 3D camera parallax
│   │   ├── lib/
│   │   │   ├── api.ts              # Fetch wrapper with auth
│   │   │   ├── ws.ts               # WebSocket client
│   │   │   └── constants.ts        # Widget types, default layouts
│   │   └── types/
│   │       ├── metrics.ts           # Server, Docker, service types
│   │       ├── github.ts            # GitHub data types
│   │       ├── email.ts             # Email types
│   │       ├── todo.ts              # Todo types (matches chef-api)
│   │       └── widgets.ts           # Widget config types
│   └── package.json
│
├── server/                          # Fastify backend
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                 # Server entry: Fastify + WS + static
│   │   ├── config.ts                # Env vars, chef-api URL, ports
│   │   ├── auth.ts                  # API key validation middleware
│   │   ├── ws/
│   │   │   ├── manager.ts           # WS connection manager
│   │   │   └── poller.ts            # Chef-API polling → WS push
│   │   ├── routes/
│   │   │   ├── proxy.ts             # Proxy pass-through to chef-api
│   │   │   ├── auth.ts              # POST /auth/verify
│   │   │   └── layout.ts            # GET/PUT /layout (persist grid)
│   │   └── services/
│   │       └── metricsBuffer.ts     # Rolling time-series buffer
│   └── package.json
│
├── Dockerfile                       # Multi-stage: build client, run server
├── docker-compose.yml               # neo-dock + chef-api
├── .env.example                     # All required env vars documented
├── PLAN.md                          # This file
├── ROADMAP.md                       # Future phases
├── CLAUDE.md                        # AI context for future sessions
├── README.md                        # Setup & usage
└── .gitignore
```

---

## Implementation Phases

### Phase 1 — Foundation (Complete)
All items implemented. See ROADMAP.md for checklist.

1. ~~Project scaffolding~~ — Vite + React + Tailwind + TypeScript
2. ~~Design system~~ — CSS vars, fonts, Card/Chart UI components, scan-lines, noise overlay
3. ~~3D background~~ — GridFloor + Particles + Geometry + Effects with mouse parallax
4. ~~Layout shell~~ — Sidebar, TopBar, WidgetGrid with react-grid-layout
5. ~~Auth~~ — LoginGate (API key input), httpOnly cookie session
6. ~~Server~~ — Fastify serving static + WS + chef-api proxy
7. ~~WebSocket layer~~ — Client WebSocketClient + server poller/push manager (7 pollers)
8. ~~All 8 widgets~~ — ServerMonitor, DockerContainers, ServicesStatus, TodoList, GitHubDashboard, EmailInbox, LogsViewer, CronJobs
9. ~~Responsive breakpoints~~ — lg (desktop), md (tablet), sm (phone) layouts
10. **Docker build** — Dockerfile exists, needs end-to-end testing

### Phase 2 — Polish & Features (see ROADMAP.md)
### Phase 3 — Ecosystem (see ROADMAP.md)

---

## Environment Variables

```env
# Neo-Dock Server
NEO_DOCK_PORT=3000
NEO_DOCK_API_KEY=your-secret-key-here

# Chef-API Connection
CHEF_API_URL=http://localhost:4242
CHEF_API_KEY=your-chef-api-key

# Optional: Override polling intervals (seconds)
POLL_SYSTEM=2
POLL_DOCKER=5
POLL_SERVICES=30
POLL_GITHUB=60
POLL_EMAIL=30
POLL_LOGS=2
POLL_CRON=10
```

---

## Key Design Decisions

1. **Neo-Dock server as a proxy layer** — rather than having the browser call chef-api directly. This enables WebSocket push, metrics buffering, layout persistence, and a single auth boundary.

2. **Polling chef-api → WS push** (not direct WS to chef-api) — chef-api is REST-only today. Neo-dock server polls at configured intervals and pushes diffs to the browser. This decouples the frontend from chef-api's transport.

3. **Single Docker container** — Fastify serves both the API and the static Vite build. Simpler deployment than nginx + API containers.

4. **react-grid-layout for customization** — layouts serialize to JSON, persisted server-side at `GET/PUT /layout`. Per-breakpoint configs for desktop/tablet/phone.

5. **uPlot for time-series, Recharts for static** — two chart libraries sounds heavy but they solve different problems. uPlot handles 60fps live data that would choke Recharts.
