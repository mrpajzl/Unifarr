<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        @click.self="$emit('close')"
      >
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          leave-active-class="transition-all duration-150 ease-in"
          enter-from-class="opacity-0 scale-95"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="show"
            class="card w-full max-w-2xl"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
              <div>
                <h2 class="text-2xl font-bold">Edit Library Path</h2>
                <p class="text-sm text-gray-400 mt-1">Change where this media is stored</p>
              </div>
              <button
                @click="$emit('close')"
                class="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
              >
                <Icon name="mdi:close" class="w-5 h-5" />
              </button>
            </div>

            <!-- Current Path -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-400 mb-2">Current Path</label>
              <div class="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
                <Icon name="mdi:folder" class="w-5 h-5 text-gray-400 flex-shrink-0" />
                <code class="text-sm text-gray-300 flex-1 truncate">{{ currentPath }}</code>
              </div>
            </div>

            <!-- New Path -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-400 mb-2">New Path</label>
              <input
                v-model="newPath"
                type="text"
                placeholder="/path/to/new/location"
                class="input w-full"
                @keyup.enter="handleConfirm"
              />
            </div>

            <!-- Move Options -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-400 mb-3">File Handling</label>
              <div class="space-y-3">
                <label class="flex items-start gap-3 p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors">
                  <input
                    v-model="autoMove"
                    type="radio"
                    :value="true"
                    class="mt-1"
                  />
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <Icon name="mdi:file-move" class="w-5 h-5 text-primary-400" />
                      <span class="font-medium">Move files automatically</span>
                    </div>
                    <p class="text-sm text-gray-400 mt-1">
                      System will move all files to the new location and delete the old folder
                    </p>
                  </div>
                </label>

                <label class="flex items-start gap-3 p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors">
                  <input
                    v-model="autoMove"
                    type="radio"
                    :value="false"
                    class="mt-1"
                  />
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <Icon name="mdi:account-arrow-right" class="w-5 h-5 text-blue-400" />
                      <span class="font-medium">I'll move them manually</span>
                    </div>
                    <p class="text-sm text-gray-400 mt-1">
                      Only update the path in the database. You'll move the files yourself.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <!-- Warning -->
            <div v-if="autoMove" class="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg flex items-start gap-3">
              <Icon name="mdi:alert" class="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p class="font-medium text-red-400">Warning: This action cannot be undone!</p>
                <p class="text-sm text-red-300 mt-1">
                  All files will be moved to the new location and the old folder will be deleted.
                  Make sure the new path is correct before proceeding.
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
              <button
                @click="$emit('close')"
                class="btn btn-secondary flex-1"
                :disabled="updating"
              >
                Cancel
              </button>
              <button
                @click="handleConfirm"
                :disabled="!newPath || newPath === currentPath || updating"
                class="btn btn-primary flex-1"
              >
                <Icon
                  :name="updating ? 'mdi:loading' : 'mdi:check'"
                  :class="{ 'animate-spin': updating }"
                  class="w-5 h-5 mr-2"
                />
                {{ updating ? 'Updating...' : 'Confirm' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  show: boolean;
  mediaId: number;
  currentPath: string;
}>();

const emit = defineEmits<{
  close: [];
  updated: [newPath: string];
}>();

const api = useApi();
const toast = useToast();

const newPath = ref('');
const autoMove = ref(false);
const updating = ref(false);

watch(() => props.show, (show) => {
  if (show) {
    newPath.value = props.currentPath;
    autoMove.value = false;
  }
});

const handleConfirm = async () => {
  if (!newPath.value || newPath.value === props.currentPath || updating.value) {
    return;
  }

  updating.value = true;

  try {
    const response = await api.apiFetch(`/api/media/${props.mediaId}/update-path`, {
      method: 'POST',
      body: {
        newPath: newPath.value,
        autoMove: autoMove.value,
      },
    });

    toast.success(
      autoMove.value
        ? `Moved ${(response as any).filesMoved} files to new location`
        : 'Library path updated successfully'
    );

    emit('updated', newPath.value);
    emit('close');
  } catch (err: any) {
    console.error('Failed to update path:', err);
    toast.error(`Failed to update path: ${err.data?.error || err.message || 'Unknown error'}`);
  } finally {
    updating.value = false;
  }
};
</script>
