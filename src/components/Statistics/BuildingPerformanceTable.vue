<template>
  <div class="panel">
    <div class="head">
      <h3>分建筑用能绩效表</h3>
      <div class="head-right">
        <span class="update-time">最后更新 {{ lastUpdated }}</span>
        <button class="icon-btn" @click="fetchData" :disabled="loading">
          <Icon icon="lucide:refresh-cw" :class="{ spin: loading }" />
        </button>
      </div>
    </div>

    <div class="table-wrap">
      <table class="table">
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
        <tbody>
          <tr v-if="loading && tableData.length === 0">
            <td colspan="6" class="state"><Icon icon="lucide:loader-2" class="spin" />数据加载中...</td>
          </tr>
          <tr v-else-if="!loading && tableData.length === 0">
            <td colspan="6" class="state">暂无建筑数据</td>
          </tr>
          <tr v-for="row in tableData" :key="row.building_id">
            <td class="strong">{{ row.building_id }}</td>
            <td>{{ row.meterCount }}</td>
            <td class="strong">{{ formatNumber(row.energyTotal) }}</td>
            <td>{{ formatNumber(row.eui) }} KWH/m²</td>
            <td><span class="status" :class="row.status">{{ row.statusText }}</span></td>
            <td class="actions">
              <button class="link" type="button" @click="viewDetails(row)">详情</button>
              <button class="link primary-link" type="button" @click="emitGenerate(row)">生成报表</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pager" v-if="paginationInfo.total > 0">
      <span>共 {{ paginationInfo.total }} 栋建筑</span>
      <div class="pager-actions">
        <button class="page-btn" :disabled="currentPage === 1" @click="changePage(currentPage - 1)">上一页</button>
        <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button class="page-btn" :disabled="currentPage >= totalPages" @click="changePage(currentPage + 1)">下一页</button>
      </div>
    </div>

    <BuildingDetailsModal v-model:visible="modalVisible" :building-id="selectedBuildingId" :start-time="startTime" :end-time="endTime" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { getCurrentTimeString } from '../../utils/timeManager'
import { getBuildings, getEnergyQuery, getMeters } from '../../api/statistics'
import BuildingDetailsModal from './BuildingDetailsModal.vue'
import type { ReportSourceContext } from './reportWorkbenchTypes'

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

const tableData = ref<BuildingRow[]>([])
const loading = ref(false)
const lastUpdated = ref('')
const currentPage = ref(1)
const pageSize = ref(5)
const paginationInfo = ref({ total: 0 })
const totalPages = computed(() => Math.max(1, Math.ceil(paginationInfo.value.total / pageSize.value)))
const modalVisible = ref(false)
const selectedBuildingId = ref('')

const unwrap = (res: any) => res?.data ?? res
const formatNumber = (val: number | null | undefined) => val == null || Number.isNaN(val) ? '-' : val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const changePage = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  fetchData()
}

const fetchData = async () => {
  if (!props.startTime || !props.endTime) return
  loading.value = true
  try {
    const buildData = unwrap(await getBuildings({ page: currentPage.value, page_size: pageSize.value }))
    const items = buildData?.items || []
    paginationInfo.value.total = buildData?.pagination?.total || 0

    tableData.value = await Promise.all(items.map(async (building: any) => {
      const bid = building.building_id
      let meterCount = 0
      let status: BuildingRow['status'] = 'normal'
      let statusText = '正常运行'

      try {
        const meterData = unwrap(await getMeters({ building_id: bid }))
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
        const queryData = unwrap(await getEnergyQuery({ building_ids: [bid], start_time: props.startTime, end_time: props.endTime, granularity: 'month' }))
        energyTotal = queryData?.summary?.total || 0
      } catch (error) {
        console.error(`Failed to fetch energy for ${bid}`, error)
      }

      const sqm = building.sqm || 0
      return { building_id: bid, meterCount, energyTotal, eui: sqm > 0 ? energyTotal / sqm : 0, status, statusText }
    }))

    const now = new Date(getCurrentTimeString())
    lastUpdated.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  } finally {
    loading.value = false
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
.head,.head-right,.pager,.pager-actions,.actions{display:flex;align-items:center;justify-content:space-between;gap:12px}.head{margin-bottom:20px}.head h3{margin:0;font-size:16px;color:#0f172a}.update-time{font-size:12px;color:#94a3b8}.icon-btn,.page-btn,.link{border:none;background:transparent;cursor:pointer}.icon-btn{padding:4px;color:#0b4582}.table-wrap{overflow:auto}.table{width:100%;border-collapse:collapse}.table th,.table td{padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:left;font-size:13px}.table th{font-size:12px;color:#64748b}.state{text-align:center;color:#64748b}.strong{font-weight:700}.status{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700}.status.normal{background:#ecfdf5;color:#059669}.status.warning{background:#fff7ed;color:#c2410c}.status.fault{background:#fef2f2;color:#dc2626}.actions{justify-content:flex-start}.link{color:#0b4582;padding:0}.primary-link{font-weight:700}.pager{margin-top:16px}.page-btn{padding:6px 12px;border-radius:8px;background:#eef2f7}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
</style>
