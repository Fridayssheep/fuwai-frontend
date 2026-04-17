<template>
  <div class="query-page">
    <h1>建筑查询引擎</h1>
    
    <!-- 筛选面板 -->
    <div class="filter-panel">
      <div class="panel-header">
        <div class="title-area">
          <div class="icon-box">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" style="color: #005BAC;">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
          </div>
          <h2>查询筛选面板</h2>
          
          <!-- 接口获取失败时显示错误状态 -->
          <div v-if="isHighlightsError" class="alert-badge" style="background: #FEF3F2; border-color: #FECACA; color: #DC2626;">
            <span class="dot" style="background: #DC2626;"></span>
            <span>系统运行状态：数据获取失败</span>
          </div>
          <!-- 有异常数据时显示异常状态 -->
          <div v-else-if="highlights.abnormalBuildings > 0 || highlights.alertCount > 0" class="alert-badge">
            <span class="dot red"></span>
            <span>系统运行状态：检测到{{ highlights.abnormalBuildings }}处异常状态建筑，{{ highlights.alertCount }}个告警待处理</span>
          </div>
          <!-- 正常状态 -->
          <div v-else class="alert-badge" style="background: #F0FDF4; border-color: #86EFAC; color: #16A34A;">
            <span class="dot" style="background: #16A34A;"></span>
            <span>系统运行状态：运行正常</span>
          </div>

        </div>
      </div>
      
      <div class="filter-row">
        <!-- 建筑选择 -->
        <div class="filter-item">
          <label>建筑选择</label>
          <select v-model="filterForm.status" class="select-box">
            <option value="">全部建筑</option>
            <option value="normal">正常</option>
            <option value="error">异常</option>
            <option value="warning">告警</option>
          </select>
        </div>

        <!-- 时间范围筛选（新增） -->
        <div class="filter-item">
          <label>时间范围</label>
          <select v-model="filterForm.timeRange" class="select-box">
            <option value="today">今日</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="quarter">本季</option>
            <option value="year">本年</option>
          </select>
        </div>

        <div class="button-group">
          <button class="btn btn-primary-dark" @click="showAdvanced = true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
              <line x1="4" y1="21" x2="4" y2="14"></line>
              <line x1="4" y1="10" x2="4" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12" y2="3"></line>
              <line x1="20" y1="21" x2="20" y2="16"></line>
              <line x1="20" y1="12" x2="20" y2="3"></line>
              <line x1="1" y1="14" x2="7" y2="14"></line>
              <line x1="9" y1="8" x2="15" y2="8"></line>
              <line x1="17" y1="16" x2="23" y2="16"></line>
            </svg>
            高级查询
          </button>
          <button class="btn btn-outline" @click="handleReset">重置</button>
        </div>
      </div>
    </div>
    
    <!-- 已激活的高级筛选标签 -->
    <div v-if="hasActiveAdvancedFilters" class="active-filters-bar">
      <span class="filter-label">已应用高级筛选：</span>
      <span v-if="advancedFilters.buildingId" class="filter-tag">
        建筑ID含"{{ advancedFilters.buildingId }}"
        <button @click="clearAdvancedFilter('buildingId')">×</button>
      </span>
      <span v-if="advancedFilters.site" class="filter-tag">
        设备含"{{ advancedFilters.site }}"
        <button @click="clearAdvancedFilter('site')">×</button>
      </span>
      <span v-if="advancedFilters.buildingType?.length" class="filter-tag">
        类型：{{ advancedFilters.buildingType.join(', ') }}
        <button @click="clearAdvancedFilter('buildingType')">×</button>
      </span>
      <button class="clear-all-btn" @click="clearAllAdvancedFilters">清除所有</button>
    </div>

    <!-- 数据卡片 -->
    <div class="data-card">
      <!-- 卡片头部：排序 + 导出按钮 -->
      <div class="card-header">
        <div class="sort-section">
          <span class="sort-label">排序依据：</span>
          <div class="sort-tags">
            <button 
              :class="['sort-tag', { active: sortConfig.field === 'eui' }]"
              @click="handleSort('eui')"
            >
              能耗强度(EUI)
            </button>
            <button 
              :class="['sort-tag', { active: sortConfig.field === 'totalEnergy' }]"
              @click="handleSort('totalEnergy')"
            >
              总能耗
            </button>
            <button 
              :class="['sort-tag', { active: sortConfig.field === 'status' }]"
              @click="handleSort('status')"
            >
              系统状态
            </button>
            <button 
              :class="['sort-tag', { active: sortConfig.field === 'carbonEmission' }]"
              @click="handleSort('carbonEmission')"
            >
              碳排放
            </button>
          </div>
          
          <span class="sort-divider"></span>
          
          <span class="sort-order-icon" @click="toggleSortOrder" :title="sortConfig.order === 'asc' ? '升序' : '降序'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <template v-if="sortConfig.order === 'asc'">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 5 5 12"></polyline>
              </template>
              <template v-else>
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="5 12 12 19 19 12"></polyline>
              </template>
            </svg>
            升序/降序
          </span>
        </div>
        
        <!-- 导出按钮组 -->
        <div class="export-section">
          <template v-if="isExportMode">
            <button class="btn-cancel-select" @click="cancelExportMode">取消选择</button>
            <button class="btn-confirm-export-green" @click="handleExportClick">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              确认导出
              <span v-if="selectedBuildings.length > 0" class="selected-count">({{ selectedBuildings.length }})</span>
            </button>
          </template>
          <button v-else class="btn-export" @click="handleExportClick">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            导出运行数据
          </button>
        </div>
      </div>

      <!-- 表格区域 -->
      <!-- 直接调用 BuildingTable 组件，自主获取数据 -->
