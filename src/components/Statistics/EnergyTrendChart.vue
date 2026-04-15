<template>
  <div class="trend-panel">
    <div class="panel-header">
      <div class="panel-title-group">
        <h3>
          <Icon icon="lucide:bar-chart-2" class="panel-icon" />
          能耗趋势分析
        </h3>
        <p class="panel-subtitle">按日统计综合用电总量趋势</p>
      </div>
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

    <!-- Chart area -->
    <div class="chart-wrapper">
      <div ref="chartRef" class="chart-area"></div>
      <div v-if="loading" class="chart-loading-overlay">
        <Icon icon="lucide:loader-2" class="chart-spinner" />
      </div>
      <div v-if="!loading && isEmpty" class="chart-empty">
        <Icon icon="lucide:bar-chart" class="empty-chart-icon" />
        <span>暂无趋势数据</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { getCurrentTimeString } from '../../utils/timeManager'
import * as echarts from 'echarts'
import {
  getEnergyTrendData,
  type EnergySeries,
  type EnergyTrendParams
} from '../../api/statistics'

// ─── Props ──────────────────────────────────────────────────────
const props = defineProps<{
  startTime: string
  endTime: string
}>()

// ─── State ──────────────────────────────────────────────────────
const loading = ref(false)
const isEmpty = ref(false)
const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

type GranularityKey = 'day' | 'week' | 'month'
const currentRange = ref<GranularityKey>('day')
const rangeOptions: { value: GranularityKey; label: string }[] = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' }
]

// ─── Helpers ────────────────────────────────────────────────────
const unwrap = (res: any) => res?.data ?? res

const granularityMap: Record<GranularityKey, EnergyTrendParams['granularity']> = {
  day: 'day',
  week: 'week',
  month: 'month'
}

const formatTimestamp = (ts: string, granularity: string): string => {
  const d = new Date(ts)
  if (granularity === 'hour') {
    return d.getHours().toString().padStart(2, '0') + ':00'
  }
  if (granularity === 'month') {
    return (d.getMonth() + 1) + '月'
  }
  return (d.getMonth() + 1) + '/' + d.getDate()
}

const isToday = (ts: string): boolean => {
  const now = new Date(getCurrentTimeString())
  const d = new Date(ts)
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
}

// ─── Chart ──────────────────────────────────────────────────────
const BAR_COLOR = '#2563eb'
const BAR_COLOR_LIGHT = '#60a5fa'
const BAR_COLOR_TODAY = '#0b4582'
const BAR_COLOR_TODAY_LIGHT = '#3b82f6'

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

  // Merge all points from all series into a single timeline
  const allTimestamps = new Set<string>()
  const valueMap = new Map<string, number>()

  seriesData.forEach(s => {
    s.points.forEach(p => {
      allTimestamps.add(p.timestamp)
      const existing = valueMap.get(p.timestamp) || 0
      valueMap.set(p.timestamp, existing + p.value)
    })
  })

  const sortedTimestamps = Array.from(allTimestamps).sort()
  const xLabels = sortedTimestamps.map(t => formatTimestamp(t, granularity))
  const values = sortedTimestamps.map(t => valueMap.get(t) ?? 0)

  isEmpty.value = sortedTimestamps.length === 0

  if (isEmpty.value) {
    chart.clear()
    return
  }

  // Determine unit from first series
  const unit = seriesData[0]?.unit || 'kWh'

  // Color each bar: highlight TODAY bar
  const barColors = sortedTimestamps.map(ts => {
    if (isToday(ts)) {
      return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: BAR_COLOR_TODAY_LIGHT },
        { offset: 1, color: BAR_COLOR_TODAY }
      ])
    }
    return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: BAR_COLOR_LIGHT },
      { offset: 1, color: BAR_COLOR }
    ])
  })

  // Find max value for markLine reference
  const maxVal = Math.max(...values, 0)

  // TODAY markPoint
  const todayIndex = sortedTimestamps.findIndex(ts => isToday(ts))

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderColor: 'transparent',
      textStyle: { color: '#e2e8f0', fontSize: 12, fontFamily: 'Plus Jakarta Sans, PingFang SC, Microsoft YaHei' },
      axisPointer: {
        type: 'shadow',
        shadowStyle: { color: 'rgba(37, 99, 235, 0.06)' }
      },
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params
        if (!item) return ''
        return `<div style="font-weight:600;margin-bottom:4px">${item.name}</div>
                <div style="display:flex;align-items:center;gap:6px">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${BAR_COLOR}"></span>
                  用电量: <b>${Number(item.value).toLocaleString(undefined, { maximumFractionDigits: 1 })}</b> ${unit}
                </div>`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '4%',
      top: todayIndex >= 0 ? '14%' : '8%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 11,
        fontFamily: 'Plus Jakarta Sans, PingFang SC, Microsoft YaHei'
      },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      name: unit,
      nameTextStyle: {
        color: '#94a3b8',
        fontSize: 11,
        fontFamily: 'Plus Jakarta Sans, PingFang SC, Microsoft YaHei',
        padding: [0, 0, 0, -20]
      },
      splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 11,
        fontFamily: 'Plus Jakarta Sans, PingFang SC, Microsoft YaHei',
        formatter: (val: number) => {
          if (val >= 10000) return (val / 10000).toFixed(1) + '万'
          if (val >= 1000) return (val / 1000).toFixed(1) + 'k'
          return String(val)
        }
      },
      axisLine: { show: false }
    },
    series: [
      {
        name: '用电量',
        type: 'bar',
        barWidth: '45%',
        barMaxWidth: 36,
        data: values.map((v, i) => ({
          value: v,
          itemStyle: { color: barColors[i] as any }
        })),
        itemStyle: {
          borderRadius: [4, 4, 0, 0]
        },
        // TODAY markPoint
        markPoint: todayIndex >= 0 ? {
          data: [
            {
              coord: [todayIndex, values[todayIndex]],
              symbol: 'pin',
              symbolSize: 42,
              symbolOffset: [0, -8],
              itemStyle: {
                color: BAR_COLOR_TODAY
              },
              label: {
                show: true,
                formatter: 'TODAY',
                fontSize: 9,
                fontWeight: 700,
                color: '#fff'
              }
            }
          ],
          animation: true
        } : undefined,
        // Average line
        markLine: maxVal > 0 ? {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', color: '#94a3b8', width: 1 },
          label: {
            position: 'insideEndTop',
            formatter: '均值',
            fontSize: 11,
            color: '#94a3b8'
          },
          data: [{ type: 'average' }]
        } : undefined
      }
    ],
    animationDuration: 600,
    animationEasing: 'cubicOut'
  }

  chart.setOption(option, true)
}

