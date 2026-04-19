<template>
  <div class="panel">
    <div class="head">
      <h3>设备运行监测表</h3>
      <div class="head-right">
        <ThemedSelect
          v-model="filterMeterType"
          class="head-select"
          size="sm"
          aria-label="设备类型筛选"
          :options="meterTypeOptions"
          @change="onFilterChange"
        />
        <ThemedSelect
          v-model="filterStatus"
          class="head-select"
          size="sm"
          aria-label="设备状态筛选"
          :options="statusOptions"
          @change="onFilterChange"
        />
        <span class="update-time">统计截止 {{ statisticsEndText }}</span>
        <button class="icon-btn" @click="fetchData" :disabled="loading">
          <Icon icon="lucide:refresh-cw" :class="{ spin: loading }" />
        </button>
      </div>
    </div>

    <div v-if="loadError" class="error-banner">
      <Icon icon="lucide:alert-circle" />
      <span>{{ loadError }}</span>
      <button class="retry-btn" type="button" @click="fetchData">重试</button>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>设备名称</th>
            <th>类型</th>
            <th>所属建筑</th>
            <th>状态</th>
            <th>最后活跃时间</th>
            <th class="action-col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading && tableData.length === 0">
            <td colspan="6" class="state"><Icon icon="lucide:loader-2" class="spin" />设备数据加载中...</td>
          </tr>
          <tr v-else-if="!loading && tableData.length === 0">
            <td colspan="6" class="state">暂无设备数据</td>
          </tr>
          <tr v-for="row in tableData" :key="row.meter_id">
            <td class="strong">{{ row.meter_name || row.meter_id }}</td>
            <td>{{ getMeterTypeLabel(row.meter_type) }}</td>
            <td>{{ row.building_id }}</td>
            <td><span class="status" :class="row.status">{{ getStatusText(row.status) }}</span></td>
            <td>{{ formatLastSeen(row.last_seen_at) }}</td>
            <td class="action-cell">
              <div class="row-actions">
                <button class="link" type="button" @click="viewDetails(row)">详情</button>
                <button class="link primary-link" type="button" @click="emitGenerate(row)">生成报表</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pager" v-if="paginationInfo.total > 0">
      <span>共 {{ paginationInfo.total }} 台设备</span>
      <div class="pager-actions">
        <button class="page-btn" :disabled="currentPage === 1" @click="changePage(currentPage - 1)">上一页</button>
        <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button class="page-btn" :disabled="currentPage >= totalPages" @click="changePage(currentPage + 1)">下一页</button>
      </div>
    </div>

    <MeterDetailsModal v-model:visible="modalVisible" :meter-id="selectedMeterId" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { getMeters } from '../../api/statistics'
import MeterDetailsModal from './MeterDetailsModal.vue'
import type { ReportSourceContext } from './reportWorkbenchTypes'
import ThemedSelect from '../common/ThemedSelect.vue'

interface MeterTableCacheEntry {
  items: MeterRow[]
  total: number
}

const meterTableCache = new Map<string, MeterTableCacheEntry>()

const props = defineProps<{ startTime: string; endTime: string }>()
const emit = defineEmits<{ (e: 'generate-report', payload: ReportSourceContext): void }>()

interface MeterRow {
  meter_id: string
  meter_name: string
  meter_type: string
  building_id: string
  status: string
  last_seen_at: string | null
}

const meterTypes = [
  { value: 'electricity', label: '电力' }, { value: 'chilledwater', label: '冷冻水' }, { value: 'steam', label: '蒸汽' }, { value: 'gas', label: '燃气' },
  { value: 'hotwater', label: '热水' }, { value: 'water', label: '水' }, { value: 'irrigation', label: '灌溉' }, { value: 'solar', label: '光伏' }
]
const meterTypeOptions = [{ value: '', label: '全部类型' }, ...meterTypes]
const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'online', label: '在线' },
  { value: 'warning', label: '告警' },
  { value: 'fault', label: '故障' },
  { value: 'offline', label: '离线' }
]

const tableData = ref<MeterRow[]>([])
const loading = ref(false)
const loadError = ref('')
const filterMeterType = ref('')
const filterStatus = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const paginationInfo = ref({ total: 0 })
const totalPages = computed(() => Math.max(1, Math.ceil(paginationInfo.value.total / pageSize.value)))
const modalVisible = ref(false)
const selectedMeterId = ref('')
let meterRequestSeq = 0

const unwrap = (res: any) => res?.data ?? res
const getStatusText = (status?: string) => ({ online: '在线', warning: '告警', fault: '故障', offline: '离线' }[status || ''] || status || '-')
const getMeterTypeLabel = (type: string) => meterTypes.find(item => item.value === type)?.label || type || '-'
const formatLastSeen = (iso?: string | null) => !iso ? '-' : (Number.isNaN(new Date(iso).getTime()) ? iso : new Date(iso).toLocaleString('zh-CN'))
const statisticsEndText = computed(() => formatLastSeen(props.endTime))
const buildMeterCacheKey = () => [
  props.startTime,
  props.endTime,
  currentPage.value,
  pageSize.value,
  filterMeterType.value,
  filterStatus.value
].join('__')

