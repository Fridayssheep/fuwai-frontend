<template>
  <div class="table-card">
    <!-- 表格 -->
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>建筑标识ID</th>
            <th>站点</th>
            <th class="text-right">总能耗</th>
            <th class="text-center">COP</th>
            <th class="text-right">EUI 指数</th>
            <th class="text-right">碳排放</th>
            <th class="text-center">系统状态</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data" :key="item.id">
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
            <td class="text-center">
              <span :class="['cop', item.cop < 3.0 ? 'warning' : 'good']">{{ item.cop }}</span>
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
                <button class="action-btn blue" @click="$emit('view', item)" title="查看">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
                <button class="action-btn green" @click="$emit('suggest', item)" title="减排建议">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
                    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
                  </svg>
                </button>
                <button class="action-btn orange" @click="$emit('fault', item)" title="故障查询">
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
    </div>

    <!-- 分页栏（从 index.vue 移到这里） -->
    <div class="pagination-bar" v-if="pagination && pagination.total > 0">
      <div class="pagination-info">
        显示第 {{ displayStart }}-{{ displayEnd }} 条，共 {{ pagination.total }} 条建筑运行记录
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
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface TableItem {
  id: string
  buildingId: string
  site: string
  energy: number
  cop: number
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

const props = defineProps<{
  data: TableItem[]
  pagination?: PaginationInfo  // 新增：分页信息
}>()

const emit = defineEmits(['view', 'suggest', 'fault', 'page-change'])

// 计算总页数
const totalPages = computed(() => {
  if (!props.pagination) return 1
  return Math.ceil(props.pagination.total / props.pagination.pageSize)
})

// 计算显示范围
const displayStart = computed(() => {
  if (!props.pagination || props.pagination.total === 0) return 0
  return (props.pagination.currentPage - 1) * props.pagination.pageSize + 1
})

const displayEnd = computed(() => {
  if (!props.pagination) return 0
  const end = props.pagination.currentPage * props.pagination.pageSize
  return Math.min(end, props.pagination.total)
})

// 可见页码（最多显示5个）
const visiblePages = computed(() => {
  if (!props.pagination) return []
  const pages: number[] = []
  const maxVisible = 5
  const current = props.pagination.currentPage
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

// 页码切换事件
const onPageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  emit('page-change', page)
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

.cop {
  font-weight: 600;
}

.cop.good {
  color: #27AE60;
}

.cop.warning {
  color: #F39C12;
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
</style>