// ─── Data Fetching ──────────────────────────────────────────────
const fetchTrend = async () => {
  loading.value = true
  isEmpty.value = false
  try {
    const raw = await getEnergyTrendData({
      meter: 'electricity',
      start_time: props.startTime,
      end_time: props.endTime,
      granularity: granularityMap[currentRange.value]
    })
    const data = unwrap(raw)
    const series: EnergySeries[] = data?.series ?? []

    loading.value = false
    await nextTick()
    initChart()
    renderChart(series, granularityMap[currentRange.value]!)
  } catch (err: any) {
    console.error('趋势数据加载失败:', err.message)
    loading.value = false
    isEmpty.value = true
    await nextTick()
    initChart()
    renderChart([], 'day')
  }
}

const switchRange = (range: GranularityKey) => {
  currentRange.value = range
  fetchTrend()
}

// ─── Watch props for time range changes ─────────────────────────
watch(
  () => [props.startTime, props.endTime],
  () => {
    if (props.startTime && props.endTime) {
      fetchTrend()
    }
  }
)

// ─── Lifecycle ──────────────────────────────────────────────────
const handleResize = () => chart?.resize()

onMounted(async () => {
  await nextTick()
  initChart()
  if (props.startTime && props.endTime) {
    fetchTrend()
  }
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.trend-panel {
  background: #ffffff;
  border-radius: 14px;
  padding: 22px 24px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 14px rgba(15, 23, 42, 0.03);
  border: 1px solid #e8ecf1;
  animation: panelReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  transform: translateY(12px);
}

@keyframes panelReveal {
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Header ─────────────────────────────────────────────────── */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
}

.panel-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.panel-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-icon {
  font-size: 18px;
  display: flex;
  align-items: center;
  color: #0b4582;
}

.panel-subtitle {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
}

/* ─── Range Tabs ─────────────────────────────────────────────── */
.range-tabs {
  display: flex;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 3px;
  flex-shrink: 0;
}

.range-tabs button {
  border: none;
  background: transparent;
  padding: 6px 18px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Plus Jakarta Sans', -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.range-tabs button:hover {
  color: #0f172a;
}

.range-tabs button.active {
  background: #ffffff;
  color: #0b4582;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

/* ─── Chart ──────────────────────────────────────────────────── */
.chart-wrapper {
  position: relative;
  width: 100%;
  height: 320px;
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
  color: #0b4582;
  animation: spin 1s linear infinite;
  display: flex;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #94a3b8;
  font-size: 14px;
}

.empty-chart-icon {
  font-size: 36px;
  opacity: 0.4;
  display: flex;
}
</style>
