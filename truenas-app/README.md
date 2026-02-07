# Unifarr TrueNAS SCALE App

This directory contains the TrueNAS SCALE app configuration for Unifarr.

## Prerequisites

- TrueNAS SCALE 22.12 or newer
- Media library datasets already created
- TMDB API key (get from https://www.themoviedb.org/settings/api)

## Installation

### Method 1: Custom App (Recommended for Testing)

1. **Access TrueNAS SCALE**
   - Navigate to Apps → Discover Apps
   - Click "Custom App"

2. **Configure Application**
   - **Application Name:** unifarr
   - **Image Repository:** unifarr/unifarr
   - **Image Tag:** latest

3. **Container Configuration**
   - **Container Port:** 3000
   - **Node Port:** 30000 (or your preferred port)

4. **Environment Variables**
   Add the following:
   ```
   TMDB_API_KEY=your_api_key_here
   QBITTORRENT_HOST=localhost
   QBITTORRENT_PORT=8080
   QBITTORRENT_USERNAME=admin
   QBITTORRENT_PASSWORD=yourpassword
   MOVIES_PATH=/data/movies
   TVSHOWS_PATH=/data/tvshows
   AUTO_IMPORT=true
   ```

5. **Storage (Host Path Volumes)**
   - **Config:** `/mnt/tank/appdata/unifarr` → `/app/data`
   - **Movies:** `/mnt/tank/media/movies` → `/data/movies`
   - **TV Shows:** `/mnt/tank/media/tvshows` → `/data/tvshows`
   - **Downloads:** `/mnt/tank/downloads` → `/downloads`

6. **Deploy**

### Method 2: Docker Compose (via Shell)

1. **SSH into TrueNAS**
   ```bash
   ssh root@your-truenas-ip
   ```

2. **Create app directory**
   ```bash
   mkdir -p /mnt/tank/apps/unifarr
   cd /mnt/tank/apps/unifarr
   ```

3. **Copy docker-compose.yml** from the main Unifarr directory

4. **Create .env file**
   ```bash
   nano .env
   ```
   Add your configuration (see `.env.docker` template)

5. **Deploy**
   ```bash
   docker-compose up -d
   ```

### Method 3: TrueCharts (Future)

Once Unifarr is published to TrueCharts:
1. Navigate to Apps → Discover Apps
2. Search for "Unifarr"
3. Click Install
4. Follow the configuration wizard

## Post-Installation

### 1. Access Unifarr
- Open your browser: `http://truenas-ip:3000`

### 2. Configure qBittorrent
- Access qBittorrent WebUI: `http://truenas-ip:8080`
- Default credentials: admin / adminadmin
- **IMPORTANT:** Change the default password!

### 3. Configure Download Paths in qBittorrent
- Go to Settings → Downloads
- Set "Default Save Path" to `/downloads`
- Enable "Keep incomplete torrents in:" → `/downloads/incomplete`

### 4. Test Connection
In Unifarr:
1. Navigate to Settings
2. Click "Test qBittorrent Connection"
3. Should show "Connected" with torrent count

### 5. Initial Library Scan
1. Navigate to Library
2. Click "Scan Library"
3. Wait for files to be discovered

## Configuration

### Library Paths
Your media should be organized as:
```
/data/movies/
  Movie Title (Year)/
    Movie Title (Year).mkv

/data/tvshows/
  Show Title/
    Season 01/
      Show.S01E01.mkv
      Show.S01E02.mkv
```

### Permissions
If you encounter permission issues:
1. Check PUID/PGID match your user
2. Ensure directories have correct ownership:
   ```bash
   chown -R 1000:1000 /mnt/tank/media
   ```

## Upgrading

### Docker Compose
```bash
cd /mnt/tank/apps/unifarr
docker-compose pull
docker-compose up -d
```

### TrueNAS Apps UI
1. Navigate to Installed Apps
2. Click on Unifarr
3. Click "Update"

## Troubleshooting

### Can't connect to qBittorrent
- Check qBittorrent is running: `docker ps | grep qbittorrent`
- Verify credentials in Unifarr settings
- Check network: Both containers should be on same network

### Files not importing
- Check volume mounts are correct
- Verify qBittorrent "Save Path" is set to `/downloads`
- Check auto-import logs in Unifarr

### Permission denied errors
- Verify PUID/PGID match your user
- Check directory ownership and permissions

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/unifarr/issues
- Documentation: https://github.com/yourusername/unifarr/wiki
