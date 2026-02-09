<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] overflow-y-auto"
        @click.self="$emit('close')"
      >
        <div class="min-h-screen px-4 py-8 flex items-center justify-center">
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            leave-active-class="transition-all duration-150 ease-in"
            enter-from-class="opacity-0 scale-95 translate-y-4"
            leave-to-class="opacity-0 scale-95 translate-y-4"
          >
            <div
              v-if="show"
              class="card relative max-w-4xl w-full overflow-hidden"
              @click.stop
            >
              <!-- Close Button -->
              <button
                @click="$emit('close')"
                class="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center transition-colors group"
              >
                <Icon name="mdi:close" class="w-6 h-6 text-white" />
              </button>

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
              <div v-else-if="details">
                <!-- Backdrop -->
                <div class="relative aspect-video bg-gray-900">
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
                  <div v-if="showTrailer && trailer" class="relative aspect-video bg-black">
                    <iframe
                      :src="`https://www.youtube.com/embed/${trailer.key}?autoplay=1`"
                      class="w-full h-full"
                      frameborder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowfullscreen
                    />
                  </div>
                </Transition>

                <!-- Info -->
                <div class="p-4 sm:p-6 -mt-20 relative z-10">
                  <div class="space-y-4">
                    <!-- Header: Poster + Title + Meta -->
                    <div class="flex gap-4">
                      <!-- Poster -->
                      <div class="flex-shrink-0 w-24 sm:w-32 md:w-40">
                        <div class="aspect-[2/3] rounded-lg overflow-hidden shadow-2xl ring-4 ring-gray-950">
                          <img
                            v-if="details.poster_path"
                            :src="getTMDBImageUrl(details.poster_path, 'w500')"
                            :alt="details.title || details.name"
                            class="w-full h-full object-cover"
                          />
                          <div v-else class="w-full h-full bg-gray-800 flex items-center justify-center">
                            <Icon name="mdi:image-off" class="w-8 h-8 sm:w-12 sm:h-12 text-gray-600" />
                          </div>
                        </div>
                      </div>

                      <!-- Title + Meta -->
                      <div class="flex-1 min-w-0">
                        <!-- Title -->
                        <h2 class="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
                          {{ details.title || details.name }}
                        </h2>

                        <!-- Meta -->
                        <div class="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4 text-xs sm:text-sm text-gray-400">
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
                    </div>
                  </div>

                  <!-- Genres -->
                  <div v-if="details.genres?.length" class="flex flex-wrap gap-2">
                    <span
                      v-for="genre in details.genres.slice(0, 5)"
                      :key="genre.id"
                      class="px-2 sm:px-3 py-1 bg-gray-800 rounded-full text-xs font-medium"
                    >
                      {{ genre.name }}
                    </span>
                  </div>

                  <!-- Actions (přesunuto nahoru!) -->
                  <div class="flex flex-col gap-2 sm:gap-3">
                    <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <!-- Admin: Add to Library -->
                      <button
                        v-if="!details.inLibrary && isAdmin"
                        @click="handleAdd"
                        :disabled="adding"
                        class="btn btn-primary flex-1"
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
                        class="btn btn-primary flex-1"
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
                        class="btn btn-primary flex-1"
                      >
                        <Icon name="mdi:login" class="w-5 h-5 mr-2" />
                        Login to Request
                      </NuxtLink>
                      
                      <!-- In Library -->
                      <NuxtLink
                        v-else-if="details.mediaId"
                        :to="`/media/${details.mediaId}`"
                        class="btn btn-secondary flex-1"
                      >
                        <Icon name="mdi:open-in-new" class="w-5 h-5 mr-2" />
                        View in Library
                      </NuxtLink>
                      <button v-else disabled class="btn btn-secondary flex-1 cursor-not-allowed opacity-60">
                        <Icon name="mdi:check-circle" class="w-5 h-5 mr-2 text-green-400" />
                        In Your Library
                      </button>
                      
                      <button @click="$emit('close')" class="btn btn-secondary">
                        Close
                      </button>
                    </div>

                    <!-- Search & Download (Admin Only) -->
                    <button
                      v-if="isAdmin"
                      @click="showSearchFiles = true"
                      class="btn btn-secondary w-full"
                    >
                      <Icon name="mdi:download" class="w-5 h-5 mr-2" />
                      Search & Download
                    </button>
                  </div>

                  <!-- Overview -->
                  <div class="mb-4 sm:mb-6">
                    <h3 class="text-sm font-semibold uppercase text-gray-500 mb-2">Overview</h3>
                    <p class="text-sm sm:text-base text-gray-300 leading-relaxed">{{ details.overview || 'No overview available.' }}</p>
                  </div>

                  <!-- Cast -->
                  <div v-if="details.credits?.cast?.length" class="mb-4 sm:mb-6">
                    <h3 class="text-sm font-semibold uppercase text-gray-500 mb-3">Cast</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-h-64 overflow-y-auto pr-2">
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

                  <!-- Library Path -->
                  <div v-if="details.inLibrary && libraryPath" class="mb-4 sm:mb-6">
                    <h3 class="text-sm font-semibold uppercase text-gray-500 mb-3 flex items-center gap-2">
                      <Icon name="mdi:folder" class="w-4 h-4" />
                      Library Location
                    </h3>
                    <div class="bg-gray-800 rounded-lg p-3 sm:p-4 flex items-center gap-3">
                      <Icon name="mdi:folder-open" class="w-5 h-5 text-primary-400 flex-shrink-0" />
                      <code class="text-xs sm:text-sm text-gray-300 flex-1 truncate">{{ libraryPath }}</code>
                      <button
                        @click="showEditPath = true"
                        class="btn btn-sm btn-secondary"
                      >
                        <Icon name="mdi:pencil" class="w-4 h-4 mr-1" />
                        Edit
                      </button>
                    </div>
                  </div>

                  <!-- Library Files -->
                  <div v-if="details.inLibrary && libraryFiles.length > 0" class="mb-4 sm:mb-6">
                    <h3 class="text-sm font-semibold uppercase text-gray-500 mb-3 flex items-center gap-2">
                      <Icon name="mdi:file-video" class="w-4 h-4" />
                      Files in Library
                    </h3>
                    <div class="space-y-3">
                      <div
                        v-for="file in libraryFiles"
                        :key="file.id"
                        class="bg-gray-800 rounded-lg p-3 sm:p-4"
                      >
                        <!-- Filename -->
                        <div class="flex items-start gap-3 mb-2">
                          <Icon name="mdi:video" class="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                          <div class="flex-1 min-w-0">
                            <p class="font-medium text-sm truncate">{{ file.filename }}</p>
                            <p class="text-xs text-gray-500 truncate mt-0.5">{{ file.path }}</p>
                          </div>
                        </div>
                        
                        <!-- Media Info -->
                        <div v-if="file.mediaInfo" class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                          <!-- Size -->
                          <div class="flex items-center gap-2 text-xs">
                            <Icon name="mdi:harddisk" class="w-4 h-4 text-gray-400" />
                            <div>
                              <p class="text-gray-500">Size</p>
                              <p class="font-medium">{{ file.mediaInfo.sizeFormatted }}</p>
                            </div>
                          </div>
                          
                          <!-- Duration -->
                          <div class="flex items-center gap-2 text-xs">
                            <Icon name="mdi:clock-outline" class="w-4 h-4 text-gray-400" />
                            <div>
                              <p class="text-gray-500">Duration</p>
                              <p class="font-medium">{{ file.mediaInfo.durationFormatted }}</p>
                            </div>
                          </div>
                          
                          <!-- Resolution -->
                          <div v-if="file.mediaInfo.resolution" class="flex items-center gap-2 text-xs">
                            <Icon name="mdi:monitor" class="w-4 h-4 text-gray-400" />
                            <div>
                              <p class="text-gray-500">Resolution</p>
                              <p class="font-medium">{{ file.mediaInfo.resolution }}</p>
                            </div>
                          </div>
                          
                          <!-- Video Codec -->
                          <div v-if="file.mediaInfo.videoCodec" class="flex items-center gap-2 text-xs">
                            <Icon name="mdi:video-box" class="w-4 h-4 text-gray-400" />
                            <div>
                              <p class="text-gray-500">Video</p>
                              <p class="font-medium uppercase">{{ file.mediaInfo.videoCodec }}</p>
                            </div>
                          </div>
                          
                          <!-- Audio Codec -->
                          <div v-if="file.mediaInfo.audioCodec" class="flex items-center gap-2 text-xs">
                            <Icon name="mdi:speaker" class="w-4 h-4 text-gray-400" />
                            <div>
                              <p class="text-gray-500">Audio</p>
                              <p class="font-medium uppercase">{{ file.mediaInfo.audioCodec }}</p>
                            </div>
                          </div>
                          
                          <!-- Audio Languages -->
                          <div v-if="file.mediaInfo.audioLanguages?.length" class="flex items-center gap-2 text-xs">
                            <Icon name="mdi:translate" class="w-4 h-4 text-gray-400" />
                            <div>
                              <p class="text-gray-500">Audio Tracks</p>
                              <p class="font-medium">{{ file.mediaInfo.audioLanguages.join(', ') }}</p>
                            </div>
                          </div>
                          
                          <!-- Subtitles -->
                          <div v-if="file.mediaInfo.subtitleLanguages?.length" class="flex items-center gap-2 text-xs">
                            <Icon name="mdi:subtitles" class="w-4 h-4 text-gray-400" />
                            <div>
                              <p class="text-gray-500">Subtitles</p>
                              <p class="font-medium">{{ file.mediaInfo.subtitleLanguages.join(', ') }}</p>
                            </div>
                          </div>
                          
                          <!-- Bitrate -->
                          <div v-if="file.mediaInfo.bitrate" class="flex items-center gap-2 text-xs">
                            <Icon name="mdi:speedometer" class="w-4 h-4 text-gray-400" />
                            <div>
                              <p class="text-gray-500">Bitrate</p>
                              <p class="font-medium">{{ Math.round(file.mediaInfo.bitrate) }} kbps</p>
                            </div>
                          </div>
                        </div>
                        
                        <!-- Loading State -->
                        <div v-else-if="loadingFiles" class="flex items-center justify-center py-4">
                          <Icon name="mdi:loading" class="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                      </div> <!-- end v-for file -->
                    </div> <!-- end space-y-3 -->
                  </div> <!-- end Library Files section -->
                </div> <!-- end p-4 sm:p-6 wrapper -->
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>

    <!-- Torrent Search Modal -->
    <TorrentSearchModal
      v-model="showSearchFiles"
      :initial-query="getSearchQuery()"
      :media-type="mediaType || 'movie'"
      :media-id="details?.mediaId"
      :media-data="mediaData"
      @download="handleDownload"
    />

    <!-- Edit Path Modal -->
    <EditPathModal
      v-if="details?.mediaId && libraryPath"
      :show="showEditPath"
      :media-id="details.mediaId"
      :current-path="libraryPath"
      @close="showEditPath = false"
      @updated="handlePathUpdated"
    />
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  show: boolean;
  itemId?: number;
  mediaType?: 'movie' | 'tv';
}>();

