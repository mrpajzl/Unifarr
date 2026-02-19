<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 overflow-y-auto"
      @click.self="close"
    >
      <div class="card p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-2xl font-semibold flex items-center gap-2">
            <Icon name="mdi:magnify" class="w-6 h-6 text-primary-500" />
            Search for {{ mediaType === 'movie' ? 'Movie' : 'TV Show' }}
          </h3>
          <button @click="close" class="text-gray-400 hover:text-white transition-colors">
            <Icon name="mdi:close" class="w-6 h-6" />
          </button>
        </div>

        <!-- Search Input -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-400 mb-2">
            Search Query
          </label>
          <div class="flex gap-2">
            <input
              v-model="searchQuery"
              type="text"
              class="input flex-1"
              placeholder="Enter search query..."
              @keyup.enter="performSearch"
            />
            <button
              v-if="manualQueryEdit && props.mediaData?.tmdbId"
              @click="resetToTemplates"
              class="btn btn-secondary"
              title="Reset to template search"
            >
              <Icon name="mdi:restore" class="w-5 h-5" />
            </button>
            <button
              @click="performSearch"
              :disabled="searching || !searchQuery.trim()"
              class="btn btn-primary"
            >
              <Icon
                :name="searching ? 'mdi:loading' : 'mdi:magnify'"
                :class="{ 'animate-spin': searching }"
                class="w-5 h-5 mr-2"
              />
              Search
            </button>
          </div>
          <div class="flex items-center justify-between mt-1">
            <p class="text-xs text-gray-500">
              Original query: <span class="font-mono text-gray-400">{{ initialQuery }}</span>
            </p>
            <p v-if="manualQueryEdit" class="text-xs text-yellow-400 flex items-center gap-1">
              <Icon name="mdi:pencil" class="w-3 h-3" />
              Manual override
            </p>
          </div>
          
          <!-- Used Queries Info -->
          <div v-if="usedQueries.length > 0 && !manualQueryEdit" class="mt-3 p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg">
            <div class="flex items-start gap-2">
              <Icon name="mdi:text-search" class="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-blue-400 mb-1">
                  {{ usedQueries.length }} Search {{ usedQueries.length === 1 ? 'Query' : 'Queries' }} Used
                  <span v-if="usedOverride" class="ml-1 px-1.5 py-0.5 bg-orange-600/20 text-orange-400 rounded text-[10px] font-medium">
                    CUSTOM
                  </span>
                </p>
                <div class="space-y-1">
                  <p
                    v-for="(query, index) in usedQueries"
                    :key="index"
                    class="text-xs text-gray-400 font-mono truncate"
                    :title="query"
                  >
                    {{ index + 1 }}. {{ query }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="searching" class="flex justify-center py-8">
          <Icon name="mdi:loading" class="w-8 h-8 animate-spin text-primary-500" />
        </div>

        <!-- Error -->
        <div v-else-if="error" class="card p-4 bg-red-600/10 border-red-600/50 text-red-400 mb-4">
          <Icon name="mdi:alert-circle" class="w-5 h-5 inline mr-2" />
          {{ error }}
        </div>

        <!-- Results -->
        <div v-else-if="results.length > 0">
          <div class="flex items-center justify-between mb-3">
            <div>
              <p class="text-sm text-gray-400">
                Showing {{ filteredAndSortedResults.length }} of {{ results.length }} result{{ results.length !== 1 ? 's' : '' }}
                <span v-if="providerCount" class="text-gray-500">
                  from {{ providerCount }} provider{{ providerCount !== 1 ? 's' : '' }}
                </span>
              </p>
              <p v-if="rawTotal && rawTotal > results.length" class="text-xs text-gray-500 mt-0.5">
                Filtered {{ rawTotal - results.length }} low-quality results
              </p>
            </div>
          </div>

          <!-- Filter and Sort Controls -->
          <div class="flex items-center gap-3 mb-3 p-3 bg-gray-800/50 rounded-lg">
            <div class="flex items-center gap-2">
              <label class="text-xs text-gray-400 whitespace-nowrap">Provider:</label>
              <select v-model="providerFilter" class="input input-sm text-sm">
                <option value="all">All Providers</option>
                <option v-for="provider in availableProviders" :key="provider" :value="provider">
                  {{ provider }}
                </option>
              </select>
            </div>
            
            <div class="flex items-center gap-2">
              <label class="text-xs text-gray-400 whitespace-nowrap">Sort by:</label>
              <select v-model="sortBy" class="input input-sm text-sm">
                <option value="matchScore">Match Score</option>
                <option value="size">Size</option>
                <option value="seeders">Seeders</option>
              </select>
            </div>
            
            <button
              @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
              class="btn btn-secondary btn-sm"
              :title="sortOrder === 'asc' ? 'Ascending' : 'Descending'"
            >
              <Icon
                :name="sortOrder === 'asc' ? 'mdi:sort-ascending' : 'mdi:sort-descending'"
                class="w-4 h-4"
              />
            </button>
          </div>

          <div class="space-y-2 max-h-96 overflow-y-auto">
            <div
              v-for="(result, index) in filteredAndSortedResults"
              :key="index"
              class="card p-4 hover:border-primary-500/50 transition-colors"
            >
              <!-- Title and Match Score -->
              <div class="flex items-center gap-2 mb-2">
                <h4 class="font-medium text-sm truncate flex-1">{{ result.title }}</h4>
                <span
                  v-if="result.matchScore"
                  class="px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0"
                  :class="getScoreColor(result.matchScore)"
                  :title="`Match score: ${result.matchScore}%`"
                >
                  {{ Math.round(result.matchScore) }}%
                </span>
              </div>

              <!-- Metrics Row -->
              <div class="flex items-center gap-4 mb-3">
                <!-- Size -->
                <div v-if="result.size" class="flex items-center gap-1.5">
                  <Icon name="mdi:harddisk" class="w-4 h-4 text-gray-500" />
                  <span class="text-sm font-medium text-gray-300">{{ formatSize(result.size) }}</span>
                </div>

                <!-- Quality Badge -->
                <span v-if="result.quality" class="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs font-medium">
                  {{ result.quality }}
                </span>

                <!-- Provider Badge -->
                <span class="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs font-medium">
                  {{ result.provider }}
                </span>

                <div class="flex-1" />

                <!-- Torrent Health (only for non-Webshare) -->
                <div v-if="result.provider !== 'Webshare'" class="flex items-center gap-3">
                  <!-- Seeders -->
                  <div class="flex items-center gap-1.5" :title="`${result.seeders || 0} seeders`">
                    <Icon name="mdi:upload" class="w-4 h-4 text-green-400" />
                    <span class="text-sm font-semibold" :class="getSeedersColor(result.seeders)">
                      {{ result.seeders || 0 }}
                    </span>
                  </div>

                  <!-- Leechers -->
                  <div class="flex items-center gap-1.5" :title="`${result.leechers || 0} leechers`">
                    <Icon name="mdi:download" class="w-4 h-4 text-red-400" />
                    <span class="text-sm font-semibold text-red-400">
                      {{ result.leechers || 0 }}
                    </span>
                  </div>

                  <!-- Health Bar -->
                  <div class="w-16 h-2 bg-gray-800 rounded-full overflow-hidden" :title="getHealthTooltip(result)">
                    <div
                      class="h-full transition-all"
                      :class="getHealthColor(result)"
                      :style="{ width: getHealthWidth(result) }"
                    />
                  </div>
                </div>

                <!-- Webshare indicator -->
                <div v-else class="flex items-center gap-1.5 text-primary-400">
                  <Icon name="mdi:lightning-bolt" class="w-4 h-4" />
                  <span class="text-xs font-medium">Direct</span>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-2">
                <a
                  v-if="result.infoUrl"
                  :href="result.infoUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-secondary btn-sm"
                  title="View on source website"
                >
                  <Icon name="mdi:open-in-new" class="w-4 h-4" />
                </a>
                <button
                  @click="selectResult(result, index)"
                  :disabled="downloading.has(index)"
                  class="btn btn-primary btn-sm"
                >
                  <Icon
                    :name="downloading.has(index) ? 'mdi:loading' : 'mdi:download'"
                    :class="{ 'animate-spin': downloading.has(index) }"
                    class="w-4 h-4"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!searching && searched" class="card p-8 text-center text-gray-500">
          <Icon name="mdi:magnify-close" class="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p class="text-sm">No results found for "{{ searchQuery }}"</p>
          <p class="text-xs text-gray-600 mt-1">Try adjusting your search query</p>
        </div>

        <!-- Initial State -->
        <div v-else class="card p-8 text-center text-gray-500">
          <Icon name="mdi:magnify" class="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p class="text-sm">Enter a search query to find torrents</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick } from 'vue';
import type { TorrentResult } from '~/types/api';

interface Props {
  modelValue: boolean;
  initialQuery: string;
  mediaType: 'movie' | 'tv';
  mediaId?: number;
  mediaData?: {
    tmdbId: number;
    title: string;
    originalTitle?: string;
    releaseYear?: number;
    imdbId?: string;
    // TV specific
    season?: number;
    episode?: number;
    episodeTitle?: string;
  };
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'download', result: TorrentResult): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const api = useApi();
const toast = useToast();

const searchQuery = ref(props.initialQuery);
const searching = ref(false);
const searched = ref(false);
const results = ref<TorrentResult[]>([]);
const error = ref('');
const providerCount = ref(0);
const rawTotal = ref(0);
const downloading = ref(new Set<number>());
const usedQueries = ref<string[]>([]);
const usedOverride = ref(false);
const manualQueryEdit = ref(false);

// Sorting and filtering
const sortBy = ref<'matchScore' | 'size' | 'seeders'>('matchScore');
const sortOrder = ref<'asc' | 'desc'>('desc');
const providerFilter = ref<string>('all');

// Watch for manual query edits
watch(searchQuery, (newVal) => {
  if (newVal !== props.initialQuery && searched.value === false) {
    manualQueryEdit.value = true;
  }
});

// Get unique providers from results
const availableProviders = computed(() => {
  const providers = new Set(results.value.map(r => r.provider));
  return Array.from(providers).sort();
});

// Filtered and sorted results
const filteredAndSortedResults = computed(() => {
  let filtered = [...results.value];
  
  // Apply provider filter
  if (providerFilter.value !== 'all') {
    filtered = filtered.filter(r => r.provider === providerFilter.value);
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    let valA: number, valB: number;
    
    switch (sortBy.value) {
      case 'size':
        valA = a.size || 0;
        valB = b.size || 0;
        break;
      case 'seeders':
        valA = a.seeders || 0;
        valB = b.seeders || 0;
        break;
      case 'matchScore':
      default:
        valA = a.matchScore || 0;
        valB = b.matchScore || 0;
        break;
    }
    
    return sortOrder.value === 'asc' ? valA - valB : valB - valA;
  });
  
  return filtered;
});

