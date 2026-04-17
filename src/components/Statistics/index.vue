<template>
  <main class="statistics-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">
          <Icon icon="lucide:bar-chart-2" class="title-icon" />
          能源统计分析
        </h2>
        <p class="page-subtitle">
          <Icon icon="lucide:calendar" class="subtitle-icon" />
          统计周期: {{ formattedTimeRange }}
        </p>
      </div>
      <button class="time-edit-btn" @click="showTimeModal = true">
        <Icon icon="lucide:filter" class="btn-icon" />
        统计时间修改
      </button>
    </div>

    <!-- 时间范围弹窗 -->
    <TimeFilterModal v-model:visible="showTimeModal" @query="handleTimeFilterQuery" />

    <!-- KPI 卡片行 -->
    <section class="kpi-row">
      <!-- 总能耗 -->
      <div class="kpi-card energy-total" :style="{ animationDelay: '0s' }">
        <div class="kpi-top">
          <span class="kpi-label">总能耗 (MONTH-TO-DATE)</span>
          <div class="kpi-icon-badge energy">
            <Icon icon="lucide:zap" class="kpi-icon" />
          </div>
        </div>
        <template v-if="loading && !energySummary">
          <div class="sk-line sk-value"></div>
          <div class="sk-line sk-trend"></div>
        </template>
        <template v-else-if="energySummary">
          <div class="kpi-value-row">
            <span class="kpi-value">{{ formatNumber(energySummary.total) }}</span>
            <span class="kpi-unit">{{ energyDisplayUnit }}</span>
          </div>
          <div class="kpi-extra">
            <div class="progress-bar-wrapper">
              <span class="progress-label">预算达成率</span>
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: budgetPercent + '%' }"></div>
              </div>
              <span class="progress-value">{{ budgetPercent }}%</span>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="kpi-empty">暂无数据</div>
        </template>
        <div class="kpi-accent"></div>
      </div>

      <!-- 峰值负荷 -->
      <div class="kpi-card peak-load" :style="{ animationDelay: '0.07s' }">
        <div class="kpi-top">
          <span class="kpi-label">峰值负荷 (DAILY PEAK)</span>
          <div class="kpi-icon-badge peak">
            <Icon icon="lucide:gauge" class="kpi-icon" />
          </div>
        </div>
        <template v-if="loading && !energySummary">
          <div class="sk-line sk-value"></div>
          <div class="sk-line sk-trend"></div>
        </template>
        <template v-else-if="energySummary">
          <div class="kpi-value-row">
            <span class="kpi-value">{{ formatNumber(energySummary.peak) }}</span>
            <span class="kpi-unit">kW</span>
          </div>
          <div class="kpi-extra peak-times">
            <div class="peak-time-item">
              <Icon icon="lucide:clock" class="peak-time-icon" />
              <span class="peak-time-label">峰值时刻</span>
              <span class="peak-time-value">{{ formatPeakTime(energySummary.peak_time) }}</span>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="kpi-empty">暂无数据</div>
        </template>
        <div class="kpi-accent"></div>
      </div>

      <!-- 制冷系统综合EUI -->
      <div class="kpi-card cop-card" :style="{ animationDelay: '0.14s' }">
        <div class="kpi-top">
          <span class="kpi-label">制冷系统综合EUI (AVG)</span>
          <div class="kpi-icon-badge cop" :class="copRatingClass">
            <Icon icon="lucide:thermometer-snowflake" class="kpi-icon" />
          </div>
        </div>
        <template v-if="copLoading && !copSummary">
          <div class="sk-line sk-value"></div>
          <div class="sk-line sk-trend"></div>
        </template>
        <template v-else-if="copSummary">
          <div class="kpi-value-row">
            <span class="kpi-value">{{ copSummary.avg_cop != null ? Number(copSummary.avg_cop).toFixed(2) : '—' }}</span>
            <span class="cop-rating-dot" :class="copRatingClass"></span>
          </div>
          <div class="kpi-extra cop-rating">
            <span class="cop-tier-label">能效评级</span>
            <span class="cop-tier-badge" :class="copRatingClass">{{ copRatingText }}</span>
          </div>
        </template>
        <template v-else>
          <div class="kpi-empty">暂无数据</div>
        </template>
        <div class="kpi-accent"></div>
      </div>
    </section>

    <!-- 能耗趋势图 -->
    <EnergyTrendChart :start-time="activeStart" :end-time="activeEnd" />

    <!-- 设备监测与分建筑效绩表 -->
    <MeterPerformanceTable :start-time="activeStart" :end-time="activeEnd" />
    <BuildingPerformanceTable :start-time="activeStart" :end-time="activeEnd" />

    <!-- 错误提示 -->
    <div v-if="error" class="error-bar">
      <Icon icon="lucide:alert-circle" class="error-icon" />
      {{ error }}
      <button class="retry-link" @click="fetchAll">重试</button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { getCurrentTimeString } from '../../utils/timeManager'
