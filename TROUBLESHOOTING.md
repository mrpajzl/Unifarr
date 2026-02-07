# Unifarr Troubleshooting Guide

Common issues and their solutions.

## Table of Contents
- [Installation Issues](#installation-issues)
- [Connection Issues](#connection-issues)
- [qBittorrent Issues](#qbittorrent-issues)
- [Library Scanning Issues](#library-scanning-issues)
- [Download Issues](#download-issues)
- [Performance Issues](#performance-issues)
- [Database Issues](#database-issues)

---

## Installation Issues

### Docker: "Cannot find image"

**Symptom:**
```
Error response from daemon: pull access denied for unifarr/unifarr
```

**Solution:**
The image hasn't been built yet. Build it locally:
```bash
docker-compose build
docker-compose up -d
```

### Docker: "Port already in use"

**Symptom:**
```
Error: bind: address already in use
```

**Solution:**
1. Check what's using the port:
   ```bash
   # For port 3000
   lsof -i :3000
   # For port 8080
   lsof -i :8080
   ```

2. Option A - Stop the conflicting service
3. Option B - Change ports in `docker-compose.yml`:
   ```yaml
   ports:
     - "3001:3000"  # Use 3001 instead of 3000
   ```

### Docker: "Permission denied"

**Symptom:**
```
mkdir: cannot create directory '/data': Permission denied
```

**Solution:**
Fix ownership of volume directories:
```bash
# Find your PUID and PGID
id -u  # Your PUID
id -g  # Your PGID

# Fix ownership
sudo chown -R 1000:1000 /path/to/movies
sudo chown -R 1000:1000 /path/to/tvshows
sudo chown -R 1000:1000 /path/to/downloads

# Update .env with correct PUID/PGID
nano .env
```

---

## Connection Issues

### "Cannot connect to Unifarr API"

**Symptom:**
Frontend shows "Cannot connect to API" or similar error.

**Diagnosis:**
```bash
# Check if container is running
docker-compose ps

# Check logs
docker-compose logs unifarr

# Test API directly
curl http://localhost:3000/
```

**Solutions:**

1. **Container not running:**
   ```bash
   docker-compose start unifarr
   ```

2. **Port mismatch:**
   - Check which port is exposed: `docker-compose ps`
   - Update frontend API URL to match

3. **Network issue:**
   ```bash
   docker network ls
   docker network inspect unifarr_unifarr_network
   ```

### "502 Bad Gateway" with Reverse Proxy

**Symptom:**
nginx/Traefik shows 502 error.

**Solution:**

1. Check Unifarr is running:
   ```bash
   docker-compose ps unifarr
   curl http://localhost:3000/
   ```

2. Check proxy config:
   ```nginx
   # nginx - make sure proxy_pass points to correct host/port
   proxy_pass http://localhost:3000;
   # OR for Docker internal:
   proxy_pass http://unifarr:3000;
   ```

3. Check proxy can reach Unifarr:
   ```bash
   docker exec -it nginx ping unifarr
   ```

---

## qBittorrent Issues

### "Failed to connect to qBittorrent"

**Symptom:**
```json
{
  "connected": false,
  "error": "Failed to login to qBittorrent"
}
```

**Diagnosis:**
```bash
# Test qBittorrent WebUI
curl http://localhost:8080

# Check qBittorrent logs
docker-compose logs qbittorrent

# Check qBittorrent is running
docker-compose ps qbittorrent
```

**Solutions:**

1. **qBittorrent not running:**
   ```bash
   docker-compose start qbittorrent
   ```

2. **Wrong credentials:**
   - Check WebUI credentials match `.env`:
     ```env
     QBITTORRENT_USERNAME=admin
     QBITTORRENT_PASSWORD=your_password
     ```
   - Restart Unifarr after changing:
     ```bash
     docker-compose restart unifarr
     ```

3. **Network issue:**
   - Both containers must be on same network
   - Check `docker-compose.yml` has both services in `unifarr_network`

4. **WebUI disabled:**
   - Access container:
     ```bash
     docker exec -it qbittorrent /bin/bash
     cat /config/qBittorrent/qBittorrent.conf
     ```
   - Ensure WebUI is enabled:
     ```ini
     [Preferences]
     WebUI\Enabled=true
     ```

### qBittorrent WebUI shows "Unauthorized"

**Symptom:**
Can't login to qBittorrent WebUI.

**Solution:**

1. Reset to default credentials:
   ```bash
   docker-compose stop qbittorrent
   docker volume rm unifarr_qbittorrent_config
   docker-compose up -d qbittorrent
   # Default: admin / adminadmin
   ```

2. Or edit config manually:
   ```bash
   docker exec -it qbittorrent /bin/bash
   vi /config/qBittorrent/qBittorrent.conf
   # Look for WebUI\Username and WebUI\Password_PBKDF2
   ```

### Downloads stuck at "Stalled"

**Symptom:**
Torrents show 0% and "stalled" status.

**Solution:**

1. Check connection:
   - Tools → Options → Connection
   - Test port: Click "Test Port"
   - Enable UPnP/NAT-PMP

2. Check trackers:
   - Right-click torrent → Edit trackers
   - Make sure trackers are working (not all red)
   - Add more trackers if needed

3. Increase connections:
   - Tools → Options → Connection
   - Global maximum connections: 500
   - Maximum per torrent: 100

---

## Library Scanning Issues

### "No files found" after scan

**Symptom:**
Library scan completes but shows 0 files.

**Diagnosis:**
```bash
# Check volume mounts
docker-compose exec unifarr ls -la /data/movies
docker-compose exec unifarr ls -la /data/tvshows

# Check host paths
ls -la /path/to/your/movies
```

**Solutions:**

1. **Paths in `.env` are wrong:**
   - Double-check `MOVIES_PATH` and `TVSHOWS_PATH`
   - Must be absolute paths, not relative
   - Must exist on host machine

2. **Docker volume mounts incorrect:**
   - Check `docker-compose.yml`:
     ```yaml
     volumes:
       - ${MOVIES_PATH}:/data/movies
       - ${TVSHOWS_PATH}:/data/tvshows
     ```
   - Restart after fixing:
     ```bash
     docker-compose down
     docker-compose up -d
     ```

3. **Permission issues:**
   ```bash
   # Container user can't read files
   sudo chmod -R 755 /path/to/movies
   ```

### Files found but not parsed correctly

**Symptom:**
Files appear in database but `parsedTitle` is null or wrong.

**Solution:**

1. **Filename format:**
   - Movies: Include year in filename or folder
     - Good: `Avatar (2009)/Avatar (2009).mkv`
     - Good: `Avatar.2009.1080p.mkv`
     - Bad: `movie1.mkv`
   
   - TV Shows: Use SxxExx format
     - Good: `Show.S01E01.mkv`
     - Good: `Show - 1x01 - Title.mkv`
     - Bad: `episode1.mkv`

2. **Rescan after renaming:**
   ```bash
   curl -X POST http://localhost:3000/api/files/scan \
     -H "Content-Type: application/json" \
     -d '{"path": "/data/movies"}'
   ```

### "TMDB_API_KEY not configured"

**Symptom:**
```json
{
  "error": "TMDB_API_KEY not configured"
}
```

**Solution:**

1. Get API key from https://www.themoviedb.org/settings/api
2. Add to `.env`:
   ```env
   TMDB_API_KEY=your_actual_api_key_here
   ```
3. Restart:
   ```bash
   docker-compose restart unifarr
   ```

---

## Download Issues

### Torrents not starting

**Symptom:**
Added torrent via Unifarr but it doesn't appear in qBittorrent.

**Diagnosis:**
```bash
# Check download was added to database
curl http://localhost:3000/api/downloads

# Check qBittorrent directly
curl http://localhost:8080/api/v2/torrents/info
```

**Solution:**

1. **Connection issue:**
   - Test connection: `curl -X POST http://localhost:3000/api/downloads/test`
   - Fix qBittorrent connection (see above)

2. **Invalid magnet URL:**
   - Verify magnet URL starts with `magnet:?xt=urn:btih:`
   - Has valid hash (40 hex characters)

3. **Disk space:**
   - Check available space: `df -h`
   - qBittorrent won't start download without space

### Auto-import not working

**Symptom:**
Downloads complete but files don't appear in library.

**Diagnosis:**
```bash
# Check auto-import is enabled
grep AUTO_IMPORT .env

# Check logs
docker-compose logs unifarr | grep import

# Manually trigger import
curl -X POST http://localhost:3000/api/downloads/sync
```

**Solution:**

1. **Auto-import disabled:**
   ```env
   AUTO_IMPORT=true  # Make sure this is set
   ```

2. **Path mismatch:**
   - qBittorrent save path must be accessible by Unifarr
   - Both should mount `/downloads` volume
   - Check `docker-compose.yml`:
     ```yaml
     volumes:
       - qbittorrent_downloads:/downloads  # Both services need this
     ```

3. **Permission issues:**
   ```bash
   # Both containers need write access to download directory
   docker exec -it unifarr touch /downloads/test.txt
   docker exec -it qbittorrent touch /downloads/test2.txt
   ```

---

## Performance Issues

### Slow library scans

**Symptom:**
Scanning large libraries takes very long.

**Solution:**

1. **Increase resources:**
   - In `docker-compose.yml`:
     ```yaml
     services:
       unifarr:
         deploy:
           resources:
             limits:
               cpus: '2'
               memory: 2G
     ```

2. **Exclude unnecessary directories:**
   - Don't scan directories with non-media files
   - Exclude: `.@__thumb`, `.AppleDouble`, `@eaDir`

3. **Database optimization:**
   ```bash
   docker exec -it unifarr sqlite3 /app/data/unifarr.db "VACUUM;"
   ```

### High CPU usage

**Symptom:**
Unifarr container using 100% CPU.

**Diagnosis:**
```bash
docker stats unifarr
```

**Solution:**

1. **Auto-import running too frequently:**
   - Default is every 5 minutes
   - Can temporarily disable: `AUTO_IMPORT=false`

2. **Too many active downloads:**
   - Limit in qBittorrent:
     - Tools → Options → Downloads
     - Maximum active downloads: 3

---

## Database Issues

### "Database is locked"

**Symptom:**
```
Error: database is locked
```

**Solution:**

1. **Another process accessing database:**
   ```bash
   # Check for zombie processes
   ps aux | grep unifarr
   
   # Kill if necessary
   docker-compose restart unifarr
   ```

2. **Corrupted WAL file:**
   ```bash
   docker exec -it unifarr sh
   cd /app/data
   sqlite3 unifarr.db "PRAGMA wal_checkpoint(TRUNCATE);"
   ```

### "No such table" errors

**Symptom:**
```
SqliteError: no such table: files
```

**Solution:**

Database needs migration:
```bash
# Backup first!
docker cp unifarr:/app/data/unifarr.db ./unifarr-backup.db

# Run migrations
docker-compose exec unifarr npm run db:migrate

# Or rebuild database (⚠️  loses data!)
docker-compose stop unifarr
docker volume rm unifarr_unifarr_data
docker-compose up -d unifarr
```

### Database corruption

**Symptom:**
```
Error: database disk image is malformed
```

**Solution:**

1. **Try recovery:**
   ```bash
   docker exec -it unifarr sh
   sqlite3 unifarr.db ".recover" | sqlite3 unifarr-recovered.db
   mv unifarr.db unifarr-corrupted.db
   mv unifarr-recovered.db unifarr.db
   ```

2. **Restore from backup:**
   ```bash
   docker cp ./unifarr-backup.db unifarr:/app/data/unifarr.db
   docker-compose restart unifarr
   ```

3. **Start fresh (⚠️  loses all data!):**
   ```bash
   docker volume rm unifarr_unifarr_data
   docker-compose up -d unifarr
   ```

---

## Still Having Issues?

### Enable Debug Logging

Add to `.env`:
```env
DEBUG=unifarr:*
LOG_LEVEL=debug
```

Restart:
```bash
docker-compose restart unifarr
```

Check logs:
```bash
docker-compose logs -f unifarr
```

### Collect Diagnostic Info

```bash
# System info
docker version
docker-compose version

# Container status
docker-compose ps

# Recent logs
docker-compose logs --tail=100 unifarr > unifarr-logs.txt
docker-compose logs --tail=100 qbittorrent > qbit-logs.txt

# Configuration (⚠️  remove sensitive data before sharing!)
cat .env | grep -v "PASSWORD\|API_KEY" > unifarr-config.txt

# Database stats
docker exec unifarr sqlite3 /app/data/unifarr.db ".tables"
docker exec unifarr sqlite3 /app/data/unifarr.db "SELECT COUNT(*) FROM files;"
```

### Get Help

1. **Check existing issues:** https://github.com/yourusername/unifarr/issues
2. **Create new issue:** Include:
   - OS and Docker version
   - Output from diagnostic commands above
   - Steps to reproduce
   - Expected vs actual behavior
3. **Discord community:** [Coming soon]

---

## Preventive Maintenance

### Regular Tasks

**Weekly:**
- Check disk space: `df -h`
- Review qBittorrent completed downloads
- Check Unifarr logs for errors

**Monthly:**
- Backup database (see [DEPLOYMENT.md](./DEPLOYMENT.md))
- Update containers: `docker-compose pull && docker-compose up -d`
- Clean up old download files
- Optimize database: `VACUUM;`

**As Needed:**
- Clear qBittorrent cache
- Reindex library after major changes
- Review and update .env settings

### Health Checks

Create a monitoring script:
```bash
#!/bin/bash
# unifarr-health.sh

echo "🏥 Unifarr Health Check"
echo

# API Status
if curl -sf http://localhost:3000/ > /dev/null; then
    echo "✅ API: Online"
else
    echo "❌ API: Offline"
fi

# qBittorrent Status
if curl -sf http://localhost:8080/ > /dev/null; then
    echo "✅ qBittorrent: Online"
else
    echo "❌ qBittorrent: Offline"
fi

# Disk Space
DISK_USAGE=$(df -h /path/to/media | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "⚠️  Disk: ${DISK_USAGE}% (Warning: >90%)"
elif [ "$DISK_USAGE" -gt 80 ]; then
    echo "⚡ Disk: ${DISK_USAGE}% (Caution: >80%)"
else
    echo "✅ Disk: ${DISK_USAGE}%"
fi

# Database Size
DB_SIZE=$(docker exec unifarr du -h /app/data/unifarr.db | cut -f1)
echo "📊 Database: $DB_SIZE"

echo
echo "Health check complete!"
```

Run it:
```bash
chmod +x unifarr-health.sh
./unifarr-health.sh
```

Add to cron for daily checks:
```bash
crontab -e
# Add:
0 9 * * * /path/to/unifarr-health.sh | mail -s "Unifarr Health" your@email.com
```

---

**Need more help?** Open an issue on [GitHub](https://github.com/yourusername/unifarr/issues).
