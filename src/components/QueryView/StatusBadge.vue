<template>
  <span class="status-badge" :class="statusClass">
    <span class="dot"></span>
    {{ displayText }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type StatusType = 'normal' | 'warning' | 'fault' | 'offline' | 'online' | 'unknown'

interface Props {
  status: StatusType
  customText?: string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  status: 'unknown',
  size: 'md'
})

// 状态映射表（合并两个代码的状态值）
const statusMap: Record<string, { text: string; class: string }> = {
  // 来自第一个代码的状态值
  normal: { text: '正常运行', class: 'normal' },
  warning: { text: '告警状态', class: 'warning' },
  fault: { text: '故障停机', class: 'fault' },
  offline: { text: '离线', class: 'warning' }, // 复用warning样式
  
  // 来自第二个代码的状态值（映射到相同样式）
  online: { text: '运行正常', class: 'normal' },
  error: { text: '异常状态', class: 'fault' },
  unknown: { text: '未知', class: '' }
}

const displayText = computed(() => props.customText || statusMap[props.status]?.text || '未知')
const statusClass = computed(() => {
  const baseClass = statusMap[props.status]?.class || ''
  return `${baseClass} size-${props.size}`
})
</script>

<style scoped>
/* 完全复用第一个代码的样式，并添加尺寸变体 */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 12px;
  transition: all 0.2s ease;
}

.status-badge .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

/* 状态样式 - 来自第一个代码 */
.status-badge.normal {
  background: #ecfdf5;
  color: #059669;
}

.status-badge.warning {
  background: #fffbeb;
  color: #d97706;
}

.status-badge.fault {
  background: #fef2f2;
  color: #dc2626;
}

/* 尺寸变体 */
.status-badge.size-sm {
  font-size: 11px;
  padding: 2px 8px;
}

.status-badge.size-sm .dot {
  width: 4px;
  height: 4px;
}

.status-badge.size-lg {
  font-size: 13px;
  padding: 6px 14px;
}

/* 动画效果 - 故障状态添加呼吸动画 */
.status-badge.fault .dot {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
