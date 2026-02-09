<template>
  <div>
    <!-- Loading -->
    <div v-if="pending" class="flex justify-center py-16">
      <Icon name="mdi:loading" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card p-8 text-center">
      <Icon name="mdi:alert-circle" class="w-12 h-12 mx-auto mb-3 text-red-500" />
      <p class="font-medium text-red-400">Failed to load media</p>
      <p class="text-sm text-gray-500 mt-1">{{ error.message }}</p>
      <NuxtLink to="/" class="btn btn-secondary btn-sm mt-4">Back to Dashboard</NuxtLink>
    </div>

    <!-- Media Details -->
    <div v-else-if="media">
      <!-- Backdrop -->
      <div
        v-if="media.backdropPath"
        class="relative -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 mb-6 h-64 sm:h-80 lg:h-96"
      >
        <img
          :src="getTMDBImageUrl(media.backdropPath, 'original')"
          :alt="media.title"
          class="w-full h-full object-cover"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-gray-950/20" />

        <!-- Back button on backdrop -->
        <button
          @click="$router.back()"
          class="absolute top-4 left-4 sm:left-6 lg:left-8 bg-black/50 backdrop-blur-sm p-2 rounded-lg hover:bg-black/70 transition-colors"
        >
          <Icon name="mdi:arrow-left" class="w-5 h-5" />
        </button>
      </div>

      <!-- Back button (no backdrop) -->
      <button
        v-else
        @click="$router.back()"
        class="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <Icon name="mdi:arrow-left" class="w-5 h-5" />
        <span class="text-sm">Back</span>
      </button>

      <!-- Content -->
      <div class="flex flex-col md:flex-row gap-6 lg:gap-8" :class="{ '-mt-32 relative z-10': media.backdropPath }">
        <!-- Poster -->
        <div class="w-48 md:w-64 flex-shrink-0 mx-auto md:mx-0">
          <div class="aspect-[2/3] rounded-xl overflow-hidden bg-gray-800 shadow-2xl ring-1 ring-white/10">
            <img
              v-if="media.posterPath"
              :src="getTMDBImageUrl(media.posterPath, 'w500')"
              :alt="media.title"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-600">
              <Icon name="mdi:image-off" class="w-16 h-16" />
            </div>
          </div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <!-- Title -->
          <h1 class="text-3xl lg:text-4xl font-bold mb-2">{{ media.title }}</h1>

          <!-- Meta row -->
          <div class="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400 mb-4">
            <span v-if="media.year" class="flex items-center gap-1">
              <Icon name="mdi:calendar" class="w-4 h-4" />
              {{ media.year }}
            </span>
            <span class="px-2 py-0.5 rounded bg-gray-800 text-xs font-medium uppercase">
              {{ media.type === 'movie' ? 'Movie' : 'TV Show' }}
            </span>
            <span v-if="media.runtime" class="flex items-center gap-1">
              <Icon name="mdi:clock-outline" class="w-4 h-4" />
              {{ Math.floor(media.runtime / 60) }}h {{ media.runtime % 60 }}m
            </span>
            <span v-if="media.numberOfSeasons" class="flex items-center gap-1">
              <Icon name="mdi:television" class="w-4 h-4" />
              {{ media.numberOfSeasons }} Season{{ media.numberOfSeasons !== 1 ? 's' : '' }}
            </span>
            <span v-if="media.numberOfEpisodes" class="flex items-center gap-1">
              {{ media.numberOfEpisodes }} Episodes
            </span>
            <span v-if="media.voteAverage" class="flex items-center gap-1">
              <Icon name="mdi:star" class="w-4 h-4 text-yellow-400" />
              <span class="font-medium text-white">{{ media.voteAverage.toFixed(1) }}</span>
              <span v-if="media.voteCount" class="text-gray-500">({{ media.voteCount.toLocaleString() }})</span>
            </span>
            <span
              v-if="media.status"
              :class="[
                'px-2 py-0.5 text-xs rounded',
                media.status === 'Released' || media.status === 'Returning Series' ? 'bg-green-600/20 text-green-400' :
                media.status === 'Ended' ? 'bg-gray-600/20 text-gray-400' :
                'bg-yellow-600/20 text-yellow-400'
              ]"
            >
              {{ media.status }}
            </span>
          </div>

          <!-- Genres -->
          <div v-if="genres.length" class="flex flex-wrap gap-2 mb-5">
            <span
              v-for="genre in genres"
              :key="genre"
              class="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300"
            >
              {{ genre }}
            </span>
          </div>

          <!-- Overview -->
          <div v-if="media.overview" class="mb-6">
            <p class="text-gray-300 leading-relaxed">{{ media.overview }}</p>
          </div>

          <!-- IMDB Link -->
          <div v-if="media.imdbId" class="mb-6">
            <a
              :href="`https://www.imdb.com/title/${media.imdbId}`"
              target="_blank"
              class="inline-flex items-center gap-2 text-sm text-yellow-500 hover:text-yellow-400 transition-colors"
            >
              <Icon name="mdi:open-in-new" class="w-4 h-4" />
              View on IMDb
            </a>
          </div>

          <!-- Actions -->
          <div class="flex flex-wrap gap-2 mb-8">
            <button 
              v-if="!media.tmdbId" 
              @click="showIdentifyModal = true" 
              class="btn btn-primary"
            >
              <Icon name="mdi:magnify" class="w-5 h-5 mr-2" />
              Identify on TMDB
            </button>
            <button 
              v-else
              @click="showSearchModal = true" 
              class="btn btn-primary"
            >
              <Icon name="mdi:download" class="w-5 h-5 mr-2" />
              Search Downloads
            </button>
            <button 
              v-if="media?.type === 'tv'"
              @click="showEpisodeMatcherModal = true" 
              class="btn btn-secondary"
            >
              <Icon name="mdi:file-link" class="w-5 h-5 mr-2" />
              Match Episodes
            </button>
            <button @click="refreshMetadata" :disabled="refreshing" class="btn btn-secondary">
              <Icon
                :name="refreshing ? 'mdi:loading' : 'mdi:refresh'"
                :class="{ 'animate-spin': refreshing }"
                class="w-5 h-5 mr-2"
              />
              Refresh
            </button>
            <button
              @click="toggleMonitored"
              :disabled="togglingMonitor"
              :class="media.monitored ? 'btn btn-success' : 'btn btn-secondary'"
            >
              <Icon
                :name="togglingMonitor ? 'mdi:loading' : (media.monitored ? 'mdi:eye-check' : 'mdi:eye-off')"
                :class="{ 'animate-spin': togglingMonitor }"
                class="w-5 h-5 mr-2"
              />
              {{ media.monitored ? 'Monitoring' : 'Not Monitoring' }}
            </button>
            <button
              v-if="media.type === 'tv'"
              @click="showTemplateOverride = true"
              class="btn btn-secondary"
            >
              <Icon name="mdi:text-search" class="w-5 h-5 mr-2" />
              Custom Templates
            </button>
            <button @click="deleteConfirm = true" class="btn btn-danger">
              <Icon name="mdi:delete" class="w-5 h-5 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>

      <!-- Library Location -->
      <div v-if="libraryPath" class="mt-8">
        <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
          <Icon name="mdi:folder" class="w-5 h-5 text-gray-500" />
          Library Location
        </h2>
        <div class="card p-4 flex items-center gap-3">
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

      <!-- Episode Manager for TV Shows -->
      <EpisodeManager 
        v-if="media.type === 'tv'"
        :media-id="mediaId"
        :media-title="media.title"
        :tmdb-id="media.tmdbId"
        :original-title="media.originalTitle"
        :release-year="media.year"
        :imdb-id="media.imdbId"
      />

      <!-- Files Section -->
      <div v-if="media.type === 'movie'" class="mt-8">
        <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
          <Icon name="mdi:file-multiple" class="w-5 h-5 text-gray-500" />
          Files
          <span class="text-sm font-normal text-gray-500">({{ mediaFiles?.length || 0 }})</span>
        </h2>

        <div v-if="mediaFiles && mediaFiles.length" class="space-y-3">
          <div
            v-for="file in mediaFiles"
            :key="file.id"
            class="card p-4"
          >
            <!-- Filename -->
            <div class="flex items-start gap-3 mb-3">
              <Icon name="mdi:video" class="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-sm truncate">{{ file.filename }}</h3>
                <p class="text-xs text-gray-500 truncate mt-0.5">{{ file.path }}</p>
              </div>
              <span
                v-if="file.matchConfidence"
                class="text-xs text-gray-500 flex-shrink-0"
              >
                {{ (file.matchConfidence * 100).toFixed(0) }}% match
              </span>
            </div>
            
            <!-- Media Info -->
            <div v-if="file.mediaInfo" class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pl-8">
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
                  <p class="text-gray-500">Audio</p>
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

            <!-- Fallback if no media info -->
            <div v-else class="flex flex-wrap gap-1.5 mt-2 pl-8">
              <span v-if="file.size" class="file-badge bg-gray-700/50 text-gray-300">
                {{ formatBytes(file.size) }}
              </span>
              <span v-if="file.parsedQuality" class="file-badge bg-blue-600/20 text-blue-400">
                {{ file.parsedQuality }}
              </span>
              <span v-if="file.parsedCodec" class="file-badge bg-purple-600/20 text-purple-400">
                {{ file.parsedCodec }}
              </span>
              <span v-if="file.parsedSource" class="file-badge bg-green-600/20 text-green-400">
                {{ file.parsedSource }}
              </span>
              <span v-if="file.parsedEdition" class="file-badge bg-orange-600/20 text-orange-400">
                {{ file.parsedEdition }}
              </span>
            </div>
          </div>
        </div>

        <div v-else class="card p-8 text-center text-gray-500">
          <Icon name="mdi:file-off" class="w-10 h-10 mx-auto mb-2" />
          <p class="text-sm">No files linked to this media</p>
        </div>
      </div>

    </div>

    <!-- Edit Path Modal -->
    <EditPathModal
      v-if="media && libraryPath"
      :show="showEditPath"
      :media-id="mediaId"
      :current-path="libraryPath"
      @close="showEditPath = false"
      @updated="handlePathUpdated"
    />

    <!-- Torrent Search Modal -->
    <TorrentSearchModal
      v-model="showSearchModal"
      :initial-query="searchQuery"
      :media-type="media?.type || 'movie'"
      :media-id="mediaId"
      :media-data="mediaData"
      @download="onDownloadStarted"
    />

    <!-- Template Override Modal (TV Shows only) -->
    <ShowTemplateOverrideModal
      v-if="media && media.type === 'tv'"
      v-model="showTemplateOverride"
      :tmdb-id="media.tmdbId"
      :show-title="media.title"
      @saved="toast.success('Custom templates updated')"
    />

    <!-- TMDB Identify Modal -->
    <TmdbIdentifyModal
      v-model="showIdentifyModal"
      :media-id="media?.id"
      :initial-query="media?.title || ''"
      :media-type="media?.type === 'tv' ? 'tv' : 'movie'"
      @identified="handleIdentify"
    />

    <!-- Episode Matcher Modal -->
    <EpisodeMatcherModal
      v-if="media?.id"
      v-model="showEpisodeMatcherModal"
      :media-id="media.id"
      @matched="handleEpisodesMatched"
    />

    <!-- Delete Modal -->
    <Teleport to="body">
      <div
        v-if="deleteConfirm"
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
        @click.self="deleteConfirm = false"
      >
        <div class="card p-6 max-w-md w-full">
          <h3 class="text-xl font-semibold mb-2">Delete Media?</h3>
          <p class="text-gray-400 mb-6 text-sm">
            Are you sure you want to delete <strong>"{{ media?.title }}"</strong>?
            This removes it from your library but won't delete actual files on disk.
          </p>
          <div class="flex gap-3">
            <button @click="deleteConfirm = false" class="btn btn-secondary flex-1">Cancel</button>
            <button @click="deleteMedia" :disabled="deleting" class="btn btn-danger flex-1">
              <Icon
                :name="deleting ? 'mdi:loading' : 'mdi:delete'"
                :class="{ 'animate-spin': deleting }"
                class="w-5 h-5 mr-2"
              />
              Delete
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { TorrentResult } from '~/types/api';

