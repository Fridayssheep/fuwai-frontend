<template>
  <div class="fault-analysis-page">
    <!-- 顶部操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">
          <Icon icon="lucide:shield-alert" class="title-icon" />
          故障分析
        </h2>
        <span class="page-subtitle">建筑能源异常检测与 AI 智能诊断</span>
      </div>
      <div class="header-right">
        <!-- 时间范围切换 -->
        <div class="range-selector">
          <button
            v-for="r in rangeOptions"
            :key="r.value"
            class="range-btn"
            :class="{ active: chartRange === r.value }"
            @click="setChartRange(r.value)"
          >
            {{ r.label }}
          </button>
        </div>

        <button
          class="trigger-btn"
          :class="{ running: detecting }"
          :disabled="detecting"
          @click="startDetection"
        >
          <Icon
            :icon="detecting ? 'lucide:loader-2' : 'lucide:play'"
            class="trigger-icon"
            :class="{ spin: detecting }"
          />
          {{ detecting ? '分析中…' : '触发异常检测' }}
        </button>
        <button class="refresh-btn" @click="fetchOverview" :disabled="overviewLoading">
          <Icon icon="lucide:refresh-cw" class="refresh-icon" :class="{ spin: overviewLoading }" />
        </button>
      </div>
    </div>

    <!-- 检测错误 -->
    <div v-if="detectError" class="detect-error-bar">
      <Icon icon="lucide:alert-circle" class="de-icon" />
      {{ detectError }}
    </div>

    <!-- 检测进度（内嵌，不阻断操作） -->
    <ProgressOverlay
      :visible="detecting"
      :currentMessage="detectProgress"
      :logs="detectLogs"
    />

    <!-- KPI 概览卡片 -->
    <OverviewCards :stats="severityStats" />

    <!-- 主内容区：flexbox 布局，避免 grid 切换导致闪跳 -->
    <div class="main-area">
      <!-- 列表列 -->
      <div class="list-column" :class="{ shrink: !!selectedAnomaly }">
        <div v-if="overviewLoading && anomalyList.length === 0" class="loading-placeholder">
          <Icon icon="lucide:loader-2" class="spin-icon" />
          <span>加载中…</span>
        </div>
        <div v-else-if="overviewError && anomalyList.length === 0" class="error-placeholder">
          <Icon icon="lucide:wifi-off" class="err-ph-icon" />
          <p>{{ overviewError }}</p>
          <button class="retry-btn" @click="fetchOverview">重试</button>
        </div>
        <AnomalyList
          v-else
          :items="anomalyList"
          :selectedId="selectedAnomaly?.anomaly_id ?? null"
          @select="selectAnomaly"
        />
      </div>

      <!-- 详情列 -->
      <div v-if="selectedAnomaly" class="detail-column" :key="selectedAnomaly.anomaly_id">
        <AnomalyDetail
          :anomaly="selectedAnomaly"
          :loading="detailLoading"
          :error="detailError"
          :detail="detailData"
          :aiLoading="aiLoading"
          :aiError="aiError"
          :aiResult="aiResult"
          :selectedCause="selectedCause"
          :feedbackLoading="feedbackLoading"
          :feedbackError="feedbackError"
          :feedbackResult="feedbackResult"
          :feedbackComment="feedbackComment"
          @close="clearSelection"
          @runAI="runAIDiagnosis"
          @selectCause="selectCause"
          @submitFeedback="submitFeedback"
          @update:feedbackComment="(v: string) => feedbackComment = v"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import OverviewCards from './OverviewCards.vue'
import AnomalyList from './AnomalyList.vue'
import AnomalyDetail from './AnomalyDetail.vue'
import ProgressOverlay from './ProgressOverlay.vue'
import { useFaultAnalysis, type ChartRange } from './useFaultAnalysis'

const rangeOptions: { value: ChartRange; label: string }[] = [
  { value: 'day', label: '近 1 天' },
  { value: 'week', label: '近 1 周' },
  { value: 'month', label: '近 1 月' }
]

const {
  chartRange,
  setChartRange,
  overviewLoading,
  overviewError,
  anomalyList,
  fetchOverview,
  detecting,
  detectProgress,
  detectLogs,
  detectError,
  startDetection,
  selectedAnomaly,
  detailLoading,
  detailError,
  detailData,
  selectAnomaly,
  clearSelection,
  aiLoading,
  aiError,
  aiResult,
  runAIDiagnosis,
  selectedCause,
  feedbackLoading,
  feedbackError,
  feedbackResult,
  feedbackComment,
  selectCause,
  submitFeedback,
  severityStats
} = useFaultAnalysis()

onMounted(() => {
  fetchOverview()
})
</script>

<style scoped>
.fault-analysis-page {
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.header-left { display: flex; flex-direction: column; gap: 2px; }
.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #0b1e3d;
  display: flex;
  align-items: center;
  gap: 10px;
}
.title-icon { font-size: 24px; color: #0b4582; display: flex; }
.page-subtitle { font-size: 13px; color: #888; }

.header-right { display: flex; gap: 10px; align-items: center; }

/* Range selector */
.range-selector {
  display: flex;
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}
.range-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}
.range-btn:not(:last-child)::after {
  content: '';
  position: absolute;
  right: 0;
  top: 20%;
  height: 60%;
  width: 1px;
  background: #e2e8f0;
}
.range-btn:hover {
  color: #0b4582;
  background: #f8faff;
}
.range-btn.active {
  background: #0b4582;
  color: white;
}
.range-btn.active::after { display: none; }

.trigger-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  background: linear-gradient(135deg, #0b4582, #1565c0);
  color: white;
}
.trigger-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(11, 69, 130, 0.25);
}
.trigger-btn.running {
  background: linear-gradient(135deg, #475569, #64748b);
}
.trigger-btn:disabled { cursor: not-allowed; opacity: 0.9; transform: none; }
.trigger-icon { font-size: 16px; display: flex; }

.refresh-btn {
  width: 40px;
  height: 40px;
  border: 1.5px solid #e2e8f0;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.refresh-btn:hover { border-color: #0b4582; color: #0b4582; }
.refresh-icon { font-size: 16px; display: flex; }

.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Detect error */
.detect-error-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  color: #dc2626;
  font-size: 13px;
  font-weight: 500;
}
.de-icon { font-size: 16px; display: flex; }

/* Main area — flexbox instead of grid to avoid reflow flash */
.main-area {
  display: flex;
  gap: 20px;
  flex: 1;
  min-height: 0;
}

.list-column {
  flex: 1;
  min-width: 0;
  transition: flex 0.3s ease;
}
.list-column.shrink {
  flex: 0 0 380px;
  max-width: 380px;
}

.detail-column {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  animation: detailFadeIn 0.3s ease;
}
@keyframes detailFadeIn {
  from { opacity: 0; transform: translateX(12px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Loading / error placeholders */
.loading-placeholder, .error-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 20px;
  background: white;
  border-radius: 16px;
  color: #888;
}
.spin-icon {
  animation: spin 1s linear infinite;
  font-size: 24px;
  color: #0b4582;
  display: flex;
}
.err-ph-icon { font-size: 32px; color: #dc2626; display: flex; }
.error-placeholder p { margin: 0; font-size: 14px; color: #666; }
.retry-btn {
  padding: 8px 18px;
  border: none;
  background: #0b4582;
  color: white;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 900px) {
  .main-area {
    flex-direction: column;
  }
  .list-column.shrink {
    flex: none;
    max-width: none;
  }
  .fault-analysis-page {
    padding: 16px;
  }
}
</style>
