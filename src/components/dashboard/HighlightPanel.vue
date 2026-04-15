<template>
  <div class="panel highlights-panel">
    <h3>
      <Icon icon="lucide:bell-ring" class="panel-icon" />
      重要事项
    </h3>
    <div v-if="highlightsLoading" class="hl-skeleton">
      <div v-for="n in 3" :key="'hl-sk-' + n" class="sk-highlight"></div>
    </div>
    <div v-else-if="highlightItems.length === 0" class="empty-state">
      <Icon icon="lucide:check-circle-2" class="empty-icon-svg" />
      <p>暂无需要关注的事项</p>
    </div>
    <div
      v-for="(item, idx) in highlightItems"
      :key="idx"
      class="hl-card"
      :class="item.type"
      @click="navigateHighlight(item)"
    >
      <div class="hl-indicator">
        <Icon :icon="hlIconName(item.type)" class="hl-icon-svg" />
      </div>
      <div class="hl-body">
        <strong>{{ item.title }}</strong>
        <p>{{ item.description }}</p>
      </div>
      <Icon icon="lucide:chevron-right" class="hl-arrow" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { getHighlights, type HighlightItem } from '../../api/dashboard'

const router = useRouter()
const highlightsLoading = ref(false)
const highlightItems = ref<HighlightItem[]>([])

const unwrap = (res: any) => res?.data ?? res

const fetchHighlights = async () => {
  highlightsLoading.value = true
  try {
    const raw = await getHighlights(3)
    const data = unwrap(raw)
    highlightItems.value = data?.items ?? []
  } catch (err: any) {
    console.error('高亮事项加载失败:', err.message)
  } finally {
    highlightsLoading.value = false
  }
}

const hlIconName = (type: string): string => {
  switch (type) {
    case 'anomaly': return 'lucide:alert-circle'
    case 'insight': return 'lucide:lightbulb'
    case 'task': return 'lucide:calendar-check'
    default: return 'lucide:arrow-right'
  }
}

const navigateHighlight = (item: HighlightItem) => {
  if (item.target_id) {
    router.push({ path: '/fault-analysis', query: { building_id: item.target_id } })
  } else {
    router.push('/')
  }
}

onMounted(() => {
  fetchHighlights()
})
</script>

<style scoped>
/* Common Panel Styles */
.panel {
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius, 14px);
  padding: 22px 24px;
  box-shadow: var(--shadow-card, 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 14px rgba(15, 23, 42, 0.03));
  border: 1px solid var(--color-border, #e8ecf1);
  transition: box-shadow 0.25s ease;
}

.panel h3 {
  margin: 0 0 18px 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-icon {
  font-size: 18px;
  display: flex;
  align-items: center;
  color: var(--color-primary, #0b4582);
}

/* Highlights Specific Styles */
.highlights-panel {
  flex: 1;
  min-width: 320px;
  display: flex;
  flex-direction: column;
}

.hl-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 12px;
  background: var(--color-bg, #f4f7f9);
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.hl-card:last-child { margin-bottom: 0; }

.hl-card:hover {
  background: white;
  border-color: #cbd5e1;
  box-shadow: var(--shadow-card, 0 4px 14px rgba(15, 23, 42, 0.03));
  transform: translateY(-2px);
}

.hl-indicator {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hl-icon-svg { font-size: 18px; display: flex; }

.hl-card.anomaly .hl-indicator { background: #ef4444; color: white; }
.hl-card.insight .hl-indicator { background: #f59e0b; color: white; }
.hl-card.task .hl-indicator { background: #3b82f6; color: white; }

.hl-body { flex: 1; min-width: 0; }
.hl-body strong {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hl-body p {
  margin: 0;
  font-size: 11.5px;
  color: var(--color-text-secondary, #64748b);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hl-arrow {
  color: var(--color-text-secondary, #64748b);
  font-size: 16px;
  margin-left: 8px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s;
  display: flex;
}

.hl-card:hover .hl-arrow {
  opacity: 1;
  transform: translateX(3px);
}

.hl-skeleton { display: flex; flex-direction: column; gap: 10px; }
.sk-highlight {
  height: 60px;
  border-radius: 10px;
  background: #f1f5f9;
  animation: pulse 1.5s ease-in-out infinite;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--color-text-secondary, #64748b);
}

.empty-icon-svg {
  font-size: 36px;
  color: var(--color-good, #059669);
  margin-bottom: 10px;
  display: flex;
}

.empty-state p {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
</style>
