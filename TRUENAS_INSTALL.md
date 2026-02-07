# Unifarr - TrueNAS SCALE Installation

## Quick Install (Web UI)

### 1. Add Catalog

1. Open TrueNAS web interface: http://10.0.0.141
2. Go to **Apps** → **Manage Catalogs**
3. Click **Add Catalog**
4. Fill in:
   - **Name:** `unifarr`
   - **Repository:** `https://github.com/mrpajzl/Unifarr`
   - **Preferred Trains:** `charts`
   - **Branch:** `gh-pages`
5. Click **Save**
6. Wait for catalog to sync (~1-2 minutes)

### 2. Install Unifarr

1. Go to **Apps** → **Available Applications**
2. Search for "Unifarr"
3. Click **Install**
4. Configure:
   - **Movies Path:** `/mnt/storage/media/movies`
   - **TV Shows Path:** `/mnt/storage/media/tvshows`
   - **Downloads Path:** `/mnt/storage/media/downloads`
   - **Backend Port:** `3002` (default)
   - **Frontend Port:** `3000` (default)
5. Click **Install**

### 3. Access

After installation completes:
- **Web Interface:** http://10.0.0.141:3000
- **API:** http://10.0.0.141:3002

Default login:
- **Username:** `admin`
- **Password:** `admin123`
- ⚠️ **Change password immediately after first login!**

## Troubleshooting

### Catalog not syncing
```bash
# SSH into TrueNAS
ssh truenas_admin@10.0.0.141

# Check catalog status
midclt call catalog.query
```

### App not starting
```bash
# Check pod status
k3s kubectl get pods -n ix-unifarr

# Check logs
k3s kubectl logs -n ix-unifarr -l app.kubernetes.io/name=unifarr --tail=50
```

### Update App
1. Go to **Apps** → **Installed Applications**
2. Click **Update** on Unifarr card
3. Review changes and confirm

## Manual Install (Alternative)

If catalog doesn't work, use Docker Compose:

```bash
ssh truenas_admin@10.0.0.141
cd /mnt/storage/apps/unifarr
curl -fsSL https://raw.githubusercontent.com/mrpajzl/Unifarr/main/docker-compose.prod.yml -o docker-compose.yml
sudo docker compose pull
sudo docker compose up -d
```
