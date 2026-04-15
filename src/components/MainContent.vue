<template>
  <main class="dashboard">
    <!-- ═══ KPI Cards ═══ -->
    <section class="kpi-row">
      <div
        v-for="(card, i) in displayedMetrics"
        :key="card.key"
        class="kpi-card"
        :class="card.key"
        :style="{ animationDelay: i * 0.07 + 's' }"
      >
        <div class="kpi-top">
          <span class="kpi-label">{{ card.label }}</span>
          <Icon :icon="card.icon" class="kpi-icon" />
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">{{ formatNumber(card.value) }}</span>
          <span class="kpi-unit">{{ card.displayUnit }}</span>
        </div>
        <div v-if="card.change_rate != null" class="kpi-trend" :class="trendDirection(card)">
          <Icon :icon="card.change_rate >= 0 ? 'lucide:trending-up' : 'lucide:trending-down'" class="trend-icon" />
          {{ Math.abs(card.change_rate * 100).toFixed(1) }}%
          <span class="trend-label">较上期</span>
        </div>
        <div v-else class="kpi-trend neutral">
          <span class="trend-label">—</span>
        </div>
        <div class="kpi-accent"></div>
      </div>

      <!-- Skeleton cards while loading -->
      <template v-if="overviewLoading && displayedMetrics.length === 0">
        <div v-for="n in 4" :key="'sk-' + n" class="kpi-card skeleton">
          <div class="sk-line sk-label"></div>
          <div class="sk-line sk-value"></div>
          <div class="sk-line sk-trend"></div>
        </div>
      </template>
    </section>

    <!-- ═══ Middle: Chart + Highlights ═══ -->
    <section class="middle-row">
      <!-- Trend Chart -->
      <div class="panel chart-panel">
        <div class="panel-header">
          <h3>
            <Icon icon="lucide:activity" class="panel-icon" />
            能耗趋势
          </h3>
          <div class="range-tabs">
            <button
              v-for="r in rangeOptions"
              :key="r.value"
              :class="{ active: currentRange === r.value }"
              @click="switchRange(r.value)"
            >
              {{ r.label }}
            </button>
          </div>
        </div>
        <!-- Loading overlay inside chart area -->
        <div class="chart-wrapper">
          <div ref="chartRef" class="chart-area"></div>
          <div v-if="trendLoading" class="chart-loading-overlay">
            <Icon icon="lucide:loader-2" class="chart-spinner" />
          </div>
        </div>
      </div>

      <!-- Highlights / Quick Links -->
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
    </section>

    <!-- ═══ Bottom: Anomalies + AI Summary ═══ -->
    <section class="bottom-row">
      <!-- Top Anomalies -->
      <div class="panel anomalies-panel">
        <div class="panel-header">
          <h3>
            <Icon icon="lucide:shield-alert" class="panel-icon" />
            异常建筑
          </h3>
          <span v-if="topAnomalies.length > 0" class="anomaly-badge">
            {{ topAnomalies.length }} 项
          </span>
        </div>
        <div v-if="topAnomalies.length === 0" class="empty-state compact">
          <Icon icon="lucide:shield-check" class="empty-icon-svg good" />
          <p>当前未检测到异常建筑</p>
        </div>
        <div
          v-for="a in topAnomalies"
          :key="a.anomaly_id"
          class="anomaly-row"
          @click="goToFaultAnalysis(a)"
        >
          <div class="severity-dot" :class="a.severity"></div>
          <div class="anomaly-info">
            <strong>{{ a.title }}</strong>
            <span class="anomaly-meta">{{ a.building_id }} · {{ a.meter || 'electricity' }}</span>
          </div>
          <button class="anomaly-action">
            分析
            <Icon icon="lucide:arrow-right" class="action-arrow" />
          </button>
        </div>
      </div>

      <!-- AI Summary + Reports -->
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
        <p class="summary-text" :class="{ loading: overviewLoading }">
          {{ aiSummaryHint || (overviewLoading ? '正在分析数据...' : '暂无洞察信息') }}
        </p>
        <div class="report-section">
          <div class="report-divider">
            <Icon icon="lucide:file-text" class="divider-icon" />
            <span>快捷导出</span>
          </div>
          <button class="export-trigger" @click="openReportModal">
            <Icon icon="lucide:file-down" class="export-trigger-icon" />
            导出统计报表
            <Icon icon="lucide:chevron-right" class="export-trigger-arrow" />
          </button>
        </div>
      </div>
    </section>

    <!-- ═══ Report Export Modal ═══ -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="reportModal.visible" class="modal-backdrop" @click.self="closeReportModal">
          <div class="modal-container" @click.stop>
            <!-- Modal Header -->
            <div class="modal-header">
              <div class="modal-title-row">
                <Icon icon="lucide:file-bar-chart" class="modal-title-icon" />
                <h2>导出统计报表</h2>
              </div>
              <button class="modal-close" @click="closeReportModal">
                <Icon icon="lucide:x" />
              </button>
            </div>

            <!-- Report Type Selection -->
            <div class="modal-body">
              <label class="field-label">选择报告类型</label>
              <div class="report-type-grid">
                <button
                  v-for="rt in reportTypeOptions"
                  :key="rt.value"
                  class="type-card"
                  :class="{ selected: reportModal.reportType === rt.value }"
                  @click="reportModal.reportType = rt.value"
                >
                  <Icon :icon="rt.icon" class="type-card-icon" />
                  <div class="type-card-text">
                    <strong>{{ rt.label }}</strong>
                    <span>{{ rt.desc }}</span>
                  </div>
                </button>
              </div>

              <!-- Time Range -->
              <label class="field-label">时间范围</label>
              <div class="time-range-row">
                <div class="time-input-group">
                  <Icon icon="lucide:calendar" class="input-icon" />
                  <input type="date" v-model="reportModal.startDate" />
                </div>
                <span class="time-sep">至</span>
                <div class="time-input-group">
                  <Icon icon="lucide:calendar" class="input-icon" />
                  <input type="date" v-model="reportModal.endDate" />
                </div>
              </div>

              <!-- AI Summary Toggle -->
              <div class="ai-toggle-row">
                <div class="ai-toggle-info">
                  <Icon icon="lucide:sparkles" class="ai-toggle-icon" />
                  <div>
                    <strong>包含 AI 分析摘要</strong>
                    <span>在报表中自动生成 AI 数据洞察与建议</span>
                  </div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="reportModal.includeAI" />
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <!-- Error -->
              <div v-if="reportModal.error" class="modal-error">
                <Icon icon="lucide:alert-circle" class="modal-error-icon" />
                {{ reportModal.error }}
              </div>

              <!-- Success -->
              <div v-if="reportModal.success" class="modal-success">
                <Icon icon="lucide:check-circle-2" class="modal-success-icon" />
                <div>
                  <strong>报表生成成功</strong>
                  <span>{{ reportModal.successDetail }}</span>
                </div>
                <button class="download-btn" @click="handleDownloadReport">
                  <Icon icon="lucide:download" />
                  下载报表
                </button>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer">
              <button class="btn-cancel" @click="closeReportModal">取消</button>
              <button
                class="btn-generate"
                :disabled="reportModal.generating"
                @click="handleGenerateReport"
              >
                <Icon
                  :icon="reportModal.generating ? 'lucide:loader-2' : 'lucide:file-down'"
                  class="btn-icon"
                  :class="{ spin: reportModal.generating }"
                />
                {{ reportModal.generating ? '生成中…' : '生成并导出' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </main>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { getCurrentTimeString } from '../utils/timeManager'
import * as echarts from 'echarts'
import {
  getDashboardOverview,
  getHighlights,
  getEnergyTrend,
  generateReport,
  getReportDetail,
  type MetricCard,
  type AnomalySummary,
  type HighlightItem,
  type EnergySeries,
  type DashboardOverviewResponse,
  type ReportType
} from '../api/dashboard'

const router = useRouter()

// ─── Reactive state ──────────────────────────────────────────────
const overviewLoading = ref(false)
const trendLoading = ref(false)
const highlightsLoading = ref(false)

const metrics = ref<MetricCard[]>([])
const topAnomalies = ref<AnomalySummary[]>([])
const aiSummaryHint = ref('')
const highlightItems = ref<HighlightItem[]>([])

// Chart
const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null
type RangeKey = 'day' | 'week' | 'month'
const currentRange = ref<RangeKey>('week')
const rangeOptions: { value: RangeKey; label: string }[] = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' }
]

// ─── KPI Card formatting ─────────────────────────────────────────
interface DisplayMetric extends MetricCard {
  icon: string
  displayUnit: string
}

const metricConfig: Record<string, { icon: string; displayUnit: string; priority: number }> = {
  electricity_total: { icon: 'lucide:zap', displayUnit: 'kWh', priority: 1 },
  electricity_eui: { icon: 'lucide:ratio', displayUnit: 'kWh/㎡', priority: 2 },
  high_energy_buildings: { icon: 'lucide:triangle-alert', displayUnit: '栋', priority: 3 },
  estimated_carbon: { icon: 'lucide:leaf', displayUnit: 'kgCO₂', priority: 4 },
  scoped_buildings: { icon: 'lucide:building-2', displayUnit: '栋', priority: 5 },
  active_buildings: { icon: 'lucide:bar-chart-3', displayUnit: '栋', priority: 6 },
  scoped_sites: { icon: 'lucide:map-pin', displayUnit: '个', priority: 7 }
}

const displayedMetrics = computed<DisplayMetric[]>(() => {
  const selected = metrics.value
    .filter(m => m.key in metricConfig)
    .sort((a, b) => (metricConfig[a.key]?.priority ?? 99) - (metricConfig[b.key]?.priority ?? 99))
    .slice(0, 4)

  return selected.map(m => ({
    ...m,
    icon: metricConfig[m.key]?.icon ?? 'lucide:clipboard-list',
    displayUnit: metricConfig[m.key]?.displayUnit ?? m.unit ?? ''
  }))
})

const formatNumber = (val: number | null | undefined): string => {
  if (val == null) return '—'
  if (Math.abs(val) >= 10000) return (val / 10000).toFixed(2) + '万'
  if (Number.isInteger(val)) return val.toLocaleString()
  return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}

const trendDirection = (card: DisplayMetric): string => {
  if (card.change_rate == null) return 'neutral'
  if (['electricity_total', 'electricity_eui', 'estimated_carbon', 'high_energy_buildings'].includes(card.key)) {
    return card.change_rate >= 0 ? 'bad' : 'good'
  }
  return card.change_rate >= 0 ? 'good' : 'bad'
}

// ─── Highlights ──────────────────────────────────────────────────
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

// ─── Fault Analysis navigation ───────────────────────────────────
const goToFaultAnalysis = (anomaly: AnomalySummary) => {
  router.push({
    path: '/fault-analysis',
    query: { building_id: anomaly.building_id, meter: anomaly.meter || 'electricity' }
  })
}

// ─── Report Export Modal ─────────────────────────────────────────
const reportTypeOptions: { value: ReportType; label: string; desc: string; icon: string }[] = [
  { value: 'weekly_summary', label: '周度能耗报告', desc: '按周汇总各建筑能耗数据', icon: 'lucide:calendar-range' },
  { value: 'monthly_summary', label: '月度统计报告', desc: '按月聚合能耗与碳排趋势', icon: 'lucide:calendar-days' },
  { value: 'daily_summary', label: '每日能耗快报', desc: '当日各建筑用电用水概览', icon: 'lucide:calendar-clock' },
  { value: 'anomaly_report', label: '异常分析报告', desc: '异常建筑诊断与偏离分析', icon: 'lucide:shield-alert' }
]

const reportModal = reactive({
  visible: false,
  reportType: 'weekly_summary' as ReportType,
  startDate: '',
  endDate: '',
  includeAI: true,
  generating: false,
  error: '',
  success: false,
  successDetail: '',
  generatedReportId: ''
})

// Initialize modal dates from virtual time
const initReportDates = () => {
  const now = new Date(getCurrentTimeString())
  const end = now.toISOString().split('T')[0] || ''
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || ''
  reportModal.startDate = start
  reportModal.endDate = end
}

const openReportModal = () => {
  initReportDates()
  reportModal.error = ''
  reportModal.success = false
  reportModal.generating = false
  reportModal.generatedReportId = ''
  reportModal.visible = true
}

const closeReportModal = () => {
  reportModal.visible = false
}

const handleGenerateReport = async () => {
  if (!reportModal.startDate || !reportModal.endDate) {
    reportModal.error = '请选择时间范围'
    return
  }
  if (new Date(reportModal.startDate) > new Date(reportModal.endDate)) {
    reportModal.error = '开始时间不能晚于结束时间'
    return
  }

  reportModal.error = ''
  reportModal.success = false
  reportModal.generating = true

  try {
    const raw = await generateReport({
      report_type: reportModal.reportType,
      time_range: {
        start: new Date(reportModal.startDate).toISOString(),
        end: new Date(reportModal.endDate + 'T23:59:59').toISOString()
      },
      include_ai_summary: reportModal.includeAI
    })
    const data = unwrap(raw)
    const reportId = data?.report_id

    if (!reportId) {
      reportModal.error = '报表生成失败：未返回报表 ID'
      return
    }

    reportModal.generatedReportId = reportId

    // Poll for report completion (max 10 attempts)
    let attempts = 0
    const maxAttempts = 10
    let status = data?.status || 'queued'

    while (['queued', 'processing'].includes(status) && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 1500))
      const detail = unwrap(await getReportDetail(reportId))
      status = detail?.status || 'failed'
      attempts++
    }

    if (status === 'ready') {
      const typeLabel = reportTypeOptions.find(t => t.value === reportModal.reportType)?.label || '报表'
      reportModal.success = true
      reportModal.successDetail = `${typeLabel} 已就绪 (ID: ${reportId.slice(0, 8)}…)`
    } else if (status === 'failed') {
      reportModal.error = '报表生成失败，请稍后重试'
    } else {
      reportModal.success = true
      reportModal.successDetail = `报表仍在处理中 (ID: ${reportId.slice(0, 8)}…)，可稍后下载`
    }
  } catch (err: any) {
    reportModal.error = err?.message || '报表生成请求失败'
  } finally {
    reportModal.generating = false
  }
}