import TimeFilterModal from '../QueryView/TimeFilterModal.vue'
import EnergyTrendChart from './EnergyTrendChart.vue'
import MeterPerformanceTable from './MeterPerformanceTable.vue'
import BuildingPerformanceTable from './BuildingPerformanceTable.vue'
import { usePageAIContext } from '../../composables/useAIContext'
import {
  getEnergyQuery,
  getCopAnalysis,
  type EnergySummary,
  type CopSummary
} from '../../api/statistics'

// ─── State ──────────────────────────────────────────────────────
const loading = ref(false)
const copLoading = ref(false)
const error = ref('')

const energySummary = ref<EnergySummary | null>(null)
const copSummary = ref<CopSummary | null>(null)

// Time range
const showTimeModal = ref(false)
const activeStart = ref('')
const activeEnd = ref('')

// ─── Computed ───────────────────────────────────────────────────
const formattedTimeRange = computed(() => {
  if (!activeStart.value || !activeEnd.value) return '—'
  const fmt = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`
  }
  return `${fmt(activeStart.value)} - ${fmt(activeEnd.value)}`
})

const energyDisplayUnit = computed(() => {
  if (!energySummary.value) return ''
  const unit = energySummary.value.unit || 'kWh'
  // 如果值 >= 1000 kWh，显示 MWh
  if (energySummary.value.total >= 1000 && unit.toLowerCase() === 'kwh') {
    return 'MWh'
  }
  return unit
})

const budgetPercent = computed(() => {
  // 简单 mock: 基于总能耗 / 预设预算值给一个示意百分比
  // 实际可后期接入预算 API
  if (!energySummary.value) return 0
  const total = Number(energySummary.value.total)
  if (!Number.isFinite(total) || total <= 0) return 0
  const budget = total * 1.3 // 假设预算为总量的 130%
  if (!Number.isFinite(budget) || budget <= 0) return 0
  return Math.min(100, Math.round((total / budget) * 100))
})

const copRatingClass = computed(() => {
  if (!copSummary.value) return ''
  const cop = copSummary.value.avg_cop
  if (cop >= 5) return 'outstanding'
  if (cop >= 4) return 'good'
  if (cop >= 3) return 'fair'
  return 'poor'
})

const copRatingText = computed(() => {
  if (!copSummary.value) return '—'
  const cop = copSummary.value.avg_cop
  if (cop >= 5) return 'Tier 1 (Outstanding)'
  if (cop >= 4) return 'Tier 2 (Good)'
  if (cop >= 3) return 'Tier 3 (Fair)'
  return 'Tier 4 (Poor)'
})

// ─── Helpers ────────────────────────────────────────────────────
const formatNumber = (val: number | null | undefined): string => {
  if (val == null || !Number.isFinite(val)) return '—'
  // 如果单位是 kWh 且 >= 1000，转 MWh
  if (val >= 1000 && energySummary.value?.unit?.toLowerCase() === 'kwh') {
    return (val / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  }
  if (Number.isInteger(val)) return val.toLocaleString()
  return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}

const formatPeakTime = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

// ─── Init time range: default to current month ──────────────────
const initTimeRange = () => {
  const now = new Date(getCurrentTimeString())
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  activeStart.value = start.toISOString()
  activeEnd.value = end.toISOString()
}

const handleTimeFilterQuery = (config: any) => {
  if (!config.startTime || !config.endTime) return
  // TimeFilterModal 已经去除了 Z 并且格式化为本地时间字符串 YYYY-MM-DDTHH:mm:ss
  activeStart.value = new Date(config.startTime).toISOString()
  activeEnd.value = new Date(config.endTime).toISOString()
  showTimeModal.value = false
  fetchAll()
}

const pageAIContext = computed(() => {
  if (!activeStart.value || !activeEnd.value) return null

  return {
    time_range: {
      start: activeStart.value,
      end: activeEnd.value
    }
  }
})

usePageAIContext('statistics', pageAIContext)

// ─── Data fetching ──────────────────────────────────────────────
const unwrap = (res: any) => res?.data ?? res

const fetchEnergy = async () => {
  loading.value = true
  try {
    const raw = await getEnergyQuery({
      meter: 'electricity',
      start_time: activeStart.value,
      end_time: activeEnd.value,
      granularity: 'day',
      aggregation: 'sum'
    })
    const data = unwrap(raw)
    energySummary.value = data?.summary ?? null
  } catch (err: any) {
    console.error('能耗查询失败:', err.message)
    error.value = '能耗数据加载失败: ' + (err?.message || '未知错误')
  } finally {
    loading.value = false
  }
}

const fetchCop = async () => {
  copLoading.value = true
  try {
    const raw = await getCopAnalysis({
      start_time: activeStart.value,
      end_time: activeEnd.value,
      granularity: 'day'
    })
    const data = unwrap(raw)
    copSummary.value = data?.summary ?? null
  } catch (err: any) {
    console.error('COP 查询失败:', err.message)
    // 不覆盖 energy 错误
    if (!error.value) {
      error.value = 'COP 数据加载失败: ' + (err?.message || '未知错误')
    }
  } finally {
    copLoading.value = false
  }
}

const fetchAll = () => {
  error.value = ''
  fetchEnergy()
  fetchCop()
}

// ─── Lifecycle ──────────────────────────────────────────────────
onMounted(() => {
  initTimeRange()
  fetchAll()
})
</script>

<style scoped>
/* ─── Foundation ──────────────────────────────────────────────── */
.statistics-page {
  --color-primary: #0b4582;
  --color-primary-light: #1e6fd0;
  --color-surface: #ffffff;
  --color-bg: #f4f7f9;
  --color-text: #0f172a;
  --color-text-secondary: #64748b;
  --color-border: #e8ecf1;
  --radius: 14px;
  --shadow-card: 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 14px rgba(15, 23, 42, 0.03);
  --shadow-hover: 0 8px 28px rgba(15, 23, 42, 0.08);
  --font: 'Plus Jakarta Sans', -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;

  padding: 24px 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  font-family: var(--font);
  color: var(--color-text);
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
}

/* ─── Page Header ─────────────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #0b1e3d;
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon {
  font-size: 24px;
  color: var(--color-primary);
  display: flex;
}

.page-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.subtitle-icon {
  font-size: 14px;
  display: flex;
}

.time-edit-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font);
}

.time-edit-btn:hover {
  background: #eff6ff;
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(11, 69, 130, 0.1);
}

.btn-icon {
  font-size: 16px;
  display: flex;
}

/* ─── Time Modal ──────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.time-modal {
  background: white;
  border-radius: 16px;
  width: 420px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: modalIn 0.25s ease;
}

@keyframes modalIn {
  from { opacity: 0; transform: translateY(-10px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.modal-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #999;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.modal-close:hover {
  background: #f5f5f5;
}

.modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.input-group input {
  width: 100%;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  color: #333;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.input-group input:focus {
  border-color: var(--color-primary);
}

.modal-footer {
  padding: 16px 24px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-secondary {
  padding: 8px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #666;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f8f8f8;
}

.btn-primary {
  padding: 8px 24px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #0b4582, #1565c0);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  box-shadow: 0 4px 12px rgba(11, 69, 130, 0.3);
  transform: translateY(-1px);
}

/* ═══ KPI Cards ══════════════════════════════════════════════════ */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

@media (max-width: 1000px) {
  .kpi-row { grid-template-columns: 1fr; }
}

@media (min-width: 1001px) and (max-width: 1300px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
}

.kpi-card {
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 24px 26px 20px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--color-border);
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.25s ease;
  animation: cardReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  transform: translateY(12px);
}

.kpi-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-hover);
}

@keyframes cardReveal {
  to { opacity: 1; transform: translateY(0); }
}

/* Accent bar at bottom */
.kpi-accent {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  border-radius: 0 0 var(--radius) var(--radius);
}

.energy-total .kpi-accent { background: linear-gradient(90deg, #2563eb, #60a5fa); }
.peak-load .kpi-accent { background: linear-gradient(90deg, #d97706, #fbbf24); }
.cop-card .kpi-accent { background: linear-gradient(90deg, #059669, #34d399); }

/* Top row: label + icon */
.kpi-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.kpi-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
}

.kpi-icon-badge {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kpi-icon-badge.energy { background: #eff6ff; color: #2563eb; }
.kpi-icon-badge.peak { background: #fffbeb; color: #d97706; }
.kpi-icon-badge.cop { background: #ecfdf5; color: #059669; }
.kpi-icon-badge.cop.outstanding { background: #ecfdf5; color: #059669; }
.kpi-icon-badge.cop.good { background: #eff6ff; color: #2563eb; }
.kpi-icon-badge.cop.fair { background: #fffbeb; color: #d97706; }
.kpi-icon-badge.cop.poor { background: #fef2f2; color: #dc2626; }

.kpi-icon {
  font-size: 22px;
  display: flex;
}

/* Value row */
.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 14px;
}

.kpi-value {
  font-size: 34px;
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: -0.02em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.kpi-unit {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

/* Extra content area */
.kpi-extra {
  margin-top: 4px;
}

.kpi-empty {
  font-size: 14px;
  color: var(--color-text-secondary);
  padding: 16px 0;
}

/* Progress bar (总能耗预算) */
.progress-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.progress-track {
  flex: 1;
  height: 6px;
  background: #e8ecf1;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #60a5fa);
  border-radius: 3px;
  transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.progress-value {
  font-size: 13px;
  font-weight: 700;
  color: #2563eb;
  min-width: 32px;
  text-align: right;
}

/* Peak times */
.peak-times {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.peak-time-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fffbeb;
  border-radius: 8px;
}

.peak-time-icon {
  font-size: 14px;
  color: #d97706;
  display: flex;
}

.peak-time-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.peak-time-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

/* COP Rating */
.cop-rating-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.cop-rating-dot.outstanding { background: #059669; }
.cop-rating-dot.good { background: #2563eb; }
.cop-rating-dot.fair { background: #d97706; }
.cop-rating-dot.poor { background: #dc2626; }

.cop-rating {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cop-tier-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.cop-tier-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 6px;
}

.cop-tier-badge.outstanding { background: #ecfdf5; color: #059669; }
.cop-tier-badge.good { background: #eff6ff; color: #2563eb; }
.cop-tier-badge.fair { background: #fffbeb; color: #d97706; }
.cop-tier-badge.poor { background: #fef2f2; color: #dc2626; }

/* Skeleton */
.sk-line {
  border-radius: 6px;
  background: #e8ecf1;
  animation: pulse 1.5s ease-in-out infinite;
}

.sk-value { width: 60%; height: 34px; margin-bottom: 14px; }
.sk-trend { width: 80%; height: 20px; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Error bar */
.error-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  font-size: 13px;
  color: #dc2626;
}

.error-icon {
  font-size: 18px;
  display: flex;
  flex-shrink: 0;
}

.retry-link {
  margin-left: auto;
  background: none;
  border: none;
  color: #dc2626;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  font-size: 13px;
}
</style>
