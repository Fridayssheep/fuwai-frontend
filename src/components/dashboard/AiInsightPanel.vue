<template>
  <div class="panel summary-panel">
    <div class="panel-header">
      <h3>
        <Icon icon="lucide:brain" class="panel-icon" />
        AI 洞察
      </h3>
      <span class="ai-badge">
        <Icon icon="lucide:sparkles" class="ai-badge-icon" />
        AI
      </span>
    </div>
    <p class="summary-text" :class="{ loading }">
      {{ summaryHint || (loading ? '正在分析数据...' : '暂无洞察信息') }}
    </p>
    <div class="report-section">
      <div class="report-divider">
        <Icon icon="lucide:file-text" class="divider-icon" />
        <span>快捷导出</span>
      </div>
      <button class="export-trigger" @click="$emit('open-report')">
        <Icon icon="lucide:file-down" class="export-trigger-icon" />
        导出统计报表
        <Icon icon="lucide:chevron-right" class="export-trigger-arrow" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineProps<{
  summaryHint: string
  loading: boolean
}>()

defineEmits<{
  (e: 'open-report'): void
}>()
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
  display: flex;
  flex-direction: column;
}

.summary-panel {
  flex: 1;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.panel h3 {
  margin: 0;
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

/* AI Summary Specific Styles */
.ai-badge {
  font-size: 10px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-primary, #0b4582), #7c3aed);
  color: white;
  padding: 3px 10px;
  border-radius: 20px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 4px;
}

.ai-badge-icon { font-size: 12px; display: flex; }

.summary-text {
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--color-text-secondary, #64748b);
  margin: 0 0 20px 0;
  font-weight: 500;
}

.summary-text.loading {
  animation: pulse 1.5s ease-in-out infinite;
}

.report-section { margin-top: auto; }

.report-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary, #64748b);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.report-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border, #e8ecf1);
}

.divider-icon { font-size: 14px; display: flex; }

.export-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid var(--color-border, #e8ecf1);
  border-radius: 10px;
  background: var(--color-surface, #ffffff);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font, sans-serif);
}

.export-trigger:hover {
  border-color: var(--color-primary, #0b4582);
  color: var(--color-primary, #0b4582);
  background: #f0f7ff;
}

.export-trigger-icon { font-size: 18px; display: flex; color: var(--color-primary, #0b4582); }
.export-trigger-arrow { font-size: 16px; display: flex; margin-left: auto; opacity: 0.4; transition: all 0.2s; }
.export-trigger:hover .export-trigger-arrow { opacity: 1; transform: translateX(3px); }

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
</style>
