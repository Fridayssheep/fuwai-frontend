<template>
  <div class="overview-cards">
    <div class="kpi-card total">
      <div class="kpi-icon-wrap">
        <Icon icon="lucide:shield-alert" class="kpi-icon" />
      </div>
      <div class="kpi-body">
        <span class="kpi-label">检测到的异常</span>
        <span class="kpi-value">{{ stats.total }}</span>
      </div>
    </div>

    <div class="kpi-card high">
      <div class="kpi-icon-wrap high-bg">
        <Icon icon="lucide:flame" class="kpi-icon" />
      </div>
      <div class="kpi-body">
        <span class="kpi-label">严重</span>
        <span class="kpi-value">{{ stats.high }}</span>
      </div>
      <div v-if="stats.total > 0" class="kpi-bar">
        <div class="kpi-bar-fill high-fill" :style="{ width: barWidth(stats.high) }"></div>
      </div>
    </div>

    <div class="kpi-card medium">
      <div class="kpi-icon-wrap medium-bg">
        <Icon icon="lucide:alert-triangle" class="kpi-icon" />
      </div>
      <div class="kpi-body">
        <span class="kpi-label">中级</span>
        <span class="kpi-value">{{ stats.medium }}</span>
      </div>
      <div v-if="stats.total > 0" class="kpi-bar">
        <div class="kpi-bar-fill medium-fill" :style="{ width: barWidth(stats.medium) }"></div>
      </div>
    </div>

    <div class="kpi-card low">
      <div class="kpi-icon-wrap low-bg">
        <Icon icon="lucide:info" class="kpi-icon" />
      </div>
      <div class="kpi-body">
        <span class="kpi-label">低级</span>
        <span class="kpi-value">{{ stats.low }}</span>
      </div>
      <div v-if="stats.total > 0" class="kpi-bar">
        <div class="kpi-bar-fill low-fill" :style="{ width: barWidth(stats.low) }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

const props = defineProps<{
  stats: { total: number; high: number; medium: number; low: number }
}>()

const barWidth = (count: number) => {
  if (props.stats.total === 0) return '0%'
  return `${Math.round((count / props.stats.total) * 100)}%`
}
</script>

<style scoped>
.overview-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.kpi-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.07);
}

.kpi-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  background: #eff6ff;
  color: #0b4582;
}
.kpi-icon-wrap.high-bg { background: #fef2f2; color: #dc2626; }
.kpi-icon-wrap.medium-bg { background: #fffbeb; color: #d97706; }
.kpi-icon-wrap.low-bg { background: #f0fdf4; color: #16a34a; }

.kpi-icon { display: flex; }

.kpi-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.kpi-label {
  font-size: 12px;
  color: #888;
  font-weight: 500;
}
.kpi-value {
  font-size: 26px;
  font-weight: 800;
  color: #111;
  line-height: 1.1;
  font-family: 'DIN Alternate', 'Courier New', monospace;
}

.kpi-bar {
  width: 100%;
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
}
.kpi-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
.high-fill { background: linear-gradient(90deg, #ef4444, #dc2626); }
.medium-fill { background: linear-gradient(90deg, #f59e0b, #d97706); }
.low-fill { background: linear-gradient(90deg, #22c55e, #16a34a); }

@media (max-width: 1100px) {
  .overview-cards { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .overview-cards { grid-template-columns: 1fr; }
}
</style>
