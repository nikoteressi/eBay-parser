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
import { onMounted, ref } from 'vue'
import QueryTable from '~/components/dashboard/QueryTable.vue'
import AddUrlModal from '~/components/dashboard/AddUrlModal.vue'
import { useQueries } from '~/composables/useQueries'

// Set layout context
definePageMeta({
  layout: 'default'
})

const addModal = ref<InstanceType<typeof AddUrlModal> | null>(null)
const { queries, loading, fetchQueries, addQuery, updateQuery, deleteQuery } = useQueries()

onMounted(() => {
  fetchQueries()
})

const openAddModal = () => {
  addModal.value?.open()
}

const handleAddQuery = async (formData: any) => {
  await addQuery(formData)
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
