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
          
          <div v-if="isHighlightsError" class="alert-badge" style="background: #FEF3F2; border-color: #FECACA; color: #DC2626;">
            <span class="dot" style="background: #DC2626;"></span>
            <span>系统运行状态：数据获取失败</span>
          </div>
          <div v-else-if="highlightsData.abnormalBuildings > 0" class="alert-badge">
            <span class="dot red"></span>
            <span>系统运行监测：检测到 {{ highlightsData.abnormalBuildings }} 处异常待处理</span>
          </div>
          <div v-else class="alert-badge" style="background: #F0FDF4; border-color: #86EFAC; color: #16A34A;">
            <span class="dot" style="background: #16A34A;"></span>
            <span>系统运行状态：运行正常</span>
          </div>
        </div>
      </div>
      
      <div class="filter-row">
        <div class="filter-item">
          <label>建筑状态</label>
          <select v-model="filterForm.status" class="select-box" @change="handleStatusChange">
            <option value="">全部状态</option>
            <option value="normal">正常运行</option>
            <option value="fault">故障停机</option>
            <option value="warning">告警状态</option>
            <option value="offline">离线</option>
          </select>
        </div>

        <div class="filter-item">
          <label>统计周期</label>
          <select v-model="filterForm.timeRange" class="select-box" @change="handleTimeRangeChange">
            <option value="today">今日</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="year">本年</option>
            <option value="custom" disabled>自定义时间 (请通过高级筛选设置)</option>
          </select>
        </div>

        <div class="button-group">
          <button class="btn btn-primary-dark" @click="showAdvanced = true">
            高级筛选 / 自定义时间
          </button>
          <button class="btn btn-outline" @click="handleReset">重置</button>
        </div>
      </div>
    </div>
    
    <div class="data-card">
      <div class="card-header">
        <div class="sort-section">
          <span class="sort-label">排序：</span>
          <div class="sort-tags">
            <button :class="['sort-tag', { active: sortConfig.field === 'eui' }]" @click="handleSort('eui')">EUI 指数</button>
            <button :class="['sort-tag', { active: sortConfig.field === 'totalEnergy' }]" @click="handleSort('totalEnergy')">总能耗</button>
            <button :class="['sort-tag', { active: sortConfig.field === 'status' }]" @click="handleSort('status')">系统状态</button>
            <button :class="['sort-tag', { active: sortConfig.field === 'carbonEmission' }]" @click="handleSort('carbonEmission')">碳排放</button>
          </div>
          <span class="sort-order-icon" @click="toggleSortOrder">
            {{ sortConfig.order === 'asc' ? '↑ 升序' : '↓ 降序' }}
          </span>
        </div>
        
        <div class="export-section">
          <button class="btn-refresh" @click="handleRefresh" :disabled="loading">
            <span :class="{ 'spin': loading }">↻</span> 刷新数据
          </button>

          <template v-if="isExportMode">
            <button class="btn-cancel-select" @click="cancelExportMode">取消</button>
            <button 
              class="btn-confirm-export" 
              :class="{ 'btn-confirm-export-green': selectedBuildings.length > 0 }"
              @click="handleConfirmExport" 
              :disabled="selectedBuildings.length === 0"
            >
              确认导出 ({{ selectedBuildings.length }})
            </button>
          </template>
          <button v-else class="btn-export" @click="enterExportMode" :disabled="loading">
            导出运行数据
          </button>
        </div>
      </div>

      <BuildingTable
        ref="buildingTableRef"
        :loading="loading"
        :filter-form="filterForm"
        :advanced-filters="advancedFilters"
        :sort-config="sortConfig"
        :is-export-mode="isExportMode"
        :start-time="timeFilterStart"
        :end-time="timeFilterEnd"
        @view-detail="handleViewDetail"
        @view-stats="handleViewStats"
        @fault-analysis="handleFaultAnalysis"
        @selection-change="handleSelectionChange"
      />
    </div>

    <!-- 弹窗组件 -->
    <FilterModal v-model:visible="showAdvanced" @save="handleAdvancedSave" />
    <ExportModal 
      v-model:visible="showExportModal" 
      :selected-count="selectedBuildings.length"
      :start-time="timeFilterStart"
      :end-time="timeFilterEnd"
      @export="handleExportConfirm" 
    />
    <BuildingDetailsModal
      v-if="showStatsModal"
      v-model:visible="showStatsModal"
      :building-id="selectedBuildingId"
      :start-time="timeFilterStart"
      :end-time="timeFilterEnd"
    />

    <!-- 任务提交成功自定义浮窗 -->
    <div v-if="showSuccessModal" class="modal-overlay" @click.self="showSuccessModal = false">
      <div class="success-modal">
        <div class="success-icon-wrap">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h3>报表任务已提交</h3>
        <p>后台正在为您聚合数据并生成分析报告。完成后，您可以在<b>统计报表</b>页面直接下载 Markdown 格式文件。</p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showSuccessModal = false">留在本页</button>
          <button class="btn btn-primary-dark" @click="goToReportWorkbench">前往统计工作台</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import FilterModal from './FilterModal.vue';
