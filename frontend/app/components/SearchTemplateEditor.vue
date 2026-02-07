<template>
  <div class="space-y-4">
    <!-- Template List -->
    <div class="space-y-2">
      <div
        v-for="(template, index) in localTemplates"
        :key="index"
        class="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700"
      >
        <input
          v-model="localTemplates[index]"
          type="text"
          class="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-primary-500"
          :placeholder="placeholderExample"
          @input="emitUpdate"
        />
        <button
          @click="removeTemplate(index)"
          class="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
          :disabled="localTemplates.length === 1"
          :class="{ 'opacity-50 cursor-not-allowed': localTemplates.length === 1 }"
        >
          <Icon name="mdi:delete" class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Add Template Button -->
    <button
      @click="addTemplate"
      class="btn btn-secondary w-full"
    >
      <Icon name="mdi:plus" class="w-4 h-4" />
      Add Template
    </button>

    <!-- Available Placeholders -->
    <div class="p-4 rounded-lg" :class="placeholderStyle">
      <h3 class="text-sm font-semibold mb-2" :class="placeholderTitleClass">
        Available Placeholders
      </h3>
      <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-400">
        <code
          v-for="placeholder in placeholders"
          :key="placeholder"
        >
          {{ placeholder }}
        </code>
      </div>
      <p v-if="showPaddingNote" class="text-xs text-gray-500 mt-2">
        <strong>Note:</strong> {Season:2} pads to 2 digits (01, 02, ...). Works with any number.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string[];
  type: 'movie' | 'tv';
}

interface Emits {
  (e: 'update:modelValue', value: string[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const localTemplates = ref([...props.modelValue]);

// Watch for external changes
watch(() => props.modelValue, (newVal) => {
  localTemplates.value = [...newVal];
}, { deep: true });

// Emit updates
const emitUpdate = () => {
  emit('update:modelValue', [...localTemplates.value]);
};

// Add template
const addTemplate = () => {
  const defaultTemplate = props.type === 'movie' 
    ? '{Movie Title} {Release Year}'
    : '{Series Title} S{Season:2}E{Episode:2}';
  
  localTemplates.value.push(defaultTemplate);
  emitUpdate();
};

// Remove template
const removeTemplate = (index: number) => {
  if (localTemplates.value.length > 1) {
    localTemplates.value.splice(index, 1);
    emitUpdate();
  }
};

// Computed properties based on type
const placeholderExample = computed(() => {
  return props.type === 'movie'
    ? '{Movie Title} {Release Year}'
    : '{Series Title} S{Season:2}E{Episode:2}';
});

const placeholders = computed(() => {
  if (props.type === 'movie') {
    return [
      '{Movie Title}',
      '{Movie OriginalTitle}',
      '{Movie CleanTitle}',
      '{Movie CleanOriginalTitle}',
      '{Movie TitleThe}',
      '{Movie Collection}',
      '{Release Year}',
      '{ImdbId}',
      '{TmdbId}',
    ];
  } else {
    return [
      '{Series Title}',
      '{Series OriginalTitle}',
      '{Series CleanTitle}',
      '{Season}',
      '{Season:2}',
      '{Episode}',
      '{Episode:2}',
      '{Episode Title}',
      '{Release Year}',
      '{ImdbId}',
      '{TmdbId}',
    ];
  }
});

const placeholderStyle = computed(() => {
  return props.type === 'movie'
    ? 'bg-blue-600/10 border border-blue-600/30'
    : 'bg-purple-600/10 border border-purple-600/30';
});

const placeholderTitleClass = computed(() => {
  return props.type === 'movie'
    ? 'text-blue-400'
    : 'text-purple-400';
});

const showPaddingNote = computed(() => props.type === 'tv');
</script>

<style scoped>
code {
  @apply px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-primary-400 font-mono;
}
</style>
