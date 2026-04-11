<template>
  <span class="chip" :class="chipClass">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status?: string
}>()

const chipClass = computed(() => {
  switch (props.status) {
    case 'active':
      return 'chip-success'
    case 'paused':
    case 'paused_limit':
      return 'chip-warning'
    case 'error':
      return 'chip-error'
    default:
      return 'chip-neutral'
  }
})

const label = computed(() => {
  switch (props.status) {
    case 'active': return 'Active'
    case 'paused': return 'Paused'
    case 'paused_limit': return 'Limit Paused'
    case 'error': return 'Error'
    default: return 'Unknown'
  }
})
</script>
