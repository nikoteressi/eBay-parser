<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="close">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="add-url-title">
        <div class="modal-header">
          <h2 id="add-url-title" class="text-xl font-semibold">Add Tracked Search</h2>
          <button class="btn btn-icon btn-ghost" @click="close" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <form @submit.prevent="submitForm">
          <div class="modal-body form-layout">
            <div class="form-group">
              <label for="label" class="label">Label (optional)</label>
              <input 
                id="label" 
                type="text" 
                class="input" 
                v-model="form.label" 
                placeholder="e.g. Vintage Lego Search"
              />
            </div>
            
            <div class="form-group">
              <label for="url" class="label">Paste eBay search URL <span class="text-error">*</span></label>
              <textarea 
                id="url" 
                class="input" 
                v-model="form.raw_url" 
                placeholder="https://www.ebay.com/sch/i.html?_nkw=..."
                required
                @input="handleUrlInput"
              ></textarea>
            </div>
            
            <div class="parsed-preview" v-if="form.raw_url">
              <h4 class="preview-title">Parsed Filters</h4>
              <div v-if="isValidating" class="text-sm text-tertiary">Analyzing URL...</div>
              <div v-else-if="validationError" class="text-sm text-error">{{ validationError }}</div>
              <ul v-else-if="parsedSummary" class="preview-list">
                <li><span class="preview-label">Keywords:</span> <span class="preview-value">"{{ parsedSummary.keywords }}"</span></li>
                <li v-if="parsedSummary.minPrice != null || parsedSummary.maxPrice != null">
                  <span class="preview-label">Price:</span>
                  <span class="preview-value">${{ parsedSummary.minPrice ?? '—' }} – ${{ parsedSummary.maxPrice ?? '—' }}</span>
                </li>
                <li><span class="preview-label">Buy It Now:</span> <span class="preview-value">{{ parsedSummary.buyItNowOnly ? 'Yes' : 'No' }}</span></li>
                <li><span class="preview-label">Sort:</span> <span class="preview-value">{{ parsedSummary.sortLabel }}</span></li>
              </ul>
            </div>
            
            <div class="two-col">
              <div class="form-group">
                <label for="interval" class="label">Polling Interval</label>
                <select id="interval" class="select" v-model="form.polling_interval">
                  <option value="5m">5 min</option>
                  <option value="15m">15 min</option>
                  <option value="30m">30 min</option>
                  <option value="1h">1 hr</option>
                  <option value="6h">6 hr</option>
                </select>
              </div>
              
              <div class="form-group" style="justify-content: flex-end; padding-bottom: 0.5rem;">
                <label class="toggle">
                  <input type="checkbox" v-model="form.track_prices">
                  <span class="toggle-track"></span>
                  <span class="toggle-label">Track price drops (BIN only)</span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="close">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="!form.raw_url || !!validationError || isSubmitting">
              <span v-if="isSubmitting" class="spinner"></span>
              <span v-else>Start Tracking</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useUrlValidator } from '~/composables/useUrlValidator'

interface AddQueryForm {
  label: string
  raw_url: string
  polling_interval: string
  track_prices: boolean
}

const emit = defineEmits<{
  (e: 'submit', data: AddQueryForm): void
}>()

const isOpen = ref(false)
const isSubmitting = ref(false)

const { isValidating, validationError, parsedSummary, validate, reset } = useUrlValidator()

const form = reactive({
  label: '',
  raw_url: '',
  polling_interval: '15m',
  track_prices: true,
})

const handleUrlInput = () => validate(form.raw_url)

const open = () => {
  form.label = ''
  form.raw_url = ''
  form.polling_interval = '15m'
  form.track_prices = true
  reset()
  isOpen.value = true
}

const close = () => {
  isOpen.value = false
}

const submitForm = () => {
  if (!form.raw_url || validationError.value) return
  isSubmitting.value = true
  emit('submit', { ...form })
  isSubmitting.value = false
  close()
}

defineExpose({ open, close })
</script>

<style scoped>
.form-layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  align-items: end;
}

.parsed-preview {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.preview-title {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-2);
}

.preview-list {
  list-style: none;
  font-size: var(--text-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.preview-label {
  color: var(--color-text-secondary);
  display: inline-block;
  width: 5rem;
}

.preview-value {
  color: var(--color-text-primary);
  font-weight: var(--weight-medium);
}

.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
}
</style>
