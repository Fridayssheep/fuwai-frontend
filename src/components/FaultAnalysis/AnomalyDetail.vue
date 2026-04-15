<template>
  <div class="anomaly-detail" v-if="anomaly">
    <!-- Header -->
    <div class="detail-header">
      <button class="back-btn" @click="$emit('close')">
        <Icon icon="lucide:arrow-left" class="back-icon" />
      </button>
      <div class="header-info">
        <h3>{{ anomaly.title || anomaly.building_id }}</h3>
        <div class="header-tags">
          <span class="tag severity" :class="severityClass(anomaly.severity)">{{ severityLabel(anomaly.severity) }}</span>
          <span class="tag meter-tag">
            <Icon icon="lucide:gauge" class="tag-icon" /> {{ meterLabel(anomaly.meter) }}
          </span>
          <span class="tag time-tag">
            <Icon icon="lucide:calendar-days" class="tag-icon" /> {{ formatDate(anomaly.start_time) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="detail-loading">
      <div class="loading-spinner">
        <Icon icon="lucide:loader-2" class="spin-icon" />
      </div>
      <span>加载分析数据…</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="detail-error">
      <Icon icon="lucide:alert-circle" class="err-icon" />
      <span>{{ error }}</span>
    </div>

    <!-- Content -->
    <div v-else-if="detail" class="detail-content">
      <!-- 分析概况：已被离线检测标记为异常 -->
      <div class="summary-card anomalous">
        <div class="summary-status">
          <Icon icon="lucide:triangle-alert" class="status-icon" />
          <span class="status-text">离线检测已标记异常</span>
          <span class="severity-inline" :class="severityClass(anomaly!.severity)">{{ severityLabel(anomaly!.severity) }}</span>
        </div>
        <p class="summary-title">{{ anomaly!.title }}</p>
        <p class="summary-desc">{{ detail.summary }}</p>
        <div class="summary-stats" v-if="detail.event_count">
          <div class="stat">
            <span class="stat-value">{{ detail.event_count }}</span>
            <span class="stat-label">时序异常事件</span>
          </div>
          <div v-if="detail.detector_breakdown?.length" class="stat" v-for="db in detail.detector_breakdown" :key="db.detected_by">
            <span class="stat-value">{{ db.count }}</span>
            <span class="stat-label">{{ db.detected_by }}</span>
          </div>
        </div>
      </div>

      <!-- ECharts 图表 -->
      <div class="chart-card">
        <div class="card-label">
          <Icon icon="lucide:line-chart" class="label-icon" />
          能耗偏差曲线
        </div>
        <div v-if="!hasChartData" class="chart-empty">
          <Icon icon="lucide:bar-chart-3" class="chart-empty-icon" />
          <span>暂无能耗数据</span>
        </div>
        <div v-else ref="chartRef" class="chart-container"></div>
      </div>

      <!-- 事件时间线 -->
      <div v-if="detail.detected_events?.length" class="events-card">
        <div class="card-label">
          <Icon icon="lucide:calendar-clock" class="label-icon" />
          异常事件时间线
          <span class="event-count">{{ detail.detected_events.length }}</span>
        </div>
        <div class="event-timeline">
          <div
            v-for="ev in detail.detected_events"
            :key="ev.event_id"
            class="event-item"
          >
            <div class="event-dot" :class="severityClass(ev.severity)"></div>
            <div class="event-body">
              <div class="event-title">{{ ev.description }}</div>
              <div class="event-meta">
                <span><Icon icon="lucide:clock" class="em-icon" /> {{ formatRange(ev.start_time, ev.end_time) }}</span>
                <span class="event-type-tag">{{ ev.event_type }}</span>
                <span v-if="ev.peak_deviation != null" class="deviation-tag">
                  偏差 {{ (ev.peak_deviation * 100).toFixed(1) }}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- AI 诊断区域 -->
      <div class="ai-section-card">
        <div class="card-label">
          <Icon icon="lucide:brain-circuit" class="label-icon ai-icon" />
          AI 故障诊断
        </div>
        <AIDiagnosis
          :loading="aiLoading"
          :error="aiError"
          :result="aiResult"
          :selectedCauseId="selectedCause?.cause_id ?? null"
          :feedbackLoading="feedbackLoading"
          :feedbackError="feedbackError"
          :isConfirmed="!!feedbackResult"
          :comment="feedbackComment"
          @run="$emit('runAI')"
          @selectCause="(c: any) => $emit('selectCause', c)"
          @submitFeedback="$emit('submitFeedback')"
          @update:comment="(v: string) => $emit('update:feedbackComment', v)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import * as echarts from 'echarts'
import AIDiagnosis from './AIDiagnosis.vue'
import type { AnomalySummary, EnergyAnomalyAnalysisResponse, AIAnalyzeAnomalyResponse, AICandidateCause, AnomalyFeedbackResponse } from '../../api/anomaly'

const props = defineProps<{
  anomaly: AnomalySummary | null
  loading: boolean
  error: string
  detail: EnergyAnomalyAnalysisResponse | null
  aiLoading: boolean
  aiError: string
  aiResult: AIAnalyzeAnomalyResponse | null
  selectedCause: AICandidateCause | null
  feedbackLoading: boolean
  feedbackError: string
  feedbackResult: AnomalyFeedbackResponse | null
  feedbackComment: string
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'runAI'): void
  (e: 'selectCause', cause: AICandidateCause): void
  (e: 'submitFeedback'): void
  (e: 'update:feedbackComment', val: string): void
}>()

// ─── ECharts ─────────────────────────────────────
const chartRef = ref<HTMLDivElement>()
let chartInstance: echarts.ECharts | null = null

// 检查是否有真实数据可绘图
const hasChartData = computed(() => {
  return props.detail?.series?.points?.length && props.detail.series.points.length > 0
})

const renderChart = () => {
  if (!chartRef.value || !props.detail?.series?.points?.length) return

  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(chartRef.value)

  const s = props.detail.series
  const points = s.points

  // 从 points 数组提取 timestamps 和 values
  const timestamps = points.map(p => {
    const d = new Date(p.timestamp)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:00`
  })
  const values = points.map(p => p.value)

  // 检测异常点（来自 detected_events 的时间范围）
  const anomalyMarkers: any[] = []
  if (props.detail.detected_events?.length) {
    for (const ev of props.detail.detected_events) {
      const evStart = new Date(ev.start_time).getTime()
      const evEnd = new Date(ev.end_time).getTime()
      for (let i = 0; i < points.length; i++) {
        const pt = points[i]
        if (!pt) continue
        const t = new Date(pt.timestamp).getTime()
        if (t >= evStart && t <= evEnd) {
          anomalyMarkers.push({
            coord: [i, pt.value],
            itemStyle: {
              color: ev.severity === 'high' ? '#ef4444' : ev.severity === 'medium' ? '#f59e0b' : '#22c55e'
            }
          })
        }
      }
    }
  }

  const seriesData: any[] = [
    {
      name: '实际能耗',
      type: 'line',
      data: values,
      smooth: true,
      lineStyle: { width: 2, color: '#0b4582' },
      itemStyle: { color: '#0b4582' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(11, 69, 130, 0.12)' },
          { offset: 1, color: 'rgba(11, 69, 130, 0.01)' }
        ])
      },
      symbol: 'none',
      markPoint: anomalyMarkers.length ? {
        data: anomalyMarkers,
        symbol: 'circle',
        symbolSize: 8
      } : undefined
    }
  ]

  chartInstance.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e8edf2',
      textStyle: { color: '#333', fontSize: 12 }
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { fontSize: 11, color: '#888' }
    },
    grid: { left: 48, right: 16, top: 36, bottom: 32 },
    xAxis: {
      type: 'category',
      data: timestamps,
      axisLine: { lineStyle: { color: '#e8edf2' } },
      axisLabel: { fontSize: 10, color: '#999' },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      name: s.unit || 'kWh',
      nameTextStyle: { fontSize: 10, color: '#999', padding: [0, 40, 0, 0] },
      axisLine: { show: false },
      axisLabel: { fontSize: 10, color: '#999' },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
    },
    series: seriesData
  })
}

watch(() => props.detail, async () => {
  await nextTick()
  renderChart()
})

// Resize handler
const onResize = () => chartInstance?.resize()
window.addEventListener('resize', onResize)
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  chartInstance?.dispose()
})

// ─── Utils ───────────────────────────────────────
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

const meterLabel = (m?: string) => {
  const map: Record<string, string> = {
    electricity: '电力', water: '用水', gas: '燃气', steam: '蒸汽',
    hotwater: '热水', chilledwater: '冷水'
  }
  return map[m || ''] || m || '未知'
}
const formatDate = (iso: string) => {
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch { return iso }
}
const formatRange = (start: string, end: string) => {
  const fmt = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return `${fmt(start)} ~ ${fmt(end)}`
}
</script>

<style scoped>
.anomaly-detail {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Header */
.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 14px;
  border-bottom: 1px solid #f0f0f0;
}
.back-btn {
  width: 36px;
  height: 36px;
  border: 1.5px solid #e2e8f0;
  background: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.back-btn:hover { border-color: #0b4582; color: #0b4582; }
.back-icon { font-size: 16px; display: flex; }

.header-info h3 {
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 700;
  color: #111;
}
.header-tags { display: flex; gap: 8px; flex-wrap: wrap; }
.tag {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}
.tag-icon { font-size: 12px; display: flex; }
.severity.critical { background: #fef2f2; color: #b91c1c; }
.severity.high { background: #fef2f2; color: #dc2626; }
.severity.medium { background: #fffbeb; color: #d97706; }
.severity.low { background: #f0fdf4; color: #16a34a; }
.meter-tag { background: #f0f4ff; color: #0b4582; }
.time-tag { background: #f5f5f5; color: #666; }

/* Loading / error */
.detail-loading, .detail-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 20px;
  color: #888;
  font-size: 14px;
}
.loading-spinner { display: flex; }
.spin-icon {
  animation: spin 1s linear infinite;
  font-size: 20px;
  color: #0b4582;
  display: flex;
}
@keyframes spin { to { transform: rotate(360deg); } }
.err-icon { font-size: 20px; color: #dc2626; display: flex; }

/* Content scrollable */
.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Summary card */
.summary-card {
  padding: 18px 20px;
  border-radius: 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
}
.summary-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.status-icon { font-size: 20px; display: flex; color: #ef4444; }
.status-text { font-size: 15px; font-weight: 700; color: #111; }
.severity-inline {
  font-size: 11px;
  padding: 2px 9px;
  border-radius: 6px;
  font-weight: 700;
}
.severity-inline.critical { background: #fecaca; color: #b91c1c; }
.severity-inline.high { background: #fecaca; color: #dc2626; }
.severity-inline.medium { background: #fef3c7; color: #d97706; }
.severity-inline.low { background: #dcfce7; color: #16a34a; }
.summary-title { margin: 0 0 6px; font-size: 14px; font-weight: 700; color: #222; line-height: 1.5; }
.summary-desc { margin: 0; font-size: 13px; color: #555; line-height: 1.7; }

.summary-stats {
  display: flex;
  gap: 20px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(0,0,0,0.06);
}
.stat { display: flex; flex-direction: column; gap: 2px; }
.stat-value { font-size: 20px; font-weight: 800; color: #111; font-family: 'DIN Alternate', monospace; }
.stat-label { font-size: 11px; color: #888; }

/* Chart */
.chart-card, .events-card, .ai-section-card {
  background: #fafbfc;
  border-radius: 14px;
  padding: 16px 18px;
  border: 1px solid #f0f0f0;
}
.card-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 12px;
}
.label-icon { font-size: 16px; color: #0b4582; display: flex; }
.ai-icon { color: #6366f1; }

.chart-container {
  width: 100%;
  height: 260px;
}
.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 180px;
  color: #aaa;
  font-size: 13px;
}
.chart-empty-icon { font-size: 32px; display: flex; color: #ccc; }

/* Event timeline */
.event-count {
  font-size: 10px;
  background: #eff6ff;
  color: #0b4582;
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 700;
  margin-left: 6px;
}
.event-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.event-item {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
}
.event-item:last-child { border-bottom: none; }

.event-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
}
.event-dot.critical { background: #b91c1c; }
.event-dot.high { background: #ef4444; }
.event-dot.medium { background: #f59e0b; }
.event-dot.low { background: #22c55e; }

.event-body { flex: 1; }
.event-title { font-size: 13px; color: #333; line-height: 1.5; margin-bottom: 4px; }
.event-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 11px;
  color: #888;
  align-items: center;
}
.em-icon { font-size: 12px; display: flex; vertical-align: middle; }
.event-type-tag {
  background: #f0f4ff;
  color: #0b4582;
  padding: 1px 7px;
  border-radius: 5px;
  font-weight: 600;
}
.deviation-tag {
  background: #fef2f2;
  color: #dc2626;
  padding: 1px 7px;
  border-radius: 5px;
  font-weight: 600;
}
</style>
