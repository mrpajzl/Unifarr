<template>
  <div class="card p-4 mb-6">
    <!-- Always visible row: Search + Sort + Filters toggle -->
    <div class="flex gap-3 items-center">
      <!-- Search -->
      <div class="relative flex-1">
        <Icon name="mdi:magnify" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          :value="search"
          @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
          type="text"
          :placeholder="`Search ${label}...`"
          class="input w-full pl-9"
        />
      </div>

      <!-- Sort -->
      <div class="flex gap-1 shrink-0">
        <select
          :value="sortBy"
          @change="$emit('update:sortBy', ($event.target as HTMLSelectElement).value)"
          class="input"
        >
          <option value="title">Title</option>
          <option value="year">Year</option>
          <option value="rating">Rating</option>
          <option value="added">Date Added</option>
        </select>
        <button
          @click="$emit('update:sortOrder', sortOrder === 'asc' ? 'desc' : 'asc')"
          class="btn btn-secondary px-2"
          :title="sortOrder === 'asc' ? 'Ascending' : 'Descending'"
        >
          <Icon :name="sortOrder === 'asc' ? 'mdi:sort-ascending' : 'mdi:sort-descending'" class="w-5 h-5" />
        </button>
      </div>

      <!-- Filters toggle -->
      <button
        @click="filtersOpen = !filtersOpen"
        class="btn shrink-0 relative"
        :class="filtersOpen || activeFilters > 0 ? 'btn-primary' : 'btn-secondary'"
      >
        <Icon name="mdi:filter-variant" class="w-4 h-4 mr-1.5" />
        Filters
        <span
          v-if="activeFilters > 0"
          class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center"
        >{{ activeFilters }}</span>
      </button>
    </div>

    <!-- Collapsible filters row -->
    <div v-if="filtersOpen" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-700">
      <!-- Genre Filter -->
      <select
        :value="genre"
        @change="$emit('update:genre', ($event.target as HTMLSelectElement).value)"
        class="input w-full"
      >
        <option value="">All Genres</option>
        <option v-for="g in genres" :key="g" :value="g">{{ g }}</option>
      </select>

      <!-- Year Filter -->
      <input
        :value="year"
        @input="$emit('update:year', ($event.target as HTMLInputElement).value)"
        type="number"
        placeholder="Filter by year..."
        class="input w-full"
        min="1900"
        :max="new Date().getFullYear() + 1"
      />

      <!-- Extra Filter Slot -->
      <slot name="extra-filter" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  label: string;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  genre: string;
  year: string;
  genres: string[];
  activeFilters?: number;
}

defineProps<Props>();

defineEmits<{
  'update:search': [value: string];
  'update:sortBy': [value: string];
  'update:sortOrder': [value: 'asc' | 'desc'];
  'update:genre': [value: string];
  'update:year': [value: string];
}>();

const filtersOpen = ref(false);
</script>
