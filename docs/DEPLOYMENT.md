# Unifarr Deployment Guide

This guide covers all deployment scenarios for Unifarr.

## Table of Contents

- [Docker Compose (Recommended)](#docker-compose-recommended)
- [TrueNAS SCALE](#truenas-scale)
- [Manual Installation](#manual-installation)
- [Reverse Proxy Setup](#reverse-proxy-setup)

## Docker Compose (Recommended)

### Prerequisites

- Docker and Docker Compose installed
- TMDB API key ([get one here](https://www.themoviedb.org/settings/api))
- Media library folders ready

### Step 1: Clone or Download

```bash
git clone https://github.com/yourusername/unifarr.git
cd unifarr
```

### Step 2: Configure Environment

```bash
cp .env.example .env
nano .env
```

Edit the following variables:

```bash
TMDB_API_KEY=your_actual_api_key_here
MEDIA_PATH_MOVIES=/mnt/media/movies
MEDIA_PATH_TV=/mnt/media/tv
DOWNLOADS_PATH=/mnt/downloads
PUID=1000  # Your user ID (run: id -u)
PGID=1000  # Your group ID (run: id -g)
TZ=America/New_York  # Your timezone
```

### Step 3: Start Services

```bash
docker-compose up -d
```

### Step 4: Access Unifarr

- **Unifarr UI**: http://localhost:3000
- **Unifarr API**: http://localhost:3001
- **qBittorrent UI**: http://localhost:8080

Default qBittorrent credentials:
- Username: `admin`
- Password: `adminadmin`

**⚠️ Change the qBittorrent password immediately!**

### Step 5: Configure Unifarr

1. Open http://localhost:3000
2. Go to **Settings**
3. Verify qBittorrent connection (should auto-connect to the container)
4. Verify TMDB API key
5. Set media library paths

### Step 6: Initial Library Scan

1. Go to **Library**
2. Click **Scan Library**
3. Enter your movies path (e.g., `/media/movies`)
4. Repeat for TV shows path

### Step 7: Match Files

1. Go to **Unmatched Files**
2. Click **Auto-match All** to automatically match files
3. Or manually search and match files one by one

## TrueNAS SCALE

### Prerequisites

- TrueNAS SCALE 22.12 or later
- TMDB API key
- Datasets created for media and downloads

### Step 1: Prepare Datasets

Create the following datasets in your pool:

```
pool/media/movies
pool/media/tv
pool/downloads
pool/unifarr (for app data)
```

Set appropriate permissions (e.g., user: apps, group: apps, permissions: 755).

### Step 2: Add Custom App Repository (if needed)

If Unifarr is not in the official catalog:

1. Go to **Apps** → **Manage Catalogs**
2. Click **Add Catalog**
3. Name: `unifarr`
4. Repository: `https://github.com/yourusername/unifarr-truenas-catalog`
5. Branch: `main`
6. Click **Save**

### Step 3: Install Unifarr

1. Go to **Apps** → **Available Applications**
2. Search for "Unifarr"
3. Click **Install**
4. Configure the wizard:
   - **TMDB API Key**: Enter your key
   - **qBittorrent Username**: `admin` (or custom)
   - **qBittorrent Password**: Set a strong password
   - **Movies Storage**: Select `pool/media/movies`
   - **TV Shows Storage**: Select `pool/media/tv`
   - **Downloads Storage**: Select `pool/downloads`
   - **Web Port**: `30000` (or any free port)
   - **API Port**: `30001`
   - **qBittorrent Port**: `30080`
5. Click **Install**

### Step 4: Access Unifarr

Access at:
- Unifarr: `http://truenas-ip:30000`
- qBittorrent: `http://truenas-ip:30080`

## Manual Installation

### Prerequisites

- Node.js 20+ installed
- SQLite3
- qBittorrent running separately

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/unifarr.git
cd unifarr
```

### Step 2: Install Backend

```bash
cd backend
npm install
npm run build
```

### Step 3: Install Frontend

```bash
cd ../frontend
npm install
npm run build
```

### Step 4: Configure Environment

```bash
export TMDB_API_KEY="your_key_here"
export QBITTORRENT_HOST="localhost"
export QBITTORRENT_PORT="8080"
export QBITTORRENT_USERNAME="admin"
export QBITTORRENT_PASSWORD="adminadmin"
export DB_PATH="/var/lib/unifarr"
export PORT=3001
```

### Step 5: Start Services

```bash
# Start backend
cd backend
npm start &

# Start frontend (static server)
cd ../frontend
npm run preview &
```

### Step 6: Create systemd Service (Optional)

Create `/etc/systemd/system/unifarr.service`:

```ini
[Unit]
Description=Unifarr Media Manager
After=network.target

[Service]
Type=simple
User=unifarr
WorkingDirectory=/opt/unifarr
Environment="TMDB_API_KEY=your_key"
Environment="DB_PATH=/var/lib/unifarr"
ExecStart=/usr/bin/node /opt/unifarr/backend/dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable unifarr
sudo systemctl start unifarr
```

## Reverse Proxy Setup

### Nginx

```nginx
server {
    listen 80;
    server_name unifarr.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

### Traefik

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.unifarr.rule=Host(`unifarr.yourdomain.com`)"
  - "traefik.http.routers.unifarr.entrypoints=websecure"
  - "traefik.http.routers.unifarr.tls.certresolver=letsencrypt"
  - "traefik.http.services.unifarr.loadbalancer.server.port=3000"
```

### Caddy

```
unifarr.yourdomain.com {
    reverse_proxy localhost:3000
    reverse_proxy /api/* localhost:3001
}
```

## Backup and Restore

### Backup

The SQLite database and configuration are stored in `/data` volume:

```bash
docker-compose exec unifarr tar czf /data/backup-$(date +%Y%m%d).tar.gz /data/unifarr.db
docker cp unifarr:/data/backup-*.tar.gz ./backups/
```

### Restore

```bash
docker cp ./backups/backup-20240206.tar.gz unifarr:/data/
docker-compose exec unifarr tar xzf /data/backup-20240206.tar.gz -C /data/
docker-compose restart unifarr
```

## Troubleshooting

### qBittorrent Connection Failed

1. Check qBittorrent is running: `docker ps | grep qbittorrent`
2. Verify credentials in Settings
3. Check network: `docker network ls` (should see `unifarr-network`)
4. Test connection: `curl http://qbittorrent:8080/api/v2/app/version`

### TMDB API Errors

1. Verify API key is valid at https://www.themoviedb.org/settings/api
2. Check rate limits (TMDB has limits on free tier)
3. Look at backend logs: `docker-compose logs unifarr`

### Files Not Scanning

1. Check folder permissions (container runs as PUID/PGID)
2. Verify paths are mounted correctly: `docker exec unifarr ls -la /media/movies`
3. Check file extensions are supported (see `fileParser.ts`)
4. Review backend logs: `docker-compose logs -f unifarr`

### Database Locked

1. Stop all containers: `docker-compose down`
2. Check for stale locks: `rm /data/unifarr.db-*`
3. Restart: `docker-compose up -d`

## Performance Tuning

### Large Libraries (>1000 items)

1. Increase SQLite cache size (backend/src/db/database.ts):
   ```javascript
   db.pragma('cache_size = 10000')
   ```

2. Enable WAL mode (already enabled by default):
   ```javascript
   db.pragma('journal_mode = WAL')
   ```

### Slow Scanning

1. Limit concurrent TMDB requests
2. Use auto-match during off-peak hours
3. Batch scan by folders instead of entire library at once

## Updates

### Docker Compose

```bash
docker-compose pull
docker-compose up -d
```

### TrueNAS SCALE

Apps will show update notifications automatically. Click **Update** in the UI.

### Manual

```bash
git pull
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build
pm2 restart unifarr  # or systemctl restart unifarr
```

## Security Recommendations

1. **Change default passwords** (especially qBittorrent)
2. **Use HTTPS** with reverse proxy and Let's Encrypt
3. **Restrict access** with firewall rules or authentication
4. **Keep updated** - watch for security patches
5. **Limit API access** - don't expose ports directly to internet

## Support

- GitHub Issues: https://github.com/yourusername/unifarr/issues
- Documentation: https://github.com/yourusername/unifarr/docs
- Discord: https://discord.gg/your-server
