<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">Movies</h1>
        <p class="text-sm text-gray-500 mt-0.5">
          {{ filteredMovies.length }} of {{ movies.length }} movies
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button 
          @click="handleScanClick" 
          :disabled="scanning"
          class="btn btn-secondary btn-sm"
        >
          <Icon 
            :name="scanning ? 'mdi:loading' : 'mdi:folder-search'" 
            :class="{ 'animate-spin': scanning }"
            class="w-4 h-4 mr-1.5" 
          />
          {{ scanning ? 'Scanning...' : 'Scan' }}
        </button>
        <div class="flex bg-gray-800 rounded-lg p-0.5">
          <button
            @click="viewMode = 'grid'"
            :class="[
              'p-1.5 rounded-md transition-colors',
              viewMode === 'grid' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'
            ]"
          >
            <Icon name="mdi:view-grid" class="w-5 h-5" />
          </button>
          <button
            @click="viewMode = 'list'"
            :class="[
              'p-1.5 rounded-md transition-colors',
              viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'
            ]"
          >
            <Icon name="mdi:view-list" class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <LibraryToolbar
      label="movies"
      v-model:search="searchQuery"
      v-model:sort-by="sortBy"
      v-model:sort-order="sortOrder"
      v-model:genre="genreFilter"
      v-model:year="yearFilter"
      :genres="availableGenres"
      :active-filters="activeFilterCount"
    >
      <template #extra-filter>
        <select v-model="qualityFilter" class="input w-full">
          <option value="">All Qualities</option>
          <option v-for="q in availableQualities" :key="q" :value="q">{{ q }}</option>
        </select>
        <label class="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors">
          <input 
            type="checkbox" 
            v-model="showOnlyWithoutTMDB" 
            class="w-4 h-4 rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
          />
          <span class="text-sm text-gray-300">Without TMDB ID</span>
        </label>
        <label class="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors">
          <input 
            type="checkbox" 
            v-model="showOnlyMissingFile" 
            class="w-4 h-4 rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
          />
          <span class="text-sm text-gray-300">Missing video file</span>
        </label>
      </template>
    </LibraryToolbar>

    <!-- Library Not Configured -->
    <div v-if="!libraryConfigured" class="card p-12">
      <div class="max-w-md mx-auto">
        <div class="text-center mb-6">
          <Icon name="mdi:folder-alert-outline" class="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <h3 class="text-xl font-semibold mb-2">Movies library not configured</h3>
          <p class="text-gray-400">Set the path to your movies folder to get started</p>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="label">Movies Folder Path</label>
            <input
              v-model="moviesPathInput"
              type="text"
              placeholder="/data/media/movies"
              class="input w-full"
              @keyup.enter="saveMoviesPath"
            />
            <p class="text-xs text-gray-500 mt-1">Directory where your movie files are stored</p>
          </div>
          
          <div class="flex gap-3">
            <NuxtLink to="/settings/libraries" class="btn btn-secondary flex-1">
              <Icon name="mdi:cog" class="w-5 h-5 mr-2" />
              Advanced Settings
            </NuxtLink>
            <button
              @click="saveMoviesPath"
              :disabled="!moviesPathInput || savingPath"
              class="btn btn-primary flex-1"
            >
              <Icon
                :name="savingPath ? 'mdi:loading' : 'mdi:check'"
                :class="{ 'animate-spin': savingPath }"
                class="w-5 h-5 mr-2"
              />
              {{ savingPath ? 'Saving...' : 'Save & Scan' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-else-if="pending" class="flex justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <Icon name="mdi:loading" class="w-8 h-8 animate-spin text-primary-500" />
        <span class="text-sm text-gray-500">Loading movies...</span>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card p-8 text-center">
      <Icon name="mdi:alert-circle" class="w-12 h-12 mx-auto mb-3 text-red-500" />
      <p class="font-medium text-red-400">Failed to load movies</p>
      <p class="text-sm text-gray-500 mt-1">{{ error.message }}</p>
      <button @click="refresh" class="btn btn-secondary btn-sm mt-4">Try Again</button>
    </div>

    <!-- Empty -->
    <div v-else-if="!filteredMovies.length && !searchQuery && !genreFilter && !yearFilter" class="card p-12 text-center">
      <Icon name="mdi:movie-open-outline" class="w-16 h-16 mx-auto mb-4 text-gray-600" />
      <h3 class="text-xl font-semibold mb-2">No movies yet</h3>
      <p class="text-gray-400 mb-6">Start by scanning your library or adding movies from TMDB</p>
      <div class="flex justify-center gap-3">
        <button @click="handleScanClick" :disabled="scanning" class="btn btn-secondary">
          <Icon :name="scanning ? 'mdi:loading' : 'mdi:folder-search'" :class="{ 'animate-spin': scanning }" class="w-5 h-5 mr-2" />
          {{ scanning ? 'Scanning...' : 'Scan Library' }}
        </button>
        <NuxtLink to="/discover" class="btn btn-primary">
          <Icon name="mdi:magnify" class="w-5 h-5 mr-2" />
          Search TMDB
        </NuxtLink>
      </div>
    </div>

    <!-- No results -->
    <div v-else-if="!filteredMovies.length" class="card p-8 text-center">
      <Icon name="mdi:magnify" class="w-12 h-12 mx-auto mb-3 text-gray-600" />
      <p class="font-medium">No movies match your filters</p>
      <button
        @click="searchQuery = ''; genreFilter = ''; yearFilter = ''; qualityFilter = ''"
        class="btn btn-secondary btn-sm mt-3"
      >
        Clear Filters
      </button>
    </div>

    <!-- Grid View -->
    <div
      v-else-if="viewMode === 'grid'"
      ref="gridContainer"
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
      :class="{ 'pb-24': selectedCount > 0 }"
    >
      <MediaCard
        v-for="(movie, index) in displayedMovies"
        :key="movie.id"
        :media="movie"
        :index="index"
        :data-letter="getFirstLetter(movie.title)"
        :in-range-preview="isInRangePreview(index)"
        @hover="handleRangeHover"
        @leave="handleRangeLeave"
        @range-select="handleRangeSelect"
        @identified="refresh"
      />
    </div>

    <!-- Load More Button -->
    <div v-if="viewMode === 'grid' && hasMore" class="flex justify-center mt-8">
      <button
        @click="loadMore"
        class="btn btn-secondary"
      >
        <Icon name="mdi:chevron-down" class="w-5 h-5 mr-2" />
        Load More ({{ filteredMovies.length - displayedMovies.length }} remaining)
      </button>
    </div>

    <!-- List View -->
    <div v-else-if="viewMode === 'list'" class="space-y-2">
      <NuxtLink
        v-for="movie in displayedMovies"
        :key="movie.id"
        :to="`/media/${movie.id}`"
        :data-letter="getFirstLetter(movie.title)"
        class="card p-3 flex items-center gap-4 hover:border-primary-500/50 transition-colors group"
      >
        <div class="w-12 h-[72px] rounded overflow-hidden bg-gray-800 flex-shrink-0">
          <img
            v-if="movie.posterPath"
            :src="getTMDBImageUrl(movie.posterPath, 'w200')"
            :alt="movie.title"
            class="w-full h-full object-cover"
            loading="lazy"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-gray-600">
            <Icon name="mdi:image-off" class="w-5 h-5" />
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <h3 class="font-medium truncate group-hover:text-primary-400 transition-colors">{{ movie.title }}</h3>
          <div class="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
            <span v-if="movie.year">{{ movie.year }}</span>
            <span v-if="movie.runtime">{{ movie.runtime }} min</span>
            <span v-if="movie.voteAverage" class="flex items-center gap-1">
              <Icon name="mdi:star" class="w-3.5 h-3.5 text-yellow-400" />
              {{ movie.voteAverage.toFixed(1) }}
            </span>
            <span v-if="genres(movie).length" class="hidden sm:inline text-gray-600">
              {{ genres(movie).slice(0, 2).join(', ') }}
            </span>
          </div>
        </div>

        <Icon name="mdi:chevron-right" class="w-5 h-5 text-gray-600 flex-shrink-0" />
      </NuxtLink>
    </div>

    <!-- Alphabet Scrollbar -->
    <ClientOnly>
      <AlphabetScrollbar
        v-if="filteredMovies.length > 20"
        :current-letter="currentLetter"
        @jump="jumpToLetter"
      />
    </ClientOnly>

    <!-- Bulk Actions Panel -->
    <BulkActionsPanel
      :selected-count="selectedCount"
      :can-select-all="filteredMovies.length > selectedCount"
      @select-all="handleSelectAll"
      @clear-selection="handleClearSelection"
      @refresh-metadata="handleBulkRefreshMetadata"
      @auto-match="handleBulkAutoMatch"
      @rename="handleBulkRename"
      @delete="handleBulkDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { MediaItem } from '~/types/api';

const api = useApi();
const toast = useToast();
const { getTMDBImageUrl, parseGenres } = useFormatters();

const viewMode = ref<'grid' | 'list'>('grid');
const scanning = ref(false);
const moviesPathInput = ref('');
const savingPath = ref(false);

// Selection state
const {
  selectionMode,
  selectedCount,
  selectedIdsArray,
  selectAll,
  clearSelection,
  toggleSelectionMode,
  toggleRangeSelection,
  lastSelectedIndex
} = useMediaSelection();

// Range preview state
const rangePreviewHoverIndex = ref<number | null>(null);

// Listen to global media events for reactive updates
const mediaEvents = useMediaEvents();
mediaEvents.on('identified', (event) => {
  // Auto-refresh when any media item is identified
  refresh();
});
mediaEvents.on('deleted', (event) => {
  // Auto-refresh when any media item is deleted
  refresh();
});

// Check if index is in range preview
const isInRangePreview = (index: number) => {
  if (!selectionMode.value || rangePreviewHoverIndex.value === null || lastSelectedIndex.value === null) {
    return false;
  }
  
  const start = Math.min(lastSelectedIndex.value, rangePreviewHoverIndex.value);
  const end = Math.max(lastSelectedIndex.value, rangePreviewHoverIndex.value);
  
  return index >= start && index <= end;
};

// Handle range preview on hover
const handleRangeHover = (index: number) => {
  rangePreviewHoverIndex.value = index;
};

const handleRangeLeave = () => {
  rangePreviewHoverIndex.value = null;
};

// Handle range selection
const handleRangeSelect = (endIndex: number) => {
  if (lastSelectedIndex.value !== null) {
    toggleRangeSelection(lastSelectedIndex.value, endIndex, filteredMovies.value);
  }
  rangePreviewHoverIndex.value = null;
};

// Get route for URL params (declared later, but need it early for initialization)
const route = useRoute();

// Initialize filters from URL query params
const searchQuery = ref((route.query.q as string) || '');
const sortBy = ref((route.query.sort as string) || 'title');
const sortOrder = ref<'asc' | 'desc'>((route.query.order as 'asc' | 'desc') || 'asc');
const genreFilter = ref((route.query.genre as string) || '');
const yearFilter = ref((route.query.year as string) || '');
const qualityFilter = ref((route.query.quality as string) || '');
const showOnlyWithoutTMDB = ref(route.query.noTmdb === 'true');
const showOnlyMissingFile = ref(route.query.noFile === 'true');

// Sync filters to URL
watch([searchQuery, sortBy, sortOrder, genreFilter, yearFilter, qualityFilter, showOnlyWithoutTMDB, showOnlyMissingFile], () => {
  const query: Record<string, string> = {};
  
  if (searchQuery.value) query.q = searchQuery.value;
  if (sortBy.value !== 'title') query.sort = sortBy.value;
  if (sortOrder.value !== 'asc') query.order = sortOrder.value;
  if (genreFilter.value) query.genre = genreFilter.value;
  if (yearFilter.value) query.year = yearFilter.value;
  if (qualityFilter.value) query.quality = qualityFilter.value;
  if (showOnlyWithoutTMDB.value) query.noTmdb = 'true';
  if (showOnlyMissingFile.value) query.noFile = 'true';
  
  navigateTo({ query }, { replace: true });
}, { deep: true });

const activeFilterCount = computed(() => {
  let count = 0;
  if (genreFilter.value) count++;
  if (yearFilter.value) count++;
  if (qualityFilter.value) count++;
  if (showOnlyWithoutTMDB.value) count++;
  if (showOnlyMissingFile.value) count++;
  return count;
});

// Fetch settings to check if library is configured
const { data: settings } = await useAsyncData('settings-movies', async () => {
  try {
    return await api.apiFetch('/api/settings');
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return null;
});

const libraryConfigured = computed(() => {
  return settings.value?.moviesPath ? true : false;
});

// Fetch data
const { data: media, pending, error, refresh } = await useAsyncData(
  'movies-data',
  () => api.media.getAll()
);

const { data: allFiles } = await useAsyncData('all-files-movies', () => api.files.getAll());

const movies = computed(() => media.value?.filter((m) => m.type === 'movie') || []);

const genres = (m: MediaItem) => parseGenres(m.genres);

// Collect unique genres
const availableGenres = computed(() => {
  const genreSet = new Set<string>();
  movies.value.forEach((m) => {
    parseGenres(m.genres).forEach((g) => genreSet.add(g));
  });
  return [...genreSet].sort();
});

// Collect qualities from matched files
const filesByMedia = computed(() => {
  const map = new Map<number, any[]>();
  allFiles.value?.forEach((f: any) => {
    const mid = f.mediaItemId;
    if (mid != null) {
      if (!map.has(mid)) map.set(mid, []);
      map.get(mid)!.push(f);
    }
  });
  return map;
});

const availableQualities = computed(() => {
  const quals = new Set<string>();
  allFiles.value?.forEach((f) => {
    if (f.parsedQuality) quals.add(f.parsedQuality);
  });
  return [...quals].sort();
});

// Filtered + sorted
const filteredMovies = computed(() => {
  let filtered = [...movies.value];

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    filtered = filtered.filter((m) => m.title.toLowerCase().includes(q));
  }

  if (genreFilter.value) {
    filtered = filtered.filter((m) => parseGenres(m.genres).includes(genreFilter.value));
  }

  if (yearFilter.value) {
    const y = parseInt(yearFilter.value);
    if (!isNaN(y)) filtered = filtered.filter((m) => m.year === y);
  }

  if (qualityFilter.value) {
    filtered = filtered.filter((m) => {
      const mFiles = filesByMedia.value.get(m.id);
      return mFiles?.some((f) => f.parsedQuality === qualityFilter.value);
    });
  }

  if (showOnlyWithoutTMDB.value) {
    filtered = filtered.filter((m) => !m.tmdbId);
  }

  if (showOnlyMissingFile.value) {
    filtered = filtered.filter((m) => {
      const mFiles = filesByMedia.value.get(m.id);
      return !mFiles || mFiles.length === 0;
    });
  }

  const dir = sortOrder.value === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'title':
        return dir * a.title.localeCompare(b.title);
      case 'year':
        return dir * ((a.year || 0) - (b.year || 0));
      case 'rating':
        return dir * ((a.voteAverage || 0) - (b.voteAverage || 0));
      case 'added':
        return dir * (a.createdAt || '').localeCompare(b.createdAt || '');
      default:
        return 0;
    }
  });

  return filtered;
});

