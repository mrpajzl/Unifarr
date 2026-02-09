<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold">Download Center</h1>
        <p class="text-gray-500 mt-1">Manage downloads and sources</p>
      </div>
      <div class="flex gap-2">
        <button @click="refresh()" :disabled="pending" class="btn btn-secondary btn-sm">
          <Icon :name="pending ? 'mdi:loading' : 'mdi:refresh'" :class="{ 'animate-spin': pending }" class="w-4 h-4 mr-1.5" />
          Refresh
        </button>
        <button @click="showTrackerSettings = true" class="btn btn-secondary btn-sm">
          <Icon name="mdi:cog" class="w-4 h-4 mr-1.5" />
          Tracker Settings
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6 border-b border-gray-800">
      <button
        @click="activeTab = 'active'"
        class="px-4 py-2 font-medium transition-colors border-b-2"
        :class="activeTab === 'active' ? 'text-primary-400 border-primary-400' : 'text-gray-400 border-transparent hover:text-gray-300'"
      >
        <Icon name="mdi:download" class="w-4 h-4 inline mr-1.5" />
        Active ({{ activeDownloads.length }})
      </button>
      <button
        @click="activeTab = 'queue'"
        class="px-4 py-2 font-medium transition-colors border-b-2"
        :class="activeTab === 'queue' ? 'text-primary-400 border-primary-400' : 'text-gray-400 border-transparent hover:text-gray-300'"
      >
        <Icon name="mdi:playlist-play" class="w-4 h-4 inline mr-1.5" />
        Queue ({{ queuedDownloads.length }})
      </button>
      <button
        @click="activeTab = 'completed'"
        class="px-4 py-2 font-medium transition-colors border-b-2"
        :class="activeTab === 'completed' ? 'text-primary-400 border-primary-400' : 'text-gray-400 border-transparent hover:text-gray-300'"
      >
        <Icon name="mdi:check-circle" class="w-4 h-4 inline mr-1.5" />
        Completed
      </button>
    </div>

    <!-- Settings Bar -->
    <div class="card p-4 mb-6 flex items-center gap-4">
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-400">Parallel Downloads:</label>
        <input
          v-model.number="settings.parallelDownloads"
          type="number"
          min="1"
          max="10"
          class="input w-20 text-sm"
          @change="saveSettings"
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-400">Max Speed:</label>
        <input
          v-model="settings.maxSpeed"
          type="text"
          placeholder="Unlimited"
          class="input w-32 text-sm"
        />
      </div>
      <div class="flex-1"></div>
      <button @click="pauseAll" :disabled="activeDownloads.length === 0" class="btn btn-secondary btn-sm">
        <Icon name="mdi:pause" class="w-4 h-4 mr-1" />
        Pause All
      </button>
    </div>

    <!-- Active Downloads -->
    <div v-if="activeTab === 'active'" class="space-y-3">
      <div v-if="pending" class="card p-12 text-center">
        <Icon name="mdi:loading" class="w-16 h-16 mx-auto mb-4 text-gray-600 animate-spin" />
        <p class="text-gray-400">Loading downloads...</p>
      </div>
      
      <div v-else-if="activeDownloads.length === 0" class="card p-12 text-center">
        <Icon name="mdi:download-off" class="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <p class="text-gray-400">No active downloads</p>
      </div>

      <template v-else>
        <div
          v-for="download in activeDownloads"
          :key="download.id"
          class="card p-4"
        >
        <div class="flex items-start gap-4">
          <div class="flex-1 min-w-0">
            <h3 class="font-medium mb-1 truncate">{{ download.name }}</h3>
            
            <!-- Progress Bar -->
            <div class="mb-2">
              <div class="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  class="h-full bg-primary-600 transition-all duration-300"
                  :style="{ width: `${(download.progress || 0) * 100}%` }"
                />
              </div>
              <div class="flex items-center justify-between mt-1 text-xs text-gray-500">
                <span>{{ ((download.progress || 0) * 100).toFixed(1) }}%</span>
                <span v-if="download.downloadSpeed">{{ formatSpeed(download.downloadSpeed) }}</span>
                <span v-if="download.eta">ETA: {{ formatTime(download.eta) }}</span>
              </div>
            </div>

            <!-- Stats -->
            <div class="flex items-center gap-4 text-sm">
              <!-- Status Badge -->
              <span class="px-2 py-1 rounded text-xs font-medium" :class="{
                'bg-blue-600/20 text-blue-400': download.status === 'downloading',
                'bg-yellow-600/20 text-yellow-400': download.status === 'queued',
                'bg-gray-600/20 text-gray-400': download.status === 'paused',
                'bg-green-600/20 text-green-400': download.status === 'completed' || download.status === 'seeding',
              }">
                {{ download.status }}
              </span>
              
              <!-- Type Badge -->
              <span class="px-2 py-1 rounded text-xs font-medium bg-gray-700/50 text-gray-300">
                {{ download.type === 'http' ? 'HTTP' : 'Torrent' }}
              </span>
              
              <!-- Size -->
              <div v-if="download.size" class="flex items-center gap-1.5 text-gray-400">
                <Icon name="mdi:harddisk" class="w-4 h-4" />
                <span class="font-medium">{{ formatBytes(download.size) }}</span>
              </div>

              <!-- Upload Speed -->
              <div v-if="download.uploadSpeed && download.uploadSpeed > 0" class="flex items-center gap-1.5 text-primary-400">
                <Icon name="mdi:upload" class="w-4 h-4" />
                <span class="font-semibold">{{ formatSpeed(download.uploadSpeed) }}</span>
              </div>

              <!-- Seeders -->
              <div v-if="download.seeders !== undefined" class="flex items-center gap-1.5" :title="`${download.seeders} seeders`">
                <Icon name="mdi:account-arrow-up" class="w-4 h-4 text-green-400" />
                <span class="font-semibold text-green-400">{{ download.seeders }}</span>
              </div>

              <!-- Leechers -->
              <div v-if="download.leechers !== undefined" class="flex items-center gap-1.5" :title="`${download.leechers} leechers`">
                <Icon name="mdi:account-arrow-down" class="w-4 h-4 text-red-400" />
                <span class="font-semibold text-red-400">{{ download.leechers }}</span>
              </div>

              <!-- Total Peers (fallback if seeders/leechers not available) -->
              <div v-else-if="download.peers" class="flex items-center gap-1.5 text-gray-400" :title="`${download.peers} peers`">
                <Icon name="mdi:account-group" class="w-4 h-4" />
                <span>{{ download.peers }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 flex-shrink-0">
            <button
              v-if="download.type === 'torrent'"
              @click="pauseDownload(download.id)"
              :disabled="download.status === 'paused'"
              class="btn btn-secondary btn-sm"
              title="Pause"
            >
              <Icon name="mdi:pause" class="w-4 h-4" />
            </button>
            <button
              v-if="download.type === 'torrent'"
              @click="resumeDownload(download.id)"
              :disabled="download.status !== 'paused'"
              class="btn btn-secondary btn-sm"
              title="Resume"
            >
              <Icon name="mdi:play" class="w-4 h-4" />
            </button>
            <button
              @click="cancelDownload(download.id)"
              class="btn btn-secondary btn-sm text-red-400 hover:text-red-300"
              :title="download.type === 'http' ? 'Cancel download' : 'Cancel'"
            >
              <Icon name="mdi:close" class="w-4 h-4" />
            </button>
          </div>
        </div>
        </div>
      </template>
    </div>

    <!-- Queue -->
    <div v-if="activeTab === 'queue'" class="space-y-3">
      <div v-if="queuedDownloads.length === 0" class="card p-12 text-center">
        <Icon name="mdi:playlist-remove" class="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <p class="text-gray-400">Queue is empty</p>
      </div>

      <div
        v-for="(download, index) in queuedDownloads"
        :key="download.id"
        class="card p-4"
      >
        <div class="flex items-center gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-mono bg-gray-800 px-2 py-0.5 rounded">#{index + 1}</span>
              <h3 class="font-medium truncate">{{ download.name }}</h3>
            </div>
            <p class="text-xs text-gray-500">{{ download.size ? formatBytes(download.size) : 'Unknown size' }}</p>
          </div>

          <button
            @click="cancelDownload(download.id)"
            class="btn btn-secondary btn-sm text-red-400 hover:text-red-300"
          >
            <Icon name="mdi:delete" class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Tracker Settings Modal -->
    <TrackerSettingsModal
      :show="showTrackerSettings"
      @close="showTrackerSettings = false"
    />
  </div>
</template>

<script setup lang="ts">
const api = useApi();
const toast = useToast();

const activeTab = ref<'active' | 'queue' | 'completed'>('active');
const showTrackerSettings = ref(false);

const settings = reactive({
  parallelDownloads: 3,
  maxSpeed: '',
});

// Fetch downloads from API
const { data: downloadsData, pending, refresh } = await useAsyncData(
  'downloads',
  () => api.downloads.getAll(),
  { 
    server: false,
    default: () => ({ downloads: [] })
  }
);

// Auto-refresh every 3 seconds
const refreshInterval = ref<NodeJS.Timeout | null>(null);

onMounted(() => {
  refreshInterval.value = setInterval(() => {
    refresh();
  }, 3000);
});

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
});

