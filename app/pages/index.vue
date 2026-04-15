<template>
  <div class="dashboard-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Manage and monitor your tracked eBay searches.</p>
      </div>
      <button class="btn btn-primary" @click="openAddModal">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Add Tracked URL
      </button>
    </div>

    <div v-if="loading" class="query-grid">
      <div v-for="i in 6" :key="i" class="skeleton card-skeleton"></div>
    </div>

    <div v-else-if="queries.length === 0" class="empty-dashboard">
      <div class="empty-visual">
         <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      </div>
      <h2 class="empty-title">No tracking queries yet</h2>
      <p class="empty-text">Start monitoring eBay by adding a search URL. We'll notify you when new items appear or prices drop.</p>
      <button class="btn btn-primary btn-lg" @click="openAddModal">Get Started</button>
    </div>

    <div v-else class="query-grid">
      <QueryCard
        v-for="query in queries"
        :key="query.id"
        :query="query"
        @update="updateQuery"
        @delete="confirmDelete"
        @edit="openEditModal"
      />
    </div>

    <AddUrlModal ref="addModal" @submit="addQuery" />
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
import { onMounted, onUnmounted, ref } from 'vue'
import QueryCard from '~/components/dashboard/QueryCard.vue'
import AddUrlModal from '~/components/dashboard/AddUrlModal.vue'
import EditQueryModal from '~/components/dashboard/EditQueryModal.vue'
import ConfirmDialog from '~/components/shared/ConfirmDialog.vue'
import { useQueries } from '~/composables/useQueries'
import type { Query } from '~/composables/useQueries'

// Set layout context
definePageMeta({
  layout: 'default'
})

const addModal = ref<InstanceType<typeof AddUrlModal> | null>(null)
const editModal = ref<InstanceType<typeof EditQueryModal> | null>(null)
const deleteDialog = ref<InstanceType<typeof ConfirmDialog> | null>(null)
const pendingDeleteId = ref<string | null>(null)
const pendingEditQuery = ref<Query | null>(null)

const { queries, loading, fetchQueries, addQuery, updateQuery, deleteQuery } = useQueries()

let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  fetchQueries()
  pollTimer = setInterval(() => fetchQueries(true), 30_000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

const openAddModal = () => {
  addModal.value?.open()
}

const confirmDelete = (id: string) => {
  pendingDeleteId.value = id
  deleteDialog.value?.open()
}

const executeDelete = async () => {
  if (pendingDeleteId.value) {
    await deleteQuery(pendingDeleteId.value)
    pendingDeleteId.value = null
  }
}

const openEditModal = (query: Query) => {
  pendingEditQuery.value = query
  editModal.value?.open(query)
}

const handleEditSubmit = async (data: { label: string; raw_url: string }) => {
  if (!pendingEditQuery.value) return
  await updateQuery(pendingEditQuery.value.id, { label: data.label || null, raw_url: data.raw_url })
  pendingEditQuery.value = null
}
</script>

<style scoped>
.dashboard-page {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: var(--space-8);
  gap: var(--space-4);
  flex-wrap: wrap;
}

.page-title {
  margin-bottom: var(--space-1);
}

.page-subtitle {
  color: var(--color-text-secondary);
  font-size: var(--text-md);
  margin: 0;
}

.query-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-6);
}

.card-skeleton {
  height: 280px;
  border-radius: var(--radius-lg);
}

.empty-dashboard {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-16) var(--space-6);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-subtle);
  max-width: 40rem;
  margin: var(--space-12) auto;
}

.empty-visual {
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-6);
  opacity: 0.5;
}

.empty-title {
  margin-bottom: var(--space-3);
}

.empty-text {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-8);
  max-width: 25rem;
}

@media (max-width: 640px) {
  .query-grid {
    grid-template-columns: 1fr;
  }
}
</style>
