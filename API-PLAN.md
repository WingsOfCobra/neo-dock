# Chef-API — Required Changes for Neo-Dock

This file defines what Neo-Dock needs from Chef-API. It serves as a contract between the two repos. When implementing, update the **Status** column so both sides stay in sync.

---

## How Neo-Dock Consumes Chef-API

Neo-Dock's Fastify server sits between the browser and Chef-API. It:
1. **Polls** chef-api REST endpoints at configurable intervals
2. **Buffers** time-series data (CPU, RAM, container stats) in a rolling window
3. **Pushes** updates to the browser via WebSocket
4. **Proxies** on-demand requests via `/api/chef/*` passthrough

The browser never talks to chef-api directly. Neo-Dock authenticates with `X-Chef-API-Key`.

---

## Implemented Endpoints (All Working)

Everything below is live in chef-api and consumed by neo-dock.

### System
| Method | Path | Used For | Poll / On-demand |
|--------|------|----------|-----------------|
| `GET` | `/system/health` | CPU, RAM, uptime, load average, network bytes | Poll 2s |
| `GET` | `/system/disk` | Disk usage per mount | Poll 30s |
| `GET` | `/system/processes` | Top processes by CPU% | Poll 10s |
| `GET` | `/system/memory` | Detailed memory breakdown (total, free, buffers, cached, swap) | Available (not polled separately) |
| `GET` | `/system/network` | Per-interface stats (rx/tx bytes, packets, IPs) | Available (not polled separately) |

### Docker
| Method | Path | Used For | Poll / On-demand |
|--------|------|----------|-----------------|
| `GET` | `/docker/containers` | Container list + status + health | Poll 5s |
| `GET` | `/docker/stats` | Overall Docker resource usage | Poll 5s |
| `GET` | `/docker/containers/:id/stats` | Per-container CPU%, memory, network | Poll per-container |
| `GET` | `/docker/containers/:id/logs?lines=200` | Container log viewer | On-demand |
| `GET` | `/docker/containers/:id/inspect` | Full container detail | On-demand |
| `POST` | `/docker/containers/:id/restart` | Restart action | On-demand |
| `POST` | `/docker/containers/:id/stop` | Stop action | On-demand |
| `GET` | `/docker/images` | Image list with id, tags, size, created | Available |
| `GET` | `/docker/networks` | Network list with id, name, driver, scope | Available |

### GitHub
| Method | Path | Used For | Poll / On-demand |
|--------|------|----------|-----------------|
| `GET` | `/github/repos` | Repo list | Poll 60s |
| `GET` | `/github/prs` | Aggregated open PRs (top repos) | Poll 60s |
| `GET` | `/github/issues` | Aggregated open issues (top repos) | Poll 60s |
| `GET` | `/github/workflows` | Aggregated recent workflow runs | Poll 60s |
| `GET` | `/github/notifications` | Unread notifications | Poll 60s |
| `GET` | `/github/repos/:owner/:repo` | Repo detail (language, topics, license) | On-demand (RepoDetailPage) |
| `GET` | `/github/repos/:owner/:repo/branches` | Branch list with protection status | On-demand (RepoDetailPage) |
| `GET` | `/github/repos/:owner/:repo/commits` | Recent commits | On-demand (RepoDetailPage) |
| `GET` | `/github/repos/:owner/:repo/releases` | Releases list | On-demand (RepoDetailPage) |
| `GET` | `/github/repos/:owner/:repo/prs` | Open PRs with CI status | On-demand (RepoDetailPage) |
| `GET` | `/github/repos/:owner/:repo/issues` | Open issues | On-demand (RepoDetailPage) |
| `POST` | `/github/repos/:owner/:repo/issues` | Create issue | On-demand |
| `GET` | `/github/repos/:owner/:repo/workflows` | Workflow runs for repo | On-demand (RepoDetailPage) |

### Email
| Method | Path | Used For | Poll / On-demand |
|--------|------|----------|-----------------|
| `GET` | `/email/unread` | Unread count + preview list | Poll 30s |
| `GET` | `/email/search?from=&subject=&since=` | Email search | On-demand |
| `GET` | `/email/thread/:uid` | Email thread view | On-demand |

### Todos
| Method | Path | Used For | Poll / On-demand |
|--------|------|----------|-----------------|
| `GET` | `/todo` | Fetch all todos (db + file) | Poll |
| `POST` | `/todo` | Create todo | On-demand |
| `PATCH` | `/todo/:id` | Update todo | On-demand |
| `DELETE` | `/todo/:id` | Delete todo (DB only) | On-demand |

