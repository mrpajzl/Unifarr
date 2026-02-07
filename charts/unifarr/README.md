# Unifarr Helm Chart

Unified media management for movies and TV shows.

## Installation

### Add the Helm Repository

```bash
helm repo add unifarr https://mrpajzl.github.io/unifarr
helm repo update
```

### Install Unifarr

```bash
helm install unifarr unifarr/unifarr \
  --set mediaPaths.movies.hostPath=/mnt/storage/media/movies \
  --set mediaPaths.tvshows.hostPath=/mnt/storage/media/tvshows \
  --set mediaPaths.downloads.hostPath=/mnt/storage/media/downloads
```

## Configuration

See `values.yaml` for all available configuration options.

### Key Settings

- `mediaPaths.movies.hostPath` - Path to movies library
- `mediaPaths.tvshows.hostPath` - Path to TV shows library
- `mediaPaths.downloads.hostPath` - Path to downloads folder
- `backend.persistence.data.size` - Size of database volume (default: 10Gi)
- `service.backend.port` - Backend API port (default: 3002)
- `service.frontend.port` - Frontend web port (default: 3000)

## TrueNAS SCALE

This chart is designed for TrueNAS SCALE with a custom catalog.

### Add to TrueNAS

1. Go to **Apps** → **Manage Catalogs**
2. Click **Add Catalog**
3. Fill in:
   - **Name:** unifarr
   - **Repository:** https://github.com/mrpajzl/unifarr
   - **Preferred Trains:** charts
   - **Branch:** gh-pages

4. Save and refresh catalog
5. Install Unifarr from the catalog

## Access

After installation:
- **Frontend:** http://[NODE-IP]:3000
- **Backend API:** http://[NODE-IP]:3002

## Upgrading

```bash
helm repo update
helm upgrade unifarr unifarr/unifarr
```