// Computed filtered downloads
const activeDownloads = computed(() => {
  return downloadsData.value?.downloads?.filter(
    d => d.status === 'downloading' || d.status === 'queued'
  ) || [];
});

const queuedDownloads = computed(() => {
  return downloadsData.value?.downloads?.filter(
    d => d.status === 'queued'
  ) || [];
});

const formatBytes = (bytes: number) => {
  const gb = bytes / (1024 ** 3);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 ** 2);
  return `${mb.toFixed(0)} MB`;
};

const formatSpeed = (bytesPerSec: number) => {
  const mbps = bytesPerSec / (1024 ** 2);
  return `${mbps.toFixed(2)} MB/s`;
};

const formatTime = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
};

const pauseDownload = async (hash: string) => {
  try {
    await api.downloads.pause(hash);
    toast.success('Download paused');
    await refresh();
  } catch (err: any) {
    toast.error('Failed to pause: ' + err.message);
  }
};

const resumeDownload = async (hash: string) => {
  try {
    await api.downloads.resume(hash);
    toast.success('Download resumed');
    await refresh();
  } catch (err: any) {
    toast.error('Failed to resume: ' + err.message);
  }
};

const cancelDownload = async (hash: string) => {
  if (!confirm('Are you sure you want to cancel this download?')) return;
  
  try {
    await api.downloads.delete(hash, false);
    toast.success('Download cancelled');
    await refresh();
  } catch (err: any) {
    toast.error('Failed to cancel: ' + err.message);
  }
};

const pauseAll = async () => {
  if (activeDownloads.value.length === 0) return;
  
  try {
    for (const download of activeDownloads.value) {
      if (download.status === 'downloading') {
        await api.downloads.pause(download.torrentHash);
      }
    }
    toast.success('All downloads paused');
    await refresh();
  } catch (err: any) {
    toast.error('Failed to pause all: ' + err.message);
  }
};

const saveSettings = () => {
  console.log('Save settings', settings);
};

useHead({ title: 'Downloads - Unifarr' });
</script>
