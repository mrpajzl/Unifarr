<template>
  <div>
    <!-- Header with Back Button -->
    <div class="mb-8">
      <NuxtLink to="/settings" class="text-gray-400 hover:text-white inline-flex items-center gap-2 mb-4">
        <Icon name="mdi:arrow-left" class="w-5 h-5" />
        Back to Settings
      </NuxtLink>
      <h1 class="text-3xl font-bold">Libraries</h1>
      <p class="text-gray-500 mt-1">Manage your movies and TV shows library paths</p>
    </div>

    <div class="max-w-3xl space-y-6">
      <!-- Library Paths -->
      <div class="card p-6">
        <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
          <Icon name="mdi:folder-multiple" class="w-6 h-6 text-blue-400" />
          Library Paths
        </h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Movies Root Path</label>
            <div class="flex gap-2">
              <input
                v-model="settings.moviesPath"
                type="text"
                class="input flex-1 font-mono text-sm"
                placeholder="/path/to/movies"
              />
              <button
                @click="showMoviesBrowser = true"
                class="btn btn-secondary"
              >
                <Icon name="mdi:folder-open" class="w-4 h-4" />
                Browse
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Root directory where movie folders are stored
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">TV Shows Root Path</label>
            <div class="flex gap-2">
              <input
                v-model="settings.tvPath"
                type="text"
                class="input flex-1 font-mono text-sm"
                placeholder="/path/to/tvshows"
              />
              <button
                @click="showTVBrowser = true"
                class="btn btn-secondary"
              >
                <Icon name="mdi:folder-open" class="w-4 h-4" />
                Browse
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Root directory where TV show folders are stored
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Downloads Path</label>
            <div class="flex gap-2">
              <input
                v-model="settings.downloadsPath"
                type="text"
                class="input flex-1 font-mono text-sm"
                placeholder="/path/to/downloads"
              />
              <button
                @click="showDownloadsBrowser = true"
                class="btn btn-secondary"
              >
                <Icon name="mdi:folder-open" class="w-4 h-4" />
                Browse
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Temporary directory for downloading HTTP files
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Torrents Path</label>
            <div class="flex gap-2">
              <input
                v-model="settings.torrentsPath"
                type="text"
                class="input flex-1 font-mono text-sm"
                placeholder="/path/to/torrents (leave empty to use Downloads Path)"
              />
              <button
                @click="showTorrentsBrowser = true"
                class="btn btn-secondary"
              >
                <Icon name="mdi:folder-open" class="w-4 h-4" />
                Browse
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Directory for torrent files and downloads. Leave empty to use Downloads Path.
            </p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button
          @click="saveSettings"
          :disabled="saving"
          class="btn btn-primary"
        >
          <Icon v-if="!saving" name="mdi:content-save" class="w-4 h-4" />
          <Icon v-else name="mdi:loading" class="w-4 h-4 animate-spin" />
          Save Settings
        </button>
        
        <button
          @click="resetSettings"
          class="btn btn-secondary"
        >
          <Icon name="mdi:refresh" class="w-4 h-4" />
          Reset
        </button>
      </div>
    </div>

    <!-- File Browsers -->
    <FileBrowser
      v-model="showMoviesBrowser"
      title="Select Movies Library Folder"
      @select="(path) => settings.moviesPath = path"
    />
    
    <FileBrowser
      v-model="showTVBrowser"
      title="Select TV Shows Library Folder"
      @select="(path) => settings.tvPath = path"
    />
    
    <FileBrowser
      v-model="showDownloadsBrowser"
      title="Select Downloads Folder"
      @select="(path) => settings.downloadsPath = path"
    />
    
    <FileBrowser
      v-model="showTorrentsBrowser"
      title="Select Torrents Folder"
      @select="(path) => settings.torrentsPath = path"
    />
  </div>
</template>

<script setup lang="ts">
const { showToast } = useToast();
const api = useApi();

const saving = ref(false);
const showMoviesBrowser = ref(false);
const showTVBrowser = ref(false);
const showDownloadsBrowser = ref(false);
const showTorrentsBrowser = ref(false);

const settings = reactive({
  moviesPath: '/data/movies',
  tvPath: '/data/tvshows',
  downloadsPath: '/data/downloads',
  torrentsPath: '',
});

// Load settings from backend
onMounted(async () => {
  try {
    const data = await api.apiFetch('/api/settings');
    if (data.moviesPath) settings.moviesPath = data.moviesPath;
    if (data.tvPath) settings.tvPath = data.tvPath;
    if (data.downloadsPath) settings.downloadsPath = data.downloadsPath;
    if (data.torrentsPath !== undefined) settings.torrentsPath = data.torrentsPath;
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
});

const saveSettings = async () => {
  saving.value = true;
  
  try {
    await api.apiFetch('/api/settings', {
      method: 'PATCH',
      body: {
        moviesPath: settings.moviesPath,
        tvPath: settings.tvPath,
        downloadsPath: settings.downloadsPath,
        torrentsPath: settings.torrentsPath,
      },
    });

    showToast('Library settings saved successfully', 'success');
  } catch (error: any) {
    showToast(`Failed to save settings: ${error.message}`, 'error');
  } finally {
    saving.value = false;
  }
};

const resetSettings = async () => {
  try {
    const data = await api.apiFetch('/api/settings');
    if (data.moviesPath) settings.moviesPath = data.moviesPath;
    if (data.tvPath) settings.tvPath = data.tvPath;
    if (data.downloadsPath) settings.downloadsPath = data.downloadsPath;
    if (data.torrentsPath !== undefined) settings.torrentsPath = data.torrentsPath;
    showToast('Settings reloaded from server', 'info');
  } catch (error: any) {
    showToast(`Failed to reload settings: ${error.message}`, 'error');
  }
};

useHead({ title: 'Libraries - Settings - Unifarr' });
</script>
