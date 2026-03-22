# Chef-API — Required Changes for Neo-Dock

This file defines what Neo-Dock needs from Chef-API. It serves as a contract between the two repos. When implementing, update the **Status** column so both sides stay in sync.

---

## How Neo-Dock Consumes Chef-API

Neo-Dock's Fastify server sits between the browser and Chef-API. It:
1. **Polls** chef-api REST endpoints at configurable intervals
2. **Buffers** time-series data (CPU, RAM, container stats) in a rolling window
3. **Pushes** updates to the browser via WebSocket

The browser never talks to chef-api directly. Neo-Dock authenticates with `X-Chef-API-Key`.

---

## Existing Endpoints Neo-Dock Uses

These already work. Listed here so chef-api knows **not to break them**.

### System
| Method | Path | Used For | Poll Interval |
|--------|------|----------|---------------|
| `GET` | `/system/health` | CPU, RAM, uptime, load average | 2s |
| `GET` | `/system/disk` | Disk usage per mount | 30s |
| `GET` | `/system/processes` | Top processes list | 10s |

**Response shapes we depend on:**
- `/system/health` → `{ status, uptime, uptimeHuman, hostname, platform, memory: { total, free, usedPercent }, loadAvg[], timestamp }`
- `/system/disk` → `{ filesystem, size, used, available, usePercent, mountpoint }[]`
- `/system/processes` → `{ pid, user, cpuPercent, memPercent, command }[]`

### Docker
| Method | Path | Used For | Poll Interval |
|--------|------|----------|---------------|
| `GET` | `/docker/containers` | Container list + status | 5s |
| `GET` | `/docker/stats` | Overall Docker resource usage | 5s |
| `GET` | `/docker/containers/:id/logs?lines=200` | Container log viewer (on-demand) | — |
| `POST` | `/docker/containers/:id/restart` | Restart action | — |
| `POST` | `/docker/containers/:id/stop` | Stop action | — |

**Response shapes we depend on:**
- `/docker/containers` → `{ id, name, image, status, state, health, uptime, ports[] }[]`
- `/docker/stats` → `{ containers: { total, running, stopped, paused }, images, volumes, diskUsage }`

### GitHub
| Method | Path | Used For | Poll Interval |
|--------|------|----------|---------------|
| `GET` | `/github/repos` | Repo list | 60s |
| `GET` | `/github/repos/:owner/:repo/prs` | Open PRs | 60s |
| `GET` | `/github/repos/:owner/:repo/issues` | Open issues | 60s |
| `GET` | `/github/repos/:owner/:repo/workflows` | CI/CD status | 60s |
| `GET` | `/github/notifications` | Unread notifications | 60s |

### Email
| Method | Path | Used For | Poll Interval |
|--------|------|----------|---------------|
| `GET` | `/email/unread` | Unread count + preview list | 30s |
| `GET` | `/email/search?from=&subject=&since=` | Email search (on-demand) | — |
| `GET` | `/email/thread/:uid` | Email thread view (on-demand) | — |

### Todos
| Method | Path | Used For |
|--------|------|----------|
| `GET` | `/todo` | Fetch all todos (db + file) |
| `POST` | `/todo` | Create todo `{ title, description? }` |
| `PATCH` | `/todo/:id` | Update todo `{ title?, description?, completed? }` |

### Cron
| Method | Path | Used For | Poll Interval |
|--------|------|----------|---------------|
| `GET` | `/cron/jobs` | Job list with next run | 10s |
| `GET` | `/cron/jobs/:id/history?limit=20` | Execution history | on-demand |
| `POST` | `/cron/jobs/:id/run` | Manual trigger | — |

### Logs
| Method | Path | Used For | Poll Interval |
|--------|------|----------|---------------|
| `GET` | `/logs/files` | Available log sources | 60s |
| `GET` | `/logs/tail/:source?lines=200` | Live log tail | 2s |
| `GET` | `/logs/search?q=&source=&limit=` | Log search (on-demand) | — |

### SSH
| Method | Path | Used For |
|--------|------|----------|
| `GET` | `/ssh/hosts` | Available hosts list |
| `POST` | `/ssh/run` | Run command `{ host, command }` |

---

## Recently Implemented Endpoints

These were previously in the "Needed" section and are now available.

### Per-Container Resource Stats — DONE
`GET /docker/containers/:id/stats` — returns CPU%, memory usage/limit/%, network rx/tx per container.

