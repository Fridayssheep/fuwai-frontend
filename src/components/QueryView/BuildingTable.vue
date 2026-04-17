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
                <span class="dot"></span>
                {{ item.statusText }}
              </span>
            </td>
                    <td class="text-right">
              <div class="actions">
                <!-- 蓝色眼睛：跳转到建筑详情 BuildingDetail.vue -->
                <button class="action-btn blue" @click="$emit('view-detail', item)" title="查看详情">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
                
                <!-- 绿色叶子：打开统计弹窗 BuildingDetailsModal.vue -->
                <button class="action-btn green" @click="$emit('view-stats', item)" title="统计数据">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 20h9M12 20V4M12 20H3M12 4v8m0-8h9M12 4H3"/>
                  </svg>
                </button>
                
                <!-- 橙色警告：跳转到故障分析 -->
                <button class="action-btn orange" @click="$emit('fault-analysis', item)" title="故障分析">
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

      <div class="pagination-bar">
        <div class="pagination-info">
          显示 {{ displayStart }}-{{ displayEnd }} 条，共 {{ pagination.total }} 条建筑运行数据
        </div>
        <div class="pagination-controls">
          <!-- 上一页 -->
          <button 
            class="page-btn nav-btn" 
            :disabled="pagination.currentPage === 1"
            @click="onPageChange(pagination.currentPage - 1)"  >
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
  status: 'normal' | 'warning' | 'error'
  statusText: string
}

interface PaginationInfo {
  currentPage: number
  pageSize: number
  total: number
}

// 不再接收外部死数据，完全自主获取
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

// 注意：computed/ref/onMounted/watch 已经在第1行导入过了，这里不需要再导入

// 模板直接使用 buildings，不需要 displayData

// 内部数据状态（自主管理）- 必须先声明
const buildings = ref<TableItem[]>([])
const pagination = ref({
  currentPage: 1,
  pageSize: 7,  // 一页七个
  total: 0
})
const loading = ref(false)

// 导入时间管理工具（根据实际路径调整，如果在 QueryView 目录下，通常是 ../../utils/timeManager）
import { useTimeManager } from '../../utils/timeManager'

// 初始化时间管理器
const { getCurrentTimeString } = useTimeManager()

