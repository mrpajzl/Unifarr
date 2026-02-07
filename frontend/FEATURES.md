# Unifarr Frontend - Feature Documentation

## 🎯 Complete Feature List

### 1. Movies Library (`/`)
**Status:** ✅ Complete

**Features:**
- Grid view with movie posters from TMDB
- List view with detailed information
- Real-time search filter
- Sort by: title, year, rating, date added
- Movie cards show:
  - Poster image (2:3 aspect ratio)
  - Title
  - Year badge
  - Rating with star icon
  - Runtime
- Empty state with call-to-action
- Loading skeletons
- Click card to view details

**Components:**
- `pages/index.vue` - Main page
- `components/LibraryView.vue` - Shared library component
- `components/MediaCard.vue` - Grid card
- `components/MediaListItem.vue` - List item

---

### 2. TV Shows Library (`/tv`)
**Status:** ✅ Complete

**Features:**
- Same as Movies Library but for TV shows
- Shows number of seasons instead of runtime
- Separate page for better organization
- All filtering and sorting options

**Components:**
- `pages/tv.vue` - Main page
- Shares `LibraryView.vue` with type prop

---

### 3. Unmatched Media Queue (`/unmatched`)
**Status:** ✅ Complete

**Features:**
- Lists all files that couldn't be auto-matched
- For each file:
  - Shows filename and parsed metadata
  - File size, quality, codec
  - Full file path
  - Inline TMDB search
  - Type toggle (movie/TV)
  - Search results with posters
  - One-click matching
- Auto-populates search from parsed filename
- Debounced search (500ms)
- Success feedback and page refresh
- Empty state when all matched

**Components:**
- `pages/unmatched.vue` - Main page
- `components/UnmatchedFileCard.vue` - File card with search

**API Integration:**
- `GET /api/files/unmatched` - Get unmatched files
- `GET /api/search/tmdb/movie` - Search movies
- `GET /api/search/tmdb/tv` - Search TV shows
- `POST /api/media` - Create media item
- `POST /api/media/:id/match` - Link file to media

---

### 4. Media Detail Page (`/media/:id`)
**Status:** ✅ Complete

**Features:**
- Hero section with backdrop image
- Overlay gradient for readability
- Poster (2:3 ratio) with shadow
- Title with year
- Rating (star + score + vote count)
- Runtime/seasons display
- Status badge
- Genre chips
- Overview section
- Files section:
  - Lists all files for this media
  - Shows filename, path, size
  - Quality, codec metadata
  - Empty state if no files
- Actions:
  - Delete media (with confirmation)
  - Refresh metadata (link to add page)
- Responsive layout (mobile → desktop)

**Components:**
- `pages/media/[id].vue` - Detail page

**API Integration:**
- `GET /api/media/:id` - Get media details
- `GET /api/files` - Get all files (filter by mediaItemId)
- `DELETE /api/media/:id` - Delete media

---

### 5. Add New Media (`/add`)
**Status:** ✅ Complete

**Features:**
- TMDB search input
- Type toggle (movies/TV shows)
- Search results grid with posters
- Click poster to select
- Modal with:
  - Larger poster
  - Full title and overview
  - Automatic torrent search
  - Torrent results list with:
    - Title
    - Size
    - Seeders/leechers
    - Quality badge
  - Actions:
    - Download torrent (creates media + starts download)
    - Add without download (creates media only)
- Loading states for search and torrents
- Empty states
- Redirects to appropriate page after action

**Components:**
- `pages/add.vue` - Add media page

**API Integration:**
- `GET /api/search/tmdb/movie` - Search movies
- `GET /api/search/tmdb/tv` - Search TV shows
- `GET /api/providers/search` - Search torrents
- `POST /api/media` - Create media item
- `POST /api/downloads` - Add torrent download

**Features:**
- Query param support (`?type=tv`, `?q=search`)
- Auto-search on mount if query present
- Keyboard shortcuts (Enter to search)

---

### 6. Downloads Manager (`/downloads`)
**Status:** ✅ Complete

**Features:**
- Lists all active downloads from qBittorrent
- Auto-refreshes every 3 seconds
- For each download:
  - Name
  - Status badge (downloading, paused, completed, error)
  - Download speed (MB/s or KB/s)
  - ETA (formatted: 1h 30m, 45m, 30s)
  - Progress bar (0-100%)
  - Actions:
    - Pause (if downloading)
    - Resume (if paused)
    - Delete (with file deletion option)
- Error messages displayed inline
- Loading states
- Empty state with CTA
- Manual refresh button

**Components:**
- `pages/downloads.vue` - Downloads page

**API Integration:**
- `GET /api/downloads` - List all downloads
- `PATCH /api/downloads/:hash` - Pause/resume
- `DELETE /api/downloads/:hash` - Remove download

**Technical Details:**
- Auto-refresh with `setInterval` (3000ms)
- Cleanup on unmount
- Conditional button display based on status
- Confirmation dialog for deletion

---

