<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">TV Shows</h1>
        <p class="text-sm text-gray-500 mt-0.5">
          {{ filteredShows.length }} of {{ tvShows.length }} shows
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="showScan = true" class="btn btn-secondary btn-sm">
          <Icon name="mdi:folder-search" class="w-4 h-4 mr-1.5" />
          Scan
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
      label="TV shows"
      v-model:search="searchQuery"
      v-model:sort-by="sortBy"
      v-model:sort-order="sortOrder"
      v-model:genre="genreFilter"
      v-model:year="yearFilter"
      :genres="availableGenres"
      :active-filters="activeFilterCount"
    >
      <template #extra-filter>
        <select v-model="statusFilter" class="input w-full">
          <option value="">All Statuses</option>
          <option value="Returning Series">Returning</option>
          <option value="Ended">Ended</option>
          <option value="Canceled">Canceled</option>
          <option value="In Production">In Production</option>
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
    <div v-if="!libraryConfigured" class="card p-12 text-center">
      <Icon name="mdi:folder-alert-outline" class="w-16 h-16 mx-auto mb-4 text-yellow-500" />
      <h3 class="text-xl font-semibold mb-2">TV shows library not configured</h3>
      <p class="text-gray-400 mb-6">Please configure the TV shows library path in settings to start using this feature</p>
      <NuxtLink to="/settings/libraries" class="btn btn-primary">
        <Icon name="mdi:cog" class="w-5 h-5 mr-2" />
        Configure Library
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-else-if="pending" class="flex justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <Icon name="mdi:loading" class="w-8 h-8 animate-spin text-primary-500" />
        <span class="text-sm text-gray-500">Loading TV shows...</span>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card p-8 text-center">
      <Icon name="mdi:alert-circle" class="w-12 h-12 mx-auto mb-3 text-red-500" />
      <p class="font-medium text-red-400">Failed to load TV shows</p>
      <p class="text-sm text-gray-500 mt-1">{{ error.message }}</p>
      <button @click="refresh" class="btn btn-secondary btn-sm mt-4">Try Again</button>
    </div>

    <!-- Empty -->
    <div v-else-if="!filteredShows.length && !searchQuery && !genreFilter && !yearFilter && !statusFilter" class="card p-12 text-center">
      <Icon name="mdi:television" class="w-16 h-16 mx-auto mb-4 text-gray-600" />
      <h3 class="text-xl font-semibold mb-2">No TV shows yet</h3>
      <p class="text-gray-400 mb-6">Start by scanning your library or adding shows from TMDB</p>
      <div class="flex justify-center gap-3">
        <button @click="showScan = true" class="btn btn-secondary">
          <Icon name="mdi:folder-search" class="w-5 h-5 mr-2" />
          Scan Library
        </button>
        <NuxtLink to="/discover" class="btn btn-primary">
          <Icon name="mdi:magnify" class="w-5 h-5 mr-2" />
          Search TMDB
        </NuxtLink>
      </div>
    </div>

    <!-- No results -->
    <div v-else-if="!filteredShows.length" class="card p-8 text-center">
      <Icon name="mdi:magnify" class="w-12 h-12 mx-auto mb-3 text-gray-600" />
      <p class="font-medium">No shows match your filters</p>
      <button
        @click="searchQuery = ''; genreFilter = ''; yearFilter = ''; statusFilter = ''"
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
        v-for="(show, index) in displayedShows"
        :key="show.id"
        :media="show"
        :index="index"
        :data-letter="getFirstLetter(show.title)"
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
        Load More ({{ filteredShows.length - displayedShows.length }} remaining)
      </button>
    </div>

    <!-- List View -->
    <div v-else-if="viewMode === 'list'" class="space-y-2">
      <NuxtLink
        v-for="show in displayedShows"
        :key="show.id"
        :to="`/media/${show.id}`"
        :data-letter="getFirstLetter(show.title)"
        class="card p-3 flex items-center gap-4 hover:border-primary-500/50 transition-colors group"
      >
        <div class="w-12 h-[72px] rounded overflow-hidden bg-gray-800 flex-shrink-0">
          <img
            v-if="show.posterPath"
            :src="getTMDBImageUrl(show.posterPath, 'w200')"
            :alt="show.title"
            class="w-full h-full object-cover"
            loading="lazy"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-gray-600">
            <Icon name="mdi:image-off" class="w-5 h-5" />
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <h3 class="font-medium truncate group-hover:text-primary-400 transition-colors">{{ show.title }}</h3>
          <div class="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
            <span v-if="show.year">{{ show.year }}</span>
            <span v-if="show.numberOfSeasons">
              {{ show.numberOfSeasons }} Season{{ show.numberOfSeasons !== 1 ? 's' : '' }}
            </span>
            <span v-if="show.voteAverage" class="flex items-center gap-1">
              <Icon name="mdi:star" class="w-3.5 h-3.5 text-yellow-400" />
              {{ show.voteAverage.toFixed(1) }}
            </span>
            <span
              v-if="show.status"
              :class="[
                'px-1.5 py-0.5 text-xs rounded',
                show.status === 'Returning Series' ? 'bg-green-600/20 text-green-400' :
                show.status === 'Ended' ? 'bg-gray-600/20 text-gray-400' :
                'bg-yellow-600/20 text-yellow-400'
              ]"
            >
              {{ show.status }}
            </span>
          </div>
        </div>

        <Icon name="mdi:chevron-right" class="w-5 h-5 text-gray-600 flex-shrink-0" />
      </NuxtLink>
    </div>

    <!-- Alphabet Scrollbar -->
    <ClientOnly>
      <AlphabetScrollbar
        v-if="filteredShows.length > 20"
        :current-letter="currentLetter"
        @jump="jumpToLetter"
      />
    </ClientOnly>

    <!-- Scan Modal -->
    <ClientOnly>
      <ScanLibrary v-model="showScan" @scanned="onScanned" />
    </ClientOnly>

    <!-- Bulk Actions Panel -->
    <BulkActionsPanel
      :selected-count="selectedCount"
      :can-select-all="filteredShows.length > selectedCount"
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
const api = useApi();
const { getTMDBImageUrl, parseGenres } = useFormatters();

