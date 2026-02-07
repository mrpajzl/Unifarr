# Unifarr Frontend

Modern, responsive frontend for Unifarr media library management system built with Nuxt 3.

## 🎨 Features

### 1. **Library Views** (Movies & TV Shows)
- **Grid & List Views** - Toggle between poster grid and detailed list layouts
- **Smart Filtering** - Filter by genre, year, quality, and match status  
- **Multi-Sort Options** - Sort by title, date added, rating, or file size
- **Real-time Search** - Instant search across your library
- **Beautiful Cards** - TMDB posters with ratings, runtime, and metadata

### 2. **Unmatched Media Queue**
- **Auto-Detection** - Automatically lists files that couldn't be matched
- **TMDB Search Integration** - Search movies or TV shows directly from each file
- **Quick Match** - One-click matching to link files with TMDB entries
- **Smart Suggestions** - Auto-populates search based on parsed filename

### 3. **Detail Pages**
- **Hero Layout** - Full backdrop with poster and metadata
- **Complete Info** - Title, year, rating, genres, overview, and status
- **File Management** - View all files linked to the media item
- **Actions** - Edit, refresh metadata, or delete media

### 4. **Add New Media**
- **TMDB Search** - Search movies and TV shows across TMDB's massive database
- **Torrent Integration** - Automatically find torrents for selected media
- **Quality Selection** - Choose from multiple torrent sources and qualities
- **Direct Add** - Add to library without downloading

### 5. **Downloads View**
- **Real-time Sync** - Auto-refreshes every 3 seconds to show current status
- **Progress Tracking** - Visual progress bars with speed and ETA
- **Full Control** - Pause, resume, or cancel any download
- **qBittorrent Integration** - Direct connection to your torrent client

## 🚀 Tech Stack

- **Framework:** Nuxt 3 (Vue 3 + TypeScript)
- **Styling:** Tailwind CSS (dark theme, mobile-first)
- **Icons:** Heroicons
- **State:** Vue 3 Composition API + Nuxt's `useAsyncData`
- **HTTP:** Nuxt's `$fetch` with composables
- **Utilities:** VueUse

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Backend API running (see `/backend` directory)

### Setup

1. **Clone or navigate to the frontend directory:**
   ```bash
   cd /Users/ondrejzraly/clawd/unifarr/frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   # .env file is already configured for local development
   # Edit if your backend runs on a different port
   NUXT_PUBLIC_API_BASE=http://localhost:3000
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   ```
   http://localhost:3000
   ```

## 🔧 Development

### Project Structure

```
frontend/
├── assets/
│   └── css/
│       └── main.css          # Tailwind + custom styles
├── components/
│   ├── LibraryView.vue       # Movies/TV library grid/list
│   ├── MediaCard.vue         # Poster card component
│   ├── MediaListItem.vue     # List view item
│   ├── NavLink.vue           # Navigation link component
│   └── UnmatchedFileCard.vue # Unmatched file with TMDB search
├── composables/
│   ├── useApi.ts             # Backend API client
│   └── useTMDB.ts            # TMDB helpers (images, formatting)
├── layouts/
│   └── default.vue           # Main layout with navigation
├── pages/
│   ├── index.vue             # Movies library
│   ├── tv.vue                # TV Shows library
│   ├── unmatched.vue         # Unmatched files queue
│   ├── add.vue               # Add new media
│   ├── downloads.vue         # Downloads manager
│   └── media/
│       └── [id].vue          # Media detail page
├── types/
│   └── index.ts              # TypeScript type definitions
├── app.vue                   # Root component
├── nuxt.config.ts            # Nuxt configuration
├── tailwind.config.js        # Tailwind configuration
└── package.json
```

### API Integration

All API calls are centralized in `composables/useApi.ts`:

```typescript
const api = useApi()

// Media
await api.media.getAll()
await api.media.create({ tmdbId: 123, type: 'movie' })
await api.media.match(mediaId, fileId, confidence)

