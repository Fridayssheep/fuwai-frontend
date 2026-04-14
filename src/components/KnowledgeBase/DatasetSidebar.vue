<template>
  <aside class="dataset-sidebar">
    <div class="sidebar-header">
      <span class="header-icon"><Icon icon="lucide:database" /></span>
      <h3>数据集检索</h3>
    </div>
    <ul class="dataset-list">
      <li :class="{ active: selectedCategory === '' }" @click="emit('select', '')">
        <Icon icon="lucide:layout-grid" class="icon" /> 全部数据
      </li>
      <li v-for="category in categories" :key="category" 
          :class="{ active: selectedCategory === category }" 
          @click="emit('select', category)">
        <Icon icon="lucide:folder" class="icon" /> {{ category }}
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineProps<{
  categories: string[]
  selectedCategory: string
}>()

const emit = defineEmits<{
  (e: 'select', category: string): void
}>()
</script>

<style scoped>
.dataset-sidebar {
  width: 260px;
  background: white;
  border-radius: 16px;
  border: 1px solid #e3edf6;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(30, 64, 175, 0.02);
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-left: 8px;
}
.sidebar-header .header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #eef6ff;
  color: #0b4582;
  border-radius: 8px;
  font-size: 16px;
}
.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  color: #12233d;
  font-weight: 700;
}

.dataset-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dataset-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  font-size: 14px;
  color: #56708e;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.dataset-list li .icon {
  font-size: 16px;
  color: #92a5b8;
}

.dataset-list li:hover {
  background: #f5f8fc;
  color: #12233d;
}
.dataset-list li.active {
  background: #0b4582;
  color: white;
  font-weight: 600;
}
.dataset-list li.active .icon {
  color: white;
}

@media (max-width: 900px) {
  .dataset-sidebar { width: 100%; }
}
</style>
