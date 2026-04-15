<template>
  <div class="query-page">
    <h1>建筑查询引擎</h1>
    
    <FilterPanel 
      v-model:status="filterForm.status"
      v-model:timeRange="filterForm.timeRange"
      @search="handleSearch" 
      @reset="handleReset"
      @advanced="showAdvanced = true"
    />
    
    <div class="table-card">
      <div class="table-card-header">
        <h3 class="table-title">运行数据详细记录表</h3>
        <button class="export-btn-rounded">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          导出运行数据
        </button>
      </div>
      
      <div class="sort-bar-merged">
        <span class="sort-label">排序依据：</span>
        <button 
          :class="['sort-btn-merged', { active: sortConfig.field === 'eui' }]"
          @click="handleSort('eui')"
        >
          能耗强度(EUI)
        </button>
        <button 
          :class="['sort-btn-merged', { active: sortConfig.field === 'totalEnergy' }]"
          @click="handleSort('totalEnergy')"
        >
          总能耗
        </button>
        <button 
          :class="['sort-btn-merged', { active: sortConfig.field === 'cop' }]"
          @click="handleSort('cop')"
        >
          COP
        </button>
        <button 
          :class="['sort-btn-merged', { active: sortConfig.field === 'carbonEmission' }]"
          @click="handleSort('carbonEmission')"
        >
          碳排放
        </button>
        
        <span 
          class="sort-order-icon-merged" 
          @click="toggleSortOrder"
          :title="sortConfig.order === 'asc' ? '当前升序，点击切换降序' : '当前降序，点击切换升序'"
        >
          <svg 
            v-if="sortConfig.order === 'asc'" 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 5 5 12"></polyline>
          </svg>
          <svg 
            v-else 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="5 12 12 19 19 12"></polyline>
          </svg>
        </span>
      </div>

      <BuildingTable 
        :data="displayData" 
        :pagination="pagination"
        :loading="false"
        @view="handleView"
        @suggest="handleSuggest"
        @fault="handleFault"
        @page-change="handlePageChange"
      />

      <div class="table-empty-row"></div>
    </div>
    
    <FilterModal 
      v-model:visible="showAdvanced" 
      @save="handleAdvancedSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import FilterPanel from './FilterPanel.vue';
import BuildingTable from './BuildingTable.vue';
import FilterModal from './FilterModal.vue';

const router = useRouter();

// ========== 状态 ==========
const showAdvanced = ref(false);

// ========== 类型定义 ==========
interface BuildingItem {
  id: string;
  buildingId: string;
  site: string;
  totalEnergy: number;
  energy: number;
  cop: number;
  eui: number;
  carbonEmission: number;
  carbon: number;
  status: 'normal' | 'warning' | 'error';
  statusText: string;
}