const route = useRoute();
const router = useRouter();
const api = useApi();
const toast = useToast();
const { getTMDBImageUrl, formatBytes, parseGenres } = useFormatters();

const mediaId = computed(() => parseInt(route.params.id as string));

// Fetch media
const { data: media, pending, error, refresh } = await useAsyncData(
  `media-${mediaId.value}`,
  () => api.media.getById(mediaId.value)
);

// Fetch files with detailed info
const { data: mediaFiles, refresh: refreshFiles } = await useAsyncData(
  `media-files-${mediaId.value}`,
  async () => {
    try {
      const response = await $fetch(`${useRuntimeConfig().public.apiBase}/api/media/${mediaId.value}/files`);
      return response as any[];
    } catch (err) {
      console.error('Failed to fetch media files:', err);
      return [];
    }
  }
);

const genres = computed(() => parseGenres(media.value?.genres));

// Library path editing
const showEditPath = ref(false);
const libraryPath = computed(() => media.value?.libraryPath);

const handlePathUpdated = async (newPath: string) => {
  // Refresh media data
  await refresh();
  await refreshFiles();
  toast.success('Library path updated');
};

// Refresh metadata
const refreshing = ref(false);
const refreshMetadata = async () => {
  refreshing.value = true;
  try {
    await refresh();
    toast.success('Metadata refreshed');
  } finally {
    refreshing.value = false;
  }
};

