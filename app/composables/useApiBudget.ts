import { ref } from 'vue'
import { authFetch } from './useAuthFetch'

export const useApiBudget = () => {
  const callsMade = ref(0)
  const dailyLimit = ref(5000)
  const loading = ref(false)

  const fetchBudget = async (background = false) => {
    if (!background) loading.value = true
    try {
      const data = await authFetch<{ callsMade: number, dailyLimit: number, status: string }>('/api/usage')
      callsMade.value = data.callsMade
      dailyLimit.value = data.dailyLimit
    } catch (error) {
      console.error('Failed to fetch API budget:', error)
    } finally {
      if (!background) loading.value = false
    }
  }

  return { callsMade, dailyLimit, loading, fetchBudget }
}
