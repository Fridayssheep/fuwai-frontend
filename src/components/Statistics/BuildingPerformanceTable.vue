<template>
  <div class="performance-panel">
    <div class="panel-header">
      <h3>分建筑用能效绩表</h3>
      <div class="header-right">
        <span class="update-time">数据最后更新: {{ lastUpdated }}</span>
        <button class="refresh-btn" @click="fetchData" :disabled="loading">
          <Icon icon="lucide:refresh-cw" :class="{ 'spin': loading }" />
        </button>
      </div>
    </div>

    <div class="table-container">
      <table class="performance-table">
        <thead>
          <tr>
            <th>建筑ID</th>
            <th>设备数量</th>
            <th>期间累计 (KWH)</th>
            <th>单位面积能耗</th>
            <th>状态</th>
            <th class="action-col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading && tableData.length === 0">
            <td colspan="6" class="loading-cell">
              <Icon icon="lucide:loader-2" class="spin loading-icon" />
              <span>数据检索中，请稍候...</span>
            </td>
          </tr>
          
          <tr v-else-if="!loading && tableData.length === 0">
            <td colspan="6" class="empty-cell">暂无建筑数据</td>
          </tr>

          <tr v-for="row in tableData" :key="row.building_id" class="data-row">
            <td class="font-bold">{{ row.building_id }}</td>
            <td class="font-bold font-numeric">{{ row.meterCount }} 个</td>
            <td class="font-bold font-numeric highlight-val">{{ formatNumber(row.energyTotal) }}</td>
            <td>
              <span class="eui-val font-numeric">{{ formatNumber(row.eui) }}</span> 
              <span class="unit">KWH/㎡</span>
            </td>
            <td>
              <span class="status-badge" :class="row.status">
                <span class="dot"></span>
                {{ row.statusText }}
              </span>
            </td>
            <td class="action-col">
              <button class="action-link" type="button" @click="viewDetails(row)">详情</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="panel-footer pagination" v-if="paginationInfo.total > 0">
      <div class="pagination-info">
        共计 {{ paginationInfo.total }} 栋建筑
      </div>
      <div class="pagination-controls">
        <button 
          class="page-btn" 
          :disabled="currentPage === 1" 
          @click="changePage(currentPage - 1)">
          上一页
        </button>
        <span class="page-indicator">第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button 
          class="page-btn" 
          :disabled="currentPage >= totalPages" 
          @click="changePage(currentPage + 1)">
          下一页
        </button>
      </div>
    </div>

    <!-- 弹窗 -->
    <BuildingDetailsModal 
      v-model:visible="modalVisible" 
      :building-id="selectedBuildingId"
      :start-time="startTime"
      :end-time="endTime"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { getCurrentTimeString } from '../../utils/timeManager'
import { Icon } from '@iconify/vue'
import { getBuildings, getMeters, getEnergyQuery } from '../../api/statistics'
import BuildingDetailsModal from './BuildingDetailsModal.vue'

const props = defineProps<{
  startTime: string
  endTime: string
}>()

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
const totalPages = computed(() => Math.ceil(paginationInfo.value.total / pageSize.value))

const modalVisible = ref(false)
const selectedBuildingId = ref('')

const unwrap = (res: any) => res?.data ?? res

