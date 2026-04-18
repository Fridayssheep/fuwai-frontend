<template>
  <div class="table-card">
    <!-- 表格 -->
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <!-- 导出模式显示全选框 -->
            <th v-if="props.isExportMode" class="checkbox-column">
              <input 
                type="checkbox" 
                :checked="isAllSelected"
                :indeterminate="isIndeterminate"
                @change="toggleSelectAll"
                class="custom-checkbox"
              />
            </th>
            <th>建筑标识ID</th>
            <th>设备数量</th>
            <th class="text-right">期间累计 (KWH)</th>
            <th class="text-right">EUI 指数 (KWH/㎡)</th>
            <th class="text-right">碳排放</th>
            <th class="text-center">系统状态</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <!-- 加载状态 -->
          <tr v-if="loading" class="loading-row">
            <td :colspan="props.isExportMode ? 8 : 7" class="loading-cell">
              <div class="loading-content">
                <div class="loading-spinner"></div>
                <span>数据检索中，请稍候...</span>
              </div>
            </td>
          </tr>
          
          <!-- 空状态 -->
          <tr v-else-if="!tableData || tableData.length === 0" class="empty-row">
            <td :colspan="props.isExportMode ? 8 : 7" class="empty-cell">
              <div class="empty-content">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="9" y1="9" x2="15" y2="9"></line>
                  <line x1="9" y1="13" x2="15" y2="13"></line>
                  <line x1="9" y1="17" x2="11" y2="17"></line>
                </svg>
                <p>暂无建筑数据</p>
              </div>
            </td>
          </tr>
          
          <!-- 数据列表 -->
          <tr v-else v-for="item in tableData" :key="item.building_id" :class="{ 'selected-row': props.isExportMode && selectedIds.has(item.building_id) }">
            <!-- 导出模式显示多选框 -->
            <td v-if="props.isExportMode" class="checkbox-column">
              <input 
                type="checkbox" 
                :value="item.building_id"
                :checked="selectedIds.has(item.building_id)"
                @change="toggleSelection(item.building_id)"
                class="custom-checkbox"
              />
            </td>
            <td>
              <div class="building-id">{{ item.building_id }}</div>
            </td>
            <td>
              <div class="site font-numeric">{{ item.meterCount }} 个</div>
            </td>
            <td class="text-right">
              <div class="energy font-numeric">{{ formatNumber(item.energyTotal) }}</div>
              <div class="unit">KWH</div>
            </td>
            <td class="text-right font-numeric">
              <span class="eui-val">{{ formatNumber(item.eui) }}</span>
              <span class="unit">KWH/㎡</span>
            </td>
            <td class="text-right">
              <div class="carbon font-numeric">{{ formatNumber(item.carbon) }}</div>
              <div class="unit">kgCO₂e</div>
            </td>
            <td class="text-center">
              <span class="status-badge" :class="item.status">
                <span class="dot"></span>
                {{ item.statusText }}
              </span>
            </td>
            <td class="text-right">
              <div class="actions">
                <button class="action-btn blue" @click="handleView(item)" title="查看详情">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
                <button class="action-btn green" @click="handleStats(item)" title="统计数据">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                </button>
                <button class="action-btn orange" @click="handleFault(item)" title="故障分析">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 分页栏 -->
      <div class="pagination-bar">
        <div class="pagination-info">
          <template v-if="props.isExportMode">
            已选择 <strong>{{ selectedIds.size }}</strong> 个建筑
          </template>
          <template v-else>
            共计 {{ paginationInfo.total }} 栋建筑，第 {{ currentPage }} / {{ totalPages }} 页
          </template>
        </div>
        
        <div class="pagination-right">
          <div class="pagination-controls">
            <button 
              class="page-btn nav-btn" 
              :disabled="currentPage === 1" 
              @click="changePage(currentPage - 1)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              上一页
            </button>

            <span class="page-indicator">第 {{ currentPage }} / {{ totalPages }} 页</span>

            <button 
              class="page-btn nav-btn" 
              :disabled="currentPage >= totalPages" 
              @click="changePage(currentPage + 1)"
            >
              下一页
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getBuildings, getMeters, getEnergyQuery } from '../../api/statistics'

// ===== Props & Emits =====
const props = defineProps<{
  isExportMode?: boolean
  startTime: string
  endTime: string
  filterForm?: { status?: string }
  sortConfig?: { field: 'eui' | 'totalEnergy' | 'status' | 'carbonEmission'; order: 'asc' | 'desc' }
}>()

const emit = defineEmits([
  'view-detail', 
  'view-stats', 
  'fault-analysis', 
  'selection-change',
  'page-change'
])

// ===== 核心数据状态 =====
interface BuildingRow {
  building_id: string
  meterCount: number
  energyTotal: number
  eui: number
  carbon?: number
  status: 'normal' | 'warning' | 'fault'
  statusText: string
}