// TMDB Identify modal
const showIdentifyModal = ref(false);

const handleIdentify = async (tmdbId: number, type: 'movie' | 'tv') => {
  try {
    const config = useRuntimeConfig();
    await $fetch(`${config.public.apiBase}/api/media/${mediaId.value}/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId, type }),
    });
    
    showIdentifyModal.value = false;
    await refresh();
    toast.success('Successfully identified media');
  } catch (err: any) {
    toast.error(`Failed to identify: ${err.message}`);
  }
};

// Episode Matcher modal
const showEpisodeMatcherModal = ref(false);

const handleEpisodesMatched = async () => {
  await refresh();
  toast.success('Episodes matched successfully');
};

// Torrent search modal
const showSearchModal = ref(false);
const searchQuery = computed(() => {
  if (!media.value) return '';
  return media.value.year
    ? `${media.value.title} ${media.value.year}`
    : media.value.title;
});

const mediaData = computed(() => {
  if (!media.value) return undefined;
  
  return {
    tmdbId: media.value.tmdbId,
    title: media.value.title,
    originalTitle: media.value.originalTitle,
    releaseYear: media.value.year,
    imdbId: media.value.imdbId,
  };
});

// Template override modal
const showTemplateOverride = ref(false);

const onDownloadStarted = () => {
  toast.success('Download started!');
  router.push('/downloads');
};

// Monitor toggle
const togglingMonitor = ref(false);
const toggleMonitored = async () => {
  if (!media.value) return;
  
  togglingMonitor.value = true;
  try {
    const newMonitored = !media.value.monitored;
    const config = useRuntimeConfig();
    await $fetch(`${config.public.apiBase}/api/media/${mediaId.value}/monitored`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monitored: newMonitored }),
    });
    
    // Refresh data
    await refresh();
    
    toast.success(newMonitored 
      ? `Started monitoring ${media.value.title}` 
      : `Stopped monitoring ${media.value.title}`
    );
  } catch (err: any) {
    toast.error(`Failed to toggle monitoring: ${err.message}`);
  } finally {
    togglingMonitor.value = false;
  }
};

// Delete
const deleteConfirm = ref(false);
const deleting = ref(false);

const deleteMedia = async () => {
  deleting.value = true;
  try {
    await api.media.delete(mediaId.value);
    toast.success('Media deleted');
    const type = media.value?.type === 'tv' ? 'tv' : 'movies';
    router.push(`/library/${type}`);
  } catch (err: any) {
    toast.error(`Delete failed: ${err.message}`);
  } finally {
    deleting.value = false;
    deleteConfirm.value = false;
  }
};

useHead({
  title: () => `${media.value?.title || 'Loading...'} - Unifarr`,
});
</script>

<style scoped>
.file-badge {
  @apply px-2 py-0.5 text-xs rounded font-medium;
}
</style>