<BuildingTable 
  :filter-form="filterForm"
  :advanced-filters="advancedFilters"
  :sort-config="sortConfig"
  :time-range="(filterForm.timeRange as 'today' | 'week' | 'month' | 'quarter' | 'year')"
  @view="handleView" 
  @suggest="handleSuggest" 
  @fault="handleFault"
/>

    <!-- 高级筛选弹窗 -->
    <FilterModal 
      v-model:visible="showAdvanced" 
      @save="handleAdvancedSave"
    />

    <!-- 导出运行数据弹窗 - 复用 ExportModal 组件 -->
    <ExportModal 
      v-model:visible="showExportModal" 
      @export="handleExportConfirm"
    />

  </div>
</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import FilterModal from './FilterModal.vue';
import BuildingTable from './BuildingTable.vue'  // 根据实际路径调整
import ExportModal from './ExportModal.vue'  

const router = useRouter();
const showAdvanced = ref(false);
const showExportModal = ref(false); // 控制 ExportModal 显示

// 存储后端返回的高亮事项数据（异常建筑数、告警数等）
const highlights = ref({
  abnormalBuildings: 0,  // 异常建筑数量
  alertCount: 0,         // 告警数量
  warningCount: 0        // 高能耗预警数量
})
const isHighlightsError = ref(false)  // 标记接口是否获取失败

// 导出相关状态
const isExportMode = ref(false);
const selectedBuildings = ref<string[]>([]);

// 筛选表单
const filterForm = ref({
  status: '',
  timeRange: 'today' // 默认今日
});
const advancedFilters = ref<Record<string, any>>({});

const hasActiveAdvancedFilters = computed(() => {
  return Object.keys(advancedFilters.value).length > 0 && 
    Object.values(advancedFilters.value).some(v => {
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'object' && v !== null) {
        return Object.values(v).some(subV => subV !== '' && subV !== null && subV !== undefined);
      }
      return v !== '' && v !== null && v !== undefined;
    });
});

const sortConfig = ref({
  field: 'eui' as 'eui' | 'totalEnergy' | 'status' | 'carbonEmission',
  order: 'asc' as 'asc' | 'desc'
});

const pagination = ref({
  currentPage: 1,
  pageSize: 7,
  total: 0
});

// 模拟数据
interface BuildingItem {
  id: string;
  buildingId: string;
  site: string;
  status: 'normal' | 'warning' | 'error';
  statusText: string;
  totalEnergy: number;
  eui: number;
  carbonEmission: number;
  [key: string]: any;
}

// 方法
const handleSearch = () => {
  pagination.value.currentPage = 1;
};

const handleReset = () => {
  filterForm.value.status = '';
  advancedFilters.value = {};
  pagination.value.currentPage = 1;
  sortConfig.value.field = 'eui';
  sortConfig.value.order = 'asc';
  isExportMode.value = false;
  selectedBuildings.value = [];
};

const handleSort = (field: any) => {
  if (sortConfig.value.field !== field) {
    sortConfig.value.field = field;
    sortConfig.value.order = 'asc';
  }
};

const toggleSortOrder = () => {
  sortConfig.value.order = sortConfig.value.order === 'asc' ? 'desc' : 'asc';
};

const getCopClass = (cop: number) => {
  if (cop >= 4.5) return 'high';
  if (cop >= 3.5) return 'normal';
  return 'low';
};

