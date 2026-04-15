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
              <button class="action-link" @click="viewDetails(row)">详情</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="panel-footer" v-if="tableData.length > 0">
      <button class="expand-btn" @click="loadMore">
        查看完整建筑列表
        <Icon icon="lucide:chevron-down" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { getBuildings, getMeters, getEnergyQuery } from '../../api/statistics'

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

const unwrap = (res: any) => res?.data ?? res

const formatNumber = (val: number | null | undefined): string => {
  if (val == null || isNaN(val)) return '—'
  return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

const fetchData = async () => {
  if (!props.startTime || !props.endTime) return
  
  loading.value = true
  try {
    // 1. 获取主建筑列表
    const buildRaw = await getBuildings({ page: 1, page_size: 5 })
    const buildData = unwrap(buildRaw)
    const items = buildData?.items || []
    
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
        const mItems = meterData?.items || []
        
        for (const m of mItems) {
          if (m.status === 'fault') { status = 'fault'; statusText = '故障停机'; break; }
          if (m.status === 'warning') { hasWarning = true }
        }
        if (status !== 'fault' && hasWarning) {
           status = 'warning'
           statusText = '告警状态'
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
    
    const d = new Date()
    lastUpdated.value = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  } catch (err) {
    console.error('建筑效绩表聚合失败:', err)
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  alert('功能开发中: 跳转至完整建筑列表页')
}

const viewDetails = (row: BuildingRow) => {
  alert(`功能开发中: 跳转至建筑详情 (${row.building_id})`)
}

watch(
  () => [props.startTime, props.endTime],
  () => {
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

.panel-footer {
  margin-top: 16px;
  text-align: center;
  border-top: 1px dashed #e8ecf1;
  padding-top: 16px;
}

.expand-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s;
}

.expand-btn:hover {
  color: #0f172a;
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