// Lazy loading with URL state
const itemsPerPage = ref(50);
const router = useRouter();

// Initialize from URL query param, default to 1
const currentPage = ref(
  route.query.page && !isNaN(Number(route.query.page)) 
    ? Math.max(1, Number(route.query.page))
    : 1
);

const gridContainer = ref<HTMLElement | null>(null);
const currentLetter = ref<string>('');

const displayedMovies = computed(() => {
  const end = currentPage.value * itemsPerPage.value;
  return filteredMovies.value.slice(0, end);
});

const hasMore = computed(() => {
  return displayedMovies.value.length < filteredMovies.value.length;
});

const loadMore = () => {
  currentPage.value++;
};

// Sync currentPage to URL
watch(currentPage, (newPage) => {
  router.replace({
    query: { ...route.query, page: newPage > 1 ? String(newPage) : undefined }
  });
});

// Alphabet scrolling
const getFirstLetter = (title: string): string => {
  const first = title.charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
};

const jumpToLetter = async (letter: string) => {
  currentLetter.value = letter;
  
  // Find index of first movie starting with this letter
  const targetIndex = filteredMovies.value.findIndex(movie => 
    getFirstLetter(movie.title) === letter
  );
  
  if (targetIndex === -1) {
    // No movies with this letter
    currentLetter.value = '';
    return;
  }
  
  // Calculate which page this item is on
  const targetPage = Math.ceil((targetIndex + 1) / itemsPerPage.value);
  
  // Load pages up to target if needed
  if (targetPage > currentPage.value) {
    currentPage.value = targetPage;
    // Wait for Vue to render the new items
    await nextTick();
    // Small delay to ensure DOM is updated
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Now find and scroll to the element
  const selector = letter === '#' 
    ? '[data-letter="#"]'
    : `[data-letter="${letter}"]`;
  
  const element = document.querySelector(selector) as HTMLElement;
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      currentLetter.value = '';
    }, 2000);
  }
};

