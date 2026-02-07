# Unifarr for TrueNAS SCALE

Unified media management directly in your TrueNAS SCALE apps.

## Installation

### Via TrueNAS Apps UI

1. **Add the Catalog:**
   ```
   Apps → Manage Catalogs → Add Catalog
   
   Name: unifarr
   Repository: https://github.com/mrpajzl/Unifarr
   Preferred Trains: charts
   Branch: gh-pages
   ```

2. **Wait for sync** (~1-2 minutes)

3. **Install Unifarr:**
   - Go to **Available Applications**
   - Search for "Unifarr"
   - Click **Install**

4. **Configure:**
   - **Movies Path:** Path to your movies (e.g., `/mnt/tank/media/movies`)
   - **TV Shows Path:** Path to your TV shows (e.g., `/mnt/tank/media/tvshows`)
   - **Downloads Path:** Path to downloads folder (e.g., `/mnt/tank/downloads`)
   - **Ports:** Keep defaults (3000 for web, 3002 for API)

5. **Deploy** and wait for containers to start

## Access

After deployment, Unifarr is accessible at:
- **Web UI:** `http://[truenas-ip]:3000`
- **API:** `http://[truenas-ip]:3002`

Default credentials:
- **Username:** `admin`
- **Password:** `admin123`

⚠️ **Change these immediately after first login!**

## Configuration

### Media Paths
Point Unifarr to your existing media libraries:
- Movies: Where your movie files are stored
- TV Shows: Where your TV show files are stored  
- Downloads: Where torrents/downloads go

Unifarr will:
- Scan these folders for media
- Match files to TMDB metadata
- Track TV show episodes
- Auto-organize new files

### Search Providers

Configure in **Settings → Search Templates**:
- **Torrents:** 1337x, YTS (built-in)
- **Webshare:** Add API key for premium access
- **Custom Trackers:** Add your private trackers

### Episode Monitoring

In **Library → TV Shows**:
1. Add shows to monitor
2. Enable auto-download
3. Unifarr checks for new episodes hourly
4. Auto-downloads when available

## Updates

TrueNAS handles updates automatically:
1. Go to **Apps → Installed**
2. Click **Update** when available
3. Review changes
4. Confirm update

Or enable **Auto Update** in app settings.

## Troubleshooting

### App won't start

Check logs:
```bash
k3s kubectl logs -n ix-unifarr -l app.kubernetes.io/name=unifarr
```

### Can't access media paths

Ensure ACL permissions:
```bash
# TrueNAS UI: Storage → Pools → Edit ACL
# Grant read/write to apps user (default: 568)
```

### Port conflicts

Change ports in app configuration:
- Frontend Port: 3000 → 3001 (or any free port)
- Backend Port: 3002 → 3003 (or any free port)

Update `NUXT_PUBLIC_API_BASE` in frontend config.

## Features

- 🎬 **Movie Management** - Organize and track your movie collection
- 📺 **TV Show Monitoring** - Auto-download new episodes
- 🔍 **Smart Search** - Multi-source torrent search
- 🎯 **Auto Matching** - Diacritics-aware file matching
- 📝 **Custom Templates** - Per-show search templates
- 🔄 **Auto Organization** - Automatic file organization
- 🌐 **Beautiful UI** - Modern, responsive web interface

## Support

- **GitHub:** https://github.com/mrpajzl/Unifarr
- **Issues:** https://github.com/mrpajzl/Unifarr/issues
- **Documentation:** https://github.com/mrpajzl/Unifarr/wiki

## License

MIT - Free for personal and commercial use