## 🎨 Design System

### Colors
- **Primary:** Blue (#0ea5e9) - Actions, links, active states
- **Dark palette:** 
  - 950: Background (#020617)
  - 900: Cards (#0f172a)
  - 800: Inputs (#1e293b)
  - 700: Borders (#334155)
- **Status colors:**
  - Success: Green
  - Warning: Yellow
  - Error: Red
  - Info: Blue

### Components
- **Buttons:** `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`
- **Cards:** `.card` - Rounded with border and shadow
- **Inputs:** `.input` - Styled with focus ring
- **Badges:** `.badge-success/warning/error/info`
- **Skeleton:** `.skeleton` - Loading animation

### Typography
- **Headings:** Bold, large sizes (3xl, 2xl, xl)
- **Body:** Gray-100 for readability
- **Secondary:** Gray-400 for less important text
- **Monospace:** For file paths

### Layout
- **Max width:** 7xl (1280px)
- **Padding:** Responsive (4, 6, 8)
- **Grid:** 2-5 columns (responsive)
- **Spacing:** Consistent 4, 6, 8 units

---

## 🔧 Technical Implementation

### State Management
- **Nuxt's `useAsyncData`** for data fetching
- **Vue 3 `ref` and `computed`** for reactive state
- **No global store** (Pinia not needed for current scope)

### API Calls
- **Centralized in `composables/useApi.ts`**
- **Type-safe** with TypeScript interfaces
- **Error handling** with try-catch and alerts
- **Loading states** with pending flags

### TMDB Integration
- **Image URLs** generated via `useTMDB` composable
- **Poster sizes:** w92, w154, w342, w500, w780
- **Backdrop sizes:** w300, w780, w1280
- **Fallback placeholders** for missing images

### Performance
- **Lazy loading** images
- **Debounced search** (500ms)
- **Skeleton screens** during load
- **Optimized re-renders** with computed
- **Virtual scrolling** (if needed in future)

### Responsive Design
- **Breakpoints:** sm (640px), md (768px), lg (1024px)
- **Grid adapts:** 2 → 3 → 4 → 5 columns
- **Mobile menu:** Hamburger on small screens
- **Touch-friendly:** Large tap targets

### Accessibility
- **Semantic HTML** (nav, main, button, etc.)
- **Alt text** on images
- **Focus states** on interactive elements
- **Color contrast** meets WCAG AA
- **Keyboard navigation** supported

---

## 📊 Component Hierarchy

```
app.vue
└── layouts/default.vue
    ├── NavLink.vue (×5)
    └── [Pages]
        ├── index.vue
        │   └── LibraryView.vue (type="movie")
        │       ├── MediaCard.vue (×N)
        │       └── MediaListItem.vue (×N)
        ├── tv.vue
        │   └── LibraryView.vue (type="tv")
        │       ├── MediaCard.vue (×N)
        │       └── MediaListItem.vue (×N)
        ├── unmatched.vue
        │   └── UnmatchedFileCard.vue (×N)
        ├── add.vue
        ├── downloads.vue
        └── media/[id].vue
```

---

## 🚀 Future Enhancements

Potential features for v2:
- [ ] Bulk actions (select multiple media)
- [ ] Advanced filters (IMDb rating, genre combinations)
- [ ] Custom collections/playlists
- [ ] Watched status tracking
- [ ] Subtitles management
- [ ] Metadata editing
- [ ] Dark/light theme toggle
- [ ] Keyboard shortcuts
- [ ] Settings page
- [ ] User authentication
- [ ] Multi-language support (i18n)
- [ ] Export library to CSV/JSON
- [ ] Statistics dashboard
- [ ] Recently added section
- [ ] Recommendations based on library

---

## ✅ Testing Checklist

### Movies Library
- [x] Grid view displays correctly
- [x] List view displays correctly
- [x] Search filters results
- [x] Sort options work
- [x] Empty state shows when no movies
- [x] Loading skeletons display
- [x] Click card navigates to detail

### TV Shows Library
- [x] Same as movies
- [x] Shows seasons count

### Unmatched Queue
- [x] Lists unmatched files
- [x] Search TMDB works
- [x] Type toggle (movie/TV)
- [x] Match button creates media + links file
- [x] Empty state when all matched
- [x] Auto-search from parsed title

### Detail Page
- [x] Backdrop displays
- [x] Poster displays
- [x] Metadata correct
- [x] Files list correct
- [x] Delete works
- [x] Navigation works

### Add Media
- [x] TMDB search works
- [x] Type toggle works
- [x] Results display
- [x] Modal opens on click
- [x] Torrent search automatic
- [x] Add with download works
- [x] Add without download works
- [x] Redirects correctly

### Downloads
- [x] Lists all downloads
- [x] Auto-refresh works
- [x] Progress bar updates
- [x] Pause/resume works
- [x] Delete works
- [x] Status badges correct
- [x] Speed/ETA formatted correctly

---

Built with ❤️ for media enthusiasts