// Format file size
const formatSize = (bytes: number): string => {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
};

// Get color for match score
const getScoreColor = (score: number): string => {
  if (score >= 80) return 'bg-green-600/20 text-green-400'; // Excellent
  if (score >= 60) return 'bg-blue-600/20 text-blue-400';   // Good
  if (score >= 40) return 'bg-yellow-600/20 text-yellow-400'; // Fair
  return 'bg-gray-700/50 text-gray-400'; // Poor
};

// Get color for seeders count
const getSeedersColor = (seeders: number = 0): string => {
  if (seeders >= 100) return 'text-green-400';
  if (seeders >= 50) return 'text-green-500';
  if (seeders >= 10) return 'text-yellow-400';
  if (seeders >= 1) return 'text-orange-400';
  return 'text-red-400';
};

// Get health bar width (based on seeder ratio)
const getHealthWidth = (result: TorrentResult): string => {
  const seeders = result.seeders || 0;
  const leechers = result.leechers || 0;
  const total = seeders + leechers;
  
  if (total === 0) return '0%';
  
  const ratio = (seeders / total) * 100;
  return `${Math.min(100, ratio)}%`;
};

// Get health bar color
const getHealthColor = (result: TorrentResult): string => {
  const seeders = result.seeders || 0;
  const leechers = result.leechers || 0;
  const total = seeders + leechers;
  
  if (total === 0) return 'bg-gray-700';
  
  const ratio = seeders / total;
  
  if (ratio >= 0.8) return 'bg-green-500'; // Healthy
  if (ratio >= 0.5) return 'bg-yellow-500'; // OK
  if (ratio >= 0.2) return 'bg-orange-500'; // Weak
  return 'bg-red-500'; // Poor
};

