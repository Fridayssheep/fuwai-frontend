<template>
  <div class="table-card">
    <!-- 表格 -->
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
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
          <tr v-if="loading">
            <td colspan="7" style="text-align: center; padding: 40px; color: #999;">
              数据加载中...
            </td>
          </tr>
          <tr v-else-if="buildings.length === 0">
            <td colspan="7" style="text-align: center; padding: 40px; color: #999;">
              暂无数据
            </td>
          </tr>
          <tr v-else v-for="item in buildings" :key="item.id">
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
              <span :class="['status-tag', item.status]">
                <span class="status-dot"></span>
                {{ item.statusText }}
              </span>
            </td>
            <td class="text-right">
              <div class="actions">
                <!-- 蓝色眼睛：查看详情 -->
                <button class="action-btn view-btn" @click="$emit('view-detail', item)" title="查看详情">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
                
                <!-- 绿色图表：统计数据 -->
                <button class="action-btn stats-btn" @click="$emit('view-stats', item)" title="统计数据">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                </button>
                
                <!-- 橙色警告：故障分析 -->
                <button class="action-btn warning-btn" @click="$emit('fault-analysis', item)" title="故障分析">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination-bar">
        <div class="pagination-info">
          显示 {{ displayStart }}-{{ displayEnd }} 条，共 {{ pagination.total }} 条建筑运行数据
        </div>
        <div class="pagination-controls">
          <!-- 上一页 -->
          <button 
            class="page-btn nav-btn" 
            :disabled="pagination.currentPage === 1"
            @click="onPageChange(pagination.currentPage - 1)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <!-- 页码按钮 -->
          <button 
            v-for="page in visiblePages" 
            :key="page"
            :class="['page-btn', { active: page === pagination.currentPage }]"
            @click="onPageChange(page)"
          >
            {{ page }}
          </button>

          <!-- 下一页 -->
          <button 
            class="page-btn nav-btn" 
            :disabled="pagination.currentPage === totalPages"
            @click="onPageChange(pagination.currentPage + 1)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import axios from 'axios'

const emit = defineEmits(['view-detail', 'view-stats', 'fault-analysis'])

interface TableItem {
  id: string
  buildingId: string
  site: string
  energy: number
  eui: number
  carbon: number
  status: 'normal' | 'warning' | 'error' | 'offline'
  statusText: string
}

const props = defineProps<{
  filterForm?: {
    status?: string
  },
  advancedFilters?: Record<string, any>,
  sortConfig?: {
    field: string,
    order: 'asc' | 'desc'
  },
  timeRange?: 'today' | 'week' | 'month' | 'quarter' | 'year'
}>()

const buildings = ref<TableItem[]>([])
const pagination = ref({
  currentPage: 1,
  pageSize: 7,
  total: 0
})
const loading = ref(false)

import { useTimeManager } from '../../utils/timeManager'
const { getCurrentTimeString } = useTimeManager()

const getCurrentTime = () => {
  const timeStr = getCurrentTimeString()
  return new Date(timeStr)
}

const getStatusText = (status: string): string => {
  const map: Record<string, string> = {
    'normal': '运行正常',
    'warning': '告警状态',
    'error': '异常状态',
    'offline': '离线'
  }
  return map[status] || '运行正常'
}

const safeGetArray = (data: any): any[] => {
  if (Array.isArray(data)) return data
  if (data?.data && Array.isArray(data.data)) return data.data
  if (data?.items && Array.isArray(data.items)) return data.items
  if (data?.list && Array.isArray(data.list)) return data.list
  return []
}

