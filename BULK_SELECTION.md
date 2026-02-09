# Bulk Selection & Actions - Feature Documentation

## Overview

Bulk selection allows you to select multiple media items in your library and perform batch operations on them. This significantly speeds up library management tasks like refreshing metadata, auto-matching unidentified items, or cleaning up your collection.

## User Interface

### Desktop Experience

1. **Hover to reveal checkbox** - Move your mouse over any media tile to reveal a checkbox in the top-left corner
2. **Click checkbox to select** - Clicking the checkbox activates selection mode and selects that item
3. **Selection mode** - Once in selection mode:
   - Checkboxes remain visible on all tiles
   - Click anywhere on a tile to toggle selection
   - Shift+click to select a range of items
   - Selected items show a colored ring highlight
4. **Exit selection mode** - Click "Cancel" in the actions panel or deselect all items

### Mobile Experience

1. **Three-dot menu** - Each media tile has a ⋮ button in the top-right corner
2. **Tap the menu** to open options:
   - Select
   - View Details
   - Refresh Metadata
   - Delete
3. **Tap "Select"** to activate selection mode and select that item
4. **Selection mode** - Once activated:
   - Checkboxes appear on all tiles
   - Tap tiles to toggle selection
   - Use the floating action panel for bulk operations

## Available Actions

### Refresh Metadata
- Re-fetches fresh data from TMDB
- Updates poster, overview, ratings, etc.
- Only works on items already matched to TMDB
- **Use case:** Update metadata after TMDB makes corrections

### Auto-match
- Automatically matches unidentified items to TMDB
- Uses filename parsing and fuzzy matching
- Only works on items without TMDB ID
- **Use case:** Quickly identify newly scanned media

### Delete
- Removes items from database and deletes associated files
- Shows confirmation dialog with item count
- **Use case:** Clean up unwanted media from your library

### Rename (Coming Soon)
- Bulk rename folders based on metadata pattern
- Pattern example: `{title} ({year})`
- **Status:** Placeholder - not yet implemented

## Bulk Actions Panel

When items are selected, a floating panel slides up from the bottom of the screen showing:
- **Selection count** - Number of items selected
- **Select All** button (if not all items are selected)
- **Action buttons** - Quick access to bulk operations
- **Cancel** button - Exit selection mode

### Progress Tracking
For long-running operations, the panel shows:
- Progress bar
- Status message
- Percentage complete

## Keyboard Shortcuts

- **Shift+Click** - Select range of items (desktop only)
- **ESC** - Exit selection mode (planned)

## Backend API

### Endpoints

```typescript
// Refresh metadata for multiple items
POST /api/media/bulk/refresh-metadata
Body: { ids: number[] }
Returns: { message: string, results: { success: number[], failed: { id, error }[] } }

// Auto-match multiple unidentified items
POST /api/media/bulk/auto-match
Body: { ids: number[] }
Returns: { message: string, results: { success: number[], failed: { id, error }[] } }

// Delete multiple items
POST /api/media/bulk/delete
Body: { ids: number[] }
Returns: { message: string, results: { success: number[], failed: { id, error }[] } }

// Rename (not yet implemented)
POST /api/media/bulk/rename
Body: { ids: number[], pattern: string }
Returns: { message: string, pattern: string, ids: number[] }
```

### Response Format

All bulk operations return:
- `message` - Summary of operation
- `results.success` - Array of successfully processed IDs
- `results.failed` - Array of failed items with error messages

Example:
```json
{
  "message": "Refreshed 8 of 10 items",
  "results": {
    "success": [1, 2, 3, 4, 5, 6, 7, 8],
    "failed": [
      { "id": 9, "error": "No TMDB ID" },
      { "id": 10, "error": "TMDB rate limit" }
    ]
  }
}
```

## Frontend Implementation

### State Management

The `useMediaSelection` composable provides:
- `selectionMode` - Whether selection mode is active
- `selectedCount` - Number of selected items
- `selectedIdsArray` - Array of selected IDs
- `toggleSelection(id, index)` - Toggle single item
- `toggleRangeSelection(start, end, items)` - Range selection
- `selectAll(items)` - Select all items
- `clearSelection()` - Clear all selections
- `isSelected(id)` - Check if item is selected

### Components

**MediaCard.vue**
- Shows checkbox on hover (desktop) or in selection mode (mobile)
- Three-dot menu for mobile single-item actions
- Handles click events based on selection mode
- Visual feedback for selected state

**BulkActionsPanel.vue**
- Floating panel at bottom of screen
- Action buttons with icons
- Progress bar for long operations
- Slide-up animation

**ConfirmDialog.vue**
- Modal confirmation for destructive actions
- Optional input field (for rename pattern)
- Customizable button text and styling

## Tips & Best Practices

1. **Use filters first** - Apply filters to narrow down items before bulk selecting
2. **Start small** - Test bulk operations on a few items before processing hundreds
3. **Check results** - Review the success/failure summary after bulk operations
4. **Auto-match carefully** - May match incorrectly if filenames are ambiguous
5. **Backup before delete** - Bulk delete is permanent!

## Known Limitations

1. **Range selection on mobile** - Not implemented (tap-only selection)
2. **Keyboard navigation** - Not yet implemented
3. **Undo functionality** - Not available
4. **Bulk rename** - Not yet implemented
5. **Cross-page selection** - Selection resets when navigating away

## Future Enhancements

- [ ] Keyboard navigation (arrow keys, space to select)
- [ ] Undo/redo for bulk operations
- [ ] Persistent selection across page navigation
- [ ] Bulk rename implementation
- [ ] Bulk edit metadata
- [ ] Export selection as playlist/CSV
- [ ] Save selection for later
- [ ] Bulk move between libraries
- [ ] Bulk tag management

---

**Version:** 1.0.0  
**Date:** 2026-02-09  
**Author:** Carl (AI Assistant) + Ondřej Zralý
