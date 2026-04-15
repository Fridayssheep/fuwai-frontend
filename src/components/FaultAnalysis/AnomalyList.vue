<template>
  <div class="anomaly-list-panel">
    <div class="panel-header">
      <h3><Icon icon="lucide:list" class="h-icon" /> 异常事件列表</h3>
      <span class="count-badge">{{ items.length }} 项</span>
    </div>

    <div v-if="items.length === 0" class="empty-state">
      <Icon icon="lucide:check-circle-2" class="empty-icon" />
      <p>暂未检测到异常数据</p>
      <span>请先在设置中导入数据，然后触发分析</span>
    </div>

    <div v-else class="list-scroll">
      <div
        v-for="(item, idx) in items"
        :key="item.anomaly_id"
        class="anomaly-item"
        :class="{ selected: selectedId === item.anomaly_id }"
        @click="$emit('select', item)"
        :style="{ animationDelay: `${idx * 40}ms` }"
      >
        <div class="severity-dot" :class="severityClass(item.severity)"></div>
        <div class="item-body">
          <div class="item-title">{{ item.title || item.building_id }}</div>
          <div class="item-meta">
            <span class="meta-tag meter">
              <Icon icon="lucide:gauge" class="meta-icon" />
              {{ meterLabel(item.meter) }}
            </span>
            <span class="meta-tag time">
              <Icon icon="lucide:clock" class="meta-icon" />
              {{ formatTime(item.start_time) }}
            </span>
          </div>
        </div>
        <div class="severity-badge" :class="severityClass(item.severity)">
          {{ severityLabel(item.severity) }}
        </div>
        <Icon icon="lucide:chevron-right" class="item-arrow" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { AnomalySummary } from '../../api/anomaly'

defineProps<{
  items: AnomalySummary[]
  selectedId: string | null
}>()

defineEmits<{
  (e: 'select', item: AnomalySummary): void
}>()

const meterLabel = (meter?: string) => {
  const map: Record<string, string> = {
    electricity: '电力',
    water: '用水',
    gas: '燃气',
    steam: '蒸汽',
    hotwater: '热水',
    chilledwater: '冷水',
    irrigation: '灌溉',
    solar: '太阳能'
  }
  return map[meter || ''] || meter || '未知'
}

const SEVERITY_MAP: Record<string, { label: string; cls: string }> = {
  critical: { label: '严重', cls: 'critical' },
  high: { label: '严重', cls: 'high' },
  medium: { label: '中级', cls: 'medium' },
  warning: { label: '警告', cls: 'medium' },
  low: { label: '低级', cls: 'low' },
  info: { label: '信息', cls: 'low' }
}
const severityLabel = (s: string) => SEVERITY_MAP[s]?.label || s
const severityClass = (s: string) => SEVERITY_MAP[s]?.cls || 'low'

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { return iso }
}
</script>

<style scoped>
.anomaly-list-panel {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 14px;
  border-bottom: 1px solid #f0f0f0;
}
.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #111;
  display: flex;
  align-items: center;
  gap: 8px;
}
.h-icon { font-size: 18px; color: #0b4582; display: flex; }
.count-badge {
  font-size: 11px;
  background: #eff6ff;
  color: #0b4582;
  padding: 3px 10px;
  border-radius: 10px;
  font-weight: 700;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}
.empty-icon {
  font-size: 48px;
  color: #c8d6e5;
  margin-bottom: 12px;
  display: inline-flex;
}
.empty-state p {
  margin: 0 0 4px;
  font-size: 15px;
  color: #666;
  font-weight: 600;
}
.empty-state span {
  font-size: 12px;
  color: #aaa;
}

/* 最多显示5条，少于5条时自适应内容高度 */
.list-scroll {
  overflow-y: auto;
  padding: 8px 12px 12px;
  /* 每个 item 约 70px 高（14px padding*2 + 内容），最多 5 条 + 一些间距 */
  max-height: 390px;
}

.anomaly-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1.5px solid transparent;
  animation: fadeSlideIn 0.35s ease both;
}
.anomaly-item:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
}
.anomaly-item.selected {
  background: #eff6ff;
  border-color: #0b4582;
  box-shadow: 0 0 0 2px rgba(11, 69, 130, 0.08);
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.severity-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.severity-dot.critical { background: #b91c1c; box-shadow: 0 0 6px rgba(185, 28, 28, 0.4); }
.severity-dot.high { background: #ef4444; box-shadow: 0 0 6px rgba(239, 68, 68, 0.4); }
.severity-dot.medium { background: #f59e0b; box-shadow: 0 0 6px rgba(245, 158, 11, 0.4); }
.severity-dot.low { background: #22c55e; box-shadow: 0 0 6px rgba(34, 197, 94, 0.4); }

.item-body { flex: 1; min-width: 0; }
.item-title {
  font-size: 14px;
  font-weight: 600;
  color: #222;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.meta-tag {
  font-size: 11px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 3px;
}
.meta-icon { font-size: 12px; display: flex; }

.severity-badge {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 8px;
  font-weight: 700;
  flex-shrink: 0;
}
.severity-badge.critical { background: #fef2f2; color: #b91c1c; }
.severity-badge.high { background: #fef2f2; color: #dc2626; }
.severity-badge.medium { background: #fffbeb; color: #d97706; }
.severity-badge.low { background: #f0fdf4; color: #16a34a; }

.item-arrow {
  font-size: 16px;
  color: #ccc;
  flex-shrink: 0;
  display: flex;
  transition: color 0.2s;
}
.anomaly-item.selected .item-arrow { color: #0b4582; }
</style>
