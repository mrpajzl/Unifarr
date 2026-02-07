# Getting Started with Unifarr Frontend

## Quick Start (5 minutes)

### Prerequisites
- ✅ Backend running on port 3000
- ✅ Node.js 18+ installed
- ✅ npm or yarn

### Step 1: Install Dependencies (first time only)
```bash
cd /Users/ondrejzraly/clawd/unifarr/frontend
npm install
```

### Step 2: Configure Environment
The `.env` file is already configured:
```env
NUXT_PUBLIC_API_BASE=http://localhost:3000
```

If your backend runs on a different port, edit `.env` accordingly.

### Step 3: Start Development Server
```bash
npm run dev
```

### Step 4: Open in Browser
```
http://localhost:3001
```

That's it! 🎉

---

## First Time Setup

### 1. Make Sure Backend is Running
```bash
# In a separate terminal
cd /Users/ondrejzraly/clawd/unifarr/backend
npm run dev
```

Backend should be running on: `http://localhost:3000`

### 2. Configure qBittorrent (Backend)
Ensure your backend `.env` has qBittorrent settings:
```env
QBITTORRENT_HOST=localhost
QBITTORRENT_PORT=8080
QBITTORRENT_USERNAME=admin
QBITTORRENT_PASSWORD=adminadmin
```

### 3. Set Library Path (Backend)
In backend `.env`:
```env
LIBRARY_PATH=/path/to/your/media
```

---

## Testing the Frontend

### Test 1: Dashboard
- Open http://localhost:3001
- You should see the dashboard with stats
- Click on different navigation items

### Test 2: Scan Library
1. Click "Scan Library" button (on Dashboard or Movies/TV pages)
2. Enter your media library path
3. Click "Scan"
4. Files should appear in the library

### Test 3: Match Unmatched Files
1. Go to "Unmatched" in the navigation
2. For each file, search TMDB
3. Click on a result to match it
4. Or click "Auto-Match All" for bulk matching

### Test 4: Add New Media
1. Click "Add" in navigation
2. Search for a movie or TV show (e.g., "Inception")
3. Click on a result
4. Click "Add to Library"
5. Optionally search for torrents and download

### Test 5: Downloads
1. Go to "Downloads" in navigation
2. You should see active torrents from qBittorrent
3. Try pausing/resuming a download
4. Downloads auto-refresh every 5 seconds

---

## Common Issues

### Backend Connection Failed
**Symptom:** "Failed to load" errors

**Fix:**
1. Check backend is running: `curl http://localhost:3000/api/media`
2. Check `.env` has correct `NUXT_PUBLIC_API_BASE`
3. Restart frontend dev server

### No Images Loading
**Symptom:** Poster images don't load

**Fix:**
1. Check backend has `TMDB_API_KEY` configured
2. Check browser console for 403/404 errors
3. Verify TMDB paths are correct in API responses

### qBittorrent Not Connected
**Symptom:** "Connection failed" on Downloads page

**Fix:**
1. Click "Test" button on Downloads page to diagnose
2. Check qBittorrent is running on port 8080
3. Verify credentials in backend `.env`
4. Ensure qBittorrent Web UI is enabled

### Port 3001 Already in Use
**Symptom:** Dev server won't start

**Fix:**
```bash
# Kill process using port 3001
lsof -ti:3001 | xargs kill -9

# Or change port in nuxt.config.ts
devServer: { port: 3002 }
```

---

## Development Tips

### Hot Reload
Changes to `.vue`, `.ts`, or `.css` files auto-reload the browser.

### API Calls
All API calls are in `app/composables/useApi.ts`. To add a new endpoint:
```typescript
export const useApi = () => {
  // ...
  return {
    myNewEndpoint: {
      doSomething: () => apiFetch('/api/my-endpoint')
    }
  }
}
```

### Styling
Global styles are in `app/assets/css/main.css`. Use Tailwind classes directly in components.

### Toast Notifications
```typescript
const toast = useToast();
toast.success('Operation completed!');
toast.error('Something went wrong');
toast.warning('Be careful!');
toast.info('FYI: ...');
```

### Formatting Helpers
```typescript
const { formatBytes, formatSpeed, formatTime, getTMDBImageUrl } = useFormatters();

formatBytes(1024) // "1.00 KB"
formatSpeed(102400) // "100 KB/s"
formatTime(3600) // "1h 0m"
getTMDBImageUrl('/path.jpg', 'w500') // Full TMDB URL
```

---

## Production Build

### Build
```bash
npm run build
```

### Preview
```bash
npm run preview
```

### Deploy
The `.output` directory contains the production build. Deploy to:
- Vercel (recommended for Nuxt)
- Netlify
- Cloudflare Pages
- Docker container
- Node.js server

---

## File Structure Quick Reference

```
app/
├── pages/               # Routes (auto-generated from filenames)
│   ├── index.vue       # / → Dashboard
│   ├── add.vue         # /add → Add media
│   ├── downloads.vue   # /downloads → Downloads
│   ├── unmatched.vue   # /unmatched → Unmatched files
│   ├── library/
│   │   ├── movies.vue  # /library/movies → Movies
│   │   └── tv.vue      # /library/tv → TV Shows
│   └── media/
│       └── [id].vue    # /media/:id → Detail page
├── components/          # Reusable components
├── composables/         # Shared logic (API, formatters, toast)
├── layouts/             # Page layouts (navigation)
├── types/               # TypeScript types
└── assets/              # Styles, images
```

---

## Need Help?

- **Backend API Docs:** See `backend/docs/API.md`
- **Backend Setup:** See `backend/SETUP.md`
- **Integration Tests:** See `INTEGRATION_COMPLETE.md`
- **Feature Details:** See `FEATURES.md`
- **Full Documentation:** See `README.md`

---

**Happy media managing! 🎬📺**
