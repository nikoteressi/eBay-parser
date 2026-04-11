<template>
  <div class="settings-page">
    <div class="page-header">
      <NuxtLink to="/" class="back-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Dashboard
      </NuxtLink>
      <div>
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Configure API integrations and global defaults.</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div v-for="i in 4" :key="i" class="skeleton card-skeleton"></div>
    </div>

    <div v-else class="settings-grid">
      <EbayApiForm :settings="settings" @save="handleSave" />
      <SmtpForm :settings="settings" @save="handleSave" />
      <TelegramForm :settings="settings" @save="handleSave" />
      <DefaultsForm :settings="settings" @save="handleSave" />
    </div>

    <!-- Optional global success toast -->
    <div class="toast" :class="{ 'toast-visible': showToast }">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      Settings saved successfully
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import EbayApiForm from '~/components/settings/EbayApiForm.vue'
import SmtpForm from '~/components/settings/SmtpForm.vue'
import TelegramForm from '~/components/settings/TelegramForm.vue'
import DefaultsForm from '~/components/settings/DefaultsForm.vue'
import { useSettings } from '~/composables/useSettings'

definePageMeta({
  layout: 'default'
})

const { settings, loading, fetchSettings, saveSettings } = useSettings()
const showToast = ref(false)
let toastTimeout: any

onMounted(() => {
  fetchSettings()
})

const handleSave = async (updates: Record<string, string>) => {
  const success = await saveSettings(updates)
  if (success) {
    clearTimeout(toastTimeout)
    showToast.value = true
    toastTimeout = setTimeout(() => {
      showToast.value = false
    }, 3000)
  }
}
</script>

<style scoped>
.page-header {
  margin-bottom: var(--space-8);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  margin-bottom: var(--space-4);
}

.back-link:hover {
  color: var(--color-text-primary);
}

.page-title {
  margin-bottom: var(--space-1);
}

.page-subtitle {
  color: var(--color-text-secondary);
  font-size: var(--text-md);
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
  max-width: 48rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  max-width: 48rem;
}

.card-skeleton {
  width: 100%;
  height: 250px;
}

.toast {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  background: var(--color-success-subtle);
  border: 1px solid var(--color-success);
  color: var(--color-success-text);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  box-shadow: var(--shadow-lg);
  transform: translateY(150%);
  opacity: 0;
  transition: all var(--transition-spring);
  z-index: var(--z-toast);
}

.toast-visible {
  transform: translateY(0);
  opacity: 1;
}
</style>