// ========== Mock 数据 ==========
const mockData: BuildingItem[] = [
  { id: 'BLDG-HQ-A01', buildingId: 'BLDG-HQ-A01', site: 'BLDG-HQ-A01', totalEnergy: 1424.52, energy: 1424.52, cop: 4.21, eui: 12.4, carbonEmission: 842.2, carbon: 842.2, status: 'normal', statusText: '运行正常' },
  { id: 'BLDG-RD-B04', buildingId: 'BLDG-RD-B04', site: 'BLDG-HQ-A01', totalEnergy: 2108.88, energy: 2108.88, cop: 3.15, eui: 18.2, carbonEmission: 1244.5, carbon: 1244.5, status: 'warning', statusText: '告警状态' },
  { id: 'BLDG-DORM-01', buildingId: 'BLDG-DORM-01', site: 'BLDG-HQ-A01', totalEnergy: 852.12, energy: 852.12, cop: 4.88, eui: 9.1, carbonEmission: 504.2, carbon: 504.2, status: 'normal', statusText: '运行正常' },
  { id: 'BLDG-PLANT-02', buildingId: 'BLDG-PLANT-02', site: 'BLDG-HQ-A01', totalEnergy: 3842.4, energy: 3842.4, cop: 5.12, eui: 24.5, carbonEmission: 2284.1, carbon: 2284.1, status: 'error', statusText: '异常状态' },
  { id: 'BLDG-OFFICE-03', buildingId: 'BLDG-OFFICE-03', site: 'BLDG-HQ-A01', totalEnergy: 1650.0, energy: 1650.0, cop: 3.8, eui: 15.0, carbonEmission: 980.0, carbon: 980.0, status: 'normal', statusText: '运行正常' },
  { id: 'BLDG-WORK-05', buildingId: 'BLDG-WORK-05', site: 'BLDG-HQ-A01', totalEnergy: 3100.5, energy: 3100.5, cop: 4.2, eui: 22.1, carbonEmission: 1850.3, carbon: 1850.3, status: 'warning', statusText: '告警状态' },
  { id: 'BLDG-LAB-06', buildingId: 'BLDG-LAB-06', site: 'BLDG-HQ-A01', totalEnergy: 1200.8, energy: 1200.8, cop: 3.9, eui: 8.5, carbonEmission: 720.5, carbon: 720.5, status: 'normal', statusText: '运行正常' },
  { id: 'BLDG-STORE-07', buildingId: 'BLDG-STORE-07', site: 'BLDG-HQ-A01', totalEnergy: 680.25, energy: 680.25, cop: 5.5, eui: 6.2, carbonEmission: 405.0, carbon: 405.0, status: 'normal', statusText: '运行正常' },
  { id: 'BLDG-CLUB-08', buildingId: 'BLDG-CLUB-08', site: 'BLDG-HQ-A01', totalEnergy: 2450.0, energy: 2450.0, cop: 3.2, eui: 19.8, carbonEmission: 1450.0, carbon: 1450.0, status: 'error', statusText: '异常状态' },
  { id: 'BLDG-HOSP-09', buildingId: 'BLDG-HOSP-09', site: 'BLDG-HQ-A01', totalEnergy: 4200.0, energy: 4200.0, cop: 4.0, eui: 28.5, carbonEmission: 2500.0, carbon: 2500.0, status: 'warning', statusText: '告警状态' },
  { id: 'BLDG-SCH-10', buildingId: 'BLDG-SCH-10', site: 'BLDG-HQ-A01', totalEnergy: 980.0, energy: 980.0, cop: 4.5, eui: 11.3, carbonEmission: 580.0, carbon: 580.0, status: 'normal', statusText: '运行正常' },
  { id: 'BLDG-MALL-11', buildingId: 'BLDG-MALL-11', site: 'BLDG-HQ-A01', totalEnergy: 5600.0, energy: 5600.0, cop: 3.8, eui: 35.2, carbonEmission: 3320.0, carbon: 3320.0, status: 'error', statusText: '异常状态' },
  { id: 'BLDG-PARK-12', buildingId: 'BLDG-PARK-12', site: 'BLDG-HQ-A01', totalEnergy: 450.0, energy: 450.0, cop: 6.0, eui: 4.8, carbonEmission: 268.0, carbon: 268.0, status: 'normal', statusText: '运行正常' },
  { id: 'BLDG-GYM-13', buildingId: 'BLDG-GYM-13', site: 'BLDG-HQ-A01', totalEnergy: 1800.0, energy: 1800.0, cop: 3.6, eui: 16.5, carbonEmission: 1070.0, carbon: 1070.0, status: 'warning', statusText: '告警状态' },
];

// ========== 筛选条件 ==========
const filterForm = ref({
  status: '',
  timeRange: 'today'
});

// ========== 排序配置 ==========
const sortConfig = ref({
  field: 'eui' as 'eui' | 'totalEnergy' | 'cop' | 'carbonEmission',
  order: 'asc' as 'asc' | 'desc'
});

// ========== 分页配置 ==========
const pagination = ref({
  currentPage: 1,
  pageSize: 7,
  total: 0
});

// ========== 核心修复：筛选+排序后的完整数据（无副作用） ==========
const filteredSortedData = computed(() => {
  let result = [...mockData];
  
  // 1. 状态筛选
  if (filterForm.value.status) {
    result = result.filter(item => item.status === filterForm.value.status);
  }
  
  // 2. 排序
  result.sort((a, b) => {
    let aVal: number;
    let bVal: number;
    
    switch (sortConfig.value.field) {
      case 'eui':
        aVal = a.eui;
        bVal = b.eui;
        break;
      case 'totalEnergy':
        aVal = a.totalEnergy;
        bVal = b.totalEnergy;
        break;
      case 'cop':
        aVal = a.cop;
        bVal = b.cop;
        break;
      case 'carbonEmission':
        aVal = a.carbonEmission;
        bVal = b.carbonEmission;
        break;
      default:
        aVal = a.eui;
        bVal = b.eui;
    }
    
    const diff = aVal - bVal;
    return sortConfig.value.order === 'asc' ? diff : -diff;
  });
  
  return result;
});

