<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <NuxtLink to="/" class="logo">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="logo-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <span class="logo-text">eBay Tracker</span>
        </NuxtLink>
        <button class="sidebar-toggle" @click="toggleSidebar" aria-label="Toggle Sidebar">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        <NuxtLink to="/" class="nav-item" active-class="nav-item-active">
          <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
          <span class="nav-label">Dashboard</span>
        </NuxtLink>
        <NuxtLink to="/" class="nav-item" active-class="nav-item-active">
          <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <span class="nav-label">Searches</span>
        </NuxtLink>
        <NuxtLink to="/" class="nav-item" active-class="nav-item-active">
          <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <span class="nav-label">Alerts</span>
        </NuxtLink>
        <NuxtLink to="/settings" class="nav-item" active-class="nav-item-active">
          <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          <span class="nav-label">Settings</span>
        </NuxtLink>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar">AD</div>
          <div class="user-info">
            <span class="user-name">Admin</span>
            <span class="user-status">Online</span>
          </div>
        </div>
      </div>
    </aside>

    <div class="main-wrapper">
      <header class="content-header">
        <div class="header-breadcrumb">
          <span class="breadcrumb-item">eBay Tracker</span>
          <svg class="breadcrumb-sep" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          <span class="breadcrumb-item breadcrumb-current">Dashboard</span>
        </div>
        
        <div class="header-actions">
          <ApiBudgetBadge />
          <div class="profile-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
        </div>
      </header>

      <main class="main-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ApiBudgetBadge from '~/components/shared/ApiBudgetBadge.vue'

const isSidebarCollapsed = ref(false)

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

/* Sidebar Styling */
.sidebar {
  width: var(--sidebar-width);
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border-subtle);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-base);
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: var(--z-sticky);
}

.sidebar-collapsed .sidebar {
  width: var(--sidebar-collapsed-width);
}

.sidebar-header {
  height: var(--header-height);
  padding: 0 var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border-subtle);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  text-decoration: none;
  color: var(--color-text-primary);
  font-weight: var(--weight-bold);
  font-size: var(--text-md);
  overflow: hidden;
  white-space: nowrap;
}

.logo-icon {
  color: var(--color-accent);
  flex-shrink: 0;
}

.sidebar-collapsed .logo-text {
  display: none;
}

.sidebar-toggle {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.sidebar-toggle:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.sidebar-nav {
  flex: 1;
  padding: var(--space-4) var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.nav-item:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.nav-item-active {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}

.nav-icon {
  flex-shrink: 0;
}

.sidebar-collapsed .nav-label {
  display: none;
}

.sidebar-footer {
  padding: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  overflow: hidden;
}

.user-avatar {
  width: 2rem;
  height: 2rem;
  background: var(--color-bg-surface);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  color: var(--color-accent);
  flex-shrink: 0;
  border: 1px solid var(--color-border-subtle);
}

.user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-status {
  font-size: var(--text-xs);
  color: var(--color-success-text);
}

.sidebar-collapsed .user-info {
  display: none;
}

/* Main Content Styling */
.main-wrapper {
  flex: 1;
  margin-left: var(--sidebar-width);
  transition: margin-left var(--transition-base);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sidebar-collapsed .main-wrapper {
  margin-left: var(--sidebar-collapsed-width);
}

.content-header {
  height: var(--header-height);
  padding: 0 var(--space-6);
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.header-breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.breadcrumb-sep {
  color: var(--color-text-tertiary);
  opacity: 0.5;
}

.breadcrumb-current {
  color: var(--color-text-primary);
  font-weight: var(--weight-medium);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.profile-placeholder {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-full);
  background: var(--color-bg-surface);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1px solid var(--color-border-subtle);
  transition: all var(--transition-fast);
}

.profile-placeholder:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-accent);
}

.main-content {
  padding: var(--space-8) var(--space-6);
  max-width: var(--container-max);
  width: 100%;
  margin: 0 auto;
}

@media (max-width: 1024px) {
  .sidebar {
    width: var(--sidebar-collapsed-width);
  }
  .main-wrapper {
    margin-left: var(--sidebar-collapsed-width);
  }
  .logo-text, .nav-label, .user-info {
    display: none;
  }
}
</style>
