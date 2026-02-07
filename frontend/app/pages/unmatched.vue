<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">Unmatched Files</h1>
        <p class="text-sm text-gray-500 mt-0.5">
          {{ unmatchedFiles?.length || 0 }} files need matching
        </p>
      </div>
      <button
        v-if="unmatchedFiles?.length"
        @click="autoMatchAll"
        :disabled="autoMatchingAll"
        class="btn btn-primary btn-sm"
      >
        <Icon
          :name="autoMatchingAll ? 'mdi:loading' : 'mdi:magic-staff'"
          :class="{ 'animate-spin': autoMatchingAll }"
          class="w-4 h-4 mr-1.5"
        />
        Auto-Match All
      </button>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex justify-center py-16">
      <Icon name="mdi:loading" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card p-8 text-center">
      <Icon name="mdi:alert-circle" class="w-12 h-12 mx-auto mb-3 text-red-500" />
      <p class="font-medium text-red-400">Failed to load unmatched files</p>
      <button @click="refresh" class="btn btn-secondary btn-sm mt-4">Try Again</button>
    </div>

    <!-- All matched -->
    <div v-else-if="!unmatchedFiles?.length" class="card p-12 text-center">
      <div class="w-16 h-16 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-4">
        <Icon name="mdi:check-circle" class="w-10 h-10 text-green-500" />
      </div>
      <h3 class="text-xl font-semibold mb-2">All files matched!</h3>
      <p class="text-gray-400">Every media file in your library is properly identified</p>
    </div>

    <!-- File List -->
    <div v-else class="space-y-4">
      <div
        v-for="file in unmatchedFiles"
        :key="file.id"
        class="card overflow-hidden"
      >
        <!-- File Info Header -->
        <div class="p-4 border-b border-gray-800">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-semibold truncate">{{ file.filename }}</h3>
                <Icon v-if="(file as any)._isTVShow" name="mdi:television" class="w-4 h-4 text-primary-400 flex-shrink-0" />
              </div>
              <p class="text-xs text-gray-500 truncate mt-0.5">{{ file.path }}</p>
            </div>
            <span v-if="file.size" class="text-xs text-gray-500 flex-shrink-0 bg-gray-800 px-2 py-0.5 rounded">
              {{ formatBytes(file.size) }}
            </span>
          </div>

          <!-- Parsed metadata tags -->
          <div v-if="file.parsedTitle" class="flex flex-wrap gap-1.5 mt-2">
            <span class="px-2 py-0.5 bg-gray-800 rounded text-xs font-medium">
              {{ file.parsedTitle }}
            </span>
            <span v-if="file.parsedYear" class="px-2 py-0.5 bg-gray-800 rounded text-xs">
              {{ file.parsedYear }}
            </span>
            <span v-if="(file as any)._isTVShow" class="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs font-semibold">
              TV Show · {{ (file as any)._episodeCount }} episodes
            </span>
            <span v-else-if="file.parsedSeason != null" class="px-2 py-0.5 bg-indigo-600/20 text-indigo-400 rounded text-xs">
              S{{ String(file.parsedSeason).padStart(2, '0') }}E{{ String(file.parsedEpisode || 0).padStart(2, '0') }}
            </span>
            <span v-if="file.parsedQuality" class="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs">
              {{ file.parsedQuality }}
            </span>
            <span v-if="file.parsedCodec" class="px-2 py-0.5 bg-purple-600/20 text-purple-400 rounded text-xs">
              {{ file.parsedCodec }}
            </span>
          </div>
        </div>

        <!-- Search & Match -->
        <div class="p-4">
          <div class="flex flex-col sm:flex-row gap-2">
            <div class="flex-1 flex gap-2">
              <div class="flex-1 relative">
                <Icon name="mdi:magnify" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  v-model="searchQueries[file.id]"
                  type="text"
                  :placeholder="`Search TMDB for '${file.parsedTitle || file.filename}'...`"
                  class="input w-full pl-9 text-sm"
                  @input="debouncedSearch(file.id)"
                  @keyup.enter="immediateSearch(file.id)"
                />
              </div>
              <input
                v-model.number="searchYears[file.id]"
                type="number"
                placeholder="Year"
                class="input w-24 text-sm"
                @input="debouncedSearch(file.id)"
                @keyup.enter="immediateSearch(file.id)"
              />
            </div>
            <button
              v-if="file.parsedTitle"
              @click="autoMatch(file)"
              :disabled="matchingFiles.has(file.id)"
              class="btn btn-secondary btn-sm flex-shrink-0"
            >
              <Icon
                :name="matchingFiles.has(file.id) ? 'mdi:loading' : 'mdi:magic-staff'"
                :class="{ 'animate-spin': matchingFiles.has(file.id) }"
                class="w-4 h-4 mr-1.5"
              />
              Auto
            </button>
          </div>

          <!-- Search loading -->
          <div v-if="searchingFiles.has(file.id)" class="flex justify-center py-4">
            <Icon name="mdi:loading" class="w-5 h-5 animate-spin text-primary-500" />
          </div>

          <!-- Search Results -->
          <div v-else-if="searchResults[file.id]?.length" class="mt-3 space-y-1.5 max-h-80 overflow-y-auto">
            <button
              v-for="result in searchResults[file.id]"
              :key="result.id"
              @click="selectMatch(file.id, result)"
              :disabled="matchingFiles.has(file.id)"
              class="w-full card p-2.5 flex items-center gap-3 hover:border-primary-500/50 transition-colors text-left"
            >
              <div class="w-10 h-14 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                <img
                  v-if="result.poster_path"
                  :src="getTMDBImageUrl(result.poster_path, 'w200')"
                  :alt="result.title || result.name"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <Icon name="mdi:image-off" class="w-4 h-4 text-gray-600" />
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="font-medium text-sm truncate">
                    {{ result.title || result.name }}
                  </h4>
                  <span
                    v-if="result.inLibrary"
                    class="px-1.5 py-0.5 bg-green-600/20 text-green-400 rounded text-[10px] font-semibold uppercase tracking-wide flex-shrink-0"
                  >
                    In Library
                  </span>
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <span v-if="getYear(result)">{{ getYear(result) }}</span>
                  <span class="uppercase text-[10px] font-medium px-1.5 py-0.5 bg-gray-800 rounded">
                    {{ (result.media_type || (result.title ? 'movie' : 'tv')) }}
                  </span>
                  <span v-if="result.vote_average" class="flex items-center gap-0.5">
                    <Icon name="mdi:star" class="w-3 h-3 text-yellow-400" />
                    {{ result.vote_average.toFixed(1) }}
                  </span>
                  <span 
                    v-if="result._matchScore !== undefined" 
                    class="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                    :class="result._matchScore >= 0.95 ? 'bg-green-600/20 text-green-400' : result._matchScore >= 0.8 ? 'bg-yellow-600/20 text-yellow-400' : 'bg-gray-700 text-gray-400'"
                  >
                    {{ Math.round(result._matchScore * 100) }}% match
                  </span>
                </div>
              </div>

              <div class="flex-shrink-0">
                <Icon
                  :name="result.inLibrary ? 'mdi:check-circle' : 'mdi:link-variant-plus'"
                  :class="result.inLibrary ? 'text-green-500' : 'text-primary-500'"
                  class="w-5 h-5"
                />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { File as MediaFile, TMDBSearchResult } from '~/types/api';

