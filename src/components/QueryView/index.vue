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

          <div v-if="highlightsData.abnormalBuildings > 0" class="alert-badge">
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
        <div :class="['filter-item', { 'ai-field-glow': isAssistantHighlightActive('status') }]">
          <label>建筑状态</label>
          <ThemedSelect
            v-model="filterForm.status"
            class="select-box"
            size="sm"
            aria-label="建筑状态"
            :options="statusOptions"
            @change="handleStatusChange"
          />
        </div>

        <div :class="['filter-item', { 'ai-field-glow': isAssistantHighlightActive('timeRange') }]">
          <label>统计周期</label>
          <ThemedSelect
            v-model="filterForm.timeRange"
            class="select-box"
            size="sm"
            aria-label="统计周期"
            :options="timeRangeOptions"
            @change="handleTimeRangeChange"
          />
        </div>

        <div class="button-group">
          <button
            :class="['btn', 'btn-primary-dark', { 'ai-field-glow': isAssistantHighlightActive('advancedButton') }]"
            @click="showAdvanced = true"
          >
            <svg class="btn-icon" viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M3 5h18"></path>
              <path d="M7 12h10"></path>
              <path d="M10 19h4"></path>
            </svg>
            高级筛选
          </button>
          <button class="btn btn-outline" @click="handleReset">重置</button>
        </div>
      </div>
    </div>

    <QueryAIAssistant
      :current-filters="assistantCurrentFilters"
      :current-time="assistantCurrentTime"
      timezone="Asia/Shanghai"
      :can-undo="Boolean(lastAssistantSnapshot)"
      @apply="handleAssistantApply"
      @undo="handleAssistantUndo"
    />

    <div class="data-card">
      <div class="card-header">
        <div class="sort-section">
          <span class="sort-label">排序：</span>
          <div :class="['sort-track', { 'ai-field-glow': activeSortHighlights.length > 0 }]">
            <SlidingOptionGroup
              :model-value="sortConfig.field"
              :options="sortFieldOptions"
              :highlighted-values="activeSortHighlights"
              aria-label="查询排序字段"
              @update:model-value="handleSortFieldChange"
            />
          </div>
          <div :class="['sort-order-track', { 'ai-field-glow': activeSortOrderHighlights.length > 0 }]">
            <SlidingOptionGroup
              :model-value="sortConfig.order"
              :options="sortOrderOptions"
              :highlighted-values="activeSortOrderHighlights"
              aria-label="查询排序方向"
              @update:model-value="handleSortOrderChange"
            />
          </div>
        </div>

        <div class="export-section">
          <button class="query-action-btn secondary" @click="handleRefresh" :disabled="loading">
            <span :class="{ 'spin': loading }">↻</span> 刷新数据
          </button>

          <div :class="['export-actions-shell', { selecting: isExportMode }]">
            <Transition name="export-actions-switch" mode="out-in">
              <div v-if="isExportMode" key="selecting" class="export-actions">
                <button class="query-action-btn secondary" @click="cancelExportMode">取消选择</button>
                <button
                  class="query-action-btn primary"
                  :class="{ ready: selectedBuildings.length > 0 }"
                  @click="handleConfirmExport"
                  :disabled="selectedBuildings.length === 0"
                >
                  确认导出 ({{ selectedBuildings.length }})
                </button>
              </div>
              <div v-else key="idle" class="export-actions single">
                <button class="query-action-btn primary" @click="enterExportMode" :disabled="loading">
                  导出运行数据
                </button>
              </div>
            </Transition>
          </div>
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
        @fault-analysis="handleFaultAnalysis"
        @selection-change="handleSelectionChange"
      />
    </div>

    <!-- 弹窗组件 -->
    <FilterModal
      v-model:visible="showAdvanced"
      :seed-values="advancedModalSeed"
      :highlighted-fields="advancedModalHighlights"
      :initial-tab="advancedModalInitialTab"
      :highlight-pulse-id="advancedModalPulseId"
      @save="handleAdvancedSave"
    />
    <ExportModal
      v-model:visible="showExportModal"
      :selected-count="selectedBuildings.length"
      :start-time="timeFilterStart"
      :end-time="timeFilterEnd"
      @export="handleExportConfirm"
    />
    <BuildingDetailsModal
      v-model:visible="showStatsModal"
      :building-id="selectedBuildingId"
      :start-time="timeFilterStart"
      :end-time="timeFilterEnd"
      @generate-report="handleOpenReportGenerate"
    />
    <ExportModal
      v-model:visible="showDetailReportModal"
      :selected-count="1"
      :start-time="timeFilterStart"
      :end-time="timeFilterEnd"
      :target-name="selectedBuildingId"
      title="生成建筑运行报表"
      :description="detailReportDescription"
      confirm-text="提交报表任务"
      @export="handleDetailReportConfirm"
    />
    <!-- 任务提交成功自定义浮窗 -->
    <Transition name="success-modal-shell">
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
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import FilterModal from './FilterModal.vue';
import BuildingTable from './BuildingTable.vue';
import ExportModal from './ExportModal.vue';
import QueryAIAssistant from './QueryAIAssistant.vue';
import SlidingOptionGroup from '../common/SlidingOptionGroup.vue';
import ThemedSelect from '../common/ThemedSelect.vue';
import BuildingDetailsModal from '../Statistics/BuildingDetailsModal.vue';
import type { ReportSourceContext } from '../Statistics/reportWorkbenchTypes';
import { useTimeManager } from '../../utils/timeManager';
import {
  generateReport,
  type ReportType
} from '../../api/statistics';
import { getHighlights } from '../../api/dashboard';
import {
  type AIQueryAssistantFilters,
  type AIQueryAssistantResponse
} from '../../api/ai';

