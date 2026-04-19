<template>
  <div class="app-layout">
    <Sidebar class="sidebar-area" />
    <Header class="header-area" />
    <section class="main-area">
      <router-view v-slot="{ Component, route }">
        <Transition name="page-swap" mode="out-in">
          <component :is="Component" :key="route.fullPath" class="route-panel" />
        </Transition>
      </router-view>
    </section>
    <GlobalAIAssistant />
  </div>
</template>

<script setup lang="ts">
import Sidebar from './components/Sidebar.vue'
import Header from './components/Header.vue'
import GlobalAIAssistant from './components/AIAssistant/GlobalAIAssistant.vue'
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}
</style>

<style scoped>
.app-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 70px 1fr;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: #f4f7f9; /* 整体浅灰背景 */
}

.sidebar-area {
  grid-column: 1 / 2;
  grid-row: 1 / 3;
}

.header-area {
  grid-column: 2 / 3;
  grid-row: 1 / 2;
}

.main-area {
  grid-column: 2 / 3;
  grid-row: 2 / 3;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.route-panel {
  min-height: 100%;
}

.page-swap-enter-active,
.page-swap-leave-active {
  transition: opacity 0.24s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), filter 0.24s ease;
}

.page-swap-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.992);
  filter: blur(4px);
}

.page-swap-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.996);
  filter: blur(3px);
}
</style>
