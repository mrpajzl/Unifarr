<template>
  <div>
    <!-- Header with Back Button -->
    <div class="mb-8">
      <NuxtLink to="/settings" class="text-gray-400 hover:text-white inline-flex items-center gap-2 mb-4">
        <Icon name="mdi:arrow-left" class="w-5 h-5" />
        Back to Settings
      </NuxtLink>
      <h1 class="text-3xl font-bold">Search Templates</h1>
      <p class="text-gray-500 mt-1">Configure how search queries are generated from metadata</p>
    </div>

    <div class="max-w-6xl space-y-8">
      <!-- Movie Templates -->
      <div class="card p-6">
        <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
          <Icon name="mdi:movie" class="w-6 h-6 text-blue-400" />
          Movie Search Templates
        </h2>
        
        <div class="space-y-4">
          <p class="text-sm text-gray-400">
            Define how movie titles are formatted for torrent searches. Each template will be used to generate a separate search query.
          </p>

          <SearchTemplateEditor
            v-model="settings.searchTemplates.movies"
            type="movie"
          />
        </div>
      </div>

      <!-- TV Show Templates -->
      <div class="card p-6">
        <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
          <Icon name="mdi:television" class="w-6 h-6 text-purple-400" />
          TV Show Search Templates
        </h2>
        
        <div class="space-y-4">
          <p class="text-sm text-gray-400">
            Define how TV episode titles are formatted for torrent searches. Use padding for season/episode numbers (e.g., {Season:2} → 01).
          </p>

          <SearchTemplateEditor
            v-model="settings.searchTemplates.tv"
            type="tv"
          />
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
  </div>
</template>

<script setup lang="ts">
const api = useApi();
const toast = useToast();
const saving = ref(false);

const settings = reactive({
  searchTemplates: {
    movies: [
      '{Movie Title} {Release Year}',
      '{Movie OriginalTitle} {Release Year}',
    ],
    tv: [
      '{Series Title} S{Season:2}E{Episode:2}',
      '{Series OriginalTitle} S{Season:2}E{Episode:2}',
    ],
    overrides: {},
  },
});

// Load settings from backend
onMounted(async () => {
  try {
    const config = useRuntimeConfig();
    const response = await api.apiFetch(`/api/settings`);
    if (response.ok) {
      const data = await response.json();
      if (data.searchTemplates) {
        Object.assign(settings.searchTemplates, data.searchTemplates);
      }
    }
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
        searchTemplates: settings.searchTemplates,
      },
    });

    toast.success('Search templates saved successfully');
  } catch (error: any) {
    toast.error(`Failed to save settings: ${error.message}`);
  } finally {
    saving.value = false;
  }
};

const resetSettings = async () => {
  try {
    const config = useRuntimeConfig();
    const response = await api.apiFetch(`/api/settings`);
    if (response.ok) {
      const data = await response.json();
      if (data.searchTemplates) {
        Object.assign(settings.searchTemplates, data.searchTemplates);
      }
    }
    toast.info('Settings reloaded from server');
  } catch (error: any) {
    toast.error(`Failed to reload settings: ${error.message}`);
  }
};

useHead({ title: 'Search Templates - Settings - Unifarr' });
</script>

<style scoped>
code {
  @apply px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-primary-400 font-mono;
}
</style>
