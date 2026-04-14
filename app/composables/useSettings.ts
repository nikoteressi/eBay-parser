import { ref } from 'vue'
import { authFetch } from './useAuthFetch'

export const useSettings = () => {
  const loading = ref(false)
  const settings = ref<Record<string, string>>({})

  const fetchSettings = async () => {
    loading.value = true
    try {
      settings.value = await authFetch<Record<string, string>>('/api/settings')
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      loading.value = false
    }
  }

  const saveSettings = async (updates: Record<string, string>) => {
    try {
      await authFetch('/api/settings', { method: 'PUT', body: updates })
      settings.value = { ...settings.value, ...updates }
      return true
    } catch (error) {
      console.error('Failed to save settings:', error)
      return false
    }
  }

  return { settings, loading, fetchSettings, saveSettings }
}