// Reset pagination when filters change
watch([searchQuery, genreFilter, yearFilter, qualityFilter, showOnlyWithoutTMDB, sortBy, sortOrder], () => {
  currentPage.value = 1;
});

// Scan functionality
const handleScanClick = async () => {
  if (!libraryConfigured.value || !settings.value?.moviesPath) {
    toast.error('Please configure movies library path first');
    return;
  }
  
  scanning.value = true;
  try {
    const result = await api.files.scan(settings.value.moviesPath, 'movies');
    toast.success(`Scan complete: ${result.added} new movies found`);
    refresh();
  } catch (err: any) {
    toast.error(`Scan failed: ${err.message}`);
  } finally {
    scanning.value = false;
  }
};

// Save movies path
const saveMoviesPath = async () => {
  if (!moviesPathInput.value) return;
  
  savingPath.value = true;
  try {
    const response = await api.apiFetch('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ moviesPath: moviesPathInput.value }),
    });
    
    if (!response.ok) throw new Error('Failed to save settings');
    
    const updated = await response.json();
    settings.value = updated.settings;
    
    toast.success('Movies library path saved!');
    
    // Auto-scan after saving
    await handleScanClick();
  } catch (error: any) {
    toast.error(`Failed to save path: ${error.message}`);
  } finally {
    savingPath.value = false;
  }
};