// 修改后的导出点击逻辑
const handleExportClick = () => {
  if (!isExportMode.value) {
    // 第一次点击：进入选择模式
    isExportMode.value = true;
    selectedBuildings.value = [];
  } else {
    // 已在选择模式，点击确认导出
    if (selectedBuildings.value.length === 0) {
      alert('请至少选择一项建筑数据');
      return;
    }
    // 显示导出弹窗（复用 ExportModal）
    showExportModal.value = true;
  }
};

// 处理导出确认
const handleExportConfirm = (exportData: { format: string }) => {
  console.log('导出数据:', exportData);
  alert(`已将 ${selectedBuildings.value.length} 条数据导出为 Markdown (.md) 格式`);
  // 重置导出状态
  isExportMode.value = false;
  selectedBuildings.value = [];
};

const cancelExportMode = () => {
  isExportMode.value = false;
  selectedBuildings.value = [];
};

// 临时禁用全选功能（因为数据已在子组件中管理，如需全选需通过子组件emit实现）
const isAllSelected = computed(() => false);

const toggleSelectAll = () => {
  console.warn('全选功能需从子组件获取数据后实现');
  // 如需实现，建议通过 ref 调用 BuildingTable 的方法或监听 emit 事件
};

const handleAdvancedSave = (filters: any) => {
  advancedFilters.value = { ...filters };
  pagination.value.currentPage = 1;
};

const clearAdvancedFilter = (key: string) => {
  delete advancedFilters.value[key];
  advancedFilters.value = { ...advancedFilters.value };
};

const clearAllAdvancedFilters = () => {
  advancedFilters.value = {};
};

const handleView = (item: BuildingItem) => router.push(`/building/${item.buildingId}`);
const handleSuggest = (item: BuildingItem) => console.log('减排建议:', item.buildingId);
const handleFault = (item: BuildingItem) => router.push({
  path: '/fault-analysis',
  query: {
    building_id: item.buildingId,
    meter: 'electricity'
  }
});

// 调用后端接口获取高亮事项数据
const fetchHighlights = async () => {
  try {
    isHighlightsError.value = false  // 重置错误状态
    const response = await axios.get('/api/dashboard/highlights')
    // 假设后端返回格式：{ abnormalBuildings: 2, alertCount: 5, warningCount: 1 }
    if (response.data) {
      highlights.value = {
        abnormalBuildings: response.data.abnormalBuildings || 0,
        alertCount: response.data.alertCount || 0,
        warningCount: response.data.warningCount || 0
      }
    }
  } catch (error) {
    console.error('获取高亮事项失败:', error)
    isHighlightsError.value = true  // 标记为错误状态
  }
}

// 页面加载时自动获取高亮事项
onMounted(() => {
  fetchHighlights()
})

</script>

<style scoped>
.query-page {
  min-height: 100%;
  overflow-y: auto;
  margin-left: 20px;
  width: calc(100% - 20px);
  box-sizing: border-box;
  background: #F5F7FA;
  padding: 24px;
}

h1 {
  font-size: 20px;
  font-weight: 800;
  color: #002B54;
  margin-bottom: 20px;
  letter-spacing: -0.5px;
}

/* 筛选面板样式 */
.filter-panel {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #E5E7EB;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  padding: 20px;
  margin-bottom: 16px;
}

.panel-header {
  margin-bottom: 16px;
}

.title-area {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.icon-box {
  width: 32px;
  height: 32px;
  background: #EFF6FF;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title-area h2 {
  font-size: 16px;
  font-weight: 600;
  color: #1F2937;
  margin: 0;
}

.alert-badge {
  margin-left: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 6px;
  font-size: 12px;
  color: #DC2626;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #DC2626;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-item label {
  font-size: 14px;
  color: #4B5563;
  font-weight: 500;
  white-space: nowrap;
}

.select-box {
  width: 160px;
  height: 36px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  color: #374151;
  background: white;
  outline: none;
  cursor: pointer;
}

.button-group {
  margin-left: auto;
  display: flex;
  gap: 12px;
}

.btn {
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: #005BAC;
  color: white;
}

.btn-primary:hover {
  background: #004a8d;
}

.btn-primary-dark {
  background: #002B54;
  color: white;
}

.btn-primary-dark:hover {
  background: #001f3d;
}

.btn-outline {
  background: white;
  color: #374151;
  border: 1px solid #D1D5DB;
}

.btn-outline:hover {
  background: #F3F4F6;
  border-color: #9CA3AF;
}

/* 已激活的筛选标签 */
.active-filters-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 14px;
  color: #666;
}

