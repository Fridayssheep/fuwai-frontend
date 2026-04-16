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
          
          <div class="alert-badge">
            <span class="dot red"></span>
            <span>系统运行状态：检测到2处紧急故障待处理</span>
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
      <div class="table-wrapper">
        <table class="data-table" v-if="displayData.length > 0">
          <thead>
            <tr>
              <th v-if="isExportMode" class="checkbox-col">
                <label class="checkbox-label">
                  <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
                  <span class="check-box"></span>
                </label>
              </th>
              <th>建筑标识ID</th>
              <th>站点</th>
              <th>总能耗</th>
              <th>COP</th>
              <th>EUI指数</th>
              <th>碳排放</th>
              <th>系统状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in displayData" :key="item.id">
              <td v-if="isExportMode" class="checkbox-col">
                <label class="checkbox-label">
                  <input type="checkbox" :value="item.id" v-model="selectedBuildings" />
                  <span class="check-box"></span>
                </label>
              </td>
              <td>
                <div class="building-id">{{ item.buildingId }}</div>
              </td>
              <td>
                <div class="site-name">{{ item.site }}</div>
              </td>
              <td>
                <div class="energy-value">{{ item.totalEnergy.toLocaleString() }}</div>
                <div class="energy-unit">kWh</div>
              </td>
              <td :class="['cop-value', getCopClass(item.cop)]">{{ item.cop }}</td>
              <td>{{ item.eui }}</td>
              <td>{{ item.carbonEmission }}</td>
              <td>
                <span :class="['status-tag', item.status]">
                  <span class="status-dot"></span>
                  {{ item.statusText }}
                </span>
              </td>
              <td>
                <div class="action-btns">
                  <button class="action-btn view" @click="handleView(item)" title="查看">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                  <button class="action-btn leaf" @click="handleSuggest(item)" title="减排建议">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                    </svg>
                  </button>
                  <button class="action-btn warning" @click="handleFault(item)" title="故障查询">
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
        
        <!-- 空状态提示 -->
        <div v-else class="empty-state">
          <p>暂无符合条件的数据</p>
          <button class="btn-text" @click="handleReset">重置筛选条件</button>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-section" v-if="pagination.total > 0">
        <div class="pagination-info">
          显示第 {{ displayStart }} - {{ displayEnd }} 条，共 {{ pagination.total }} 条建筑运行记录
        </div>
        <div class="pagination-controls">
          <button class="page-btn" :disabled="pagination.currentPage === 1" @click="handlePageChange(pagination.currentPage - 1)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button 
            v-for="page in visiblePages" 
            :key="page"
            :class="['page-btn', { active: page === pagination.currentPage }]"
            @click="handlePageChange(page)"
          >
            {{ page }}
          </button>
          <button class="page-btn" :disabled="pagination.currentPage === totalPages" @click="handlePageChange(pagination.currentPage + 1)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
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
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import FilterModal from './FilterModal.vue';
import ExportModal from './ExportModal.vue'; // 引入 ExportModal 组件

const router = useRouter();
const showAdvanced = ref(false);
const showExportModal = ref(false); // 控制 ExportModal 显示

// 导出相关状态
const isExportMode = ref(false);
const selectedBuildings = ref<string[]>([]);

