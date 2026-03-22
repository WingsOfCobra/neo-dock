# Network Fix Summary - 2026-03-22

## Problem

Neo-dock was experiencing constant "fetch failed" errors when trying to communicate with chef-api:

```
[poller] system/health failed: fetch failed
[poller] docker/containers failed: fetch failed
[poller] todo failed: fetch failed
[poller] cron/jobs failed: fetch failed
```

## Root Cause

1. **Network Isolation:** Neo-dock ran in isolated `neo-dock_default` bridge network
2. **Unreachable Host IP:** Tried to reach chef-api at `http://10.13.13.1:4242` (tailscale interface)
3. **No Route:** Container couldn't reach host's tailscale interface from isolated network

## Solution Implemented

### Architecture Change

Created shared `solcloud` Docker bridge network for inter-service communication:

```
┌────────────────────────────────┐
│    solcloud network (bridge)   │
│                                │
│  ┌──────────┐   ┌───────────┐ │
│  │ chef-api │ ← │ neo-dock  │ │
│  │  :4242   │   │  :3000    │ │
│  └──────────┘   └───────────┘ │
└────────────────────────────────┘
         ↓
  10.13.13.1:4242 (external)
```

### Changes Made

**Chef-API (WingsOfCobra/chef-api):**
- PR #5: Added `solcloud` network to docker-compose.yml
- PR #6: Fixed deployment to sync docker-compose.yml from repo
- Set `container_name: chef-api` for DNS resolution

**Neo-Dock (WingsOfCobra/neo-dock):**
- PR #1: Join `solcloud` network (external)
- PR #2: Sync docker-compose.yml during deployment
- Updated `.env`: `http://10.13.13.1:4242` → `http://chef-api:4242`

### Deployment Steps

1. ✅ Merged chef-api #5 (network config)
2. ✅ Merged chef-api #6 (deploy fix)
3. ✅ Deployed → `solcloud` network created
4. ✅ Merged neo-dock #1 (network config)
5. ✅ Merged neo-dock #2 (deploy fix)
6. ✅ Manually updated production `.env`
7. ✅ Restarted both services

## Results

### Before
```bash
docker logs neo-dock | grep "fetch failed" | wc -l
# 1000+ errors per hour
```

### After
```bash
docker logs neo-dock --since 5m | grep "chef" | grep "fetch failed"
# 0 errors

docker exec neo-dock wget -qO- http://chef-api:4242/system/health
# {"status":"ok",...}

docker network inspect solcloud --format '{{range .Containers}}{{.Name}} {{end}}'
# neo-dock chef-api
```

### Performance Impact

**Before (isolated network, unreachable host IP):**
- ~100% failure rate on all chef-api endpoints
- No data displayed in neo-dock UI
- Constant error logs

**After (shared network, DNS resolution):**
- 0% failure rate on chef-api endpoints
- Full dashboard functionality
- Clean logs (only Loki polling fails, different issue)

## Key Learnings

1. **Docker DNS is better than IP:** Use container names instead of host IPs
2. **Shared networks for microservices:** Services that talk to each other should share a network
3. **Deployment must sync config:** Docker image updates aren't enough - compose files must be synced too
4. **External networks:** Services can declare networks as `external: true` if created by another service

## Documentation

- **Chef-API:** `DOCKER_NETWORK.md` - Full network architecture docs
- **Neo-Dock:** `MIGRATION.md` - Manual migration steps

## Related Services

Any future SOLCloud service needing chef-api access should:

1. Join `solcloud` network (mark as `external: true`)
2. Use `http://chef-api:4242` for API calls
3. Ensure deployment workflow syncs docker-compose.yml

## Outstanding Issues

- **Loki polling:** Still failing (separate issue - Loki URL is `http://localhost:3100`)
  - Not a blocker - Loki is optional monitoring
  - Fix: Update neo-dock to use correct Loki endpoint or disable if not needed
