# Unifarr Deployment Guide

Complete guide for deploying Unifarr in production environments.

## Table of Contents
1. [Docker Compose Deployment](#docker-compose-deployment)
2. [TrueNAS SCALE Deployment](#truenas-scale-deployment)
3. [Manual Deployment](#manual-deployment)
4. [Configuration](#configuration)
5. [Upgrades](#upgrades)

---

## Docker Compose Deployment

### Prerequisites
- Docker 20.10+ and Docker Compose 2.0+
- TMDB API key from https://www.themoviedb.org/settings/api
- Media library directories already created

### Quick Start

1. **Clone or download Unifarr**
   ```bash
   git clone https://github.com/yourusername/unifarr.git
   cd unifarr
   ```

2. **Configure environment**
   ```bash
   cp .env.docker .env
   nano .env
   ```
   
   Update these values:
   ```env
   TMDB_API_KEY=your_actual_api_key_here
   QBITTORRENT_PASSWORD=your_secure_password
   MOVIES_PATH=/path/to/your/movies
   TVSHOWS_PATH=/path/to/your/tvshows
   TZ=Your/Timezone
   ```

3. **Start services**
   ```bash
   docker-compose up -d
   ```

4. **Check status**
   ```bash
   docker-compose ps
   docker-compose logs -f unifarr
   ```

5. **Access interfaces**
   - Unifarr: http://your-server:3000
   - qBittorrent: http://your-server:8080

### First-Time Setup

#### 1. Configure qBittorrent
1. Access qBittorrent WebUI at http://your-server:8080
2. Default credentials: `admin` / `adminadmin`
3. **IMPORTANT:** Change password immediately!
   - Tools → Options → Web UI → Authentication
4. Configure download paths:
   - Tools → Options → Downloads
   - Default Save Path: `/downloads`
   - Keep incomplete torrents in: `/downloads/incomplete`
5. Enable "Run external program on torrent completion" (optional):
   - Command: `curl http://unifarr:3000/api/downloads/sync`

#### 2. Test Unifarr Connection
1. Open Unifarr web interface
2. Navigate to Settings
3. Click "Test qBittorrent Connection"
4. Should show "Connected ✅"

#### 3. Initial Library Scan
1. Go to Library section
2. Click "Scan Library"
3. Wait for scan to complete
4. Review unmatched files

---

## TrueNAS SCALE Deployment

See [truenas-app/README.md](./truenas-app/README.md) for complete TrueNAS SCALE installation guide.

### Quick Steps

1. **Via Custom App**
   - Apps → Discover Apps → Custom App
   - Configure image, volumes, and environment variables
   - See truenas-app/README.md for details

2. **Via Docker Compose in Shell**
   ```bash
   ssh root@truenas-ip
   mkdir -p /mnt/tank/apps/unifarr
   cd /mnt/tank/apps/unifarr
   # Copy docker-compose.yml and .env
   docker-compose up -d
   ```

### TrueNAS Specific Notes

- Use `/mnt/tank/media/` prefix for media paths
- Set PUID/PGID to match your user (typically 1000)
- Ensure directories have correct permissions:
  ```bash
  chown -R 1000:1000 /mnt/tank/media
  ```

---

## Manual Deployment

For advanced users who want to run without Docker.

### Backend

1. **Prerequisites**
   - Node.js 20+
   - SQLite3
   - TMDB API key

2. **Install**
   ```bash
   cd backend
   npm install
   ```

3. **Configure**
   ```bash
   cp .env.example .env
   nano .env
   ```

4. **Initialize database**
   ```bash
   npm run db:migrate
   ```

5. **Run**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

### Frontend

1. **Install**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure**
   - Update API endpoint in environment config

3. **Build**
   ```bash
   npm run build
   ```

4. **Serve**
   - Use nginx, Apache, or any static file server
   - Point to `dist/` directory

### qBittorrent

Install qBittorrent separately and enable Web UI:
- Ubuntu/Debian: `apt install qbittorrent-nox`
- See: https://github.com/qbittorrent/qBittorrent/wiki

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Unifarr API port |
| `TMDB_API_KEY` | **Yes** | - | TMDB API key |
| `QBITTORRENT_HOST` | No | localhost | qBittorrent hostname |
| `QBITTORRENT_PORT` | No | 8080 | qBittorrent port |
| `QBITTORRENT_USERNAME` | No | admin | qBittorrent username |
| `QBITTORRENT_PASSWORD` | No | adminadmin | qBittorrent password |
| `MOVIES_PATH` | No | /data/movies | Movies library path |
| `TVSHOWS_PATH` | No | /data/tvshows | TV shows library path |
| `AUTO_IMPORT` | No | true | Enable auto-import |
| `DATABASE_PATH` | No | ./unifarr.db | Database file path |

### Media Library Structure

Organize your library like this:

```
/data/
├── movies/
│   ├── Avatar (2009)/
│   │   └── Avatar (2009) 1080p BluRay.mkv
│   ├── Inception (2010)/
│   │   └── Inception (2010) 2160p WEB-DL.mkv
│   └── ...
└── tvshows/
    ├── Breaking Bad/
    │   ├── Season 01/
    │   │   ├── Breaking.Bad.S01E01.1080p.mkv
    │   │   ├── Breaking.Bad.S01E02.1080p.mkv
    │   │   └── ...
    │   ├── Season 02/
    │   └── ...
    └── ...
```

### Reverse Proxy (Optional)

#### Nginx

```nginx
server {
    listen 80;
    server_name unifarr.example.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Traefik

```yaml
services:
  unifarr:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.unifarr.rule=Host(`unifarr.example.com`)"
      - "traefik.http.routers.unifarr.tls=true"
      - "traefik.http.routers.unifarr.tls.certresolver=letsencrypt"
```

---

## Upgrades

### Docker Compose

```bash
cd unifarr
docker-compose pull
docker-compose up -d
```

### TrueNAS SCALE

1. Navigate to Installed Apps
2. Click on Unifarr
3. Click "Update"
4. Confirm update

### Manual

```bash
# Backend
cd backend
git pull
npm install
npm run db:migrate
npm run build
pm2 restart unifarr

# Frontend
cd frontend
git pull
npm install
npm run build
# Restart web server
```

---

## Backup & Restore

### What to Backup

1. **Database**: `backend/unifarr.db`
2. **Configuration**: `.env` file
3. **qBittorrent config**: `qbittorrent_config/` volume

### Docker Backup

```bash
# Stop containers
docker-compose stop

# Backup
docker run --rm -v unifarr_unifarr_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/unifarr-backup-$(date +%Y%m%d).tar.gz /data

# Restart
docker-compose start
```

### Restore

```bash
# Stop containers
docker-compose stop

# Restore
docker run --rm -v unifarr_unifarr_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/unifarr-backup-YYYYMMDD.tar.gz -C /

# Restart
docker-compose start
```

---

## Monitoring

### Health Checks

```bash
# API health
curl http://localhost:3000/

# qBittorrent connection
curl http://localhost:3000/api/downloads/test
```

### Logs

```bash
# Docker
docker-compose logs -f unifarr
docker-compose logs -f qbittorrent

# Manual
tail -f backend/logs/unifarr.log
```

---

## Security Considerations

1. **Change default passwords** - qBittorrent especially
2. **Use HTTPS** - Configure reverse proxy with SSL
3. **Firewall** - Only expose necessary ports
4. **Updates** - Keep Docker images and dependencies updated
5. **Backups** - Regular automated backups
6. **API Key** - Keep TMDB API key secure

---

## Support

- GitHub Issues: https://github.com/yourusername/unifarr/issues
- Documentation: https://github.com/yourusername/unifarr/wiki
- Discord: [Coming soon]

---

**Need help?** Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues.
