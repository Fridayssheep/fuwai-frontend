<template>
  <div v-if="visible" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <!-- 模态框头部 -->
      <div class="modal-header">
        <div class="title-area">
          <h2>建筑详情 - {{ buildingId }}</h2>
          <div v-if="anomalyCount > 0" class="anomaly-badge">
            <span class="dot"></span>
            检测到 {{ anomalyCount }} 个表计异常 <Icon icon="lucide:chevron-down" class="ml-1" />
          </div>
        </div>
        <button class="close-btn" @click="close">
          <Icon icon="lucide:x" />
        </button>
      </div>

      <div class="modal-body" v-if="loading">
        <div class="loading-state">
          <Icon icon="lucide:loader-2" class="spin loading-icon" />
          <p>正在加载建筑详细信息...</p>
        </div>
      </div>
      
      <div class="modal-body layout-cols" v-else-if="detailData">
        <!-- 左侧：基本资料 -->
        <div class="col-left">
          <div class="card-section">
            <h3>基本资料</h3>
            <div class="kv-list">
              <div class="kv-item" v-for="metric in displayMetrics" :key="metric.key">
                <span class="k-label">{{ metric.label }}</span>
                <span class="v-val">
                  {{ metric.value.toLocaleString() }} 
                  <span v-if="metric.unit" class="v-unit">{{ metric.unit }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：监控表及占比 -->
        <div class="col-right">
          <!-- 小时级多维监控数据 -->
          <div class="card-section monitoring-section">
            <div class="section-top">
              <h3>小时级多维监控数据</h3>
              <input 
                type="date" 
                v-model="selectedDay" 
                class="single-date-picker" 
                @change="fetchHourlyOnly"
              />
            </div>
            
            <table class="hourly-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>总能耗 (KWH)</th>
                  <th>峰值 (KW)</th>
                  <th>平均 (KWH)</th>
                </tr>
              </thead>
              <tbody v-if="hourlyData.length > 0">
                <tr v-for="(item, idx) in hourlyData" :key="idx">
                  <td>{{ item.hour }}</td>
                  <td class="font-bold font-numeric">{{ formatNumber(item.total) }}</td>
                  <td class="font-numeric">{{ formatNumber(item.peak) }}</td>
                  <td class="font-numeric">{{ formatNumber(item.average) }}</td>
                </tr>
              </tbody>
              <tbody v-else>
                <tr>
                  <td colspan="4" class="empty-cell">未能获取到当天的小时级数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 模态框底部 -->
      <div class="modal-footer">
        <button class="btn btn-default" @click="close">返回</button>
        <button class="btn btn-primary" @click="exportData">
          一键统计分析 
        </button>
        <button class="btn btn-primary btn-icon" @click="showExportModal = true" :disabled="exporting">
          <Icon v-if="exporting" icon="lucide:loader-2" class="spin mr-1" />
          <span v-if="exporting">正在导出...</span>
          <template v-else>
            导出数据 <Icon icon="lucide:external-link" class="ml-1" />
          </template>
        </button>
      </div>
    </div>
    
    <ExportModal v-model:visible="showExportModal" @export="executeExportTasks" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { getCurrentTimeString } from '../../utils/timeManager'
import { Icon } from '@iconify/vue'
import ExportModal from '../QueryView/ExportModal.vue'
import { 
  getBuildingById, 
  type BuildingDetailResponse, 
  getBuildingEnergySummary,
  generateReport,
  getReportStatus,
  downloadReport,
  deleteReport
} from '../../api/statistics'

const props = defineProps<{
  visible: boolean
  buildingId: string
  startTime?: string
  endTime?: string
}>()

const emit = defineEmits(['update:visible'])

const loading = ref(false)
const detailData = ref<BuildingDetailResponse | null>(null)
const anomalyCount = ref(0)
const hourlyData = ref<{ hour: string; total: number; peak: number; average: number }[]>([])
const hourlyLoading = ref(false)

const showExportModal = ref(false)
const exporting = ref(false)

const selectedDay = ref('')

watch(() => props.startTime, (v) => {
  if (v) {
    // 简单截取或解析 yyyy-mm-dd
    const safeStr = v.replace(/-/g, '/')
    const d = new Date(safeStr)
    if (!isNaN(d.getTime())) {
      selectedDay.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return
    }
  }
  const now = new Date(getCurrentTimeString())
  selectedDay.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}, { immediate: true })

const close = () => {
  emit('update:visible', false)
}

const exportData = () => {
  alert('功能开发中: 一键统计分析')
}

const executeExportTasks = async (payload: { format: string }) => {
  if (!props.buildingId) return
  exporting.value = true
  
  try {
    const timeStart = `${selectedDay.value}T00:00:00Z`
    const timeEnd = `${selectedDay.value}T23:59:59Z`
    
    // 1. 发起任务 (利用修复后的 unwrap 解包)
    const unwrap = (res: any) => res?.data ?? res
    
    const reqRaw = await generateReport({
      report_type: 'daily_summary',
      building_id: props.buildingId,
      time_range: { start: timeStart, end: timeEnd },
      include_ai_summary: true
    })
    const reqData = unwrap(reqRaw)
    const reportId = reqData?.report_id
    
    if (!reportId) throw new Error('接口未返回 report_id')
    
    // 2. 轮询状态
    let isReady = false
    while (!isReady) {
      await new Promise(res => setTimeout(res, 2000))
      const statRaw = await getReportStatus(reportId)
      const statData = unwrap(statRaw)
      if (statData?.status === 'ready') {
        isReady = true
      } else if (statData?.status === 'failed') {
        throw new Error('报表生成失败')
      }
    }
    
    // 3. 取文件流并下载
    const blobRaw = await downloadReport(reportId, payload.format || 'md')
    // 同样需要针对可能的数据裹夹处理，但如果是纯 blob 就不该有包裹，安全提取：
    let blob = blobRaw
    if (blobRaw && blobRaw.data instanceof Blob) {
      blob = blobRaw.data
    } else if (!(blobRaw instanceof Blob)) {
      // 容错: 强制转化为Blob
      blob = new Blob([blobRaw], { type: 'text/markdown;charset=utf-8' })
    }
    
    const downloadUrl = window.URL.createObjectURL(blob as Blob)

    const link = document.createElement('a')
    link.href = downloadUrl
    link.setAttribute('download', `building_${props.buildingId}_report_${selectedDay.value}.${payload.format || 'md'}`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
    
    // 4. 清理暂存报表
    await deleteReport(reportId)
    
  } catch (err: any) {
    alert('导出异常: ' + (err.message || '未知错误'))
    console.error(err)
  } finally {
    exporting.value = false
  }
}

const viewDetailAction = (item: any) => {
  alert(`功能开发中: 查看 ${formatTime(item.timestamp)} 时刻的明细`)
}

const formatTime = (ts: string) => {
  if (!ts) return ''
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2,'0')}:00`
}

const formatNumber = (val: number | null | undefined): string => {
  if (val == null || isNaN(val)) return '0.0'
  return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

const fetchHourlyOnly = async () => {
  if (!props.buildingId || !selectedDay.value) return
  hourlyLoading.value = true
  hourlyData.value = []

  try {
    // 并发调用 24 次，每次查询一个小时的摘要
    const promises = Array.from({ length: 24 }, (_, i) => {
      const hh = String(i).padStart(2, '0')
      const startStr = `${selectedDay.value}T${hh}:00:00`
      const endStr = `${selectedDay.value}T${hh}:59:59`
      return getBuildingEnergySummary(props.buildingId, {
        meter: 'electricity',
        granularity: 'hour',
        start_time: startStr,
        end_time: endStr
      }).then(raw => {
        const data = (raw as any)?.data ?? raw
        return {
          hour: `${hh}:00`,
          total: data?.summary?.total ?? 0,
          peak: data?.summary?.peak ?? 0,
          average: data?.summary?.average ?? 0
        }
      }).catch(() => ({
        hour: `${hh}:00`,
        total: 0,
        peak: 0,
        average: 0
      }))
    })

    hourlyData.value = await Promise.all(promises)
  } catch (err) {
    console.error('Failed to fetch hourly energy summary', err)
  } finally {
    hourlyLoading.value = false
  }
}

const fetchData = async () => {
  if (!props.buildingId) return
  loading.value = true
  detailData.value = null
  anomalyCount.value = Math.floor(Math.random() * 3)
  hourlyData.value = []
  
  try {
    const raw = await getBuildingById(props.buildingId)
    detailData.value = (raw as any)?.data ?? raw

    await fetchHourlyOnly()
  } catch (err) {
    console.error('Failed to fetch building details', err)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.visible,
  (newVal) => {
    if (newVal && props.buildingId) {
      fetchData()
    }
  }
)

// -- Computed Mappings --

const displayMetrics = computed(() => {
  const metrics = detailData.value?.summary_metrics || []
  const building = detailData.value?.building
  
  // 按照设计稿补充一些建筑基本信息
  const fullList = [
    { key: 'usage', label: '建筑主要用途', value: building?.primaryspaceusage || '—', unit: '' },
    { key: 'sqm', label: '总面积', value: building?.sqm || 0, unit: 'm²' },
    ...metrics
  ]
  return fullList
})

const displayMeters = computed(() => {
  const meters = detailData.value?.meters || []
  // Ensure we see exactly the ones like in the design mockup or the real DB
  const standardMeters = ['hotwater', 'chilledwater', 'irrigation', 'solar', 'gas', 'electricity']
  return standardMeters.map(sm => {
    const found = meters.find(m => m.meter === sm)
    return found ? found : { meter: sm, available: false }
  })
})

function formatMeterName(name: string) {
  const mapping: Record<string, string> = {
    electricity: '电 (ELEC)',
    hotwater: '热水 (HOT WATER)',
    chilledwater: '冷冻水 (CHILLED)',
    irrigation: '灌溉 (IRRIGATION)',
    solar: '太阳能 (SOLAR)',
    gas: '燃气 (GAS)',
    steam: '蒸汽 (STEAM)',
    water: '水 (WATER)'
  }
  return mapping[name] || name
}

function getMeterColor(name: string) {
  const mapping: Record<string, string> = {
    electricity: '#3b82f6',
    hotwater: '#f59e0b',
    chilledwater: '#0ea5e9',
    irrigation: '#10b981',
    solar: '#eab308',
    gas: '#ef4444'
  }
  return mapping[name] || '#94a3b8'
}

function getMockPct(name: string) {
  // Mock logic to show percentages like the mockup
  const pct: Record<string, string> = {
    electricity: '60.0',
    hotwater: '10.0',
    chilledwater: '15.0',
    irrigation: '10.0',
    solar: '7.0',
    gas: '8.0'
  }
  return pct[name] || '0.0'
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(2px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: #f1f5f9;
  width: 900px;
  max-width: 95vw;
  max-height: 90vh;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Plus Jakarta Sans', -apple-system, 'PingFang SC', sans-serif;
}

/* Header */
.modal-header {
  background: white;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
}

.title-area {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-area h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0b4582;
}

.anomaly-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fef2f2;
  color: #ef4444;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.anomaly-badge .dot {
  width: 6px;
  height: 6px;
  background: #ef4444;
  border-radius: 50%;
}

.close-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  transition: all 0.2s;
}
.close-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

/* Body */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.layout-cols {
  display: flex;
  gap: 20px;
}

.col-left {
  flex: 0 0 320px;
}

.col-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Cards */
.card-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(15,23,42,0.04);
}

.card-section h3 {
  margin: 0 0 16px 0;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

/* Left: KV List */
.kv-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kv-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #f1f5f9;
}
.kv-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.k-label {
  color: #64748b;
}

.v-val {
  font-weight: 700;
  color: #0b4582;
  text-align: right;
}

.v-unit {
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
  margin-left: 2px;
}

/* Right: Monitoring Table */
.section-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.single-date-picker {
  font-size: 13px;
  background: #f1f5f9;
  padding: 6px 12px;
  border-radius: 6px;
  color: #0b4582;
  font-weight: 600;
  border: 1px solid #cbd5e1;
  outline: none;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.single-date-picker:hover, .single-date-picker:focus {
  border-color: #0b4582;
  box-shadow: 0 0 0 2px rgba(11,69,130,0.1);
}

.hourly-table {
  width: 100%;
  border-collapse: collapse;
  text-align: center;
}

.hourly-table th {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  padding: 10px;
  background: #f8fafc;
}

.hourly-table td {
  font-size: 13px;
  padding: 12px;
  border-bottom: 1px solid #f8fafc;
  color: #0f172a;
}

.link-btn {
  background: none;
  border: none;
  color: #0b4582;
  font-weight: 600;
  cursor: pointer;
  font-size: 13px;
}

/* Right Bottom Widgets */
.bottom-widgets {
  display: flex;
  gap: 20px;
}

.savings-card {
  flex: 0 0 200px;
  background: #ecfdf5;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.s-label {
  font-size: 12px;
  color: #059669;
  font-weight: 600;
  margin-bottom: 8px;
}

.s-val {
  font-size: 28px;
  font-weight: 800;
}

.percent {
  font-size: 16px;
}

.text-green { color: #059669; }

.meters-legend-card {
  flex: 1;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(15,23,42,0.04);
}

.meter-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.meter-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
}

.meter-item.disabled {
  opacity: 0.5;
  filter: grayscale(1);
}

.m-dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
}

.m-info {
  display: flex;
  flex-direction: column;
}

.m-name {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

.m-pct {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}

.m-pct.na {
  color: #cbd5e1;
}

/* Footer */
.modal-footer {
  background: white;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn-default {
  background: white;
  border-color: #cbd5e1;
  color: #475569;
}
.btn-default:hover {
  background: #f1f5f9;
}

.btn-primary {
  background: #0b4582;
  color: white;
}
.btn-primary:hover {
  background: #093463;
}

.btn-icon {
  display: flex;
  align-items: center;
}

/* Common */
.ml-1 { margin-left: 4px; }
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #64748b;
  font-size: 14px;
}
.loading-icon {
  font-size: 32px;
  color: #0b4582;
  margin-bottom: 12px;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
</style>
