import { ref } from 'vue'
import { authFetch } from './useAuthFetch'

export interface ParsedSummary {
  keywords: string
  minPrice?: number
  maxPrice?: number
  buyItNowOnly: boolean
  sortLabel: string
  detectedMarketplace?: string
  locationLabel?: string
}

interface ParseResponse {
  valid: boolean
  error?: string
  summary?: ParsedSummary
}

/**
 * Debounced eBay-URL validator used by Add/Edit modals.
 *
 * Calls POST /api/queries/parse-url after `debounceMs` of inactivity
 * and exposes the validation state + parsed summary.
 */
export function useUrlValidator(debounceMs = 500) {
  const isValidating = ref(false)
  const validationError = ref<string | null>(null)
  const parsedSummary = ref<ParsedSummary | null>(null)

  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  const reset = () => {
    clearTimeout(debounceTimer)
    isValidating.value = false
    validationError.value = null
    parsedSummary.value = null
  }

  const validate = (rawUrl: string) => {
    clearTimeout(debounceTimer)
    validationError.value = null
    parsedSummary.value = null

    if (!rawUrl) {
      isValidating.value = false
      return
    }

    isValidating.value = true
    debounceTimer = setTimeout(async () => {
      if (!rawUrl.includes('ebay')) {
        validationError.value = 'Invalid URL. Must be an eBay URL.'
        isValidating.value = false
        return
      }

      try {
        const data = await authFetch<ParseResponse>('/api/queries/parse-url', {
          method: 'POST',
          body: { raw_url: rawUrl },
        })
        if (!data.valid) {
          validationError.value = data.error ?? 'Failed to parse URL'
        } else {
          parsedSummary.value = data.summary ?? null
        }
      } catch {
        validationError.value = 'Failed to communicate with parsing API'
      } finally {
        isValidating.value = false
      }
    }, debounceMs)
  }

  return { isValidating, validationError, parsedSummary, validate, reset }
}
