<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      @click.self="$emit('update:modelValue', false)"
    >
      <div class="card p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-start justify-between mb-6">
          <div>
            <h3 class="text-2xl font-semibold">Bulk Episode Matcher</h3>
            <p class="text-sm text-gray-400 mt-1">
              Match {{ unmatchedFiles.length }} unmatched files to episodes
            </p>
          </div>
          <button
            @click="$emit('update:modelValue', false)"
            class="text-gray-400 hover:text-white transition-colors"
          >
            <Icon name="mdi:close" class="w-6 h-6" />
          </button>
        </div>

        <!-- Steps -->
        <div class="mb-6">
          <div class="flex items-center gap-2 text-sm">
            <div
              :class="[
                'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all',
                step >= 1 ? 'bg-primary-500/20 text-primary-400' : 'bg-gray-800 text-gray-500'
              ]"
            >
              <Icon :name="step > 1 ? 'mdi:check-circle' : 'mdi:numeric-1-circle'" class="w-5 h-5" />
              <span>Select Sample</span>
            </div>
            <Icon name="mdi:chevron-right" class="w-4 h-4 text-gray-600" />
            <div
              :class="[
                'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all',
                step >= 2 ? 'bg-primary-500/20 text-primary-400' : 'bg-gray-800 text-gray-500'
              ]"
            >
              <Icon :name="step > 2 ? 'mdi:check-circle' : 'mdi:numeric-2-circle'" class="w-5 h-5" />
              <span>Detect Pattern</span>
            </div>
            <Icon name="mdi:chevron-right" class="w-4 h-4 text-gray-600" />
            <div
              :class="[
                'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all',
                step >= 3 ? 'bg-primary-500/20 text-primary-400' : 'bg-gray-800 text-gray-500'
              ]"
            >
              <Icon :name="step > 3 ? 'mdi:check-circle' : 'mdi:numeric-3-circle'" class="w-5 h-5" />
              <span>Review & Apply</span>
            </div>
          </div>
        </div>

        <!-- Step 1: Select Sample File -->
        <div v-if="step === 1" class="space-y-4">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-medium">Select a sample file to detect pattern</h4>
            <button
              @click="autoMatch"
              :disabled="loading"
              class="btn btn-secondary btn-sm"
            >
              <Icon name="mdi:auto-fix" class="w-4 h-4" />
              Auto-match All
            </button>
          </div>

          <div class="space-y-2 max-h-96 overflow-y-auto">
            <button
              v-for="file in unmatchedFiles"
              :key="file.id"
              @click="selectSample(file)"
              :disabled="loading"
              class="w-full card p-3 hover:border-primary-500/50 transition-colors text-left flex items-center gap-3"
            >
              <Icon name="mdi:file-video" class="w-5 h-5 text-gray-500 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="font-mono text-sm truncate">{{ file.filename }}</p>
                <div class="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span v-if="file.parsedSeason">Season {{ file.parsedSeason }}</span>
                  <span v-if="file.parsedEpisode">Episode {{ file.parsedEpisode }}</span>
                  <span>{{ formatFileSize(file.size) }}</span>
                </div>
              </div>
              <Icon name="mdi:chevron-right" class="w-5 h-5 text-gray-500 flex-shrink-0" />
            </button>
          </div>
        </div>

        <!-- Step 2: Pattern Detection -->
        <div v-if="step === 2 && detectedPattern" class="space-y-4">
          <div class="card p-4 bg-primary-500/10 border-primary-500/30">
            <div class="flex items-start gap-3">
              <Icon name="mdi:check-circle" class="w-6 h-6 text-primary-400 flex-shrink-0 mt-0.5" />
              <div class="flex-1">
                <h4 class="font-medium text-primary-400 mb-1">Pattern Detected: {{ detectedPattern.patternName }}</h4>
                <p class="text-sm text-gray-300 font-mono mb-2">{{ sampleFile?.filename }}</p>
                <div class="flex items-center gap-4 text-sm">
                  <span class="text-gray-400">Season: <span class="text-white">{{ detectedPattern.example.season }}</span></span>
                  <span class="text-gray-400">Episode: <span class="text-white">{{ detectedPattern.example.episode }}</span></span>
                </div>
              </div>
            </div>
          </div>

          <div class="card p-4">
            <h5 class="font-medium mb-2">Pattern Details</h5>
            <div class="space-y-2 text-sm font-mono">
              <div>
                <span class="text-gray-500">Regex:</span>
                <span class="ml-2 text-primary-400">{{ detectedPattern.regex }}</span>
              </div>
              <div>
                <span class="text-gray-500">Season Group:</span>
                <span class="ml-2 text-white">{{ detectedPattern.seasonGroup }}</span>
              </div>
              <div>
                <span class="text-gray-500">Episode Group:</span>
                <span class="ml-2 text-white">{{ detectedPattern.episodeGroup }}</span>
              </div>
            </div>
          </div>

          <div class="flex gap-3">
            <button
              @click="step = 1"
              class="btn btn-secondary flex-1"
            >
              <Icon name="mdi:arrow-left" class="w-4 h-4" />
              Back
            </button>
            <button
              @click="previewMatches"
              :disabled="loading"
              class="btn btn-primary flex-1"
            >
              <Icon name="mdi:eye" class="w-4 h-4" />
              Preview Matches
            </button>
          </div>
        </div>

        <!-- Step 2: No Pattern Detected -->
        <div v-if="step === 2 && !detectedPattern" class="space-y-4">
          <div class="card p-6 bg-yellow-500/10 border-yellow-500/30 text-center">
            <Icon name="mdi:alert" class="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <h4 class="font-medium text-yellow-400 mb-2">Pattern Not Detected</h4>
            <p class="text-sm text-gray-400">
              Could not automatically detect a season/episode pattern in the filename.
              <br />
              Please try a different file or use manual pattern entry.
            </p>
          </div>

          <button
            @click="step = 1"
            class="btn btn-secondary w-full"
          >
            <Icon name="mdi:arrow-left" class="w-4 h-4" />
            Try Another File
          </button>
        </div>

        <!-- Step 3: Preview & Apply -->
        <div v-if="step === 3 && matchResults" class="space-y-4">
          <!-- Summary -->
          <div class="grid grid-cols-3 gap-3">
            <div class="card p-4 text-center">
              <div class="text-2xl font-bold text-green-400">{{ matchResults.matched }}</div>
              <div class="text-xs text-gray-500 mt-1">Matched</div>
            </div>
            <div class="card p-4 text-center">
              <div class="text-2xl font-bold text-red-400">{{ matchResults.failed }}</div>
              <div class="text-xs text-gray-500 mt-1">Failed</div>
            </div>
            <div class="card p-4 text-center">
              <div class="text-2xl font-bold text-gray-400">{{ matchResults.total }}</div>
              <div class="text-xs text-gray-500 mt-1">Total</div>
            </div>
          </div>

          <!-- Matched Files -->
          <div v-if="matchResults.results.matched.length > 0" class="space-y-2">
            <h4 class="font-medium text-green-400 flex items-center gap-2">
              <Icon name="mdi:check-circle" class="w-5 h-5" />
              Successfully Matched ({{ matchResults.results.matched.length }})
            </h4>
            <div class="max-h-64 overflow-y-auto space-y-1">
              <div
                v-for="match in matchResults.results.matched.slice(0, 20)"
                :key="match.fileId"
                class="card p-2 text-sm"
              >
                <div class="flex items-center gap-2">
                  <Icon name="mdi:check" class="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span class="font-mono flex-1 truncate">{{ match.filename }}</span>
                  <span class="text-xs text-gray-500">
                    S{{ match.season.toString().padStart(2, '0') }}E{{ match.episode.toString().padStart(2, '0') }}
                  </span>
                  <span class="text-xs text-gray-400 max-w-xs truncate">{{ match.episodeName }}</span>
                </div>
              </div>
              <div v-if="matchResults.results.matched.length > 20" class="text-center text-xs text-gray-500 py-2">
                ... and {{ matchResults.results.matched.length - 20 }} more
              </div>
            </div>
          </div>

          <!-- Failed Files -->
          <div v-if="matchResults.results.failed.length > 0" class="space-y-2">
            <h4 class="font-medium text-red-400 flex items-center gap-2">
              <Icon name="mdi:alert-circle" class="w-5 h-5" />
              Failed to Match ({{ matchResults.results.failed.length }})
            </h4>
            <div class="max-h-64 overflow-y-auto space-y-1">
              <div
                v-for="fail in matchResults.results.failed.slice(0, 10)"
                :key="fail.fileId"
                class="card p-2 text-sm"
              >
                <div class="flex items-center gap-2">
                  <Icon name="mdi:close" class="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span class="font-mono flex-1 truncate">{{ fail.filename }}</span>
                  <span class="text-xs text-gray-500">{{ fail.reason }}</span>
                </div>
              </div>
              <div v-if="matchResults.results.failed.length > 10" class="text-center text-xs text-gray-500 py-2">
                ... and {{ matchResults.results.failed.length - 10 }} more
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-4 border-t border-gray-800">
            <button
              @click="step = 2"
              class="btn btn-secondary flex-1"
            >
              <Icon name="mdi:arrow-left" class="w-4 h-4" />
              Back
            </button>
            <button
              v-if="!matchResults.results.matched[0]?.updated"
              @click="applyMatches"
              :disabled="loading || matchResults.matched === 0"
              class="btn btn-primary flex-1"
            >
              <Icon name="mdi:check-all" class="w-4 h-4" />
              Apply {{ matchResults.matched }} Matches
            </button>
            <button
              v-else
              @click="finish"
              class="btn btn-primary flex-1"
            >
              <Icon name="mdi:check" class="w-4 h-4" />
              Done
            </button>
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

