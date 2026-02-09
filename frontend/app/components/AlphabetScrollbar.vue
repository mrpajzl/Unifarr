<template>
  <div class="fixed right-2 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-0.5">
    <button
      v-for="letter in alphabet"
      :key="letter"
      @click="$emit('jump', letter)"
      :class="[
        'w-6 h-6 flex items-center justify-center text-xs font-medium rounded transition-all',
        currentLetter === letter 
          ? 'bg-primary-500 text-white scale-110' 
          : 'bg-gray-800/70 text-gray-400 hover:bg-gray-700 hover:text-white hover:scale-105'
      ]"
      :title="`Jump to ${letter}`"
    >
      {{ letter }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  currentLetter?: string;
}>();

defineEmits<{
  jump: [letter: string];
}>();

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');
</script>