### Cron
| Method | Path | Used For | Poll / On-demand |
|--------|------|----------|-----------------|
| `GET` | `/cron/jobs` | Job list with next run | Poll 10s |
| `GET` | `/cron/health` | Scheduler status | Poll |
| `GET` | `/cron/presets` | Available presets | Available |
| `POST` | `/cron/jobs` | Create a cron job | On-demand |
| `GET` | `/cron/jobs/:id/history?limit=20` | Execution history | On-demand |
| `POST` | `/cron/jobs/:id/run` | Manual trigger | On-demand |
| `DELETE` | `/cron/jobs/:id` | Remove a job | On-demand |

### Logs
| Method | Path | Used For | Poll / On-demand |
|--------|------|----------|-----------------|
| `GET` | `/logs/files` | Available log sources | Poll 60s |
| `GET` | `/logs/tail/:source?lines=200` | Log tail | On-demand |
| `GET` | `/logs/search?q=&source=&limit=` | Log search | On-demand |
| `GET` | `/logs/stats` | Index statistics | Available |

### SSH
| Method | Path | Used For |
|--------|------|----------|
| `GET` | `/ssh/hosts` | Available hosts list |
| `POST` | `/ssh/run` | Run command `{ host, command }` |

### Services
| Method | Path | Used For | Poll / On-demand |
|--------|------|----------|-----------------|
| `GET` | `/services/status` | Systemd service health | Poll |

### Alerting
| Method | Path | Used For |
|--------|------|----------|
| `GET` | `/alerts/rules` | List alert rules |
| `POST` | `/alerts/rules` | Create alert rule |
| `PATCH` | `/alerts/rules/:id` | Update/enable/disable rule |
| `DELETE` | `/alerts/rules/:id` | Delete rule |
| `GET` | `/alerts/events` | Recent alert events |
| `POST` | `/alerts/rules/:id/test` | Fire test webhook |

### Hooks
| Method | Path | Used For |
|--------|------|----------|
| `POST` | `/hooks/agent-event` | Receive OpenClaw agent events (HMAC) |
| `GET` | `/hooks/events` | List recent events |
| `POST` | `/hooks/notify` | Send notification |

### WebSocket
| Path | Used For |
|------|----------|
| `WS /ws/system` | Live CPU/memory/load (2s) |
| `WS /ws/containers` | Docker container state events |

---

## Phase 2 — Neo-Dock Needs (Polish & Power Features)

These neo-dock features need new or enhanced chef-api endpoints.

### Network Monitor Widget
**Neo-Dock roadmap:** Widget showing bandwidth, latency, connected devices

