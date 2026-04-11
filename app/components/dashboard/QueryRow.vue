<template>
  <tr :class="{ 'row-expanded': isExpanded, 'row-paused': query.status === 'paused' }" @click="toggleExpand" class="query-row">
    <td>
      <div class="query-label-col">
        <button class="btn btn-icon btn-ghost btn-sm expand-btn" @click.stop="toggleExpand">
          <svg v-if="!isExpanded" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <span class="query-label truncate">{{ query.label || 'Unnamed Query' }}</span>
      </div>
    </td>
    <td>
      <div class="query-summary truncate" :title="summaryText">
        {{ summaryText }}
      </div>
    </td>
    <td @click.stop>
      <select class="select select-sm inline-select" v-model="localInterval" @change="updateInterval">
        <option value="5m">5 min</option>
        <option value="15m">15 min</option>
        <option value="30m">30 min</option>
        <option value="1h">1 hr</option>
        <option value="6h">6 hr</option>
      </select>
    </td>
    <td @click.stop>
      <label class="toggle">
        <input type="checkbox" v-model="localTrackPrices" @change="updateTrackPrices">
        <span class="toggle-track"></span>
      </label>
    </td>
    <td class="text-tertiary text-sm">
      {{ timeAgo }}
    </td>
    <td>
      <StatusChip :status="query.status" />
    </td>
    <td class="actions-cell" @click.stop>
      <div class="row-actions">
        <button class="btn btn-icon btn-ghost btn-sm" @click="forcePoll" title="Force Poll Now" :disabled="isPolling">
          <svg :class="{'spin': isPolling}" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
            <path d="M21 3v5h-5"></path>
          </svg>
        </button>
        <button class="btn btn-icon btn-ghost btn-sm" @click="togglePause" :title="query.status === 'paused' ? 'Resume' : 'Pause'">
          <svg v-if="query.status === 'paused'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
        </button>
        <button class="btn btn-icon btn-ghost btn-sm text-error" @click="confirmDelete" title="Delete">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import StatusChip from './StatusChip.vue'
import { authFetch } from '~/composables/useAuthFetch'

const isPolling = ref(false)

const props = defineProps<{
  query: any
  expanded: boolean
}>()

const emit = defineEmits<{
  (e: 'toggleExpand', id: string): void
  (e: 'update', id: string, updates: any): void
  (e: 'delete', id: string): void
}>()

const localInterval = ref(props.query.polling_interval)
const localTrackPrices = ref(props.query.track_prices)

const isExpanded = computed(() => props.expanded)

const toggleExpand = () => emit('toggleExpand', props.query.id)

const forcePoll = async () => {
  if (isPolling.value) return
  isPolling.value = true
  try {
    await authFetch(`/api/queries/${props.query.id}/poll`, { method: 'POST' })
  } catch (err) {
    console.error('Manual poll failed', err)
  } finally {
    isPolling.value = false
  }
}

const updateInterval = () => {
  emit('update', props.query.id, { polling_interval: localInterval.value })
}

const updateTrackPrices = () => {
  emit('update', props.query.id, { track_prices: localTrackPrices.value })
}

const togglePause = () => {
  // If pausing, status => 'paused', is_paused => true
  // If resuming, status => 'active', is_paused => false 
  // (Handling logic usually done higher up or backend, emitting toggle for now)
  const newStatus = props.query.status === 'paused' ? 'active' : 'paused'
  emit('update', props.query.id, { status: newStatus, is_paused: newStatus === 'paused' })
}

const confirmDelete = () => {
  emit('delete', props.query.id)
}

const summaryText = computed(() => {
  if (!props.query.parsed_params) return 'No filters'
  // Mock logic since we don't have the translator yet
  let text = props.query.parsed_params.q || ''
  if (props.query.parsed_params.filter?.includes('FIXED_PRICE')) text += ', BIN only'
  return text || 'All items'
})

// Reactive clock tick for relative time display
const now = ref(Date.now())
let tickTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  tickTimer = setInterval(() => { now.value = Date.now() }, 30_000)
})
onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer)
})

const timeAgo = computed(() => {
  const polledAt = props.query.last_polled_at || props.query.lastPolledAt
  if (!polledAt) return 'Never'

  const diffMs = now.value - new Date(polledAt).getTime()
  if (diffMs < 0) return 'Just now'

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  return `${days}d ago`
})
</script>

<style scoped>
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.query-row {
  cursor: pointer;
  transition: background var(--transition-fast);
}

.query-row:hover {
  background: var(--color-bg-hover);
}

.row-expanded {
  background: var(--color-bg-surface);
}

.row-paused {
  opacity: 0.6;
}

.query-label-col {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: var(--weight-medium);
}

.query-label {
  max-width: 15rem;
}

.query-summary {
  max-width: 15rem;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.inline-select {
  height: 2rem;
  padding: 0.125rem 2rem 0.125rem 0.5rem;
  width: auto;
}

.actions-cell {
  text-align: right;
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-1);
}
</style>
