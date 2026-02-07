<template>
  <div
    v-if="showModal"
    class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
    @click.self="showModal = false"
  >
    <div class="card p-6 max-w-md w-full">
      <h3 class="text-xl font-semibold mb-4">Scan Library</h3>
      
      <div v-if="loadingSettings" class="flex justify-center py-8">
        <Icon name="mdi:loading" class="w-8 h-8 animate-spin text-primary-500" />
      </div>

      <div v-else-if="configuredPaths.length > 0" class="space-y-4">
        <p class="text-gray-400 text-sm">
          Scan configured library paths for new media files.
        </p>

        <div class="space-y-2">
          <button
            v-for="path in configuredPaths"
            :key="path.path"
            @click="scanPath = path.path; scanType = path.type; scan()"
            :disabled="scanning"
            class="w-full card p-3 text-left hover:border-primary-500/50 transition-colors flex items-center justify-between group"
          >
            <div class="flex items-center gap-3">
              <Icon :name="path.icon" class="w-5 h-5 text-primary-400" />
              <div>
                <p class="font-medium text-sm">{{ path.label }}</p>
                <p class="text-xs text-gray-500 font-mono">{{ path.path }}</p>
              </div>
            </div>
            <Icon name="mdi:chevron-right" class="w-5 h-5 text-gray-600 group-hover:text-primary-400" />
          </button>
          
          <button
            @click="scanBoth"
            :disabled="scanning"
            class="w-full card p-3 text-left hover:border-primary-500/50 transition-colors flex items-center justify-between group border-dashed"
          >
            <div class="flex items-center gap-3">
              <Icon name="mdi:folder-multiple" class="w-5 h-5 text-primary-400" />
              <div>
                <p class="font-medium text-sm">Scan All Libraries</p>
                <p class="text-xs text-gray-500">Scan both Movies and TV Shows</p>
              </div>
            </div>
            <Icon name="mdi:chevron-right" class="w-5 h-5 text-gray-600 group-hover:text-primary-400" />
          </button>
        </div>
      </div>

      <div v-else class="space-y-4">
        <p class="text-gray-400 mb-4 text-sm">
          No library paths configured. Set them in Settings first, or enter a path manually.
        </p>

        <div>
          <label class="label">Directory Path</label>
          <input
            v-model="manualPath"
            type="text"
            placeholder="/data/movies or /data/tvshows"
            class="input w-full"
            @keyup.enter="scanPath = manualPath; scan()"
          />
        </div>
      </div>

      <div class="space-y-4 mt-4">

        <div v-if="scanResult" class="card p-4 border-green-800">
          <div class="flex items-center gap-2 text-green-400 mb-2">
            <Icon name="mdi:check-circle" class="w-5 h-5" />
            <span class="font-medium">Scan Complete</span>
          </div>
          <p class="text-sm text-gray-400">
            Found <span class="text-white font-medium">{{ scanResult.scanned }}</span> files,
            added <span class="text-white font-medium">{{ scanResult.added }}</span> new entries.
          </p>
        </div>

        <div v-if="scanning" class="card p-4 border-blue-800/50">
          <div class="flex items-center gap-2 text-blue-400">
            <Icon name="mdi:loading" class="w-5 h-5 animate-spin" />
            <span class="font-medium">Scanning {{ scanPath }}...</span>
          </div>
        </div>

        <div class="flex gap-3">
          <button @click="showModal = false" class="btn btn-secondary flex-1">
            {{ scanResult ? 'Close' : 'Cancel' }}
          </button>
          <button
            v-if="!configuredPaths.length"
            @click="scanPath = manualPath; scan()"
            :disabled="scanning || !manualPath"
            class="btn btn-primary flex-1"
          >
            <Icon
              :name="scanning ? 'mdi:loading' : 'mdi:folder-search'"
              :class="{ 'animate-spin': scanning }"
              class="w-5 h-5 mr-2"
            />
            {{ scanning ? 'Scanning...' : 'Scan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const api = useApi();
const toast = useToast();
const config = useRuntimeConfig();

const showModal = defineModel<boolean>({ default: false });

const emit = defineEmits<{
  scanned: [result: { scanned: number; added: number }];
}>();

const scanPath = ref('');
const scanType = ref<'movies' | 'tv' | undefined>(undefined);
const manualPath = ref('');
const scanning = ref(false);
const scanResult = ref<{ scanned: number; added: number } | null>(null);
const loadingSettings = ref(false);
const configuredPaths = ref<Array<{ label: string; path: string; icon: string; type: 'movies' | 'tv' }>>([]);

const scan = async () => {
  if (!scanPath.value || scanning.value) return;

  scanning.value = true;
  scanResult.value = null;

  try {
    const result = await api.files.scan(scanPath.value, scanType.value);
    scanResult.value = result;
    toast.success(`Scan complete: ${result.added} new folders found`);
    emit('scanned', result);
  } catch (err: any) {
    toast.error(`Scan failed: ${err.message}`);
  } finally {
    scanning.value = false;
  }
};

const scanBoth = async () => {
  scanning.value = true;
  scanResult.value = null;
  
  let totalScanned = 0;
  let totalAdded = 0;

  for (const pathConfig of configuredPaths.value) {
    scanPath.value = pathConfig.path;
    try {
      const result = await api.files.scan(pathConfig.path, pathConfig.type);
      totalScanned += result.scanned || 0;
      totalAdded += result.added || 0;
    } catch (err: any) {
      toast.error(`Failed to scan ${pathConfig.label}: ${err.message}`);
    }
  }

  scanResult.value = { scanned: totalScanned, added: totalAdded };
  toast.success(`Scan complete: ${totalAdded} new folders found`);
  emit('scanned', scanResult.value);
  scanning.value = false;
};

// Load configured paths from settings
const loadConfiguredPaths = async () => {
  loadingSettings.value = true;
  try {
    const response = await fetch(`${config.public.apiBase}/api/settings`);
    if (response.ok) {
      const settings = await response.json();
      configuredPaths.value = [];
      
      if (settings.moviesPath && settings.moviesPath !== '/data/movies') {
        configuredPaths.value.push({
          label: 'Movies Library',
          path: settings.moviesPath,
          icon: 'mdi:movie',
          type: 'movies',
        });
      }
      
      if (settings.tvPath && settings.tvPath !== '/data/tvshows') {
        configuredPaths.value.push({
          label: 'TV Shows Library',
          path: settings.tvPath,
          icon: 'mdi:television',
          type: 'tv',
        });
      }
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  } finally {
    loadingSettings.value = false;
  }
};

// Load paths and reset on open
watch(showModal, async (open) => {
  if (open) {
    scanResult.value = null;
    await loadConfiguredPaths();
  }
});
</script>
