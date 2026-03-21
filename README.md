# Neo-Dock

A self-hosted monitoring dashboard for homelabs and private infrastructure, featuring a Cyberpunk 2077 **Neo Militarism** design aesthetic.

Real-time server metrics, Docker containers, GitHub activity, emails, todos, logs, and cron jobs — all in one customizable, widget-based interface with a 3D cyberpunk background.

## Features

- **Real-time monitoring** — CPU, RAM, disk, network via WebSocket push
- **Docker management** — Container status, stats, logs, restart/stop actions
- **Service status** — Systemd service health at a glance
- **GitHub dashboard** — Repos, PRs, issues, workflows, notifications
- **Email inbox** — IMAP integration with unread count and previews
- **Todo list** — Task management with inline editing
- **Log viewer** — Live tail with search and level filtering
- **Cron jobs** — Schedule overview with execution history
- **Customizable layout** — Drag, drop, and resize widgets
- **Responsive** — Desktop, tablet, and mobile layouts
- **3D background** — Interactive wireframe grid, particles, and geometry

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React 19 + TypeScript |
| State | Zustand |
| Styling | Tailwind CSS 4 |
| Charts | uPlot (time-series) + Recharts (static) |
| 3D | react-three-fiber + drei |
| Layout | react-grid-layout |
| Backend | Fastify + WebSocket |
| Auth | API key (single-user, self-hosted) |

## Architecture

```
Browser (SPA)  ◄──WebSocket──►  Neo-Dock Server (Fastify)  ──REST──►  Chef-API
```

Neo-Dock server acts as a proxy layer between the browser and your [Chef-API](https://github.com/anian/chef-api) instance. It polls the API at configurable intervals and pushes updates to the browser via WebSocket.

## Prerequisites

- Node.js 20+
- A running [Chef-API](https://github.com/anian/chef-api) instance
- Docker (optional, for containerized deployment)

## Quick Start

```bash
# Clone
git clone https://github.com/anian/neo-dock.git
cd neo-dock

# Configure
cp .env.example .env
# Edit .env with your API keys and chef-api URL

# Install & run (development)
cd client && npm install && cd ..
cd server && npm install && cd ..
npm run dev

# Or run with Docker
docker compose up
```

## Configuration

All configuration is done via environment variables. See `.env.example` for the full list.

| Variable | Required | Description |
|---|---|---|
| `NEO_DOCK_PORT` | No | Server port (default: 3000) |
| `NEO_DOCK_API_KEY` | Yes | Your private API key for dashboard access |
| `CHEF_API_URL` | Yes | URL of your Chef-API instance |
| `CHEF_API_KEY` | Yes | API key for Chef-API authentication |

## Design

Neo Militarism from Cyberpunk 2077 — cold corporate elegance, military precision, substance over style.

- Near-black backgrounds with angular, chamfered UI elements
- Red (`#C5003C`) for power and alerts, cyan (`#55EAD4`) for data, yellow (`#F3E600`) for warnings
- Orbitron + Rajdhani + JetBrains Mono typography
- Scan-line and noise texture overlays
- Interactive 3D background with wireframe grid, floating particles, and geometric shapes

## Documentation

- [PLAN.md](PLAN.md) — Implementation plan, architecture, and design system specs
- [ROADMAP.md](ROADMAP.md) — Feature roadmap (Finance, Smart Home, and more)

## License

MIT
