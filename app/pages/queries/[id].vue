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
      @edit="handleEdit"
      @delete="handleDelete"
    />

    <div class="details-content">
      <div v-if="loadingItems" class="loading-overlay">
        <div class="spinner"></div>
        <p>Fetching tracked items...</p>
      </div>

      <div v-else class="items-sections">
        <!-- New Listings -->
        <section class="items-section">
          <div class="section-header">
            <div class="section-title">
              <span class="pulse-indicator"></span>
              <h2>New Listings <small>(Last 24h)</small></h2>
            </div>
            <span class="count-badge" :class="items?.newItems?.length ? 'accent' : ''">{{ items?.newItems?.length || 0 }}</span>
          </div>
          <div v-if="items?.newItems?.length" class="items-grid">
            <ItemCard v-for="item in items.newItems" :key="item.id" :item="item" :lastViewedAt="lastViewedAt" :nowMs="serverNowMs" />
          </div>
          <div v-else class="empty-state">
            <p>No new listings found in the last 24 hours.</p>
          </div>
        </section>

        <!-- Price Drops -->
        <section v-if="items?.priceDrops?.length" class="items-section">
          <div class="section-header">
            <div class="section-title">
              <svg class="text-success" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
              <h2>Price Drops</h2>
            </div>
            <span class="count-badge success">{{ items.priceDrops.length }}</span>
          </div>
          <div class="items-grid">
            <ItemCard v-for="item in items.priceDrops" :key="item.id" :item="item" :lastViewedAt="lastViewedAt" :nowMs="serverNowMs" />
          </div>
        </section>

        <!-- Ended / Out of view -->
        <section v-if="items?.endedItems?.length" class="items-section">
          <div class="section-header">
            <div class="section-title">
              <svg class="text-tertiary" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
              <h2>Ended or Sold</h2>
            </div>
            <span class="count-badge">{{ items.endedItems.length }}</span>
          </div>
          <div class="items-grid opacity-75">
            <ItemCard v-for="item in items.endedItems" :key="item.id" :item="item" :lastViewedAt="lastViewedAt" :nowMs="serverNowMs" />
          </div>
        </section>
      </div>
    </div>

    <EditQueryModal ref="editModal" @submit="handleEditSubmit" />

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
import EditQueryModal from '~/components/dashboard/EditQueryModal.vue'
import ConfirmDialog from '~/components/shared/ConfirmDialog.vue'
import { authFetch } from '~/composables/useAuthFetch'
import { useQueries } from '~/composables/useQueries'

const route = useRoute()
const router = useRouter()
const { queries, fetchQueries, updateQuery, deleteQuery } = useQueries()

const loadingQuery = ref(true)
const loadingItems = ref(true)
const isPolling = ref(false)
const lastViewedAt = ref<number>(0)
const serverNowMs = ref<number>(Date.now())
const deleteDialog = ref<InstanceType<typeof ConfirmDialog> | null>(null)
const editModal = ref<InstanceType<typeof EditQueryModal> | null>(null)

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
  first_seen_at: string
  last_seen_at: string
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
  // 1. Get previous view time from localStorage
  const stored = localStorage.getItem(`query_view_${route.params.id}`)
  lastViewedAt.value = stored ? parseInt(stored) : 0

  if (queries.value.length === 0) {
    await fetchQueries()
  }
  loadingQuery.value = false
  
  await fetchItems()

  // 2. We no longer write localStorage here since fetchItems resolves it with precise serverTime
})

const fetchItems = async () => {
  loadingItems.value = true
  try {
    const data = await authFetch<{ serverTime: string; newItems: EbayItem[]; priceDrops: EbayItem[]; endedItems: EbayItem[] }>(`/api/queries/${route.params.id}/items`)
    if (data.serverTime) {
      serverNowMs.value = new Date(data.serverTime).getTime()
      localStorage.setItem(`query_view_${route.params.id}`, serverNowMs.value.toString())
    }
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

const handleEdit = () => {
  if (!currentQuery.value) return
  editModal.value?.open(currentQuery.value)
}

const handleEditSubmit = async (data: { label: string; raw_url: string }) => {
  if (!currentQuery.value) return
  await updateQuery(currentQuery.value.id, { label: data.label || null, raw_url: data.raw_url })
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
