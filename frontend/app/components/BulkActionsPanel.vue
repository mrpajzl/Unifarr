<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="selectedCount > 0"
        class="fixed bottom-0 left-0 right-0 z-40 bg-dark-800 border-t border-gray-700 shadow-2xl"
      >
        <div class="container mx-auto px-4 py-4">
          <div class="flex items-center justify-between gap-4">
            <!-- Selection info -->
            <div class="flex items-center gap-3">
              <div class="bg-primary-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold">
                {{ selectedCount }} selected
              </div>
              <button
                v-if="canSelectAll"
                @click="$emit('select-all')"
                class="text-sm text-primary-500 hover:text-primary-400 transition-colors"
              >
                Select All
              </button>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 flex-wrap">
              <button
                @click="handleRefreshMetadata"
                :disabled="loading"
                class="btn btn-sm bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <Icon name="mdi:refresh" class="w-4 h-4" />
                <span class="hidden sm:inline">Refresh Metadata</span>
              </button>

              <button
                @click="handleAutoMatch"
                :disabled="loading"
                class="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Icon name="mdi:auto-fix" class="w-4 h-4" />
                <span class="hidden sm:inline">Auto-match</span>
              </button>

              <button
                @click="handleRename"
                :disabled="loading"
                class="btn btn-sm bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
              >
                <Icon name="mdi:rename-box" class="w-4 h-4" />
                <span class="hidden sm:inline">Rename</span>
              </button>

              <button
                @click="handleDelete"
                :disabled="loading"
                class="btn btn-sm bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
              >
                <Icon name="mdi:delete" class="w-4 h-4" />
                <span class="hidden sm:inline">Delete</span>
              </button>

              <button
                @click="handleCancel"
                :disabled="loading"
                class="btn btn-sm bg-gray-700 hover:bg-gray-600 text-white"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Progress bar for bulk operations -->
          <div v-if="loading" class="mt-3">
            <div class="flex items-center justify-between text-sm text-gray-400 mb-1">
              <span>{{ loadingMessage }}</span>
              <span>{{ progress }}%</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                class="bg-primary-600 h-full transition-all duration-300"
                :style="{ width: `${progress}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Confirmation dialogs -->
  <ConfirmDialog
    v-model="showDeleteConfirm"
    title="Delete Media"
    :message="`Are you sure you want to delete ${selectedCount} item${selectedCount > 1 ? 's' : ''}? This will remove the files and database records.`"
    confirm-text="Delete"
    confirm-class="bg-red-600 hover:bg-red-700"
    @confirm="confirmDelete"
  />

  <ConfirmDialog
    v-model="showRenameDialog"
    title="Rename Media"
    message="Enter the naming pattern for selected items:"
    confirm-text="Rename"
    confirm-class="bg-purple-600 hover:bg-purple-700"
    :has-input="true"
    input-placeholder="{title} ({year})"
    @confirm="confirmRename"
  />
</template>

<script setup lang="ts">
interface Props {
  selectedCount: number
  canSelectAll?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'select-all': []
  'clear-selection': []
  'refresh-metadata': []
  'auto-match': []
  'rename': [pattern: string]
  'delete': []
}>()

const loading = ref(false)
const loadingMessage = ref('')
const progress = ref(0)

const showDeleteConfirm = ref(false)
const showRenameDialog = ref(false)

// Action handlers
const handleRefreshMetadata = () => {
  emit('refresh-metadata')
}

const handleAutoMatch = () => {
  emit('auto-match')
}

const handleRename = () => {
  showRenameDialog.value = true
}

const handleDelete = () => {
  showDeleteConfirm.value = true
}

const handleCancel = () => {
  emit('clear-selection')
}

// Confirmation handlers
const confirmDelete = () => {
  emit('delete')
  showDeleteConfirm.value = false
}

const confirmRename = (pattern: string) => {
  emit('rename', pattern)
  showRenameDialog.value = false
}

// Expose loading state for parent
defineExpose({
  setLoading: (isLoading: boolean, message = '', progressValue = 0) => {
    loading.value = isLoading
    loadingMessage.value = message
    progress.value = progressValue
  }
})
</script>
