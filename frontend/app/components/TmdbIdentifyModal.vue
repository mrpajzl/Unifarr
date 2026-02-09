<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
      @click.self="$emit('update:modelValue', false)"
    >
      <div class="card p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="text-xl font-semibold">Identify on TMDB</h3>
            <p class="text-sm text-gray-400 mt-1">
              Search for "{{ initialQuery }}" on TMDB and select the correct match
            </p>
          </div>
          <button
            @click="$emit('update:modelValue', false)"
            class="text-gray-400 hover:text-white transition-colors"
          >
            <Icon name="mdi:close" class="w-6 h-6" />
          </button>
        </div>

        <!-- Search Input -->
        <div class="mb-4 relative">
          <Icon name="mdi:magnify" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
          <input
            v-model="searchQuery"
            ref="searchInput"
            type="text"
            placeholder="Search TMDB..."
            class="input w-full pl-10"
            @input="handleSearch"
            @keyup.enter="handleSearch"
          />
        </div>

        <!-- Loading -->
        <div v-if="searching" class="flex justify-center py-8">
          <Icon name="mdi:loading" class="w-8 h-8 animate-spin text-primary-500" />
        </div>

        <!-- No Results -->
        <div v-else-if="searched && results.length === 0" class="text-center py-8">
          <Icon name="mdi:alert-circle" class="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p class="text-gray-400">No results found for "{{ searchQuery }}"</p>
          <p class="text-sm text-gray-500 mt-1">Try a different search term</p>
        </div>

        <!-- Results -->
        <div v-else-if="results.length > 0" class="space-y-2">
          <button
            v-for="result in results"
            :key="result.id"
            @click="selectResult(result)"
            :disabled="identifying"
            class="w-full card p-3 flex items-start gap-3 hover:border-primary-500/50 transition-colors text-left group"
          >
            <!-- Poster -->
            <div class="w-16 h-24 flex-shrink-0 rounded overflow-hidden bg-gray-900">
              <img
                v-if="result.poster_path"
                :src="getTMDBImageUrl(result.poster_path, 'w92')"
                :alt="result.title || result.name"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <Icon name="mdi:image-off" class="w-6 h-6 text-gray-600" />
              </div>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <h4 class="font-medium text-white mb-1 group-hover:text-primary-400 transition-colors">
                {{ result.title || result.name }}
              </h4>
              
              <div class="flex items-center gap-2 text-xs text-gray-400 mb-2">
                <span v-if="getYear(result)">{{ getYear(result) }}</span>
                <span class="px-1.5 py-0.5 bg-gray-800 rounded uppercase font-medium">
                  {{ result.media_type || (result.title ? 'movie' : 'tv') }}
                </span>
                <span v-if="result.vote_average" class="flex items-center gap-0.5">
                  <Icon name="mdi:star" class="w-3 h-3 text-yellow-400" />
                  {{ result.vote_average.toFixed(1) }}
                </span>
              </div>

              <p v-if="result.overview" class="text-sm text-gray-500 line-clamp-2">
                {{ result.overview }}
              </p>
            </div>

            <!-- Arrow -->
            <Icon name="mdi:chevron-right" class="w-5 h-5 text-gray-500 group-hover:text-primary-400 transition-colors flex-shrink-0 mt-1" />
          </button>
        </div>

        <!-- Initial state -->
        <div v-else class="text-center py-8">
          <Icon name="mdi:magnify" class="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p class="text-gray-400">Start typing to search TMDB</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  initialQuery: string;
  mediaId: number;
  mediaType: 'movie' | 'tv';
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'identified': [];
}>();

const toast = useToast();
const { getTMDBImageUrl } = useFormatters();
const config = useRuntimeConfig();

const searchQuery = ref(props.initialQuery);
const searchInput = ref<HTMLInputElement>();
const searching = ref(false);
const searched = ref(false);
const results = ref<any[]>([]);
const identifying = ref(false);

// Debounced search
let searchTimeout: NodeJS.Timeout;
const handleSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    if (!searchQuery.value.trim()) {
      results.value = [];
      searched.value = false;
      return;
    }

    searching.value = true;
    searched.value = true;

    try {
      const response = await $fetch<any>(
        `${config.public.apiBase}/api/search/tmdb/multi`,
        {
          params: {
            query: searchQuery.value,
          },
        }
      );

      // Filter by media type if provided
      const allResults = response.results || response;
      results.value = allResults.filter((r: any) => {
        const type = r.media_type || (r.title ? 'movie' : 'tv');
        return type === props.mediaType;
      });
    } catch (err) {
      console.error('Search failed:', err);
      toast.error('Search failed');
    } finally {
      searching.value = false;
    }
  }, 500);
};

const getYear = (item: any) => {
  const date = item.release_date || item.first_air_date;
  return date ? new Date(date).getFullYear() : null;
};

const selectResult = async (result: any) => {
  identifying.value = true;
  
  try {
    const type = result.media_type || (result.title ? 'movie' : 'tv');
    
    await $fetch(`${config.public.apiBase}/api/media/${props.mediaId}/identify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tmdbId: result.id,
        type: type,
      }),
    });

    toast.success(`Identified as ${result.title || result.name}`);
    emit('identified');
    emit('update:modelValue', false);
  } catch (err: any) {
    console.error('Identification failed:', err);
    toast.error(`Failed to identify: ${err.message || 'Unknown error'}`);
  } finally {
    identifying.value = false;
  }
};

// Auto-focus on mount
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    nextTick(() => {
      searchInput.value?.focus();
      // Auto-search with initial query
      if (props.initialQuery) {
        handleSearch();
      }
    });
  }
});
</script>
