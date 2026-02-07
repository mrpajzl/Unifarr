# Unifarr Frontend - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Unifarr backend running on port 3000

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   ```
   http://localhost:3001
   ```

That's it! The frontend will automatically connect to the backend at `http://localhost:3000`.

## 📁 Project Overview

### Key Files
- `nuxt.config.ts` - Nuxt configuration (ports, modules, etc.)
- `tailwind.config.js` - Tailwind CSS theme configuration
- `composables/useApi.ts` - API client for backend communication
- `layouts/default.vue` - Main app layout with navigation

### Pages
- `/` - Dashboard with statistics
- `/library/movies` - Movies library (grid/list views)
- `/library/tv` - TV shows library (grid/list views)
- `/unmatched` - Unmatched files that need TMDB matching
- `/downloads` - Active torrent downloads
- `/add` - Search and add new media
- `/media/:id` - Individual media detail page

## 🎨 Features

✅ **Responsive Design** - Works on mobile, tablet, and desktop  
✅ **Dark Theme** - Beautiful dark UI optimized for media browsing  
✅ **Real-time Updates** - Downloads refresh automatically  
✅ **TMDB Integration** - High-quality posters and metadata  
✅ **Torrent Search** - Multi-provider torrent search and download  
✅ **Smart Matching** - Auto-match files to TMDB entries  

## 🔧 Configuration

### Change Backend URL
Create a `.env` file:
```env
NUXT_PUBLIC_API_BASE=http://your-backend-url:port
```

### Change Frontend Port
Edit `nuxt.config.ts`:
```typescript
devServer: {
  port: 3001, // Change this
},
```

## 📦 Building for Production

```bash
# Build the app
npm run build

# Preview production build
npm run preview

# Generate static site
npm run generate
```

## 🐛 Troubleshooting

### "Cannot connect to backend"
- Ensure backend is running: `cd ../backend && npm run dev`
- Check backend is on port 3000
- Verify CORS is enabled in backend

### "Port 3001 already in use"
Change the port in `nuxt.config.ts` or kill the process using port 3001

### Icons not showing
Run `npm install` again to ensure all dependencies are installed

## 📚 Learn More

- Read the full [README.md](./README.md) for detailed documentation
- Check [Nuxt 3 docs](https://nuxt.com/) for framework features
- See [Tailwind CSS docs](https://tailwindcss.com/) for styling

## 🎯 Next Steps

1. Start the backend server
2. Start the frontend server
3. Open http://localhost:3001
4. Scan your media library from the backend
5. Match unmatched files from the UI
6. Add new media and download torrents!

Enjoy using Unifarr! 🎬
