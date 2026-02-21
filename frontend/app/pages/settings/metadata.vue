<template>
  <div>
    <!-- Header with Back Button -->
    <div class="mb-8">
      <NuxtLink to="/settings" class="text-gray-400 hover:text-white inline-flex items-center gap-2 mb-4">
        <Icon name="mdi:arrow-left" class="w-5 h-5" />
        Back to Settings
      </NuxtLink>
      <h1 class="text-3xl font-bold">Metadata</h1>
      <p class="text-gray-500 mt-1">Configure TMDB and metadata providers</p>
    </div>

    <div class="max-w-3xl space-y-6">
      <!-- TMDB API Key -->
      <div class="card p-6">
        <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
          <Icon name="mdi:database" class="w-6 h-6 text-purple-400" />
          TMDB API Configuration
        </h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">API Key</label>
            <input
              v-model="settings.tmdbApiKey"
              type="text"
              class="input w-full font-mono text-sm"
              placeholder="Enter your TMDB API key"
            />
            <p class="text-xs text-gray-500 mt-1">
              Get your free API key from <a href="https://www.themoviedb.org/settings/api" target="_blank" class="text-primary-400 hover:underline">TMDB Settings</a>
            </p>
          </div>
        </div>
      </div>

      <!-- TMDB Authentication -->
      <div class="card p-6">
        <h2 class="text-xl font-semibold mb-4">TMDB Authentication</h2>
        
        <div v-if="!tmdbAccount" class="space-y-4">
          <p class="text-sm text-gray-400">
            Connect your TMDB account to access your watchlists, ratings, and favorites.
          </p>
          <button
            @click="loginWithTMDB"
            :disabled="authenticating"
            class="btn btn-primary"
          >
            <Icon v-if="!authenticating" name="mdi:login" class="w-4 h-4" />
            <Icon v-else name="mdi:loading" class="w-4 h-4 animate-spin" />
            Login with TMDB
          </button>
        </div>

        <div v-else class="space-y-4">
          <div class="flex items-center gap-3">
            <div v-if="tmdbAccount.avatar" class="w-12 h-12 rounded-full overflow-hidden bg-gray-800">
              <img :src="tmdbAccount.avatar" :alt="tmdbAccount.username" class="w-full h-full object-cover" />
            </div>
            <div v-else class="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center">
              <Icon name="mdi:account" class="w-6 h-6 text-white" />
            </div>
            <div class="flex-1">
              <p class="font-medium">{{ tmdbAccount.name || tmdbAccount.username }}</p>
              <p class="text-sm text-gray-500">@{{ tmdbAccount.username }}</p>
            </div>
          </div>
          <button
            @click="logoutTMDB"
            class="btn btn-secondary"
          >
            <Icon name="mdi:logout" class="w-4 h-4" />
            Logout
          </button>
        </div>

        <div class="mt-4 pt-4 border-t border-gray-700">
          <p class="text-xs text-gray-500">
            Don't have a TMDB account? 
            <a href="https://www.themoviedb.org/signup" target="_blank" class="text-primary-400 hover:underline">Create one for free</a>
          </p>
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
const { showToast } = useToast();
const route = useRoute();

const saving = ref(false);
const authenticating = ref(false);
const tmdbAccount = ref<any>(null);

const settings = reactive({
  tmdbApiKey: '',
});

// Load settings from backend
onMounted(async () => {
  try {
    const config = useRuntimeConfig();
    const response = await api.apiFetch(`/api/settings`);
    if (response.ok) {
      const data = await response.json();
      if (data.tmdbApiKey) settings.tmdbApiKey = data.tmdbApiKey;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }

  // Load TMDB account if session exists
  const sessionId = localStorage.getItem('tmdb-session-id');
  if (sessionId) {
    try {
      const config = useRuntimeConfig();
      const response = await api.apiFetch(`/api/tmdb-auth/account?session_id=${sessionId}`);
      if (response.ok) {
        tmdbAccount.value = await response.json();
      } else {
        localStorage.removeItem('tmdb-session-id');
      }
    } catch (error) {
      console.error('Failed to load TMDB account:', error);
    }
  }

  // Handle TMDB auth callback
  if (route.query.tmdb_auth === 'approved' && route.query.request_token) {
    await handleTMDBCallback(route.query.request_token as string);
  }
});

const saveSettings = async () => {
  saving.value = true;
  
  try {
    const config = useRuntimeConfig();
    const response = await fetch(`${config.public.apiBase}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbApiKey: settings.tmdbApiKey }),
    });

    if (response.ok) {
      showToast('Metadata settings saved successfully', 'success');
    } else {
      const error = await response.json();
      showToast(`Failed to save settings: ${error.error || 'Unknown error'}`, 'error');
    }
  } catch (error: any) {
    showToast(`Failed to save settings: ${error.message}`, 'error');
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
      if (data.tmdbApiKey) settings.tmdbApiKey = data.tmdbApiKey;
    }
    showToast('Settings reloaded from server', 'info');
  } catch (error: any) {
    showToast(`Failed to reload settings: ${error.message}`, 'error');
  }
};

const loginWithTMDB = async () => {
  authenticating.value = true;
  
  try {
    const config = useRuntimeConfig();
    const data = await api.apiFetch(`/api/tmdb-auth/request-token`, { 
      method: 'POST',
     });

    if (data.requestToken) {
      // Store request token temporarily
      localStorage.setItem('tmdb-request-token', data.requestToken);
      // Redirect to TMDB authentication
      window.location.href = data.authUrl;
    } else {
      showToast('Failed to start TMDB authentication', 'error');
    }
  } catch (error: any) {
    showToast(`TMDB login failed: ${error.message}`, 'error');
  } finally {
    authenticating.value = false;
  }
};

const handleTMDBCallback = async (requestToken: string) => {
  try {
    const config = useRuntimeConfig();
    const response = await fetch(`${config.public.apiBase}/api/tmdb-auth/create-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestToken }),
    });
    const data = await response.json();

    if (data.sessionId) {
      localStorage.setItem('tmdb-session-id', data.sessionId);
      localStorage.removeItem('tmdb-request-token');
      tmdbAccount.value = data.account;
      showToast(`Welcome, ${data.account.username}!`, 'success');
      
      // Remove query params from URL
      navigateTo('/settings/metadata', { replace: true });
    } else {
      showToast('Failed to create TMDB session', 'error');
    }
  } catch (error: any) {
    showToast(`TMDB authentication failed: ${error.message}`, 'error');
  }
};

const logoutTMDB = async () => {
  try {
    const sessionId = localStorage.getItem('tmdb-session-id');
    if (sessionId) {
      const config = useRuntimeConfig();
      await fetch(`${config.public.apiBase}/api/tmdb-auth/session`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    }
    
    localStorage.removeItem('tmdb-session-id');
    tmdbAccount.value = null;
    showToast('Logged out from TMDB', 'info');
  } catch (error: any) {
    showToast(`Logout failed: ${error.message}`, 'error');
  }
};

useHead({ title: 'Metadata - Settings - Unifarr' });
</script>
