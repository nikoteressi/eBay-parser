<template>
  <div class="query-id-page">
    <div class="page-nav">
      <NuxtLink to="/" class="back-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Back to Dashboard
      </NuxtLink>
    </div>

    <div v-if="loadingQuery" class="skeleton header-skeleton"></div>
    <QueryDetailsHeader 
      v-else-if="currentQuery"
      :query="currentQuery"
      :isPolling="isPolling"
      @forcePoll="handleForcePoll"
      @togglePause="handleTogglePause"
      @delete="handleDelete"
    />

    <div class="details-content">
      <div v-if="loadingItems" class="loading-overlay">
        <div class="spinner"></div>
        <p>Fetching tracked items...</p>
      </div>

      <div v-else class="items-sections">
        <!-- Price Drops -->
        <section v-if="items.priceDrops.length > 0" class="items-section">
          <div class="section-header">
            <div class="section-title">
              <svg class="text-success" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
              <h2>Price Drops</h2>
            </div>
            <span class="count-badge success">{{ items.priceDrops.length }}</span>
          </div>
          <div class="items-grid">
            <ItemCard v-for="item in items.priceDrops" :key="item.id" :item="item" />
          </div>
        </section>

        <!-- New Listings -->
        <section class="items-section">
          <div class="section-header">
            <div class="section-title">
              <svg class="text-accent" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <h2>New Listings <small>(Last 24h)</small></h2>
            </div>
            <span class="count-badge" :class="items.newItems.length > 0 ? 'accent' : ''">{{ items.newItems.length }}</span>
          </div>
          <div v-if="items.newItems.length > 0" class="items-grid">
            <ItemCard v-for="item in items.newItems" :key="item.id" :item="item" />
          </div>
          <div v-else class="empty-section">
            <p>No new items found in the last 24 hours.</p>
          </div>
        </section>

        <!-- Ended Items -->
        <section v-if="items.endedItems.length > 0" class="items-section">
          <div class="section-header">
            <div class="section-title">
              <svg class="text-tertiary" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
              <h2>Recently Ended</h2>
            </div>
            <span class="count-badge">{{ items.endedItems.length }}</span>
          </div>
          <div class="items-grid">
            <ItemCard v-for="item in items.endedItems" :key="item.id" :item="item" />
          </div>
        </section>
      </div>
    </div>

    <ConfirmDialog 
      ref="deleteDialog"
      title="Delete Tracked Query"
      message="Are you sure you want to stop tracking this search? All historical data will be removed."
      confirmText="Delete"
      confirmType="danger"
      @confirm="executeDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QueryDetailsHeader from '~/components/dashboard/QueryDetailsHeader.vue'
import ItemCard from '~/components/dashboard/ItemCard.vue'
import ConfirmDialog from '~/components/shared/ConfirmDialog.vue'
import { authFetch } from '~/composables/useAuthFetch'
import { useQueries } from '~/composables/useQueries'

const route = useRoute()
const router = useRouter()
const { queries, fetchQueries, updateQuery, deleteQuery } = useQueries()

const loadingQuery = ref(true)
const loadingItems = ref(true)
const isPolling = ref(false)
const deleteDialog = ref<InstanceType<typeof ConfirmDialog> | null>(null)

interface EbayItem {
  id: string
  ebay_item_id: string
  title: string
  item_url: string
  image_url: string
  buying_option: string
  current_total_cost: number
  first_seen_total_cost: number
  current_shipping: number
  currency: string
}

const items = ref<{
  newItems: EbayItem[]
  priceDrops: EbayItem[]
  endedItems: EbayItem[]
}>({
  newItems: [],
  priceDrops: [],
  endedItems: []
})

const currentQuery = computed(() => {
  return queries.value.find(q => q.id === route.params.id)
})

onMounted(async () => {
  if (queries.value.length === 0) {
    await fetchQueries()
  }
  loadingQuery.value = false
  
  await fetchItems()
})

const fetchItems = async () => {
  loadingItems.value = true
  try {
    const data = await authFetch<any>(`/api/queries/${route.params.id}/items`)
    items.value = data
  } catch (err) {
    console.error('Failed to fetch items:', err)
  } finally {
    loadingItems.value = false
  }
}

const handleForcePoll = async () => {
  if (isPolling.value) return
  isPolling.value = true
  try {
    await authFetch(`/api/queries/${route.params.id}/poll`, { method: 'POST' })
    // Refresh items after a short delay
    setTimeout(fetchItems, 2000)
  } catch (err) {
    console.error('Manual poll failed', err)
  } finally {
    isPolling.value = false
  }
}

const handleTogglePause = async () => {
  if (!currentQuery.value) return
  const newStatus = currentQuery.value.status === 'paused' ? 'active' : 'paused'
  await updateQuery(currentQuery.value.id, { status: newStatus, is_paused: newStatus === 'paused' })
}

const handleDelete = () => {
  deleteDialog.value?.open()
}

const executeDelete = async () => {
  if (!currentQuery.value) return
  await deleteQuery(currentQuery.value.id)
  router.push('/')
}
</script>

<style scoped>
.query-id-page {
  max-width: var(--container-max);
  margin: 0 auto;
}

.page-nav {
  margin-bottom: var(--space-4);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  transition: color var(--transition-fast);
}

.back-link:hover {
  color: var(--color-text-primary);
}

.header-skeleton {
  height: 200px;
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-8);
}

.details-content {
  margin-top: var(--space-10);
  min-height: 40vh;
  position: relative;
}

.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  color: var(--color-text-tertiary);
}

.spinner {
  width: 2.5rem;
  height: 2.5rem;
  border: 4px solid var(--color-bg-surface);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--space-4);
}

.items-sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
}

.items-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2px solid var(--color-bg-secondary);
  padding-bottom: var(--space-3);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.section-title h2 {
  font-size: var(--text-xl);
  font-weight: var(--weight-semibold);
  margin: 0;
}

.section-title h2 small {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  font-weight: var(--weight-normal);
  margin-left: var(--space-1);
}

.count-badge {
  background: var(--color-bg-surface);
  color: var(--color-text-secondary);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  font-family: var(--font-mono);
}

.count-badge.success {
  background: var(--color-success-subtle);
  color: var(--color-success-text);
}

.count-badge.accent {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-6);
}

.empty-section {
  padding: var(--space-8);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--color-text-tertiary);
  border: 1px dashed var(--color-border-subtle);
}

.text-success { color: var(--color-success-text); }
.text-accent { color: var(--color-accent); }
.text-tertiary { color: var(--color-text-tertiary); }

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .items-grid {
    grid-template-columns: 1fr;
  }
}
</style>
