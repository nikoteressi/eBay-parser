<template>
  <div class="query-details-header card">
    <div class="header-main">
      <div class="query-info">
        <div class="label-row">
          <h1 class="query-title">{{ query.label || 'Unnamed Query' }}</h1>
          <StatusChip :status="query.status" />
        </div>
        <p class="query-url truncate" :title="query.raw_url">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
          {{ query.raw_url }}
        </p>
      </div>

      <div class="header-actions">
        <button class="btn btn-secondary" @click="$emit('forcePoll')" :disabled="isPolling">
          <svg :class="{'spin': isPolling}" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>
          Force Poll
        </button>
        <button class="btn btn-secondary" @click="$emit('togglePause')">
          <svg v-if="query.status === 'paused'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
          {{ query.status === 'paused' ? 'Resume' : 'Pause' }}
        </button>
        <button class="btn btn-secondary" @click="$emit('edit')">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          Edit
        </button>
        <button class="btn btn-danger" @click="$emit('delete')">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          Delete
        </button>
      </div>
    </div>

    <div class="header-stats">
      <div class="stat-item">
        <span class="stat-label">Last Polled</span>
        <span class="stat-value">{{ timeAgo }}</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-label">Interval</span>
        <span class="stat-value">{{ query.polling_interval }}</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-label">Price Tracking</span>
        <span class="stat-value" :class="query.track_prices ? 'text-success' : 'text-tertiary'">
          {{ query.track_prices ? 'Enabled' : 'Disabled' }}
        </span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-label">Notify</span>
        <span class="stat-value capitalize">{{ query.notify_channel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import StatusChip from './StatusChip.vue'
import { useTimeAgo } from '~/composables/useTimeAgo'
import type { Query } from '~/composables/useQueries'

const props = defineProps<{
  query: Query
  isPolling: boolean
}>()

defineEmits(['forcePoll', 'togglePause', 'edit', 'delete'])

const timeAgo = useTimeAgo(toRef(() => props.query.last_polled_at))
</script>

<style scoped>
.query-details-header {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  background: var(--color-bg-secondary);
  animation: fadeIn 0.4s ease-out;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-6);
}

.query-info {
  flex: 1;
  min-width: 0;
}

.label-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.query-title {
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  margin: 0;
}

.query-url {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  max-width: 30rem;
}

.header-actions {
  display: flex;
  gap: var(--space-2);
}

.header-stats {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding-top: var(--space-6);
  border-top: 1px solid var(--color-border-subtle);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.stat-value {
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
}

.stat-divider {
  width: 1px;
  height: 1.5rem;
  background: var(--color-border-subtle);
}

.text-success { color: var(--color-success-text); }
.text-tertiary { color: var(--color-text-tertiary); }
.capitalize { text-transform: capitalize; }

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .header-main {
    flex-direction: column;
  }
  .header-stats {
    flex-wrap: wrap;
    gap: var(--space-4);
  }
  .stat-divider {
    display: none;
  }
}
</style>
