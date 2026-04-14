import { ref } from 'vue'
import { authFetch } from './useAuthFetch'

export interface Query {
  id: string
  label: string | null
  raw_url: string
  parsed_params: Record<string, unknown>
  polling_interval: '5m' | '15m' | '30m' | '1h' | '6h'
  track_prices: boolean
  notify_channel: 'email' | 'telegram' | 'both'
  is_paused: boolean
  status: 'active' | 'paused' | 'error'
  last_error: string | null
  last_polled_at: string | null
  new_items_count: number
  price_drops_count: number
}

interface AddQueryPayload {
  raw_url: string
  label?: string
  polling_interval?: string
  track_prices?: boolean
}

interface UpdateQueryPayload {
  is_paused?: boolean
  polling_interval?: string
  track_prices?: boolean
  status?: string
}

export const useQueries = () => {
  const loading = ref(false)
  const queries = ref<Query[]>([])

  const fetchQueries = async (background = false) => {
    if (!background) loading.value = true
    try {
      queries.value = await authFetch<Query[]>('/api/queries')
    } catch (error) {
      console.error('Failed to fetch queries:', error)
    } finally {
      if (!background) loading.value = false
    }
  }

  const addQuery = async (formData: AddQueryPayload) => {
    try {
      await authFetch('/api/queries', { method: 'POST', body: formData })
      await fetchQueries()
    } catch (error) {
      console.error('Failed to add query:', error)
    }
  }

  const updateQuery = async (id: string, updates: UpdateQueryPayload) => {
    try {
      await authFetch(`/api/queries/${id}`, { method: 'PATCH', body: updates })
      const idx = queries.value.findIndex(q => q.id === id)
      if (idx !== -1) {
        if (updates.is_paused !== undefined) {
          updates.status = updates.is_paused ? 'paused' : 'active'
        }
        queries.value[idx] = { ...queries.value[idx], ...updates } as Query
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
