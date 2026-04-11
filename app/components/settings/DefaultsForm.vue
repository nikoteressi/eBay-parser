<template>
  <div class="card">
    <div class="card-header">
      <h3 class="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        Global Defaults
      </h3>
    </div>
    
    <div class="card-body">
      <form @submit.prevent="save" class="form-layout">
        <div class="two-col">
          <div class="form-group">
            <label class="label" for="default-polling-interval">Default Polling Interval</label>
            <select id="default-polling-interval" class="select" v-model="form.polling_interval">
              <option value="5m">5 min</option>
              <option value="15m">15 min</option>
              <option value="30m">30 min</option>
              <option value="1h">1 hr</option>
              <option value="6h">6 hr</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="label" for="default-max-pages">Max API pages per query</label>
            <input type="number" id="default-max-pages" class="input" v-model="form.max_pages" min="1" max="10">
          </div>
        </div>

        <div class="two-col">
          <div class="form-group">
            <label class="label" for="default-grace-period">Out of view grace period</label>
            <select id="default-grace-period" class="select" v-model="form.grace_period_days">
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label" for="default-retention">Ended/sold retention</label>
            <select id="default-retention" class="select" v-model="form.retention_days">
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </div>
        </div>
        
        <div class="form-actions mt-4 flex items-center justify-end">
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

const props = defineProps<{
  settings: Record<string, any>
}>()

const form = reactive({
  polling_interval: props.settings['defaults.polling_interval'] || '15m',
  max_pages: Number(props.settings['defaults.max_pages']) || 2,
  grace_period_days: props.settings['defaults.grace_period_days'] || '7',
  retention_days: props.settings['defaults.retention_days'] || '30'
})

const saving = ref(false)

const emit = defineEmits<{
  (e: 'save', updates: Record<string, string>): void
}>()

const save = () => {
  saving.value = true
  setTimeout(() => {
    emit('save', {
      'defaults.polling_interval': form.polling_interval,
      'defaults.max_pages': String(form.max_pages),
      'defaults.grace_period_days': String(form.grace_period_days),
      'defaults.retention_days': String(form.retention_days)
    })
    saving.value = false
  }, 500)
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
.justify-end { justify-content: flex-end; }
.gap-2 { gap: var(--space-2); }
.text-accent { color: var(--color-accent); }
</style>
