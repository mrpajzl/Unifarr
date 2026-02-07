<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">
          {{ isAdmin ? 'Media Requests' : 'My Requests' }}
        </h1>
        <p class="text-gray-500 mt-1">
          {{ isAdmin ? 'Manage user requests' : 'Track your requested content' }}
        </p>
      </div>
      <button @click="fetchRequests" :disabled="loading" class="btn btn-secondary">
        <Icon
          :name="loading ? 'mdi:loading' : 'mdi:refresh'"
          :class="{ 'animate-spin': loading }"
          class="w-5 h-5 mr-2"
        />
        Refresh
      </button>
    </div>

    <!-- Filter Tabs (Admin Only) -->
    <div v-if="isAdmin" class="flex gap-2 mb-6 overflow-x-auto pb-2">
      <button
        v-for="tab in filterTabs"
        :key="tab.value"
        @click="activeFilter = tab.value"
        class="btn btn-sm flex-shrink-0"
        :class="activeFilter === tab.value ? 'btn-primary' : 'btn-secondary'"
      >
        <Icon :name="tab.icon" class="w-4 h-4 mr-1.5" />
        {{ tab.label }}
        <span v-if="getFilterCount(tab.value) > 0" class="ml-2 px-2 py-0.5 bg-gray-800 rounded-full text-xs">
          {{ getFilterCount(tab.value) }}
        </span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading && requests.length === 0" class="flex justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <Icon name="mdi:loading" class="w-8 h-8 animate-spin text-primary-500" />
        <span class="text-sm text-gray-500">Loading requests...</span>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card p-8 text-center">
      <Icon name="mdi:alert-circle" class="w-12 h-12 mx-auto mb-3 text-red-500" />
      <p class="font-medium text-red-400">{{ error }}</p>
      <button @click="fetchRequests" class="btn btn-secondary btn-sm mt-4">Try Again</button>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredRequests.length === 0" class="card p-12 text-center">
      <Icon name="mdi:inbox" class="w-16 h-16 mx-auto mb-4 text-gray-600" />
      <p class="text-gray-400">
        {{ activeFilter === 'all' ? 'No requests yet' : `No ${activeFilter} requests` }}
      </p>
      <NuxtLink v-if="!isAdmin" to="/discover" class="btn btn-primary btn-sm mt-4">
        <Icon name="mdi:magnify" class="w-4 h-4 mr-2" />
        Browse Content
      </NuxtLink>
    </div>

    <!-- Requests List -->
    <div v-else class="space-y-4">
      <div
        v-for="request in filteredRequests"
        :key="request.id"
        class="card p-4 flex gap-4"
      >
        <!-- Poster -->
        <div class="flex-shrink-0 w-20 md:w-24">
          <div class="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800">
            <img
              v-if="request.posterPath"
              :src="`https://image.tmdb.org/t/p/w342${request.posterPath}`"
              :alt="request.title"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <Icon name="mdi:image-off" class="w-8 h-8 text-gray-600" />
            </div>
          </div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <!-- Title & Status -->
          <div class="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 class="font-bold text-lg">{{ request.title }}</h3>
              <div class="flex flex-wrap items-center gap-2 text-sm text-gray-400 mt-1">
                <span v-if="request.year">{{ request.year }}</span>
                <span>•</span>
                <span class="capitalize">{{ request.type }}</span>
                <span v-if="isAdmin && request.username">
                  <span>•</span>
                  <span>Requested by {{ request.username }}</span>
                </span>
              </div>
            </div>
            <span
              class="px-3 py-1 rounded-full text-xs font-bold uppercase flex-shrink-0"
              :class="getStatusClass(request.status)"
            >
              {{ request.status }}
            </span>
          </div>

          <!-- Notes -->
          <div v-if="request.userNote" class="mb-3 p-3 bg-gray-800 rounded-lg">
            <p class="text-sm text-gray-400 mb-1"><strong>User note:</strong></p>
            <p class="text-sm">{{ request.userNote }}</p>
          </div>
          <div v-if="request.adminNote" class="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p class="text-sm text-blue-400 mb-1"><strong>Admin response:</strong></p>
            <p class="text-sm text-blue-300">{{ request.adminNote }}</p>
          </div>

          <!-- Dates -->
          <div class="text-xs text-gray-500 mb-3">
            <span>Requested {{ formatDate(request.requestedAt) }}</span>
            <span v-if="request.processedAt"> • Processed {{ formatDate(request.processedAt) }}</span>
          </div>

          <!-- Actions -->
          <div class="flex flex-wrap gap-2">
            <!-- Admin Actions -->
            <template v-if="isAdmin && request.status === 'pending'">
              <button
                @click="handleApprove(request)"
                :disabled="processing === request.id"
                class="btn btn-sm btn-primary"
              >
                <Icon name="mdi:check" class="w-4 h-4 mr-1" />
                Approve
              </button>
              <button
                @click="handleDeny(request)"
                :disabled="processing === request.id"
                class="btn btn-sm btn-secondary"
              >
                <Icon name="mdi:close" class="w-4 h-4 mr-1" />
                Deny
              </button>
            </template>

            <!-- Delete Button -->
            <button
              v-if="canDelete(request)"
              @click="handleDelete(request)"
              :disabled="processing === request.id"
              class="btn btn-sm btn-secondary text-red-400 hover:text-red-300"
            >
              <Icon name="mdi:delete" class="w-4 h-4 mr-1" />
              Delete
            </button>

            <!-- View in Library -->
            <NuxtLink
              v-if="request.status === 'downloaded' && request.mediaItemId"
              :to="`/media/${request.mediaItemId}`"
              class="btn btn-sm btn-secondary"
            >
              <Icon name="mdi:open-in-new" class="w-4 h-4 mr-1" />
              View in Library
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MediaRequest } from '~/composables/useRequests';

