<template>
  <Transition name="progress-bar">
    <div v-if="visible" class="progress-banner">
      <div class="progress-left">
        <div class="pulse-dot"></div>
        <div class="progress-info">
          <span class="progress-title">异常检测进行中</span>
          <span class="progress-msg">{{ currentMessage || '准备中…' }}</span>
        </div>
      </div>

      <div class="progress-center">
        <div class="bar-track">
          <div
            class="bar-fill"
            :class="{ indeterminate: !hasRealProgress }"
            :style="hasRealProgress ? { width: `${percent}%` } : {}"
          ></div>
        </div>
        <div class="progress-stats" v-if="hasRealProgress">
          <span class="percent-text">{{ percent }}%</span>
          <span class="count-text">{{ progressCurrent }} / {{ progressTotal }}</span>
        </div>
      </div>

      <button class="log-toggle" @click="showLogs = !showLogs">
        <Icon :icon="showLogs ? 'lucide:chevron-up' : 'lucide:terminal'" class="toggle-icon" />
        {{ showLogs ? '收起' : '日志' }}
      </button>

      <Transition name="logs-expand">
        <div v-if="showLogs" class="log-feed">
          <div
            v-for="(log, i) in visibleLogs"
            :key="i"
            class="log-line"
          >
            <span class="log-time">{{ formatIdx(i) }}</span>
            <span>{{ log }}</span>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps<{
  visible: boolean
  currentMessage: string
  logs: string[]
}>()

const showLogs = ref(false)

// 解析 "进度: 906/3020" 格式的进度
const progressCurrent = ref(0)
const progressTotal = ref(0)

watch(() => props.currentMessage, (msg) => {
  if (!msg) return
  // 匹配 "进度: 123/456" 或 "进度：123/456" 格式
  const match = msg.match(/进度[：:]\s*(\d+)\s*\/\s*(\d+)/)
  if (match) {
    progressCurrent.value = parseInt(match[1], 10)
    progressTotal.value = parseInt(match[2], 10)
  }
})

const hasRealProgress = computed(() => progressTotal.value > 0)

const percent = computed(() => {
  if (progressTotal.value === 0) return 0
  return Math.min(100, Math.round((progressCurrent.value / progressTotal.value) * 100))
})

// 重置进度当不可见时
watch(() => props.visible, (v) => {
  if (!v) {
    progressCurrent.value = 0
    progressTotal.value = 0
  }
})

const visibleLogs = computed(() => {
  return props.logs.slice(Math.max(0, props.logs.length - 6))
})

const formatIdx = (i: number) => {
  const total = props.logs.length
  const start = Math.max(0, total - 6)
  return `#${start + i + 1}`
}
</script>

<style scoped>
.progress-banner {
  background: linear-gradient(135deg, #0b1e3d, #122d5e);
  border-radius: 14px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  color: #e0ecff;
  position: relative;
  overflow: hidden;
}

.progress-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #60a5fa;
  animation: pulse 1.5s ease-in-out infinite;
  flex-shrink: 0;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(96, 165, 250, 0.5); }
  50% { box-shadow: 0 0 0 6px rgba(96, 165, 250, 0); }
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.progress-title {
  font-size: 13px;
  font-weight: 700;
  color: #f0f4ff;
}
.progress-msg {
  font-size: 11px;
  color: #94a3b8;
  max-width: 320px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-center {
  flex: 1;
  min-width: 100px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bar-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  transition: width 0.4s ease;
}
/* 未知总量时使用来回滚动动画 */
.bar-fill.indeterminate {
  width: 40% !important;
  background: linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6);
  background-size: 200% 100%;
  animation: shimmer 1.8s infinite linear;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.progress-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.percent-text {
  font-size: 13px;
  font-weight: 800;
  color: #60a5fa;
  font-family: 'DIN Alternate', 'Courier New', monospace;
}
.count-text {
  font-size: 11px;
  color: #64748b;
  font-family: 'Courier New', monospace;
}

.log-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  border-radius: 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}
.log-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e0ecff;
}
.toggle-icon { font-size: 13px; display: flex; }

.log-feed {
  width: 100%;
  max-height: 140px;
  overflow-y: auto;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.log-line {
  font-size: 11px;
  color: #64748b;
  font-family: 'Courier New', monospace;
  display: flex;
  gap: 8px;
  padding: 2px 0;
}
.log-time {
  color: #475569;
  flex-shrink: 0;
  min-width: 28px;
}

/* Transitions */
.progress-bar-enter-active { transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
.progress-bar-leave-active { transition: all 0.25s ease; }
.progress-bar-enter-from { opacity: 0; transform: translateY(-12px); }
.progress-bar-leave-to { opacity: 0; transform: translateY(-12px); }

.logs-expand-enter-active { transition: all 0.25s ease; }
.logs-expand-leave-active { transition: all 0.2s ease; }
.logs-expand-enter-from,
.logs-expand-leave-to { opacity: 0; max-height: 0; }
</style>