const router = useRouter();
const { getCurrentTimeString } = useTimeManager();

// ===== 状态管理 =====
const showAdvanced = ref(false);
const showExportModal = ref(false);
const showSuccessModal = ref(false);
const showStatsModal = ref(false);
const showDetailReportModal = ref(false);
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
type QueryFilterFormState = typeof filterForm.value;
type QuerySortState = { field: 'eui' | 'totalEnergy' | 'status' | 'carbonEmission'; order: 'asc' | 'desc' };
type ReportExportConfig = { includeAiSummary: boolean; reportCategory: 'summary' | 'anomaly' };
type SortField = QuerySortState['field'];
type SortOrder = QuerySortState['order'];
type AdvancedModalTab = 'time' | 'property' | 'energy'
type AdvancedModalSeed = {
  startTime: string
  endTime: string
  keyword: string
  site_id: string
  primaryspaceusage: string
  min_energy: number | null
  max_energy: number | null
  min_eui: number | null
  max_eui: number | null
  min_carbon: number | null
  max_carbon: number | null
}

// 高级筛选结果
const advancedFilters = ref<Record<string, any>>({});
const customTimeRange = ref<{ start: string; end: string } | null>(null);
const lastAssistantSnapshot = ref<null | {
  filterForm: QueryFilterFormState
  advancedFilters: Record<string, any>
  customTimeRange: { start: string; end: string } | null
  sortConfig: QuerySortState
}>(null);
const assistantHighlightKeys = ref<string[]>([]);
const advancedModalHighlights = ref<string[]>([]);
const advancedModalInitialTab = ref<AdvancedModalTab>('time');
const advancedModalPulseId = ref(0);
let assistantHighlightTimer: ReturnType<typeof setTimeout> | null = null;
let advancedModalHighlightTimer: ReturnType<typeof setTimeout> | null = null;
let advancedModalOpenTimer: ReturnType<typeof setTimeout> | null = null;

