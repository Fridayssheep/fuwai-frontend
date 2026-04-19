<template>
  <div class="panel">
    <div class="head">
      <h3>分建筑用能绩效表</h3>
      <div class="head-right">
        <span class="update-time">统计截止 {{ statisticsEndText }}</span>
        <button class="icon-btn" @click="fetchData" :disabled="loading">
          <Icon icon="lucide:refresh-cw" :class="{ spin: loading }" />
        </button>
      </div>
    </div>

    <div class="table-wrap">
      <AutoHeightTransition>
        <table class="table">
        <colgroup>
          <col class="building-id-col" />
          <col class="meter-count-col" />
          <col class="energy-total-col" />
          <col class="eui-col" />
          <col class="status-col" />
          <col class="action-table-col" />
        </colgroup>
        <thead>
          <tr>
            <th>建筑ID</th>
            <th>设备数量</th>
            <th>期间累计(KWH)</th>
            <th>单位面积能耗</th>
            <th>状态</th>
            <th class="action-col">操作</th>
          </tr>
        </thead>
        <tbody v-if="loading && tableData.length === 0">
          <tr>
            <td colspan="6" class="state"><Icon icon="lucide:loader-2" class="spin" />数据加载中...</td>
          </tr>
        </tbody>
        <tbody v-else-if="!loading && tableData.length === 0">
          <tr>
            <td colspan="6" class="state">暂无建筑数据</td>
          </tr>
        </tbody>
        <TransitionGroup v-else name="table-rise" tag="tbody" class="table-rise-body">
          <tr
            v-for="(row, index) in tableData"
            :key="row.building_id"
            :style="{ transitionDelay: `${Math.min(index, 8) * 34}ms` }"
          >
            <td class="strong id-cell" :title="row.building_id">{{ row.building_id }}</td>
            <td>{{ row.meterCount }}</td>
            <td class="strong">{{ formatNumber(row.energyTotal) }}</td>
            <td>{{ formatNumber(row.eui) }} KWH/m²</td>
            <td><span class="status" :class="row.status">{{ row.statusText }}</span></td>
            <td class="action-cell">
              <div class="row-actions">
                <button class="link" type="button" @click="viewDetails(row)">详情</button>
                <button class="link primary-link" type="button" @click="emitGenerate(row)">生成报表</button>
              </div>
            </td>
          </tr>
        </TransitionGroup>
        </table>
      </AutoHeightTransition>
    </div>

    <div class="pager" v-if="paginationInfo.total > 0">
      <span>共 {{ paginationInfo.total }} 栋建筑</span>
      <div class="pager-actions">
        <button class="page-btn" :disabled="currentPage === 1" @click="changePage(currentPage - 1)">上一页</button>
        <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button class="page-btn" :disabled="currentPage >= totalPages" @click="changePage(currentPage + 1)">下一页</button>
      </div>
    </div>

    <BuildingDetailsModal
      v-model:visible="modalVisible"
      :building-id="selectedBuildingId"
      :start-time="startTime"
      :end-time="endTime"
      @generate-report="emit('generate-report', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { getBuildings, getBuildingEnergySummary, getMeters } from '../../api/statistics'
import BuildingDetailsModal from './BuildingDetailsModal.vue'
import type { ReportSourceContext } from './reportWorkbenchTypes'
import AutoHeightTransition from '../common/AutoHeightTransition.vue'

const props = defineProps<{ startTime: string; endTime: string }>()
const emit = defineEmits<{ (e: 'generate-report', payload: ReportSourceContext): void }>()

interface BuildingRow {
  building_id: string
  meterCount: number
  energyTotal: number
  eui: number
  status: 'normal' | 'warning' | 'fault'
  statusText: string
}

interface BuildingTableCacheEntry {
  items: BuildingRow[]
  total: number
}

const buildingTableCache = new Map<string, BuildingTableCacheEntry>()

const tableData = ref<BuildingRow[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(5)
const paginationInfo = ref({ total: 0 })
const totalPages = computed(() => Math.max(1, Math.ceil(paginationInfo.value.total / pageSize.value)))
const modalVisible = ref(false)
const selectedBuildingId = ref('')
let buildingRequestSeq = 0

const unwrap = (res: any) => res?.data ?? res
const formatNumber = (val: number | null | undefined) => val == null || Number.isNaN(val) ? '-' : val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const formatTime = (iso?: string | null) => !iso ? '-' : (Number.isNaN(new Date(iso).getTime()) ? iso : new Date(iso).toLocaleString('zh-CN'))
const statisticsEndText = computed(() => formatTime(props.endTime))
const buildBuildingCacheKey = () => `${props.startTime}__${props.endTime}__${currentPage.value}__${pageSize.value}`

const mapWithConcurrency = async <T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length)
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      const currentItem = items[currentIndex] as T
      results[currentIndex] = await mapper(currentItem)
    }
  })
  await Promise.all(workers)
  return results
}

