/**
 * Global media event bus for reactive updates across components
 */

type MediaEventType = 'identified' | 'deleted' | 'updated' | 'filesChanged'

interface MediaEvent {
  type: MediaEventType
  mediaId: number
  data?: any
}

const listeners = new Map<MediaEventType, Set<(event: MediaEvent) => void>>()

export const useMediaEvents = () => {
  const emit = (type: MediaEventType, mediaId: number, data?: any) => {
    const event: MediaEvent = { type, mediaId, data }
    listeners.get(type)?.forEach(callback => callback(event))
  }

  const on = (type: MediaEventType, callback: (event: MediaEvent) => void) => {
    if (!listeners.has(type)) {
      listeners.set(type, new Set())
    }
    listeners.get(type)!.add(callback)
  }

  const off = (type: MediaEventType, callback: (event: MediaEvent) => void) => {
    listeners.get(type)?.delete(callback)
  }

  // Cleanup on component unmount
  onUnmounted(() => {
    listeners.forEach(set => set.clear())
  })

  return { emit, on, off }
}
