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

## New Endpoints Needed

These don't exist yet. Neo-Dock needs them for full functionality.

### 1. Per-Container Resource Stats

**Why:** `GET /docker/stats` returns global Docker stats. Neo-Dock needs CPU and memory **per container** to show resource usage next to each container in the list.

**Suggested endpoint:**
```
GET /docker/containers/:id/stats
```

**Expected response:**
```json
{
  "id": "abc123def456",
  "name": "nginx",
  "cpu_percent": 2.4,
  "memory_usage": 52428800,
  "memory_limit": 536870912,
  "memory_percent": 9.8,
  "network_rx": 1048576,
  "network_tx": 524288,
  "block_read": 0,
  "block_write": 4096,
  "timestamp": "2026-03-21T12:00:00Z"
}
```

**Notes:**
- Docker API `GET /containers/:id/stats?stream=false` returns a single snapshot — parse from there
- Should NOT be cached (called every 5s by neo-dock poller)
- Status: **Needed**

---

### 2. System Metrics with CPU Breakdown

**Why:** `/system/health` returns `memory.usedPercent` and `loadAvg` but **no CPU usage percentage**. Neo-Dock needs actual CPU utilization for the main dashboard gauge and line chart.

**Suggested change — extend `/system/health` response:**
```json
{
  "status": "ok",
  "uptime": 86400,
  "hostname": "server-1",
  "cpu": {
    "usage_percent": 23.5,
    "cores": 8,
    "model": "AMD Ryzen 7 5800X"
  },
  "memory": {
    "total": 34359738368,
    "free": 17179869184,
    "used_percent": 50.0
  },
  "loadAvg": [1.2, 0.8, 0.6],
  "network": {
    "rx_bytes": 1073741824,
    "tx_bytes": 536870912
  },
  "timestamp": "2026-03-21T12:00:00Z"
}
```

**New fields needed:**
- `cpu.usage_percent` — overall CPU usage (can use `os.cpus()` delta over 1s, or `/proc/stat`)
- `cpu.cores` — core count
- `cpu.model` — CPU model string
- `network.rx_bytes` / `network.tx_bytes` — total network bytes since boot (from `/proc/net/dev` or `os.networkInterfaces()`)

**Notes:**
- This is a backwards-compatible addition — existing fields stay the same
- Status: **Needed**

---

### 3. Service Status Endpoint

**Why:** Neo-Dock shows a "Services" widget with systemd service health. Currently the only way is `POST /ssh/run` with `systemctl is-active` per service, which is slow and requires N requests.

**Suggested endpoint:**
```
GET /services/status
```

**Configuration:** New env var `MONITORED_SERVICES` — comma-separated list of systemd unit names.
```env
MONITORED_SERVICES=nginx,docker,postgresql,redis,sshd
```

**Expected response:**
```json
{
  "services": [
    {
      "name": "nginx",
      "active": true,
      "status": "active (running)",
      "uptime": "2d 4h",
      "memory": "12.5M",
      "pid": 1234
    },
    {
      "name": "postgresql",
      "active": false,
      "status": "inactive (dead)",
      "uptime": null,
      "memory": null,
      "pid": null
    }
  ],
  "timestamp": "2026-03-21T12:00:00Z"
}
```

**Implementation hint:** Single `systemctl show` call with multiple units is faster than multiple `is-active` calls:
```bash
systemctl show nginx docker postgresql --property=ActiveState,SubState,MainPID,MemoryCurrent,ActiveEnterTimestamp --no-pager
```

**Notes:**
- Should work locally (not via SSH) since chef-api runs on the monitored server
- No caching needed (neo-dock polls every 30s)
- Status: **Needed**

---

### 4. Todo Delete

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

### 5. GitHub Summary Endpoint (Optional)

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

## Priority Order

| # | What | Priority | Blocking? |
|---|------|----------|-----------|
| 1 | Extend `/system/health` with CPU + network | **High** | Yes — main dashboard gauge has no data without this |
| 2 | `GET /docker/containers/:id/stats` | **High** | Yes — per-container stats needed for Docker widget |
| 3 | `GET /services/status` | **Medium** | Partial — can workaround via SSH but slow |
| 4 | `DELETE /todo/:id` | **Low** | No — can hide completed todos instead |
| 5 | `GET /github/summary` | **Low** | No — individual endpoints work fine |

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

Last synced: 2026-03-21
