<template>
  <div class="performance-panel">
    <div class="panel-header">
      <h3>设备运行监测表</h3>
      <div class="header-right">
        <!-- 表计类型筛选 -->
        <div class="filter-group">
          <select v-model="filterMeterType" @change="onFilterChange" class="filter-select">
            <option value="">全部类型</option>
            <option v-for="t in meterTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
        <!-- 状态筛选 -->
        <div class="filter-group">
          <select v-model="filterStatus" @change="onFilterChange" class="filter-select">
            <option value="">全部状态</option>
            <option value="online">在线</option>
            <option value="warning">告警</option>
            <option value="fault">故障</option>
            <option value="offline">离线</option>
          </select>
        </div>
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
            <th>设备名称</th>
            <th>表计类型</th>
            <th>所属建筑</th>
            <th>状态</th>
            <th>最后活跃时间</th>
            <th class="action-col">操作</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading 状态 -->
          <tr v-if="loading && tableData.length === 0">
            <td colspan="6" class="loading-cell">
              <Icon icon="lucide:loader-2" class="spin loading-icon" />
              <span>设备数据检索中，请稍候...</span>
            </td>
          </tr>
          
          <!-- 完全无数据 -->
          <tr v-else-if="!loading && tableData.length === 0">
            <td colspan="6" class="empty-cell">暂无设备数据</td>
          </tr>

          <!-- 真实数据 -->
          <tr v-for="row in tableData" :key="row.meter_id" class="data-row">
            <td>
              <div class="meter-name-cell">
                <Icon :icon="getMeterIcon(row.meter_type)" class="meter-type-icon" :class="row.meter_type" />
                <span class="font-bold">{{ row.meter_name || row.meter_id }}</span>
              </div>
            </td>
            <td>
              <span class="meter-type-badge" :class="row.meter_type">{{ getMeterTypeLabel(row.meter_type) }}</span>
            </td>
            <td class="building-id-cell">{{ row.building_id }}</td>
            <td>
              <span class="status-badge" :class="row.status">
                <span class="dot"></span>
                {{ getStatusText(row.status) }}
              </span>
            </td>
            <td class="font-numeric last-seen-cell">{{ formatLastSeen(row.last_seen_at) }}</td>
            <td class="action-col">
              <button class="action-link" @click="viewDetails(row)">详情</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="panel-footer pagination" v-if="paginationInfo.total > 0">
      <div class="pagination-info">
        共计 {{ paginationInfo.total }} 台设备
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { getMeters } from '../../api/statistics'

const props = defineProps<{
  startTime: string
  endTime: string
}>()

interface MeterRow {
  meter_id: string
  meter_name: string
  meter_type: string
  building_id: string
  status: string
  last_seen_at: string | null
  manufacturer: string | null
  model: string | null
  install_date: string | null
}

const meterTypes = [
  { value: 'electricity', label: '电力' },
  { value: 'chilledwater', label: '冷冻水' },
  { value: 'steam', label: '蒸汽' },
  { value: 'gas', label: '燃气' },
  { value: 'hotwater', label: '热水' },
  { value: 'water', label: '水' },
  { value: 'irrigation', label: '灌溉' },
  { value: 'solar', label: '光伏' },
]

const tableData = ref<MeterRow[]>([])
const loading = ref(false)
const lastUpdated = ref('')
const filterMeterType = ref('')
const filterStatus = ref('')

const currentPage = ref(1)
const pageSize = ref(10)
const paginationInfo = ref({ total: 0 })
const totalPages = computed(() => Math.ceil(paginationInfo.value.total / pageSize.value))

const unwrap = (res: any) => res?.data ?? res

const getMeterIcon = (type: string): string => {
  const icons: Record<string, string> = {
    electricity: 'lucide:zap',
    chilledwater: 'lucide:snowflake',
    steam: 'lucide:cloud',
    gas: 'lucide:flame',
    hotwater: 'lucide:droplets',
    water: 'lucide:droplet',
    irrigation: 'lucide:sprout',
    solar: 'lucide:sun',
  }
  return icons[type] || 'lucide:gauge'
}

const getMeterTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    electricity: '电力',
    chilledwater: '冷冻水',
    steam: '蒸汽',
    gas: '燃气',
    hotwater: '热水',
    water: '水',
    irrigation: '灌溉',
    solar: '光伏',
  }
  return labels[type] || type
}