const fetchEnergySummary = async (buildingId: string, timeRange: any) => {
  try {
    const response = await axios.get(`/api/buildings/${buildingId}/energy/summary`, {
      params: { start_time: timeRange.start_time, end_time: timeRange.end_time },
      timeout: 8000
    })
    const data = response.data?.data || response.data
    if (data && typeof data === 'object') {
      const energyTypes = ['electricity', 'water', 'gas', 'steam', 'chilledwater', 'hotwater', 'irrigation', 'solar']
      return energyTypes.reduce((sum, type) => sum + (data[type] || data[`${type}_energy`] || 0), 0)
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

const calculateTimeRange = (range: string) => {
  const now = getCurrentTime()
  const end = now.toISOString()
  let start = now
  const year = now.getFullYear()
  const month = now.getMonth()
  const date = now.getDate()
  const day = now.getDay()
  
  switch (range) {
    case 'today':
      start = new Date(year, month, date, 0, 0, 0)
      break
    case 'week':
      const diff = day === 0 ? 6 : day - 1
      start = new Date(year, month, date - diff, 0, 0, 0)
      break
    case 'month':
      start = new Date(year, month, 1, 0, 0, 0)
      break
    case 'quarter':
      const quarter = Math.floor(month / 3)
      start = new Date(year, quarter * 3, 1, 0, 0, 0)
      break
    case 'year':
      start = new Date(year, 0, 1, 0, 0, 0)
      break
    default:
      start = new Date(year, month, date, 0, 0, 0)
  }
  
  return { start_time: start.toISOString(), end_time: end }
}

const fetchBuildings = async () => {
  loading.value = true
  try {
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
    
    const buildingList = safeGetArray(buildingsRes.data)
    const returnedTotal = buildingsRes.data?.total ?? buildingsRes.data?.total_count ?? buildingsRes.data?.meta?.total ?? buildingsRes.data?.pagination?.total
    pagination.value.total = returnedTotal !== undefined && returnedTotal !== null ? returnedTotal : buildingList.length

    if (!buildingList.length) {
      buildings.value = []
      loading.value = false
      return
    }

    const detailedBuildings = await Promise.all(
      buildingList.map(async (building: any) => {
        const buildingId = building.building_id || building.id || building.buildingId
        if (!buildingId) {
          console.warn('建筑数据缺少ID:', building)
          return null
        }
        
        try {
          // ===== 方案B：先获取设备列表，再查详情 =====
          // 第一步：获取设备列表（获取设备ID和个数）
          const metersListRes = await axios.get('/api/meters', {
            params: { building_id: buildingId },
            timeout: 5000
          }).catch(err => {
            console.warn(`获取建筑 ${buildingId} 设备列表失败:`, err.message)
            return { data: [] }
          })
          
          const metersList = safeGetArray(metersListRes.data)
          const deviceCount = metersList.length
          
          // 第二步：如果有设备，取第一个设备查详情获取状态
          let topStatus = building.status || 'normal'
          if (metersList.length > 0 && metersList[0].meter_id) {
            const meterId = metersList[0].meter_id
            const meterRes = await axios.get(`/api/meters/${meterId}`, {
              timeout: 5000
            }).catch(err => {
              console.warn(`获取设备 ${meterId} 详情失败:`, err.message)
              return { data: null }
            })
            
            const meterData = meterRes.data?.meter || meterRes.data
            topStatus = meterData?.status || meterData?.state || building.status || 'normal'
          }

          // 并行获取其他数据（能耗、EUI、碳排放）
          const [summaryRes, euiRes] = await Promise.all([
            axios.get(`/api/buildings/${buildingId}/energy/summary`, { timeout: 5000 })
              .catch(err => { console.warn(`获取能耗摘要失败:`, err.message); return { data: null } }),
            axios.get('/api/energy/cop', { params: { building_id: buildingId }, timeout: 5000 })
              .catch(err => { console.warn(`获取EUI失败:`, err.message); return { data: null } })
          ])

          const summary = summaryRes.data?.data || summaryRes.data || {}
          const energyTypes = ['electricity', 'water', 'gas', 'steam', 'chilledwater', 'hotwater', 'irrigation', 'solar']
          const totalEnergy = energyTypes.reduce((sum, type) => sum + (summary[type] || summary[`${type}_energy`] || 0), 0)
          const carbon = summary.gas || summary.gas_energy || 0
          
          const euiData = euiRes.data?.data || euiRes.data || {}
          const eui = euiData.eui || euiData.cop || euiData.value || 0

          return {
            id: buildingId,
            buildingId: buildingId,
            site: deviceCount > 0 ? `${deviceCount} 个设备` : '无设备',
            energy: totalEnergy,
            eui: eui,
            carbon: carbon,
            status: topStatus,
            statusText: getStatusText(topStatus)
          }
        } catch (err) {
          console.error(`处理建筑 ${buildingId} 数据时出错:`, err)
          return null
        }
      })
    )

    const validBuildings = detailedBuildings.filter(item => item !== null) as TableItem[]
    if (props.sortConfig?.field === 'status') {
      const statusWeight: Record<string, number> = { 'error': 4, 'warning': 3, 'offline': 2, 'normal': 1 }
      validBuildings.sort((a, b) => props.sortConfig!.order === 'asc' ? statusWeight[a.status] - statusWeight[b.status] : statusWeight[b.status] - statusWeight[a.status])
    }
    buildings.value = validBuildings
  } catch (error: any) {
    console.error('获取建筑列表失败:', error)
    if (error.response) {
      console.error('响应数据:', error.response.data)
      console.error('响应状态:', error.response.status)
    }
    buildings.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchBuildings() })

watch(() => [props.filterForm?.status, props.advancedFilters, props.sortConfig], () => {
  pagination.value.currentPage = 1
  fetchBuildings()
}, { deep: true })

watch(() => pagination.value.currentPage, () => { fetchBuildings() })
watch(() => props.timeRange, () => { pagination.value.currentPage = 1; fetchBuildings() }, { immediate: false })

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize) || 1)
const displayStart = computed(() => pagination.value.total === 0 ? 0 : (pagination.value.currentPage - 1) * pagination.value.pageSize + 1)
const displayEnd = computed(() => {
  if (pagination.value.total === 0 && buildings.value.length === 0) return 0
  const effectiveTotal = pagination.value.total || buildings.value.length
  return Math.min(pagination.value.currentPage * pagination.value.pageSize, effectiveTotal)
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

const onPageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  pagination.value.currentPage = page
}
</script>

<style scoped>
.table-card {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
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
  font-weight: 500;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #E5E7EB;
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

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid transparent;
  white-space: nowrap;
}

.status-tag.normal {
  background: #ECFDF3;
  color: #027A48;
  border-color: #A7F3D0;
}

.status-tag.warning {
  background: #FFFBEB;
  color: #B45309;
  border-color: #FDE68A;
}

.status-tag.error {
  background: #FEF2F2;
  color: #B91C1C;
  border-color: #FECACA;
}

.status-tag.offline {
  background: #F3F4F6;
  color: #4B5563;
  border-color: #D1D5DB;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  display: inline-block;
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
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.view-btn {
  color: #3B82F6;
  border-color: #BFDBFE;
  background: #EFF6FF;
}

.action-btn.view-btn:hover {
  background: #3B82F6;
  color: #ffffff;
  border-color: #3B82F6;
  transform: scale(1.05);
}

.action-btn.stats-btn {
  color: #10B981;
  border-color: #A7F3D0;
  background: #ECFDF3;
}

.action-btn.stats-btn:hover {
  background: #10B981;
  color: #ffffff;
  border-color: #10B981;
  transform: scale(1.05);
}

.action-btn.warning-btn {
  color: #F59E0B;
  border-color: #FDE68A;
  background: #FFFBEB;
}

.action-btn.warning-btn:hover {
  background: #F59E0B;
  color: #ffffff;
  border-color: #F59E0B;
  transform: scale(1.05);
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
  color: #6B7280;
  font-weight: 400;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-btn {
  min-width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #E5E7EB;
  background: #ffffff;
  border-radius: 50%;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.page-btn:hover:not(:disabled):not(.active) {
  border-color: #D1D5DB;
  background: #F9FAFB;
  color: #111827;
}

.page-btn.active {
  background: #005BAC;
  color: #ffffff;
  border-color: #005BAC;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 91, 172, 0.2);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #F3F4F6;
  border-color: #E5E7EB;
  color: #9CA3AF;
}

.nav-btn {
  color: #6B7280;
}

@media (max-width: 768px) {
  .pagination-bar {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
