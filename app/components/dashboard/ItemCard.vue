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
    </div>

    <div class="item-details">
      <h4 class="item-title" :title="item.title">{{ item.title }}</h4>
      
      <div class="price-section">
        <div class="current-price">
          <span class="price-amount">{{ formatCurrency(item.current_total_cost) }}</span>
          <span class="price-label">Total</span>
        </div>
        
        <div v-if="isPriceDrop" class="original-price">
          <span class="original-amount">{{ formatCurrency(item.first_seen_total_cost) }}</span>
        </div>
      </div>

      <div class="item-meta">
        <span class="buying-option">{{ formatBuyingOption(item.buying_option) }}</span>
        <span class="shipping-info" :class="{ 'free-shipping': item.current_shipping === 0 }">
          {{ item.current_shipping === 0 ? 'Free Shipping' : `+ ${formatCurrency(item.current_shipping)} shipping` }}
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
  item: any
}>()

const isPriceDrop = computed(() => {
  return props.item.current_total_cost < props.item.first_seen_total_cost
})

const priceDiffPercent = computed(() => {
  if (!isPriceDrop.value) return 0
  const diff = props.item.first_seen_total_cost - props.item.current_total_cost
  return Math.round((diff / props.item.first_seen_total_cost) * 100)
})

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
  align-items: baseline;
  gap: var(--space-2);
}

.current-price {
  display: flex;
  flex-direction: column;
}

.price-amount {
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.price-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  margin-top: -2px;
}

.original-price {
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