**What neo-dock needs from chef-api:**
| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/system/network` | Per-interface stats (already exists) | ✅ Done |
| `GET` | `/system/network/connections` | Active connections (ss/netstat) | ❌ Needed |
| `GET` | `/system/network/bandwidth` | Real-time bandwidth per interface (rolling 30s window) | ❌ Needed |
| `GET` | `/system/network/latency?hosts=` | Ping latency to specified hosts | ❌ Needed |

### Widget Settings / Config Persistence
**Neo-Dock roadmap:** Per-widget configuration (refresh rate, data filters, display mode)

**Notes:** This is entirely a neo-dock concern — no chef-api changes needed. Neo-dock stores widget config in its own layout system.

### Multi-Server Support
**Neo-Dock roadmap:** Monitor multiple remote hosts, switch between them

**What neo-dock needs from chef-api:**
- No new endpoints needed. Deploy chef-api on each remote host.
- Neo-dock server manages multiple chef-api base URLs.
- Each instance serves the same `/system/*`, `/docker/*`, `/services/*` endpoints.
- Neo-dock handles orchestration, aggregation, and server switching.

### Data Export
**Neo-Dock roadmap:** Export metrics history as CSV/JSON

**What neo-dock needs from chef-api:**
| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/metrics/snapshot` | JSON snapshot of current system + container metrics | ❌ Needed |
| `GET` | `/metrics` | Prometheus-compatible text format (optional, for Grafana) | ❌ Needed |

**Notes:** Already on chef-api Phase 3 roadmap as "Metrics Endpoint".

---

## Phase 3 — Ecosystem Expansion

### Finance Module
**Neo-Dock roadmap:** Portfolio tracker, expense tracking, budget dashboard, price alerts

**What neo-dock needs from chef-api:**
| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/finance/portfolio` | Holdings with current prices | ❌ Future |
| `GET` | `/finance/portfolio/history` | Historical portfolio value | ❌ Future |
| `POST` | `/finance/portfolio` | Add/update holding | ❌ Future |
| `GET` | `/finance/expenses` | Categorized spending | ❌ Future |
| `POST` | `/finance/expenses` | Log expense (manual or CSV import) | ❌ Future |
| `GET` | `/finance/budget` | Monthly budget vs actual | ❌ Future |
| `GET` | `/finance/alerts` | Price alert rules | ❌ Future |
| `POST` | `/finance/alerts` | Create price alert | ❌ Future |

**Integration candidates:** CoinGecko API, Alpha Vantage, Yahoo Finance, Plaid API
**Chef-api work:** New `/finance` route module, price fetching service, SQLite storage

### Smart Home Module
**Neo-Dock roadmap:** Home Assistant integration, room layout, climate, lighting, cameras

**What neo-dock needs from chef-api:**
| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/home/devices` | Device list from Home Assistant | ❌ Future |
| `GET` | `/home/devices/:id` | Device state/detail | ❌ Future |
| `POST` | `/home/devices/:id/control` | Toggle/set device | ❌ Future |
| `GET` | `/home/rooms` | Room groupings | ❌ Future |
| `GET` | `/home/automations` | HA automations list | ❌ Future |
| `POST` | `/home/automations/:id/toggle` | Enable/disable automation | ❌ Future |
| `WS` | `/ws/home` | Real-time device state changes | ❌ Future |

**Integration:** Home Assistant WebSocket API, MQTT, Zigbee2MQTT
**Chef-api work:** New `/home` route module, HA WebSocket client service

### Additional Widgets
| Widget | Chef-API needed | Status |
|--------|----------------|--------|
| RSS/News feed | `GET /feeds`, `POST /feeds` (RSS aggregation) | ❌ Future |
| Weather | None — neo-dock can call wttr.in/Open-Meteo directly | N/A |
| Calendar | `GET /calendar/events` (CalDAV/Google Cal proxy) | ❌ Future |
| Uptime monitor | `GET /uptime/targets`, `GET /uptime/status` (HTTP monitoring) | ❌ Future |
| DNS/Pi-hole | `GET /dns/stats` (Pi-hole API proxy) | ❌ Future |
| Media server | `GET /media/now-playing`, `GET /media/library` (Plex/Jellyfin) | ❌ Future |

---

## Phase 4 — Chef-API Fleet Management

These are chef-api roadmap items that neo-dock will consume when ready.

| Feature | Chef-API Endpoints | Neo-Dock Widget |
|---------|-------------------|----------------|
| Ansible Runner | `/ansible/playbooks`, `/ansible/jobs/:id` | Playbook dashboard + live output |
| Fleet Management | `/fleet/servers`, `/fleet/run`, `/fleet/status` | Multi-server overview |
| Secrets Vault | `/secrets` (Bitwarden integration) | Secrets viewer (names only) |

---

## Priority Summary

| # | What | Effort | Blocking Neo-Dock? |
|---|------|--------|-------------------|
| 1 | Network bandwidth/connections/latency endpoints | Small | Yes — Network Monitor widget |
| 2 | Metrics snapshot + Prometheus format | Small | Yes — Data Export feature |
| 3 | Multi-server support | None (chef-api side) | No — neo-dock orchestrates |
| 4 | Finance module (`/finance/*`) | Large | Yes — Phase 3 ecosystem |
| 5 | Smart Home module (`/home/*`) | Large | Yes — Phase 3 ecosystem |
| 6 | Fleet management (`/fleet/*`, `/ansible/*`) | Large | Phase 4 |

---

## Compatibility Notes

- Neo-Dock sends `X-Chef-API-Key` header on every request
- Neo-Dock expects JSON responses with consistent error shape: `{ error: string }`
- Neo-Dock polls at fixed intervals — endpoints should be fast (< 500ms ideally)
- If an endpoint returns 503 (service not configured), Neo-Dock shows "not configured" state — this is fine
- Neo-Dock never writes to chef-api's database directly

## Type Generation

Types are auto-generated from chef-api OpenAPI spec:
```bash
npm run generate:types   # points at http://10.13.13.1:4242/docs/json
```

Run after any chef-api endpoint changes.

## Sync Protocol

When either side makes changes:
1. Update this file
2. If a response shape changes, update the relevant section
3. If a new endpoint is added, add it to "Implemented Endpoints"

Last synced: 2026-03-22