const viewMode = ref<'grid' | 'list'>('grid');
const showScan = ref(false);

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
    toggleRangeSelection(lastSelectedIndex.value, endIndex, filteredShows.value);
  }
  rangePreviewHoverIndex.value = null;
};

// Filters
const searchQuery = ref('');
const sortBy = ref('title');
const sortOrder = ref<'asc' | 'desc'>('asc');
const genreFilter = ref('');
const yearFilter = ref('');
const statusFilter = ref('');
const showOnlyWithoutTMDB = ref(false);
const showOnlyMissingFile = ref(false);

const activeFilterCount = computed(() => {
  let count = 0;
  if (genreFilter.value) count++;
  if (yearFilter.value) count++;
  if (statusFilter.value) count++;
  if (showOnlyWithoutTMDB.value) count++;
  if (showOnlyMissingFile.value) count++;
  return count;
});

// Fetch settings to check if library is configured
const { data: settings } = await useAsyncData('settings-tv', async () => {
  try {
    const config = useRuntimeConfig();
    const response = await fetch(`${config.public.apiBase}/api/settings`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return null;
});

const libraryConfigured = computed(() => {
  return settings.value?.tvPath ? true : false;
});

// Fetch
const { data: media, pending, error, refresh } = await useAsyncData(
  'tv-shows-data',
  () => api.media.getAll()
);

const { data: allFiles } = await useAsyncData('all-files-tv', () => api.files.getAll());

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

const tvShows = computed(() => media.value?.filter((m) => m.type === 'tv') || []);

// Genres
const availableGenres = computed(() => {
  const genreSet = new Set<string>();
  tvShows.value.forEach((m) => {
    parseGenres(m.genres).forEach((g) => genreSet.add(g));
  });
  return [...genreSet].sort();
});

// Filtered + sorted
const filteredShows = computed(() => {
  let filtered = [...tvShows.value];

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

  if (statusFilter.value) {
    filtered = filtered.filter((m) => m.status === statusFilter.value);
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

// Lazy loading
const itemsPerPage = ref(50);
const currentPage = ref(1);
const gridContainer = ref<HTMLElement | null>(null);
const currentLetter = ref<string>('');

const displayedShows = computed(() => {
  const end = currentPage.value * itemsPerPage.value;
  return filteredShows.value.slice(0, end);
});

const hasMore = computed(() => {
  return displayedShows.value.length < filteredShows.value.length;
});

const loadMore = () => {
  currentPage.value++;
};

// Alphabet scrolling
const getFirstLetter = (title: string): string => {
  const first = title.charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
};

const jumpToLetter = async (letter: string) => {
  currentLetter.value = letter;
  
  // Find index of first show starting with this letter
  const targetIndex = filteredShows.value.findIndex(show => 
    getFirstLetter(show.title) === letter
  );
  
  if (targetIndex === -1) {
    // No shows with this letter
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
watch([searchQuery, genreFilter, yearFilter, showOnlyWithoutTMDB, sortBy, sortOrder], () => {
  currentPage.value = 1;
});

const onScanned = () => {
  refresh();
};

// Bulk action handlers
const handleSelectAll = () => {
  selectAll(filteredShows.value);
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

useHead({ title: 'TV Shows - Unifarr' });
</script>