// Files
await api.files.getUnmatched()
await api.files.scan('/path/to/scan')

// Search
await api.search.tmdbMovie('Inception')

// Downloads
await api.downloads.getAll()
await api.downloads.add(magnetUrl, mediaId)
await api.downloads.pause(hash)
```

### TMDB Utilities

Image URLs and formatting helpers in `composables/useTMDB.ts`:

```typescript
const tmdb = useTMDB()

tmdb.getPosterUrl(path, 'w500')       // Get poster URL
tmdb.getBackdropUrl(path, 'w1280')   // Get backdrop URL
tmdb.formatRuntime(120)               // "2h 0m"
tmdb.formatFileSize(1024)             // "1.00 KB"
tmdb.getYear(mediaItem)               // Extract year
```

### Custom Styling

Dark theme with utility classes (see `assets/css/main.css`):

- `btn`, `btn-primary`, `btn-secondary`, `btn-danger` - Button styles
- `card` - Container with border and shadow
- `input` - Styled input field
- `badge`, `badge-success`, `badge-warning`, etc. - Status badges
- `skeleton` - Loading skeleton animation

## 🎯 Key Features

### Responsive Design
- **Mobile-first** approach
- Hamburger menu on mobile
- Grid adapts: 2 cols (mobile) → 5 cols (desktop)
- Touch-friendly buttons and controls

### Dark Theme
- Elegant dark color palette
- Primary blue accent (#0ea5e9)
- Smooth transitions
- Custom scrollbar styling

### Performance
- Lazy-loaded images
- Debounced search inputs
- Optimized re-renders with `computed`
- Skeleton loading states

### User Experience
- Real-time progress updates
- Inline error handling
- Confirmation dialogs for destructive actions
- Auto-refresh for downloads (3s interval)
- Visual feedback on all interactions

## 🔌 Backend Integration

The frontend expects the backend API at `http://localhost:3000` (configurable via `.env`).

### Required Endpoints

**Media:**
- `GET /api/media` - List all media
- `GET /api/media/:id` - Get media details
- `POST /api/media` - Create media from TMDB
- `POST /api/media/:id/match` - Match file to media
- `DELETE /api/media/:id` - Delete media

**Files:**
- `GET /api/files` - List all files
- `GET /api/files/unmatched` - Get unmatched files
- `POST /api/files/scan` - Scan directory

**Search:**
- `GET /api/search/tmdb/movie?query=X` - Search movies
- `GET /api/search/tmdb/tv?query=X` - Search TV shows

**Providers:**
- `GET /api/providers/search?query=X&type=movie` - Search torrents

**Downloads:**
- `GET /api/downloads` - List downloads
- `POST /api/downloads` - Add download
- `PATCH /api/downloads/:hash` - Pause/resume
- `DELETE /api/downloads/:hash` - Remove download

See `backend/docs/API.md` for complete documentation.

## 📱 Screenshots

### Library (Grid View)
Beautiful poster grid with ratings and metadata

### Library (List View)  
Detailed list with overview and genres

### Unmatched Queue
Search and match unidentified files

### Detail Page
Full media information with backdrop

### Add Media
Search TMDB and find torrents

### Downloads
Real-time torrent management

## 🚀 Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Generate static site (if needed)
npm run generate
```

## 🐛 Troubleshooting

### API Connection Issues
- Ensure backend is running on port 3000
- Check `.env` has correct `NUXT_PUBLIC_API_BASE`
- Verify CORS is enabled on backend

### TMDB Images Not Loading
- Ensure backend has valid `TMDB_API_KEY`
- Check network tab for 404s on image URLs
- Fallback placeholders should display if images fail

### Downloads Not Updating
- Verify qBittorrent is running and configured
- Check backend logs for connection errors
- Ensure auto-refresh interval is working (3s)

## 📄 License

Part of the Unifarr project.

## 🤝 Contributing

This is part of the complete Unifarr stack. See main project README for contribution guidelines.

---

Built with ❤️ using Nuxt 3, Tailwind CSS, and TypeScript
