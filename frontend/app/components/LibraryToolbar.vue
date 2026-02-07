<template>
  <div class="card p-4 mb-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <!-- Search -->
      <div class="sm:col-span-2 lg:col-span-1">
        <div class="relative">
          <Icon name="mdi:magnify" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            :value="search"
            @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
            type="text"
            :placeholder="`Search ${label}...`"
            class="input w-full pl-9"
          />
        </div>
      </div>

      <!-- Sort -->
      <div>
        <div class="flex gap-1">
          <select
            :value="sortBy"
            @change="$emit('update:sortBy', ($event.target as HTMLSelectElement).value)"
            class="input flex-1"
          >
            <option value="title">Sort: Title</option>
            <option value="year">Sort: Year</option>
            <option value="rating">Sort: Rating</option>
            <option value="added">Sort: Date Added</option>
          </select>
          <button
            @click="$emit('update:sortOrder', sortOrder === 'asc' ? 'desc' : 'asc')"
            class="btn btn-secondary px-2"
            :title="sortOrder === 'asc' ? 'Ascending' : 'Descending'"
          >
            <Icon :name="sortOrder === 'asc' ? 'mdi:sort-ascending' : 'mdi:sort-descending'" class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Genre Filter -->
      <div>
        <select
          :value="genre"
          @change="$emit('update:genre', ($event.target as HTMLSelectElement).value)"
          class="input w-full"
        >
          <option value="">All Genres</option>
          <option v-for="g in genres" :key="g" :value="g">{{ g }}</option>
        </select>
      </div>

      <!-- Year Filter -->
      <div>
        <input
          :value="year"
          @input="$emit('update:year', ($event.target as HTMLInputElement).value)"
          type="number"
          placeholder="Filter by year..."
          class="input w-full"
          min="1900"
          :max="new Date().getFullYear() + 1"
        />
      </div>

      <!-- Extra Filter Slot -->
      <div>
        <slot name="extra-filter" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  genre: string;
  year: string;
  genres: string[];
}

defineProps<Props>();

defineEmits<{
  'update:search': [value: string];
  'update:sortBy': [value: string];
  'update:sortOrder': [value: 'asc' | 'desc'];
  'update:genre': [value: string];
  'update:year': [value: string];
}>();
</script>