// Get health tooltip
const getHealthTooltip = (result: TorrentResult): string => {
  const seeders = result.seeders || 0;
  const leechers = result.leechers || 0;
  const total = seeders + leechers;
  
  if (total === 0) return 'No peers';
  
  const ratio = ((seeders / total) * 100).toFixed(0);
  return `Health: ${ratio}% seeders (${seeders}/${total} peers)`;
};

// Reset to template search
const resetToTemplates = () => {
  searchQuery.value = props.initialQuery;
  manualQueryEdit.value = false;
  performSearch();
};

// Perform search
const performSearch = async () => {
  if (!searchQuery.value.trim()) return;
  
  searching.value = true;
  error.value = '';
  searched.value = true;
  
  try {
    let response: any;
    
    // Use template-based search if we have media data AND user didn't manually edit query
    if (props.mediaData?.tmdbId && !manualQueryEdit.value) {
      const config = useRuntimeConfig();
      const endpoint = props.mediaType === 'movie' 
        ? `${config.public.apiBase}/api/search/templates/movie`
        : `${config.public.apiBase}/api/search/templates/tv`;
      
      response = await $fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(props.mediaData),
      });
      
      console.log(`🎯 Template search used ${response.queries?.length || 0} queries:`, response.queries);
      
      // Store used queries and override status
      usedQueries.value = response.queries || [];
      usedOverride.value = response.usedOverride || false;
    } else {
      // Use unified search for manual queries or when no media data
      response = await api.trackers.searchUnified(
        searchQuery.value, 
        props.mediaType,
        props.mediaData?.releaseYear,
        50 // limit
      );
      
      // Clear template info for manual search
      usedQueries.value = [];
      usedOverride.value = false;
    }
    
    // Check if no sources are configured
    if (response.noSourcesConfigured) {
      error.value = '⚠️ No download sources configured. Enable at least one tracker or Webshare in Settings → Trackers.';
      return;
    }

    // Map results to display format
    results.value = response.results.map((r: any) => ({
      title: r.title,
      magnetUrl: r.downloadUrl.startsWith('webshare:') ? r.downloadUrl : `sktorrent:${r.downloadUrl}`,
      infoUrl: r.infoUrl, // Link to source page
      size: r.size,
      seeders: r.seeders,
      leechers: r.leechers,
      quality: '', // Could parse from title
      provider: r.provider || 'Unknown',
      matchScore: r.matchScore,
    }));
    
    providerCount.value = response.providers?.length || new Set(results.value.map(r => r.provider)).size;
    rawTotal.value = response.rawTotal || response.total;
    
    if (response.noSourcesConfigured) {
      error.value = '⚠️ No download sources configured. Enable at least one tracker or Webshare in Settings → Trackers.';
    } else if (results.value.length === 0) {
      error.value = `No results found for "${searchQuery.value}"`;
    }
  } catch (err: any) {
    console.error('Search error:', err);
    error.value = err.message || 'Failed to search torrents';
  } finally {
    searching.value = false;
  }
};

