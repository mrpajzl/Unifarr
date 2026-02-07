<template>
  <div>
    <!-- Header with Back Button -->
    <div class="mb-8">
      <NuxtLink to="/settings" class="text-gray-400 hover:text-white inline-flex items-center gap-2 mb-4">
        <Icon name="mdi:arrow-left" class="w-5 h-5" />
        Back to Settings
      </NuxtLink>
      <h1 class="text-3xl font-bold">Trackers</h1>
      <p class="text-gray-500 mt-1">Configure download providers and torrent trackers</p>
    </div>

    <div class="max-w-5xl space-y-6">
      <!-- Tracker Catalog -->
      <div class="card p-6">
        <h2 class="text-xl font-semibold mb-4">Available Trackers</h2>
        <p class="text-sm text-gray-400 mb-4">
          Add and configure torrent trackers for searching content.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="tracker in availableTrackers"
            :key="tracker.id"
            class="card p-4 border"
            :class="isTrackerConfigured(tracker.id) ? 'border-primary-600 bg-primary-600/5' : 'border-gray-700'"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <h3 class="font-semibold text-lg">{{ tracker.name }}</h3>
                <p class="text-xs text-gray-500">{{ tracker.language }} • {{ tracker.type }}</p>
              </div>
              <Icon
                v-if="isTrackerConfigured(tracker.id)"
                name="mdi:check-circle"
                class="w-6 h-6 text-primary-400 flex-shrink-0"
              />
            </div>
            
            <p class="text-sm text-gray-400 mb-3">{{ tracker.description }}</p>
            
            <div class="flex items-center justify-between">
              <div class="flex gap-2 text-xs">
                <span
                  v-for="cat in tracker.categories.slice(0, 3)"
                  :key="cat"
                  class="px-2 py-1 bg-gray-800 rounded"
                >
                  {{ cat }}
                </span>
                <span v-if="tracker.categories.length > 3" class="px-2 py-1 bg-gray-800 rounded">
                  +{{ tracker.categories.length - 3 }}
                </span>
              </div>
              
              <button
                @click="configureTracker(tracker)"
                class="btn btn-sm"
                :class="isTrackerConfigured(tracker.id) ? 'btn-secondary' : 'btn-primary'"
              >
                {{ isTrackerConfigured(tracker.id) ? 'Configure' : 'Add' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Configured Trackers -->
      <div class="card p-6">
        <h2 class="text-xl font-semibold mb-4">Configured Trackers</h2>

        <!-- SKTorrent -->
        <div v-if="settings.trackers?.sktorrent" class="space-y-4 mb-6">
          <div class="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
            <div class="flex items-center gap-3">
              <Icon name="mdi:server-network" class="w-6 h-6 text-primary-400" />
              <div>
                <h3 class="font-semibold">Sk-CzTorrent</h3>
                <p class="text-sm text-gray-500">Semi-Private Tracker</p>
              </div>
            </div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="settings.trackers.sktorrent.enabled"
                type="checkbox"
                class="w-4 h-4 rounded border-gray-700 bg-gray-800 text-primary-600 focus:ring-primary-600"
              />
              <span class="text-sm">Enabled</span>
            </label>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">Username</label>
              <input
                v-model="settings.trackers.sktorrent.username"
                type="text"
                class="input w-full"
                placeholder="Your SKTorrent username"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Password</label>
              <input
                v-model="settings.trackers.sktorrent.password"
                type="password"
                class="input w-full"
                placeholder="Your SKTorrent password"
              />
            </div>
          </div>

          <button
            @click="testTracker('sktorrent')"
            :disabled="testingTracker || !settings.trackers.sktorrent.username || !settings.trackers.sktorrent.password"
            class="btn btn-secondary"
          >
            <Icon v-if="!testingTracker" name="mdi:connection" class="w-4 h-4" />
            <Icon v-else name="mdi:loading" class="w-4 h-4 animate-spin" />
            Test Connection
          </button>
        </div>
      </div>

      <!-- Webshare.cz (HTTP Downloader) -->
      <div class="card p-6">
        <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
          <Icon name="mdi:cloud-download" class="w-6 h-6 text-primary-400" />
          Webshare.cz
        </h2>
        <p class="text-sm text-gray-400 mb-4">
          Direct file downloader (not a torrent tracker)
        </p>
        <div class="space-y-4">
          <p class="text-sm text-gray-400">
            Connect your Webshare.cz account to search and download files directly from Unifarr.
          </p>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">Username</label>
              <input
                v-model="settings.webshare.username"
                type="text"
                class="input w-full"
                placeholder="Your Webshare username"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Password</label>
              <input
                v-model="settings.webshare.password"
                type="password"
                class="input w-full"
                placeholder="Your Webshare password"
              />
            </div>
          </div>

          <div class="flex items-center gap-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="settings.webshare.enabled"
                type="checkbox"
                class="w-4 h-4 rounded border-gray-700 bg-gray-800 text-primary-600 focus:ring-primary-600"
              />
              <span class="text-sm">Enable Webshare integration</span>
            </label>
          </div>

          <button
            @click="testWebshare"
            :disabled="testingWebshare || !settings.webshare.username || !settings.webshare.password"
            class="btn btn-secondary"
          >
            <Icon v-if="!testingWebshare" name="mdi:connection" class="w-4 h-4" />
            <Icon v-else name="mdi:loading" class="w-4 h-4 animate-spin" />
            Test Connection
          </button>

          <div class="mt-4 pt-4 border-t border-gray-700">
            <p class="text-xs text-gray-500">
              Don't have a Webshare account? 
              <a href="https://webshare.cz/" target="_blank" class="text-primary-400 hover:underline">Register at Webshare.cz</a>
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
const toast = useToast();

const saving = ref(false);
const testingWebshare = ref(false);
const testingTracker = ref(false);
const availableTrackers = ref<any[]>([]);

const settings = reactive({
  webshare: {
    username: '',
    password: '',
    enabled: false,
  },
  trackers: {
    sktorrent: {
      enabled: false,
      username: '',
      password: '',
    },
  },
});

// Load settings and available trackers
onMounted(async () => {
  try {
    const config = useRuntimeConfig();
    
    // Load settings
    const settingsResponse = await fetch(`${config.public.apiBase}/api/settings`);
    if (settingsResponse.ok) {
      const data = await settingsResponse.json();
      if (data.webshare) {
        Object.assign(settings.webshare, data.webshare);
      }
      if (data.trackers) {
        Object.assign(settings.trackers, data.trackers);
      }
    }

    // Load available trackers
    const trackersResponse = await fetch(`${config.public.apiBase}/api/trackers`);
    if (trackersResponse.ok) {
      const data = await trackersResponse.json();
      availableTrackers.value = data.trackers || [];
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
});

const isTrackerConfigured = (trackerId: string) => {
  return settings.trackers?.[trackerId]?.enabled || false;
};

const configureTracker = (tracker: any) => {
  // Scroll to configuration section
  const element = document.querySelector('.card:nth-child(2)');
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

const testTracker = async (trackerId: string) => {
  testingTracker.value = true;
  
  try {
    const config = useRuntimeConfig();
    
    // Send current credentials for testing (even if not saved yet)
    const credentials = settings.trackers?.[trackerId] || {};
    
    const response = await fetch(`${config.public.apiBase}/api/trackers/${trackerId}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credentials: {
          username: credentials.username,
          password: credentials.password,
        },
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      toast.success('Tracker connection successful!');
    } else {
      toast.error(`Tracker connection failed: ${data.message || data.error}`);
    }
  } catch (error: any) {
    toast.error(`Tracker connection failed: ${error.message}`);
  } finally {
    testingTracker.value = false;
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
        webshare: settings.webshare,
        trackers: settings.trackers,
      }),
    });

    if (response.ok) {
      toast.success('Tracker settings saved successfully');
      
      // Reload tracker manager
      await fetch(`${config.public.apiBase}/api/trackers/reload`, { method: 'POST' }).catch(() => {});
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
    const response = await fetch(`${config.public.apiBase}/api/settings`);
    if (response.ok) {
      const data = await response.json();
      if (data.webshare) {
        Object.assign(settings.webshare, data.webshare);
      }
    }
    toast.info('Settings reloaded from server');
  } catch (error: any) {
    toast.error(`Failed to reload settings: ${error.message}`);
  }
};

const testWebshare = async () => {
  testingWebshare.value = true;
  
  try {
    const config = useRuntimeConfig();
    const response = await fetch(`${config.public.apiBase}/api/webshare/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const data = await response.json();
    
    if (data.success) {
      toast.success('Webshare.cz connection successful!');
    } else {
      toast.error(`Webshare.cz login failed: ${data.error}`);
    }
  } catch (error: any) {
    toast.error(`Webshare.cz connection failed: ${error.message}`);
  } finally {
    testingWebshare.value = false;
  }
};

useHead({ title: 'Trackers - Settings - Unifarr' });
</script>