// 筛选表单
const filterForm = ref({
  status: ''
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
  field: 'eui' as 'eui' | 'totalEnergy' | 'status' | 'cop' | 'carbonEmission',
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
  cop: number;
  eui: number;
  carbonEmission: number;
  [key: string]: any;
}

const mockData: BuildingItem[] = [
  { id: 'BLDG-HQ-A01', buildingId: 'BLDG-HQ-A01', site: 'BLDG-HQ-A01', status: 'normal', statusText: '运行正常', totalEnergy: 1424.52, cop: 4.21, eui: 12.4, carbonEmission: 842.2 },
  { id: 'BLDG-RD-B04', buildingId: 'BLDG-RD-B04', site: 'BLDG-HQ-A01', status: 'warning', statusText: '告警状态', totalEnergy: 2108.88, cop: 3.15, eui: 18.2, carbonEmission: 1244.5 },
  { id: 'BLDG-DORM-01', buildingId: 'BLDG-DORM-01', site: 'BLDG-HQ-A01', status: 'normal', statusText: '运行正常', totalEnergy: 852.12, cop: 4.88, eui: 9.1, carbonEmission: 504.2 },
  { id: 'BLDG-PLANT-02', buildingId: 'BLDG-PLANT-02', site: 'BLDG-HQ-A01', status: 'error', statusText: '运行正常', totalEnergy: 3842.4, cop: 5.12, eui: 24.5, carbonEmission: 2284.1 },
  { id: 'BLDG-OFFICE-03', buildingId: 'BLDG-OFFICE-03', site: 'BLDG-HQ-A01', status: 'normal', statusText: '运行正常', totalEnergy: 1650.0, cop: 3.8, eui: 15.0, carbonEmission: 980.0 },
  { id: 'BLDG-WORK-05', buildingId: 'BLDG-WORK-05', site: 'BLDG-HQ-A01', status: 'warning', statusText: '告警状态', totalEnergy: 3100.5, cop: 4.2, eui: 22.1, carbonEmission: 1850.3 },
  { id: 'BLDG-LAB-06', buildingId: 'BLDG-LAB-06', site: 'BLDG-HQ-A01', status: 'normal', statusText: '运行正常', totalEnergy: 1200.8, cop: 3.9, eui: 8.5, carbonEmission: 720.5 },
  { id: 'BLDG-STORE-07', buildingId: 'BLDG-STORE-07', site: 'BLDG-HQ-A01', status: 'normal', statusText: '运行正常', totalEnergy: 680.25, cop: 5.5, eui: 6.2, carbonEmission: 405.0 },
  { id: 'BLDG-CLUB-08', buildingId: 'BLDG-CLUB-08', site: 'BLDG-HQ-A01', status: 'error', statusText: '异常状态', totalEnergy: 2450.0, cop: 3.2, eui: 19.8, carbonEmission: 1450.0 },
  { id: 'BLDG-HOSP-09', buildingId: 'BLDG-HOSP-09', site: 'BLDG-HQ-A01', status: 'warning', statusText: '告警状态', totalEnergy: 4200.0, cop: 4.0, eui: 28.5, carbonEmission: 2500.0 },
  { id: 'BLDG-SCH-10', buildingId: 'BLDG-SCH-10', site: 'BLDG-HQ-A01', status: 'normal', statusText: '运行正常', totalEnergy: 980.0, cop: 4.5, eui: 11.3, carbonEmission: 580.0 },
  { id: 'BLDG-MALL-11', buildingId: 'BLDG-MALL-11', site: 'BLDG-HQ-A01', status: 'error', statusText: '异常状态', totalEnergy: 5600.0, cop: 3.8, eui: 35.2, carbonEmission: 3320.0 },
  { id: 'BLDG-PARK-12', buildingId: 'BLDG-PARK-12', site: 'BLDG-HQ-A01', status: 'normal', statusText: '运行正常', totalEnergy: 450.0, cop: 6.0, eui: 4.8, carbonEmission: 268.0 },
  { id: 'BLDG-GYM-13', buildingId: 'BLDG-GYM-13', site: 'BLDG-HQ-A01', status: 'warning', statusText: '告警状态', totalEnergy: 1800.0, cop: 3.6, eui: 16.5, carbonEmission: 1070.0 },
];

// 核心：根据状态筛选数据
const filteredSortedData = computed(() => {
  let result = [...mockData];
  
  // 状态筛选
  if (filterForm.value.status) {
    result = result.filter(item => item.status === filterForm.value.status);
  }
  
  // 高级筛选
  const adv = advancedFilters.value;
  if (adv.buildingId) {
    result = result.filter(item => item.buildingId.toLowerCase().includes(adv.buildingId.toLowerCase()));
  }
  if (adv.buildingType?.length > 0) {
    result = result.filter(item => adv.buildingType.includes(item.buildingType));
  }
  
  // 排序
  result.sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;
    
    switch (sortConfig.value.field) {
      case 'eui':
        aVal = a.eui;
        bVal = b.eui;
        break;
      case 'totalEnergy':
        aVal = a.totalEnergy;
        bVal = b.totalEnergy;
        break;
      case 'carbonEmission':
        aVal = a.carbonEmission;
        bVal = b.carbonEmission;
        break;
      case 'status':
        // 系统状态排序：按状态优先级排序
        const statusOrder = { 'error': 0, 'warning': 1, 'normal': 2 };
        aVal = statusOrder[a.status] ?? 3;
        bVal = statusOrder[b.status] ?? 3;
        break;
      default:
        aVal = a.eui;
        bVal = b.eui;
    }
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortConfig.value.order === 'asc' 
        ? aVal - bVal
        : bVal - aVal;
    }
    
    if (aVal < bVal) return sortConfig.value.order === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.value.order === 'asc' ? 1 : -1;
    return 0;
  });
  
  return result;
});

// 监听总数变化
watch(
  () => filteredSortedData.value.length,
  (newTotal) => {
    pagination.value.total = newTotal;
    const maxPage = Math.ceil(newTotal / pagination.value.pageSize) || 1;
    if (pagination.value.currentPage > maxPage) {
      pagination.value.currentPage = 1;
    }
  },
  { immediate: true }
);

// 分页数据
const displayData = computed(() => {
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize;
  return filteredSortedData.value.slice(start, start + pagination.value.pageSize);
});

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize) || 1);
const displayStart = computed(() => pagination.value.total === 0 ? 0 : (pagination.value.currentPage - 1) * pagination.value.pageSize + 1);
const displayEnd = computed(() => Math.min(pagination.value.currentPage * pagination.value.pageSize, pagination.value.total));

const visiblePages = computed(() => {
  const pages: number[] = [];
  const maxVisible = 5;
  let start = Math.max(1, pagination.value.currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages.value, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

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

const handlePageChange = (page: number) => {
  if (page >= 1 && page <= totalPages.value) pagination.value.currentPage = page;
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

const isAllSelected = computed(() => displayData.value.length > 0 && displayData.value.every(item => selectedBuildings.value.includes(item.id)));

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedBuildings.value = selectedBuildings.value.filter(id => !displayData.value.some(item => item.id === id));
  } else {
    displayData.value.forEach(item => {
      if (!selectedBuildings.value.includes(item.id)) selectedBuildings.value.push(item.id);
    });
  }
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
