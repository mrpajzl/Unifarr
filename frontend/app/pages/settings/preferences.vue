<template>
  <div>
    <!-- Header with Back Button -->
    <div class="mb-8">
      <NuxtLink to="/settings" class="text-gray-400 hover:text-white inline-flex items-center gap-2 mb-4">
        <Icon name="mdi:arrow-left" class="w-5 h-5" />
        Back to Settings
      </NuxtLink>
      <h1 class="text-3xl font-bold">Preferences</h1>
      <p class="text-gray-500 mt-1">Configure search and content preferences</p>
    </div>

    <div class="max-w-3xl space-y-6">
      <!-- TMDB Metadata Language -->
      <div class="card p-6">
        <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
          <Icon name="mdi:database" class="w-6 h-6 text-purple-400" />
          TMDB Metadata Language
        </h2>
        <div class="space-y-4">
          <p class="text-sm text-gray-400">
            Language for movie and TV show descriptions, titles, and metadata from TMDB.
          </p>

          <!-- TMDB Language Selector -->
          <div>
            <label class="block text-sm font-medium mb-2">Metadata Language</label>
            <select
              v-model="settings.preferences.tmdbLanguage"
              class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            >
              <option value="cs-CZ">Czech (cs-CZ)</option>
              <option value="en-US">English (en-US)</option>
              <option value="sk-SK">Slovak (sk-SK)</option>
              <option value="de-DE">German (de-DE)</option>
              <option value="fr-FR">French (fr-FR)</option>
              <option value="es-ES">Spanish (es-ES)</option>
              <option value="it-IT">Italian (it-IT)</option>
              <option value="pl-PL">Polish (pl-PL)</option>
              <option value="ru-RU">Russian (ru-RU)</option>
            </select>
            <p class="text-xs text-gray-500 mt-2">
              Selected: {{ settings.preferences.tmdbLanguage }}
            </p>
          </div>
          
          <!-- Info Box -->
          <div class="p-4 bg-purple-600/10 border border-purple-600/30 rounded-lg">
            <h3 class="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
              <Icon name="mdi:information" class="w-4 h-4" />
              About Metadata Language
            </h3>
            <p class="text-xs text-gray-400 leading-relaxed">
              This setting controls the language of descriptions, titles, and other metadata fetched from TMDB. 
              If a translation is not available in the selected language, TMDB will fall back to English.
            </p>
          </div>
        </div>
      </div>

      <!-- Language Preferences -->
      <div class="card p-6">
        <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
          <Icon name="mdi:translate" class="w-6 h-6 text-blue-400" />
          Search Language Preferences
        </h2>
        <div class="space-y-4">
          <p class="text-sm text-gray-400">
            Select preferred audio languages for search results. Files matching these languages will rank higher.
          </p>

          <!-- Language Selector -->
          <div>
            <label class="block text-sm font-medium mb-2">Preferred Languages</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="lang in availableLanguages"
                :key="lang.code"
                @click="toggleLanguage(lang.code)"
                class="px-3 py-2 rounded-lg border transition-colors"
                :class="settings.preferences.languages.includes(lang.code) 
                  ? 'bg-primary-600 border-primary-500 text-white' 
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'"
              >
                <span class="font-semibold">{{ lang.code }}</span>
                <span class="text-xs ml-1">{{ lang.name }}</span>
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              Selected: {{ settings.preferences.languages.join(', ') || 'None' }}
            </p>
          </div>

          <!-- Min Title Score -->
          <div>
            <label class="block text-sm font-medium mb-2">
              Title Match Threshold: {{ settings.preferences.minTitleScore }}%
            </label>
            <input
              v-model.number="settings.preferences.minTitleScore"
              type="range"
              min="0"
              max="100"
              step="5"
              class="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>Loose (0%)</span>
              <span>Balanced (50%)</span>
              <span>Strict (100%)</span>
            </div>
            <p class="text-xs text-gray-400 mt-2">
              <strong>Phase 1 filter:</strong> Eliminates wrong movies/shows. Results with lower title similarity will be filtered out. 
              <br>
              Recommended: 50% (balanced) - filters obvious mismatches while keeping relevant results.
            </p>
          </div>
          
          <!-- Quality Info -->
          <div class="p-4 bg-blue-600/10 border border-blue-600/30 rounded-lg">
            <h3 class="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
              <Icon name="mdi:information" class="w-4 h-4" />
              Two-Phase Scoring
            </h3>
            <p class="text-xs text-gray-400 leading-relaxed">
              <strong>Phase 1:</strong> Title similarity filters wrong content<br>
              <strong>Phase 2:</strong> Quality ranking (language, resolution, size, speed)<br>
              <br>
              Results are sorted by: preferred languages > better quality (1080p/4K) > larger files > faster downloads
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
  </div>
</template>

<script setup lang="ts">
const api = useApi();
const toast = useToast();
const saving = ref(false);

const availableLanguages = [
  { code: 'CZ', name: 'Czech' },
  { code: 'SK', name: 'Slovak' },
  { code: 'EN', name: 'English' },
  { code: 'DE', name: 'German' },
  { code: 'FR', name: 'French' },
  { code: 'ES', name: 'Spanish' },
  { code: 'IT', name: 'Italian' },
  { code: 'PL', name: 'Polish' },
  { code: 'RU', name: 'Russian' },
];

const settings = reactive({
  preferences: {
    languages: ['CZ', 'EN'],
    minTitleScore: 50,
    tmdbLanguage: 'cs-CZ',
  },
});

// Load settings from backend
onMounted(async () => {
  try {
    const config = useRuntimeConfig();
    const response = await api.apiFetch(`/api/settings`);
    if (response.ok) {
      const data = await response.json();
      if (data.preferences) {
        Object.assign(settings.preferences, data.preferences);
      }
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
});

const toggleLanguage = (langCode: string) => {
  const index = settings.preferences.languages.indexOf(langCode);
  if (index > -1) {
    settings.preferences.languages.splice(index, 1);
  } else {
    settings.preferences.languages.push(langCode);
  }
};

const saveSettings = async () => {
  saving.value = true;
  
  try {
    const config = useRuntimeConfig();
    const response = await fetch(`${config.public.apiBase}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preferences: settings.preferences,
      }),
    });

    if (response.ok) {
      toast.success('Preferences saved successfully');
    } else {
      const error = await response.json();
      toast.error(`Failed to save settings: ${error.error || 'Unknown error'}`);
    }
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
      if (data.preferences) {
        Object.assign(settings.preferences, data.preferences);
      }
    }
    toast.info('Settings reloaded from server');
  } catch (error: any) {
    toast.error(`Failed to reload settings: ${error.message}`);
  }
};

useHead({ title: 'Preferences - Settings - Unifarr' });
</script>

<style scoped>
input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #c5f82a;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #c5f82a;
  cursor: pointer;
  border: none;
}
</style>
