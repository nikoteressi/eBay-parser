<template>
  <div class="item-card">
    <div class="item-image-wrapper">
      <img v-if="item.image_url" :src="item.image_url" :alt="item.title" class="item-image">
      <div v-else class="item-image-placeholder">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
      </div>
      <div v-if="isPriceDrop" class="price-drop-badge">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
        <span>{{ priceDiffPercent }}%</span>
      </div>

      <div v-if="activityBadge" class="activity-alert-badge" :class="activityBadge.type">
        {{ activityBadge.icon }} {{ activityBadge.label }} <small>{{ activityBadge.timeAgo }}</small>
      </div>
    </div>

    <div class="item-details">
      <h4 class="item-title" :title="item.title">{{ item.title }}</h4>
      
      <div class="price-section">
        <div class="price-breakdown">
          <div class="price-row">
            <span class="price-row-label">Item Price</span>
            <span class="price-row-value">{{ formatCurrency(item.current_price) }}</span>
          </div>
          <div class="price-row">
            <span class="price-row-label">Shipping</span>
            <span class="price-row-value" :class="{ 'free-shipping-text': item.current_shipping === 0 }">
              {{ item.current_shipping === 0 ? 'FREE' : `+ ${formatCurrency(item.current_shipping)}` }}
            </span>
          </div>
          <div class="price-total-row">
            <div class="total-info">
              <span class="total-label">Total Cost</span>
              <div v-if="isPriceDrop" class="original-price-tag">
                <span class="original-amount">{{ formatCurrency(item.first_seen_total_cost) }}</span>
              </div>
            </div>
            <span class="total-amount">{{ formatCurrency(item.current_total_cost) }}</span>
          </div>
        </div>
      </div>

      <div class="item-meta">
        <span class="buying-option">{{ formatBuyingOption(item.buying_option) }}</span>
        <span v-if="item.accepts_offers" class="offers-badge">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"></path></svg>
          Offers Accepted
        </span>
      </div>

      <div class="item-actions">
        <a :href="item.item_url" target="_blank" class="btn btn-secondary btn-sm full-width">
          View on eBay
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  item: any,
  lastViewedAt?: number,
  nowMs?: number
}>()

const isPriceDrop = computed(() => {
  return props.item.current_total_cost < props.item.first_seen_total_cost
})

const priceDiffPercent = computed(() => {
  if (!isPriceDrop.value) return 0
  const diff = props.item.first_seen_total_cost - props.item.current_total_cost
  return Math.round((diff / props.item.first_seen_total_cost) * 100)
})

const activityBadge = computed(() => {
  const now = props.nowMs || Date.now()
  const twoHoursMs = 2 * 60 * 60 * 1000
  const lastViewed = props.lastViewedAt || 0
  
  const firstSeen = new Date(props.item.first_seen_at).getTime()
  const lastSeen = new Date(props.item.last_seen_at).getTime()
  
  // 1. Just Found (priority)
  // Must be newer than lastViewed and within 2h
  if (firstSeen > lastViewed && (now - firstSeen < twoHoursMs)) {
    return {
      type: 'new',
      icon: '🔥',
      label: 'Just Found',
      timeAgo: formatTimeAgo(firstSeen)
    }
  }
  
  // 2. Just Dropped
  // Must be newer than lastViewed (meaning drop happened since last visit) and within 2h
  if (isPriceDrop.value && lastSeen > lastViewed && (now - lastSeen < twoHoursMs)) {
    return {
      type: 'drop',
      icon: '📉',
      label: 'Just Dropped',
      timeAgo: formatTimeAgo(lastSeen)
    }
  }
  
  return null
})

const formatTimeAgo = (timestamp: number) => {
  const now = props.nowMs || Date.now()
  const seconds = Math.floor((now - timestamp) / 1000)
  if (seconds < 0) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: props.item.currency || 'USD'
  }).format(val)
}

const formatBuyingOption = (option: string) => {
  if (option === 'FIXED_PRICE') return 'Buy It Now'
  if (option === 'AUCTION') return 'Auction'
  if (option === 'AUCTION_BIN') return 'Auction / BIN'
  return option
}
</script>

<style scoped>
.item-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all var(--transition-fast);
}

.item-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.item-image-wrapper {
  position: relative;
  aspect-ratio: 1 / 1;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.item-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform var(--transition-slow);
}

.item-card:hover .item-image {
  transform: scale(1.05);
}

.item-image-placeholder {
  color: var(--color-text-tertiary);
}

.price-drop-badge {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  background: var(--color-success);
  color: white;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  box-shadow: var(--shadow-sm);
}

.activity-alert-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  color: white;
  padding: var(--space-2);
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 2;
  animation: slideUp 0.3s ease-out;
}

.activity-alert-badge.new {
  background: linear-gradient(to right, rgba(255, 87, 34, 0.9), rgba(255, 152, 0, 0.9));
  color: white;
}

.activity-alert-badge.drop {
  background: linear-gradient(to right, rgba(76, 175, 80, 0.9), rgba(139, 195, 74, 0.9));
  color: white;
}

.activity-alert-badge small {
  font-weight: var(--weight-normal);
  opacity: 0.9;
  margin-left: auto;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.item-details {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  flex: 1;
}

.item-title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-primary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.5rem;
}

.price-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--color-bg-primary);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-subtle);
}

.price-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.price-row-value {
  color: var(--color-text-secondary);
  font-weight: var(--weight-medium);
}

.free-shipping-text {
  color: var(--color-success-text);
  font-weight: var(--weight-bold);
}

.price-total-row {
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px dashed var(--color-border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.total-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.total-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.total-amount {
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  color: var(--color-accent);
  line-height: 1;
}

.original-price-tag {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
}

.item-meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.buying-option {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-accent);
  text-transform: uppercase;
}

.offers-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-success-text);
  background: var(--color-success-subtle);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  width: fit-content;
}

.shipping-info {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.free-shipping {
  color: var(--color-success-text);
  font-weight: var(--weight-medium);
}

.item-actions {
  margin-top: auto;
  padding-top: var(--space-1);
}

.full-width {
  width: 100%;
}
</style>
