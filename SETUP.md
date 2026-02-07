# Unifarr Initial Setup Guide

Step-by-step guide to get Unifarr up and running from scratch.

## Prerequisites

Before you begin, ensure you have:

- [ ] Docker and Docker Compose installed (for Docker deployment)
- [ ] Media library with movies and/or TV shows
- [ ] TMDB API key (free - get from https://www.themoviedb.org/settings/api)
- [ ] At least 2GB free disk space
- [ ] Network access for TMDB and torrent providers

## Step 1: Get TMDB API Key

1. Go to https://www.themoviedb.org/
2. Create a free account (if you don't have one)
3. Navigate to Settings → API
4. Request an API key (choose "Developer" option)
5. Fill out the form (use "Personal/Education" if unsure)
6. Copy your API key - you'll need it later

## Step 2: Choose Deployment Method

Select one:

- **Docker Compose** (Recommended) - Easiest, works on any system
- **TrueNAS SCALE** - If you're running TrueNAS
- **Manual** - If you want full control or can't use Docker

## Step 3: Docker Compose Setup

### 3.1 Prepare Directories

```bash
# Create app directory
mkdir -p ~/unifarr
cd ~/unifarr

# Create directories for media (if they don't exist)
mkdir -p /path/to/movies
mkdir -p /path/to/tvshows
mkdir -p /path/to/downloads
```

### 3.2 Download Files

Option A - Git clone:
```bash
git clone https://github.com/yourusername/unifarr.git
cd unifarr
```

Option B - Download directly:
1. Download `docker-compose.yml` from the repo
2. Download `.env.docker` and rename to `.env`

### 3.3 Configure Environment

Edit `.env`:
```bash
nano .env
```

Update these values:
```env
# ✅ Required - Add your TMDB API key
TMDB_API_KEY=your_tmdb_api_key_here

# ✅ Required - Set your paths (use absolute paths!)
MOVIES_PATH=/absolute/path/to/movies
TVSHOWS_PATH=/absolute/path/to/tvshows

# ⚙️  Optional but recommended
QBITTORRENT_USERNAME=admin
QBITTORRENT_PASSWORD=ChangeThis123!  # Pick a strong password!

# ⚙️  Optional
TZ=Europe/Prague  # Your timezone
PUID=1000         # Your user ID (run `id -u` to check)
PGID=1000         # Your group ID (run `id -g` to check)
```

**Important Path Notes:**
- Use **absolute paths**, not `~/` shortcuts
- Paths must exist before starting
- Docker user must have read/write access

### 3.4 Start Services

```bash
docker-compose up -d
```

Watch the logs:
```bash
docker-compose logs -f
```

Look for:
- ✅ `Unifarr API starting on port 3000`
- ✅ `Database initialized`
- ⚠️  `qBittorrent login error` is OK for now (we'll fix it next)

### 3.5 Access Unifarr

Open your browser:
- Unifarr: http://localhost:3000
- qBittorrent: http://localhost:8080

## Step 4: Configure qBittorrent

### 4.1 First Login

1. Go to http://localhost:8080
2. Login with:
   - Username: `admin`
   - Password: `adminadmin` (or what you set in `.env`)

### 4.2 Change Password

**⚠️  IMPORTANT - Do this immediately!**

1. Tools → Options → Web UI
2. Under "Authentication"
3. Set new username and password
4. Click "Save"
5. Login again with new credentials

### 4.3 Configure Downloads

1. Tools → Options → Downloads
2. Set paths:
   - **Default Save Path:** `/downloads`
   - **Keep incomplete torrents in:** `/downloads/incomplete` (check the box)
3. Set preferences:
   - **Pre-allocate disk space:** ✅ Enabled (recommended)
   - **Append .!qB extension:** ✅ Enabled
4. Click "Save"

### 4.4 Configure Connection (Optional)

1. Tools → Options → Connection
2. Listening Port: `6881` (or any port)
3. Use UPnP: ✅ Enabled (if your router supports it)
4. Click "Save"

### 4.5 Update Unifarr Config

If you changed qBittorrent username/password, update `.env`:

```bash
nano .env
```

Update:
```env
QBITTORRENT_USERNAME=yournewusername
QBITTORRENT_PASSWORD=yournewpassword
```

Restart Unifarr:
```bash
docker-compose restart unifarr
```

## Step 5: Test Connection

### 5.1 API Health Check

```bash
curl http://localhost:3000/
```

Should return:
```json
{
  "name": "Unifarr API",
  "version": "1.0.0",
  "status": "online"
}
```

### 5.2 qBittorrent Connection

```bash
curl -X POST http://localhost:3000/api/downloads/test
```

Should return:
```json
{
  "connected": true,
  "message": "qBittorrent connection successful",
  "torrentCount": 0
}
```

❌ If it fails, check:
- qBittorrent WebUI is accessible
- Username/password in `.env` match qBittorrent
- Both containers are on the same network

## Step 6: Scan Your Library

### 6.1 Via Web Interface (Coming Soon)

1. Open Unifarr web interface
2. Navigate to Library
3. Click "Scan Library"
4. Wait for completion

### 6.2 Via API

```bash
curl -X POST http://localhost:3000/api/files/scan \
  -H "Content-Type: application/json" \
  -d '{"path": "/data/movies"}'
```

Response:
```json
{
  "scanned": 150,
  "added": 145,
  "updated": 5,
  "errors": []
}
```

### 6.3 Check Results

List unmatched files:
```bash
curl http://localhost:3000/api/files/unmatched
```

## Step 7: Match Media

### 7.1 Automatic Matching (Future Feature)

Unifarr will automatically match files to TMDB metadata.

### 7.2 Manual Matching

For files that didn't auto-match:

1. Search TMDB:
```bash
curl "http://localhost:3000/api/search/tmdb/movies?q=Avatar&year=2009"
```

2. Create media item:
```bash
curl -X POST http://localhost:3000/api/media \
  -H "Content-Type: application/json" \
  -d '{
    "tmdbId": 19995,
    "type": "movie"
  }'
```

3. Link file to media:
```bash
curl -X POST http://localhost:3000/api/media/1/match \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": 1,
    "confidence": 0.95
  }'
```

## Step 8: Download Your First Torrent

### 8.1 Search for Torrents

```bash
curl "http://localhost:3000/api/providers/search?q=Avatar&type=movie&year=2009"
```

### 8.2 Add Download

Copy a `magnetUrl` from search results, then:

```bash
curl -X POST http://localhost:3000/api/downloads \
  -H "Content-Type: application/json" \
  -d '{
    "magnetUrl": "magnet:?xt=urn:btih:...",
    "mediaId": 1
  }'
```

### 8.3 Monitor Progress

```bash
curl http://localhost:3000/api/downloads
```

Or check qBittorrent WebUI at http://localhost:8080

## Step 9: Auto-Import Setup

Unifarr automatically imports completed downloads every 5 minutes.

When a torrent completes:
1. Files are copied to the correct library folder
2. Library is rescanned
3. Files are matched to media items
4. Frontend is updated

Monitor logs:
```bash
docker-compose logs -f unifarr | grep import
```

## Step 10: Organize Your Library

### Recommended Structure

```
/data/
├── movies/
│   ├── Avatar (2009)/
│   │   ├── Avatar (2009) 1080p.mkv
│   │   └── Avatar (2009).srt
│   ├── Inception (2010)/
│   │   └── Inception (2010) 4K.mkv
│   └── ...
└── tvshows/
    ├── Breaking Bad/
    │   ├── Season 01/
    │   │   ├── Breaking.Bad.S01E01.mkv
    │   │   ├── Breaking.Bad.S01E02.mkv
    │   │   └── ...
    │   ├── Season 02/
    │   └── ...
    └── ...
```

### Naming Conventions

**Movies:**
- Folder: `Title (Year)/`
- File: `Title (Year) [quality].ext`
- Examples:
  - `Avatar (2009)/Avatar (2009) 1080p BluRay.mkv`
  - `The Matrix (1999)/The.Matrix.1999.2160p.WEB-DL.mkv`

**TV Shows:**
- Folder: `Show Name/Season XX/`
- File: `Show.Name.S##E##.title.mkv`
- Examples:
  - `Breaking Bad/Season 01/Breaking.Bad.S01E01.mkv`
  - `Game of Thrones/Season 01/Game.of.Thrones.S01E01.1080p.mkv`

### Bulk Rename Tools

- [FileBot](https://www.filebot.net/) - Powerful renaming (paid after trial)
- [Bulk Rename Utility](https://www.bulkrenameutility.co.uk/) - Free, Windows
- [rename](http://plasmasturm.org/code/rename/) - Command-line, Linux/Mac

## Troubleshooting

### Can't connect to Unifarr

```bash
# Check if container is running
docker-compose ps

# Check logs
docker-compose logs unifarr

# Restart
docker-compose restart unifarr
```

### Can't connect to qBittorrent

```bash
# Check qBittorrent logs
docker-compose logs qbittorrent

# Test WebUI manually
curl http://localhost:8080

# Restart qBittorrent
docker-compose restart qbittorrent
```

### Permission Errors

```bash
# Fix ownership (replace 1000 with your PUID/PGID)
sudo chown -R 1000:1000 /path/to/movies
sudo chown -R 1000:1000 /path/to/tvshows
sudo chown -R 1000:1000 /path/to/downloads
```

### Database Errors

```bash
# Backup current database
cp backend/unifarr.db backend/unifarr.db.backup

# Reinitialize (⚠️  loses data!)
rm backend/unifarr.db
docker-compose restart unifarr
```

## Next Steps

1. ✅ **Setup complete!** You're ready to use Unifarr
2. 📚 Read [DEPLOYMENT.md](./DEPLOYMENT.md) for advanced configuration
3. 🐛 Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) if you encounter issues
4. 🚀 Contribute at https://github.com/yourusername/unifarr

## Getting Help

- **Documentation:** https://github.com/yourusername/unifarr/wiki
- **Issues:** https://github.com/yourusername/unifarr/issues
- **Discord:** [Coming soon]

---

**Enjoy Unifarr!** 🎬🍿
