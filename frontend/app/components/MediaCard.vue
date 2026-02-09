<template>
  <div
    class="card overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary-600 transition-all relative"
    :class="{ 
      'ring-2 ring-primary-600': selected,
      'ring-2 ring-primary-400/50': inRangePreview && !selected,
      'select-none': shiftPressed
    }"
    @click.prevent="handleCardClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
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

      <!-- Selection Checkbox (Desktop: on hover, Mobile: in selection mode) -->
      <div
        v-if="showCheckbox"
        class="absolute top-2 left-2 z-10"
        @click.stop="handleCheckboxClick"
      >
        <div
          class="w-6 h-6 rounded border-2 flex items-center justify-center transition-all cursor-pointer"
          :class="[
            selected 
              ? 'bg-primary-600 border-primary-600' 
              : 'bg-dark-900/90 backdrop-blur-sm border-gray-400 hover:border-primary-500'
          ]"
        >
          <Icon
            v-if="selected"
            name="mdi:check"
            class="w-4 h-4 text-white"
          />
        </div>
      </div>

      <!-- Options Menu Button -->
      <button
        ref="menuButtonRef"
        v-if="!selectionMode"
        class="absolute top-2 right-2 z-10 w-8 h-8 bg-dark-900/90 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-dark-800 transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
        @click.stop="handleMenuButtonClick"
      >
        <Icon name="mdi:dots-vertical" class="w-5 h-5" />
      </button>

      <!-- Rating badge (when menu not shown) -->
      <div 
        v-if="media.voteAverage && selectionMode" 
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
        v-if="!media.tmdbId && !selectionMode"
        @click.prevent="navigateTo(`/media/${media.id}`)"
        class="mt-2 w-full btn btn-primary btn-sm flex items-center justify-center gap-1.5"
      >
        <Icon name="mdi:magnify" class="w-4 h-4" />
        <span>Search Media</span>
      </button>
      
      <!-- Warning badge for items without TMDB ID -->
      <div
        v-if="!media.tmdbId && !selectionMode"
        class="mt-2 flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded"
      >
        <Icon name="mdi:alert-circle-outline" class="w-3.5 h-3.5" />
        <span>Not identified</span>
      </div>
    </div>

    <!-- Options Menu (Desktop & Mobile) -->
    <Teleport to="body">
      <!-- Desktop: Click outside closes -->
      <div
        v-if="showOptionsMenu && !isMobile"
        class="fixed inset-0 z-40"
        @click="showOptionsMenu = false"
      >
        <div
          class="absolute w-56 rounded-lg border border-gray-700 overflow-hidden shadow-2xl"
          :style="{ ...menuPosition, backgroundColor: '#1f2937' }"
          @click.stop
        >
          <div class="py-1">
            <button
              @click="handleSelectFromMenu"
              class="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-700 transition-colors text-left"
            >
              <Icon name="mdi:checkbox-marked-circle-outline" class="w-5 h-5 text-primary-500" />
              <span class="text-gray-100 text-sm">Select</span>
            </button>

            <button
              @click="handleViewDetails"
              class="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-700 transition-colors text-left"
            >
              <Icon name="mdi:eye-outline" class="w-5 h-5 text-blue-500" />
              <span class="text-gray-100 text-sm">View Details</span>
            </button>

            <button
              v-if="!media.tmdbId"
              @click="handleIdentify"
              class="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-700 transition-colors text-left"
            >
              <Icon name="mdi:magnify" class="w-5 h-5 text-amber-500" />
              <span class="text-gray-100 text-sm">Identify on TMDB</span>
            </button>

            <button
              v-if="media.tmdbId"
              @click="handleRefreshMetadata"
              class="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-700 transition-colors text-left"
            >
              <Icon name="mdi:refresh" class="w-5 h-5 text-green-500" />
              <span class="text-gray-100 text-sm">Refresh Metadata</span>
            </button>

            <button
              @click="handleDelete"
              class="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-700 transition-colors text-left"
            >
              <Icon name="mdi:delete-outline" class="w-5 h-5 text-red-500" />
              <span class="text-gray-100 text-sm">Delete</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile: Full-screen modal -->
      <div
        v-if="showOptionsMenu && isMobile"
        class="fixed inset-0 z-50 flex items-end"
        @click="showOptionsMenu = false"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        
        <!-- Menu -->
        <div
          class="relative w-full bg-gray-800 rounded-t-xl border border-gray-700 overflow-hidden shadow-xl"
          @click.stop
        >
          <!-- Header -->
          <div class="px-4 py-3 border-b border-gray-700">
            <h3 class="font-semibold text-gray-100 truncate">{{ media.title }}</h3>
          </div>

          <!-- Options -->
          <div class="py-2">
            <button
              @click="handleSelectFromMenu"
              class="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors text-left"
            >
              <Icon name="mdi:checkbox-marked-circle-outline" class="w-5 h-5 text-primary-500" />
              <span class="text-gray-100">Select</span>
            </button>

            <button
              @click="handleViewDetails"
              class="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors text-left"
            >
              <Icon name="mdi:eye-outline" class="w-5 h-5 text-blue-500" />
              <span class="text-gray-100">View Details</span>
            </button>

            <button
              v-if="!media.tmdbId"
              @click="handleIdentify"
              class="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors text-left"
            >
              <Icon name="mdi:magnify" class="w-5 h-5 text-amber-500" />
              <span class="text-gray-100">Identify on TMDB</span>
            </button>

            <button
              v-if="media.tmdbId"
              @click="handleRefreshMetadata"
              class="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors text-left"
            >
              <Icon name="mdi:refresh" class="w-5 h-5 text-green-500" />
              <span class="text-gray-100">Refresh Metadata</span>
            </button>

            <button
              @click="handleDelete"
              class="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors text-left"
            >
              <Icon name="mdi:delete-outline" class="w-5 h-5 text-red-500" />
              <span class="text-gray-100">Delete</span>
            </button>
          </div>

          <!-- Cancel button -->
          <div class="border-t border-gray-700">
            <button
              @click="showOptionsMenu = false"
              class="w-full px-4 py-3 text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- TMDB Identify Modal -->
    <TmdbIdentifyModal
      v-if="showIdentifyModal"
      :media-id="media.id"
      :initial-query="media.title"
      :type="media.type === 'tv' ? 'tv' : 'movie'"
      @close="showIdentifyModal = false"
      @identify="handleIdentifySuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { FilmIcon, StarIcon } from '@heroicons/vue/24/solid'
