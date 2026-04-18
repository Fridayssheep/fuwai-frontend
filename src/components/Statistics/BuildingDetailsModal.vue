<template>
  <Teleport to="body">
    <div v-if="visible" class="overlay" @click.self="close">
      <div class="modal">
        <div class="header">
          <div>
            <h2>建筑详情 - {{ buildingId }}</h2>
            <div v-if="anomalyCount > 0" class="badge">检测到 {{ anomalyCount }} 个异常</div>
          </div>
          <button class="icon-btn" type="button" @click="close"><Icon icon="lucide:x" /></button>
        </div>

        <div v-if="loading" class="body state">
          <Icon icon="lucide:loader-2" class="spin" />
          <p>正在加载建筑详情...</p>
        </div>

        <div v-else-if="detailData" class="body layout">
          <section class="card">
            <h3>基础信息</h3>
            <div class="kv-list">
              <div v-for="metric in displayMetrics" :key="metric.key" class="kv-item">
                <span>{{ metric.label }}</span>
                <strong>{{ metric.value.toLocaleString() }}<small v-if="metric.unit">{{ metric.unit }}</small></strong>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="section-top">
              <h3>小时级监测数据</h3>
              <input v-model="selectedDay" type="date" class="date-input" @change="fetchHourlyOnly" />
            </div>
            <table class="table">
              <thead><tr><th>时间</th><th>总能耗(KWH)</th><th>峰值(KW)</th><th>平均(KWH)</th></tr></thead>
              <tbody v-if="hourlyData.length">
                <tr v-for="(item, idx) in hourlyData" :key="idx"><td>{{ item.hour }}</td><td>{{ formatNumber(item.total) }}</td><td>{{ formatNumber(item.peak) }}</td><td>{{ formatNumber(item.average) }}</td></tr>
              </tbody>
              <tbody v-else><tr><td colspan="4" class="state">未获取到当天小时数据</td></tr></tbody>
            </table>
          </section>
        </div>

        <div class="footer">
          <button class="secondary" type="button" @click="close">返回</button>
          <button class="primary" type="button" :disabled="exporting" @click="exportMarkdown">
            <Icon v-if="exporting" icon="lucide:loader-2" class="spin" />
            <template v-else>导出数据 <Icon icon="lucide:download" /></template>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, Teleport, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { getCurrentTimeString } from '../../utils/timeManager'
import { getBuildingById, getBuildingEnergySummary, type BuildingDetailResponse } from '../../api/statistics'

const props = defineProps<{ visible: boolean; buildingId: string; startTime?: string; endTime?: string }>()
const emit = defineEmits(['update:visible'])

const loading = ref(false)
const detailData = ref<BuildingDetailResponse | null>(null)
const anomalyCount = ref(0)
const hourlyData = ref<{ hour: string; total: number; peak: number; average: number }[]>([])
const exporting = ref(false)
const selectedDay = ref('')

watch(() => props.startTime, value => {
  if (value) {
    const date = new Date(value.replace(/-/g, '/'))
    if (!Number.isNaN(date.getTime())) {
      selectedDay.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      return
    }
  }
  const now = new Date(getCurrentTimeString())
  selectedDay.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}, { immediate: true })

const close = () => emit('update:visible', false)
const unwrap = (res: any) => res?.data ?? res
const formatNumber = (val: number | null | undefined) => val == null || Number.isNaN(val) ? '0.0' : val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const displayMetrics = computed(() => detailData.value?.summary_metrics || [])
const displayMeters = computed(() => detailData.value?.meters || [])

const fetchHourlyOnly = async () => {
  if (!props.buildingId || !selectedDay.value) return
  hourlyData.value = []
  try {
    hourlyData.value = await Promise.all(Array.from({ length: 24 }, async (_, index) => {
      const hh = String(index).padStart(2, '0')
      const data = unwrap(await getBuildingEnergySummary(props.buildingId, { meter: 'electricity', granularity: 'hour', start_time: `${selectedDay.value}T${hh}:00:00`, end_time: `${selectedDay.value}T${hh}:59:59` }))
      return { hour: `${hh}:00`, total: data?.summary?.total ?? 0, peak: data?.summary?.peak ?? 0, average: data?.summary?.average ?? 0 }
    }))
  } catch (error) {
    console.error('fetchHourlyOnly failed', error)
    hourlyData.value = []
  }
}