// ========== 关键修复：当筛选/排序结果变化时，重置分页 ==========
watch(
  () => filteredSortedData.value.length,
  (newTotal, oldTotal) => {
    pagination.value.total = newTotal;
    // 如果当前页码超出新数据的总页数，重置为第1页
    const maxPage = Math.ceil(newTotal / pagination.value.pageSize) || 1;
    if (pagination.value.currentPage > maxPage) {
      pagination.value.currentPage = 1;
    }
  },
  { immediate: true }
);

// ========== 当前页展示的数据 ==========
const displayData = computed(() => {
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize;
  const end = start + pagination.value.pageSize;
  return filteredSortedData.value.slice(start, end);
});

// ========== 分页显示计算 ==========
const totalPages = computed(() => {
  return Math.ceil(pagination.value.total / pagination.value.pageSize) || 1;
});

const displayStart = computed(() => {
  if (pagination.value.total === 0) return 0;
  return (pagination.value.currentPage - 1) * pagination.value.pageSize + 1;
});

const displayEnd = computed(() => {
  const end = pagination.value.currentPage * pagination.value.pageSize;
  return Math.min(end, pagination.value.total);
});

const visiblePages = computed(() => {
  const pages: number[] = [];
  const maxVisible = 5;
  const current = pagination.value.currentPage;
  const total = totalPages.value;
  
  let start = Math.max(1, current - Math.floor(maxVisible / 2));
  let end = Math.min(total, start + maxVisible - 1);
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  return pages;
});

// ========== 方法 ==========
const handleSearch = (formData?: any) => {
  if (formData) {
    filterForm.value.status = formData.status || '';
    filterForm.value.timeRange = formData.timeRange || 'today';
  }
  pagination.value.currentPage = 1;
};

const handleReset = () => {
  filterForm.value.status = '';
  filterForm.value.timeRange = 'today';
  pagination.value.currentPage = 1;
  sortConfig.value.field = 'eui';
  sortConfig.value.order = 'asc';
};

const handleSort = (field: 'eui' | 'totalEnergy' | 'cop' | 'carbonEmission') => {
  if (sortConfig.value.field !== field) {
    sortConfig.value.field = field;
    sortConfig.value.order = 'asc';
  }
};

const toggleSortOrder = () => {
  sortConfig.value.order = sortConfig.value.order === 'asc' ? 'desc' : 'asc';
};

const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return;
  pagination.value.currentPage = page;
};

const handleAdvancedSave = (filters: any) => {
  console.log('高级筛选条件：', filters);
  handleSearch();
};

const handleView = (item: BuildingItem) => {
  const buildingId = item.buildingId || item.id;
  console.log('跳转到建筑详情:', buildingId);
  router.push(`/building/${buildingId}`);
};

const handleSuggest = (item: BuildingItem) => {
  console.log('减排建议:', item.buildingId);
};

const handleFault = (item: BuildingItem) => {
  console.log('故障查询:', item.buildingId);
};
</script>

<style scoped>
.query-page {
  min-height: 100vh;
  background: #F5F7FA;
  padding: 24px;
  overflow-y: auto;
}

h1 {
  font-size: 20px;
  font-weight: 800;
  color: #002B54;
  margin-bottom: 24px;
  letter-spacing: -0.5px;
}

.table-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  padding: 24px;
  margin-top: 16px;
  overflow: visible;
}

.table-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.table-title {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.export-btn-rounded {
  padding: 8px 20px;
  background: #52c41a;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  transition: all 0.3s;
}

.sort-bar-merged {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.sort-label {
  color: #666;
  font-size: 14px;
  margin-right: 4px;
  font-weight: 500;
}

.sort-btn-merged {
  padding: 6px 16px;
  border: 1px solid transparent;
  background: #f5f5f5;
  border-radius: 16px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.3s;
}

.sort-btn-merged:hover {
  background: #e8e8e8;
  color: #333;
}

.sort-btn-merged.active {
  background: #0056b3;
  color: #fff;
  border-color: #0056b3;
  font-weight: 500;
}

.sort-order-icon-merged {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-left: 8px;
  color: #666;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
}

.sort-order-icon-merged:hover {
  background: #f0f7ff;
  color: #0056b3;
}

.table-empty-row {
  height: 52px;
  width: 100%;
}
</style>