const api = useApi();
const toast = useToast();
const { formatBytes, getTMDBImageUrl } = useFormatters();

// Fetch
const { data: unmatchedFiles, pending, error, refresh } = await useAsyncData(
  'unmatched-files',
  () => api.files.getUnmatched()
);

// State
const searchQueries = ref<Record<number, string>>({});
const searchYears = ref<Record<number, number | undefined>>({});
const searchResults = ref<Record<number, TMDBSearchResult[]>>({});
const searchingFiles = ref(new Set<number>());
const matchingFiles = ref(new Set<number>());
const autoMatchingAll = ref(false);

// Search debounce
const searchTimeouts: Record<number, ReturnType<typeof setTimeout>> = {};

const debouncedSearch = (fileId: number) => {
  if (searchTimeouts[fileId]) clearTimeout(searchTimeouts[fileId]);
  searchTimeouts[fileId] = setTimeout(() => executeSearch(fileId), 500);
};

const immediateSearch = (fileId: number) => {
  if (searchTimeouts[fileId]) clearTimeout(searchTimeouts[fileId]);
  executeSearch(fileId);
};

// Normalize title for comparison
const normalizeTitle = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/^(the|a|an)\s+/i, '') // Remove leading articles
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

// Simple string similarity (Levenshtein-based)
const stringSimilarity = (str1: string, str2: string): number => {
  const s1 = normalizeTitle(str1);
  const s2 = normalizeTitle(str2);
  if (s1 === s2) return 1.0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(s1, s2);
  return (longer.length - editDistance) / longer.length;
};

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
};