const step = ref(1);
const loading = ref(false);
const loadingMessage = ref('');
const unmatchedFiles = ref<any[]>([]);
const sampleFile = ref<any | null>(null);
const detectedPattern = ref<any | null>(null);
const matchResults = ref<any | null>(null);

// Fetch unmatched files
const fetchUnmatchedFiles = async () => {
  loading.value = true;
  loadingMessage.value = 'Loading unmatched files...';
  
  try {
    const response = await $fetch<any>(
      `${config.public.apiBase}/api/episode-matcher/${props.mediaId}/unmatched-files`
    );
    
    unmatchedFiles.value = response.unmatchedFiles;
    
    if (unmatchedFiles.value.length === 0) {
      toast.success('No unmatched files found!');
      emit('update:modelValue', false);
    }
  } catch (err: any) {
    console.error('Failed to fetch unmatched files:', err);
    toast.error('Failed to load unmatched files');
  } finally {
    loading.value = false;
  }
};

// Select sample file and detect pattern
const selectSample = async (file: any) => {
  sampleFile.value = file;
  loading.value = true;
  loadingMessage.value = 'Detecting pattern...';
  
  try {
    const response = await $fetch<any>(
      `${config.public.apiBase}/api/episode-matcher/${props.mediaId}/analyze-pattern`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleFile: file.path,
        }),
      }
    );
    
    if (response.detected) {
      detectedPattern.value = response;
      step.value = 2;
    } else {
      detectedPattern.value = null;
      step.value = 2;
      toast.warning('Could not detect pattern automatically');
    }
  } catch (err: any) {
    console.error('Pattern detection failed:', err);
    toast.error('Failed to detect pattern');
  } finally {
    loading.value = false;
  }
};