const handleDownloadReport = () => {
  if (!reportModal.generatedReportId) return
  // Open download URL in new window
  const downloadUrl = `/api/reports/${reportModal.generatedReportId}?download=true&format=md`
  window.open(downloadUrl, '_blank')
}

// ─── Data fetching ───────────────────────────────────────────────
const unwrap = (res: any) => res?.data ?? res

const fetchOverview = async () => {
  overviewLoading.value = true
  try {
    const raw = await getDashboardOverview()
    const data = unwrap(raw) as DashboardOverviewResponse
    metrics.value = data?.metrics ?? []
    topAnomalies.value = data?.top_anomalies ?? []
    aiSummaryHint.value = data?.ai_summary_hint ?? ''
  } catch (err: any) {
    console.error('Dashboard overview 加载失败:', err.message)
  } finally {
    overviewLoading.value = false
  }
}

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

const fetchTrend = async (range: RangeKey) => {
  trendLoading.value = true
  try {
    // 使用项目统一的虚拟时间（设置页可配置），而非系统真实时间
    const now = new Date(getCurrentTimeString())
    let startDate: Date
    let granularity: 'hour' | 'day'

    switch (range) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        granularity = 'hour'
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        granularity = 'day'
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        granularity = 'day'
        break
    }

    const raw = await getEnergyTrend({
      meter: 'electricity',
      start_time: startDate.toISOString(),
      end_time: now.toISOString(),
      granularity
    })
    const data = unwrap(raw)
    const series: EnergySeries[] = data?.series ?? []

    // Set loading false FIRST so the chart area is visible, then render
    trendLoading.value = false
    await nextTick()
    initChart()
    renderChart(series, granularity)
    return // skip the finally block's trendLoading set
  } catch (err: any) {
    console.error('趋势数据加载失败:', err.message)
    trendLoading.value = false
    await nextTick()
    initChart()
    renderChart([], 'day')
    return
  }
}

