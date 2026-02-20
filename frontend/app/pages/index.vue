<template>
  <div>
    <!-- Hero -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold">Dashboard</h1>
      <p class="text-gray-500 mt-1">Your media library at a glance</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      <NuxtLink to="/library/movies" class="card p-4 hover:border-primary-500/50 transition-colors group">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-lg bg-primary-600/20 flex items-center justify-center">
            <Icon name="mdi:movie" class="w-5 h-5 text-primary-400" />
          </div>
          <span class="text-2xl font-bold">{{ stats.movies }}</span>
        </div>
        <p class="text-sm text-gray-400 group-hover:text-gray-300">Movies</p>
      </NuxtLink>

      <NuxtLink to="/library/tv" class="card p-4 hover:border-primary-500/50 transition-colors group">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
            <Icon name="mdi:television" class="w-5 h-5 text-purple-400" />
          </div>
          <span class="text-2xl font-bold">{{ stats.tv }}</span>
        </div>
        <p class="text-sm text-gray-400 group-hover:text-gray-300">TV Shows</p>
      </NuxtLink>

      <NuxtLink to="/unmatched" class="card p-4 hover:border-red-500/50 transition-colors group">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
            <Icon name="mdi:help-circle" class="w-5 h-5 text-red-400" />
          </div>
          <span class="text-2xl font-bold">{{ stats.unmatched }}</span>
        </div>
        <p class="text-sm text-gray-400 group-hover:text-gray-300">Unmatched</p>
      </NuxtLink>

      <NuxtLink to="/downloads" class="card p-4 hover:border-green-500/50 transition-colors group">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
            <Icon name="mdi:download" class="w-5 h-5 text-green-400" />
          </div>
          <span class="text-2xl font-bold">{{ stats.downloads }}</span>
        </div>
        <p class="text-sm text-gray-400 group-hover:text-gray-300">Downloads</p>
      </NuxtLink>

      <div class="card p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <Icon name="mdi:file-multiple" class="w-5 h-5 text-gray-400" />
          </div>
          <span class="text-2xl font-bold">{{ stats.totalFiles }}</span>
        </div>
        <p class="text-sm text-gray-500">Total Files</p>
      </div>

      <NuxtLink to="/discover" class="card p-4 hover:border-primary-500/50 transition-colors group border-dashed">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center group-hover:bg-primary-600/20 transition-colors">
            <Icon name="mdi:plus" class="w-5 h-5 text-gray-400 group-hover:text-primary-400" />
          </div>
        </div>
        <p class="text-sm text-gray-400 group-hover:text-gray-300">Search & Discover</p>
      </NuxtLink>
    </div>

    <!-- Recent Activity -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recently Added -->
      <div>
        <h2 class="text-lg font-semibold mb-4">Recently Added</h2>
        <div v-if="recentMedia.length" class="space-y-2">
          <NuxtLink
            v-for="item in recentMedia"
            :key="item.id"
            :to="`/media/${item.id}`"
            class="card p-3 flex items-center gap-3 hover:border-primary-500/50 transition-colors group"
          >
            <div class="w-10 h-14 rounded overflow-hidden bg-gray-800 flex-shrink-0">
              <img
                v-if="item.posterPath"
                :src="getTMDBImageUrl(item.posterPath, 'w200')"
                :alt="item.title"
                class="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-sm truncate group-hover:text-primary-400 transition-colors">{{ item.title }}</h3>
              <div class="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span>{{ item.year }}</span>
                <span class="capitalize">{{ item.type }}</span>
                <span>{{ formatRelativeTime(item.createdAt) }}</span>
              </div>
            </div>
          </NuxtLink>
        </div>
        <div v-else class="card p-6 text-center text-gray-500 text-sm">
          No media added yet
        </div>
      </div>

      <!-- Quick Actions -->
      <div>
        <h2 class="text-lg font-semibold mb-4">Quick Actions</h2>
        <div class="space-y-2">
          <NuxtLink to="/discover" class="card p-4 w-full text-left hover:border-primary-500/50 transition-colors group flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-primary-600/20 flex items-center justify-center flex-shrink-0">
              <Icon name="mdi:compass" class="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p class="font-medium text-sm group-hover:text-primary-400 transition-colors">Discover</p>
              <p class="text-xs text-gray-500">Browse trending and popular content</p>
            </div>
          </NuxtLink>

          <button @click="showScan = true" class="card p-4 w-full text-left hover:border-primary-500/50 transition-colors group flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
              <Icon name="mdi:folder-search" class="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p class="font-medium text-sm group-hover:text-primary-400 transition-colors">Scan Library</p>
              <p class="text-xs text-gray-500">Discover new media files on disk</p>
            </div>
          </button>

          <NuxtLink to="/discover" class="card p-4 w-full text-left hover:border-primary-500/50 transition-colors group flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center flex-shrink-0">
              <Icon name="mdi:plus-circle" class="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p class="font-medium text-sm group-hover:text-primary-400 transition-colors">Search & Discover</p>
              <p class="text-xs text-gray-500">Search TMDB and download</p>
            </div>
          </NuxtLink>

          <NuxtLink v-if="stats.unmatched > 0" to="/unmatched" class="card p-4 w-full text-left hover:border-red-500/50 transition-colors group flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center flex-shrink-0">
              <Icon name="mdi:link-variant" class="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p class="font-medium text-sm group-hover:text-red-400 transition-colors">Match Files</p>
              <p class="text-xs text-gray-500">{{ stats.unmatched }} files need matching</p>
            </div>
          </NuxtLink>

          <NuxtLink to="/downloads" class="card p-4 w-full text-left hover:border-primary-500/50 transition-colors group flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
              <Icon name="mdi:download" class="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p class="font-medium text-sm group-hover:text-primary-400 transition-colors">Downloads</p>
              <p class="text-xs text-gray-500">
                {{ stats.downloads > 0 ? `${stats.downloads} active` : 'No active downloads' }}
              </p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Scan Modal -->
    <ScanLibrary v-model="showScan" @scanned="onScanned" />
  </div>
