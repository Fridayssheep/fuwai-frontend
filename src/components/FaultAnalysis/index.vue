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

    <!-- 主内容区 -->
    <div class="main-area" :class="{ 'has-detail': !!selectedAnomaly }">
      <!-- 左侧列表 -->
      <div class="list-column">
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

      <!-- 右侧详情 -->
      <Transition name="detail-slide">
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
      </Transition>

      <!-- 未选中空状态 -->
      <div v-if="!selectedAnomaly && anomalyList.length > 0" class="empty-detail">
        <div class="empty-visual">
          <Icon icon="lucide:mouse-pointer-click" class="empty-icon" />
        </div>
        <p>选择左侧异常项查看详情</p>
        <span>点击异常条目以加载完整分析数据与 AI 诊断</span>
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
import { useFaultAnalysis } from './useFaultAnalysis'

const {
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

/* Main area */
.main-area {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  flex: 1;
  min-height: 0;
}
.main-area.has-detail {
  grid-template-columns: 380px 1fr;
}

.list-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.detail-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
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

/* Empty detail */
.empty-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  padding: 60px 20px;
}
.empty-visual {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #eff6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}
.empty-icon { font-size: 32px; color: #0b4582; display: flex; }
.empty-detail p {
  margin: 0;
  font-size: 15px;
  color: #555;
  font-weight: 600;
}
.empty-detail span {
  font-size: 12px;
  color: #aaa;
}

/* Detail slide transition */
.detail-slide-enter-active {
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.detail-slide-leave-active {
  transition: all 0.25s ease;
}
.detail-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.detail-slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

@media (max-width: 900px) {
  .main-area.has-detail {
    grid-template-columns: 1fr;
  }
  .fault-analysis-page {
    padding: 16px;
  }
}
</style>