const switchRange = (range: RangeKey) => {
  currentRange.value = range
  fetchTrend(range)
}

// ─── ECharts rendering ──────────────────────────────────────────
const CHART_COLORS = [
  '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626',
  '#0891b2', '#be185d', '#4f46e5'
]

const formatTimestamp = (ts: string, granularity: string): string => {
  const d = new Date(ts)
  if (granularity === 'hour') {
    return d.getHours().toString().padStart(2, '0') + ':00'
  }
  return (d.getMonth() + 1) + '/' + d.getDate()
}

const initChart = () => {
  if (!chartRef.value) return
  if (!chart) {
    chart = echarts.init(chartRef.value)
  } else {
    chart.resize()
  }
}

const renderChart = (seriesData: EnergySeries[], granularity: string) => {
  if (!chartRef.value || !chart) return

  const allTimestamps = new Set<string>()
  seriesData.forEach(s => s.points.forEach(p => allTimestamps.add(p.timestamp)))
  const sortedTimestamps = Array.from(allTimestamps).sort()
  const xLabels = sortedTimestamps.map(t => formatTimestamp(t, granularity))

  const echartsSeries: echarts.SeriesOption[] = seriesData.map((s, idx) => {
    const dataMap = new Map(s.points.map(p => [p.timestamp, p.value]))
    const values = sortedTimestamps.map(t => dataMap.get(t) ?? null)
    const color = CHART_COLORS[idx % CHART_COLORS.length]

    return {
      name: s.building_id || s.meter,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: seriesData.length > 3 ? 0 : 6,
      itemStyle: { color },
      lineStyle: { width: 2.5 },
      areaStyle: idx === 0 ? {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: color + '40' },
          { offset: 1, color: color + '05' }
        ])
      } : undefined,
      data: values
    }
  })

  if (echartsSeries.length === 0) {
    echartsSeries.push({ name: '暂无数据', type: 'line', data: [] })
  }

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderColor: 'transparent',
      textStyle: { color: '#e2e8f0', fontSize: 12, fontFamily: 'Plus Jakarta Sans' },
      axisPointer: { lineStyle: { color: '#94a3b840' } }
    },
    legend: {
      show: seriesData.length > 1 && seriesData.length <= 6,
      icon: 'circle',
      top: 0, right: 0,
      itemWidth: 8, itemHeight: 8,
      textStyle: { color: '#64748b', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }
    },
    grid: {
      left: '2%', right: '3%', bottom: '4%',
      top: seriesData.length > 1 ? '14%' : '6%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xLabels,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#94a3b8', fontSize: 11, fontFamily: 'Plus Jakarta Sans' },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
      axisLabel: { color: '#94a3b8', fontSize: 11, fontFamily: 'Plus Jakarta Sans' },
      axisLine: { show: false }
    },
    series: echartsSeries,
    animationDuration: 600,
    animationEasing: 'cubicOut'
  }

  chart.setOption(option, true)
}

