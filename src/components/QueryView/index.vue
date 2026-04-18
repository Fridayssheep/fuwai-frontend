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
          
          <!-- [修改1] 优化状态显示逻辑，增加数据获取状态 -->
          <div v-if="isHighlightsError" class="alert-badge" style="background: #FEF3F2; border-color: #FECACA; color: #DC2626;">
            <span class="dot" style="background: #DC2626;"></span>
            <span>系统运行状态：数据获取失败</span>
          </div>
          <div v-else-if="highlights.abnormalBuildings > 0 || highlights.alertCount > 0" class="alert-badge">
            <span class="dot red"></span>
            <span>系统运行监测：检测到{{ highlights.abnormalBuildings }}处异常，{{ highlights.alertCount }}个告警待处理</span>
          </div>
          <div v-else class="alert-badge" style="background: #F0FDF4; border-color: #86EFAC; color: #16A34A;">
            <span class="dot" style="background: #16A34A;"></span>
            <span>系统运行状态：运行正常</span>
          </div>
        </div>
      </div>
      
      <div class="filter-row">
        <!-- [修改2] 建筑选择：绑定后端真实状态值 -->
        <div class="filter-item">
          <label>建筑选择</label>
          <select v-model="filterForm.status" class="select-box" @change="handleStatusChange">
            <option value="">全部建筑</option>
            <option value="normal">正常</option>
            <option value="fault">异常</option>
            <option value="warning">告警</option>
            <option value="offline">离线</option>
          </select>
        </div>

        <!-- [修改3] 时间范围筛选：优化与后端交互 -->
        <div class="filter-item">
          <label>时间范围</label>
          <select v-model="filterForm.timeRange" class="select-box" @change="handleTimeRangeChange">
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
    
    <!-- [修改4] 已激活的高级筛选标签 -->
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
      <!-- 卡片头部：排序 + 导出按钮 + 刷新按钮 -->
      <div class="card-header">
        <div class="sort-section">
          <span class="sort-label">排序依据：</span>
          <div class="sort-tags">
            <button :class="['sort-tag', { active: sortConfig.field === 'eui' }]" @click="handleSort('eui')">
              能耗强度(EUI)
            </button>
            <button :class="['sort-tag', { active: sortConfig.field === 'totalEnergy' }]" @click="handleSort('totalEnergy')">
              总能耗
            </button>
            <button :class="['sort-tag', { active: sortConfig.field === 'status' }]" @click="handleSort('status')">
              系统状态
            </button>
            <button :class="['sort-tag', { active: sortConfig.field === 'carbonEmission' }]" @click="handleSort('carbonEmission')">
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
        
        <!-- [修改5] 导出按钮组 + 刷新按钮：完善导出模式切换逻辑 -->
        <div class="export-section">
          <!-- 【新增】刷新数据按钮 -->
          <button 
            class="btn-refresh" 
            @click="handleRefresh" 
            :disabled="loading"
            title="刷新数据"
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2"
              :class="{ 'spin': loading }"
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>{{ loading ? '加载中...' : '刷新数据' }}</span>
          </button>

          <template v-if="isExportMode">
            <!-- 取消按钮：点击返回初始状态 -->
            <button class="btn-cancel-select" @click="cancelExportMode">取消</button>
            <!-- 确认导出按钮：未选择时灰色，选择后绿色 -->
            <button 
              class="btn-confirm-export" 
              :class="{ 'btn-confirm-export-green': selectedBuildings.length > 0 }"
              @click="handleConfirmExport" 
              :disabled="selectedBuildings.length === 0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              确认导出
              <span v-if="selectedBuildings.length > 0" class="selected-count">({{ selectedBuildings.length }})</span>
            </button>
          </template>
          <!-- 初始状态：导出运行数据按钮 -->
          <button v-else class="btn-export" @click="enterExportMode" :disabled="loading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            导出运行数据
          </button>
        </div>
      </div>

      <!-- [修改6] 表格区域：传递完整的筛选参数和数据获取方法 -->
      <BuildingTable
        ref="buildingTableRef"
        :building-list="buildingList"
        :loading="loading"
        :filter-form="filterForm"
        :advanced-filters="advancedFilters"
        :sort-config="sortConfig"
        :time-range="filterForm.timeRange"
        :is-export-mode="isExportMode"
        :start-time="timeFilterStart"
        :end-time="timeFilterEnd"
        @view-detail="handleViewDetail"
        @view-stats="handleViewStats"
        @fault-analysis="handleFaultAnalysis"
        @selection-change="handleSelectionChange"
        @page-change="handlePageChange"
      />
    </div>

    <!-- 高级筛选弹窗 -->
    <FilterModal v-model:visible="showAdvanced" @save="handleAdvancedSave" />

    <!-- 导出运行数据弹窗 -->
    <ExportModal 
      v-model:visible="showExportModal" 
      :selected-count="selectedBuildings.length"
      :selected-ids="selectedBuildings"
      :time-range="filterForm.timeRange"
      @export="handleExportConfirm" 
    />
    
    <!-- 统计详情弹窗 -->
    <BuildingDetailsModal
      v-model:visible="showStatsModal"
      :building-id="selectedBuildingId"
      :start-time="timeFilterStart"
      :end-time="timeFilterEnd"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import FilterModal from './FilterModal.vue';
