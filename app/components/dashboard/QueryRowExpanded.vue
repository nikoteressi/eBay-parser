<template>
  <tr class="expanded-row">
    <td colspan="7">
      <div class="expanded-content">
        <div v-if="loading" class="loading-state">
          <span class="skeleton" style="width: 100px; height: 20px;"></span>
          <span class="skeleton" style="width: 200px; height: 16px;"></span>
        </div>
        
        <div v-else-if="error" class="error-state">
          <p class="text-error">{{ error }}</p>
        </div>
        
        <div v-else class="results-grid">
          <div class="results-col">
            <h4 class="col-title">Recent New Items <span class="badge">{{ newItems.length }}</span></h4>
            <div v-if="newItems.length === 0" class="empty-list">No new items in recent polls.</div>
            <ul v-else class="item-list">
              <li v-for="item in newItems" :key="item.id" class="item-card">
                <div class="item-thumb" :style="{ backgroundImage: `url(${item.image_url || '/placeholder.png'})` }"></div>
                <div class="item-details">
                  <a :href="item.item_url" target="_blank" class="item-title truncate" :title="item.title">{{ item.title }}</a>
                  <div class="item-meta">
                    <span class="item-price">{{ formatPrice(item.current_total_cost, item.currency) }}</span>
                    <span class="item-type">{{ item.buying_option === 'FIXED_PRICE' ? 'BIN' : 'Auction' }}</span>
                  </div>
                </div>
              </li>
            </ul>
          </div>
          
          <div class="results-col">
            <h4 class="col-title">Recent Price Drops <span class="badge badge-success">{{ priceDrops.length }}</span></h4>
            <div v-if="priceDrops.length === 0" class="empty-list">No recent price drops.</div>
            <ul v-else class="item-list">
              <li v-for="item in priceDrops" :key="item.id" class="item-card drop-card">
                <div class="item-thumb" :style="{ backgroundImage: `url(${item.image_url || '/placeholder.png'})` }"></div>
                <div class="item-details">
                  <a :href="item.item_url" target="_blank" class="item-title truncate" :title="item.title">{{ item.title }}</a>
                  <div class="item-price-change">
                    <span class="old-price">{{ formatPrice(item.first_seen_total_cost, item.currency) }}</span>
                    <span class="arrow">→</span>
                    <span class="new-price">{{ formatPrice(item.current_total_cost, item.currency) }}</span>
                  </div>
                </div>
              </li>
            </ul>
          </div>
          
          <div class="results-col">
            <h4 class="col-title">Ended / Sold <span class="badge badge-neutral">{{ endedItems.length }}</span></h4>
            <div v-if="endedItems.length === 0" class="empty-list">No recent ended items.</div>
            <ul v-else class="item-list">
              <li v-for="item in endedItems" :key="item.id" class="item-card ended-card">
                <div class="item-details">
                  <span class="item-title truncate text-secondary" :title="item.title">{{ item.title }}</span>
                  <div class="item-meta">
                    <span class="text-tertiary text-xs">Ended: {{ formatDate(item.ended_at) }}</span>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  queryId: string
}>()

const loading = ref(true)
const error = ref<string | null>(null)

// Mock Data
const newItems = ref<any[]>([])
const priceDrops = ref<any[]>([])
const endedItems = ref<any[]>([])

onMounted(async () => {
  try {
    const data = await $fetch(`/api/queries/${props.queryId}/items`) as any
    // data.newItems, data.priceDrops, data.endedItems
    newItems.value = data.newItems || []
    priceDrops.value = data.priceDrops || []
    endedItems.value = data.endedItems || []
  } catch (err) {
    error.value = 'Failed to load data'
  } finally {
    loading.value = false
  }
})

const formatPrice = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

const formatDate = (isoString: string) => {
  return new Date(isoString).toLocaleDateString()
}
</script>

<style scoped>
.expanded-row td {
  padding: 0;
  border-bottom: 2px solid var(--color-border-subtle);
  background: var(--color-bg-elevated);
}

.expanded-content {
  padding: var(--space-6);
  border-left: 4px solid var(--color-accent);
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
}

.col-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  margin-bottom: var(--space-4);
  color: var(--color-text-secondary);
}

.badge {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-full);
  font-size: 0.65rem;
  font-weight: var(--weight-bold);
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}

.badge-success {
  background: var(--color-success-subtle);
  color: var(--color-success-text);
}

.badge-neutral {
  background: var(--color-bg-hover);
  color: var(--color-text-secondary);
}

.empty-list {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  font-style: italic;
  padding: var(--space-3) 0;
}

.item-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.item-card {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
}

.item-thumb {
  width: 3rem;
  height: 3rem;
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-hover);
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.item-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.item-title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  display: block;
}

.item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--text-xs);
}

.item-price {
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.item-type {
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  font-size: 0.65rem;
}

.item-price-change {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  margin-top: var(--space-1);
}

.old-price {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}

.arrow {
  color: var(--color-text-secondary);
}

.new-price {
  font-weight: var(--weight-bold);
  color: var(--color-success-text);
}

.drop-card {
  border-color: var(--color-success-subtle);
}

.ended-card {
  opacity: 0.7;
  padding: var(--space-2) var(--space-3);
}
</style>
