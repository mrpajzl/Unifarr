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
        class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto"
        @click.self="$emit('close')"
      >
        <div class="min-h-screen px-4 py-8 flex items-center justify-center">
          <div
            v-if="show"
            class="card relative max-w-4xl w-full"
            @click.stop
          >
            <!-- Close Button -->
            <button
              @click="$emit('close')"
              class="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center"
            >
              <Icon name="mdi:close" class="w-6 h-6" />
            </button>

            <!-- Header -->
            <div class="p-6 border-b border-gray-800">
              <h2 class="text-2xl font-bold mb-2">Search Files</h2>
              <p class="text-gray-400 text-sm">{{ mediaTitle }}</p>
            </div>

            <!-- Search -->
            <div class="p-6 border-b border-gray-800">
              <div class="flex gap-3">
                <input
                  v-model="searchQuery"
                  type="text"
                  class="input flex-1"
                  placeholder="Enter search query..."
                  @keyup.enter="search(false)"
                />
                <button
                  @click="search(true)"
                  :disabled="searching || !searchQuery"
                  class="btn btn-primary"
                >
                  <Icon :name="searching ? 'mdi:loading' : 'mdi:magic-staff'" :class="{ 'animate-spin': searching }" class="w-5 h-5 mr-2" />
                  Auto Match
                </button>
                <button
                  @click="search(false)"
                  :disabled="searching || !searchQuery"
                  class="btn btn-secondary"
                >
                  <Icon :name="searching ? 'mdi:loading' : 'mdi:magnify'" :class="{ 'animate-spin': searching }" class="w-5 h-5 mr-2" />
                  Search
                </button>
              </div>
            </div>

            <!-- Loading -->
            <div v-if="searching" class="p-12 flex justify-center">
              <Icon name="mdi:loading" class="w-12 h-12 animate-spin text-primary-500" />
            </div>

            <!-- Results -->
            <div v-else-if="results.length" class="p-6">
              <div class="mb-4 text-sm text-gray-400">
                Found {{ total }} files (showing {{ results.length }})
              </div>

              <div class="space-y-2 max-h-96 overflow-y-auto">
                <button
                  v-for="file in results"
                  :key="file.ident"
                  @click="selectFile(file)"
                  :disabled="downloading === file.ident"
                  class="w-full card p-4 hover:border-primary-500/50 transition-colors text-left group"
                >
                  <div class="flex items-start gap-4">
                    <!-- Thumbnail -->
                    <div v-if="file.img" class="w-16 h-24 flex-shrink-0 rounded overflow-hidden bg-gray-800">
                      <img :src="file.img" :alt="file.name" class="w-full h-full object-cover" />
                    </div>

                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                      <h3 class="font-medium text-sm mb-1 group-hover:text-primary-400 transition-colors">
                        {{ file.name }}
                      </h3>
                      
                      <div class="flex items-center gap-3 text-xs text-gray-500">
                        <span class="flex items-center gap-1">
                          <Icon name="mdi:harddisk" class="w-4 h-4" />
                          {{ formatSize(file.size) }}
                        </span>
                        <span class="flex items-center gap-1">
                          <Icon name="mdi:thumb-up" class="w-4 h-4 text-green-400" />
                          {{ file.positive }}
                        </span>
                        <span class="flex items-center gap-1">
                          <Icon name="mdi:thumb-down" class="w-4 h-4 text-red-400" />
                          {{ file.negative }}
                        </span>
                        <span v-if="file.score !== undefined" class="px-2 py-0.5 rounded text-[10px] font-semibold"
                          :class="file.score >= 0.8 ? 'bg-green-600/20 text-green-400' : file.score >= 0.6 ? 'bg-yellow-600/20 text-yellow-400' : 'bg-gray-700 text-gray-400'"
                        >
                          {{ Math.round(file.score * 100) }}% match
                        </span>
                      </div>
                    </div>

                    <!-- Download Icon -->
                    <div class="flex-shrink-0">
                      <Icon
                        :name="downloading === file.ident ? 'mdi:loading' : 'mdi:download'"
                        :class="{ 'animate-spin': downloading === file.ident }"
                        class="w-6 h-6 text-primary-500"
                      />
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else-if="searched" class="p-12 text-center">
              <Icon name="mdi:file-search" class="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p class="text-gray-400">No files found</p>
            </div>

            <!-- Initial State -->
            <div v-else class="p-12 text-center">
              <Icon name="mdi:cloud-search" class="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p class="text-gray-400">Enter a search query to find files</p>
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
  mediaTitle?: string;
  defaultQuery?: string;
}>();

const emit = defineEmits<{
  close: [];
  download: [file: any];
}>();

const api = useApi();
const toast = useToast();

const searchQuery = ref('');
const searching = ref(false);
const searched = ref(false);
const results = ref<any[]>([]);
const total = ref(0);
const downloading = ref<string | null>(null);

const formatSize = (bytes: number) => {
  const gb = bytes / (1024 ** 3);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 ** 2);
  return `${mb.toFixed(0)} MB`;
};

const search = async (auto: boolean) => {
  if (!searchQuery.value) return;
  
  searching.value = true;
  searched.value = false;
  
  try {
    const data = await api.webshare.search(searchQuery.value, auto);
    results.value = data.files || [];
    total.value = data.total || 0;
    searched.value = true;
    
    if (auto && data.bestFile) {
      toast.info(`Best match: ${data.bestFile.name}`);
    }
  } catch (err: any) {
    toast.error(`Search failed: ${err.message}`);
    results.value = [];
    total.value = 0;
  } finally {
    searching.value = false;
  }
};

const selectFile = async (file: any) => {
  downloading.value = file.ident;
  
  try {
    const { link } = await api.webshare.getDownloadLink(file.ident);
    emit('download', { ...file, link });
    emit('close');
  } catch (err: any) {
    toast.error(`Failed to get download link: ${err.message}`);
  } finally {
    downloading.value = null;
  }
};

watch(() => props.show, (show) => {
  if (show) {
    searchQuery.value = props.defaultQuery || '';
    results.value = [];
    searched.value = false;
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>
