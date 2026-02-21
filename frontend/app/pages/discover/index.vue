<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold">Discover</h1>
      <p class="text-gray-500 mt-1">Browse trending content or search TMDB</p>
    </div>

    <!-- Search Box -->
    <div class="card p-4 mb-6">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="flex-1 relative">
          <Icon name="mdi:magnify" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search TMDB for movies or TV shows..."
            class="input w-full pl-10"
            @keyup.enter="handleSearch"
            @input="handleAutocomplete"
            @focus="showSuggestions = true"
            @blur="hideSuggestionsDelayed"
          />
          
          <!-- Autocomplete Suggestions -->
          <Transition
            enter-active-class="transition-all duration-150 ease-out"
            leave-active-class="transition-all duration-100 ease-in"
            enter-from-class="opacity-0 scale-95 -translate-y-1"
            leave-to-class="opacity-0 scale-95 -translate-y-1"
          >
            <div
              v-if="showSuggestions && suggestions.length > 0"
              class="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-h-96 overflow-y-auto z-50"
            >
              <NuxtLink
                v-for="suggestion in suggestions"
                :key="suggestion.id"
                :to="getSuggestionUrl(suggestion)"
                @click="selectSuggestion(suggestion)"
                class="flex items-center gap-3 p-3 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
              >
                <!-- Poster -->
                <div class="w-12 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-900">
                  <img
                    v-if="suggestion.poster_path"
                    :src="getTMDBImageUrl(suggestion.poster_path, 'w92')"
                    :alt="suggestion.title || suggestion.name"
                    class="w-full h-full object-cover"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center">
                    <Icon name="mdi:image-off" class="w-4 h-4 text-gray-600" />
                  </div>
                </div>
                
                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-white truncate">
                    {{ suggestion.title || suggestion.name }}
                  </p>
                  <div class="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span v-if="getYear(suggestion)">{{ getYear(suggestion) }}</span>
                    <span class="px-1.5 py-0.5 bg-gray-900 rounded uppercase font-medium">
                      {{ suggestion.media_type || (suggestion.title ? 'movie' : 'tv') }}
                    </span>
                    <span v-if="suggestion.vote_average" class="flex items-center gap-0.5">
                      <Icon name="mdi:star" class="w-3 h-3 text-yellow-400" />
                      {{ suggestion.vote_average.toFixed(1) }}
                    </span>
                  </div>
                </div>
                
                <!-- Arrow -->
                <Icon name="mdi:chevron-right" class="w-5 h-5 text-gray-500 flex-shrink-0" />
              </NuxtLink>
              
              <!-- Loading -->
              <div v-if="loadingSuggestions" class="p-4 text-center">
                <Icon name="mdi:loading" class="w-5 h-5 animate-spin text-gray-500 mx-auto" />
              </div>
            </div>
          </Transition>
        </div>
        <button
          @click="handleSearch"
          :disabled="searching || !searchQuery.trim()"
          class="btn btn-primary px-6"
        >
          <Icon
            :name="searching ? 'mdi:loading' : 'mdi:magnify'"
            :class="{ 'animate-spin': searching }"
            class="w-5 h-5 mr-2"
          />
          Search
        </button>
        <button
          v-if="searchMode"
          @click="clearSearch"
          class="btn btn-secondary"
        >
          <Icon name="mdi:close" class="w-5 h-5 mr-2" />
          Clear
        </button>
      </div>

      <!-- Search Type Filter -->
      <div v-if="searchMode" class="flex gap-2 mt-3">
        <button
          v-for="tab in searchTabs"
          :key="tab.value"
          @click="searchType = tab.value; handleSearch()"
          :class="[
            'px-3 py-1 rounded-full text-sm transition-colors',
            searchType === tab.value
              ? 'bg-primary-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white',
          ]"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Category Tabs (Browse Mode Only) -->
    <div v-if="!searchMode" class="flex gap-2 mb-6 overflow-x-auto pb-2">
      <button
        v-for="cat in categories"
        :key="cat.id"
        @click="activeCategory = cat.id"
        class="btn btn-sm flex-shrink-0"
        :class="activeCategory === cat.id ? 'btn-primary' : 'btn-secondary'"
      >
        <Icon :name="cat.icon" class="w-4 h-4 mr-1.5" />
        {{ cat.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading || searching" class="flex justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <Icon name="mdi:loading" class="w-8 h-8 animate-spin text-primary-500" />
        <span class="text-sm text-gray-500">{{ searching ? 'Searching TMDB...' : 'Loading...' }}</span>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card p-8 text-center">
      <Icon name="mdi:alert-circle" class="w-12 h-12 mx-auto mb-3 text-red-500" />
      <p class="font-medium text-red-400">Failed to load content</p>
      <button @click="fetchContent" class="btn btn-secondary btn-sm mt-4">Try Again</button>
    </div>

    <!-- Content Grid -->
    <div v-else-if="items.length" class="space-y-8">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        <DiscoverCard
          v-for="item in items"
          :key="item.id"
          :item="item"
        />
      </div>

      <!-- Load More -->
      <div v-if="canLoadMore" class="flex justify-center">
        <button
          @click="loadMore"
          :disabled="loadingMore"
          class="btn btn-secondary"
        >
          <Icon
            :name="loadingMore ? 'mdi:loading' : 'mdi:chevron-down'"
            :class="{ 'animate-spin': loadingMore }"
            class="w-5 h-5 mr-2"
          />
          {{ loadingMore ? 'Loading...' : 'Load More' }}
        </button>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="card p-12 text-center">
      <Icon name="mdi:movie-open" class="w-16 h-16 mx-auto mb-4 text-gray-600" />
      <p class="text-gray-400">No content found</p>
    </div>

    <!-- Person Details Modal -->
    <PersonDetailsModal
      :show="showPersonModal"
      :person-id="selectedPersonId"
      @close="closePersonDetails"
      @open-media="openMediaFromPerson"
    />
  </div>
</template>

<script setup lang="ts">
import type { TMDBSearchResult } from '~/types/api';

const api = useApi();
const toast = useToast();
const { getTMDBImageUrl } = useFormatters();

interface Category {
  id: string;
  label: string;
  icon: string;
  endpoint: string;
}

const categories: Category[] = [
  { id: 'trending-movies', label: 'Trending Movies', icon: 'mdi:fire', endpoint: '/api/discover/trending/movie/week' },
  { id: 'trending-tv', label: 'Trending TV', icon: 'mdi:fire', endpoint: '/api/discover/trending/tv/week' },
  { id: 'popular-movies', label: 'Popular Movies', icon: 'mdi:star', endpoint: '/api/discover/popular/movies' },
  { id: 'popular-tv', label: 'Popular TV', icon: 'mdi:television', endpoint: '/api/discover/popular/tv' },
  { id: 'top-rated-movies', label: 'Top Rated Movies', icon: 'mdi:trophy', endpoint: '/api/discover/top-rated/movies' },
  { id: 'top-rated-tv', label: 'Top Rated TV', icon: 'mdi:trophy', endpoint: '/api/discover/top-rated/tv' },
  { id: 'now-playing', label: 'In Theaters', icon: 'mdi:theater', endpoint: '/api/discover/now-playing' },
  { id: 'upcoming', label: 'Upcoming', icon: 'mdi:calendar-clock', endpoint: '/api/discover/upcoming' },
];

const activeCategory = ref('trending-movies');
const items = ref<TMDBSearchResult[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const error = ref(false);
const currentPage = ref(1);
const totalPages = ref(1);
const showPersonModal = ref(false);
const selectedPersonId = ref<number | undefined>(undefined);

// Search
const searchQuery = ref('');
const searchType = ref<'multi' | 'movies' | 'tv'>('multi');
const searching = ref(false);
const searchMode = ref(false);

// Autocomplete
const suggestions = ref<TMDBSearchResult[]>([]);
const loadingSuggestions = ref(false);
const showSuggestions = ref(false);
let autocompleteTimeout: ReturnType<typeof setTimeout> | null = null;

const searchTabs = [
  { label: 'All', value: 'multi' as const },
  { label: 'Movies', value: 'movies' as const },
  { label: 'TV Shows', value: 'tv' as const },
];

const canLoadMore = computed(() => !searchMode.value && currentPage.value < totalPages.value);

const fetchContent = async (page = 1) => {
  const isLoadMore = page > 1;
  if (isLoadMore) {
    loadingMore.value = true;
  } else {
    loading.value = true;
    items.value = [];
    currentPage.value = 1;
  }
  error.value = false;

  try {
    const category = categories.find(c => c.id === activeCategory.value);
    if (!category) return;

    const config = useRuntimeConfig();
    const url = `${config.public.apiBase}${category.endpoint}${category.endpoint.includes('?') ? '&' : '?'}page=${page}`;
    console.log('Fetching:', url, 'Page:', page);
    const data = await $fetch<{ results: TMDBSearchResult[]; page: number; total_pages: number }>(url);
    console.log('Response page:', data.page, 'Total pages:', data.total_pages, 'Results:', data.results.length);

    if (isLoadMore) {
      // Check for duplicates before adding
      const existingIds = new Set(items.value.map(i => i.id));
      const newItems = data.results.filter(r => !existingIds.has(r.id));
      console.log('Existing items:', items.value.length, 'New items:', data.results.length, 'After dedup:', newItems.length);
      items.value = [...items.value, ...newItems];
    } else {
      items.value = data.results;
    }

    currentPage.value = data.page;
    totalPages.value = data.total_pages;
  } catch (err) {
    console.error('Fetch error:', err);
    error.value = true;
    toast.error('Failed to load content');
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const loadMore = () => {
  fetchContent(currentPage.value + 1);
};

const handleSearch = async () => {
  const q = searchQuery.value.trim();
  if (!q) return;

  // Update URL with search params
  await router.push({
    query: {
      q,
      type: searchType.value,
    },
  });

  searching.value = true;
  searchMode.value = true;
  error.value = false;
  
  try {
    let results;
    
    if (searchType.value === 'movies') {
      const data = await api.apiFetch<{ results: TMDBSearchResult[] }>(`/api/search/tmdb/movie?query=${encodeURIComponent(q)}`);
      results = data.results;
    } else if (searchType.value === 'tv') {
      const data = await api.apiFetch<{ results: TMDBSearchResult[] }>(`/api/search/tmdb/tv?query=${encodeURIComponent(q)}`);
      results = data.results;
    } else {
      const data = await api.apiFetch<{ results: TMDBSearchResult[] }>(`/api/search/tmdb/multi?query=${encodeURIComponent(q)}`);
      results = data.results;
    }
    
    items.value = results;
  } catch (err) {
    console.error('Search error:', err);
    error.value = true;
    toast.error('Search failed');
  } finally {
    searching.value = false;
  }
};

const clearSearch = () => {
  searchQuery.value = '';
  searchMode.value = false;
  searchType.value = 'multi';
  suggestions.value = [];
  showSuggestions.value = false;
  
  // Clear URL params
  router.push({ query: {} });
  
  fetchContent();
};

const handleAutocomplete = () => {
  const q = searchQuery.value.trim();
  
  // Clear timeout
  if (autocompleteTimeout) {
    clearTimeout(autocompleteTimeout);
  }
  
  // Clear suggestions if query is too short
  if (q.length < 2) {
    suggestions.value = [];
    showSuggestions.value = false;
    return;
  }
  
  // Debounce - wait 300ms after user stops typing
  autocompleteTimeout = setTimeout(async () => {
    loadingSuggestions.value = true;
    showSuggestions.value = true;
    
    try {
      const config = useRuntimeConfig();
      const data = await $fetch<{ results: TMDBSearchResult[] }>(
        `${config.public.apiBase}/api/search/tmdb/multi?query=${encodeURIComponent(q)}`
      );
      suggestions.value = data.results.slice(0, 8); // Limit to 8 suggestions
    } catch (err) {
      console.error('Autocomplete error:', err);
      suggestions.value = [];
    } finally {
      loadingSuggestions.value = false;
    }
  }, 300);
};

const hideSuggestionsDelayed = () => {
  // Delay to allow click on suggestion
  setTimeout(() => {
    showSuggestions.value = false;
  }, 200);
};

const selectSuggestion = (suggestion: TMDBSearchResult) => {
  searchQuery.value = suggestion.title || suggestion.name || '';
  showSuggestions.value = false;
  suggestions.value = [];
};

const getSuggestionUrl = (suggestion: TMDBSearchResult) => {
  const type = suggestion.media_type || (suggestion.title ? 'movie' : 'tv');
  return `/media/tmdb?type=${type}&id=${suggestion.id}`;
};

const getYear = (item: TMDBSearchResult) => {
  const date = item.release_date || item.first_air_date;
  return date ? new Date(date).getFullYear() : null;
};

const router = useRouter();

const openPerson = (personId: number) => {
  selectedPersonId.value = personId;
  showPersonModal.value = true;
};

const closePersonDetails = () => {
  showPersonModal.value = false;
  selectedPersonId.value = undefined;
};

// Note: Person modal can still open person details as modal
// since it's a secondary feature

const openMediaFromPerson = (item: any) => {
  // Close person modal
  showPersonModal.value = false;
  selectedPersonId.value = undefined;
  
  // Navigate to unified media details page
  const type = item.media_type || (item.title ? 'movie' : 'tv');
  router.push(`/media/tmdb?type=${type}&id=${item.id}`);
};

// Watch category changes
watch(activeCategory, () => {
  currentPage.value = 1;
  fetchContent();
});

// Load search from URL on mount or route change
const loadFromUrl = async () => {
  const route = useRoute();
  const q = route.query.q as string;
  const type = route.query.type as string;
  
  if (q) {
    // Restore search state from URL
    searchQuery.value = q;
    searchType.value = (type || 'multi') as 'multi' | 'movies' | 'tv';
    
    // Trigger search without updating URL again
    searching.value = true;
    searchMode.value = true;
    error.value = false;
    
    try {
      let results;
      
      if (searchType.value === 'movies') {
        const data = await api.apiFetch<{ results: TMDBSearchResult[] }>(`/api/search/tmdb/movie?query=${encodeURIComponent(q)}`);
        results = data.results;
      } else if (searchType.value === 'tv') {
        const data = await api.apiFetch<{ results: TMDBSearchResult[] }>(`/api/search/tmdb/tv?query=${encodeURIComponent(q)}`);
        results = data.results;
      } else {
        const data = await api.apiFetch<{ results: TMDBSearchResult[] }>(`/api/search/tmdb/multi?query=${encodeURIComponent(q)}`);
        results = data.results;
      }
      
      items.value = results;
    } catch (err) {
      console.error('Search error:', err);
      error.value = true;
    } finally {
      searching.value = false;
    }
  } else {
    // No search in URL - fetch default content
    fetchContent();
  }
};

// Initial fetch
onMounted(() => {
  loadFromUrl();
});

// Watch route query changes (back/forward navigation)
watch(() => useRoute().query, () => {
  loadFromUrl();
});

// Cleanup
onUnmounted(() => {
  if (autocompleteTimeout) {
    clearTimeout(autocompleteTimeout);
  }
});

useHead({ title: 'Discover - Unifarr' });
</script>