const { isAuthenticated, isAdmin, user } = useAuth();
const requestsApi = useRequests();
const toast = useToast();
const router = useRouter();

// Redirect if not authenticated
watch(isAuthenticated, (authenticated) => {
  if (!authenticated) {
    router.push('/login');
  }
}, { immediate: true });

const requests = ref<MediaRequest[]>([]);
const loading = ref(false);
const error = ref('');
const activeFilter = ref<'all' | 'pending' | 'approved' | 'denied'>('all');
const processing = ref<number | null>(null);

const filterTabs = [
  { label: 'All', value: 'all' as const, icon: 'mdi:all-inclusive' },
  { label: 'Pending', value: 'pending' as const, icon: 'mdi:clock-outline' },
  { label: 'Approved', value: 'approved' as const, icon: 'mdi:check-circle' },
  { label: 'Denied', value: 'denied' as const, icon: 'mdi:close-circle' },
];

const filteredRequests = computed(() => {
  if (activeFilter.value === 'all') return requests.value;
  return requests.value.filter(r => r.status === activeFilter.value);
});

const getFilterCount = (filter: string) => {
  if (filter === 'all') return requests.value.length;
  return requests.value.filter(r => r.status === filter).length;
};

const getStatusClass = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-500/20 text-yellow-400';
    case 'approved': return 'bg-green-500/20 text-green-400';
    case 'denied': return 'bg-red-500/20 text-red-400';
    case 'downloaded': return 'bg-blue-500/20 text-blue-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

const canDelete = (request: MediaRequest) => {
  if (isAdmin.value) return true;
  return request.userId === user.value?.id && request.status === 'pending';
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
};

const fetchRequests = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    requests.value = await requestsApi.list();
  } catch (err: any) {
    console.error('Failed to fetch requests:', err);
    error.value = err.data?.error || 'Failed to load requests';
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
};

const handleApprove = async (request: MediaRequest) => {
  if (!confirm(`Approve request for "${request.title}"?`)) return;
  
  processing.value = request.id;
  try {
    const updated = await requestsApi.approve(request.id);
    const index = requests.value.findIndex(r => r.id === request.id);
    if (index !== -1) {
      requests.value[index] = updated;
    }
    toast.success(`Approved "${request.title}"`);
  } catch (err: any) {
    toast.error(err.data?.error || 'Failed to approve request');
  } finally {
    processing.value = null;
  }
};

const handleDeny = async (request: MediaRequest) => {
  const reason = prompt(`Deny request for "${request.title}"?\n\nOptional reason:`);
  if (reason === null) return; // User cancelled
  
  processing.value = request.id;
  try {
    const updated = await requestsApi.deny(request.id, reason || undefined);
    const index = requests.value.findIndex(r => r.id === request.id);
    if (index !== -1) {
      requests.value[index] = updated;
    }
    toast.success(`Denied "${request.title}"`);
  } catch (err: any) {
    toast.error(err.data?.error || 'Failed to deny request');
  } finally {
    processing.value = null;
  }
};

const handleDelete = async (request: MediaRequest) => {
  if (!confirm(`Delete request for "${request.title}"?`)) return;
  
  processing.value = request.id;
  try {
    await requestsApi.remove(request.id);
    requests.value = requests.value.filter(r => r.id !== request.id);
    toast.success(`Deleted request for "${request.title}"`);
  } catch (err: any) {
    toast.error(err.data?.error || 'Failed to delete request');
  } finally {
    processing.value = null;
  }
};

// Fetch on mount
onMounted(() => {
  if (isAuthenticated.value) {
    fetchRequests();
  }
});

useHead({ title: 'Requests - Unifarr' });
</script>
