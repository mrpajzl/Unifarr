# Unifarr

> Unified media management for movies and TV shows

Unifarr is a modern media management application that combines the best features of Radarr, Sonarr, and Plex into a single, unified interface.

## Features

- 🎬 **Movie & TV Show Management** - Browse, search, and download movies and TV shows
- 🔍 **Smart Search** - Multi-tracker search with intelligent matching (diacritics, subtitles)
- 📺 **Episode Monitoring** - Automatic download of new episodes when they air
- 🌐 **Multi-Source** - Supports torrents (SKTorrent) and direct downloads (Webshare)
- 📊 **TMDB Integration** - Rich metadata, posters, and episode information
- 🎯 **Template Search** - Customizable search templates per show
- 🗄️ **Smart Matching** - Automatic file-to-media matching with confidence scoring

## Quick Start

### Using Docker Compose (Recommended)

1. Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    image: ghcr.io/mrpajzl/unifarr/backend:latest
    ports:
      - "3002:3002"
    volumes:
      - ./data:/app/data
      - /path/to/movies:/data/movies
      - /path/to/tvshows:/data/tvshows
      - /path/to/downloads:/data/downloads
    environment:
      - PORT=3002
      - MOVIES_PATH=/data/movies
      - TV_PATH=/data/tvshows
      - DOWNLOADS_PATH=/data/downloads

  frontend:
    image: ghcr.io/mrpajzl/unifarr/frontend:latest
    ports:
      - "3000:3000"
    environment:
      - NUXT_PUBLIC_API_BASE=http://backend:3002
    depends_on:
      - backend
```

2. Start:

```bash
docker-compose up -d
```

3. Access at http://localhost:3000

### TrueNAS SCALE Custom App

1. Go to **Apps** → **Discover Apps** → **Custom App**
2. Fill in:
   - **Application Name:** unifarr
   - **Image Repository:** ghcr.io/mrpajzl/unifarr/backend
   - **Image Tag:** latest
   - **Port Forwarding:** Container Port 3002 → Node Port 3002

3. Add Frontend:
   - **Image Repository:** ghcr.io/mrpajzl/unifarr/frontend
   - **Port Forwarding:** Container Port 3000 → Node Port 3000

4. Configure storage:
   - Mount `/mnt/storage/media/movies` to `/data/movies`
   - Mount `/mnt/storage/media/tvshows` to `/data/tvshows`
   - Mount `/mnt/storage/media/downloads` to `/data/downloads`

## Configuration

### First Run

1. **TMDB API Key** - Get from https://www.themoviedb.org/settings/api
2. **Webshare Credentials** - Optional, for direct downloads
3. **Tracker Credentials** - Optional, for private trackers

### Search Templates

Customize search templates per show in Settings → Search Templates

Example:
```
{Series Title} S{Season:2}E{Episode:2}
{Series OriginalTitle} S{Season:2}E{Episode:2}
```

## Development

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## Building

Docker images are automatically built via GitHub Actions and published to:
- `ghcr.io/mrpajzl/unifarr/backend:latest`
- `ghcr.io/mrpajzl/unifarr/frontend:latest`

## Architecture

- **Backend:** Node.js + Hono + Drizzle ORM + SQLite
- **Frontend:** Nuxt 3 + Vue 3 + Tailwind CSS
- **Database:** SQLite (embedded)
- **Search:** Multi-source (torrents, direct downloads)
- **Monitoring:** Automatic episode checking (hourly)

## Roadmap

- [ ] Notifications (Discord, Telegram)
- [ ] Quality profiles
- [ ] Custom download clients
- [ ] Calendar view
- [ ] Statistics dashboard

## License

MIT

## Credits

Created by [@mrpajzl](https://github.com/mrpajzl)