const sortConfig = ref<QuerySortState>({
  field: 'eui' as 'eui' | 'totalEnergy' | 'status' | 'carbonEmission',
  order: 'desc' as 'asc' | 'desc'
});
const sortFieldOptions: Array<{ value: SortField; label: string }> = [
  { value: 'eui', label: 'EUI 指数' },
  { value: 'totalEnergy', label: '总能耗' },
  { value: 'status', label: '系统状态' },
  { value: 'carbonEmission', label: '碳排放' }
];
const sortOrderOptions: Array<{ value: SortOrder; label: string }> = [
  { value: 'desc', label: '↓ 降序' },
  { value: 'asc', label: '↑ 升序' }
];
const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'normal', label: '正常运行' },
  { value: 'fault', label: '故障停机' },
  { value: 'warning', label: '告警状态' },
  { value: 'offline', label: '离线' }
];
const timeRangeOptions = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'year', label: '本年' },
  { value: 'custom', label: '自定义时间 (请通过高级筛选设置)', disabled: true }
];

// ===== 时间逻辑 =====
const calculateTimeRange = (range: string) => {
  if (range === 'custom' && customTimeRange.value) {
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
const detailReportDescription = computed(() => selectedBuildingId.value
  ? `建筑 ${selectedBuildingId.value} 的报表任务会进入统计报表工作台。`
  : '建筑报表任务会进入统计报表工作台。');
const assistantCurrentTime = computed(() => getCurrentTimeString());
const assistantCurrentFilters = computed<AIQueryAssistantFilters>(() => ({
  keyword: advancedFilters.value.keyword || null,
  site_id: advancedFilters.value.site_id || null,
  primaryspaceusage: advancedFilters.value.primaryspaceusage || null,
  status: filterForm.value.status || null,
  time_range: {
    start: timeFilterStart.value,
    end: timeFilterEnd.value
  },
  min_energy: advancedFilters.value.min_energy ?? null,
  max_energy: advancedFilters.value.max_energy ?? null,
  min_eui: advancedFilters.value.min_eui ?? null,
  max_eui: advancedFilters.value.max_eui ?? null,
  min_carbon: advancedFilters.value.min_carbon ?? null,
  max_carbon: advancedFilters.value.max_carbon ?? null,
  sort_by: sortConfig.value.field,
  sort_order: sortConfig.value.order
}));

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

const resolveReportType = (config: ReportExportConfig): ReportType => {
  if (config.reportCategory === 'anomaly') return 'anomaly_report';
  const range = filterForm.value.timeRange;
  if (range === 'today') return 'daily_summary';
  if (range === 'week') return 'weekly_summary';
  if (range === 'month') return 'monthly_summary';
  return 'custom_summary';
};

const handleExportConfirm = async (config: ReportExportConfig) => {
  loading.value = true;
  try {
    const { start_time, end_time } = calculateTimeRange(filterForm.value.timeRange);

    await generateReport({
      report_type: resolveReportType(config),
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

const handleDetailReportConfirm = async (config: ReportExportConfig) => {
  if (!selectedBuildingId.value) return;
  loading.value = true;
  try {
    const { start_time, end_time } = calculateTimeRange(filterForm.value.timeRange);

    await generateReport({
      report_type: resolveReportType(config),
      building_id: selectedBuildingId.value,
      time_range: { start: start_time, end: end_time },
      include_ai_summary: config.includeAiSummary
    });

    showDetailReportModal.value = false;
    showSuccessModal.value = true;
  } catch (e: any) {
    console.error('建筑报表任务创建失败:', e);
    alert('任务队列繁忙，请稍后再试');
  } finally {
    loading.value = false;
  }
};

const goToReportWorkbench = () => {
  showSuccessModal.value = false;
  router.push('/statistics'); // 修正跳转路径
};

const handleStatusChange = () => {};
const handleTimeRangeChange = () => {
  if (filterForm.value.timeRange !== 'custom') customTimeRange.value = null;
  fetchHighlightsData();
};

const cloneJson = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const inferPresetFromTimeRange = (start: string, end: string) => {
  const targetStart = new Date(start).getTime();
  const targetEnd = new Date(end).getTime();
  const threshold = 61_000;
  const presets: Array<'today' | 'week' | 'month' | 'year'> = ['today', 'week', 'month', 'year'];

  for (const preset of presets) {
    const range = calculateTimeRange(preset);
    const presetStart = new Date(range.start_time).getTime();
    const presetEnd = new Date(range.end_time).getTime();
    if (Math.abs(presetStart - targetStart) <= threshold && Math.abs(presetEnd - targetEnd) <= threshold) {
      return preset;
    }
  }

  return 'custom' as const;
};

const normalizeRangeValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const isAssistantHighlightActive = (key: string) => assistantHighlightKeys.value.includes(key);
const activeSortHighlights = computed<SortField[]>(() => sortFieldOptions
  .filter((option) => isAssistantHighlightActive(`sort:${option.value}`))
  .map((option) => option.value));
const activeSortOrderHighlights = computed<SortOrder[]>(() => isAssistantHighlightActive('sortOrder') ? [sortConfig.value.order] : []);

const advancedModalSeed = computed<AdvancedModalSeed>(() => ({
  startTime: customTimeRange.value?.start || '',
  endTime: customTimeRange.value?.end || '',
  keyword: advancedFilters.value.keyword || '',
  site_id: advancedFilters.value.site_id || '',
  primaryspaceusage: advancedFilters.value.primaryspaceusage || '',
  min_energy: normalizeRangeValue(advancedFilters.value.min_energy),
  max_energy: normalizeRangeValue(advancedFilters.value.max_energy),
  min_eui: normalizeRangeValue(advancedFilters.value.min_eui),
  max_eui: normalizeRangeValue(advancedFilters.value.max_eui),
  min_carbon: normalizeRangeValue(advancedFilters.value.min_carbon),
  max_carbon: normalizeRangeValue(advancedFilters.value.max_carbon)
}));

const triggerAssistantHighlights = (keys: string[]) => {
  assistantHighlightKeys.value = [];
  if (assistantHighlightTimer) clearTimeout(assistantHighlightTimer);
  if (!keys.length) return;

  assistantHighlightKeys.value = [...new Set(keys)];
  assistantHighlightTimer = setTimeout(() => {
    assistantHighlightKeys.value = [];
    assistantHighlightTimer = null;
  }, 1700);
};

const triggerAdvancedModalHighlights = (fields: string[]) => {
  advancedModalHighlights.value = [];
  if (advancedModalHighlightTimer) clearTimeout(advancedModalHighlightTimer);
  if (!fields.length) return;

  advancedModalHighlights.value = [...new Set(fields)];
  advancedModalHighlightTimer = setTimeout(() => {
    advancedModalHighlights.value = [];
    advancedModalHighlightTimer = null;
  }, 2400);
};

const buildAssistantVisualState = (filters: AIQueryAssistantFilters) => {
  const panelKeys = new Set<string>();
  const modalFields = new Set<string>();

  if (filters.status) panelKeys.add('status');

  if (filters.time_range?.start && filters.time_range?.end) {
    panelKeys.add('timeRange');
    modalFields.add('startTime');
    modalFields.add('endTime');
  }

  if (filters.keyword) modalFields.add('keyword');
  if (filters.site_id) modalFields.add('site_id');
  if (filters.primaryspaceusage) modalFields.add('primaryspaceusage');
  if (filters.min_energy != null || filters.max_energy != null) {
    modalFields.add('min_energy');
    modalFields.add('max_energy');
  }
  if (filters.min_eui != null || filters.max_eui != null) {
    modalFields.add('min_eui');
    modalFields.add('max_eui');
  }
  if (filters.min_carbon != null || filters.max_carbon != null) {
    modalFields.add('min_carbon');
    modalFields.add('max_carbon');
  }

  if (modalFields.size > 0) panelKeys.add('advancedButton');

  if (filters.sort_by && ['eui', 'totalEnergy', 'status', 'carbonEmission'].includes(filters.sort_by)) {
    panelKeys.add(`sort:${filters.sort_by}`);
  }
  if (filters.sort_order === 'asc' || filters.sort_order === 'desc') {
    panelKeys.add('sortOrder');
  }

  let initialTab: AdvancedModalTab = 'time';
  if (['min_energy', 'max_energy', 'min_eui', 'max_eui', 'min_carbon', 'max_carbon'].some((item) => modalFields.has(item))) {
    initialTab = 'energy';
  } else if (['keyword', 'site_id', 'primaryspaceusage'].some((item) => modalFields.has(item))) {
    initialTab = 'property';
  } else if (['startTime', 'endTime'].some((item) => modalFields.has(item))) {
    initialTab = 'time';
  }

  return {
    panelKeys: Array.from(panelKeys),
    modalFields: Array.from(modalFields),
    initialTab,
    shouldOpenAdvanced: modalFields.size > 0
  };
};

const applyAssistantFilters = (filters: AIQueryAssistantFilters) => {
  filterForm.value.status = (filters.status as any) || '';

  if (filters.time_range?.start && filters.time_range?.end) {
    const nextPreset = inferPresetFromTimeRange(filters.time_range.start, filters.time_range.end);
    if (nextPreset === 'custom') {
      filterForm.value.timeRange = 'custom';
      customTimeRange.value = {
        start: filters.time_range.start,
        end: filters.time_range.end
      };
    } else {
      filterForm.value.timeRange = nextPreset;
      customTimeRange.value = null;
    }
  }

  advancedFilters.value = {
    keyword: filters.keyword || '',
    site_id: filters.site_id || '',
    primaryspaceusage: filters.primaryspaceusage || '',
    min_energy: normalizeRangeValue(filters.min_energy),
    max_energy: normalizeRangeValue(filters.max_energy),
    min_eui: normalizeRangeValue(filters.min_eui),
    max_eui: normalizeRangeValue(filters.max_eui),
    min_carbon: normalizeRangeValue(filters.min_carbon),
    max_carbon: normalizeRangeValue(filters.max_carbon)
  };

  if (filters.sort_by && ['eui', 'totalEnergy', 'status', 'carbonEmission'].includes(filters.sort_by)) {
    sortConfig.value.field = filters.sort_by as typeof sortConfig.value.field;
  }
  if (filters.sort_order === 'asc' || filters.sort_order === 'desc') {
    sortConfig.value.order = filters.sort_order;
  }
};

const handleAssistantApply = (response: AIQueryAssistantResponse) => {
  lastAssistantSnapshot.value = {
    filterForm: cloneJson(filterForm.value),
    advancedFilters: cloneJson(advancedFilters.value),
    customTimeRange: customTimeRange.value ? cloneJson(customTimeRange.value) : null,
    sortConfig: cloneJson(sortConfig.value)
  };
  applyAssistantFilters(response.applied_filters);
  const visualState = buildAssistantVisualState(response.applied_filters);
  triggerAdvancedModalHighlights(visualState.modalFields);
  advancedModalInitialTab.value = visualState.initialTab;
  triggerAssistantHighlights(visualState.panelKeys);
  if (visualState.shouldOpenAdvanced) {
    if (advancedModalOpenTimer) clearTimeout(advancedModalOpenTimer);
    advancedModalOpenTimer = setTimeout(() => {
      nextTick(() => {
        showAdvanced.value = true;
        advancedModalPulseId.value += 1;
      });
      advancedModalOpenTimer = null;
    }, 240);
  }
  fetchHighlightsData();
};

const handleAssistantUndo = () => {
  if (!lastAssistantSnapshot.value) return;
  filterForm.value = cloneJson(lastAssistantSnapshot.value.filterForm);
  advancedFilters.value = cloneJson(lastAssistantSnapshot.value.advancedFilters);
  customTimeRange.value = lastAssistantSnapshot.value.customTimeRange ? cloneJson(lastAssistantSnapshot.value.customTimeRange) : null;
  sortConfig.value = cloneJson(lastAssistantSnapshot.value.sortConfig);
  lastAssistantSnapshot.value = null;
  fetchHighlightsData();
};

const handleReset = () => {
  filterForm.value.status = '';
  filterForm.value.timeRange = 'week';
  advancedFilters.value = {};
  customTimeRange.value = null;
  lastAssistantSnapshot.value = null;
  handleRefresh();
};

const handleSortFieldChange = (value: string | number) => {
  sortConfig.value.field = value as SortField;
};

const handleSortOrderChange = (value: string | number) => {
  sortConfig.value.order = value as SortOrder;
};

const handleAdvancedSave = (f: any) => {
  advancedFilters.value = f;
  if (f.startTime && f.endTime) {
    customTimeRange.value = { start: f.startTime, end: f.endTime };
    filterForm.value.timeRange = 'custom';
  }
  fetchHighlightsData();
};

const handleViewDetail = (i: any) => {
  selectedBuildingId.value = i.building_id || i.buildingId;
  showStatsModal.value = true;
};
const handleOpenReportGenerate = (context: ReportSourceContext) => {
  selectedBuildingId.value = context.buildingId;
  showStatsModal.value = false;
  showDetailReportModal.value = true;
};
const handleFaultAnalysis = (i: any) => {
  router.push({ path: '/fault-analysis', query: { building_id: i.building_id } });
};

onMounted(() => {
  fetchHighlightsData();
});

onBeforeUnmount(() => {
  if (assistantHighlightTimer) clearTimeout(assistantHighlightTimer);
  if (advancedModalHighlightTimer) clearTimeout(advancedModalHighlightTimer);
  if (advancedModalOpenTimer) clearTimeout(advancedModalOpenTimer);
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
.select-box {
  --select-width: 180px;
  --select-height: 36px;
  --select-padding-x: 12px;
  --select-radius: 12px;
  --select-font-size: 13px;
  --select-font-weight: 600;
  --select-border-color: #d1d5db;
  --select-bg: #ffffff;
  --select-hover-bg: #f8fbff;
  --select-option-active-bg: #0b4582;
  --select-option-active-color: #ffffff;
}
.button-group { margin-left: auto; display: flex; gap: 12px; }
.btn { height: 36px; padding: 0 16px; border-radius: 8px; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; border: none; }
.btn-icon { flex: 0 0 auto; }
.btn-primary-dark { background: #002B54; color: white; }
.btn-outline { background: white; border: 1px solid #D1D5DB; }
.ai-field-glow { animation: assistantPulse 1.2s ease; position: relative; }
.filter-item.ai-field-glow .select-box,
.btn.ai-field-glow,
.sort-track.ai-field-glow :deep(.sliding-group.track),
.sort-order-track.ai-field-glow :deep(.sliding-group.track) {
  --select-border-color: #60A5FA;
  --select-open-border: #60A5FA;
  --select-hover-border: #60A5FA;
  --select-shadow: 0 0 0 4px rgba(96, 165, 250, 0.18), 0 10px 24px rgba(0, 91, 172, 0.1);
  --select-bg: linear-gradient(180deg, #ffffff, #f5faff);
  --select-hover-bg: linear-gradient(180deg, #ffffff, #f5faff);
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.18), 0 10px 24px rgba(0, 91, 172, 0.1);
}
.btn.ai-field-glow,
.sort-track.ai-field-glow,
.sort-order-track.ai-field-glow {
  transform: translateY(-1px);
}
.data-card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
.sort-section { display: flex; align-items: center; gap: 12px; flex: 1 1 560px; min-width: 0; flex-wrap: wrap; }
.sort-label { font-size: 13px; color: #4B5563; font-weight: 600; }
.sort-track,
.sort-order-track {
  transition: transform .22s ease;
}
.sort-track :deep(.sliding-group.track),
.sort-order-track :deep(.sliding-group.track) {
  padding: 4px;
  border-radius: 14px;
  background: #F3F4F6;
}
.sort-track :deep(.sliding-indicator) {
  background: linear-gradient(135deg, #005BAC, #003D73);
  box-shadow: 0 10px 22px rgba(0, 91, 172, 0.18);
}
.sort-order-track :deep(.sliding-indicator) {
  background: linear-gradient(135deg, #0F172A, #334155);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.18);
}
.sort-track :deep(.sliding-option),
.sort-order-track :deep(.sliding-option) {
  min-height: 34px;
  padding: 6px 14px;
  justify-content: center;
  white-space: nowrap;
}
.sort-track :deep(.sliding-option.active),
.sort-order-track :deep(.sliding-option.active) {
  color: white;
}
.export-section {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 auto;
  max-width: 100%;
  margin-left: auto;
  min-height: 40px;
}
.export-actions-shell {
  --export-actions-width: 116px;
  width: var(--export-actions-width);
  flex: 0 0 var(--export-actions-width);
  display: flex;
  justify-content: flex-end;
  overflow: visible;
  transition:
    width .34s cubic-bezier(.22, 1, .36, 1),
    flex-basis .34s cubic-bezier(.22, 1, .36, 1);
}
.export-actions-shell.selecting {
  --export-actions-width: 216px;
}
.export-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
}
.export-actions.single {
  justify-content: flex-end;
}
.query-action-btn {
  height: 38px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
  transition:
    transform .22s cubic-bezier(.22, 1, .36, 1),
    box-shadow .22s ease,
    background .22s ease,
    border-color .22s ease,
    color .22s ease,
    opacity .22s ease;
}
.query-action-btn.secondary {
  background: #ffffff;
  border-color: #d8e0ea;
  color: #344054;
  box-shadow: 0 6px 18px rgba(15, 23, 42, .04);
}
.query-action-btn.primary {
  background: linear-gradient(135deg, #003d75, #0b5faa);
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(11, 69, 130, .16);
}
.query-action-btn.primary.ready {
  background: linear-gradient(135deg, #004d92, #0c6cc1);
  box-shadow: 0 14px 28px rgba(11, 69, 130, .2);
}
.query-action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
.query-action-btn:disabled {
  cursor: not-allowed;
  opacity: .48;
  box-shadow: none;
}
.export-actions-switch-enter-active,
.export-actions-switch-leave-active {
  transition:
    opacity .24s ease,
    transform .32s cubic-bezier(.22, 1, .36, 1),
    filter .32s ease;
}
.export-actions-switch-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(.97);
  filter: blur(6px);
}
.export-actions-switch-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(.98);
  filter: blur(6px);
}
@media (max-width: 1180px) {
  .export-section {
    width: 100%;
  }
}
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 20, 50, 0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 3000; }
.success-modal { background: white; border-radius: 24px; width: 100%; max-width: 420px; padding: 40px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.success-icon-wrap { width: 80px; height: 80px; background: #F0FDF4; color: #16A34A; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
.success-modal h3 { margin: 0 0 12px; font-size: 22px; color: #111; font-weight: 800; }
.success-modal p { margin: 0 0 32px; font-size: 15px; color: #666; line-height: 1.6; }
.modal-actions { display: flex; gap: 16px; }
.modal-actions .btn { flex: 1; justify-content: center; height: 48px; font-weight: 700; border-radius: 12px; }
.success-modal-shell-enter-active,
.success-modal-shell-leave-active {
  transition: opacity .26s ease;
}
.success-modal-shell-enter-active .success-modal,
.success-modal-shell-leave-active .success-modal {
  transition:
    opacity .28s ease,
    transform .34s cubic-bezier(.22, 1, .36, 1),
    filter .34s ease;
}
.success-modal-shell-enter-from,
.success-modal-shell-leave-to {
  opacity: 0;
}
.success-modal-shell-enter-from .success-modal,
.success-modal-shell-leave-to .success-modal {
  opacity: 0;
  transform: translateY(24px) scale(.97);
  filter: blur(10px);
}
.spin { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes assistantPulse {
  0% { opacity: .65; transform: translateY(8px) scale(.98); }
  30% { opacity: 1; transform: translateY(0) scale(1); }
  65% { box-shadow: 0 0 0 8px rgba(96, 165, 250, 0.08); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