const formatNumber = (val: number | null | undefined): string => {
  if (val == null || isNaN(val)) return '—'
  return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

const changePage = (p: number) => {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  fetchData()
}

const fetchData = async () => {
  if (!props.startTime || !props.endTime) return
  
  loading.value = true
  try {
    // 1. 获取主建筑列表，带上分页参数
    const buildRaw = await getBuildings({ page: currentPage.value, page_size: pageSize.value })
    const buildData = unwrap(buildRaw)
    const items = buildData?.items || []
    
    paginationInfo.value.total = buildData?.pagination?.total || 0
    
    // 2. 并发组装每栋建筑的数据
    const promises = items.map(async (b: any) => {
      const bid = b.building_id
      
      // 请求设备数量和状态推导
      let meterCount = 0
      let status: BuildingRow['status'] = 'normal'
      let statusText = '正常运行'
      
      try {
        const meterRaw = await getMeters({ building_id: bid })
        const meterData = unwrap(meterRaw)
        meterCount = meterData?.pagination?.total || 0
        
        let hasWarning = false
        let hasOffline = false
        const mItems = meterData?.items || []
        
        for (const m of mItems) {
          if (m.status === 'fault') { status = 'fault'; statusText = '故障停机'; break; }
          if (m.status === 'warning') { hasWarning = true }
          if (m.status === 'offline') { hasOffline = true }
        }

        if (status !== 'fault') {
          if (hasWarning) {
            status = 'warning'
            statusText = '告警状态'
          } else if (hasOffline || mItems.length === 0) {
            // 用 warning 样式，但文案提示离线或者未接入
            status = 'warning'
            statusText = mItems.length === 0 ? '设备未接入' : '部分离线'
          }
        }
      } catch (e) {
        console.error(`Failed to fetch meters for ${bid}`, e)
      }
      
      // 请求当日累计能耗
      let energyTotal = 0
      try {
        const queryRaw = await getEnergyQuery({ 
          building_ids: [bid], 
          start_time: props.startTime, 
          end_time: props.endTime,
          granularity: 'month'
        })
        const queryData = unwrap(queryRaw)
        energyTotal = queryData?.summary?.total || 0
      } catch (e) {
        console.error(`Failed to fetch energy for ${bid}`, e)
      }
      
      // 算 eui
      const sqm = b.sqm || 0
      const eui = sqm > 0 ? (energyTotal / sqm) : 0
      
      return {
        building_id: bid,
        meterCount,
        energyTotal,
        eui,
        status,
        statusText
      } as BuildingRow
    })
    
    tableData.value = await Promise.all(promises)
    
    const d = new Date(getCurrentTimeString())
    lastUpdated.value = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  } catch (err) {
    console.error('建筑效绩表聚合失败:', err)
  } finally {
    loading.value = false
  }
}

const viewDetails = (row: BuildingRow) => {
  selectedBuildingId.value = row.building_id
  modalVisible.value = true
}

watch(
  () => [props.startTime, props.endTime],
  () => {
    currentPage.value = 1
    fetchData()
  }
)

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.performance-panel {
  background: #ffffff;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 14px rgba(15, 23, 42, 0.03);
  border: 1px solid #e8ecf1;
  font-family: 'Plus Jakarta Sans', -apple-system, 'PingFang SC', sans-serif;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.update-time {
  font-size: 12px;
  color: #94a3b8;
}

.refresh-btn {
  background: transparent;
  border: none;
  color: #0b4582;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #eff6ff;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin { 100% { transform: rotate(360deg); } }

/* ─── Table Styles ─────────────────────────────────────────── */
.table-container {
  overflow-x: auto;
}

.performance-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.performance-table th {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  white-space: nowrap;
}

.performance-table td {
  padding: 16px;
  border-bottom: 1px solid #f8fafc;
  color: #0f172a;
  font-size: 14px;
  vertical-align: middle;
}

.data-row:hover td {
  background-color: #f8fafc;
}

.font-bold {
  font-weight: 700;
}

.font-numeric {
  font-variant-numeric: tabular-nums;
}

.highlight-val {
  font-size: 15px;
}

.eui-val {
  font-weight: 700;
  color: #d97706;
}

.unit {
  font-size: 11px;
  color: #94a3b8;
  margin-left: 2px;
}

/* ─── Status Badges ────────────────────────────────────────── */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  background: #f1f5f9;
  color: #64748b;
}

.status-badge .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-badge.normal {
  background: #ecfdf5;
  color: #059669;
}

.status-badge.warning {
  background: #fffbeb;
  color: #d97706;
}

.status-badge.fault {
  background: #fef2f2;
  color: #dc2626;
}

/* ─── Actions & Footer ─────────────────────────────────────── */
.action-col {
  text-align: right;
  padding-right: 24px;
}

.action-link {
  background: none;
  border: none;
  color: #0b4582;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.action-link:hover {
  color: #1e6fd0;
}

.panel-footer.pagination {
  margin-top: 16px;
  border-top: 1px dashed #e8ecf1;
  padding-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-info {
  font-size: 13px;
  color: #64748b;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-btn {
  background: white;
  border: 1px solid #cbd5e1;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #0f172a;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  border-color: #0b4582;
  color: #0b4582;
}

.page-btn:disabled {
  background: #f8fafc;
  color: #94a3b8;
  border-color: #e2e8f0;
  cursor: not-allowed;
}

.page-indicator {
  font-size: 13px;
  color: #334155;
  font-weight: 500;
}

/* ─── Empty & Loading ──────────────────────────────────────── */
.empty-cell, .loading-cell {
  text-align: center;
  padding: 40px !important;
  color: #94a3b8;
  font-size: 14px;
}

.loading-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.loading-icon {
  font-size: 20px;
  color: #0b4582;
}
</style>