const fetchDetail = async () => {
  if (!props.visible || !props.buildingId) return
  loading.value = true
  try {
    detailData.value = unwrap(await getBuildingById(props.buildingId))
    anomalyCount.value = displayMeters.value.filter(item => !item.available).length
    await fetchHourlyOnly()
  } finally {
    loading.value = false
  }
}

const formatMeterName = (meter: string) => meter || '-'

const exportMarkdown = () => {
  if (!detailData.value && hourlyData.value.length === 0) return
  exporting.value = true
  try {
    const lines: string[] = []
    lines.push(`# 建筑详情报表 - ${props.buildingId}`, '', `> 导出时间: ${new Date().toLocaleString('zh-CN')}`, `> 数据日期: ${selectedDay.value}`, '', '## 基础信息', '', '| 指标 | 值 |', '|------|-----|')
    for (const metric of displayMetrics.value) lines.push(`| ${metric.label} | ${metric.unit ? `${metric.value.toLocaleString()} ${metric.unit}` : metric.value.toLocaleString()} |`)
    lines.push('')
    if (hourlyData.value.length) {
      lines.push('## 小时级监测数据', '', '| 时间 | 总能耗(KWH) | 峰值(KW) | 平均(KWH) |', '|------|-------------|-----------|-----------|')
      for (const item of hourlyData.value) lines.push(`| ${item.hour} | ${formatNumber(item.total)} | ${formatNumber(item.peak)} | ${formatNumber(item.average)} |`)
      lines.push('')
    }
    const hasMeters = displayMeters.value.some(item => item.available)
    if (hasMeters) {
      lines.push('## 表计可用性', '', '| 表计类型 | 可用 |', '|---------|------|')
      for (const meter of displayMeters.value) lines.push(`| ${formatMeterName(meter.meter)} | ${meter.available ? '是' : '否'} |`)
      lines.push('')
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `building_${props.buildingId}_${selectedDay.value}.md`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}

watch(() => [props.visible, props.buildingId], fetchDetail, { immediate: true })
</script>

<style scoped>
.overlay{position:fixed;inset:0;background:rgba(15,23,42,.35);display:flex;align-items:center;justify-content:center;padding:24px;z-index:9999}.modal{width:min(1100px,100%);background:#fff;border:1px solid #dbe5f0;border-radius:18px;box-shadow:0 24px 60px rgba(15,23,42,.18);display:flex;flex-direction:column;max-height:90vh}.header,.footer,.section-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.header,.footer{padding:18px 20px;border-bottom:1px solid #e8ecf1}.footer{border-top:1px solid #e8ecf1;border-bottom:none}.header h2,.card h3{margin:0;color:#0f172a}.body{padding:20px;overflow:auto}.layout{display:grid;grid-template-columns:320px minmax(0,1fr);gap:16px}.card{border:1px solid #e2e8f0;border-radius:14px;padding:16px;background:#fff}.kv-list{display:flex;flex-direction:column;gap:10px}.kv-item{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:10px;background:#f8fafc}.kv-item span,.kv-item small{color:#64748b}.table{width:100%;border-collapse:collapse}.table th,.table td{padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:left}.badge{display:inline-flex;margin-top:8px;padding:4px 10px;border-radius:999px;background:#fff7ed;color:#c2410c;font-size:12px;font-weight:700}.date-input{min-height:38px;border:1px solid #cbd5e1;border-radius:8px;padding:0 10px}.icon-btn,.primary,.secondary{border:none;border-radius:10px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.icon-btn{width:34px;height:34px;justify-content:center;background:transparent;color:#64748b}.primary,.secondary{min-height:40px;padding:0 16px;font:700 13px inherit}.primary{background:linear-gradient(135deg,#0b4582,#1565c0);color:#fff}.secondary{background:#eef2f7;color:#334155}.state{color:#64748b;text-align:center}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media (max-width:800px){.overlay{padding:12px}.layout{grid-template-columns:1fr}}
</style>
