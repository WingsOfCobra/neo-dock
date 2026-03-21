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
- `GET /logs/tail/:source`, `GET /logs/search` — log aggregation

Auth: `X-Chef-API-Key` header on all requests. See chef-api docs for setup.

## Design System

Neo Militarism aesthetic:
- Near-black backgrounds (#08080C to #161620)
- Red primary accent (#C5003C) — power, alerts
- Cyan data accent (#55EAD4) — info, links
- Yellow warning (#F3E600) — sparingly
- Fonts: Orbitron (headers), Rajdhani (body), JetBrains Mono (data)
- Angular/chamfered corners (clip-path, not border-radius)
- Scan-line and noise texture overlays
- 3D background: wireframe grid + particles + geometry (react-three-fiber)

## Key Files

- `PLAN.md` — implementation plan with architecture, design system, and phases
- `API-PLAN.md` — contract between neo-dock and chef-api: every endpoint consumed, response shapes, and new endpoints needed. Give this to the chef-api agent when syncing
- `ROADMAP.md` — feature roadmap including future Finance and Smart Home modules
- `client/` — Vite + React frontend
- `server/` — Fastify backend

## Conventions

- TypeScript strict mode everywhere
- Tailwind CSS for styling with CSS custom properties for theme
- Zustand for state management
- All chef-api calls go through the neo-dock server (never directly from browser)
- Widget data types mirror chef-api response shapes
- Responsive: desktop → iPad → phone (react-grid-layout breakpoints)

## Repo Hygiene

- **Public repository** — never commit secrets, personal paths, hostnames, or identifying data
- **Keep docs updated** — when implementation changes, update PLAN.md, ROADMAP.md, and CLAUDE.md to match
- **No clutter** — don't create unnecessary files. Every file should have a clear purpose
- Chef-API gaps are being handled in a separate repo — don't duplicate that work here