import BuildingTable from './BuildingTable.vue';
import ExportModal from './ExportModal.vue';
import BuildingDetailsModal from '../../components/Statistics/BuildingDetailsModal.vue';
import { useTimeManager } from '../../utils/timeManager';

const router = useRouter();
const { getCurrentTimeString } = useTimeManager();

// ===== [修改7] 响应式数据扩展 =====
const showAdvanced = ref(false);
const showExportModal = ref(false);
const showStatsModal = ref(false);
const selectedBuildingId = ref('');
const loading = ref(false);

// 系统高亮事项（异常/告警数量）
const highlights = ref({
  abnormalBuildings: 0,
  alertCount: 0,
  warningCount: 0
});
const isHighlightsError = ref(false);

// 导出相关状态
const isExportMode = ref(false);
const selectedBuildings = ref<string[]>([]);
const CARBON_FACTOR_KG_PER_KWH = 0.554;

// [修改8] 建筑列表数据（替换死数据）
const buildingList = ref<any[]>([]);
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0
});

// 关键修改：添加ref引用BuildingTable组件
const buildingTableRef = ref<InstanceType<typeof BuildingTable> | null>(null);

// 筛选表单（与后端字段对齐）
const filterForm = ref({
  status: '' as '' | 'normal' | 'fault' | 'warning' | 'offline',
  timeRange: 'today' as 'today' | 'week' | 'month' | 'quarter' | 'year'
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

// ===== [修改9] 时间范围计算优化 =====
const getCurrentTime = () => new Date(getCurrentTimeString());

const calculateTimeRange = (range: string) => {
  const now = getCurrentTime();
  let start = new Date(now);
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  const day = now.getDay();
  
  switch (range) {
    case 'today': start = new Date(year, month, date, 0, 0, 0); break;
    case 'week': start = new Date(year, month, date - (day === 0 ? 6 : day - 1), 0, 0, 0); break;
    case 'month': start = new Date(year, month, 1, 0, 0, 0); break;
    case 'quarter': start = new Date(year, Math.floor(month / 3) * 3, 1, 0, 0, 0); break;
    case 'year': start = new Date(year, 0, 1, 0, 0, 0); break;
  }
  return { 
    start_time: start.toISOString(), 
    end_time: now.toISOString() 
  };
};

const timeFilterStart = computed(() => calculateTimeRange(filterForm.value.timeRange).start_time);
const timeFilterEnd = computed(() => calculateTimeRange(filterForm.value.timeRange).end_time);
const getSummaryTotal = (payload: any): number => {
  const value = payload?.summary?.total ?? payload?.total ?? payload?.value ?? 0;
  return Number.isFinite(Number(value)) ? Number(value) : 0;
};

// ===== [修改10] 核心API方法：获取建筑列表（替换死数据）=====
const fetchBuildingList = async () => {
  // 【新增】防止重复请求
  if (loading.value) return;
  loading.value = true;
  try {
    const { start_time, end_time } = calculateTimeRange(filterForm.value.timeRange);
    
    // 构建查询参数
    const params: any = {
      page: pagination.value.current,
      pageSize: pagination.value.pageSize,
      startTime: start_time,
      endTime: end_time,
      sortField: sortConfig.value.field,
      sortOrder: sortConfig.value.order,
      ...advancedFilters.value
    };
    
    // 只有选择具体状态时才传递status参数
    if (filterForm.value.status) {
      params.status = filterForm.value.status;
    }
    
    // 1. 获取建筑基础列表
    const response = await axios.get('/api/buildings', { params });
    
    let basicList: any[] = [];
    if (response.data?.items && Array.isArray(response.data.items)) {
      basicList = response.data.items;
      pagination.value.total = response.data.pagination?.total || 0;
    } else if (Array.isArray(response.data)) {
      basicList = response.data;
      pagination.value.total = response.data.length;
    } else if (response.data?.code === 200) {
      basicList = response.data.data || [];
      pagination.value.total = response.data.total || 0;
    }

    // 2. 为每个建筑获取详细能耗数据（并发请求）
    const detailedBuildings = await Promise.all(
      basicList.map(async (building: any) => {
        const buildingId = building.building_id || building.id || building.buildingId;
        if (!buildingId) return building;

        try {
          // 并行获取三个接口数据
          const [energyRes, euiRes, carbonRes] = await Promise.allSettled([
            // 总能耗（建筑级能耗摘要）
            axios.get(`/api/buildings/${buildingId}/energy/summary`, {
              params: { start_time, end_time },
              timeout: 8000
            }).catch(() => null),
            
            // EUI 计算结果
            axios.get('/api/energy/cop', {
              params: { building_id: buildingId, start_time, end_time },
              timeout: 8000
            }).catch(() => null),
            
            // 碳排放：与首页一致，用 electricity 总量估算 kgCO2e
            axios.get('/api/energy/query', {
              params: {
                meter: 'electricity',
                building_ids: buildingId,
                start_time,
                end_time
              },
              timeout: 8000
            }).catch(() => null)
          ]);

          // 处理总能耗（求和电力、热水、冷冻水等）
          let totalEnergy = 0;
          if (energyRes.status === 'fulfilled' && energyRes.value) {
            const data = energyRes.value.data?.data || energyRes.value.data || {};
            totalEnergy = getSummaryTotal(data);
          }

          // 处理 EUI
          let eui = 0;
          if (euiRes.status === 'fulfilled' && euiRes.value) {
            const data = euiRes.value.data?.data || euiRes.value.data || {};
            eui = data.eui || data.cop || data.value || 0;
          }

          // 处理碳排放
          let carbon = 0;
          if (carbonRes.status === 'fulfilled' && carbonRes.value) {
            const data = carbonRes.value.data?.data || carbonRes.value.data || {};
            carbon = Math.round(getSummaryTotal(data) * CARBON_FACTOR_KG_PER_KWH * 10) / 10;
          }

          return {
            ...building,
            id: buildingId,
            buildingId: buildingId,
            energy: totalEnergy,
            eui: eui,
            carbon: carbon,
            // 保留原有字段映射
            site: building.site || building.device_count || '0 个设备'
          };

        } catch (err) {
          console.error(`获取建筑 ${buildingId} 详细数据失败:`, err);
          return {
            ...building,
            id: buildingId,
            buildingId: buildingId,
            energy: 0,
            eui: 0,
            carbon: 0
          };
        }
      })
    );

    buildingList.value = detailedBuildings;

  } catch (error: any) {
    console.error('获取建筑列表失败:', error);
  } finally {
    loading.value = false;
  }
};
// ===== [新增] 手动刷新方法 =====
const handleRefresh = async () => {
  // 同时刷新建筑列表和高亮数据
  await Promise.all([
    fetchBuildingList(),
    fetchHighlights()
  ]);
};

// ===== [修改11] 导出功能方法完善 =====

// 进入导出模式（点击"导出运行数据"按钮）
const enterExportMode = () => {
  isExportMode.value = true;
  selectedBuildings.value = [];
  // 调用子组件方法显示多选框（需要BuildingTable实现此方法）
  buildingTableRef.value?.enterExportMode?.();
};

// 确认导出（点击"确认导出"按钮）
const handleConfirmExport = () => {
  if (selectedBuildings.value.length === 0) {
    alert('请至少选择一项建筑数据');
    return;
  }
  // 打开导出弹窗
  showExportModal.value = true;
};

// 取消导出模式（点击"取消"按钮）
const cancelExportMode = () => {
  isExportMode.value = false;
  selectedBuildings.value = [];
  // 调用子组件方法退出导出模式（隐藏多选框）
  buildingTableRef.value?.exitExportMode?.();
};

// 接收子组件的选择变化事件
const handleSelectionChange = (selectedIds: string[]) => {
  selectedBuildings.value = selectedIds;
};

// 导出弹窗确认（对接真实导出接口）
const handleExportConfirm = async (exportConfig: { format: string; fileName?: string }) => {
  try {
    const { start_time, end_time } = calculateTimeRange(filterForm.value.timeRange);
    
    const response = await axios.post('/api/buildings/export', {
      buildingIds: selectedBuildings.value,
      format: exportConfig.format,
      fileName: exportConfig.fileName,
      timeRange: {
        start: start_time,
        end: end_time
      }
    }, {
      responseType: 'blob' // 重要：处理文件下载
    });
    
    // 创建下载链接
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportConfig.fileName || `建筑运行数据_${new Date().toISOString().slice(0,10)}.${exportConfig.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    // 导出完成后退出导出模式
    cancelExportMode();
  } catch (error) {
    console.error('导出失败:', error);
    alert('导出失败，请重试');
  }
};

// ===== [修改12] 其他方法完善 =====

// 获取系统 highlights（异常/告警统计）
const fetchHighlights = async () => {
  try {
    isHighlightsError.value = false;
    const response = await axios.get('/api/dashboard/highlights', {
      timeout: 5000
    });
    // 【修改】兼容不同返回格式
    let data: any;
    
    if (Array.isArray(response.data)) {
      // 如果直接返回数组（虽然不太可能，但以防万一）
      throw new Error('返回格式错误，期望对象');
    } else if (response.data && (response.data.code === 200 || response.data.success === true)) {
      // 标准格式 { code: 200, data: {...} }
      data = response.data?.data || {};
    } else if (typeof response.data === 'object' && !Array.isArray(response.data)) {
      // 直接返回对象 {...}
      data = response.data;
    }
    
    // 赋值（无论上面哪种格式，都能正常处理）
    highlights.value = {
      abnormalBuildings: data.abnormalBuildings || data.abnormal_count || 0,
      alertCount: data.alertCount || data.warning_count || 0,
      warningCount: data.warningCount || 0
    };

  } catch (error) {
    console.error('获取系统 highlights 失败:', error);
    isHighlightsError.value = true;
  }
};

// 状态筛选变化 - 自动刷新列表
const handleStatusChange = () => {
  pagination.value.current = 1; // 重置到第一页
  fetchBuildingList();
};

// 时间范围变化 - 自动刷新列表
const handleTimeRangeChange = () => {
  pagination.value.current = 1;
  fetchBuildingList();
};

// 重置所有筛选
const handleReset = () => {
  filterForm.value.status = '';
  filterForm.value.timeRange = 'today';
  advancedFilters.value = {};
  sortConfig.value.field = 'eui';
  sortConfig.value.order = 'asc';
  pagination.value.current = 1;
  
  // 如果处于导出模式，先退出
  if (isExportMode.value) {
    cancelExportMode();
  }
  
  fetchBuildingList();
};

// 排序处理
const handleSort = (field: any) => {
  if (sortConfig.value.field !== field) {
    sortConfig.value.field = field;
    sortConfig.value.order = 'asc';
  } else {
    // 再次点击切换排序方向
    sortConfig.value.order = sortConfig.value.order === 'asc' ? 'desc' : 'asc';
  }
  fetchBuildingList();
};

const toggleSortOrder = () => {
  sortConfig.value.order = sortConfig.value.order === 'asc' ? 'desc' : 'asc';
  fetchBuildingList();
};

// 分页变化
const handlePageChange = (page: number) => {
  pagination.value.current = page;
  fetchBuildingList();
};

const handleAdvancedSave = (filters: any) => {
  advancedFilters.value = { ...filters };
  pagination.value.current = 1;
  fetchBuildingList();
};

const clearAdvancedFilter = (key: string) => {
  delete advancedFilters.value[key];
  advancedFilters.value = { ...advancedFilters.value };
  fetchBuildingList();
};

const clearAllAdvancedFilters = () => {
  advancedFilters.value = {};
  fetchBuildingList();
};

const handleViewDetail = (item: any) => {
  const id = item.buildingId || item.id;
  if (!id || id === 'undefined') {
    console.error('建筑ID无效，无法跳转', item);
    alert('建筑信息加载失败，请刷新后重试');
    return;
  }
  router.push(`/building/${id}`);
};

const handleViewStats = (item: any) => {
  selectedBuildingId.value = item.buildingId || item.id;
  showStatsModal.value = true;
};

const handleFaultAnalysis = (item: any) => {
  router.push({
    path: '/fault-analysis',
    query: { building_id: item.buildingId || item.id }
  });
};

// ===== [修改13] 生命周期优化 =====
onMounted(() => {
  // 不再自动加载建筑列表，改为手动点击刷新按钮
  // fetchBuildingList(); // 【注释掉】改为手动刷新
  
  // 只自动加载高亮统计
  fetchHighlights();
  
  // 每30秒刷新一次高亮数据
  const highlightTimer = setInterval(fetchHighlights, 30000);
  
  // 组件卸载时清理定时器
  onUnmounted(() => {
    clearInterval(highlightTimer);
  });
});

// [修改14] 监听筛选条件变化，自动刷新（可选：实现实时筛选）
watch(
  () => [filterForm.value.status, filterForm.value.timeRange],
  () => {
    // 防抖处理，避免频繁请求
    // 这里简单处理，实际可使用lodash.debounce
  }
);
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

/* 导出按钮区域 */
.export-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 【新增】刷新按钮样式 */
.btn-refresh {
  height: 40px;
  padding: 0 20px;
  background: white;
  color: #374151;
  border: 1px solid #D1D5DB;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.btn-refresh:hover:not(:disabled) {
  border-color: #005BAC;
  color: #005BAC;
  background: #EFF6FF;
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #F3F4F6;
}

.btn-refresh svg {
  transition: transform 0.3s;
}

.btn-refresh svg.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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

.btn-export:hover:not(:disabled) {
  background: #389E0D;
  transform: translateY(-1px);
}

.btn-export:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #9CA3AF;
}

/* 取消按钮样式 */
.btn-cancel-select {
  height: 40px;
  padding: 0 20px;
  border: 1px solid #D9D9D9;
  background: white;
  color: #666;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-cancel-select:hover {
  border-color: #FF4D4F;
  color: #FF4D4F;
}

/* 确认导出按钮基础样式（未选择时灰色） */
.btn-confirm-export {
  height: 40px;
  padding: 0 24px;
  background: #9CA3AF;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: not-allowed;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  transition: all 0.2s;
}

/* 确认导出按钮绿色样式（选择后） */
.btn-confirm-export-green {
  background: #52C41A;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(82, 196, 26, 0.2);
}

.btn-confirm-export-green:hover {
  background: #389E0D;
  transform: translateY(-1px);
}

.selected-count {
  margin-left: 4px;
  font-size: 12px;
  opacity: 0.9;
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
  
  .export-section {
    width: 100%;
    justify-content: flex-end;
  }
  
  .alert-badge {
    margin-left: 0;
    margin-top: 8px;
    width: 100%;
  }
}
</style>