const executeSearch = async (fileId: number) => {
  const query = searchQueries.value[fileId];
  const searchYear = searchYears.value[fileId];
  
  if (!query || query.length < 2) {
    searchResults.value[fileId] = [];
    return;
  }

  searchingFiles.value.add(fileId);
  try {
    let results = await api.search.multi(query);
    
    // Score and sort results
    const scored = results.map(result => {
      const tmdbTitle = result.title || result.name || '';
      const tmdbYear = getYear(result);
      let score = 0;
      
      // Title similarity (60% weight)
      const titleSim = stringSimilarity(query, tmdbTitle);
      score += titleSim * 0.6;
      
      // Year match (40% weight)
      if (searchYear && tmdbYear === searchYear) {
        score += 0.4; // Exact match
      } else if (searchYear && tmdbYear) {
        const yearDiff = Math.abs(tmdbYear - searchYear);
        if (yearDiff === 1) score += 0.2; // ±1 year
        else if (yearDiff === 2) score += 0.1; // ±2 years
      } else if (!searchYear) {
        // No year filter - bonus for popularity
        const voteCount = result.vote_count || 0;
        if (voteCount > 1000) score += 0.02;
        if (voteCount > 5000) score += 0.03;
      }
      
      return { ...result, _matchScore: score };
    });
    
    // Sort by score descending
    scored.sort((a, b) => (b._matchScore || 0) - (a._matchScore || 0));
    
    searchResults.value[fileId] = scored;
  } catch {
    searchResults.value[fileId] = [];
  } finally {
    searchingFiles.value.delete(fileId);
  }
};

const getYear = (r: TMDBSearchResult) => {
  const date = r.release_date || r.first_air_date;
  return date ? new Date(date).getFullYear() : null;
};

// Auto-match single file (using new strict matcher)
const autoMatch = async (file: MediaFile) => {
  if (!file.parsedTitle) return;
  matchingFiles.value.add(file.id);

  try {
    const result = await api.media.autoMatch(file.id);
    if (result.success) {
      toast.success(`Auto-matched: ${file.parsedTitle}`);
      await refresh();
    } else {
      // If auto-match fails (low confidence), show search results for manual selection
      searchQueries.value[file.id] = file.parsedTitle;
      const results = await api.search.multi(file.parsedTitle);
      searchResults.value[file.id] = results;
      toast.info(`"${file.parsedTitle}" - confidence too low, select manually`);
    }
  } catch (err: any) {
    // 400 = low confidence (expected), other errors are real errors
    if (err.statusCode === 400 || err.status === 400) {
      searchQueries.value[file.id] = file.parsedTitle;
      const results = await api.search.multi(file.parsedTitle);
      searchResults.value[file.id] = results;
      toast.info(`"${file.parsedTitle}" - confidence too low, select manually`);
    } else {
      toast.error(`Auto-match failed for "${file.parsedTitle}": ${err.message}`);
    }
  } finally {
    matchingFiles.value.delete(file.id);
  }
};

// Auto-match all (using new strict matcher)
const autoMatchAll = async () => {
  if (!unmatchedFiles.value) return;
  autoMatchingAll.value = true;

  try {
    const result = await api.media.autoMatchAll();
    if (result.success) {
      toast.success(result.message);
      await refresh();
    } else {
      toast.error('Auto-match failed');
    }
  } catch (err: any) {
    toast.error(`Auto-match failed: ${err.message}`);
  } finally {
    autoMatchingAll.value = false;
  }
};

// Select a match
const selectMatch = async (fileId: number, result: TMDBSearchResult) => {
  matchingFiles.value.add(fileId);
  try {
    const type = result.media_type || (result.title ? 'movie' : 'tv');

    // Create or find media entry
    const media = await api.media.create({
      tmdbId: result.id,
      type: type as 'movie' | 'tv',
    });

    // Link file to media
    await api.media.match(media.id, fileId, 0.9);

    toast.success(`Matched to "${result.title || result.name}"`);

    // Refresh list
    await refresh();

    // Cleanup
    delete searchQueries.value[fileId];
    delete searchResults.value[fileId];
  } catch (err: any) {
    toast.error(`Match failed: ${err.message}`);
  } finally {
    matchingFiles.value.delete(fileId);
  }
};

// Pre-fill search queries and years with parsed data
watch(
  unmatchedFiles,
  (files) => {
    files?.forEach((file) => {
      if (!searchQueries.value[file.id] && file.parsedTitle) {
        searchQueries.value[file.id] = file.parsedTitle;
      }
      if (!searchYears.value[file.id] && file.parsedYear) {
        searchYears.value[file.id] = file.parsedYear;
      }
    });
  },
  { immediate: true }
);

useHead({ title: 'Unmatched Files - Unifarr' });
</script>