const getStatusText = (status: string): string => {
  const texts: Record<string, string> = {
    online: '在线',
    warning: '告警',
    fault: '故障',
    offline: '离线',
  }
  return texts[status] || status
}

const formatLastSeen = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const changePage = (p: number) => {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  fetchData()
}

const onFilterChange = () => {
  currentPage.value = 1
  fetchData()
}

const fetchData = async () => {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      page_size: pageSize.value,
    }
    if (filterMeterType.value) params.meter_type = filterMeterType.value
    if (filterStatus.value) params.status = filterStatus.value

    const raw = await getMeters(params)
    const data = unwrap(raw)
    const items = data?.items || []

    paginationInfo.value.total = data?.pagination?.total || 0

    tableData.value = items.map((m: any) => ({
      meter_id: m.meter_id,
      meter_name: m.meter_name || m.meter_id,
      meter_type: m.meter_type || '',
      building_id: m.building_id || '',
      status: m.status || 'offline',
      last_seen_at: m.last_seen_at || null,
      manufacturer: m.manufacturer || null,
      model: m.model || null,
      install_date: m.install_date || null,
    }))

    const d = new Date()
    lastUpdated.value = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  } catch (err) {
    console.error('设备列表获取失败:', err)
  } finally {
    loading.value = false
  }
}

const viewDetails = (row: MeterRow) => {
  // 从 meter_id 提取 building_id (格式: building_id::meter_type)
  const parts = row.meter_id.split('::')
  const buildingId = parts[0] || row.building_id
  alert(`功能开发中: 跳转至建筑 ${buildingId} 的 ${getMeterTypeLabel(row.meter_type)} 表计详情`)
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
  flex-wrap: wrap;
  gap: 12px;
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
  flex-wrap: wrap;
}

.filter-group {
  position: relative;
}

.filter-select {
  appearance: none;
  -webkit-appearance: none;
  padding: 6px 32px 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  color: #334155;
  background: #ffffff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 10px center;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  min-width: 100px;
}

.filter-select:focus {
  outline: none;
  border-color: #0b4582;
  box-shadow: 0 0 0 3px rgba(11, 69, 130, 0.08);
}

.filter-select:hover {
  border-color: #94a3b8;
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
  padding: 14px 16px;
  border-bottom: 1px solid #f8fafc;
  color: #0f172a;
  font-size: 14px;
  vertical-align: middle;
}

.data-row {
  transition: background-color 0.15s ease;
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

/* ─── Meter Name Cell ──────────────────────────────────────── */
.meter-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.meter-type-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.meter-type-icon.electricity { color: #f59e0b; }
.meter-type-icon.chilledwater { color: #06b6d4; }
.meter-type-icon.steam { color: #8b5cf6; }
.meter-type-icon.gas { color: #ef4444; }
.meter-type-icon.hotwater { color: #f97316; }
.meter-type-icon.water { color: #3b82f6; }
.meter-type-icon.irrigation { color: #22c55e; }
.meter-type-icon.solar { color: #eab308; }

/* ─── Meter Type Badge ─────────────────────────────────────── */
.meter-type-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
}

.meter-type-badge.electricity { background: #fef3c7; color: #b45309; }
.meter-type-badge.chilledwater { background: #cffafe; color: #0e7490; }
.meter-type-badge.steam { background: #ede9fe; color: #6d28d9; }
.meter-type-badge.gas { background: #fee2e2; color: #b91c1c; }
.meter-type-badge.hotwater { background: #ffedd5; color: #c2410c; }
.meter-type-badge.water { background: #dbeafe; color: #1d4ed8; }
.meter-type-badge.irrigation { background: #dcfce7; color: #15803d; }
.meter-type-badge.solar { background: #fef9c3; color: #a16207; }

/* ─── Building ID ──────────────────────────────────────────── */
.building-id-cell {
  color: #0b4582;
  font-weight: 500;
  font-size: 13px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ─── Last Seen ────────────────────────────────────────────── */
.last-seen-cell {
  font-size: 13px;
  color: #64748b;
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

.status-badge.online {
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

.status-badge.offline {
  background: #f1f5f9;
  color: #94a3b8;
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
