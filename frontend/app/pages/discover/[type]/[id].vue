<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-24">
      <Icon name="mdi:loading" class="w-12 h-12 animate-spin text-primary-500" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="p-12 text-center">
      <Icon name="mdi:alert-circle" class="w-16 h-16 mx-auto mb-4 text-red-500" />
      <p class="text-red-400 font-medium">Failed to load details</p>
      <button @click="fetchDetails" class="btn btn-secondary btn-sm mt-4">Try Again</button>
    </div>

    <!-- Content -->
    <div v-else-if="details" class="max-w-6xl mx-auto">
      <!-- Back Button -->
      <button @click="$router.back()" class="btn btn-secondary mb-4">
        <Icon name="mdi:arrow-left" class="w-5 h-5 mr-2" />
        Back
      </button>

      <!-- Backdrop -->
      <div class="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-6">
        <img
          v-if="details.backdrop_path"
          :src="getTMDBImageUrl(details.backdrop_path, 'w1280')"
          :alt="details.title || details.name"
          class="w-full h-full object-cover"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent"></div>
        
        <!-- Play Trailer Button -->
        <button
          v-if="trailer"
          @click="showTrailer = !showTrailer"
          class="absolute inset-0 flex items-center justify-center group"
        >
          <div class="w-20 h-20 rounded-full bg-primary-600 hover:bg-primary-500 flex items-center justify-center transition-all group-hover:scale-110 shadow-2xl">
            <Icon :name="showTrailer ? 'mdi:close' : 'mdi:play'" class="w-10 h-10 text-white ml-1" />
          </div>
        </button>
      </div>

      <!-- Trailer Embed -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-200 ease-in"
        enter-from-class="opacity-0 h-0"
        leave-to-class="opacity-0 h-0"
      >
        <div v-if="showTrailer && trailer" class="relative aspect-video bg-black rounded-lg overflow-hidden mb-6">
          <iframe
            :src="`https://www.youtube.com/embed/${trailer.key}?autoplay=1`"
            class="w-full h-full"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          />
        </div>
      </Transition>

      <!-- Main Info -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Poster + Actions -->
        <div class="lg:col-span-1">
          <div class="sticky top-20">
            <!-- Poster -->
            <div class="aspect-[2/3] rounded-lg overflow-hidden shadow-2xl mb-4">
              <img
                v-if="details.poster_path"
                :src="getTMDBImageUrl(details.poster_path, 'w500')"
                :alt="details.title || details.name"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full bg-gray-800 flex items-center justify-center">
                <Icon name="mdi:image-off" class="w-12 h-12 text-gray-600" />
              </div>
            </div>

            <!-- Actions -->
            <div class="space-y-2">
              <!-- Admin: Add to Library -->
              <button
                v-if="!details.inLibrary && isAdmin"
                @click="handleAdd"
                :disabled="adding"
                class="btn btn-primary w-full"
              >
                <Icon
                  :name="adding ? 'mdi:loading' : 'mdi:plus'"
                  :class="{ 'animate-spin': adding }"
                  class="w-5 h-5 mr-2"
                />
                {{ adding ? 'Adding...' : 'Add to Library' }}
              </button>
              
              <!-- User: Request -->
              <button
                v-else-if="!details.inLibrary && isAuthenticated && !isAdmin"
                @click="handleRequest"
                :disabled="requesting || hasRequested"
                class="btn btn-primary w-full"
              >
                <Icon
                  :name="hasRequested ? 'mdi:check' : (requesting ? 'mdi:loading' : 'mdi:playlist-plus')"
                  :class="{ 'animate-spin': requesting }"
                  class="w-5 h-5 mr-2"
                />
                {{ hasRequested ? 'Requested' : (requesting ? 'Requesting...' : 'Request') }}
              </button>

              <!-- Guest: Login to Request -->
              <NuxtLink
                v-else-if="!details.inLibrary && !isAuthenticated"
                to="/login"
                class="btn btn-primary w-full"
              >
                <Icon name="mdi:login" class="w-5 h-5 mr-2" />
                Login to Request
              </NuxtLink>
              
              <!-- In Library -->
              <NuxtLink
                v-else-if="details.mediaId"
                :to="`/media/${details.mediaId}`"
                class="btn btn-secondary w-full"
              >
                <Icon name="mdi:open-in-new" class="w-5 h-5 mr-2" />
                View in Library
              </NuxtLink>
              <button v-else disabled class="btn btn-secondary w-full cursor-not-allowed opacity-60">
                <Icon name="mdi:check-circle" class="w-5 h-5 mr-2 text-green-400" />
                In Your Library
              </button>

              <!-- Search removed: only search in library, not in discovery -->
            </div>
          </div>
        </div>

        <!-- Details -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Title -->
          <div>
            <h1 class="text-3xl md:text-4xl font-bold mb-2">
              {{ details.title || details.name }}
            </h1>
            <p v-if="details.original_title && details.original_title !== details.title" class="text-gray-400">
              Original: {{ details.original_title || details.original_name }}
            </p>
          </div>

          <!-- Meta -->
          <div class="flex flex-wrap items-center gap-3 text-sm text-gray-400">
            <span v-if="details.release_date || details.first_air_date" class="flex items-center gap-1">
              <Icon name="mdi:calendar" class="w-4 h-4" />
              {{ getYear(details) }}
            </span>
            
            <span v-if="details.vote_average" class="flex items-center gap-1">
              <Icon name="mdi:star" class="w-4 h-4 text-yellow-400" />
              <span class="text-white font-semibold">{{ details.vote_average.toFixed(1) }}</span>
              <span class="text-gray-500">({{ formatVoteCount(details.vote_count) }})</span>
            </span>

            <span v-if="details.runtime" class="flex items-center gap-1">
              <Icon name="mdi:clock-outline" class="w-4 h-4" />
              {{ formatRuntime(details.runtime) }}
            </span>

            <span v-if="details.number_of_seasons" class="flex items-center gap-1">
              <Icon name="mdi:television" class="w-4 h-4" />
              {{ details.number_of_seasons }} Season{{ details.number_of_seasons > 1 ? 's' : '' }}
            </span>

            <span
              v-if="details.inLibrary"
              class="px-2 py-1 bg-green-600 text-white rounded text-xs font-bold uppercase flex items-center gap-1"
            >
              <Icon name="mdi:check-circle" class="w-3 h-3" />
              In Library
            </span>
          </div>

          <!-- Genres -->
          <div v-if="details.genres?.length">
            <h3 class="text-sm font-semibold uppercase text-gray-500 mb-2">Genres</h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="genre in details.genres"
                :key="genre.id"
                class="px-3 py-1 bg-gray-800 rounded-full text-sm font-medium"
              >
                {{ genre.name }}
              </span>
            </div>
          </div>

          <!-- Overview -->
          <div v-if="details.overview">
            <h3 class="text-sm font-semibold uppercase text-gray-500 mb-2">Overview</h3>
            <p class="text-base text-gray-300 leading-relaxed">{{ details.overview }}</p>
          </div>

          <!-- Additional Info -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Status -->
            <div v-if="details.status">
              <h4 class="text-xs font-semibold uppercase text-gray-500 mb-1">Status</h4>
              <p class="text-gray-300">{{ details.status }}</p>
            </div>

            <!-- Original Language -->
            <div v-if="details.original_language">
              <h4 class="text-xs font-semibold uppercase text-gray-500 mb-1">Original Language</h4>
              <p class="text-gray-300 uppercase">{{ details.original_language }}</p>
            </div>

            <!-- Budget (Movies) -->
            <div v-if="details.budget && details.budget > 0">
              <h4 class="text-xs font-semibold uppercase text-gray-500 mb-1">Budget</h4>
              <p class="text-gray-300">{{ formatCurrency(details.budget) }}</p>
            </div>

            <!-- Revenue (Movies) -->
            <div v-if="details.revenue && details.revenue > 0">
              <h4 class="text-xs font-semibold uppercase text-gray-500 mb-1">Revenue</h4>
              <p class="text-gray-300">{{ formatCurrency(details.revenue) }}</p>
            </div>

            <!-- First Air Date (TV) -->
            <div v-if="details.first_air_date">
              <h4 class="text-xs font-semibold uppercase text-gray-500 mb-1">First Aired</h4>
              <p class="text-gray-300">{{ formatDate(details.first_air_date) }}</p>
            </div>

            <!-- Last Air Date (TV) -->
            <div v-if="details.last_air_date">
              <h4 class="text-xs font-semibold uppercase text-gray-500 mb-1">Last Aired</h4>
              <p class="text-gray-300">{{ formatDate(details.last_air_date) }}</p>
            </div>

            <!-- Number of Episodes (TV) -->
            <div v-if="details.number_of_episodes">
              <h4 class="text-xs font-semibold uppercase text-gray-500 mb-1">Episodes</h4>
              <p class="text-gray-300">{{ details.number_of_episodes }} episodes</p>
            </div>
          </div>

          <!-- Production Companies -->
          <div v-if="details.production_companies?.length">
            <h3 class="text-sm font-semibold uppercase text-gray-500 mb-3">Production Companies</h3>
            <div class="flex flex-wrap gap-3">
              <div
                v-for="company in details.production_companies.slice(0, 6)"
                :key="company.id"
                class="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2"
              >
                <img
                  v-if="company.logo_path"
                  :src="getTMDBImageUrl(company.logo_path, 'w92')"
                  :alt="company.name"
                  class="h-6 object-contain"
                />
                <span class="text-sm text-gray-300">{{ company.name }}</span>
              </div>
            </div>
          </div>

          <!-- Countries -->
          <div v-if="details.production_countries?.length">
            <h3 class="text-sm font-semibold uppercase text-gray-500 mb-2">Countries</h3>
            <p class="text-gray-300">
              {{ details.production_countries.map((c: any) => c.name).join(', ') }}
            </p>
          </div>

          <!-- Cast -->
          <div v-if="details.credits?.cast?.length">
            <h3 class="text-sm font-semibold uppercase text-gray-500 mb-3">Cast</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                v-for="person in details.credits.cast.slice(0, 12)"
                :key="person.id"
                @click="openPersonDetails(person.id)"
                class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors text-left group"
              >
                <div class="w-12 h-12 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
                  <img
                    v-if="person.profile_path"
                    :src="`https://image.tmdb.org/t/p/w185${person.profile_path}`"
                    :alt="person.name"
                    class="w-full h-full object-cover"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center">
                    <Icon name="mdi:account" class="w-6 h-6 text-gray-600" />
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate group-hover:text-primary-400 transition-colors">
                    {{ person.name }}
                  </p>
                  <p class="text-xs text-gray-500 truncate">{{ person.character }}</p>
                </div>
              </button>
            </div>
          </div>

          <!-- Library Path (if in library) -->
          <div v-if="details.inLibrary && libraryPath" class="bg-gray-800 rounded-lg p-4">
            <h3 class="text-sm font-semibold uppercase text-gray-500 mb-3 flex items-center gap-2">
              <Icon name="mdi:folder" class="w-4 h-4" />
              Library Location
            </h3>
            <div class="flex items-center gap-3">
              <Icon name="mdi:folder-open" class="w-5 h-5 text-primary-400 flex-shrink-0" />
              <code class="text-sm text-gray-300 flex-1 truncate">{{ libraryPath }}</code>
              <button
                @click="showEditPath = true"
                class="btn btn-sm btn-secondary"
              >
                <Icon name="mdi:pencil" class="w-4 h-4 mr-1" />
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <TorrentSearchModal
      v-model="showSearchFiles"
      :initial-query="getSearchQuery()"
      :media-type="mediaType"
      :media-id="details?.mediaId"
      :media-data="mediaData"
      @download="handleDownload"
    />

    <EditPathModal
      v-if="details?.mediaId && libraryPath"
      :show="showEditPath"
      :media-id="details.mediaId"
      :current-path="libraryPath"
      @close="showEditPath = false"
      @updated="handlePathUpdated"
    />

    <PersonDetailsModal
      :show="showPersonModal"
      :person-id="selectedPersonId"
      @close="showPersonModal = false"
    />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();
