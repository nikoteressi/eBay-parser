<template>
  <div class="card query-table-card">
    <div class="card-header">
      <h2 class="text-lg font-semibold">Tracked Queries <span class="text-tertiary">({{ queries.length }})</span></h2>
      <button class="btn btn-primary btn-sm" @click="$emit('add')">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Add URL
      </button>
    </div>
    
    <div v-if="loading" class="card-body">
      <div v-for="i in 3" :key="i" class="skeleton table-skeleton" style="height: 48px; margin-bottom: 8px;"></div>
    </div>
    
    <div v-else-if="queries.length === 0" class="empty-state">
      <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <div>
        <h3 class="empty-state-title">No tracking queries yet</h3>
        <p class="empty-state-description">Paste an eBay search URL to start monitoring for new listings and price drops.</p>
      </div>
      <button class="btn btn-primary" @click="$emit('add')">Add Tracked Search</button>
    </div>
    
    <div v-else class="table-container">
      <table>
        <thead>
          <tr>
            <th width="25%">Label</th>
            <th width="25%">Query Summary</th>
            <th width="15%">Interval</th>
            <th width="10%">Track Price</th>
            <th width="10%">Last Poll</th>
            <th width="10%">Status</th>
            <th width="5%"></th>
          </tr>
        </thead>
        <tbody v-for="query in queries" :key="query.id">
          <QueryRow 
            :query="query" 
            :expanded="expandedRowId === query.id"
            @toggleExpand="toggleExpand"
            @update="updateQuery"
            @delete="confirmDelete"
          />
          <QueryRowExpanded 
            v-if="expandedRowId === query.id"
            :queryId="query.id"
          />
        </tbody>
      </table>
    </div>

    <ConfirmDialog 
      ref="deleteDialog"
      title="Delete Tracked Query"
      message="Are you sure you want to stop tracking this search? All historical data and snapshots for this query will be permanently deleted."
      confirmText="Delete Query"
      confirmType="danger"
      @confirm="executeDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import QueryRow from './QueryRow.vue'
import QueryRowExpanded from './QueryRowExpanded.vue'
import ConfirmDialog from '../shared/ConfirmDialog.vue'

const props = defineProps<{
  queries: any[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'update', id: string, updates: any): void
  (e: 'delete', id: string): void
}>()

const expandedRowId = ref<string | null>(null)
const deleteDialog = ref<InstanceType<typeof ConfirmDialog> | null>(null)
const pendingDeleteId = ref<string | null>(null)

const toggleExpand = (id: string) => {
  expandedRowId.value = expandedRowId.value === id ? null : id
}

const updateQuery = (id: string, updates: any) => {
  emit('update', id, updates)
}

const confirmDelete = (id: string) => {
  pendingDeleteId.value = id
  deleteDialog.value?.open()
}

const executeDelete = () => {
  if (pendingDeleteId.value) {
    emit('delete', pendingDeleteId.value)
    if (expandedRowId.value === pendingDeleteId.value) {
      expandedRowId.value = null
    }
  }
  deleteDialog.value?.close()
}
</script>

<style scoped>
.query-table-card {
  box-shadow: var(--shadow-sm);
}

.table-skeleton {
  border-radius: var(--radius-sm);
}
</style>