// ─── Lifecycle ───────────────────────────────────────────────────
const handleResize = () => chart?.resize()

onMounted(async () => {
  fetchOverview()
  fetchHighlights()

  // Ensure chart container is rendered before fetching data
  await nextTick()
  initChart()
  fetchTrend(currentRange.value)

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
/* ─── Foundation ──────────────────────────────────────────────── */
.dashboard {
  --color-primary: #0b4582;
  --color-primary-light: #1e6fd0;
  --color-surface: #ffffff;
  --color-bg: #f4f7f9;
  --color-text: #0f172a;
  --color-text-secondary: #64748b;
  --color-border: #e8ecf1;
  --color-good: #059669;
  --color-bad: #dc2626;
  --color-amber: #d97706;
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
}

/* ─── Panel base ─────────────────────────────────────────────── */
.panel {
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 22px 24px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--color-border);
  transition: box-shadow 0.25s ease;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.panel h3 {
  margin: 0 0 18px 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-header h3 { margin-bottom: 0; }

.panel-icon {
  font-size: 18px;
  display: flex;
  align-items: center;
  color: var(--color-primary);
}

/* ═══ KPI Cards ══════════════════════════════════════════════════ */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 18px;
}

.kpi-card {
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 22px 24px 18px;
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
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

@keyframes cardReveal {
  to { opacity: 1; transform: translateY(0); }
}

.kpi-accent {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 0 0 var(--radius) var(--radius);
}

.kpi-card.electricity_total .kpi-accent { background: linear-gradient(90deg, #2563eb, #60a5fa); }
.kpi-card.electricity_eui .kpi-accent { background: linear-gradient(90deg, #7c3aed, #a78bfa); }
.kpi-card.high_energy_buildings .kpi-accent { background: linear-gradient(90deg, #dc2626, #f87171); }
.kpi-card.estimated_carbon .kpi-accent { background: linear-gradient(90deg, #059669, #34d399); }
.kpi-card.scoped_buildings .kpi-accent { background: linear-gradient(90deg, #0891b2, #67e8f9); }
.kpi-card.active_buildings .kpi-accent { background: linear-gradient(90deg, #d97706, #fbbf24); }
.kpi-card.scoped_sites .kpi-accent { background: linear-gradient(90deg, #6366f1, #a5b4fc); }

.kpi-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.kpi-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
}

.kpi-icon {
  font-size: 22px;
  color: var(--color-text-secondary);
  opacity: 0.6;
  display: flex;
}

.kpi-card.electricity_total .kpi-icon { color: #2563eb; opacity: 1; }
.kpi-card.electricity_eui .kpi-icon { color: #7c3aed; opacity: 1; }
.kpi-card.high_energy_buildings .kpi-icon { color: #dc2626; opacity: 1; }
.kpi-card.estimated_carbon .kpi-icon { color: #059669; opacity: 1; }

.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 10px;
}

.kpi-value {
  font-size: 30px;
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: -0.02em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.kpi-unit {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.kpi-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
}

.kpi-trend.good { color: var(--color-good); }
.kpi-trend.bad { color: var(--color-bad); }
.kpi-trend.neutral { color: var(--color-text-secondary); }

.trend-icon { font-size: 14px; display: flex; }
.trend-label { font-weight: 500; opacity: 0.75; margin-left: 2px; }

/* Skeleton */
.kpi-card.skeleton { animation: pulse 1.5s ease-in-out infinite; }
.sk-line { border-radius: 6px; background: #e8ecf1; }
.sk-label { width: 60%; height: 14px; margin-bottom: 16px; }
.sk-value { width: 80%; height: 32px; margin-bottom: 12px; }
.sk-trend { width: 40%; height: 14px; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ═══ Middle Row ═════════════════════════════════════════════════ */
.middle-row {
  display: grid;
  grid-template-columns: 1.8fr 1fr;
  gap: 18px;
}

@media (max-width: 1100px) {
  .middle-row { grid-template-columns: 1fr; }
}

/* ─── Chart ──────────────────────────────────────────────────── */
.chart-panel .panel-header { margin-bottom: 4px; }

.range-tabs {
  display: flex;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 3px;
}

.range-tabs button {
  border: none;
  background: transparent;
  padding: 6px 18px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font);
}

.range-tabs button:hover { color: var(--color-text); }

.range-tabs button.active {
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.chart-wrapper {
  position: relative;
  width: 100%;
  height: 300px;
}

.chart-area {
  width: 100%;
  height: 100%;
}

.chart-loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  z-index: 2;
}

.chart-spinner {
  font-size: 28px;
  color: var(--color-primary);
  animation: spin 1s linear infinite;
  display: flex;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ─── Highlights ─────────────────────────────────────────────── */
.highlights-panel {
  display: flex;
  flex-direction: column;
}

.hl-card {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  margin-bottom: 10px;
}

.hl-card:last-child { margin-bottom: 0; }
.hl-card:hover { transform: translateX(3px); }

.hl-card.anomaly { background: #fef2f2; border-color: #fecaca; }
.hl-card.anomaly:hover { background: #fee2e2; }
.hl-card.insight { background: #fffbeb; border-color: #fde68a; }
.hl-card.insight:hover { background: #fef3c7; }
.hl-card.task { background: #eff6ff; border-color: #bfdbfe; }
.hl-card.task:hover { background: #dbeafe; }

.hl-indicator {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  flex-shrink: 0;
}

.hl-icon-svg { font-size: 16px; display: flex; }

.hl-card.anomaly .hl-indicator { background: #ef4444; color: white; }
.hl-card.insight .hl-indicator { background: #f59e0b; color: white; }
.hl-card.task .hl-indicator { background: #3b82f6; color: white; }

.hl-body { flex: 1; min-width: 0; }
.hl-body strong {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hl-body p {
  margin: 0;
  font-size: 11.5px;
  color: var(--color-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hl-arrow {
  color: var(--color-text-secondary);
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
  color: var(--color-text-secondary);
}

.empty-state.compact { padding: 24px 16px; }

.empty-icon-svg {
  font-size: 36px;
  color: var(--color-good);
  margin-bottom: 10px;
  display: flex;
}

.empty-icon-svg.good { color: var(--color-good); }

.empty-state p {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
}

/* ═══ Bottom Row ═════════════════════════════════════════════════ */
.bottom-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

@media (max-width: 900px) {
  .bottom-row { grid-template-columns: 1fr; }
}

/* ─── Anomalies ──────────────────────────────────────────────── */
.anomaly-badge {
  font-size: 11px;
  font-weight: 700;
  background: #fef2f2;
  color: var(--color-bad);
  padding: 4px 10px;
  border-radius: 20px;
  letter-spacing: 0.02em;
}

.anomaly-row {
  display: flex;
  align-items: center;
  padding: 14px 8px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 0.15s ease;
  border-radius: 8px;
  margin: 0 -8px;
}

.anomaly-row:last-child { border-bottom: none; }
.anomaly-row:hover { background: #f8fafc; }

.severity-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 14px;
  flex-shrink: 0;
}

.severity-dot.critical { background: #dc2626; box-shadow: 0 0 6px #dc262640; }
.severity-dot.high { background: #ea580c; box-shadow: 0 0 6px #ea580c40; }
.severity-dot.medium { background: #d97706; }
.severity-dot.low { background: #84cc16; }
.severity-dot.info { background: #94a3b8; }

.anomaly-info { flex: 1; min-width: 0; }
.anomaly-info strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.anomaly-meta {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.anomaly-action {
  border: none;
  background: var(--color-primary);
  color: white;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  font-family: var(--font);
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.anomaly-row:hover .anomaly-action {
  opacity: 1;
  transform: translateX(0);
}

.anomaly-action:hover {
  background: var(--color-primary-light);
  transform: translateX(2px);
}

.action-arrow { font-size: 14px; display: flex; }

/* ─── AI Summary + Reports ───────────────────────────────────── */
.ai-badge {
  font-size: 10px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-primary), #7c3aed);
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
  color: var(--color-text-secondary);
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
  color: var(--color-text-secondary);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.report-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.divider-icon { font-size: 14px; display: flex; }

.export-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font);
}

.export-trigger:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: #f0f7ff;
}

.export-trigger-icon { font-size: 18px; display: flex; color: var(--color-primary); }
.export-trigger-arrow { font-size: 16px; display: flex; margin-left: auto; opacity: 0.4; transition: all 0.2s; }
.export-trigger:hover .export-trigger-arrow { opacity: 1; transform: translateX(3px); }
</style>

<!-- Modal styles are unscoped because the Teleport renders outside this component's scope -->
<style>
/* ═══ Modal ═══════════════════════════════════════════════════════ */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(6px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Plus Jakarta Sans', -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.modal-container {
  background: #ffffff;
  border-radius: 18px;
  width: 540px;
  max-width: 92vw;
  max-height: 88vh;
  overflow-y: auto;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.06);
  animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalSlideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-fade-enter-active { transition: opacity 0.25s ease; }
.modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

/* Modal Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 28px 18px;
  border-bottom: 1px solid #e8ecf1;
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-title-icon {
  font-size: 22px;
  color: #0b4582;
  display: flex;
}

.modal-header h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.modal-close {
  border: none;
  background: transparent;
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
  color: #94a3b8;
  font-size: 20px;
  display: flex;
  transition: all 0.15s;
}

.modal-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}

/* Modal Body */
.modal-body {
  padding: 22px 28px;
}

.field-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  margin-bottom: 10px;
}

.field-label:not(:first-child) {
  margin-top: 20px;
}

/* Report Type Grid */
.report-type-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.type-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 1.5px solid #e8ecf1;
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-family: inherit;
}

.type-card:hover {
  border-color: #c7d2fe;
  background: #f8faff;
}

.type-card.selected {
  border-color: #0b4582;
  background: #eff6ff;
  box-shadow: 0 0 0 3px rgba(11, 69, 130, 0.08);
}

.type-card-icon {
  font-size: 20px;
  color: #64748b;
  display: flex;
  margin-top: 2px;
  flex-shrink: 0;
  transition: color 0.2s;
}

.type-card.selected .type-card-icon {
  color: #0b4582;
}

.type-card-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.type-card-text strong {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.type-card-text span {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

.type-card.selected .type-card-text strong {
  color: #0b4582;
}

/* Time Range */
.time-range-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.time-input-group {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1.5px solid #e8ecf1;
  border-radius: 10px;
  padding: 8px 14px;
  transition: border-color 0.2s;
}

.time-input-group:focus-within {
  border-color: #0b4582;
}

.input-icon {
  font-size: 16px;
  color: #94a3b8;
  display: flex;
  flex-shrink: 0;
}

.time-input-group input {
  border: none;
  outline: none;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  font-family: inherit;
  background: transparent;
  width: 100%;
}

.time-sep {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 600;
  flex-shrink: 0;
}

/* AI Toggle */
.ai-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border: 1.5px solid #e8ecf1;
  border-radius: 12px;
  margin-top: 20px;
  transition: border-color 0.2s;
}

.ai-toggle-row:has(input:checked) {
  border-color: #c7d2fe;
  background: #fafbff;
}

.ai-toggle-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-toggle-icon {
  font-size: 20px;
  color: #7c3aed;
  display: flex;
}

.ai-toggle-info strong {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.ai-toggle-info span {
  display: block;
  font-size: 11.5px;
  color: #94a3b8;
  font-weight: 500;
  margin-top: 1px;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #cbd5e1;
  border-radius: 24px;
  transition: all 0.25s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: all 0.25s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.toggle-switch input:checked + .toggle-slider {
  background: linear-gradient(135deg, #0b4582, #7c3aed);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

/* Error / Success */
.modal-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
  margin-top: 16px;
}

.modal-error-icon { font-size: 16px; display: flex; }

.modal-success {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 12px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  margin-top: 16px;
}

.modal-success-icon {
  font-size: 24px;
  color: #059669;
  display: flex;
  flex-shrink: 0;
}

.modal-success strong {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #059669;
}

.modal-success span {
  display: block;
  font-size: 11.5px;
  color: #64748b;
  margin-top: 1px;
}

.modal-success div { flex: 1; }

.download-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #059669;
  color: white;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all 0.2s;
  flex-shrink: 0;
}

.download-btn:hover {
  background: #047857;
  transform: translateY(-1px);
}

/* Modal Footer */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 18px 28px 22px;
  border-top: 1px solid #e8ecf1;
}

.btn-cancel {
  padding: 10px 22px;
  border: 1.5px solid #e8ecf1;
  border-radius: 10px;
  background: white;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #f8fafc;
  color: #0f172a;
}

.btn-generate {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #0b4582, #1e6fd0);
  font-size: 13px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.btn-generate:hover:not(:disabled) {
  box-shadow: 0 4px 14px rgba(11, 69, 130, 0.3);
  transform: translateY(-1px);
}

.btn-generate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-icon { font-size: 16px; display: flex; }
.btn-icon.spin { animation: spin 1s linear infinite; }
@keyframes modalSpin { to { transform: rotate(360deg); } }
</style>