<template>
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
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import * as echarts from 'echarts'
import { getCurrentTimeString } from '../../utils/timeManager'
import { getEnergyTrend, type EnergySeries } from '../../api/dashboard'

const trendLoading = ref(false)
const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

type RangeKey = 'day' | 'week' | 'month'
const currentRange = ref<RangeKey>('week')
const rangeOptions: { value: RangeKey; label: string }[] = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' }
]

const unwrap = (res: any) => res?.data ?? res

const fetchTrend = async (range: RangeKey) => {
  trendLoading.value = true
  try {
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

    trendLoading.value = false
    await nextTick()
    initChart()
    renderChart(series, granularity)
    return
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

const handleResize = () => chart?.resize()

onMounted(async () => {
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
/* Common Panel Styles */
.panel {
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius, 14px);
  padding: 22px 24px;
  box-shadow: var(--shadow-card, 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 14px rgba(15, 23, 42, 0.03));
  border: 1px solid var(--color-border, #e8ecf1);
  transition: box-shadow 0.25s ease;
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

/* Chart Panel Specific Styles */
.chart-panel {
  flex: 2;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.range-tabs {
  display: flex;
  background: #f1f5f9;
  padding: 3px;
  border-radius: 8px;
}

.range-tabs button {
  border: none;
  background: transparent;
  padding: 4px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary, #64748b);
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font, sans-serif);
}

.range-tabs button:hover {
  color: var(--color-text, #0f172a);
}

.range-tabs button.active {
  background: white;
  color: var(--color-primary, #0b4582);
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
}

.chart-wrapper {
  position: relative;
  flex: 1;
  min-height: 280px;
}

.chart-area {
  position: absolute;
  inset: 0;
}

.chart-loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.chart-spinner {
  font-size: 28px;
  color: var(--color-primary, #0b4582);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
