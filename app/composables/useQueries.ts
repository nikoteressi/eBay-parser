import { ref } from 'vue'
import { authFetch } from './useAuthFetch'

export const useQueries = () => {
  const loading = ref(false)
  const queries = ref<any[]>([])

  const fetchQueries = async (background = false) => {
    if (!background) loading.value = true
    try {
      const data = await authFetch<any[]>('/api/queries')
      queries.value = data
    } catch (error) {
      console.error('Failed to fetch queries:', error)
    } finally {
      if (!background) loading.value = false
    }
  }

  const addQuery = async (formData: any) => {
    try {
      const newQuery = await authFetch<any>('/api/queries', { method: 'POST', body: formData })
      queries.value.unshift({
        ...newQuery,
        parsed_params: JSON.parse(newQuery.parsedParams)
      })
      await fetchQueries()
      return newQuery
    } catch (error) {
      console.error('Failed to add query:', error)
    }
  }

  const updateQuery = async (id: string, updates: any) => {
    try {
      await authFetch(`/api/queries/${id}`, { method: 'PATCH', body: updates })
      const idx = queries.value.findIndex(q => q.id === id)
      if (idx !== -1) {
        if (updates.is_paused !== undefined) {
          updates.status = updates.is_paused ? 'paused' : 'active'
        }
        queries.value[idx] = { ...queries.value[idx], ...updates }
      }
    } catch (error) {
      console.error('Failed to update query:', error)
    }
  }

  const deleteQuery = async (id: string) => {
    try {
      await authFetch(`/api/queries/${id}`, { method: 'DELETE' })
      queries.value = queries.value.filter(q => q.id !== id)
    } catch (error) {
      console.error('Failed to delete query:', error)
    }
  }

  return { queries, loading, fetchQueries, addQuery, updateQuery, deleteQuery }
}
