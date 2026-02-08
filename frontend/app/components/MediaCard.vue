<template>
  <NuxtLink 
    :to="`/media/${media.id}`" 
    class="card overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary-600 transition-all"
  >
    <!-- Poster -->
    <div class="relative aspect-[2/3] bg-dark-800 overflow-hidden">
      <img 
        v-if="media.posterPath" 
        :src="tmdb.getPosterUrl(media.posterPath)" 
        :alt="media.title"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <FilmIcon class="w-16 h-16 text-gray-600" />
      </div>

      <!-- Rating badge -->
      <div 
        v-if="media.voteAverage" 
        class="absolute top-2 right-2 bg-dark-900/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1"
      >
        <StarIcon class="w-4 h-4 text-yellow-500" />
        <span class="text-sm font-medium">{{ media.voteAverage.toFixed(1) }}</span>
      </div>

      <!-- Year badge -->
      <div 
        v-if="media.year" 
        class="absolute bottom-2 left-2 bg-dark-900/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-medium"
      >
        {{ media.year }}
      </div>
    </div>

    <!-- Info -->
    <div class="p-3">
      <h3 class="font-semibold text-gray-100 truncate mb-1" :title="media.title">
        {{ media.title }}
      </h3>
      <div class="flex items-center gap-2 text-xs text-gray-400">
        <span v-if="media.type === 'tv' && media.numberOfSeasons">
          {{ media.numberOfSeasons }} Season{{ media.numberOfSeasons > 1 ? 's' : '' }}
        </span>
        <span v-else-if="media.runtime">
          {{ tmdb.formatRuntime(media.runtime) }}
        </span>
      </div>
      
      <!-- Search Media button for items without TMDB ID -->
      <button
        v-if="!media.tmdbId"
        @click.prevent="navigateTo(`/media/${media.id}`)"
        class="mt-2 w-full btn btn-primary btn-sm flex items-center justify-center gap-1.5"
      >
        <Icon name="mdi:magnify" class="w-4 h-4" />
        <span>Search Media</span>
      </button>
      
      <!-- Warning badge for items without TMDB ID -->
      <div
        v-if="!media.tmdbId"
        class="mt-2 flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded"
      >
        <Icon name="mdi:alert-circle-outline" class="w-3.5 h-3.5" />
        <span>Not identified</span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { FilmIcon, StarIcon } from '@heroicons/vue/24/solid'
import type { MediaItem } from '~/types'

interface Props {
  media: MediaItem
}

const props = defineProps<Props>()
const tmdb = useTMDB()
</script>
