# Migration Guide: Network Fix

## What Changed

Neo-dock now uses a shared Docker network (`solcloud`) to communicate with chef-api instead of trying to reach the host's tailscale IP from an isolated container.

## Required Manual Steps

After this PR is merged and deployed, you **must** update the production `.env` file:

### 1. Update .env on Server

```bash
ssh your-server
cd ~/neo-dock
nano .env
```

Change:
```env
CHEF_API_URL=http://10.13.13.1:4242
```

To:
```env
CHEF_API_URL=http://chef-api:4242
```

### 2. Restart Services (Correct Order)

```bash
# Chef API first (creates solcloud network)
cd ~/chef-api
docker-compose down
docker-compose up -d

# Neo-dock second (joins existing network)
cd ~/neo-dock
docker-compose down
docker-compose up -d
```

### 3. Verify

```bash
# Check both containers are on solcloud network
docker network inspect solcloud

# Check neo-dock logs - should see successful API calls
docker logs neo-dock --tail 50

# Should NOT see "fetch failed" errors anymore
```

## Why This Order Matters

1. **Chef-API deploys first** → creates `solcloud` network
2. **Neo-dock deploys second** → tries to join `solcloud` (external)
3. If reversed, neo-dock deployment will fail with "network not found"

## Rollback (If Needed)

```bash
cd ~/neo-dock
nano .env  # Change back to http://10.13.13.1:4242

cd ~/chef-api
docker-compose down
docker-compose up -d

cd ~/neo-dock
docker-compose down
docker-compose up -d
```

## Automated Deployment Note

Since your deployment is automatic via GitHub Actions:

1. Merge chef-api PR first
2. Wait for deployment to complete
3. Then merge neo-dock PR
4. SSH to server and update `.env` manually
5. Restart both services in correct order

The `.env` change is **not** automatic because it contains secrets and is git-ignored.
