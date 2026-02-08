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
      label="movies"
      v-model:search="searchQuery"
      v-model:sort-by="sortBy"
      v-model:sort-order="sortOrder"
      v-model:genre="genreFilter"
      v-model:year="yearFilter"
      :genres="availableGenres"
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
      </template>
    </LibraryToolbar>

    <!-- Loading -->
    <div v-if="pending" class="flex justify-center py-16">
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
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
    >
      <MediaCard
        v-for="movie in filteredMovies"
        :key="movie.id"
        :media="movie"
      />
    </div>

    <!-- List View -->
    <div v-else class="space-y-2">
      <NuxtLink
        v-for="movie in filteredMovies"
        :key="movie.id"
        :to="`/media/${movie.id}`"
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

    <!-- Scan Modal -->
    <ScanLibrary v-model="showScan" @scanned="onScanned" />
  </div>
</template>

<script setup lang="ts">
import type { MediaItem } from '~/types/api';

const api = useApi();
const { getTMDBImageUrl, parseGenres } = useFormatters();

const viewMode = ref<'grid' | 'list'>('grid');
const showScan = ref(false);

// Filters
const searchQuery = ref('');
const sortBy = ref('title');
const sortOrder = ref<'asc' | 'desc'>('asc');
const genreFilter = ref('');
const yearFilter = ref('');
const qualityFilter = ref('');
const showOnlyWithoutTMDB = ref(false);

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
  const map = new Map<number, typeof allFiles.value>();
  allFiles.value?.forEach((f) => {
    if (f.mediaItemId) {
      if (!map.has(f.mediaItemId)) map.set(f.mediaItemId, []);
      map.get(f.mediaItemId)!.push(f);
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

const onScanned = () => {
  refresh();
};

useHead({ title: 'Movies - Unifarr' });
</script>
