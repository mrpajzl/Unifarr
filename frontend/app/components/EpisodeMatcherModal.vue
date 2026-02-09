<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
      @click.self="$emit('update:modelValue', false)"
    >
      <div class="card p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-start justify-between mb-6">
          <div>
            <h3 class="text-2xl font-semibold">Episode Files</h3>
            <p class="text-sm text-gray-400 mt-1">
              {{ matchedFiles.length }} matched • {{ unmatchedFiles.length }} unmatched • {{ allFiles.length }} total
            </p>
          </div>
          <button
            @click="$emit('update:modelValue', false)"
            class="text-gray-400 hover:text-white transition-colors"
          >
            <Icon name="mdi:close" class="w-6 h-6" />
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex gap-2 mb-6 border-b border-gray-800">
          <button
            @click="activeTab = 'unmatched'"
            :class="[
              'px-4 py-2 font-medium transition-colors relative',
              activeTab === 'unmatched' 
                ? 'text-primary-400' 
                : 'text-gray-500 hover:text-gray-300'
            ]"
          >
            Unmatched ({{ unmatchedFiles.length }})
            <div
              v-if="activeTab === 'unmatched'"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
            />
          </button>
          <button
            @click="activeTab = 'matched'"
            :class="[
              'px-4 py-2 font-medium transition-colors relative',
              activeTab === 'matched' 
                ? 'text-primary-400' 
                : 'text-gray-500 hover:text-gray-300'
            ]"
          >
            Matched ({{ matchedFiles.length }})
            <div
              v-if="activeTab === 'matched'"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
            />
          </button>
          <button
            @click="activeTab = 'bulk'"
            :class="[
              'px-4 py-2 font-medium transition-colors relative',
              activeTab === 'bulk' 
                ? 'text-primary-400' 
                : 'text-gray-500 hover:text-gray-300'
            ]"
          >
            Bulk Match
            <div
              v-if="activeTab === 'bulk'"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
            />
          </button>
        </div>

        <!-- Unmatched Files Tab -->
        <div v-if="activeTab === 'unmatched'" class="space-y-3">
          <div v-if="unmatchedFiles.length === 0" class="text-center py-12">
            <Icon name="mdi:check-circle" class="w-16 h-16 text-green-400 mx-auto mb-3" />
            <p class="text-gray-400">All files are matched!</p>
          </div>

          <div
            v-for="file in unmatchedFiles"
            :key="file.id"
            class="card p-4"
          >
            <div class="flex items-start gap-3">
              <Icon name="mdi:file-video" class="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div class="flex-1 min-w-0">
                <p class="font-mono text-sm mb-2 truncate">{{ file.filename }}</p>
                <div class="flex items-center gap-3 text-xs text-gray-500">
                  <span>{{ formatFileSize(file.size) }}</span>
                  <span v-if="file.parsedSeason">Detected: S{{ file.parsedSeason.toString().padStart(2, '0') }}E{{ file.parsedEpisode?.toString().padStart(2, '0') }}</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <!-- Season/Episode Inputs -->
                <div class="flex items-center gap-2">
                  <input
                    v-model="file.manualSeason"
                    type="number"
                    min="1"
                    placeholder="S"
                    class="w-16 px-2 py-1 text-sm bg-gray-900 border border-gray-700 rounded text-center"
                  />
                  <span class="text-gray-600">x</span>
                  <input
                    v-model="file.manualEpisode"
                    type="number"
                    min="1"
                    placeholder="E"
                    class="w-16 px-2 py-1 text-sm bg-gray-900 border border-gray-700 rounded text-center"
                  />
                </div>
                <button
                  @click="matchSingleFile(file)"
                  :disabled="!file.manualSeason || !file.manualEpisode"
                  class="btn btn-sm btn-primary"
                >
                  <Icon name="mdi:link" class="w-4 h-4" />
                  Match
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Matched Files Tab -->
        <div v-if="activeTab === 'matched'" class="space-y-3">
          <div v-if="matchedFiles.length === 0" class="text-center py-12">
            <Icon name="mdi:alert-circle" class="w-16 h-16 text-gray-600 mx-auto mb-3" />
            <p class="text-gray-400">No matched files yet</p>
          </div>

          <div
            v-for="file in matchedFiles"
            :key="file.id"
            class="card p-4"
          >
            <div class="flex items-start gap-3">
              <Icon name="mdi:check-circle" class="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div class="flex-1 min-w-0">
                <p class="font-mono text-sm mb-2 truncate">{{ file.filename }}</p>
                <div class="flex items-center gap-3 text-xs text-gray-500">
                  <span>{{ formatFileSize(file.size) }}</span>
                  <span class="text-green-400">S{{ file.season.toString().padStart(2, '0') }}E{{ file.episode.toString().padStart(2, '0') }}</span>
                </div>
              </div>
              <button
                @click="unmatchFile(file)"
                class="btn btn-sm btn-secondary"
              >
                <Icon name="mdi:link-off" class="w-4 h-4" />
                Unmatch
              </button>
            </div>
          </div>
        </div>

        <!-- Bulk Match Tab -->
        <div v-if="activeTab === 'bulk'" class="space-y-4">
          <!-- Auto Match Button -->
          <div class="flex items-center justify-between p-4 card">
            <div>
              <h4 class="font-medium mb-1">Auto-Match All</h4>
              <p class="text-sm text-gray-400">Automatically detect and match all unmatched files</p>
            </div>
            <button
              @click="autoMatch"
              :disabled="loading || unmatchedFiles.length === 0"
              class="btn btn-primary"
            >
              <Icon name="mdi:auto-fix" class="w-4 h-4" />
              Auto-Match {{ unmatchedFiles.length }} Files
            </button>
          </div>

          <!-- Pattern-Based Matching -->
          <div class="card p-4">
            <h4 class="font-medium mb-3">Pattern-Based Matching</h4>
            <p class="text-sm text-gray-400 mb-4">Select a sample file to detect the naming pattern</p>

            <div class="space-y-2 max-h-64 overflow-y-auto">
              <button
                v-for="file in unmatchedFiles.slice(0, 10)"
                :key="file.id"
                @click="selectSample(file)"
                :disabled="loading"
                class="w-full card p-3 hover:border-primary-500/50 transition-colors text-left flex items-center gap-3"
              >
                <Icon name="mdi:file-video" class="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span class="font-mono text-sm flex-1 truncate">{{ file.filename }}</span>
                <Icon name="mdi:chevron-right" class="w-4 h-4 text-gray-500 flex-shrink-0" />
              </button>
              <p v-if="unmatchedFiles.length > 10" class="text-xs text-gray-500 text-center py-2">
                ... and {{ unmatchedFiles.length - 10 }} more files
              </p>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
          <div class="text-center">
            <Icon name="mdi:loading" class="w-8 h-8 animate-spin text-primary-500 mx-auto mb-2" />
            <p class="text-sm text-gray-400">{{ loadingMessage }}</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  mediaId: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'matched': [];
}>();

