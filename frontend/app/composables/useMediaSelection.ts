/**
 * Composable for managing bulk media selection
 */

export const useMediaSelection = () => {
  // Global state for selection mode
  const selectionMode = useState('media-selection-mode', () => false)
  const selectedIds = useState<Set<string>>('media-selected-ids', () => new Set())
  const lastSelectedIndex = useState<number | null>('media-last-selected-index', () => null)

  /**
   * Toggle selection mode on/off
   */
  const toggleSelectionMode = (enabled?: boolean) => {
    selectionMode.value = enabled !== undefined ? enabled : !selectionMode.value
    if (!selectionMode.value) {
      // Clear selection when exiting selection mode
      clearSelection()
    }
  }

  /**
   * Toggle selection for a single item
   */
  const toggleSelection = (id: string, index?: number) => {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
    } else {
      selectedIds.value.add(id)
      if (!selectionMode.value) {
        // Entering selection mode with first selection
        selectionMode.value = true
      }
    }
    
    if (index !== undefined) {
      lastSelectedIndex.value = index
    }

    // Exit selection mode if no items selected
    if (selectedIds.value.size === 0) {
      selectionMode.value = false
    }
  }

  /**
   * Range selection (Shift + click)
   */
  const toggleRangeSelection = (startIndex: number, endIndex: number, mediaItems: any[]) => {
    const start = Math.min(startIndex, endIndex)
    const end = Math.max(startIndex, endIndex)
    
    for (let i = start; i <= end; i++) {
      if (mediaItems[i]) {
        selectedIds.value.add(mediaItems[i].id)
      }
    }

    if (!selectionMode.value) {
      selectionMode.value = true
    }
    lastSelectedIndex.value = endIndex
  }

  /**
   * Select all items
   */
  const selectAll = (mediaItems: any[]) => {
    mediaItems.forEach(item => selectedIds.value.add(item.id))
    if (!selectionMode.value) {
      selectionMode.value = true
    }
  }

  /**
   * Clear all selections
   */
  const clearSelection = () => {
    selectedIds.value.clear()
    lastSelectedIndex.value = null
  }

  /**
   * Check if item is selected
   */
  const isSelected = (id: string) => {
    return selectedIds.value.has(id)
  }

  /**
   * Get selected count
   */
  const selectedCount = computed(() => selectedIds.value.size)

  /**
   * Get selected items array
   */
  const selectedIdsArray = computed(() => Array.from(selectedIds.value))

  return {
    selectionMode,
    selectedIds,
    selectedCount,
    selectedIdsArray,
    lastSelectedIndex,
    toggleSelectionMode,
    toggleSelection,
    toggleRangeSelection,
    selectAll,
    clearSelection,
    isSelected,
  }
}