.filter-tag {
  background: #E6F7FF;
  border: 1px solid #91D5FF;
  color: #005BAC;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.filter-tag button {
  border: none;
  background: transparent;
  color: #005BAC;
  cursor: pointer;
  font-size: 14px;
}

.clear-all-btn {
  border: none;
  background: transparent;
  color: #999;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
}

/* 数据卡片 */
.data-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  min-height: 500px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.sort-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.sort-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.sort-tags {
  display: flex;
  gap: 8px;
}

.sort-tag {
  padding: 8px 16px;
  border: none;
  background: #F3F4F6;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  transition: all 0.2s;
  font-weight: 500;
}

.sort-tag:hover {
  background: #E5E7EB;
}

.sort-tag.active {
  background: #005BAC;
  color: white;
}

.sort-divider {
  width: 1px;
  height: 20px;
  background: #E8E8E8;
  margin: 0 4px;
}

.sort-order-icon {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.sort-order-icon:hover {
  background: #F5F5F5;
  color: #005BAC;
}

/* 导出按钮 */
.export-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-export {
  height: 40px;
  padding: 0 24px;
  background: #52C41A;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(82, 196, 26, 0.2);
}

.btn-export:hover {
  background: #389E0D;
  transform: translateY(-1px);
}

.btn-cancel-select {
  height: 40px;
  padding: 0 20px;
  border: 1px solid #D9D9D9;
  background: white;
  color: #666;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
}

.btn-confirm-export-green {
  height: 40px;
  padding: 0 24px;
  background: #52C41A;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
}

/* 表格 */
.table-wrapper {
  margin-bottom: 24px;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th {
  text-align: left;
  padding: 12px 16px;
  color: #666;
  font-weight: 500;
  border-bottom: 1px solid #F0F0F0;
  background: #FAFAFA;
}

.data-table td {
  padding: 20px 16px;
  border-bottom: 1px solid #F0F0F0;
  vertical-align: middle;
}

.checkbox-col {
  width: 40px;
  text-align: center;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.checkbox-label input {
  display: none;
}

.check-box {
  width: 16px;
  height: 16px;
  border: 2px solid #D9D9D9;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
}

.checkbox-label input:checked + .check-box {
  background: #52C41A;
  border-color: #52C41A;
}

.checkbox-label input:checked + .check-box::after {
  content: '';
  width: 5px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.building-id {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #002B54;
  font-size: 15px;
}

.site-name {
  color: #666;
  font-size: 14px;
}

.energy-value {
  color: #005BAC;
  font-weight: 600;
  font-size: 16px;
}

.energy-unit {
  color: #999;
  font-size: 12px;
}

.cop-value {
  font-weight: 600;
}

.cop-value.high { color: #52C41A; }
.cop-value.normal { color: #FAAD14; }
.cop-value.low { color: #FF4D4F; }

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.status-tag.normal {
  background: #F6FFED;
  color: #52C41A;
}

.status-tag.warning {
  background: #FFFBE6;
  color: #FAAD14;
}

.status-tag.error {
  background: #FFF2F0;
  color: #FF4D4F;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.action-btns {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  background: transparent;
}

.action-btn.view {
  color: #005BAC;
  border: 1px solid #E6F7FF;
  background: #E6F7FF;
}

.action-btn.view:hover {
  background: #005BAC;
  color: white;
}

.action-btn.leaf {
  color: #52C41A;
  border: 1px solid #F6FFED;
  background: #F6FFED;
}

.action-btn.leaf:hover {
  background: #52C41A;
  color: white;
}

.action-btn.warning {
  color: #FAAD14;
  border: 1px solid #FFFBE6;
  background: #FFFBE6;
}

.action-btn.warning:hover {
  background: #FAAD14;
  color: white;
}

/* 分页 */
.pagination-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid #F0F0F0;
}

.pagination-info {
  color: #999;
  font-size: 14px;
}

.pagination-controls {
  display: flex;
  gap: 8px;
}

.page-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: none;
  background: white;
  color: #666;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.page-btn:hover:not(:disabled):not(.active) {
  background: #F5F5F5;
}

.page-btn.active {
  background: #005BAC;
  color: white;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #D9D9D9;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-state p {
  margin-bottom: 16px;
}

.btn-text {
  border: none;
  background: transparent;
  color: #005BAC;
  cursor: pointer;
  font-size: 14px;
  text-decoration: underline;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .query-page {
    margin-left: 0;
    width: 100%;
    padding: 16px;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .button-group {
    margin-left: 0;
    width: 100%;
    justify-content: flex-end;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
