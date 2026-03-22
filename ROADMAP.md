# Neo-Dock — Roadmap

## Phase 1 — Core Dashboard ✅

See [PLAN.md](PLAN.md) for full details.

- [x] Project scaffolding (Vite + React + Tailwind + TypeScript)
- [x] Neo Militarism design system (colors, typography, UI components)
- [x] 3D cyberpunk background (grid floor, particles, wireframe geometry)
- [x] CRT post-processing effects (chromatic aberration, vignette, noise)
- [x] Layout shell (tab-based navigation, static CSS grid dashboard)
- [x] Auth (API key gate)
- [x] Fastify server (static serving, WebSocket, chef-api proxy)
- [x] WebSocket real-time layer
- [x] Widget: Server Monitor (CPU, RAM, disk, uptime)
- [x] Widget: Docker Containers (status, stats, card layout, confirm actions, logs)
- [x] Widget: Services Status (systemd services)
- [x] Widget: Todo List (chef-api integration)
- [x] Widget: GitHub Dashboard (repos, PRs, issues, workflows, notifications)
- [x] GitHub repo detail pages (branches, commits, PRs per repo)
- [x] Widget: Email Inbox (IMAP via chef-api)
- [x] Widget: Logs Viewer (Loki integration, live tail, category filtering, log level detection)
- [x] Widget: Cron Jobs (schedule, history)
- [x] Responsive layouts (desktop, iPad, phone)
- [x] Touch-safe actions (two-tap confirmation for destructive Docker operations)
- [x] Type generation from chef-api OpenAPI spec (`npm run generate:types`)
- [x] Docker image + docker-compose (multi-stage build, GHCR publishing)
- [x] CI/CD (typecheck + test + build on PRs, auto-deploy on main via SSH)
- [x] Test suite (vitest)

---

## Phase 2 — Polish & Power Features (In Progress)

- [x] **Notifications system** — in-app alerts for container stops, cron failures, high CPU (>90%), new emails with 5-min dedup
- [x] **Keyboard shortcuts** — vim-style `g+x` sequences for tab navigation, `?` for help overlay
- [x] **Command palette** — Ctrl+K/Cmd+K fuzzy search across pages, Docker containers, and GitHub repos
- [x] **Widget: System Processes** — top 15 processes by CPU%, color-coded, compact mode for dashboard
- [x] **Theme variants** — Arasaka Blue, Militech Green, NetWatch Amber sub-themes with store persistence
- [x] **Sound effects** — procedural cyberpunk UI sounds on interactions (Web Audio API, toggle-able)
- [ ] **Widget settings panel** — per-widget configuration (refresh rate, data filters, display mode)
- [ ] **Widget: Network Monitor** — bandwidth, latency, connected devices (needs chef-api `/system/network/*` endpoints)
- [ ] **Multi-server support** — monitor multiple remote hosts, switch between them (chef-api fleet management is ready)
- [ ] **Data export** — export metrics history as CSV/JSON (needs chef-api `/metrics/snapshot`)
- [ ] **Offline mode** — service worker for basic functionality when connection drops

---

## Phase 3 — Ecosystem Expansion

### Finance Module
- [ ] **Portfolio tracker** — stocks, crypto, ETFs with live price feeds
- [ ] **Expense tracking** — categorized spending from bank API or CSV import
- [ ] **Budget dashboard** — monthly budget vs actual with visual breakdowns
- [ ] **Price alerts** — configurable thresholds with in-app notifications
- [ ] **Historical charts** — portfolio performance over time (uPlot)
- [ ] Integration candidates: Plaid API, CoinGecko API, Alpha Vantage, Yahoo Finance

### Smart Home Module
- [ ] **Home Assistant integration** — device status, controls, automations
- [ ] **Room-based layout** — visual floor plan or room grid with device groups
- [ ] **Climate widget** — temperature, humidity, thermostat controls
- [ ] **Lighting control** — on/off, brightness, color (Hue, WLED, Zigbee)
- [ ] **Security cameras** — live feed thumbnails, motion alerts
- [ ] **Energy monitoring** — real-time power consumption, solar production
- [ ] **Automation triggers** — create/toggle Home Assistant automations from dashboard
- [ ] Integration candidates: Home Assistant WebSocket API, MQTT, Zigbee2MQTT

### Additional Modules (Backlog)
- [ ] **RSS/News feed** — aggregated tech news, custom feeds
- [ ] **Weather widget** — local weather + forecast (OpenWeatherMap)
- [ ] **Calendar integration** — Google Calendar / CalDAV
- [ ] **Bookmark manager** — quick-access links with categories
- [ ] **Notes/Scratchpad** — markdown editor widget
- [ ] **Uptime monitor** — HTTP endpoint monitoring with response times
- [ ] **DNS/Pi-hole stats** — blocked queries, top domains
- [ ] **Media server** — Plex/Jellyfin now playing, library stats

---

## Phase 4 — Platform

- [ ] **Plugin system** — third-party widget development with SDK
- [ ] **Shared dashboards** — export/import layout + widget configs as JSON
- [ ] **Mobile app** — React Native wrapper for native push notifications
- [ ] **Multi-user** — role-based access, shared dashboards
- [ ] **API** — public API for external integrations
- [ ] **Marketplace** — community widget sharing

---

## Chef-API Dependencies

See [API-PLAN.md](API-PLAN.md) for the full contract.

| Neo-Dock Feature | Chef-API Needed | Chef-API Status |
|-----------------|----------------|----------------|
| Network Monitor | `/system/network/connections`, `/bandwidth`, `/latency` | ❌ Not started |
| Data Export | `/metrics`, `/metrics/snapshot` | ✅ Phase 3 merged |
| Multi-Server | `/fleet/*` endpoints | ✅ Phase 4 merged |
| Ansible Runner | `/ansible/*` endpoints | ✅ Phase 4 merged |
| Secrets Viewer | `/secrets/*` endpoints | ✅ Phase 4 merged |
| Finance Module | `/finance/*` endpoints | ❌ Not started |
| Smart Home | `/home/*` endpoints | ❌ Not started |

Last updated: 2026-03-22