import type { MediaItem } from '~/types'

interface Props {
  media: MediaItem
  index?: number
  inRangePreview?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  inRangePreview: false
})

const emit = defineEmits<{
  'hover': [index: number]
  'leave': []
  'range-select': [endIndex: number]
  'identified': [mediaId: number]
}>()

const tmdb = useTMDB()

// Selection state
const { 
  selectionMode, 
  isSelected, 
  toggleSelection,
  toggleRangeSelection,
  lastSelectedIndex 
} = useMediaSelection()

const selected = computed(() => isSelected(props.media.id))

// Options menu
const showOptionsMenu = ref(false)
const menuButtonRef = ref<HTMLButtonElement | null>(null)
const menuPosition = ref({ top: '0px', left: '0px' })

// Device detection
const isMobile = ref(false)
const isHovered = ref(false)

// Shift key detection
const shiftPressed = ref(false)

// Calculate menu position based on button
const handleMenuButtonClick = () => {
  if (!menuButtonRef.value) return
  
  const rect = menuButtonRef.value.getBoundingClientRect()
  const menuWidth = 224 // w-56 = 14rem = 224px
  const menuHeight = 200 // approximate height
  
  // Position below the button, aligned to right
  let top = rect.bottom + 4
  let left = rect.right - menuWidth
  
  // Keep menu on screen
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth
  
  // If menu would go off bottom, position above button
  if (top + menuHeight > viewportHeight) {
    top = rect.top - menuHeight - 4
  }
  
  // If menu would go off left, align to left of button
  if (left < 8) {
    left = 8
  }
  
  // If menu would go off right, align to right edge
  if (left + menuWidth > viewportWidth - 8) {
    left = viewportWidth - menuWidth - 8
  }
  
  menuPosition.value = {
    top: `${top}px`,
    left: `${left}px`
  }
  
  showOptionsMenu.value = true
}

onMounted(() => {
  // Simple mobile detection
  isMobile.value = window.innerWidth < 768
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 768
  })

  // Track shift key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') shiftPressed.value = true
  })
  window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') shiftPressed.value = false
  })
})

onUnmounted(() => {
  // Cleanup shift key listeners
  window.removeEventListener('keydown', () => {})
  window.removeEventListener('keyup', () => {})
})

// Show checkbox logic
const showCheckbox = computed(() => {
  if (isMobile.value) {
    return selectionMode.value
  } else {
    // Desktop: show on hover or when in selection mode
    return isHovered.value || selectionMode.value
  }
})

// Handle mouse events for range preview
const handleMouseEnter = () => {
  isHovered.value = true
  if (props.index !== undefined && selectionMode.value && shiftPressed.value) {
    emit('hover', props.index)
  }
}

const handleMouseLeave = () => {
  isHovered.value = false
  if (selectionMode.value && shiftPressed.value) {
    emit('leave')
  }
}

// Handle card click
const handleCardClick = (event: MouseEvent) => {
  // Prevent default to avoid text selection on shift+click
  event.preventDefault()
  
  if (selectionMode.value) {
    // In selection mode, toggle selection (support shift for range)
    if (event.shiftKey && lastSelectedIndex.value !== null && props.index !== undefined) {
      // Range selection - emit event to parent
      emit('range-select', props.index)
    } else {
      toggleSelection(props.media.id, props.index)
    }
  } else {
    // Normal mode: navigate to detail
    navigateTo(`/media/${props.media.id}`)
  }
}

// Handle checkbox click
const handleCheckboxClick = (event: MouseEvent) => {
  // Prevent default to avoid text selection
  event.preventDefault()
  
  if (event.shiftKey && lastSelectedIndex.value !== null && props.index !== undefined) {
    // Range selection - emit event to parent
    emit('range-select', props.index)
  } else {
    toggleSelection(props.media.id, props.index)
  }
}

// Identify modal
const showIdentifyModal = ref(false)

const handleIdentify = () => {
  showOptionsMenu.value = false
  showIdentifyModal.value = true
}

const handleIdentifySuccess = async (tmdbId: number, type: 'movie' | 'tv') => {
  try {
    const config = useRuntimeConfig()
    await $fetch(`${config.public.apiBase}/api/media/${props.media.id}/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId, type }),
    })
    
    showIdentifyModal.value = false
    // Emit refresh event to parent
    emit('identified', props.media.id)
  } catch (err: any) {
    console.error('Failed to identify:', err)
  }
}

// Options menu actions
const handleSelectFromMenu = () => {
  toggleSelection(props.media.id, props.index)
  showOptionsMenu.value = false
}

const handleViewDetails = () => {
  navigateTo(`/media/${props.media.id}`)
  showOptionsMenu.value = false
}

const handleRefreshMetadata = async () => {
  // TODO: Implement refresh metadata
  console.log('Refresh metadata for', props.media.id)
  showOptionsMenu.value = false
}

const handleDelete = async () => {
  // TODO: Implement delete
  console.log('Delete', props.media.id)
  showOptionsMenu.value = false
}
</script>