const emit = defineEmits<{
  close: [];
  added: [];
  openPerson: [personId: number];
}>();

const config = useRuntimeConfig();
const api = useApi();
const toast = useToast();
const { getTMDBImageUrl } = useFormatters();
const { isAuthenticated, isAdmin } = useAuth();
const requestsApi = useRequests();

const details = ref<any>(null);
const loading = ref(false);
const error = ref(false);
const adding = ref(false);
const requesting = ref(false);
const showTrailer = ref(false);
const showSearchFiles = ref(false);
const libraryFiles = ref<any[]>([]);
const loadingFiles = ref(false);
const showEditPath = ref(false);
const libraryPath = ref<string | null>(null);
const hasRequested = ref(false);

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

const getSearchQuery = () => {
  if (!details.value) return '';
  const title = details.value.title || details.value.name;
  const year = getYear(details.value);
  return year ? `${title} ${year}` : title;
};

const mediaData = computed(() => {
  if (!details.value) return undefined;
  
  return {
    tmdbId: props.itemId!,
    title: details.value.title || details.value.name,
    originalTitle: details.value.original_title || details.value.original_name,
    releaseYear: getYear(details.value),
    imdbId: details.value.imdb_id,
  };
});

const fetchDetails = async () => {
  if (!props.itemId || !props.mediaType) return;
  
  loading.value = true;
  error.value = false;
  showTrailer.value = false;
  
  try {
    const url = `${config.public.apiBase}/api/discover/details/${props.mediaType}/${props.itemId}`;
    details.value = await $fetch(url);
    
    // If in library, fetch files and media item info
    if (details.value.inLibrary && details.value.mediaId) {
      fetchLibraryFiles(details.value.mediaId);
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

const fetchLibraryFiles = async (mediaId: number) => {
  loadingFiles.value = true;
  try {
    const url = `${config.public.apiBase}/api/media/${mediaId}/files`;
    libraryFiles.value = await $fetch(url);
  } catch (err) {
    console.error('Failed to fetch library files:', err);
  } finally {
    loadingFiles.value = false;
  }
};

const handleRequest = async () => {
  if (!details.value || !props.itemId || !props.mediaType) return;
  
  requesting.value = true;
  try {
    await requestsApi.create({
      tmdbId: props.itemId,
      type: props.mediaType,
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
      tmdbId: details.value.id,
      type: props.mediaType as 'movie' | 'tv',
    });
    
    details.value.inLibrary = true;
    details.value.mediaId = result.id;
    toast.success(`Added "${details.value.title || details.value.name}" to library`);
    emit('added');
    
    // Fetch library files if it was added
    if (result.id) {
      fetchLibraryFiles(result.id);
    }
  } catch (err: any) {
    toast.error(`Failed to add: ${err.message}`);
  } finally {
    adding.value = false;
  }
};

const openPersonDetails = (personId: number) => {
  emit('openPerson', personId);
};

const handleDownload = (result: any) => {
  console.log('Download started:', result);
  // TorrentSearchModal už zahájil download, jen zavřeme modal
  showSearchFiles.value = false;
  toast.success(`Download started: ${result.title}`);
};

const handlePathUpdated = (newPath: string) => {
  libraryPath.value = newPath;
  // Refresh files in case they were moved
  if (details.value?.mediaId) {
    fetchLibraryFiles(details.value.mediaId);
  }
};

watch(() => props.show, (show) => {
  if (show) {
    fetchDetails();
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
    showTrailer.value = false;
  }
});

// Watch for itemId changes while modal is open
watch(() => props.itemId, (newId, oldId) => {
  if (props.show && newId && newId !== oldId) {
    fetchDetails();
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>
