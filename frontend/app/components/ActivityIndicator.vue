<template>
  <div class="relative">
    <!-- Activity Button -->
    <button
      @click="isOpen = !isOpen"
      class="relative p-2 rounded-lg hover:bg-gray-800 transition-colors"
      :class="{ 'bg-gray-800': isOpen }"
    >
      <Icon 
        :name="activeActivities.length > 0 ? 'mdi:loading' : 'mdi:pulse'" 
        :class="{ 'animate-spin': activeActivities.length > 0 }"
        class="w-5 h-5 text-gray-400"
      />
      
      <!-- Badge for active count -->
      <span 
        v-if="activeActivities.length > 0"
        class="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 rounded-full text-xs font-bold flex items-center justify-center text-white"
      >
        {{ activeActivities.length }}
      </span>
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 scale-95 -translate-y-2"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95 -translate-y-2"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-96 bg-gray-900 border border-gray-800 rounded-lg shadow-2xl z-[60]"
        @click.stop
      >
        <!-- Header -->
        <div class="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h3 class="font-semibold text-white flex items-center gap-2">
            <Icon name="mdi:pulse" class="w-5 h-5" />
            Activities
          </h3>
          <button
            v-if="recentActivities.length > 0"
            @click="clearAll"
            class="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear All
          </button>
        </div>

        <!-- Content -->
        <div class="max-h-96 overflow-y-auto">
          <!-- Active Activities -->
          <div v-if="activeActivities.length > 0" class="p-2">
            <div class="text-xs font-medium text-gray-500 px-2 mb-2">ACTIVE</div>
            <div 
              v-for="activity in activeActivities" 
              :key="activity.id"
              class="card p-3 mb-2"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm text-white truncate">
                    {{ activity.title }}
                  </div>
                  <div v-if="activity.description" class="text-xs text-gray-500 mt-0.5">
                    {{ activity.description }}
                  </div>
                </div>
                <Icon name="mdi:loading" class="w-4 h-4 text-primary-400 animate-spin flex-shrink-0 ml-2" />
              </div>
              
              <!-- Progress bar -->
              <div v-if="activity.progress !== undefined" class="mt-2">
                <div class="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-primary-600 transition-all duration-300"
                    :style="{ width: `${activity.progress}%` }"
                  />
                </div>
                <div class="text-xs text-gray-600 mt-1">{{ activity.progress }}%</div>
              </div>
            </div>
          </div>

          <!-- Recent Activities -->
          <div v-if="recentActivities.length > 0" class="p-2">
            <div class="text-xs font-medium text-gray-500 px-2 mb-2">RECENT</div>
            <div
              v-for="activity in recentActivities.slice(0, 5)"
              :key="activity.id"
              class="px-3 py-2 hover:bg-gray-800/50 rounded-lg transition-colors mb-1"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm text-gray-300 truncate">
                    {{ activity.title }}
                  </div>
                  <div v-if="activity.description" class="text-xs text-gray-600 mt-0.5">
                    {{ activity.description }}
                  </div>
                  <div class="text-xs text-gray-600 mt-1">
                    {{ formatRelativeTime(activity.startedAt) }}
                  </div>
                </div>
                <Icon 
                  :name="activity.status === 'completed' ? 'mdi:check-circle' : 'mdi:alert-circle'"
                  :class="activity.status === 'completed' ? 'text-green-500' : 'text-red-500'"
                  class="w-4 h-4 flex-shrink-0 ml-2"
                />
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="activeActivities.length === 0 && recentActivities.length === 0" class="p-8 text-center">
            <Icon name="mdi:pulse" class="w-12 h-12 mx-auto mb-3 text-gray-700" />
            <p class="text-sm text-gray-500">No recent activities</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Click outside to close -->
    <div 
      v-if="isOpen"
      class="fixed inset-0 z-40"
      @click="isOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import type { Activity } from '~/types/api';

const api = useApi();
const isOpen = ref(false);

// Fetch activities (client-side only to avoid hydration mismatch)
const activitiesData = ref<{ activities: Activity[] } | null>(null);

const fetchActivities = async () => {
  try {
    activitiesData.value = await api.activities.getAll();
  } catch (error) {
    console.error('Failed to fetch activities:', error);
  }
};

const refresh = fetchActivities;

// Fetch on mount (client-side only)
onMounted(() => {
  fetchActivities();
});

const activeActivities = computed(() => 
  activitiesData.value?.activities.filter(a => a.status === 'running') || []
);

const recentActivities = computed(() =>
  activitiesData.value?.activities.filter(a => a.status !== 'running') || []
);

// Auto-refresh while there are active activities
const { pause, resume } = useIntervalFn(() => {
  if (activeActivities.value.length > 0) {
    refresh();
  }
}, 2000);

// Stop polling on unmount
onUnmounted(() => {
  pause();
});

// Resume polling when there are active activities
watch(activeActivities, (newVal) => {
  if (newVal.length > 0) {
    resume();
  } else {
    pause();
  }
}, { immediate: true });

const clearAll = async () => {
  await api.activities.clear();
  await refresh();
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};
</script>
