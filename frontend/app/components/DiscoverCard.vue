<template>
  <NuxtLink
    :to="getDetailsUrl(item)"
    class="card overflow-hidden group relative text-left w-full block hover:ring-2 hover:ring-primary-600 transition-all"
  >
    <!-- In Library Badge -->
    <div
      v-if="item.inLibrary"
      class="absolute top-2 right-2 z-10 bg-green-600 text-white px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide shadow-lg flex items-center gap-1"
    >
      <Icon name="mdi:check-circle" class="w-3 h-3" />
      In Library
    </div>

    <!-- Poster -->
    <div class="relative aspect-[2/3] bg-gray-800 overflow-hidden">
      <img
        v-if="item.poster_path"
        :src="getTMDBImageUrl(item.poster_path, 'w500')"
        :alt="item.title || item.name"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <Icon name="mdi:image-off" class="w-12 h-12 text-gray-600" />
      </div>

      <!-- Hover Overlay -->
      <div
        class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3"
      >
        <!-- Rating -->
        <div v-if="item.vote_average" class="flex items-center gap-1.5 mb-2">
          <Icon name="mdi:star" class="w-4 h-4 text-yellow-400" />
          <span class="text-sm font-semibold">{{ item.vote_average.toFixed(1) }}</span>
          <span class="text-xs text-gray-400">({{ formatVoteCount(item.vote_count) }})</span>
        </div>

        <!-- Overview -->
        <p v-if="item.overview" class="text-xs text-gray-300 line-clamp-3 mb-3">
          {{ item.overview }}
        </p>

        <!-- Click hint -->
        <div class="text-center text-xs text-primary-400 font-semibold py-2">
          Click for details & trailer
        </div>
      </div>
    </div>

    <!-- Info -->
    <div class="p-3">
      <h3 class="font-semibold text-sm truncate mb-1" :title="item.title || item.name">
        {{ item.title || item.name }}
      </h3>
      <div class="flex items-center justify-between text-xs text-gray-500">
        <span v-if="getYear(item)">{{ getYear(item) }}</span>
        <span class="px-1.5 py-0.5 bg-gray-800 rounded uppercase text-[10px] font-medium">
          {{ item.media_type || (item.title ? 'movie' : 'tv') }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { TMDBSearchResult } from '~/types/api';

interface Props {
  item: TMDBSearchResult;
}

const props = defineProps<Props>();

const { getTMDBImageUrl } = useFormatters();

const getDetailsUrl = (item: TMDBSearchResult) => {
  const type = item.media_type || (item.title ? 'movie' : 'tv');
  return `/media/tmdb?type=${type}&id=${item.id}`;
};

const getYear = (item: TMDBSearchResult) => {
  const date = item.release_date || item.first_air_date;
  return date ? new Date(date).getFullYear() : null;
};

const formatVoteCount = (count?: number) => {
  if (!count) return '0';
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
};
</script>