// 获取设置页面配置的当前时间（如果没有设置则使用系统时间）
const getCurrentTime = () => {
  const timeStr = getCurrentTimeString()
  // 如果 timeManager 返回的是字符串，转换为 Date 对象
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
// 获取建筑级能耗摘要（总能耗 = 电力 + 热水 + 冷冻水等）
const fetchEnergySummary = async (buildingId: string, timeRange: any) => {
  try {
    const response = await axios.get(`/api/buildings/${buildingId}/energy/summary`, {
      params: {
        start_time: timeRange.start_time,
        end_time: timeRange.end_time
      }
    })
    const data = response.data
    if (data && data.summary) {
      return data.summary.total || 0
    }
    if (Array.isArray(data)) {
      return data.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
    }
    return 0
  } catch (error) {
    console.error(`获取建筑 ${buildingId} 能耗摘要失败:`, error)
    return 0
  }
}

// 获取EUI计算结果
const fetchEUI = async (buildingId: string, timeRange: any) => {
  try {
    const response = await axios.get('/api/energy/cop', {
      params: {
        building_id: buildingId,
        start_time: timeRange.start_time,
        end_time: timeRange.end_time
      }
    })
    return response.data.eui || response.data.value || 0
  } catch (error) {
    console.error(`获取建筑 ${buildingId} EUI失败:`, error)
    return 0
  }
}

// 获取碳排放（gas类型）
const fetchCarbon = async (buildingId: string, timeRange: any) => {
  try {
    const response = await axios.get('/api/energy/query', {
      params: {
        meter_type: 'gas',
        building_id: buildingId,
        start_time: timeRange.start_time,
        end_time: timeRange.end_time
      }
    })
    return response.data.total || response.data.value || 0
  } catch (error) {
    console.error(`获取建筑 ${buildingId} 碳排放失败:`, error)
    return 0
  }
}

// 根据时间范围计算开始和结束时间
const calculateTimeRange = (range: string) => {
  const now = getCurrentTime()
  const end = now.toISOString()
  let start = now
  
  const year = now.getFullYear()
  const month = now.getMonth()
  const date = now.getDate()
  const day = now.getDay() // 0是周日
  
  switch (range) {
    case 'today':
      start = new Date(year, month, date, 0, 0, 0)
      break
    case 'week':
      // 本周一（如果今天是周日，则回退6天，否则回退到本周一）
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
  
  return {
    start_time: start.toISOString(),
    end_time: end
  }
}

// 获取建筑列表数据（重写版）
const fetchBuildings = async () => {
  loading.value = true
  try {
    // 第一步：获取建筑基础列表（分页）
    const buildingsRes = await axios.get('/api/buildings', {
      params: {
        page: pagination.value.currentPage,
        page_size: pagination.value.pageSize,  // 7条每页
        status: props.filterForm?.status || undefined,
        building_id: props.advancedFilters?.buildingId || undefined,
        site: props.advancedFilters?.site || undefined,
        sort_field: props.sortConfig?.field || undefined,
        sort_order: props.sortConfig?.order || undefined
      }
    })
    
    const buildingList = buildingsRes.data?.data || buildingsRes.data?.items || []
    pagination.value.total = buildingsRes.data?.total || buildingsRes.data?.total_count || 0
    
    if (!buildingList.length) {
      buildings.value = []
      loading.value = false
      return
    }

    // 第二步：为每个建筑获取详细数据（并行）
    const detailedBuildings = await Promise.all(
      buildingList.map(async (building: any) => {
        const buildingId = building.building_id || building.id || building.buildingId
        
        // 并行获取：设备列表、能耗摘要、EUI
        const [metersRes, summaryRes, euiRes] = await Promise.all([
          // 获取设备列表（用于统计设备个数和系统状态）
          axios.get('/api/meters', {
            params: { building_id: buildingId }
          }).catch(() => ({ data: [] })),
          
          // 获取能耗摘要（包含所有表计类型）
          axios.get(`/api/buildings/${buildingId}/energy/summary`).catch(() => ({ data: null })),
          
          // 获取EUI/COP
          axios.get('/api/energy/cop', {
            params: { building_id: buildingId }
          }).catch(() => ({ data: null }))
        ])

        // 处理设备数据
        const meters = metersRes.data?.data || metersRes.data || []
        const deviceCount = meters.length  // 设备个数
        
        // 获取所有设备的状态（去重）
        const statusSet = new Set(meters.map((m: any) => m.status || 'normal'))
        const statuses = Array.from(statusSet) as string[]
        
        // 优先级：异常 > 告警 > 离线 > 正常
        const statusPriority: Record<string, number> = {
          'error': 4,
          'warning': 3,
          'offline': 2,
          'normal': 1
        }
        // 取优先级最高的状态作为建筑状态
        const topStatus = statuses.sort((a, b) => 
          (statusPriority[b] || 0) - (statusPriority[a] || 0)
        )[0] || building.status || 'normal'

        // 处理能耗数据
        const summary = summaryRes.data?.data || summaryRes.data || {}
        
        // 计算总能耗（8种表计类型之和）
        const energyTypes = ['electricity', 'water', 'gas', 'steam', 'chilledwater', 'hotwater', 'irrigation', 'solar']
        const totalEnergy = energyTypes.reduce((sum, type) => {
          return sum + (summary[type] || summary[`${type}_energy`] || 0)
        }, 0)
        
        // 碳排放使用燃气（gas）能耗
        const carbon = summary.gas || summary.gas_energy || 0

        // 处理EUI/COP
        const euiData = euiRes.data?.data || euiRes.data || {}
        const eui = euiData.eui || euiData.cop || euiData.value || 0

        return {
          id: buildingId,
          buildingId: buildingId,
          site: deviceCount > 0 ? `${deviceCount} 个设备` : '无设备',  // 显示设备个数
          energy: totalEnergy,
          eui: eui,
          carbon: carbon,
          status: topStatus,
          statusText: getStatusText(topStatus),
          // 保留原始状态列表用于展示（如果有多个状态）
          statusList: statuses
        }
      })
    )

    // 如果按系统状态排序，进行二次排序（确保异常>告警>离线>正常）
    if (props.sortConfig?.field === 'status') {
      const statusWeight: Record<string, number> = {
        'error': 4,
        'warning': 3,
        'offline': 2,
        'normal': 1
      }
      detailedBuildings.sort((a, b) => {
        const weightA = statusWeight[a.status] || 0
        const weightB = statusWeight[b.status] || 0
        return props.sortConfig!.order === 'asc' 
          ? weightA - weightB 
          : weightB - weightA
      })
    }

    buildings.value = detailedBuildings
    
  } catch (error) {
    console.error('获取建筑列表失败:', error)
    buildings.value = []
  } finally {
    loading.value = false
  }
}

// 组件挂载时自动获取数据
onMounted(() => {
  fetchBuildings()
})

// 监听筛选条件变化，变化时重置到第一页并重新获取
watch(() => [props.filterForm?.status, props.advancedFilters, props.sortConfig], () => {
  pagination.value.currentPage = 1
  fetchBuildings()
}, { deep: true, immediate: false })

// 监听页码变化（已有 onPageChange 修改内部状态，这里确保页码变化时重新请求）
watch(() => pagination.value.currentPage, () => {
  fetchBuildings()
})

// 监听时间范围变化
watch(() => props.timeRange, () => {
  pagination.value.currentPage = 1
  fetchBuildings()
}, { immediate: false })

// 计算总页数
const totalPages = computed(() => {
  return Math.ceil(pagination.value.total / pagination.value.pageSize)
})

// 计算显示范围
const displayStart = computed(() => {
  if (pagination.value.total === 0) return 0
  return (pagination.value.currentPage - 1) * pagination.value.pageSize + 1
})

const displayEnd = computed(() => {
  if (pagination.value.total === 0) return 0
  const end = pagination.value.currentPage * pagination.value.pageSize
  return Math.min(end, pagination.value.total)
})

// 可见页码（最多显示5个）
const visiblePages = computed(() => {
  const pages: number[] = []
  const maxVisible = 5
  const current = pagination.value.currentPage
  const total = totalPages.value
  
  let start = Math.max(1, current - Math.floor(maxVisible / 2))
  let end = Math.min(total, start + maxVisible - 1)
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

// 页码切换事件（内部处理，不再emit）
const onPageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  pagination.value.currentPage = page  // 直接修改内部状态，watch会自动触发fetchBuildings
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
  font-family: monospace;
  font-weight: 600;
  color: #111827;
}

.site {
  font-family: monospace;
  color: #6B7280;
}

.energy {
  font-weight: 600;
  color: #005BAC;
}

.unit {
  font-size: 12px;
  color: #9CA3AF;
  margin-top: 2px;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid transparent;
}

.status-tag.normal {
  background: #F0FDF4;
  color: #16A34A;
  border-color: #DCFCE7;
}

.status-tag.warning {
  background: #FFFBEB;
  color: #D97706;
  border-color: #FEF3C7;
}

.status-tag.error {
  background: #FEF2F2;
  color: #DC2626;
  border-color: #FEE2E2;
}

.status-tag .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-tag.offline {
  background: #F3F4F6;
  color: #6B7280;
  border-color: #E5E7EB;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
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
  transition: all 0.2s;
}

.action-btn.blue {
  color: #005BAC;
  border-color: #BFDBFE;
}

.action-btn.blue:hover {
  background: #EFF6FF;
}

.action-btn.green {
  color: #27AE60;
  border-color: #BBF7D0;
}

.action-btn.green:hover {
  background: #F0FDF4;
}

.action-btn.orange {
  color: #F39C12;
  border-color: #FDE68A;
}

.action-btn.orange:hover {
  background: #FFFBEB;
}

/* 分页栏样式（从 index.vue 移到此处） */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid #F3F4F6;
  background: white;
  margin-top: 0; /* 紧贴表格 */
}

.pagination-info {
  font-size: 14px;
  color: #999;
  font-weight: 400;
}

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
  border: 1px solid #e0e0e0;
  background: #fff;
  border-radius: 50%;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.page-btn:hover:not(:disabled):not(.active) {
  border-color: #005BAC;
  color: #005BAC;
  background: #f5f7fa;
}

.nav-btn {
  color: #999;
  border-color: #e0e0e0;
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: #e8e8e8;
  color: #ccc;
}

.page-btn.active {
  background: #005BAC;
  color: #fff;
  border-color: #005BAC;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 91, 172, 0.2);
}
.status-tag.offline {
  background: #F3F4F6;
  color: #6B7280;
  border-color: #E5E7EB;
}

</style>
