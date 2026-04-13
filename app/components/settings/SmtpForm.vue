<template>
  <div class="card">
    <div class="card-header">
      <h3 class="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        Email (SMTP)
      </h3>
      <label class="toggle">
        <input type="checkbox" v-model="form.enabled" @change="autoSave">
        <span class="toggle-track"></span>
        <span class="toggle-label text-sm text-secondary">Enabled</span>
      </label>
    </div>
    
    <div class="card-body" :class="{ 'opacity-50 pointer-events-none': !form.enabled }">
      <form @submit.prevent="save" class="form-layout">
        <div class="two-col">
          <div class="form-group">
            <label class="label" for="smtp-host">SMTP Host</label>
            <input type="text" id="smtp-host" class="input" v-model="form.host" placeholder="smtp.gmail.com">
          </div>
          <div class="form-group">
            <label class="label" for="smtp-port">Port</label>
            <input type="number" id="smtp-port" class="input" v-model="form.port" placeholder="587">
          </div>
        </div>

        <div class="two-col">
          <div class="form-group">
            <label class="label" for="smtp-username">Username</label>
            <input type="text" id="smtp-username" class="input" v-model="form.username" placeholder="user@gmail.com">
          </div>
          <div class="form-group">
            <label class="label" for="smtp-password">Password</label>
            <input type="password" id="smtp-password" class="input" v-model="form.password" placeholder="App Password">
          </div>
        </div>
        
        <div class="form-group">
          <label class="toggle">
            <input type="checkbox" v-model="form.use_tls">
            <span class="toggle-track"></span>
            <span class="toggle-label text-sm">Use TLS</span>
          </label>
        </div>

        <div class="two-col">
          <div class="form-group">
            <label class="label" for="smtp-from">From Address</label>
            <input type="email" id="smtp-from" class="input" v-model="form.from" placeholder="noreply@example.com">
          </div>
          <div class="form-group">
            <label class="label" for="smtp-to">To Address(es)</label>
            <input type="text" id="smtp-to" class="input" v-model="form.to" placeholder="email1@example.com, email2@example.com">
          </div>
        </div>
        
        <div class="form-actions mt-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button type="button" class="btn btn-secondary" @click="testConnection">
              <span v-if="testing" class="spinner"></span>
              <span v-else>Send Test Email</span>
            </button>
            <span v-if="testResult" class="text-sm" :class="testResult.success ? 'text-success' : 'text-error'">
              <span v-if="testResult.success">✅ Sent successfully</span>
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
  settings: Record<string, any>
}>()

const form = reactive({
  enabled: props.settings['smtp.enabled'] === 'true',
  host: props.settings['smtp.host'] || '',
  port: props.settings['smtp.port'] || '',
  username: props.settings['smtp.username'] || '',
  password: props.settings['smtp.password'] || '',
  use_tls: props.settings['smtp.use_tls'] === 'true',
  from: props.settings['smtp.from'] || '',
  to: props.settings['smtp.to'] || ''
})

const saving = ref(false)
const testing = ref(false)
const testResult = ref<{ success: boolean; error?: string } | null>(null)

const emit = defineEmits<{
  (e: 'save', updates: Record<string, string>): void
}>()

const autoSave = () => save()

const save = () => {
  saving.value = true
  setTimeout(() => {
    emit('save', {
      'smtp.enabled': String(form.enabled),
      'smtp.host': form.host,
      'smtp.port': String(form.port),
      'smtp.username': form.username,
      'smtp.password': form.password,
      'smtp.use_tls': String(form.use_tls),
      'smtp.from': form.from,
      'smtp.to': form.to
    })
    saving.value = false
  }, 500)
}

const testConnection = async () => {
  testing.value = true
  testResult.value = null
  try {
    await authFetch('/api/settings/test-smtp', { method: 'POST' })
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
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
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
.text-secondary { color: var(--color-text-secondary); }
.text-success { color: var(--color-success-text); }
.text-error { color: var(--color-error-text); }
.opacity-50 { opacity: 0.5; }
.pointer-events-none { pointer-events: none; }

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