const changePage = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  fetchData()
}

const fetchData = async () => {
  if (!props.startTime || !props.endTime) return
  const cacheKey = buildBuildingCacheKey()
  const cached = buildingTableCache.get(cacheKey)
  if (cached) {
    tableData.value = cached.items
    paginationInfo.value.total = cached.total
    return
  }
  const requestId = ++buildingRequestSeq
  loading.value = true
  tableData.value = []
  try {
    const buildData = unwrap(await getBuildings({ page: currentPage.value, page_size: pageSize.value }))
    if (requestId !== buildingRequestSeq) return
    const items = buildData?.items || []
    paginationInfo.value.total = buildData?.pagination?.total || 0

    const rows = await mapWithConcurrency(items, 2, async (building: any) => {
      const bid = building.building_id
      let meterCount = 0
      let status: BuildingRow['status'] = 'normal'
      let statusText = '正常运行'

      try {
        const meterData = unwrap(await getMeters({ building_id: bid, start_time: props.startTime, end_time: props.endTime, page_size: 100 }))
        const meterItems = meterData?.items || []
        meterCount = meterData?.pagination?.total || 0
        if (meterItems.some((item: any) => item.status === 'fault')) {
          status = 'fault'
          statusText = '故障停机'
        } else if (meterItems.some((item: any) => item.status === 'warning')) {
          status = 'warning'
          statusText = '告警状态'
        } else if (meterItems.some((item: any) => item.status === 'offline') || meterItems.length === 0) {
          status = 'warning'
          statusText = meterItems.length === 0 ? '未接入设备' : '部分离线'
        }
      } catch (error) {
        console.error(`Failed to fetch meters for ${bid}`, error)
      }

      let energyTotal = 0
      try {
        const queryData = unwrap(await getBuildingEnergySummary(bid, { meter: 'electricity', start_time: props.startTime, end_time: props.endTime, granularity: 'month' }))
        energyTotal = queryData?.summary?.total || 0
      } catch (error) {
        console.error(`Failed to fetch energy for ${bid}`, error)
      }

      const sqm = building.sqm || 0
      return { building_id: bid, meterCount, energyTotal, eui: sqm > 0 ? energyTotal / sqm : 0, status, statusText }
    })
    if (requestId !== buildingRequestSeq) return
    tableData.value = rows
    buildingTableCache.set(cacheKey, { items: tableData.value, total: paginationInfo.value.total })
  } finally {
    if (requestId === buildingRequestSeq) loading.value = false
  }
}

const viewDetails = (row: BuildingRow) => {
  selectedBuildingId.value = row.building_id
  modalVisible.value = true
}

const emitGenerate = (row: BuildingRow) => {
  emit('generate-report', { sourceType: 'building', sourceId: row.building_id, sourceLabel: row.building_id, buildingId: row.building_id })
}

watch(() => [props.startTime, props.endTime], () => { currentPage.value = 1; fetchData() })
onMounted(fetchData)
</script>

<style scoped>
.panel{background:#fff;border:1px solid #e8ecf1;border-radius:14px;padding:24px;box-shadow:0 1px 3px rgba(15,23,42,.04),0 4px 14px rgba(15,23,42,.03)}
.head,.head-right,.pager,.pager-actions{display:flex;align-items:center;justify-content:space-between;gap:12px}.head{margin-bottom:20px}.head h3{margin:0;font-size:16px;color:#0f172a}.update-time{font-size:12px;color:#94a3b8}.icon-btn,.page-btn,.link{border:none;background:transparent;cursor:pointer}.icon-btn{padding:4px;color:#0b4582}.table-wrap{overflow:auto}.table{width:100%;min-width:800px;border-collapse:collapse;table-layout:fixed}.building-id-col{width:170px}.meter-count-col{width:104px}.energy-total-col{width:158px}.eui-col{width:150px}.status-col{width:120px}.action-table-col{width:150px}.table th,.table td{padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:left;font-size:13px;vertical-align:middle;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.table th{font-size:12px;color:#64748b}.action-col,.action-cell{width:150px;min-width:150px;white-space:nowrap}.row-actions{display:inline-flex;align-items:center;justify-content:flex-start;gap:18px;white-space:nowrap}.state{text-align:center;color:#64748b}.strong{font-weight:700}.id-cell{font-family:var(--font-mono);color:#0f172a}.status{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700}.status.normal{background:#ecfdf5;color:#059669}.status.warning{background:#fff7ed;color:#c2410c}.status.fault{background:#fef2f2;color:#dc2626}.link{color:#0b4582;padding:0;line-height:1;white-space:nowrap}.primary-link{font-weight:700}.pager{margin-top:16px}.page-btn{padding:6px 12px;border-radius:8px;background:#eef2f7}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
</style>