const api = useApi();
const toast = useToast();
const { getTMDBImageUrl } = useFormatters();
const { isAuthenticated, isAdmin } = useAuth();
const requestsApi = useRequests();

const mediaType = computed(() => route.params.type as 'movie' | 'tv');
const itemId = computed(() => parseInt(route.params.id as string));

const details = ref<any>(null);
const loading = ref(false);
const error = ref(false);
const adding = ref(false);
const requesting = ref(false);
const showTrailer = ref(false);
const showSearchFiles = ref(false);
const showEditPath = ref(false);
const libraryPath = ref<string | null>(null);
const hasRequested = ref(false);
const showPersonModal = ref(false);
const selectedPersonId = ref<number | null>(null);

const trailer = computed(() => {
  const videos = details.value?.videos?.results || [];
  return videos.find((v: any) => 
    v.type === 'Trailer' && v.site === 'YouTube'
  ) || videos.find((v: any) => v.site === 'YouTube');
});

const getYear = (item: any) => {
  const date = item.release_date || item.first_air_date;
  return date ? new Date(date).getFullYear() : null;
};

const formatVoteCount = (count?: number) => {
  if (!count) return '0';
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
};

const formatRuntime = (minutes?: number) => {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getSearchQuery = () => {
  if (!details.value) return '';
  const title = details.value.title || details.value.name;
  const year = getYear(details.value);
  return year ? `${title} ${year}` : title;
};

const mediaData = computed(() => {
  if (!details.value) return undefined;
  
  return {
    tmdbId: itemId.value,
    title: details.value.title || details.value.name,
    originalTitle: details.value.original_title || details.value.original_name,
    releaseYear: getYear(details.value),
    imdbId: details.value.imdb_id,
  };
});

const fetchDetails = async () => {
  if (!itemId.value || !mediaType.value) return;
  
  loading.value = true;
  error.value = false;
  
  try {
    const url = `${config.public.apiBase}/api/discover/details/${mediaType.value}/${itemId.value}`;
    details.value = await $fetch(url);
    
    // If in library, fetch media item info
    if (details.value.inLibrary && details.value.mediaId) {
      fetchMediaItemInfo(details.value.mediaId);
    }
  } catch (err) {
    console.error('Failed to fetch details:', err);
    error.value = true;
    toast.error('Failed to load details');
  } finally {
    loading.value = false;
  }
};

const fetchMediaItemInfo = async (mediaId: number) => {
  try {
    const url = `${config.public.apiBase}/api/media/${mediaId}`;
    const mediaItem = await $fetch(url);
    libraryPath.value = (mediaItem as any).libraryPath || null;
  } catch (err) {
    console.error('Failed to fetch media item info:', err);
  }
};

const handleRequest = async () => {
  if (!details.value || !itemId.value || !mediaType.value) return;
  
  requesting.value = true;
  try {
    await requestsApi.create({
      tmdbId: itemId.value,
      type: mediaType.value,
      title: details.value.title || details.value.name,
      year: getYear(details.value) || undefined,
      posterPath: details.value.poster_path || undefined,
    });
    
    hasRequested.value = true;
    toast.success(`Request submitted for "${details.value.title || details.value.name}"`);
  } catch (err: any) {
    toast.error(err.data?.error || 'Failed to submit request');
  } finally {
    requesting.value = false;
  }
};

const handleAdd = async () => {
  if (!details.value) return;
  
  adding.value = true;
  try {
    const result = await api.media.create({
      tmdbId: itemId.value,
      type: mediaType.value,
    });
    
    details.value.inLibrary = true;
    details.value.mediaId = result.id;
    toast.success(`Added "${details.value.title || details.value.name}" to library`);
    
    // Fetch library info if it was added
    if (result.id) {
      fetchMediaItemInfo(result.id);
    }
  } catch (err: any) {
    toast.error(`Failed to add: ${err.message}`);
  } finally {
    adding.value = false;
  }
};

const openPersonDetails = (personId: number) => {
  selectedPersonId.value = personId;
  showPersonModal.value = true;
};

const handleDownload = (result: any) => {
  console.log('Download started:', result);
  showSearchFiles.value = false;
  toast.success(`Download started: ${result.title}`);
};

const handlePathUpdated = (newPath: string) => {
  libraryPath.value = newPath;
};

// Set page title
useHead(() => ({
  title: details.value 
    ? `${details.value.title || details.value.name} - Unifarr`
    : 'Loading... - Unifarr',
}));

// Fetch on mount
onMounted(() => {
  fetchDetails();
});

// Refetch when route params change
watch([itemId, mediaType], () => {
  fetchDetails();
});
</script>
