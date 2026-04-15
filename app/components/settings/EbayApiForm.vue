<template>
  <div class="card">
    <div class="card-header">
      <h3 class="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent"><circle cx="12" cy="12" r="10"></circle><path d="M16 12a4 4 0 0 0-8 0"></path><line x1="12" y1="8" x2="12" y2="16"></line></svg>
        eBay API Status
      </h3>
    </div>
    
    <div class="card-body">
      <form @submit.prevent="save" class="form-layout">
        <div class="form-group">
          <label class="label" for="ebay-app-id">App ID (Client ID)</label>
          <input type="text" id="ebay-app-id" class="input" v-model="form.app_id" placeholder="Your Application ID">
        </div>
        
        <div class="form-group">
          <label class="label" for="ebay-client-secret">Client Secret</label>
          <!-- Using password type to obscure secret if it's set -->
          <input type="password" id="ebay-client-secret" class="input" v-model="form.client_secret" placeholder="Your Client Secret">
        </div>

        <div class="form-group">
          <label class="label" for="ebay-marketplace">Marketplace</label>
          <select id="ebay-marketplace" class="select" v-model="form.marketplace">
            <option value="EBAY_US">EBAY_US (United States)</option>
            <option value="EBAY_GB">EBAY_GB (United Kingdom)</option>
            <option value="EBAY_DE">EBAY_DE (Germany)</option>
            <option value="EBAY_AU">EBAY_AU (Australia)</option>
            <option value="EBAY_FR">EBAY_FR (France)</option>
            <option value="EBAY_IT">EBAY_IT (Italy)</option>
            <option value="EBAY_ES">EBAY_ES (Spain)</option>
            <option value="EBAY_CA">EBAY_CA (Canada)</option>
          </select>
        </div>
        
        <div class="form-actions mt-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button type="button" class="btn btn-secondary" @click="testConnection">
              <span v-if="testing" class="spinner"></span>
              <span v-else>Test Connection</span>
            </button>
            <span v-if="testResult" class="text-sm" :class="testResult.success ? 'text-success' : 'text-error'">
              <span v-if="testResult.success">✅ Connected</span>
              <span v-else>❌ {{ testResult.error || 'Connection failed' }}</span>
            </span>
          </div>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Saving...' : 'Save Settings' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { authFetch } from '~/composables/useAuthFetch'

const props = defineProps<{
  settings: Record<string, string>
}>()

const form = reactive({
  app_id: props.settings['ebay.app_id'] ?? '',
  client_secret: props.settings['ebay.client_secret'] ?? '',
  marketplace: props.settings['ebay.marketplace'] ?? 'EBAY_US',
})

const saving = ref(false)
const testing = ref(false)
const testResult = ref<{ success: boolean; error?: string } | null>(null)

const emit = defineEmits<{
  (e: 'save', updates: Record<string, string>): void
}>()

const save = () => {
  saving.value = true
  emit('save', {
    'ebay.app_id': form.app_id,
    'ebay.client_secret': form.client_secret,
    'ebay.marketplace': form.marketplace,
  })
  saving.value = false
}

const testConnection = async () => {
  testing.value = true
  testResult.value = null
  try {
    await authFetch('/api/settings/test-ebay', { method: 'POST' })
    testResult.value = { success: true }
  } catch (error) {
    testResult.value = { success: false, error: error instanceof Error ? error.message : 'Connection failed' }
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
.form-layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.mt-4 { margin-top: var(--space-4); }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-2 { gap: var(--space-2); }
.gap-3 { gap: var(--space-3); }
.text-accent { color: var(--color-accent); }
.text-sm { font-size: var(--text-sm); }
.text-success { color: var(--color-success-text); }
.text-error { color: var(--color-error-text); }

.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: currentColor;
  animation: spin 1s ease-in-out infinite;
}
</style>
