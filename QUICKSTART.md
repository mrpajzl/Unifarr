# 🚀 Unifarr Quick Start Guide

Get Unifarr running in 5 minutes!

## Step 1: Get TMDB API Key

1. Go to https://www.themoviedb.org/
2. Create account (or login)
3. Go to https://www.themoviedb.org/settings/api
4. Request API key (free)
5. Copy your API key

## Step 2: Configure Unifarr

```bash
cd unifarr
cp .env.example .env
```

Edit `.env` and add your TMDB API key:

```env
TMDB_API_KEY=your_actual_api_key_here

# Update these paths to match your system:
MEDIA_PATH_MOVIES=/path/to/your/movies
MEDIA_PATH_TV=/path/to/your/tvshows
DOWNLOAD_PATH=/path/to/downloads
```

## Step 3: Start Unifarr

```bash
docker-compose up -d
```

Wait 30-60 seconds for containers to start.

## Step 4: Access Unifarr

Open in browser:
- **Unifarr UI**: http://localhost:3000
- **qBittorrent**: http://localhost:8080 (login: admin/adminadmin)

## Step 5: First Scan

1. In Unifarr, go to **Scan** page
2. Enter your movies folder path: `/media/movies`
3. Click **Start Scan**
4. Wait for scan to complete
5. Click **Match Files to Media**
6. Search and match your files to TMDB

## Step 6: Download Content

1. Go to **Search** page
2. Search for a movie or TV show
3. Click **Download** on a torrent
4. Go to **Downloads** to monitor progress

## TrueNAS Specific Setup

If deploying on TrueNAS:

1. Create datasets:
   ```
   /mnt/pool/unifarr-data
   /mnt/pool/downloads
   ```

2. Your media is probably at:
   ```
   /mnt/pool/media/movies
   /mnt/pool/media/tvshows
   ```

3. Update `docker-compose.yml` volumes section:
   ```yaml
   volumes:
     - /mnt/pool/unifarr-data:/data
     - /mnt/pool/media/movies:/media/movies:ro
     - /mnt/pool/media/tvshows:/media/tvshows:ro
     - /mnt/pool/downloads:/downloads
   ```

4. Run: `docker-compose up -d`

## Troubleshooting

### "Connection refused" errors
- Wait longer - containers take time to start
- Check logs: `docker-compose logs backend`

### Can't scan media folders
- Verify paths in `.env` exist
- Check permissions: `ls -la /path/to/media`
- Try absolute paths

### TMDB search not working
- Verify API key is correct in `.env`
- Restart: `docker-compose restart`

### qBittorrent won't add torrents
- Access qBittorrent UI: http://localhost:8080
- Login: admin/adminadmin
- Change password in settings
- Update `.env` with new password
- Restart: `docker-compose restart backend`

## Next Steps

- Set up automatic scanning (cron job)
- Configure quality profiles
- Explore torrent providers in Settings
- Customize Docker Compose for your setup

## Need Help?

Check the full [README.md](./README.md) for detailed documentation.