### Service Status — DONE
`GET /services/status` — returns systemd service health with active state, uptime, memory, PID.

### System Network — DONE
`GET /system/network` — returns per-interface stats.
```json
[{ "name": "eth0", "rx_bytes": 1882267, "tx_bytes": 2954624, "rx_packets": 5669, "tx_packets": 6913, "ipv4": "172.27.0.2", "ipv6": null }]
```

### System Memory (Detailed) — DONE
`GET /system/memory` — returns detailed memory breakdown.
```json
{ "total": 33590038528, "free": 6063292416, "available": 16634470400, "buffers": 1216192512, "cached": 8442425344, "swapTotal": 34288431104, "swapFree": 33215188992, "swapUsed": 1073242112, "usedPercent": 50.5, "swapUsedPercent": 3.1 }
```

### Docker Images — DONE
`GET /docker/images` — returns image list with id, tags, size, created.

### Docker Networks — DONE
`GET /docker/networks` — returns network list with id, name, driver, scope, containers count.

---

## New Endpoints Needed

### 1. Todo Delete

**Why:** Neo-Dock todo widget needs a delete action. Currently there's no way to remove a todo — only mark complete.

**Suggested endpoint:**
```
DELETE /todo/:id
```

**Expected response:** `204 No Content`

**Notes:**
- Only works for DB todos (id < 10000). File todos are managed in the markdown file.
- Status: **Nice-to-have** (neo-dock can work without it)

---

### 2. GitHub Summary Endpoint (Optional)

**Why:** Neo-Dock's GitHub widget currently needs to call 5 separate endpoints to populate one widget. A combined summary endpoint would reduce latency and simplify polling.

**Suggested endpoint:**
```
GET /github/summary
```

**Expected response:**
```json
{
  "repos": { "total": 42, "recent": [...top 5 by lastPush...] },
  "pull_requests": { "open": 3, "items": [...] },
  "issues": { "open": 7, "items": [...] },
  "notifications": { "unread": 5, "items": [...] },
  "workflows": { "failing": 1, "items": [...recent runs...] },
  "timestamp": "2026-03-21T12:00:00Z"
}
```

**Notes:**
- Internally calls the existing services and combines results
- Cache for 60s (same as individual endpoints)
- Status: **Nice-to-have** (neo-dock can call endpoints individually)

---

### 3. Multi-Server Remote Metrics (Phase 2)

**Why:** Neo-Dock wants to monitor multiple remote hosts. Chef-api already has `/ssh/hosts` and `/ssh/run`, but gathering system metrics per-host via SSH is slow and fragile.

**Suggested approach:** Deploy chef-api on each remote host. Neo-Dock server manages multiple chef-api URLs.

**What Neo-Dock needs from chef-api:**
- No new endpoints needed — each remote chef-api instance serves the same `/system/*`, `/docker/*` endpoints
- Neo-Dock server will handle multi-instance orchestration

**Notes:**
- Status: **Future** — Neo-Dock will implement multi-server on its own server layer
- Chef-api stays single-host; Neo-Dock aggregates

---

## Priority Order

| # | What | Priority | Blocking? |
|---|------|----------|-----------|
| 1 | `DELETE /todo/:id` | **Low** | No — can hide completed todos instead |
| 2 | `GET /github/summary` | **Low** | No — individual endpoints work fine |
| 3 | Multi-server remote metrics | **Future** | No — each host runs its own chef-api |

---

## Compatibility Notes

- Neo-Dock sends `X-Chef-API-Key` header on every request
- Neo-Dock expects JSON responses with consistent error shape: `{ error: string }`
- Neo-Dock polls at fixed intervals — endpoints should be fast (< 500ms ideally)
- If an endpoint returns 503 (service not configured), Neo-Dock shows a "not configured" state in the widget — this is fine
- Neo-Dock never writes to chef-api's database directly

---

## Type Generation

Types are auto-generated from chef-api OpenAPI spec. Run `npm run generate:types` from neo-dock root after any chef-api endpoint changes.

## Sync Protocol

When either side makes changes:
1. Update this file's **Status** column
2. If a response shape changes, update the **Response shapes we depend on** section
3. If a new endpoint is added, move it from "New Endpoints Needed" to "Existing Endpoints"

Last synced: 2026-03-22