const tableData = ref<BuildingRow[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(8)  // 修改为 8 条每页，匹配你的需求
const paginationInfo = ref({ total: 0 })
const CARBON_FACTOR_KG_PER_KWH = 0.554
const STATUS_SORT_WEIGHT: Record<BuildingRow['status'], number> = { fault: 3, warning: 2, normal: 1 }

const totalPages = computed(() => Math.max(1, Math.ceil(paginationInfo.value.total / pageSize.value)))
const selectedIds = ref<Set<string>>(new Set())

// ===== 计算属性 =====
const isAllSelected = computed(() => {
  const list = tableData.value || []
  return list.length > 0 && list.every(item => selectedIds.value.has(item.building_id))
})

const isIndeterminate = computed(() => {
  const list = tableData.value || []
  const selectedCount = selectedIds.value.size
  return selectedCount > 0 && selectedCount < list.length
})

// ===== 工具函数 =====
const unwrap = (res: any) => res?.data ?? res

const formatNumber = (val: number | null | undefined): string => {
  if (val == null || isNaN(val)) return '—'
  return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}
const getSummaryTotal = (payload: any): number => {
  const value = payload?.summary?.total ?? payload?.total ?? payload?.value ?? 0
  return Number.isFinite(Number(value)) ? Number(value) : 0
}
const getSortValue = (row: BuildingRow) => {
  const field = props.sortConfig?.field || 'eui'
  if (field === 'totalEnergy') return row.energyTotal
  if (field === 'carbonEmission') return row.carbon || 0
  if (field === 'status') return STATUS_SORT_WEIGHT[row.status] || 0
  return row.eui
}
const sortRows = (rows: BuildingRow[]) => {
  const order = props.sortConfig?.order || 'asc'
  return [...rows].sort((a, b) => {
    const left = getSortValue(a)
    const right = getSortValue(b)
    if (typeof left === 'number' && typeof right === 'number') {
      const diff = left - right
      return order === 'asc' ? diff : -diff
    }
    const diff = String(left).localeCompare(String(right), 'zh-CN')
    return order === 'asc' ? diff : -diff
  })
}

// ===== 核心数据获取逻辑（已修复错误检查） =====
const fetchData = async () => {
  // 【修复】删除对 buildingId 的检查，这是列表页不是详情页
  if (!props.startTime || !props.endTime) {
    console.warn('时间参数缺失，跳过数据获取')
    return
  }
  
  loading.value = true
  try {
    const buildRaw = await getBuildings({
      page: currentPage.value,
      page_size: pageSize.value
    })
    const buildData = unwrap(buildRaw)
    const items = buildData?.items || []
    paginationInfo.value.total = buildData?.pagination?.total || 0
    
    // 并发组装每栋建筑的数据
    const promises = items.map(async (b: any) => {
      const bid = b.building_id || b.id
      if (!bid) {
        console.warn('建筑数据缺少ID:', b)
        return null
      }
      
      let meterCount = 0
      let status: BuildingRow['status'] = 'normal'
      let statusText = '正常运行'
      
      try {
        const meterRaw = await getMeters({ building_id: bid, start_time: props.startTime, end_time: props.endTime, page_size: 100 })
        const meterData = unwrap(meterRaw)
        meterCount = meterData?.pagination?.total || 0
        
        let hasWarning = false
        let hasOffline = false
        const mItems = meterData?.items || []
        
        for (const m of mItems) {
          if (m.status === 'fault') { status = 'fault'; statusText = '故障停机'; break }
          if (m.status === 'warning') hasWarning = true
          if (m.status === 'offline') hasOffline = true
        }

        if (status !== 'fault') {
          if (hasWarning) {
            status = 'warning'
            statusText = '告警状态'
          } else if (hasOffline || mItems.length === 0) {
            status = 'warning'
            statusText = mItems.length === 0 ? '设备未接入' : '部分离线'
          }
        }
      } catch (e) {
        console.error(`获取设备失败 ${bid}:`, e)
      }
      
      // 查询页只展示电耗口径，碳排也基于同一个 electricity 汇总估算，避免每栋楼重复请求。
      let energyTotal = 0
      let carbon = 0
      try {
        const energyRaw = await getEnergyQuery({
          building_ids: [bid],
          meter: 'electricity',
          start_time: props.startTime,
          end_time: props.endTime,
          granularity: 'month'
        })
        const queryData = unwrap(energyRaw)
        energyTotal = getSummaryTotal(queryData)
        carbon = energyTotal * CARBON_FACTOR_KG_PER_KWH
      } catch (e) {
        console.error(`获取能耗或碳排失败 ${bid}:`, e)
      }

      carbon = Math.round(carbon * 10) / 10
      
      const sqm = b.sqm || 1
      const eui = sqm > 0 ? (energyTotal / sqm) : 0
      
      return {
        building_id: bid,
        meterCount,
        energyTotal,
        eui,
        status,
        statusText,
        carbon
      } as BuildingRow
    })

    const results = await Promise.all(promises)
    const currentRows = results.filter((item): item is BuildingRow => item !== null)
    const statusFilter = props.filterForm?.status
    tableData.value = sortRows(statusFilter ? currentRows.filter(row => row.status === statusFilter) : currentRows)
  } catch (err) {
    console.error('建筑列表获取失败:', err)
    tableData.value = []
  } finally {
    loading.value = false
  }
}

// ===== 分页控制 =====
const changePage = (p: number) => {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  emit('page-change', p)
  fetchData()
}

// ===== 导出模式方法 =====
const toggleSelection = (id: string) => {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
  selectedIds.value = new Set(selectedIds.value)
}

const toggleSelectAll = () => {
  const list = tableData.value || []
  if (isAllSelected.value) {
    selectedIds.value.clear()
  } else {
    list.forEach(item => selectedIds.value.add(item.building_id))
  }
  selectedIds.value = new Set(selectedIds.value)
}

// ===== 事件处理（移到了 defineExpose 之前）=====
const handleView = (item: BuildingRow) => {
  emit('view-detail', { buildingId: item.building_id, ...item })
}

const handleStats = (item: BuildingRow) => {
  emit('view-stats', { buildingId: item.building_id, ...item })
}

const handleFault = (item: BuildingRow) => {
  emit('fault-analysis', { buildingId: item.building_id, ...item })
}

// 【修复】移除了未使用的 handleRowClick，或者如果你需要可以在这里定义
// const handleRowClick = (row: any) => {
//   emit('view-detail', row)
// }

// ===== 监听 =====
watch(() => props.isExportMode, (newVal) => {
  if (!newVal) selectedIds.value.clear()
}, { immediate: true })

watch(selectedIds, (newVal) => {
  emit('selection-change', Array.from(newVal))
}, { deep: true })

watch(() => [props.startTime, props.endTime], () => {
  currentPage.value = 1
  fetchData()
})

watch(() => props.filterForm?.status, () => {
  currentPage.value = 1
  fetchData()
})

watch(() => [props.sortConfig?.field, props.sortConfig?.order], () => {
  currentPage.value = 1
  fetchData()
})

// ===== 生命周期 =====
onMounted(() => {
  fetchData()
})

// ===== 暴露方法 =====
defineExpose({
  enterExportMode: () => {
    selectedIds.value.clear()
  },
  exitExportMode: () => {
    selectedIds.value.clear()
  },
  refresh: fetchData
})
</script>

<style scoped>
/* 样式保持不变... */
.table-card {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.table-wrapper {
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
th {
  background: #F9FAFB;
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #E5E7EB;
  white-space: nowrap;
}
td {
  padding: 16px;
  border-bottom: 1px solid #F3F4F6;
  color: #374151;
  vertical-align: middle;
}
tr:hover {
  background: #F9FAFB;
}
.selected-row {
  background: #EFF6FF !important;
}
.checkbox-column {
  width: 40px;
  text-align: center;
  padding: 12px 8px;
}
.custom-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #005BAC;
}
.text-right {
  text-align: right;
}
.text-center {
  text-align: center;
}
.building-id {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #111827;
  font-size: 13px;
}
.site {
  font-family: monospace;
  color: #6B7280;
  font-size: 13px;
}
.font-numeric {
  font-variant-numeric: tabular-nums;
}
.energy {
  font-weight: 600;
  color: #005BAC;
  font-size: 15px;
}
.eui-val {
  font-weight: 700;
  color: #d97706;
}
.unit {
  font-size: 11px;
  color: #9CA3AF;
  margin-left: 4px;
}
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
.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  align-items: center;
}
.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}
.action-btn.blue {
  color: #005BAC;
  border-color: #BFDBFE;
}
.action-btn.blue:hover {
  background: #EFF6FF;
  transform: scale(1.05);
}
.action-btn.green {
  color: #27AE60;
  border-color: #BBF7D0;
}
.action-btn.green:hover {
  background: #F0FDF4;
  transform: scale(1.05);
}
.action-btn.orange {
  color: #F39C12;
  border-color: #FDE68A;
}
.action-btn.orange:hover {
  background: #FFFBEB;
  transform: scale(1.05);
}
.loading-row, .empty-row {
  background: transparent !important;
}
.loading-cell, .empty-cell {
  text-align: center;
  padding: 60px 20px;
  border-bottom: none;
}
.loading-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #6B7280;
}
.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #F3F4F6;
  border-top-color: #005BAC;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #9CA3AF;
}
.empty-content p {
  margin: 0;
  font-size: 14px;
}
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid #F3F4F6;
  background: white;
}
.pagination-info {
  font-size: 13px;
  color: #64748b;
  font-weight: 400;
  display: flex;
  align-items: center;
  gap: 12px;
}
.pagination-info strong {
  color: #005BAC;
  font-weight: 600;
}
.pagination-right {
  display: flex;
  align-items: center;
}
.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}
.page-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #E5E7EB;
  background: #fff;
  border-radius: 6px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  font-weight: 500;
  gap: 4px;
}
.page-btn:hover:not(:disabled) {
  border-color: #005BAC;
  color: #005BAC;
  background: #F5F7FA;
}
.nav-btn {
  color: #374151;
}
.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: #E5E7EB;
  color: #D1D5DB;
}
.page-indicator {
  font-size: 13px;
  color: #334155;
  font-weight: 500;
  min-width: 100px;
  text-align: center;
}
</style>
