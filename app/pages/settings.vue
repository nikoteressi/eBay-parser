<template>
  <div class="settings-page">
    <div class="page-header">
      <h1 class="page-title">Settings</h1>
      <p class="page-subtitle">Configure API integrations, notifications, and global defaults.</p>
    </div>

    <!-- Tabs Navigation -->
    <div class="settings-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="tab-btn"
        :class="{ 'tab-active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon" v-html="tab.icon"></span>
        <span class="tab-label">{{ tab.name }}</span>
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="skeleton card-skeleton"></div>
    </div>

    <div v-else class="tab-content">
      <transition name="fade-slide" mode="out-in">
        <div :key="activeTab" class="form-container">
          <EbayApiForm v-if="activeTab === 'ebay'" :settings="settings" @save="handleSave" />
          <SmtpForm v-if="activeTab === 'email'" :settings="settings" @save="handleSave" />
          <TelegramForm v-if="activeTab === 'telegram'" :settings="settings" @save="handleSave" />
          <DefaultsForm v-if="activeTab === 'defaults'" :settings="settings" @save="handleSave" />
        </div>
      </transition>
    </div>

    <!-- Global success toast -->
    <div class="toast" :class="{ 'toast-visible': showToast }">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
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
const activeTab = ref('ebay')
let toastTimeout: any

const tabs = [
  { id: 'ebay', name: 'eBay API', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>' },
  { id: 'email', name: 'Email (SMTP)', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>' },
  { id: 'telegram', name: 'Telegram', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>' },
  { id: 'defaults', name: 'Defaults', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>' }
]

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

.page-title {
  margin-bottom: var(--space-1);
}

.page-subtitle {
  color: var(--color-text-secondary);
  font-size: var(--text-md);
}

/* Tabs Styling */
.settings-tabs {
  display: flex;
  gap: var(--space-1);
  background: var(--color-bg-secondary);
  padding: var(--space-1);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-subtle);
  margin-bottom: var(--space-8);
  width: fit-content;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-6);
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-weight: var(--weight-medium);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
}

.tab-active {
  background: var(--color-bg-surface);
  color: var(--color-accent);
  box-shadow: var(--shadow-sm);
}

.tab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
}

.tab-active .tab-icon {
  opacity: 1;
}

.form-container {
  max-width: 42rem;
}

.loading-state {
  max-width: 42rem;
}

.card-skeleton {
  width: 100%;
  height: 350px;
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease-out;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.toast {
  position: fixed;
  bottom: var(--space-8);
  right: var(--space-8);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-success);
  color: var(--color-text-primary);
  padding: var(--space-4) var(--space-6);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  box-shadow: var(--shadow-xl);
  transform: translateY(150%);
  opacity: 0;
  transition: all var(--transition-spring);
  z-index: var(--z-toast);
}

.toast svg {
  color: var(--color-success-text);
}

.toast-visible {
  transform: translateY(0);
  opacity: 1;
}

@media (max-width: 768px) {
  .settings-tabs {
    flex-direction: column;
    width: 100%;
  }
  .tab-btn {
    justify-content: flex-start;
  }
}
</style>
