<template>
  <div class="card">
    <div class="card-header">
      <h3 class="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        Telegram
      </h3>
      <label class="toggle">
        <input type="checkbox" v-model="form.enabled" @change="autoSave">
        <span class="toggle-track"></span>
        <span class="toggle-label text-sm text-secondary">Enabled</span>
      </label>
    </div>
    
    <div class="card-body" :class="{ 'opacity-50 pointer-events-none': !form.enabled }">
      <form @submit.prevent="save" class="form-layout">
        <div class="form-group">
          <label class="label" for="telegram-bot-token">Bot Token</label>
          <input type="password" id="telegram-bot-token" class="input" v-model="form.bot_token" placeholder="123456789:ABCdefGHIjklmNOPqrsTUVwxyz">
          <span class="form-hint">Obtain from @BotFather</span>
        </div>
        
        <div class="form-group">
          <label class="label" for="telegram-chat-id">Chat ID(s)</label>
          <input type="text" id="telegram-chat-id" class="input" v-model="form.chat_id" placeholder="-100123456789, 987654321">
          <span class="form-hint">Separate multiple Chat IDs with commas</span>
        </div>
        
        <div class="form-actions mt-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button type="button" class="btn btn-secondary" @click="testConnection">
              <span v-if="testing" class="spinner"></span>
              <span v-else>Send Test Message</span>
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
  enabled: props.settings['telegram.enabled'] === 'true',
  bot_token: props.settings['telegram.bot_token'] || '',
  chat_id: props.settings['telegram.chat_id'] || ''
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
      'telegram.enabled': String(form.enabled),
      'telegram.bot_token': form.bot_token,
      'telegram.chat_id': form.chat_id
    })
    saving.value = false
  }, 500)
}

const testConnection = async () => {
  testing.value = true
  testResult.value = null
  try {
    await authFetch('/api/settings/test-telegram', { 
      method: 'POST',
      body: JSON.stringify(form)
    })
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
