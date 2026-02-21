<template>
  <div v-if="modelValue" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
    <div class="bg-gray-900 rounded-lg max-w-3xl w-full max-h-[80vh] flex flex-col border border-gray-700">
      <!-- Header -->
      <div class="p-4 border-b border-gray-700 flex items-center justify-between">
        <h3 class="text-lg font-semibold">{{ title || 'Browse Folders' }}</h3>
        <button @click="close" class="text-gray-400 hover:text-white">
          <Icon name="mdi:close" class="w-5 h-5" />
        </button>
      </div>

      <!-- Path breadcrumb -->
      <div class="p-3 border-b border-gray-700 bg-gray-800/50">
        <div class="flex items-center gap-2 text-sm">
          <Icon name="mdi:folder" class="w-4 h-4 text-primary-400" />
          <span class="font-mono text-xs text-gray-400">{{ currentPath }}</span>
        </div>
      </div>

      <!-- Quick paths -->
      <div class="p-3 border-b border-gray-700 flex gap-2 flex-wrap">
        <button
          v-for="quick in quickPaths"
          :key="quick.path"
          @click="browsePath(quick.path)"
          class="px-3 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 border border-gray-600 transition-colors"
        >
          <Icon name="mdi:folder-home" class="w-3 h-3 inline mr-1" />
          {{ quick.name }}
        </button>
      </div>

      <!-- Directory listing -->
      <div class="flex-1 overflow-y-auto p-3">
        <div v-if="loading" class="flex items-center justify-center py-8">
          <Icon name="mdi:loading" class="w-8 h-8 animate-spin text-primary-400" />
        </div>

        <div v-else-if="error" class="text-center py-8">
          <Icon name="mdi:alert-circle" class="w-12 h-12 text-red-400 mx-auto mb-2" />
          <p class="text-red-400">{{ error }}</p>
          <button @click="browsePath(currentPath)" class="btn btn-secondary mt-4">
            Try Again
          </button>
        </div>

        <div v-else class="space-y-1">
          <button
            v-for="item in items"
            :key="item.path"
            @click="handleItemClick(item)"
            :class="[
              'w-full flex items-center gap-3 p-2 rounded hover:bg-gray-800 transition-colors text-left',
              selectedPath === item.path && 'bg-gray-800 ring-1 ring-primary-600',
            ]"
          >
            <Icon
              :name="item.name === '..' ? 'mdi:arrow-up' : item.isDirectory ? 'mdi:folder' : 'mdi:file'"
              :class="[
                'w-5 h-5 flex-shrink-0',
                item.isDirectory ? 'text-yellow-500' : 'text-gray-500',
              ]"
            />
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ item.name }}</p>
              <p v-if="item.modified && item.name !== '..'" class="text-xs text-gray-500">
                {{ formatDate(item.modified) }}
              </p>
            </div>
            <Icon
              v-if="item.isDirectory && item.name !== '..'"
              name="mdi:chevron-right"
              class="w-5 h-5 text-gray-600"
            />
          </button>
        </div>

        <div v-if="!loading && items.length === 0" class="text-center py-8 text-gray-500">
          <Icon name="mdi:folder-off" class="w-12 h-12 mx-auto mb-2" />
          <p>No folders found</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-gray-700 flex items-center justify-between gap-3">
        <div class="flex-1 text-sm text-gray-400 truncate">
          {{ selectedPath || 'No folder selected' }}
        </div>
        <div class="flex gap-2">
          <button @click="close" class="btn btn-secondary">
            Cancel
          </button>
          <button
            @click="selectCurrent"
            :disabled="!selectedPath"
            class="btn btn-primary"
          >
            <Icon name="mdi:check" class="w-4 h-4" />
            Select
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup
const api = useApi(); lang="ts">
interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: string;
}

interface Props {
  modelValue: boolean;
  title?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'select': [path: string];
}>();

const config = useRuntimeConfig();
const loading = ref(false);
const error = ref('');
const currentPath = ref('');
const selectedPath = ref('');
const items = ref<DirectoryItem[]>([]);
const quickPaths = ref<{ name: string; path: string }[]>([]);

// Fetch quick access paths
const fetchQuickPaths = async () => {
  try {
    const response = await api.apiFetch("/api/filesystem/quick-paths");
    if (response.ok) {
      quickPaths.value = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch quick paths:', error);
  }
};

// Browse a directory
const browsePath = async (path: string) => {
  loading.value = true;
  error.value = '';
  
  try {
    const data = await api.apiFetch(`/api/filesystem/browse?path=${encodeURIComponent(path)}`);
    currentPath.value = data.currentPath;
    items.value = data.items;
    selectedPath.value = data.currentPath;
  } catch (err: any) {
    error.value = err.message || 'Failed to browse directory';
    console.error('Browse error:', err);
  } finally {
    loading.value = false;
  }
};

// Handle item click
const handleItemClick = (item: DirectoryItem) => {
  if (item.isDirectory) {
    browsePath(item.path);
  }
  selectedPath.value = item.path;
};

// Select current path
const selectCurrent = () => {
  if (selectedPath.value) {
    emit('select', selectedPath.value);
    close();
  }
};

// Close modal
const close = () => {
  emit('update:modelValue', false);
};

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

// Initialize when modal opens
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    await fetchQuickPaths();
    // Start at home directory
    if (quickPaths.value.length > 0) {
      browsePath(quickPaths.value[0].path);
    }
  }
});
</script>
