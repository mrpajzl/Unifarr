<template>
  <div class="mt-8">
    <h2 class="text-2xl font-semibold mb-4 flex items-center gap-2">
      <Icon name="mdi:television-play" class="w-6 h-6 text-primary-500" />
      Episodes
    </h2>

    <!-- Loading -->
    <div v-if="loading" class="card p-12 text-center">
      <Icon name="mdi:loading" class="w-12 h-12 mx-auto mb-3 text-primary-500 animate-spin" />
      <p class="text-gray-400">Loading episodes...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card p-6 bg-red-600/10 border-red-600/50">
      <Icon name="mdi:alert-circle" class="w-6 h-6 inline text-red-400 mr-2" />
      <span class="text-red-400">{{ error }}</span>
    </div>

    <!-- Seasons -->
    <div v-else-if="seasons.length" class="space-y-4">
      <div
        v-for="season in seasons"
        :key="season.season_number"
        class="card"
      >
        <!-- Season Header -->
        <button
          @click="toggleSeason(season.season_number)"
          class="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <Icon 
              :name="expandedSeasons.has(season.season_number) ? 'mdi:chevron-down' : 'mdi:chevron-right'" 
              class="w-5 h-5 text-gray-400"
            />
            <h3 class="text-lg font-semibold">{{ season.name }}</h3>
            <span class="text-sm text-gray-500">
              {{ season.episodes.length }} episodes
            </span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <span class="px-2 py-1 bg-green-600/20 text-green-400 rounded">
              {{ season.episodes.filter((e: any) => e.hasFile).length }} / {{ season.episodes.length }}
            </span>
          </div>
        </button>

        <!-- Episodes List -->
        <div v-if="expandedSeasons.has(season.season_number)" class="border-t border-gray-800">
          <div
            v-for="episode in season.episodes"
            :key="episode.episode_number"
            class="p-4 border-b border-gray-800 last:border-b-0 hover:bg-gray-800/30 transition-colors"
          >
            <div class="flex items-start gap-4">
              <!-- Episode Thumbnail -->
              <div class="flex-shrink-0 w-32 aspect-video bg-gray-800 rounded overflow-hidden">
                <img
                  v-if="episode.still_path"
                  :src="`https://image.tmdb.org/t/p/w300${episode.still_path}`"
                  :alt="episode.name"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-gray-600">
                  <Icon name="mdi:image-off" class="w-8 h-8" />
                </div>
              </div>

              <!-- Episode Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-4 mb-2">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-sm font-mono bg-gray-800 px-2 py-0.5 rounded">
                        S{{ season.season_number.toString().padStart(2, '0') }}E{{ episode.episode_number.toString().padStart(2, '0') }}
                      </span>
                      <h4 class="font-medium truncate">{{ episode.name }}</h4>
                      <Icon 
                        v-if="episode.hasFile" 
                        name="mdi:check-circle" 
                        class="w-5 h-5 text-green-400 flex-shrink-0"
                        title="File available"
                      />
                      <Icon 
                        v-else 
                        name="mdi:alert-circle-outline" 
                        class="w-5 h-5 text-gray-600 flex-shrink-0"
                        title="Missing"
                      />
                    </div>
                    <p v-if="episode.overview" class="text-sm text-gray-400 line-clamp-2">
                      {{ episode.overview }}
                    </p>
                    <div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span v-if="episode.air_date">{{ formatDate(episode.air_date) }}</span>
                      <span v-if="episode.runtime">{{ episode.runtime }} min</span>
                      <span v-if="episode.file" class="text-green-400">
                        {{ episode.file.filename }}
                      </span>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex gap-2 flex-shrink-0">
                    <button
                      @click="searchEpisode(season.season_number, episode.episode_number, episode.name)"
                      class="btn btn-primary btn-sm"
                      title="Search for download"
                    >
                      <Icon name="mdi:magnify" class="w-4 h-4" />
                    </button>
                    <button
                      @click="matchFile(season.season_number, episode.episode_number)"
                      class="btn btn-secondary btn-sm"
                      title="Match file"
                    >
                      <Icon name="mdi:link-variant" class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card p-12 text-center">
      <Icon name="mdi:television-off" class="w-16 h-16 mx-auto mb-4 text-gray-600" />
      <p class="text-gray-400">No episodes found</p>
    </div>

    <!-- Search Modal -->
    <TorrentSearchModal
      v-model="showSearchModal"
      :initial-query="searchQuery"
      :media-type="'tv'"
      :media-id="mediaId"
      :media-data="currentMediaData"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue';

interface Props {
  mediaId: number;
  mediaTitle: string;
  tmdbId?: number;
  originalTitle?: string;
  releaseYear?: number;
  imdbId?: string;
}

const props = defineProps<Props>();

const api = useApi();
const expandedSeasons = ref(new Set<number>());
const showSearchModal = ref(false);
const searchQuery = ref('');
const currentMediaData = ref<any>(null);

// Fetch episodes
const { data: episodesData, pending: loading, error: errorMsg } = await useAsyncData(
  `episodes-${props.mediaId}`,
  () => api.media.getEpisodes(props.mediaId),
  { server: false }
);

const seasons = computed(() => episodesData.value?.seasons || []);
const error = computed(() => errorMsg.value?.message);

// Expand first season by default
onMounted(() => {
  if (seasons.value.length > 0) {
    expandedSeasons.value.add(1);
  }
});

// Toggle season expansion
const toggleSeason = (seasonNumber: number) => {
  if (expandedSeasons.value.has(seasonNumber)) {
    expandedSeasons.value.delete(seasonNumber);
  } else {
    expandedSeasons.value.add(seasonNumber);
  }
};

// Search for episode
const searchEpisode = async (season: number, episode: number, episodeName: string) => {
  const seasonStr = season.toString().padStart(2, '0');
  const episodeStr = episode.toString().padStart(2, '0');
  searchQuery.value = `${props.mediaTitle} S${seasonStr}E${episodeStr}`;
  
  // Create media data for template search
  if (props.tmdbId) {
    currentMediaData.value = {
      tmdbId: props.tmdbId,
      title: props.mediaTitle,
      originalTitle: props.originalTitle,
      releaseYear: props.releaseYear,
      imdbId: props.imdbId,
      season: season,
      episode: episode,
      episodeTitle: episodeName,
    };
  }
  
  // Wait for next tick to ensure props are updated
  await nextTick();
  showSearchModal.value = true;
};

// Match file to episode
const matchFile = (season: number, episode: number) => {
  // TODO: Open file browser/unmatched files modal
  console.log('Match file for S' + season + 'E' + episode);
  alert('File matching coming soon!');
};

// Format date
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
