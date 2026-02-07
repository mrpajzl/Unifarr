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
    >
      <template #extra-filter>
        <select v-model="statusFilter" class="input w-full">
          <option value="">All Statuses</option>
          <option value="Returning Series">Returning</option>
          <option value="Ended">Ended</option>
          <option value="Canceled">Canceled</option>
          <option value="In Production">In Production</option>
        </select>
      </template>
    </LibraryToolbar>

    <!-- Loading -->
    <div v-if="pending" class="flex justify-center py-16">
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
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
    >
      <MediaCard
        v-for="show in filteredShows"
        :key="show.id"
        :media="show"
      />
    </div>

    <!-- List View -->
    <div v-else class="space-y-2">
      <NuxtLink
        v-for="show in filteredShows"
        :key="show.id"
        :to="`/media/${show.id}`"
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

    <!-- Scan Modal -->
    <ScanLibrary v-model="showScan" @scanned="onScanned" />
  </div>
</template>

<script setup lang="ts">
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
const statusFilter = ref('');

// Fetch
const { data: media, pending, error, refresh } = await useAsyncData(
  'tv-shows-data',
  () => api.media.getAll()
);

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

useHead({ title: 'TV Shows - Unifarr' });
</script>
