<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4"
        @click="handleBackdropClick"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

        <!-- Dialog -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="scale-95 opacity-0"
          enter-to-class="scale-100 opacity-100"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="scale-100 opacity-100"
          leave-to-class="scale-95 opacity-0"
        >
          <div
            v-if="modelValue"
            class="relative bg-dark-800 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full"
            @click.stop
          >
            <!-- Header -->
            <div class="px-6 py-4 border-b border-gray-700">
              <h3 class="text-lg font-semibold text-gray-100">{{ title }}</h3>
            </div>

            <!-- Content -->
            <div class="px-6 py-4">
              <p class="text-gray-300 mb-4">{{ message }}</p>
              
              <!-- Optional input field -->
              <input
                v-if="hasInput"
                v-model="inputValue"
                type="text"
                :placeholder="inputPlaceholder"
                class="w-full px-4 py-2 bg-dark-900 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                @keyup.enter="handleConfirm"
              />
            </div>

            <!-- Actions -->
            <div class="px-6 py-4 border-t border-gray-700 flex items-center justify-end gap-3">
              <button
                @click="handleCancel"
                class="btn btn-sm bg-gray-700 hover:bg-gray-600 text-white"
              >
                {{ cancelText }}
              </button>
              <button
                @click="handleConfirm"
                :class="confirmClass || 'bg-primary-600 hover:bg-primary-700'"
                class="btn btn-sm text-white"
              >
                {{ confirmText }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmClass?: string
  hasInput?: boolean
  inputPlaceholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  hasInput: false,
  inputPlaceholder: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': [inputValue?: string]
  'cancel': []
}>()

const inputValue = ref('')

const handleConfirm = () => {
  if (props.hasInput) {
    emit('confirm', inputValue.value)
  } else {
    emit('confirm')
  }
  emit('update:modelValue', false)
  inputValue.value = ''
}

const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
  inputValue.value = ''
}

const handleBackdropClick = () => {
  handleCancel()
}

// Reset input when dialog opens
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    inputValue.value = ''
  }
})
</script>