const changePage = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  fetchData()
}

const onFilterChange = () => {
  currentPage.value = 1
  fetchData()
}

const fetchData = async () => {
  if (!props.startTime || !props.endTime) return
  const cacheKey = buildMeterCacheKey()
  const cached = meterTableCache.get(cacheKey)
  if (cached) {
    tableData.value = cached.items
    paginationInfo.value.total = cached.total
    loadError.value = ''
    return
  }
  const requestId = ++meterRequestSeq
  loading.value = true
  loadError.value = ''
  tableData.value = []
  try {
    const params: Record<string, any> = { page: currentPage.value, page_size: pageSize.value }
    if (props.startTime) params.start_time = props.startTime
    if (props.endTime) params.end_time = props.endTime
    if (filterMeterType.value) params.meter_type = filterMeterType.value
    if (filterStatus.value) params.status = filterStatus.value

    const data = unwrap(await getMeters(params))
    if (requestId !== meterRequestSeq) return
    paginationInfo.value.total = data?.pagination?.total || 0
    tableData.value = (data?.items || []).map((item: any) => {
      let buildingId = item.building_id
      let meterType = item.meter_type
      if (item.meter_id && item.meter_id.includes('::')) {
        const parts = item.meter_id.split('::')
        if (!buildingId) buildingId = parts[0]
        if (!meterType) meterType = parts[1]
      }
      return { meter_id: item.meter_id, meter_name: item.meter_name || item.meter_id, meter_type: meterType || '', building_id: buildingId || '', status: item.status || 'offline', last_seen_at: item.last_seen_at || null }
    })
    meterTableCache.set(cacheKey, { items: tableData.value, total: paginationInfo.value.total })
  } catch (error) {
    if (requestId !== meterRequestSeq) return
    console.error('设备列表获取失败:', error)
    loadError.value = '设备列表加载失败，请稍后重试。'
  } finally {
    if (requestId === meterRequestSeq) loading.value = false
  }
}

const viewDetails = (row: MeterRow) => {
  selectedMeterId.value = row.meter_id
  modalVisible.value = true
}

const emitGenerate = (row: MeterRow) => {
  emit('generate-report', { sourceType: 'meter', sourceId: row.meter_id, sourceLabel: row.meter_name || row.meter_id, buildingId: row.building_id })
}

watch(() => [props.startTime, props.endTime], () => { currentPage.value = 1; fetchData() })
onMounted(fetchData)
</script>

<style scoped>
.panel{background:#fff;border:1px solid #e8ecf1;border-radius:14px;padding:24px;box-shadow:0 1px 3px rgba(15,23,42,.04),0 4px 14px rgba(15,23,42,.03)}
.head,.head-right,.pager,.pager-actions{display:flex;align-items:center;justify-content:space-between;gap:12px}.head{margin-bottom:20px;flex-wrap:wrap}.head h3{margin:0;font-size:16px;color:#0f172a}.head-right{flex-wrap:wrap}
.head-select{--select-width:auto;--select-min-width:118px;--select-height:36px;--select-padding-x:12px;--select-radius:12px;--select-font-size:13px;--select-font-weight:600;--select-border-color:#cbd5e1;--select-bg:#f8fbff;--select-hover-bg:#eef5fd}
.update-time{font-size:12px;color:#94a3b8}.icon-btn,.page-btn,.link,.retry-btn{border:none;background:transparent;cursor:pointer}.icon-btn{padding:4px;color:#0b4582}.error-banner{display:flex;align-items:center;gap:10px;margin-bottom:16px;padding:12px 14px;border:1px solid #fecaca;border-radius:10px;background:#fff5f5;color:#b42318;font-size:13px}.retry-btn{color:#b42318;font-weight:700}.table-wrap{overflow:auto}.table{width:100%;min-width:920px;border-collapse:collapse}.table th,.table td{padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:left;font-size:13px;vertical-align:middle}.table th{font-size:12px;color:#64748b}.action-col,.action-cell{width:132px;min-width:132px;white-space:nowrap}.row-actions{display:inline-flex;align-items:center;justify-content:flex-start;gap:18px;white-space:nowrap}.state{text-align:center;color:#64748b}.strong{font-weight:700}.status{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700}.status.online{background:#ecfdf5;color:#059669}.status.warning{background:#fff7ed;color:#c2410c}.status.fault{background:#fef2f2;color:#dc2626}.status.offline{background:#f1f5f9;color:#475569}.link{color:#0b4582;padding:0;line-height:1;white-space:nowrap}.primary-link{font-weight:700}.pager{margin-top:16px}.page-btn{padding:6px 12px;border-radius:8px;background:#eef2f7}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
</style>
