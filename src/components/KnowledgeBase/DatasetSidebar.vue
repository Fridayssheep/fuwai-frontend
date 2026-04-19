<template>
  <aside class="dataset-sidebar">
    <div class="sidebar-header">
      <span class="header-icon"><Icon icon="lucide:database" /></span>
      <h3>数据集检索</h3>
    </div>
    <SlidingOptionGroup
      :model-value="selectedCategory"
      :options="datasetOptions"
      orientation="vertical"
      variant="list"
      aria-label="数据集范围"
      class="dataset-list"
      @update:model-value="(value) => emit('select', String(value))"
    >
      <template #option="{ option, active }">
        <Icon :icon="String(option.icon)" :class="['icon', { active }]" />
        <span>{{ option.label }}</span>
      </template>
    </SlidingOptionGroup>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import SlidingOptionGroup from '../common/SlidingOptionGroup.vue'

const props = defineProps<{
  categories: string[]
  selectedCategory: string
}>()

const emit = defineEmits<{
  (e: 'select', category: string): void
}>()

const datasetOptions = computed(() => ([
  { value: '', label: '全部数据', icon: 'lucide:layout-grid' },
  ...props.categories.map((category) => ({
    value: category,
    label: category,
    icon: 'lucide:folder'
  }))
]))
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
  margin: 0;
}

.dataset-list :deep(.sliding-option) {
  font-size: 14px;
}

.dataset-list :deep(.icon) {
  font-size: 16px;
  color: #92a5b8;
  transition: color .22s ease;
}

.dataset-list :deep(.icon.active) {
  color: white;
}

@media (max-width: 900px) {
  .dataset-sidebar { width: 100%; }
}
</style>
