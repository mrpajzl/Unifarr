# Unifarr Deployment Guide

## Prerequisites

- TrueNAS SCALE with Docker installed
- SSH access to TrueNAS
- Media paths configured on TrueNAS:
  - `/mnt/storage/media/movies` - Movies library
  - `/mnt/storage/media/tvshows` - TV Shows library
  - `/mnt/storage/media/downloads` - Downloads folder

## Quick Deploy

From your local machine:

```bash
cd /Users/ondrejzraly/clawd/unifarr
./deploy.sh
```

This will:
1. Package the application
2. Upload to TrueNAS
3. Build Docker containers
4. Start the services

## Manual Deployment

### 1. Build locally and transfer

```bash
# Package
tar czf unifarr-deploy.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  backend frontend docker-compose.yml

# Upload
scp unifarr-deploy.tar.gz truenas_admin@10.0.0.141:/tmp/
```

### 2. Deploy on TrueNAS

```bash
ssh truenas_admin@10.0.0.141

# Extract
sudo mkdir -p /mnt/storage/apps/unifarr
cd /mnt/storage/apps/unifarr
sudo tar xzf /tmp/unifarr-deploy.tar.gz

# Create data directories
sudo mkdir -p backend/data backend/downloads

# Build and start
sudo docker compose build
sudo docker compose up -d
```

## Access

- **Frontend:** http://10.0.0.141:3000
- **Backend API:** http://10.0.0.141:3002

## Management

### View logs
```bash
ssh truenas_admin@10.0.0.141
cd /mnt/storage/apps/unifarr
sudo docker compose logs -f
```

### Restart services
```bash
sudo docker compose restart
```

### Stop services
```bash
sudo docker compose down
```

### Update
Run `./deploy.sh` again to deploy updates

## Configuration

Settings are stored in:
- `/mnt/storage/apps/unifarr/backend/data/` - Database and persistent data
- Backend settings are in `settings.json` (auto-created from `settings.production.json`)

## Troubleshooting

### Check container status
```bash
sudo docker compose ps
```

### View backend logs
```bash
sudo docker compose logs backend
```

### View frontend logs
```bash
sudo docker compose logs frontend
```

### Rebuild after code changes
```bash
sudo docker compose down
sudo docker compose build --no-cache
sudo docker compose up -d
```
