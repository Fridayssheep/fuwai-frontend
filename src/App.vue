<template>
  <div class="app-layout">
    <Sidebar class="sidebar-area" />
    <Header class="header-area" />
    <router-view class="main-area" />
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
}
</style>