import BuildingTable from './BuildingTable.vue';
import ExportModal from './ExportModal.vue';
import BuildingDetailsModal from '../../components/Statistics/BuildingDetailsModal.vue';
import { useTimeManager } from '../../utils/timeManager';
import { 
  generateReport, 
  type ReportType 
} from '../../api/statistics';
import { getHighlights } from '../../api/dashboard';

const router = useRouter();
const { getCurrentTimeString } = useTimeManager();

// ===== 状态管理 =====
const showAdvanced = ref(false);
const showExportModal = ref(false);
const showSuccessModal = ref(false);
const showStatsModal = ref(false);
const selectedBuildingId = ref('');
const loading = ref(false);
const isExportMode = ref(false);
const selectedBuildings = ref<string[]>([]);
const isHighlightsError = ref(false);
const highlightsData = ref({ abnormalBuildings: 0, alertCount: 0 });

const buildingTableRef = ref<InstanceType<typeof BuildingTable> | null>(null);

const filterForm = ref({
  status: '' as any,
  timeRange: 'week' as 'today' | 'week' | 'month' | 'year' | 'custom'
});

// 高级筛选结果
const advancedFilters = ref<Record<string, any>>({});
const customTimeRange = ref<{ start: string; end: string } | null>(null);

const sortConfig = ref({
  field: 'eui' as 'eui' | 'totalEnergy' | 'status' | 'carbonEmission',
  order: 'desc' as 'asc' | 'desc'
});

// ===== 时间逻辑 =====
const calculateTimeRange = (range: string) => {
    const items = res.data?.items || [];
    highlightsData.value.abnormalBuildings = items.filter(i => i.type === 'anomaly').length;
    return { 
      start_time: customTimeRange.value.start, 
      end_time: customTimeRange.value.end 
    };
  }

  const now = new Date(getCurrentTimeString());
  let start = new Date(now);
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  const day = now.getDay();
  
  switch (range) {
    case 'today': start = new Date(year, month, date, 0, 0, 0); break;
    case 'week': start = new Date(year, month, date - (day === 0 ? 6 : day - 1), 0, 0, 0); break;
    case 'month': start = new Date(year, month, 1, 0, 0, 0); break;
    case 'year': start = new Date(year, 0, 1, 0, 0, 0); break;
    default: start = new Date(now.getTime() - 7 * 86400000);
  }
  return { start_time: start.toISOString(), end_time: now.toISOString() };
};

const timeFilterStart = computed(() => calculateTimeRange(filterForm.value.timeRange).start_time);
const timeFilterEnd = computed(() => calculateTimeRange(filterForm.value.timeRange).end_time);

// ===== 业务方法 =====
const fetchHighlightsData = async () => {
  try {
    const { start_time, end_time } = calculateTimeRange(filterForm.value.timeRange);
    const res = await getHighlights(3, { start_time, end_time });
    highlightsData.value.abnormalBuildings = res.data.items.filter(i => i.type === 'anomaly').length;
    isHighlightsError.value = false;
  } catch (e) {
    isHighlightsError.value = true;
  }
};

const handleRefresh = async () => {
  loading.value = true;
  try {
    await Promise.all([
      buildingTableRef.value?.refresh(),
      fetchHighlightsData()
    ]);
  } finally {
    loading.value = false;
  }
};

const enterExportMode = () => {
  isExportMode.value = true;
  selectedBuildings.value = [];
  buildingTableRef.value?.enterExportMode();
};

const cancelExportMode = () => {
  isExportMode.value = false;
  selectedBuildings.value = [];
  buildingTableRef.value?.exitExportMode();
};

const handleConfirmExport = () => {
  if (selectedBuildings.value.length > 0) showExportModal.value = true;
};

const handleSelectionChange = (ids: string[]) => {
  selectedBuildings.value = ids;
};

const handleExportConfirm = async (config: { format: string; includeAiSummary: boolean; reportCategory: 'summary' | 'anomaly' }) => {
  loading.value = true;
  try {
    const { start_time, end_time } = calculateTimeRange(filterForm.value.timeRange);
    let reportType: ReportType = 'custom_report';
    
    if (config.reportCategory === 'anomaly') {
      reportType = 'anomaly_report';
    } else {
      const range = filterForm.value.timeRange;
      if (range === 'today') reportType = 'daily_summary';
      else if (range === 'week') reportType = 'weekly_summary';
      else if (range === 'month') reportType = 'monthly_summary';
    }

    await generateReport({
      report_type: reportType,
      building_id: selectedBuildings.value.length === 1 ? selectedBuildings.value[0] : undefined,
      time_range: { start: start_time, end: end_time },
      include_ai_summary: config.includeAiSummary
    });

    showExportModal.value = false;
    showSuccessModal.value = true;
    cancelExportMode();
  } catch (e: any) {
    console.error('任务创建失败:', e);
    alert('任务队列繁忙，请稍后再试');
  } finally {
    loading.value = false;
  }
};

const goToReportWorkbench = () => {
  showSuccessModal.value = false;
  router.push('/statistics'); // 修正跳转路径
};