</template>

<script setup lang="ts">
const api = useApi();
const { getTMDBImageUrl, formatRelativeTime } = useFormatters();

const showScan = ref(false);

const stats = reactive({
  movies: 0,
  tv: 0,
  unmatched: 0,
  downloads: 0,
  totalFiles: 0,
});

// Data refs
const media = ref<any[]>([]);
const files = ref<any[]>([]);
const unmatched = ref<any[]>([]);
const downloads = ref<{ downloads: any[] } | null>(null);

// Fetch data after component is mounted (ensures localStorage is available)
onMounted(async () => {
  try {
    [media.value, files.value, unmatched.value, downloads.value] = await Promise.all([
      api.media.getAll(),
      api.files.getAll(),
      api.files.getUnmatched(),
      api.downloads.getActive(),
    ]);
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
  }
});

const refreshMedia = async () => {
  try {
    media.value = await api.media.getAll();
  } catch (error) {
    console.error('Failed to refresh media:', error);
  }
};

// Compute stats
watch([media, files, unmatched, downloads], () => {
  stats.movies = media.value.filter((m) => m.type === 'movie').length;
  stats.tv = media.value.filter((m) => m.type === 'tv').length;
  stats.unmatched = unmatched.value.length;
  stats.downloads = downloads.value?.downloads?.length || 0;
  stats.totalFiles = files.value.length;
}, { immediate: true });

// Recent media (last 8 added)
const recentMedia = computed(() => {
  return [...media.value]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 8);
});

const onScanned = async () => {
  try {
    [media.value, files.value, unmatched.value] = await Promise.all([
      api.media.getAll(),
      api.files.getAll(),
      api.files.getUnmatched(),
    ]);
  } catch (error) {
    console.error('Failed to refresh after scan:', error);
  }
};

useHead({ title: 'Dashboard - Unifarr' });
</script>