// Preview matches
const previewMatches = async () => {
  loading.value = true;
  loadingMessage.value = 'Previewing matches...';
  
  try {
    const response = await $fetch<any>(
      `${config.public.apiBase}/api/episode-matcher/${props.mediaId}/apply-pattern`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regex: detectedPattern.value!.regex,
          seasonGroup: detectedPattern.value!.seasonGroup,
          episodeGroup: detectedPattern.value!.episodeGroup,
          flags: detectedPattern.value!.flags,
          autoMatch: false, // Just preview, don't apply yet
        }),
      }
    );
    
    matchResults.value = response;
    step.value = 3;
  } catch (err: any) {
    console.error('Preview failed:', err);
    toast.error('Failed to preview matches');
  } finally {
    loading.value = false;
  }
};

// Apply matches
const applyMatches = async () => {
  loading.value = true;
  loadingMessage.value = 'Applying matches...';
  
  try {
    const response = await $fetch<any>(
      `${config.public.apiBase}/api/episode-matcher/${props.mediaId}/apply-pattern`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regex: detectedPattern.value!.regex,
          seasonGroup: detectedPattern.value!.seasonGroup,
          episodeGroup: detectedPattern.value!.episodeGroup,
          flags: detectedPattern.value!.flags,
          autoMatch: true, // Actually apply the matches
        }),
      }
    );
    
    matchResults.value = response;
    toast.success(`Successfully matched ${response.matched} files!`);
    emit('matched');
  } catch (err: any) {
    console.error('Apply failed:', err);
    toast.error('Failed to apply matches');
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
      emit('update:modelValue', false);
    } else if (response.failed > 0) {
      // Show failed files and let user try manual pattern matching
      matchResults.value = response;
      step.value = 3;
    }
  } catch (err: any) {
    console.error('Auto-match failed:', err);
    toast.error('Failed to auto-match files');
  } finally {
    loading.value = false;
  }
};

const finish = () => {
  emit('update:modelValue', false);
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
    step.value = 1;
    sampleFile.value = null;
    detectedPattern.value = null;
    matchResults.value = null;
    fetchUnmatchedFiles();
  }
});
</script>
