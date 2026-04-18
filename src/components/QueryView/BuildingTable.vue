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
            <th>设备</th>
            <th class="text-right">总能耗</th>
            <th class="text-right">EUI 指数</th>
            <th class="text-right">碳排放</th>
            <th class="text-center">系统状态</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading" class="loading-row">
            <td :colspan="props.isExportMode ? 8 : 7" class="loading-cell">
              <div class="loading-content">
                <div class="loading-spinner"></div>
                <span>数据加载中...</span>
              </div>
            </td>
          </tr>
          <tr v-else-if="buildings.length === 0" class="empty-row">
            <td :colspan="props.isExportMode ? 8 : 7" class="empty-cell">
              <div class="empty-content">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="9" y1="9" x2="15" y2="9"></line>
                  <line x1="9" y1="13" x2="15" y2="13"></line>
                  <line x1="9" y1="17" x2="11" y2="17"></line>
                </svg>
                <p>暂无建筑运行数据</p>
              </div>
            </td>
          </tr>
          <tr v-else v-for="item in buildings" :key="item.id" :class="{ 'selected-row': props.isExportMode && selectedIds.has(item.id) }">
            <!-- 导出模式显示多选框 -->
            <td v-if="props.isExportMode" class="checkbox-column">
              <input 
                type="checkbox" 
                :value="item.id"
                :checked="selectedIds.has(item.id)"
                @change="toggleSelection(item.id)"
                class="custom-checkbox"
              />
            </td>
            <td>
              <div class="building-id">{{ item.buildingId }}</div>
            </td>
            <td>
              <div class="site">{{ item.site }}</div>
            </td>
            <td class="text-right">
              <div class="energy">{{ item.energy.toLocaleString() }}</div>
              <div class="unit">kWh</div>
            </td>
            <td class="text-right">{{ item.eui }}</td>
            <td class="text-right">{{ item.carbon }}</td>
            <td class="text-center">
              <!-- 使用复用的状态组件 -->
              <StatusBadge 
                :status="item.status" 
                :custom-text="item.statusText"
                 size="md"
              />
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
            显示第 {{ displayStart }}-{{ displayEnd }} 条，共 {{ pagination.total }} 条建筑运行记录
          </template>
        </div>
        
        <div class="pagination-right">
          <div class="pagination-controls">
            <button class="page-btn nav-btn" :disabled="pagination.currentPage === 1" @click="onPageChange(pagination.currentPage - 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            <button v-for="page in visiblePages" :key="page" :class="['page-btn', { active: page === pagination.currentPage }]" @click="onPageChange(page)">
              {{ page }}
            </button>

            <button class="page-btn nav-btn" :disabled="pagination.currentPage === totalPages" @click="onPageChange(pagination.currentPage + 1)">
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
import { computed, ref, onMounted, watch } from 'vue'
import axios from 'axios'
import StatusBadge from './StatusBadge.vue'

// ===== 类型定义 =====
interface TableItem {
  id: string
  buildingId: string
  site: string
  energy: number
  eui: number
  carbon: number
  // 扩展为联合类型，兼容两种命名方式
  status: 'online' | 'warning' | 'fault' | 'offline' | 'normal'
  statusText: string
}

interface PaginationInfo {
  currentPage: number
  pageSize: number
  total: number
}

// ===== Props & Emits =====
const props = defineProps<{
  filterForm?: { 
    status?: string,
    timeRange?: string  
  },
  advancedFilters?: Record<string, any>,
  sortConfig?: { field: string, order: 'asc' | 'desc' },
  timeRange?: 'today' | 'week' | 'month' | 'quarter' | 'year',
  isExportMode?: boolean
}>()

const emit = defineEmits([
  'view-detail', 
  'view-stats', 
  'fault-analysis', 
  'export-data',
  'selection-change'
])

// ===== 响应式数据 =====
const buildings = ref<TableItem[]>([])
const pagination = ref<PaginationInfo>({ currentPage: 1, pageSize: 7, total: 0 })
const loading = ref(false)
const selectedIds = ref<Set<string>>(new Set())

// ===== 工具函数 =====
import { useTimeManager } from '../../utils/timeManager'
const { getCurrentTimeString } = useTimeManager()

const getCurrentTime = () => new Date(getCurrentTimeString())

// 删除 getStatusText 函数 - 不再需要，由 StatusBadge 组件处理
// 删除 mapStatusToClass 函数 - 不再需要，由 StatusBadge 组件处理

// 只需确保数据转换时设置正确的状态文本
// 注意：item.statusText 已经在 TableItem 接口中定义

const safeGetArray = (data: any): any[] => {
  if (Array.isArray(data)) return data
  if (data?.data && Array.isArray(data.data)) return data.data
  if (data?.items && Array.isArray(data.items)) return data.items
  if (data?.list && Array.isArray(data.list)) return data.list
  return []
}

