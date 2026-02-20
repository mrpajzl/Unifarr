# Frontend Optimization Notes

## Bundle Size Analysis

To check bundle size:
```bash
cd frontend
npm run build
# Check .output/public/_nuxt/ for bundle sizes
```

## Lazy Loading Strategy

### Heavy Components (Auto-imported by Nuxt)

Nuxt 3 auto-imports components. For lazy loading, use the `Lazy` prefix:

**Before:**
```vue
<TorrentSearchModal v-model="showSearch" />
```

**After:**
```vue
<LazyTorrentSearchModal v-model="showSearch" />
```

### Components to Lazy Load:

1. **Modals** (loaded only when shown):
   - `TorrentSearchModal` → `LazyTorrentSearchModal`
   - `EpisodeManager` → `LazyEpisodeManager`
   - `PersonDetailsModal` → `LazyPersonDetailsModal`
   - `EpisodeMatcherModal` → `LazyEpisodeMatcherModal`
   - `ShowTemplateOverrideModal` → `LazyShowTemplateOverrideModal`
   - `EditPathModal` → `LazyEditPathModal`
   - `TmdbIdentifyModal` → `LazyTmdbIdentifyModal`

2. **Large Lists** (if paginated):
   - Consider virtual scrolling for 100+ items

### Image Optimization

Use Nuxt's `<NuxtImg>` for TMDB posters:

**Before:**
```vue
<img :src="getTMDBImageUrl(path, 'w500')" />
```

**After:**
```vue
<NuxtImg 
  :src="getTMDBImageUrl(path, 'w500')" 
  loading="lazy"
  placeholder
/>
```

## Current Status

✅ Nuxt 3 best practices
✅ Minimal dependencies
✅ Clean component structure
✅ Tailwind CSS optimized

📝 TODO:
- [ ] Add `Lazy` prefix to heavy modals
- [ ] Implement image lazy loading for TMDB images
- [ ] Check bundle size after build
- [ ] Consider code splitting for large routes

## Notes

- Nuxt 3 auto-code-splits by route (pages/)
- Components in /components/ are auto-imported
- Use `Lazy` prefix for components that aren't needed immediately
- Modals are perfect candidates for lazy loading (only load when shown)
