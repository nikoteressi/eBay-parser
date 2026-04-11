<template>
  <div class="api-budget-badge" :class="statusClass">
    <span class="api-budget-label">API Budget</span>
    <div class="api-budget-value">
      <template v-if="loading">
        <span class="skeleton" style="width: 40px; height: 14px; display: inline-block;"></span>
      </template>
      <template v-else>
        {{ formattedCalls }} / {{ formattedLimit }}
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'

const callsMade = ref(0)
const dailyLimit = ref(5000)
const loading = ref(true)

// Fetch real data from API later (mocking for now to show UI)
const fetchBudget = async () => {
  try {
    const data = await $fetch('/api/usage') as { callsMade: number, dailyLimit: number, status: string }
    callsMade.value = data.callsMade
    dailyLimit.value = data.dailyLimit
  } catch (error) {
    console.error('Failed to fetch API budget:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchBudget()
  // Poll every 5 minutes to stay somewhat updated
  const interval = setInterval(fetchBudget, 5 * 60 * 1000)
  onUnmounted(() => clearInterval(interval))
})

const percentUsed = computed(() => {
  if (dailyLimit.value === 0) return 0
  return (callsMade.value / dailyLimit.value) * 100
})

const statusClass = computed(() => {
  if (percentUsed.value > 95) return 'status-danger'
  if (percentUsed.value > 80) return 'status-warning'
  return 'status-good'
})

const formattedCalls = computed(() => new Intl.NumberFormat().format(callsMade.value))
const formattedLimit = computed(() => new Intl.NumberFormat().format(dailyLimit.value))
</script>

<style scoped>
.api-budget-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  border: 1px solid transparent;
  transition: all var(--transition-fast);
}

.api-budget-label {
  color: var(--color-text-secondary);
}

.api-budget-value {
  font-family: var(--font-mono);
  color: var(--color-text-primary);
}

.status-good {
  background: var(--color-bg-surface);
  border-color: var(--color-border-subtle);
}

.status-warning {
  background: var(--color-warning-subtle);
  border-color: var(--color-warning);
  color: var(--color-warning-text);
}
.status-warning .api-budget-label, .status-warning .api-budget-value {
  color: var(--color-warning-text);
}


.status-danger {
  background: var(--color-error-subtle);
  border-color: var(--color-error);
  color: var(--color-error-text);
}

.status-danger .api-budget-label, .status-danger .api-budget-value {
  color: var(--color-error-text);
}
</style>