// ===== 数据获取方法 =====
const calculateTimeRange = (range: string) => {
  const now = getCurrentTime()
  let start = new Date(now)
  const year = now.getFullYear(), month = now.getMonth(), date = now.getDate(), day = now.getDay()
  
  switch (range) {
    case 'today': start = new Date(year, month, date, 0, 0, 0); break
    case 'week': start = new Date(year, month, date - (day === 0 ? 6 : day - 1), 0, 0, 0); break
    case 'month': start = new Date(year, month, 1, 0, 0, 0); break
    case 'quarter': start = new Date(year, Math.floor(month / 3) * 3, 1, 0, 0, 0); break
    case 'year': start = new Date(year, 0, 1, 0, 0, 0); break
  }
  return { start_time: start.toISOString(), end_time: now.toISOString() }
}

const fetchEnergySummary = async (buildingId: string, timeRange: any) => {
  try {
    const response = await axios.get(`/api/buildings/${buildingId}/energy/summary`, {
      params: { start_time: timeRange.start_time, end_time: timeRange.end_time },
      timeout: 8000
    })
    const data = response.data?.data || response.data
    if (data && typeof data === 'object') {
      const types = ['electricity', 'water', 'gas', 'steam', 'chilledwater', 'hotwater', 'irrigation', 'solar']
      return types.reduce((sum, type) => sum + (data[type] || data[`${type}_energy`] || 0), 0)
    }
    return 0
  } catch (error) {
    console.error(`获取建筑 ${buildingId} 能耗摘要失败:`, error)
    return 0
  }
}

const fetchEUI = async (buildingId: string, timeRange: any) => {
  try {
    const response = await axios.get('/api/energy/cop', {
      params: { building_id: buildingId, start_time: timeRange.start_time, end_time: timeRange.end_time },
      timeout: 8000
    })
    const data = response.data?.data || response.data
    return data?.eui || data?.cop || data?.value || 0
  } catch (error) {
    console.error(`获取建筑 ${buildingId} EUI失败:`, error)
    return 0
  }
}

const fetchCarbon = async (buildingId: string, timeRange: any) => {
  try {
    const response = await axios.get('/api/energy/query', {
      params: { meter_type: 'gas', building_id: buildingId, start_time: timeRange.start_time, end_time: timeRange.end_time },
      timeout: 8000
    })
    const data = response.data?.data || response.data
    return data?.total || data?.value || 0
  } catch (error) {
    console.error(`获取建筑 ${buildingId} 碳排放失败:`, error)
    return 0
  }
}

const fetchBuildings = async () => {
  loading.value = true
  
  try {
    // 1. 获取建筑列表
    const buildingsRes = await axios.get('/api/buildings', {
      params: {
        page: pagination.value.currentPage,
        page_size: pagination.value.pageSize,
        status: props.filterForm?.status || undefined,
        building_id: props.advancedFilters?.buildingId || undefined,
        site: props.advancedFilters?.site || undefined,
        sort_field: props.sortConfig?.field || undefined,
        sort_order: props.sortConfig?.order || undefined
      },
      timeout: 10000
    })
    
    let buildingList = safeGetArray(buildingsRes.data)
    const returnedTotal = buildingsRes.data?.total ?? buildingsRes.data?.total_count ?? buildingsRes.data?.meta?.total ?? buildingsRes.data?.pagination?.total
    
    // 【关键修复】前端二次过滤：确保只显示匹配状态的建筥
    if (props.filterForm?.status && buildingList.length > 0) {
      buildingList = buildingList.filter((building: any) => {
        const buildingStatus = building.status || building.building_status || building.state
        // 匹配后端返回的状态（支持英文和中文）
        return buildingStatus === props.filterForm?.status
      })
    }
    
    pagination.value.total = returnedTotal !== undefined && returnedTotal !== null ? returnedTotal : buildingList.length

    if (!buildingList.length) {
      buildings.value = []
      loading.value = false
      return
    }

    // 2. 获取每个建筑的详细数据
    const detailedBuildings = await Promise.all(
      buildingList.map(async (building: any) => {
        const buildingId = building.building_id || building.id || building.buildingId
        if (!buildingId) return null
        
        try {
          // 【修改】直接获取原始状态，不再调用 mapStatusToClass
          const rawStatus = building.status || building.state || building.building_status || 'offline'
          
          // 获取能耗数据（保持原有逻辑）
          const timeRange = calculateTimeRange(props.timeRange || 'today')
          const [totalEnergy, eui, carbon] = await Promise.all([
            fetchEnergySummary(buildingId, timeRange),
            fetchEUI(buildingId, timeRange),
            fetchCarbon(buildingId, timeRange)
          ])
          
          // 获取设备数量（仅用于显示，不影响状态）
          const metersListRes = await axios.get('/api/meters', {
            params: { building_id: buildingId },
            timeout: 5000
          }).catch(() => ({ data: [] }))
          const metersList = safeGetArray(metersListRes.data)
          const deviceCount = metersList.length

          return {
            id: buildingId,
            buildingId: buildingId,
            site: deviceCount > 0 ? `${deviceCount} 个设备` : '无设备',
            energy: totalEnergy,
            eui: eui,
            carbon: carbon,
            status: rawStatus as TableItem['status'],  // 【修改】直接传原始值
            statusText: ''  // 【修改】留空，让 StatusBadge 组件自动根据状态显示文本
          }

        } catch (err) {
          console.error(`处理建筑 ${buildingId} 数据时出错:`, err)
          return null
        }
      })
    )

    let validBuildings = detailedBuildings.filter(item => item !== null) as TableItem[]
    
    // 按系统状态排序
    if (props.sortConfig?.field === 'status') {
      const statusWeight: Record<string, number> = { 
        'fault': 4,
        'warning': 3,
        'offline': 2,
        'online': 1
      }
      validBuildings.sort((a, b) => {
        const weightA = statusWeight[a.status] ?? 0
        const weightB = statusWeight[b.status] ?? 0
        const order = props.sortConfig?.order === 'asc' ? 1 : -1
        return (weightA - weightB) * order
      })
    }
    
    buildings.value = validBuildings
    
  } catch (error: any) {
    console.error('获取建筑列表失败:', error)
    buildings.value = []
  } finally {
    loading.value = false
  }
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
  if (isAllSelected.value) {
    selectedIds.value.clear()
  } else {
    buildings.value.forEach(item => selectedIds.value.add(item.id))
  }
  selectedIds.value = new Set(selectedIds.value)
}

