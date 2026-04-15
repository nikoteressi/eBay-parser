<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="close">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="edit-query-title">
        <div class="modal-header">
          <h2 id="edit-query-title" class="text-xl font-semibold">Edit Tracked Search</h2>
          <button class="btn btn-icon btn-ghost" @click="close" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <form @submit.prevent="submitForm">
          <div class="modal-body form-layout">
            <div class="form-group">
              <label for="edit-label" class="label">Label (optional)</label>
              <input
                id="edit-label"
                type="text"
                class="input"
                v-model="form.label"
                placeholder="e.g. Vintage Lego Search"
              />
            </div>

            <div class="form-group">
              <label for="edit-url" class="label">eBay Search URL <span class="text-error">*</span></label>
              <textarea
                id="edit-url"
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
                <li v-if="parsedSummary.minPrice !== undefined || parsedSummary.maxPrice !== undefined">
                  <span class="preview-label">Price:</span>
                  <span class="preview-value">${{ parsedSummary.minPrice ?? '—' }} – ${{ parsedSummary.maxPrice ?? '—' }}</span>
                </li>
                <li><span class="preview-label">Buy It Now:</span> <span class="preview-value">{{ parsedSummary.buyItNowOnly ? 'Yes' : 'No' }}</span></li>
                <li><span class="preview-label">Sort:</span> <span class="preview-value">{{ parsedSummary.sortLabel }}</span></li>
              </ul>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="close">Cancel</button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="!form.raw_url || !!validationError || isValidating || isSubmitting"
            >
              <span v-if="isSubmitting" class="spinner"></span>
              <span v-else>Save Changes</span>
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
import type { Query } from '~/composables/useQueries'

const emit = defineEmits<{
  (e: 'submit', data: { label: string; raw_url: string }): void
}>()

const isOpen = ref(false)
const isSubmitting = ref(false)

const { isValidating, validationError, parsedSummary, validate, reset } = useUrlValidator()

const form = reactive({
  label: '',
  raw_url: '',
})

const handleUrlInput = () => validate(form.raw_url)

const open = (query: Query) => {
  form.label = query.label ?? ''
  form.raw_url = query.raw_url
  reset()
  isOpen.value = true
}

const close = () => {
  reset()
  isOpen.value = false
}

const submitForm = () => {
  if (!form.raw_url || validationError.value || isValidating.value) return
  isSubmitting.value = true
  emit('submit', { label: form.label, raw_url: form.raw_url })
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

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>