# Neo-Dock — Roadmap

## Phase 1 — Core Dashboard (Current)

See [PLAN.md](PLAN.md) for full details.

- [x] Project scaffolding (Vite + React + Tailwind + TypeScript)
- [x] Neo Militarism design system (colors, typography, UI components)
- [x] 3D cyberpunk background (grid floor, particles, wireframe geometry)
- [x] Layout shell (sidebar, top bar, customizable widget grid)
- [x] Auth (API key gate)
- [x] Fastify server (static serving, WebSocket, chef-api proxy)
- [x] WebSocket real-time layer
- [x] Widget: Server Monitor (CPU, RAM, disk, uptime)
- [x] Widget: Docker Containers (status, stats, actions, logs)
- [x] Widget: Services Status (systemd services)
- [x] Widget: Todo List (chef-api integration)
- [x] Widget: GitHub Dashboard (repos, PRs, issues, workflows, notifications)
- [x] Widget: Email Inbox (IMAP via chef-api)
- [x] Widget: Logs Viewer (live tail, search)
- [x] Widget: Cron Jobs (schedule, history)
- [x] Responsive layouts (desktop, iPad, phone)
- [ ] Docker image + docker-compose (Dockerfile ready, needs testing)

---

## Phase 2 — Polish & Power Features

- [ ] **Widget settings panel** — per-widget configuration (refresh rate, data filters, display mode)
- [ ] **Notifications system** — in-app alerts for critical events (server down, container crashed, email from VIP)
- [ ] **Keyboard shortcuts** — vim-style navigation, quick widget focus
- [ ] **Command palette** — Ctrl+K search across all widgets and actions
- [ ] **Theme variants** — alternate Neo Militarism sub-themes (Arasaka blue, Militech red, NetWatch green)
- [ ] **Sound effects** — subtle cyberpunk UI sounds on interactions (toggle-able)
- [ ] **Widget: Network Monitor** — bandwidth, latency, connected devices
- [ ] **Widget: System Processes** — top-like process list with kill actions
- [ ] **Multi-server support** — monitor multiple remote hosts, switch between them
- [ ] **Data export** — export metrics history as CSV/JSON
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
