export interface ActivityBadge {
  type: 'new' | 'drop'
  icon: string
  label: string
  timeAgo: string
}

export interface ActivityBadgeInput {
  firstSeenAt: string
  lastPriceDropAt?: string | null
  lastViewedAt?: number
  nowMs?: number
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000

export function formatTimeAgo(timestamp: number, nowMs: number = Date.now()): string {
  const seconds = Math.floor((nowMs - timestamp) / 1000)
  if (seconds < 0) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function computeActivityBadge(input: ActivityBadgeInput): ActivityBadge | null {
  const now = input.nowMs ?? Date.now()
  const lastViewed = input.lastViewedAt ?? 0
  const firstSeen = new Date(input.firstSeenAt).getTime()

  if (firstSeen > lastViewed && now - firstSeen < TWO_HOURS_MS) {
    return {
      type: 'new',
      icon: '🔥',
      label: 'Just Found',
      timeAgo: formatTimeAgo(firstSeen, now),
    }
  }

  if (input.lastPriceDropAt) {
    const droppedAt = new Date(input.lastPriceDropAt).getTime()
    if (now - droppedAt < ONE_DAY_MS) {
      return {
        type: 'drop',
        icon: '📉',
        label: 'Just Dropped',
        timeAgo: formatTimeAgo(droppedAt, now),
      }
    }
  }

  return null
}