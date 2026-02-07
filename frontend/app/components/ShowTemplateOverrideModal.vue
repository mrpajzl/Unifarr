<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      @click.self="close"
    >
      <div class="card p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-2xl font-semibold flex items-center gap-2">
              <Icon name="mdi:text-search" class="w-6 h-6 text-orange-400" />
              Custom Search Templates
            </h3>
            <p class="text-sm text-gray-400 mt-1">
              Override default templates for <span class="text-white font-medium">{{ showTitle }}</span>
            </p>
          </div>
          <button @click="close" class="text-gray-400 hover:text-white transition-colors">
            <Icon name="mdi:close" class="w-6 h-6" />
          </button>
        </div>

        <!-- Info Box -->
        <div class="mb-6 p-4 bg-orange-600/10 border border-orange-600/30 rounded-lg">
          <div class="flex items-start gap-3">
            <Icon name="mdi:information" class="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div class="text-sm text-gray-300">
              <p class="font-medium text-orange-400 mb-1">Show-Specific Templates</p>
              <p class="text-gray-400">
                These templates will be used <strong>only for this show</strong>, overriding the default TV templates.
                Leave empty to use default templates.
              </p>
            </div>
          </div>
        </div>

        <!-- Use Custom Templates Toggle -->
        <div class="mb-6 flex items-center justify-between p-4 bg-gray-800 rounded-lg">
          <div>
            <p class="font-medium">Use Custom Templates</p>
            <p class="text-sm text-gray-400">Enable show-specific search templates</p>
          </div>
          <button
            @click="useCustom = !useCustom"
            class="relative w-12 h-6 rounded-full transition-colors"
            :class="useCustom ? 'bg-primary-600' : 'bg-gray-700'"
          >
            <span
              class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform"
              :class="{ 'translate-x-6': useCustom }"
            />
          </button>
        </div>

        <!-- Template Editor -->
        <div v-if="useCustom" class="mb-6">
          <SearchTemplateEditor
            v-model="customTemplates"
            type="tv"
          />
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <button
            @click="save"
            :disabled="saving"
            class="btn btn-primary flex-1"
          >
            <Icon v-if="!saving" name="mdi:content-save" class="w-4 h-4" />
            <Icon v-else name="mdi:loading" class="w-4 h-4 animate-spin" />
            Save Override
          </button>
          
          <button
            v-if="hasExistingOverride"
            @click="removeOverride"
            :disabled="saving"
            class="btn btn-secondary"
          >
            <Icon name="mdi:delete" class="w-4 h-4" />
            Remove Override
          </button>
          
          <button
            @click="close"
            class="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean;
  tmdbId: number;
  showTitle: string;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const config = useRuntimeConfig();
const toast = useToast();

const saving = ref(false);
const useCustom = ref(false);
const customTemplates = ref<string[]>([
  '{Series Title} S{Season:2}E{Episode:2}',
  '{Series OriginalTitle} S{Season:2}E{Episode:2}',
]);
const hasExistingOverride = ref(false);

// Load existing override when modal opens
watch(() => props.modelValue, async (show) => {
  if (show) {
    await loadOverride();
  }
}, { immediate: true });

const loadOverride = async () => {
  try {
    const response = await fetch(`${config.public.apiBase}/api/settings`);
    if (response.ok) {
      const data = await response.json();
      const override = data.searchTemplates?.overrides?.[props.tmdbId];
      
      if (override && override.length > 0) {
        customTemplates.value = [...override];
        useCustom.value = true;
        hasExistingOverride.value = true;
      } else {
        // Reset to defaults
        customTemplates.value = [
          '{Series Title} S{Season:2}E{Episode:2}',
          '{Series OriginalTitle} S{Season:2}E{Episode:2}',
        ];
        useCustom.value = false;
        hasExistingOverride.value = false;
      }
    }
  } catch (error) {
    console.error('Failed to load override:', error);
  }
};

const save = async () => {
  saving.value = true;
  
  try {
    // Get current settings
    const response = await fetch(`${config.public.apiBase}/api/settings`);
    if (!response.ok) throw new Error('Failed to load settings');
    
    const settings = await response.json();
    
    // Update overrides
    if (!settings.searchTemplates) {
      settings.searchTemplates = { movies: [], tv: [], overrides: {} };
    }
    if (!settings.searchTemplates.overrides) {
      settings.searchTemplates.overrides = {};
    }
    
    if (useCustom.value && customTemplates.value.length > 0) {
      // Save override
      settings.searchTemplates.overrides[props.tmdbId] = customTemplates.value;
    } else {
      // Remove override
      delete settings.searchTemplates.overrides[props.tmdbId];
    }
    
    // Save settings
    const saveResponse = await fetch(`${config.public.apiBase}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchTemplates: settings.searchTemplates,
      }),
    });
    
    if (!saveResponse.ok) throw new Error('Failed to save settings');
    
    toast.success(useCustom.value ? 'Custom templates saved' : 'Using default templates');
    emit('saved');
    close();
  } catch (error: any) {
    console.error('Save error:', error);
    toast.error(`Failed to save: ${error.message}`);
  } finally {
    saving.value = false;
  }
};

const removeOverride = async () => {
  useCustom.value = false;
  await save();
};

const close = () => {
  emit('update:modelValue', false);
};
</script>
