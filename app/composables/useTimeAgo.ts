import { computed, onMounted, onUnmounted, ref, type ComputedRef, type MaybeRef, unref } from 'vue'
import { formatTimeAgo } from '~/utils/activity-badge'

/**
 * Reactive "time ago" formatter for an ISO-8601 timestamp.
 *
 * Returns a computed string that refreshes every `intervalMs` (default 30s)
 * while the component is mounted. Pass a fallback for null/undefined inputs.
 */
export function useTimeAgo(
  timestamp: MaybeRef<string | null | undefined>,
  options: { fallback?: string; intervalMs?: number } = {},
): ComputedRef<string> {
  const { fallback = 'Never', intervalMs = 30_000 } = options
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    timer = setInterval(() => { now.value = Date.now() }, intervalMs)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return computed(() => {
    const iso = unref(timestamp)
    if (!iso) return fallback
    return formatTimeAgo(new Date(iso).getTime(), now.value)
  })
}
