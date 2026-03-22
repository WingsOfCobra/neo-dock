# Neo-Dock — AI Context

## What is this?

Neo-Dock is a self-hosted monitoring dashboard with a Cyberpunk 2077 Neo Militarism design aesthetic. It aggregates data from multiple sources (servers, GitHub, email, todos, Docker, logs) into a customizable, real-time, widget-based interface.

## Architecture

- **Client**: Vite + React 19 + TypeScript SPA
- **Server**: Fastify backend that serves the client build, manages WebSocket connections, and proxies requests to the chef-api
- **Data source**: chef-api running on `localhost:4242` — provides all backend data (GitHub, Docker, SSH, System, Todos, Cron, Hooks, Logs, Email)
- **Real-time**: Server polls chef-api → pushes to browser via WebSocket
- **Auth**: Single API key (`NEO_DOCK_API_KEY` env var), stored as httpOnly cookie in browser

## Chef-API

External dependency — a Fastify + SQLite orchestration API. Endpoints used by Neo-Dock:
- `GET /system/health`, `GET /system/disk`, `GET /system/processes` — server metrics
- `GET /docker/containers`, `GET /docker/stats/:id`, `GET /docker/logs/:id` — Docker
- `POST /ssh/run` — remote command execution
- `GET /github/repos`, `/prs`, `/issues`, `/workflows`, `/notifications` — GitHub
- `GET /email/unread`, `/search`, `/thread/:id` — IMAP email
- `GET /todo`, `POST /todo`, `PATCH /todo/:id` — task management
- `GET /cron/jobs`, `GET /cron/history` — scheduled jobs
Auth: `X-Chef-API-Key` header on all requests. See chef-api docs for setup.

## Loki Integration

Logs are sourced from a local Loki instance (default `http://localhost:3100`, configurable via `LOKI_URL` env var). NOT from chef-api.

Server routes (proxied through neo-dock server):
- `GET /api/loki/labels` — all label names (for category selectors)
- `GET /api/loki/label/:name/values` — values for a specific label
- `GET /api/loki/query_range` — LogQL range query (query, start, end, limit, direction)
- `GET /api/loki/query` — instant query (latest logs)

Real-time: Server polls Loki every 2s, broadcasts new entries via WebSocket (`loki:logs`, `loki:labels` topics).

Client features:
- Category filtering by any Loki label (job, container_name, unit, etc.)
- Log level detection (from labels or line content: error/warn/info/debug)
- Live tail mode with auto-scroll (toggleable pause)
- Historical query mode with manual refresh
- Full-screen view on `/logs` page

## Design System

Cyberpunk 2077 Red Terminal aesthetic — like an in-game access point terminal:
- Dark red-black backgrounds (#0A0000 to #1A0808)
- Everything red: primary (#FF0033), dim (#990020), text (#FF8888), secondary text (#AA4444)
- Yellow (#FF6600) used sparingly for warnings only
- Fonts: Orbitron (headers), Rajdhani (body), JetBrains Mono (data/terminal)
- Angular/chamfered corners (clip-path, not border-radius)
- CRT effects: scan-line overlay, noise texture, flicker animation, glitch text
- Terminal-style UI: `> prompts`, `[STATUS]` badges, blinking cursors, monospace everywhere
- Red pulse glow on cards, animated gradient border lines
- 3D background: all-red wireframe grid + red particles + red geometry (react-three-fiber)
- Post-processing: chromatic aberration, heavy vignette, noise

## Navigation

Tab-based routing (react-router-dom):
- **Dashboard** (`/`) — overview grid with all widgets
- **System** (`/system`) — server monitor + services
- **Docker** (`/docker`) — container management
- **Comms** (`/comms`) — GitHub + Email
- **Tasks** (`/tasks`) — Todo + Cron jobs
- **Logs** (`/logs`) — full-screen log viewer

## Key Files

- `PLAN.md` — implementation plan with architecture, design system, and phases
- `API-PLAN.md` — contract between neo-dock and chef-api: every endpoint consumed, response shapes, and new endpoints needed. Give this to the chef-api agent when syncing
- `ROADMAP.md` — feature roadmap including future Finance and Smart Home modules
- `client/src/pages/` — route page components (DashboardPage, SystemPage, etc.)
- `client/src/components/layout/TabBar.tsx` — horizontal tab navigation
- `client/` — Vite + React frontend
- `server/` — Fastify backend

## Conventions

- TypeScript strict mode everywhere
- Tailwind CSS for styling with CSS custom properties for theme
- Zustand for state management
- All chef-api calls go through the neo-dock server (never directly from browser)
- Widget data types mirror chef-api response shapes
- react-router-dom for tab-based page navigation
- Responsive: CSS grid layouts per page (no react-grid-layout on dashboard — replaced with static grid)

## Repo Hygiene

- **Public repository** — never commit secrets, personal paths, hostnames, or identifying data
- **Keep docs updated** — when implementation changes, update PLAN.md, ROADMAP.md, and CLAUDE.md to match
- **No clutter** — don't create unnecessary files. Every file should have a clear purpose
- Chef-API gaps are being handled in a separate repo — don't duplicate that work here