// Select result
const selectResult = async (result: TorrentResult, index: number) => {
  downloading.value.add(index);
  
  try {
    const downloadUrl = result.magnetUrl;
    
    if (!downloadUrl) {
      throw new Error('No download link available');
    }
    
    // Save path is resolved server-side from mediaId + existing library files.
    // We never generate a path from the TMDB title here — that would create an English
    // folder instead of saving into the existing Czech/local folder structure.
    const config = useRuntimeConfig();

    // Check download type
    if (downloadUrl.startsWith('webshare:')) {
      // Webshare direct download
      const ident = downloadUrl.replace('webshare:', '');
      const response = await api.webshare.download(
        ident,
        result.title,
        props.mediaId
      );
      
      if (response && response.success) {
        toast.success('Download started!');
      } else {
        throw new Error('Failed to start Webshare download');
      }
      
    } else if (downloadUrl.startsWith('magnet:') || downloadUrl.startsWith('sktorrent:')) {
      // Torrent: magnet link or SKTorrent download.
      // savePath is resolved server-side from mediaId + library files.
      const response = await $fetch(`${config.public.apiBase}/api/downloads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'torrent',
          magnetUrl: downloadUrl, // Backend will handle sktorrent: prefix
          ...(props.mediaId ? { mediaId: props.mediaId } : {}),
          category: props.mediaType === 'movie' ? 'movies' : 'tvshows',
        }),
      });
      
      toast.success('Torrent added to download queue!');
      
    } else {
      throw new Error('Unknown download link type: ' + downloadUrl.substring(0, 20));
    }
    
    emit('download', result);
    close();
  } catch (err: any) {
    console.error('Download error:', err);
    toast.error(`Download failed: ${err.message}`);
  } finally {
    downloading.value.delete(index);
  }
};

// Close modal
const close = () => {
  emit('update:modelValue', false);
};

// Auto-search when modal opens
const tryAutoSearch = async () => {
  if (!searched.value && props.modelValue) {
    await nextTick();
    await nextTick(); // Double tick for safety
    
    console.log('🔍 Auto-search check:', {
      hasMediaData: !!props.mediaData?.tmdbId,
      hasQuery: !!searchQuery.value.trim(),
      searched: searched.value,
      mediaData: props.mediaData,
    });
    
    if (props.mediaData?.tmdbId || searchQuery.value.trim()) {
      console.log('🚀 Auto-starting search...');
      performSearch();
    } else {
      console.log('⚠️ Skipping auto-search: no mediaData or query');
    }
  }
};

// Reset when modal opens/closes and auto-search
watch(() => props.modelValue, async (isOpen, wasOpen) => {
  console.log('👁️ modelValue changed:', { isOpen, wasOpen });
  
  if (isOpen && !wasOpen) {
    // Modal just opened
    searchQuery.value = props.initialQuery;
    manualQueryEdit.value = false;
    searched.value = false;
    usedQueries.value = [];
    usedOverride.value = false;
    
    tryAutoSearch();
  }
});

// Watch mediaData in case it updates after modal opens
watch(() => props.mediaData, () => {
  if (props.modelValue && !searched.value && props.mediaData?.tmdbId) {
    console.log('📊 MediaData updated, triggering auto-search...');
    tryAutoSearch();
  }
}, { deep: true });

// Watch for query changes
watch(() => props.initialQuery, (newQuery) => {
  searchQuery.value = newQuery;
});
</script>

<style scoped>
.input {
  @apply w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors;
}

.btn {
  @apply px-4 py-2 rounded-lg font-medium transition-all inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-primary {
  @apply bg-primary-500 text-white hover:bg-primary-600;
}

.btn-sm {
  @apply px-3 py-1 text-sm;
}

.card {
  @apply bg-gray-900 border border-gray-800 rounded-xl;
}
</style>
