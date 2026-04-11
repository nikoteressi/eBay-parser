<template>
  <div class="dashboard-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Manage and monitor your tracked eBay searches.</p>
      </div>
    </div>

    <QueryTable 
      :queries="queries" 
      :loading="loading"
      @add="openAddModal"
      @update="updateQuery"
      @delete="deleteQuery"
    />

    <AddUrlModal ref="addModal" @submit="handleAddQuery" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import QueryTable from '~/components/dashboard/QueryTable.vue'
import AddUrlModal from '~/components/dashboard/AddUrlModal.vue'

// Set layout context
definePageMeta({
  layout: 'default'
})

const loading = ref(true)
const queries = ref<any[]>([])
const addModal = ref<InstanceType<typeof AddUrlModal> | null>(null)

const fetchQueries = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/queries')
    queries.value = data as any[]
  } catch (error) {
    console.error('Failed to fetch queries:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchQueries()
})

const openAddModal = () => {
  addModal.value?.open()
}

const handleAddQuery = async (formData: any) => {
  try {
    const newQuery = await $fetch('/api/queries', {
      method: 'POST',
      body: formData
    })
    queries.value.unshift({
      ...newQuery as any,
      parsed_params: JSON.parse((newQuery as any).parsedParams)
    })
    await fetchQueries() // refresh fully just in case
  } catch (error) {
    console.error('Failed to add query', error)
  }
}

const updateQuery = async (id: string, updates: any) => {
  try {
    await $fetch(`/api/queries/${id}`, {
      method: 'PATCH',
      body: updates
    })
    
    // Update local state
    const idx = queries.value.findIndex(q => q.id === id)
    if (idx !== -1) {
      if (updates.is_paused !== undefined) {
        updates.status = updates.is_paused ? 'paused' : 'active'
      }
      queries.value[idx] = { ...queries.value[idx], ...updates }
    }
  } catch (error) {
    console.error('Failed to update query', error)
  }
}

const deleteQuery = async (id: string) => {
  try {
    await $fetch(`/api/queries/${id}`, { method: 'DELETE' })
    queries.value = queries.value.filter(q => q.id !== id)
  } catch(error) {
    console.error('Failed to delete query', error)
  }
}
</script>

<style scoped>
.page-header {
  margin-bottom: var(--space-6);
}

.page-title {
  margin-bottom: var(--space-1);
}

.page-subtitle {
  color: var(--color-text-secondary);
  font-size: var(--text-md);
}
</style>