const handleStatusChange = () => { buildingTableRef.value?.refresh(); };
const handleTimeRangeChange = () => { 
  if (filterForm.value.timeRange !== 'custom') customTimeRange.value = null;
  buildingTableRef.value?.refresh(); 
  fetchHighlightsData();
};

const handleReset = () => {
  filterForm.value.status = '';
  filterForm.value.timeRange = 'week';
  advancedFilters.value = {};
  customTimeRange.value = null;
  handleRefresh();
};

const handleSort = (field: any) => {
  if (sortConfig.value.field === field) {
    sortConfig.value.order = sortConfig.value.order === 'asc' ? 'desc' : 'asc';
  } else {
    sortConfig.value.field = field;
    sortConfig.value.order = 'desc';
  }
  nextTick(() => buildingTableRef.value?.refresh());
};

const toggleSortOrder = () => {
  sortConfig.value.order = sortConfig.value.order === 'asc' ? 'desc' : 'asc';
  nextTick(() => buildingTableRef.value?.refresh());
};

const handleAdvancedSave = (f: any) => {
  advancedFilters.value = f;
  if (f.startTime && f.endTime) {
    customTimeRange.value = { start: f.startTime, end: f.endTime };
    filterForm.value.timeRange = 'custom';
  }
  buildingTableRef.value?.refresh();
  fetchHighlightsData();
};

const handleViewDetail = (i: any) => router.push(`/building/${i.building_id}`);
const handleViewStats = (i: any) => {
  selectedBuildingId.value = i.building_id;
  showStatsModal.value = true;
};
const handleFaultAnalysis = (i: any) => {
  router.push({ path: '/fault-analysis', query: { building_id: i.building_id } });
};

onMounted(() => {
  fetchHighlightsData();
});
</script>

<style scoped>
.query-page { min-height: 100%; overflow-y: auto; margin-left: 20px; width: calc(100% - 20px); box-sizing: border-box; background: #F5F7FA; padding: 24px; }
h1 { font-size: 20px; font-weight: 800; color: #002B54; margin-bottom: 20px; letter-spacing: -0.5px; }
.filter-panel { background: #ffffff; border-radius: 12px; border: 1px solid #E5E7EB; padding: 20px; margin-bottom: 16px; }
.panel-header { margin-bottom: 16px; }
.title-area { display: flex; align-items: center; gap: 12px; }
.icon-box { width: 32px; height: 32px; background: #EFF6FF; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.alert-badge { margin-left: 16px; display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; font-size: 12px; color: #DC2626; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: #DC2626; }
.dot.red { background: #EF4444; }
.filter-row { display: flex; align-items: center; gap: 24px; }
.filter-item { display: flex; align-items: center; gap: 12px; }
.filter-item label { font-size: 14px; color: #4B5563; font-weight: 500; }
.select-box { width: 180px; height: 36px; border: 1px solid #D1D5DB; border-radius: 8px; padding: 0 10px; font-size: 14px; background: white; }
.button-group { margin-left: auto; display: flex; gap: 12px; }
.btn { height: 36px; padding: 0 16px; border-radius: 8px; font-size: 14px; cursor: pointer; display: flex; align-items: center; border: none; }
.btn-primary-dark { background: #002B54; color: white; }
.btn-outline { background: white; border: 1px solid #D1D5DB; }
.data-card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.sort-section { display: flex; align-items: center; gap: 12px; }
.sort-tag { padding: 6px 14px; border: none; background: #F3F4F6; border-radius: 20px; cursor: pointer; font-size: 13px; }
.sort-tag.active { background: #005BAC; color: white; }
.sort-order-icon { font-size: 13px; color: #666; cursor: pointer; }
.export-section { display: flex; gap: 10px; }
.btn-refresh { height: 36px; padding: 0 15px; background: white; border: 1px solid #D1D5DB; border-radius: 18px; cursor: pointer; }
.btn-export { height: 36px; padding: 0 20px; background: #52C41A; color: white; border: none; border-radius: 18px; cursor: pointer; }
.btn-confirm-export { height: 36px; padding: 0 20px; background: #9CA3AF; color: white; border: none; border-radius: 18px; }
.btn-confirm-export-green { background: #52C41A; cursor: pointer; }
.btn-cancel-select { height: 36px; padding: 0 15px; border: 1px solid #D9D9D9; background: white; border-radius: 18px; cursor: pointer; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 20, 50, 0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 3000; }
.success-modal { background: white; border-radius: 24px; width: 100%; max-width: 420px; padding: 40px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: modalSlideUp 0.3s ease-out; }
.success-icon-wrap { width: 80px; height: 80px; background: #F0FDF4; color: #16A34A; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
.success-modal h3 { margin: 0 0 12px; font-size: 22px; color: #111; font-weight: 800; }
.success-modal p { margin: 0 0 32px; font-size: 15px; color: #666; line-height: 1.6; }
.modal-actions { display: flex; gap: 16px; }
.modal-actions .btn { flex: 1; justify-content: center; height: 48px; font-weight: 700; border-radius: 12px; }
@keyframes modalSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
.spin { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