const config = useRuntimeConfig();
const toast = useToast();

const activeTab = ref<'unmatched' | 'matched' | 'bulk'>('unmatched');
const loading = ref(false);
const loadingMessage = ref('');
const allFiles = ref<any[]>([]);
const matchedFiles = ref<any[]>([]);
const unmatchedFiles = ref<any[]>([]);

// Fetch all files
const fetchFiles = async () => {
  loading.value = true;
  loadingMessage.value = 'Loading files...';
  
  try {
    const response = await $fetch<any>(
      `${config.public.apiBase}/api/episode-matcher/${props.mediaId}/files`
    );
    
    allFiles.value = response.allFiles.map((f: any) => ({
      ...f,
      manualSeason: f.parsedSeason || '',
      manualEpisode: f.parsedEpisode || '',
    }));
    matchedFiles.value = response.matchedFiles;
    unmatchedFiles.value = response.unmatchedFiles.map((f: any) => ({
      ...f,
      manualSeason: f.parsedSeason || '',
      manualEpisode: f.parsedEpisode || '',
    }));
    
  } catch (err: any) {
    console.error('Failed to fetch files:', err);
    toast.error('Failed to load files');
  } finally {
    loading.value = false;
  }
};

// Match a single file
const matchSingleFile = async (file: any) => {
  loading.value = true;
  loadingMessage.value = 'Matching file...';
  
  try {
    await $fetch(
      `${config.public.apiBase}/api/episode-matcher/file/${file.id}/match`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season: parseInt(file.manualSeason),
          episode: parseInt(file.manualEpisode),
        }),
      }
    );
    
    toast.success(`Matched ${file.filename} to S${file.manualSeason.toString().padStart(2, '0')}E${file.manualEpisode.toString().padStart(2, '0')}`);
    await fetchFiles();
    emit('matched');
  } catch (err: any) {
    console.error('Failed to match file:', err);
    toast.error('Failed to match file');
  } finally {
    loading.value = false;
  }
};

// Unmatch a file
const unmatchFile = async (file: any) => {
  loading.value = true;
  loadingMessage.value = 'Unmatching file...';
  
  try {
    await $fetch(
      `${config.public.apiBase}/api/episode-matcher/file/${file.id}/unmatch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
    toast.success(`Unmatched ${file.filename}`);
    await fetchFiles();
    emit('matched');
  } catch (err: any) {
    console.error('Failed to unmatch file:', err);
    toast.error('Failed to unmatch file');
  } finally {
    loading.value = false;
  }
};

// Auto-match using parser
const autoMatch = async () => {
  loading.value = true;
  loadingMessage.value = 'Auto-matching files...';
  
  try {
    const response = await $fetch<any>(
      `${config.public.apiBase}/api/episode-matcher/${props.mediaId}/auto-match`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
    toast.success(`Auto-matched ${response.matched} of ${response.total} files!`);
    
    if (response.matched > 0) {
      emit('matched');
      await fetchFiles();
      activeTab.value = 'matched';
    }
  } catch (err: any) {
    console.error('Auto-match failed:', err);
    toast.error('Failed to auto-match files');
  } finally {
    loading.value = false;
  }
};

// Select sample for pattern detection (placeholder - can implement later)
const selectSample = async (file: any) => {
  toast.info('Pattern detection not yet implemented in simplified UI');
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

// Load files when modal opens
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    activeTab.value = 'unmatched';
    fetchFiles();
  }
});
</script>
