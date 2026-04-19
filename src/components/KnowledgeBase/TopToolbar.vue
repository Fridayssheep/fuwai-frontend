<template>
  <div class="top-toolbar">
    <div class="search-box">
      <Icon icon="lucide:search" class="search-icon" />
      <input
        class="themed-input toolbar-input"
        v-model.trim="localKeyword"
        type="text"
        placeholder="搜索当前数据集下的文件..."
        @keyup.enter="handleSearch"
      />
    </div>
    <button class="primary-btn" @click="handleSearch" :disabled="loading">搜索</button>
    <button class="ghost-btn" @click="resetFilters" :disabled="loading">重置</button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps<{
  keyword: string
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'update:keyword', value: string): void
  (e: 'search'): void
  (e: 'reset'): void
}>()

const localKeyword = ref(props.keyword)

watch(() => props.keyword, (newVal) => {
  localKeyword.value = newVal
})

watch(localKeyword, (newVal) => {
  emit('update:keyword', newVal)
})

const handleSearch = () => emit('search')
const resetFilters = () => emit('reset')
</script>

<style scoped>
.top-toolbar {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: white;
  border-radius: 16px;
  border: 1px solid #e3edf6;
  box-shadow: 0 4px 12px rgba(30, 64, 175, 0.02);
  align-items: center;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  height: 44px;
  border-radius: 12px;
  background: #f5f8fc;
  border: 1px solid #e1eaf3;
}
.search-icon {
  color: #6a8098;
  font-size: 18px;
}
.toolbar-input {
  flex: 1;
  --themed-input-width: auto;
  --themed-input-height: 100%;
  --themed-input-padding-x: 0;
  --themed-input-radius: 0;
  --themed-input-border: transparent;
  --themed-input-bg: transparent;
  --themed-input-hover-bg: transparent;
  --themed-input-focus-bg: transparent;
  --themed-input-focus-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
}

.toolbar-input:hover,
.toolbar-input:focus {
  border-color: transparent;
}

.primary-btn, .ghost-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: 0.2s;
}
.primary-btn {
  background: #0b4582;
  color: white;
}
.primary-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.ghost-btn {
  background: #edf3f9;
  color: #1d3d63;
}
.ghost-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
