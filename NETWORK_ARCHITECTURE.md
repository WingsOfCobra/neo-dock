# SOLCloud Network Architecture

## Overview

SOLCloud uses a **multi-network service mesh** pattern where services join multiple Docker networks based on their communication needs.

## Network Domains

### 🏗️ `solcloud` - Application Services
**Purpose:** Inter-service communication for SOLCloud application stack

**Members:**
- `chef-api` - Central API server
- `neo-dock` - Dashboard UI

**Communication:**
- neo-dock → chef-api: `http://chef-api:4242`

---

### 📊 `monitoring_monitoring` - Observability Stack
**Purpose:** Monitoring, logging, and metrics collection

**Members:**
- `solcloud-grafana` - Dashboards & visualization
- `solcloud-loki` - Log aggregation
- `solcloud-prometheus` - Metrics collection
- `solcloud-alertmanager` - Alert routing
- `solcloud-promtail` - Log shipper
- `solcloud-node-exporter` - Host metrics
- `solcloud-cadvisor` - Container metrics
- `solcloud-blackbox-exporter` - Endpoint monitoring
- `neo-dock` - Dashboard (needs Loki access)

**Communication:**
- grafana → loki: `http://solcloud-loki:3100`
- grafana → prometheus: `http://solcloud-prometheus:9090`
- neo-dock → loki: `http://solcloud-loki:3100`
- prometheus → (scrapes all exporters)

---

### 🌐 `proxy-manager` - Reverse Proxy & External Access
**Purpose:** Public-facing services and reverse proxy routing

**Members:**
- `proxy-manager-app-1` - Nginx Proxy Manager
- `neo-dock` - Public at dock.asbeats.com
- `solcloud-grafana` - Public at grafana.asbeats.com (likely)
- Various other services needing external access

**External URLs:**
- https://dock.asbeats.com → neo-dock

---

### 🔒 `wireguard_wireguard` - VPN Network
**Purpose:** Secure VPN tunneling

**Members:**
- `openclaw-https` - OpenClaw HTTPS gateway

---

### ☁️ `nextcloud-aio` - Nextcloud Stack
**Purpose:** Isolated network for Nextcloud All-in-One

**Members:** 13 Nextcloud services (apache, database, redis, collabora, etc.)

---

## Service Network Memberships

| Service | Networks | Reason |
|---------|----------|--------|
| `chef-api` | `solcloud` | App stack |
| `neo-dock` | `solcloud` + `monitoring_monitoring` + `proxy-manager` | Needs chef-api, Loki, external access |
| `solcloud-grafana` | `monitoring_monitoring` + `proxy-manager` | Monitoring + external access |
| `solcloud-loki` | `monitoring_monitoring` | Monitoring only |
| `solcloud-prometheus` | `monitoring_monitoring` | Monitoring only |
| `openclaw-https` | `wireguard_wireguard` + `proxy-manager` | VPN + external access |

## Why Multi-Network?

**Problem:** Single-network approach creates tight coupling:
- All services see each other (security concern)
- Can't isolate stacks (Nextcloud, monitoring, etc.)
- Hard to control communication paths

**Solution:** Domain-specific networks with selective joining:
- ✅ Clear domain boundaries
- ✅ Explicit communication paths
- ✅ Better security (principle of least privilege)
- ✅ Isolated stacks can't interfere

**Trade-off:** Services may be on 2-3 networks, but that's intentional design.

## Configuration

### Neo-Dock Example

**docker-compose.yml:**
```yaml
services:
  neo-dock:
    networks:
      - solcloud              # For chef-api
      - monitoring_monitoring # For Loki
      # proxy-manager joined at runtime

networks:
  solcloud:
    name: solcloud
    external: true
  monitoring_monitoring:
    name: monitoring_monitoring
    external: true
```

**.env:**
```env
CHEF_API_URL=http://chef-api:4242          # solcloud network
LOKI_URL=http://solcloud-loki:3100         # monitoring_monitoring network
```

## Network Cleanup

### Active Networks (Keep)
- `solcloud`
- `monitoring_monitoring`
- `proxy-manager`
- `wireguard_wireguard`
- `nextcloud-aio`

### Unused Networks (Remove)
```bash
docker network rm chef-api_default
docker network rm chef-api-code_default
docker network rm neo-dock_neo-dock
docker network rm n8n_default
```

These are leftover from old deploys using default network naming.

## Verification

### Check service connectivity:
```bash
# Neo-dock → chef-api (solcloud)
docker exec neo-dock wget -qO- http://chef-api:4242/system/health

# Neo-dock → Loki (monitoring_monitoring)
docker exec neo-dock wget -qO- http://solcloud-loki:3100/ready

# Grafana → Prometheus (monitoring_monitoring)
docker exec solcloud-grafana wget -qO- http://solcloud-prometheus:9090/-/healthy
```

### List service networks:
```bash
docker inspect neo-dock --format '{{range $net, $cfg := .NetworkSettings.Networks}}{{$net}} {{end}}'
# Expected: monitoring_monitoring proxy-manager solcloud
```

## Troubleshooting

### "network not found"
**Cause:** Trying to join external network that doesn't exist yet.  
**Fix:** Ensure the owning stack is deployed first (monitoring stack, proxy-manager).

### "connection refused" between services
**Cause:** Services not on same network.  
**Fix:** Add missing network to docker-compose.yml.

### "DNS resolution failed"
**Cause:** Wrong container name or network.  
**Fix:** Use exact container names, verify both services on same network.

## Future Additions

When adding new SOLCloud services:

1. **Identify communication needs:** What does it talk to?
2. **Join appropriate networks:**
   - Need chef-api? → Join `solcloud`
   - Need Loki/Grafana? → Join `monitoring_monitoring`
   - Public-facing? → Join `proxy-manager` (or let proxy-manager join yours)
3. **Document in this file**
4. **Use DNS names, not IPs:** `http://service-name:port`

## Design Principles

1. **Explicit over implicit:** Join networks intentionally, document why
2. **Least privilege:** Only join networks you actually need
3. **Domain isolation:** Keep stacks (Nextcloud, n8n) isolated unless needed
4. **DNS over IPs:** Always use container names for service discovery
5. **External networks:** Mark networks as `external: true` if you don't own them
