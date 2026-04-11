<template>
  <NuxtLink :to="`/queries/${query.id}`" class="query-card" :class="{ 'card-paused': query.status === 'paused' }">
    <div class="card-top">
      <div class="label-section">
        <h3 class="card-label truncate" :title="query.label">{{ query.label || 'Unnamed Query' }}</h3>
        <StatusChip :status="query.status" size="sm" />
      </div>
      
      <div class="card-actions">
        <button class="action-btn" @click.prevent.stop="forcePoll" title="Force Poll Now" :disabled="isPolling">
          <svg :class="{'spin': isPolling}" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
            <path d="M21 3v5h-5"></path>
          </svg>
        </button>
        <button class="action-btn" @click.prevent.stop="togglePause" :title="query.status === 'paused' ? 'Resume' : 'Pause'">
          <svg v-if="query.status === 'paused'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
        </button>
        <button class="action-btn btn-danger" @click.prevent.stop="confirmDelete" title="Delete">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    </div>

    <div class="card-summary">
      <p class="summary-text">{{ summaryText }}</p>
    </div>

    <div class="metrics-grid">
      <div class="metric-box">
        <span class="metric-value">{{ query.new_items_count ?? 0 }}</span>
        <span class="metric-label">New (24h)</span>
      </div>
      <div class="metric-box">
        <span class="metric-value">{{ query.price_drops_count ?? 0 }}</span>
        <span class="metric-label">Drops (24h)</span>
      </div>
    </div>

    <div class="card-footer">
      <div class="footer-item">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span>{{ timeAgo }}</span>
      </div>
      <div class="footer-item">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        <span>{{ query.polling_interval }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import StatusChip from './StatusChip.vue'
import { authFetch } from '~/composables/useAuthFetch'

const props = defineProps<{
  query: any
}>()

const emit = defineEmits<{
  (e: 'update', id: string, updates: any): void
  (e: 'delete', id: string): void
}>()

const isPolling = ref(false)
const now = ref(Date.now())
let tickTimer: any = null

onMounted(() => {
  tickTimer = setInterval(() => { now.value = Date.now() }, 30_000)
})

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer)
})

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

const togglePause = () => {
  const newStatus = props.query.status === 'paused' ? 'active' : 'paused'
  emit('update', props.query.id, { status: newStatus, is_paused: newStatus === 'paused' })
}

const confirmDelete = () => {
  emit('delete', props.query.id)
}

const summaryText = computed(() => {
  if (!props.query.parsed_params) return 'No filters active'
  let text = props.query.parsed_params.q || 'All items'
  if (props.query.parsed_params.filter?.includes('FIXED_PRICE')) text += ' (BIN)'
  return text
})

const timeAgo = computed(() => {
  const polledAt = props.query.last_polled_at || props.query.lastPolledAt
  if (!polledAt) return 'Never polled'

  const diffMs = now.value - new Date(polledAt).getTime()
  if (diffMs < 0) return 'Just now'

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
})
</script>

<style scoped>
.query-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
  text-decoration: none;
}

.query-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md), var(--shadow-glow);
  text-decoration: none;
}

.card-paused {
  opacity: 0.7;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.label-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.card-label {
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.card-actions {
  display: flex;
  gap: var(--space-1);
}

.action-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.action-btn:hover:not(:disabled) {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.action-btn.btn-danger:hover {
  color: var(--color-error-text);
  background: var(--color-error-subtle);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card-summary {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-tight);
}

.summary-text {
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin-top: auto;
}

.metric-box {
  background: var(--color-bg-surface);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  border: 1px solid var(--color-border-subtle);
}

.metric-value {
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  color: var(--color-accent);
  font-family: var(--font-mono);
}

.metric-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.footer-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