// ===== 事件处理 =====
const handleView = (item: TableItem) => {
  emit('view-detail', item)
}

const handleStats = (item: TableItem) => {
  emit('view-stats', item)
}

const handleFault = (item: TableItem) => {
  emit('fault-analysis', item)
}

// ===== 计算属性 =====
const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize) || 1)
const displayStart = computed(() => pagination.value.total === 0 ? 0 : (pagination.value.currentPage - 1) * pagination.value.pageSize + 1)
const displayEnd = computed(() => {
  if (pagination.value.total === 0 && buildings.value.length === 0) return 0
  return Math.min(pagination.value.currentPage * pagination.value.pageSize, pagination.value.total || buildings.value.length)
})

const visiblePages = computed(() => {
  const pages: number[] = []
  const maxVisible = 5
  const current = pagination.value.currentPage
  const total = totalPages.value
  let start = Math.max(1, current - Math.floor(maxVisible / 2))
  let end = Math.min(total, start + maxVisible - 1)
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

const isAllSelected = computed(() => {
  return buildings.value.length > 0 && buildings.value.every(item => selectedIds.value.has(item.id))
})

const isIndeterminate = computed(() => {
  return selectedIds.value.size > 0 && selectedIds.value.size < buildings.value.length
})

// ===== 生命周期 & 监听 =====
onMounted(() => { fetchBuildings() })

watch(() => [props.filterForm?.status, props.advancedFilters, props.sortConfig], () => {
  pagination.value.currentPage = 1
  fetchBuildings()
}, { deep: true })

watch(() => pagination.value.currentPage, () => { fetchBuildings() })
watch(() => props.timeRange, () => { 
  pagination.value.currentPage = 1
  fetchBuildings() 
}, { immediate: false })

// 监听父组件导出模式变化
watch(() => props.isExportMode, (newVal) => {
  if (!newVal) {
    selectedIds.value.clear()
  }
}, { immediate: true })

// 监听选择变化，通知父组件
watch(selectedIds, (newVal) => {
  emit('selection-change', Array.from(newVal))
}, { deep: true })

const onPageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  pagination.value.currentPage = page
}

// 暴露方法给父组件调用
defineExpose({
  enterExportMode: () => {
    selectedIds.value.clear()
  },
  exitExportMode: () => {
    selectedIds.value.clear()
  }
})
</script>

<style scoped>
/* ===== 卡片容器 ===== */
.table-card {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* ===== 表格区域 ===== */
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

/* 选中行样式 */
.selected-row {
  background: #EFF6FF !important;
}

/* 复选框列样式 */
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

/* ===== 数据单元格样式 ===== */
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

.energy {
  font-weight: 600;
  color: #005BAC;
  font-size: 15px;
}

.unit {
  font-size: 11px;
  color: #9CA3AF;
  margin-top: 2px;
}

/* 删除所有 status-badge 相关的样式，因为 StatusBadge 组件已经包含这些样式 */

/* ===== 操作按钮 ===== */
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

/* ===== Loading & Empty 状态 ===== */
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

/* ===== 分页栏 ===== */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid #F3F4F6;
  background: white;
}

.pagination-info {
  font-size: 14px;
  color: #6B7280;
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

/* 分页控制 */
.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #E5E7EB;
  background: #fff;
  border-radius: 50%;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  font-weight: 500;
}

.page-btn:hover:not(:disabled):not(.active) {
  border-color: #005BAC;
  color: #005BAC;
  background: #F5F7FA;
}

.nav-btn {
  color: #9CA3AF;
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: #E5E7EB;
  color: #D1D5DB;
}

.page-btn.active {
  background: #005BAC;
  color: #fff;
  border-color: #005BAC;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 91, 172, 0.2);
}
</style>