// Bulk action handlers
const handleSelectAll = () => {
  selectAll(filteredMovies.value);
};

const handleClearSelection = () => {
  clearSelection();
  toggleSelectionMode(false);
};

const handleBulkRefreshMetadata = async () => {
  try {
    const ids = selectedIdsArray.value.map(Number);
    const result = await api.media.bulkRefreshMetadata(ids);
    
    console.log('✅ Bulk refresh result:', result);
    
    // Show results
    if (result.results.failed.length > 0) {
      console.warn('Some items failed:', result.results.failed);
    }
    
    alert(result.message);
    
    handleClearSelection();
    refresh();
  } catch (error: any) {
    console.error('Failed to refresh metadata:', error);
    alert(`Failed to refresh metadata: ${error.message || 'Unknown error'}`);
  }
};

const handleBulkAutoMatch = async () => {
  try {
    const ids = selectedIdsArray.value.map(Number);
    const result = await api.media.bulkAutoMatch(ids);
    
    console.log('✅ Bulk auto-match result:', result);
    
    if (result.results.failed.length > 0) {
      console.warn('Some items failed:', result.results.failed);
    }
    
    alert(result.message);
    
    handleClearSelection();
    refresh();
  } catch (error: any) {
    console.error('Failed to auto-match:', error);
    alert(`Failed to auto-match: ${error.message || 'Unknown error'}`);
  }
};

const handleBulkRename = async (pattern: string) => {
  try {
    const ids = selectedIdsArray.value.map(Number);
    const result = await api.media.bulkRename(ids, pattern);
    
    console.log('Bulk rename result:', result);
    alert('Bulk rename is not yet implemented. Stay tuned!');
    
    handleClearSelection();
    refresh();
  } catch (error: any) {
    console.error('Failed to rename:', error);
    alert(`Failed to rename: ${error.message || 'Unknown error'}`);
  }
};

const handleBulkDelete = async () => {
  try {
    const ids = selectedIdsArray.value.map(Number);
    const result = await api.media.bulkDelete(ids);
    
    console.log('✅ Bulk delete result:', result);
    
    if (result.results.failed.length > 0) {
      console.warn('Some items failed to delete:', result.results.failed);
    }
    
    alert(result.message);
    
    handleClearSelection();
    refresh();
  } catch (error: any) {
    console.error('Failed to delete:', error);
    alert(`Failed to delete: ${error.message || 'Unknown error'}`);
  }
};

useHead({ title: 'Movies - Unifarr' });
</script>
