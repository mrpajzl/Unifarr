<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <TransitionGroup
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-200 ease-in"
        enter-from-class="opacity-0 translate-x-8"
        leave-to-class="opacity-0 translate-x-8"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border max-w-sm backdrop-blur-sm',
            colorClasses[toast.type],
          ]"
        >
          <Icon :name="iconMap[toast.type]" class="w-5 h-5 flex-shrink-0" />
          <p class="text-sm font-medium flex-1">{{ toast.message }}</p>
          <button @click="dismiss(toast.id)" class="p-0.5 hover:opacity-70 transition-opacity flex-shrink-0">
            <Icon name="mdi:close" class="w-4 h-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { toasts, dismiss } = useToast();

const colorClasses: Record<string, string> = {
  success: 'bg-green-900/90 border-green-700 text-green-100',
  error: 'bg-red-900/90 border-red-700 text-red-100',
  warning: 'bg-yellow-900/90 border-yellow-700 text-yellow-100',
  info: 'bg-blue-900/90 border-blue-700 text-blue-100',
};

const iconMap: Record<string, string> = {
  success: 'mdi:check-circle',
  error: 'mdi:alert-circle',
  warning: 'mdi:alert',
  info: 'mdi:information',
};
</script>
