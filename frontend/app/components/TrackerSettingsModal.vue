<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] overflow-y-auto"
        @click.self="$emit('close')"
      >
        <div class="min-h-screen px-4 py-8 flex items-center justify-center">
          <div v-if="show" class="card relative max-w-3xl w-full" @click.stop>
            <!-- Close Button -->
            <button
              @click="$emit('close')"
              class="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center"
            >
              <Icon name="mdi:close" class="w-6 h-6" />
            </button>

            <!-- Header -->
            <div class="p-6 border-b border-gray-800">
              <h2 class="text-2xl font-bold mb-2">Download Sources</h2>
              <p class="text-gray-400 text-sm">Manage and prioritize download trackers</p>
            </div>

            <!-- Content -->
            <div class="p-6">
              <!-- Drag & Drop Info -->
              <div class="mb-4 p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg flex items-start gap-2 text-sm">
                <Icon name="mdi:information" class="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p class="text-blue-300">
                  Drag and drop sources to change priority. Sources are checked in order from top to bottom.
                </p>
              </div>

              <!-- Source List -->
              <div class="space-y-2">
                <div
                  v-for="(source, index) in sources"
                  :key="source.id"
                  class="card p-4"
                  :class="{ 'opacity-50': !source.enabled }"
                >
                  <div class="flex items-center gap-4">
                    <!-- Drag Handle -->
                    <button class="cursor-move text-gray-500 hover:text-gray-400">
                      <Icon name="mdi:drag-vertical" class="w-6 h-6" />
                    </button>

                    <!-- Icon & Name -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-3 mb-1">
                        <Icon :name="source.icon" class="w-5 h-5 text-primary-400" />
                        <h3 class="font-medium">{{ source.name }}</h3>
                        <span
                          class="px-2 py-0.5 rounded text-xs font-semibold"
                          :class="source.status === 'online' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'"
                        >
                          {{ source.status }}
                        </span>
                      </div>
                      <p class="text-xs text-gray-500">{{ source.description }}</p>
                    </div>

                    <!-- Priority Badge -->
                    <div class="px-3 py-1 bg-gray-800 rounded text-sm font-mono">
                      #{{ index + 1 }}
                    </div>

                    <!-- Enable/Disable -->
                    <label class="relative inline-block w-12 h-6 cursor-pointer">
                      <input
                        v-model="source.enabled"
                        type="checkbox"
                        class="sr-only peer"
                      />
                      <div class="w-full h-full bg-gray-700 rounded-full peer-checked:bg-primary-600 transition-colors"></div>
                      <div class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
                    </label>

                    <!-- Configure -->
                    <button
                      @click="configure(source)"
                      class="btn btn-secondary btn-sm"
                    >
                      <Icon name="mdi:cog" class="w-4 h-4" />
                    </button>
                  </div>

                  <!-- Stats (if enabled) -->
                  <div v-if="source.enabled && source.stats" class="mt-3 pt-3 border-t border-gray-800 flex items-center gap-6 text-xs text-gray-500">
                    <span>Downloads: {{ source.stats.downloads }}</span>
                    <span>Success Rate: {{ source.stats.successRate }}%</span>
                    <span>Avg Speed: {{ source.stats.avgSpeed }}</span>
                  </div>
                </div>
              </div>

              <!-- Add Source -->
              <button class="w-full mt-4 card p-4 border-dashed hover:border-primary-500/50 transition-colors flex items-center justify-center gap-2 text-gray-400 hover:text-gray-300">
                <Icon name="mdi:plus-circle" class="w-5 h-5" />
                <span>Add Custom Source</span>
              </button>
            </div>

            <!-- Footer -->
            <div class="p-6 border-t border-gray-800 flex justify-end gap-3">
              <button @click="$emit('close')" class="btn btn-secondary">
                Cancel
              </button>
              <button @click="save" class="btn btn-primary">
                <Icon name="mdi:content-save" class="w-4 h-4 mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const toast = useToast();

const sources = ref([
  {
    id: 'webshare',
    name: 'Webshare.cz',
    description: 'Czech file hosting service',
    icon: 'mdi:cloud-download',
    enabled: true,
    status: 'online',
    stats: {
      downloads: 142,
      successRate: 98,
      avgSpeed: '12 MB/s',
    },
  },
  {
    id: 'qbittorrent',
    name: 'qBittorrent',
    description: 'Torrent client',
    icon: 'mdi:download-network',
    enabled: true,
    status: 'online',
    stats: {
      downloads: 89,
      successRate: 95,
      avgSpeed: '8 MB/s',
    },
  },
  {
    id: 'usenet',
    name: 'Usenet',
    description: 'Usenet provider (not configured)',
    icon: 'mdi:server-network',
    enabled: false,
    status: 'offline',
    stats: null,
  },
]);

const configure = (source: any) => {
  toast.info(`Configure ${source.name}`);
  // TODO: Open source-specific configuration
};

const save = () => {
  toast.success('Download sources updated');
  emit('close');
  // TODO: Save to backend
};

watch(() => props.show, (show) => {
  if (show) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>
