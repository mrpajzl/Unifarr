# Unifarr Frontend - Quick Start

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
cd /Users/ondrejzraly/clawd/unifarr/frontend
npm install
```

### 2. Start Backend API
In a separate terminal:
```bash
cd /Users/ondrejzraly/clawd/unifarr/backend
npm run dev
```

The backend should be running on `http://localhost:3000`

### 3. Start Frontend
```bash
npm run dev
```

Open `http://localhost:3000` in your browser!

## 🎯 First Steps

1. **Add Your First Movie**
   - Click "Add Media" in the navigation
   - Search for a movie (e.g., "Inception")
   - Click on a result
   - Choose a torrent or add without download

2. **View Your Library**
   - Navigate to "Movies" or "TV Shows"
   - Toggle between grid and list views
   - Use search and filters to find media

3. **Match Unmatched Files**
   - Go to "Unmatched" in the navigation
   - Search TMDB for each file
   - Click on the correct match

4. **Monitor Downloads**
   - Click "Downloads" to see active torrents
   - Pause, resume, or cancel downloads
   - Watch progress in real-time

## 🔧 Configuration

### Backend URL
If your backend runs on a different port, edit `.env`:
```bash
NUXT_PUBLIC_API_BASE=http://localhost:YOUR_PORT
```

### Development Mode
The frontend runs in development mode with:
- Hot module replacement (HMR)
- Vue DevTools support
- Detailed error messages
- Auto-refresh on file changes

## 📝 Common Commands

```bash
# Development
npm run dev              # Start dev server

# Production
npm run build            # Build for production
npm run preview          # Preview production build

# Maintenance
npm install              # Install/update dependencies
npm run postinstall      # Prepare Nuxt
```

## 🐛 Troubleshooting

### "Cannot connect to API"
- Ensure backend is running on port 3000
- Check `.env` has correct `NUXT_PUBLIC_API_BASE`
- Verify no firewall is blocking localhost

### "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 already in use
```bash
# Use a different port
PORT=3001 npm run dev
```

Then update `.env`:
```bash
NUXT_PUBLIC_API_BASE=http://localhost:3001
```

## 🎨 Features Overview

| Feature | Page | Description |
|---------|------|-------------|
| **Movies Library** | `/` | Browse and manage movies |
| **TV Shows Library** | `/tv` | Browse and manage TV shows |
| **Unmatched Queue** | `/unmatched` | Match unidentified files |
| **Add Media** | `/add` | Search TMDB and add new media |
| **Downloads** | `/downloads` | Monitor torrent downloads |
| **Media Detail** | `/media/:id` | View full media information |

## 🔗 Integration

The frontend communicates with the backend API at:
- **Media Management:** `/api/media`
- **File Scanning:** `/api/files`
- **TMDB Search:** `/api/search`
- **Torrent Search:** `/api/providers`
- **Downloads:** `/api/downloads`

All API calls are wrapped in `composables/useApi.ts` for easy use throughout the app.

## 🎯 Next Steps

- Scan your media library via the backend
- Add media using the "Add Media" page
- Match any unmatched files in "Unmatched"
- Monitor downloads in real-time
- Enjoy your organized media library!

---

Happy organizing! 🎬📺
