<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="cancel">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div class="modal-header">
          <h2 id="dialog-title" class="text-xl font-semibold">{{ title }}</h2>
          <button class="btn btn-icon btn-ghost" @click="cancel" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="text-secondary">{{ message }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="cancel">{{ cancelText }}</button>
          <button class="btn" :class="confirmButtonClass" @click="confirm" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            <span v-else>{{ confirmText }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmType?: 'primary' | 'danger'
  loading?: boolean
}>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmType: 'primary',
  loading: false
})

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const isOpen = ref(false)

const open = () => {
  isOpen.value = true
}

const close = () => {
  isOpen.value = false
}

const confirm = () => {
  emit('confirm')
}

const cancel = () => {
  emit('cancel')
  close()
}

const confirmButtonClass = computed(() => {
  return props.confirmType === 'danger' ? 'btn-danger' : 'btn-primary'
})

defineExpose({
  open,
  close
})
</script>

<style scoped>
.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
}
</style>
