<template>
  <div>
    <h2 class="text-2xl font-bold mb-6">Profile Settings</h2>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Icon name="mdi:loading" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Profile -->
    <div v-else-if="profile" class="space-y-6">
      <!-- User Info Card -->
      <div class="card p-6">
        <div class="flex items-center gap-4 mb-6">
          <div class="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <Icon name="mdi:account" class="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 class="text-xl font-semibold">{{ profile.username }}</h3>
            <p class="text-sm text-gray-400">
              {{ profile.role.charAt(0).toUpperCase() + profile.role.slice(1) }}
              <span v-if="!profile.approved" class="ml-2 text-yellow-400">⏳ Pending Approval</span>
            </p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-gray-500">Member since</p>
            <p class="font-medium">{{ formatDate(profile.createdAt) }}</p>
          </div>
          <div>
            <p class="text-gray-500">Media requests</p>
            <p class="font-medium">{{ profile._stats?.mediaRequests || 0 }}</p>
          </div>
        </div>
      </div>

      <!-- Language Preference -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon name="mdi:translate" class="w-5 h-5 text-primary-400" />
          Language Preference
        </h3>
        <p class="text-sm text-gray-400 mb-4">
          Choose your preferred language for movie/TV show metadata. This will affect titles, descriptions, and other content.
        </p>
        
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <button
            v-for="lang in availableLanguages"
            :key="lang.code"
            @click="changeLanguage(lang.code)"
            :disabled="savingLanguage"
            :class="[
              'p-4 rounded-lg border-2 transition-all text-left',
              profile.preferredLanguage === lang.code
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-gray-700 hover:border-gray-600 bg-gray-800/50',
            ]"
          >
            <div class="text-2xl mb-1">{{ lang.flag }}</div>
            <div class="font-medium text-sm">{{ lang.name }}</div>
            <div class="text-xs text-gray-500 uppercase">{{ lang.code }}</div>
          </button>
        </div>
      </div>

      <!-- Password Change -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon name="mdi:lock" class="w-5 h-5 text-primary-400" />
          Change Password
        </h3>

        <form @submit.prevent="changePassword" class="space-y-4 max-w-md">
          <!-- Current Password -->
          <div>
            <label class="block text-sm font-medium mb-2">Current Password</label>
            <input
              v-model="passwordForm.current"
              type="password"
              placeholder="Enter current password"
              class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <!-- New Password -->
          <div>
            <label class="block text-sm font-medium mb-2">New Password</label>
            <input
              v-model="passwordForm.new"
              type="password"
              placeholder="Enter new password (min. 6 characters)"
              class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              minlength="6"
              required
            />
          </div>

          <!-- Confirm New Password -->
          <div>
            <label class="block text-sm font-medium mb-2">Confirm New Password</label>
            <input
              v-model="passwordForm.confirm"
              type="password"
              placeholder="Confirm new password"
              class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <!-- Error Message -->
          <div v-if="passwordError" class="p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
            <p class="text-sm text-red-400">{{ passwordError }}</p>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="savingPassword"
            class="btn btn-primary"
          >
            <Icon
              :name="savingPassword ? 'mdi:loading' : 'mdi:check'"
              :class="{ 'animate-spin': savingPassword }"
              class="w-5 h-5 mr-2"
            />
            {{ savingPassword ? 'Updating...' : 'Update Password' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig();
const toast = useToast();
const api = useApi();

interface Profile {
  id: number;
  username: string;
  role: string;
  approved: boolean;
  preferredLanguage: string;
  createdAt: string;
  _stats?: {
    mediaRequests: number;
  };
}

// Available languages
const availableLanguages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

// State
const profile = ref<Profile | null>(null);
const loading = ref(true);
const savingLanguage = ref(false);
const savingPassword = ref(false);
const passwordError = ref('');
const passwordForm = ref({
  current: '',
  new: '',
  confirm: '',
});

// Fetch profile
const fetchProfile = async () => {
  loading.value = true;
  
  try {
    const response = await api.apiFetch('/api/users/me');
    profile.value = response as Profile;
  } catch (err: any) {
    console.error('Failed to fetch profile:', err);
    toast.error('Failed to load profile');
  } finally {
    loading.value = false;
  }
};

// Change language
const changeLanguage = async (language: string) => {
  if (!profile.value || profile.value.preferredLanguage === language) return;
  
  savingLanguage.value = true;
  
  try {
    await api.apiFetch('/api/users/me', {
      method: 'PATCH',
      body: { preferredLanguage: language },
    });
    
    profile.value.preferredLanguage = language;
    toast.success(`Language changed to ${availableLanguages.find(l => l.code === language)?.name}`);
  } catch (err: any) {
    console.error('Failed to change language:', err);
    toast.error(err.data?.error?.message || 'Failed to change language');
  } finally {
    savingLanguage.value = false;
  }
};

// Change password
const changePassword = async () => {
  passwordError.value = '';
  
  // Validation
  if (passwordForm.value.new.length < 6) {
    passwordError.value = 'Password must be at least 6 characters';
    return;
  }
  
  if (passwordForm.value.new !== passwordForm.value.confirm) {
    passwordError.value = 'Passwords do not match';
    return;
  }
  
  savingPassword.value = true;
  
  try {
    await api.apiFetch('/api/users/me/password', {
      method: 'PATCH',
      body: {
        currentPassword: passwordForm.value.current,
        newPassword: passwordForm.value.new,
      },
    });
    
    toast.success('Password updated successfully');
    
    // Reset form
    passwordForm.value = {
      current: '',
      new: '',
      confirm: '',
    };
  } catch (err: any) {
    console.error('Failed to change password:', err);
    passwordError.value = err.data?.error?.message || 'Failed to change password';
  } finally {
    savingPassword.value = false;
  }
};

// Format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// On mount
onMounted(() => {
  fetchProfile();
});

// Set page title
useHead({
  title: 'Profile Settings - Unifarr',
});
</script>
