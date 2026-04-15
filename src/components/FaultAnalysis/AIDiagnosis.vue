<template>
  <div class="ai-diagnosis">
    <!-- 触发按钮 -->
    <button
      v-if="!result && !loading"
      class="ai-trigger-btn"
      @click="$emit('run')"
      :disabled="loading"
    >
      <Icon icon="lucide:brain-circuit" class="btn-icon" />
      AI 智能诊断
    </button>

    <!-- 加载骨架 -->
    <div v-if="loading" class="ai-skeleton">
      <div class="skeleton-pulse">
        <Icon icon="lucide:loader-2" class="spin-icon" />
        <span>AI 正在分析故障原因…</span>
      </div>
      <div class="skeleton-lines">
        <div class="skel-line" style="width: 85%"></div>
        <div class="skel-line" style="width: 60%"></div>
        <div class="skel-line" style="width: 72%"></div>
      </div>
    </div>

    <!-- 错误 -->
    <div v-if="error" class="ai-error">
      <Icon icon="lucide:alert-circle" class="err-icon" />
      <span>{{ error }}</span>
      <button class="retry-btn" @click="$emit('run')">重试</button>
    </div>

    <!-- 结果 -->
    <div v-if="result" class="ai-result">
      <!-- 摘要 -->
      <div class="result-section summary-section">
        <div class="section-label">
          <Icon icon="lucide:file-text" class="sec-icon" />
          诊断摘要
        </div>
        <p class="summary-text">{{ result.summary }}</p>
      </div>

      <!-- 详细答案 -->
      <div v-if="result.answer" class="result-section answer-section">
        <div class="section-label">
          <Icon icon="lucide:message-square-text" class="sec-icon" />
          详细分析
        </div>
        <p class="answer-text">{{ result.answer }}</p>
      </div>

      <!-- 风险提示 -->
      <div v-if="result.risk_notice" class="risk-notice">
        <Icon icon="lucide:shield-alert" class="risk-icon" />
        <span>{{ result.risk_notice }}</span>
      </div>

      <!-- 候选原因 -->
      <div class="result-section causes-section">
        <div class="section-label">
          <Icon icon="lucide:search-check" class="sec-icon" />
          候选故障原因
          <span class="cause-count">{{ result.candidate_causes.length }} 项</span>
        </div>

        <div class="cause-cards">
          <div
            v-for="cause in result.candidate_causes"
            :key="cause.cause_id"
            class="cause-card"
            :class="{ selected: selectedCauseId === cause.cause_id, confirmed: isConfirmed }"
            @click="!isConfirmed && $emit('selectCause', cause)"
          >
            <div class="cause-rank">#{{ cause.rank }}</div>
            <div class="cause-body">
              <div class="cause-title">{{ cause.title }}</div>
              <div class="cause-desc">{{ cause.description }}</div>
              <!-- 置信度条 -->
              <div class="confidence-wrap">
                <div class="confidence-label">置信度</div>
                <div class="confidence-bar">
                  <div
                    class="confidence-fill"
                    :style="{ width: `${Math.round(cause.confidence * 100)}%` }"
                    :class="confidenceClass(cause.confidence)"
                  ></div>
                </div>
                <div class="confidence-value">{{ Math.round(cause.confidence * 100) }}%</div>
              </div>
              <!-- 建议检查 -->
              <div v-if="cause.recommended_checks?.length" class="checks">
                <div v-for="(check, ci) in cause.recommended_checks" :key="ci" class="check-item">
                  <Icon icon="lucide:check-square" class="check-icon" />
                  {{ check }}
                </div>
              </div>
            </div>
            <div class="select-indicator">
              <Icon
                :icon="selectedCauseId === cause.cause_id ? 'lucide:circle-check-big' : 'lucide:circle'"
                class="select-icon"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 证据列表 -->
      <div v-if="result.evidence?.length" class="result-section evidence-section">
        <div class="section-label">
          <Icon icon="lucide:book-open-text" class="sec-icon" />
          证据引用
        </div>
        <div class="evidence-list">
          <div v-for="evi in result.evidence" :key="evi.evidence_id" class="evidence-item">
            <span class="evi-type" :class="evi.type">{{ eviTypeLabel(evi.type) }}</span>
            <span class="evi-source">{{ evi.source }}</span>
            <p class="evi-snippet">{{ evi.snippet }}</p>
          </div>
        </div>
      </div>

      <!-- 反馈区 -->
      <div v-if="result.feedback_prompt?.enabled !== false" class="feedback-section">
        <Transition name="fade" mode="out-in">
          <!-- 已确认 -->
          <div v-if="isConfirmed" class="feedback-confirmed" key="confirmed">
            <Icon icon="lucide:check-circle" class="confirmed-icon" />
            <span>反馈已提交，感谢您的确认！</span>
          </div>

          <!-- 未确认 -->
          <div v-else class="feedback-form" key="form">
            <p class="feedback-prompt">{{ result.feedback_prompt.message }}</p>
            <div v-if="selectedCauseId" class="feedback-actions">
              <div class="selected-cause-preview">
                已选原因: <strong>{{ selectedCauseTitle }}</strong>
              </div>
              <textarea
                v-if="result.feedback_prompt.allow_comment"
                v-model="localComment"
                class="feedback-textarea"
                placeholder="补充说明（可选）…"
                rows="2"
              ></textarea>
              <button
                class="confirm-btn"
                :disabled="feedbackLoading"
                @click="$emit('submitFeedback')"
              >
                <Icon v-if="feedbackLoading" icon="lucide:loader-2" class="spin-icon btn-icon" />
                <Icon v-else icon="lucide:send" class="btn-icon" />
                {{ feedbackLoading ? '提交中…' : '确认此原因' }}
              </button>
              <div v-if="feedbackError" class="feedback-err">{{ feedbackError }}</div>
            </div>
            <div v-else class="feedback-hint">
              <Icon icon="lucide:mouse-pointer-click" class="hint-icon" />
              请点击上方卡片选择您认为最可能的故障原因
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { AIAnalyzeAnomalyResponse, AICandidateCause } from '../../api/anomaly'

const props = defineProps<{
  loading: boolean
  error: string
  result: AIAnalyzeAnomalyResponse | null
  selectedCauseId: string | null
  feedbackLoading: boolean
  feedbackError: string
  isConfirmed: boolean
  comment: string
}>()

const emit = defineEmits<{
  (e: 'run'): void
  (e: 'selectCause', cause: AICandidateCause): void
  (e: 'submitFeedback'): void
  (e: 'update:comment', val: string): void
}>()

const localComment = computed({
  get: () => props.comment,
  set: (val: string) => emit('update:comment', val)
})

const selectedCauseTitle = computed(() => {
  return props.result?.candidate_causes.find(c => c.cause_id === props.selectedCauseId)?.title || ''
})

const confidenceClass = (c: number) => {
  if (c >= 0.7) return 'conf-high'
  if (c >= 0.4) return 'conf-mid'
  return 'conf-low'
}

const eviTypeLabel = (t: string) => {
  const m: Record<string, string> = { knowledge: '知识库', data: '数据', rule: '规则', graph: '图谱' }
  return m[t] || t
}
</script>

<style scoped>
.ai-diagnosis {
  margin-top: 4px;
}

/* Trigger button */
.ai-trigger-btn {
  width: 100%;
  padding: 14px;
  border: 2px dashed #c8d6e5;
  background: linear-gradient(135deg, #f8faff, #eff6ff);
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
  color: #0b4582;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.25s ease;
}
.ai-trigger-btn:hover {
  border-color: #0b4582;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(11, 69, 130, 0.12);
}
.ai-trigger-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-icon { font-size: 18px; display: flex; }

/* Skeleton */
.ai-skeleton {
  padding: 24px;
  background: #f8fafc;
  border-radius: 14px;
}
.skeleton-pulse {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0b4582;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
}
.spin-icon {
  animation: spin 1s linear infinite;
  display: flex;
}
@keyframes spin { to { transform: rotate(360deg); } }
.skeleton-lines { display: flex; flex-direction: column; gap: 8px; }
.skel-line {
  height: 12px;
  background: linear-gradient(90deg, #e8edf2 25%, #f0f4f8 50%, #e8edf2 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 6px;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Error */
.ai-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  background: #fef2f2;
  border-radius: 12px;
  color: #dc2626;
  font-size: 13px;
}
.err-icon { font-size: 18px; display: flex; }
.retry-btn {
  margin-left: auto;
  padding: 6px 14px;
  border: none;
  background: #dc2626;
  color: white;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

/* Result */
.ai-result {
  animation: fadeSlideUp 0.4s ease both;
}
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.result-section { margin-bottom: 20px; }
.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 10px;
}
.sec-icon { font-size: 16px; color: #0b4582; display: flex; }
.cause-count {
  font-size: 11px;
  background: #eff6ff;
  color: #0b4582;
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 700;
  margin-left: 6px;
}

.summary-text, .answer-text {
  font-size: 13px;
  line-height: 1.7;
  color: #374151;
  margin: 0;
  padding: 14px 16px;
  background: #f8fafc;
  border-radius: 12px;
  border-left: 3px solid #0b4582;
}
.answer-text { border-left-color: #6366f1; }

/* Risk notice */
.risk-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 12px;
  font-size: 12px;
  color: #92400e;
  margin-bottom: 20px;
}
.risk-icon { font-size: 16px; color: #d97706; flex-shrink: 0; display: flex; margin-top: 1px; }

/* Cause cards */
.cause-cards { display: flex; flex-direction: column; gap: 10px; }
.cause-card {
  display: flex;
  gap: 14px;
  padding: 16px;
  background: white;
  border: 1.5px solid #e8edf2;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.cause-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 2px 10px rgba(11, 69, 130, 0.06);
}
.cause-card.selected {
  border-color: #0b4582;
  background: #f0f7ff;
  box-shadow: 0 0 0 3px rgba(11, 69, 130, 0.08);
}
.cause-card.confirmed {
  cursor: default;
  opacity: 0.85;
}

.cause-rank {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #eff6ff;
  color: #0b4582;
  font-size: 13px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cause-body { flex: 1; min-width: 0; }
.cause-title {
  font-size: 14px;
  font-weight: 700;
  color: #111;
  margin-bottom: 4px;
}
.cause-desc {
  font-size: 12px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 10px;
}

.confidence-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.confidence-label { font-size: 11px; color: #888; flex-shrink: 0; }
.confidence-bar {
  flex: 1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}
.confidence-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}
.conf-high { background: linear-gradient(90deg, #22c55e, #16a34a); }
.conf-mid { background: linear-gradient(90deg, #f59e0b, #d97706); }
.conf-low { background: linear-gradient(90deg, #94a3b8, #64748b); }
.confidence-value { font-size: 12px; font-weight: 700; color: #333; min-width: 36px; text-align: right; }

.checks { display: flex; flex-direction: column; gap: 3px; }
.check-item {
  font-size: 11px;
  color: #555;
  display: flex;
  align-items: center;
  gap: 5px;
}
.check-icon { font-size: 12px; color: #16a34a; display: flex; }

.select-indicator { flex-shrink: 0; display: flex; align-items: center; }
.select-icon { font-size: 22px; color: #c8d6e5; display: flex; }
.cause-card.selected .select-icon { color: #0b4582; }

/* Evidence */
.evidence-list { display: flex; flex-direction: column; gap: 8px; }
.evidence-item {
  padding: 12px 14px;
  background: #f8fafc;
  border-radius: 10px;
  border-left: 3px solid #e2e8f0;
}
.evi-type {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 700;
  margin-right: 6px;
}
.evi-type.knowledge { background: #eff6ff; color: #0b4582; }
.evi-type.data { background: #f0fdf4; color: #16a34a; }
.evi-type.rule { background: #fef3c7; color: #92400e; }
.evi-type.graph { background: #f3e8ff; color: #7c3aed; }
.evi-source { font-size: 11px; color: #888; }
.evi-snippet { margin: 6px 0 0; font-size: 12px; color: #555; line-height: 1.6; }

/* Feedback */
.feedback-section {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
.feedback-prompt {
  font-size: 13px;
  color: #555;
  margin: 0 0 12px;
}
.feedback-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #aaa;
  padding: 12px 0;
}
.hint-icon { font-size: 14px; display: flex; }

.feedback-actions { display: flex; flex-direction: column; gap: 10px; }
.selected-cause-preview {
  font-size: 12px;
  color: #555;
  padding: 8px 12px;
  background: #f0f7ff;
  border-radius: 8px;
}
.selected-cause-preview strong { color: #0b4582; }

.feedback-textarea {
  width: 100%;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.feedback-textarea:focus {
  outline: none;
  border-color: #0b4582;
}

.confirm-btn {
  align-self: flex-end;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  border: none;
  background: linear-gradient(135deg, #0b4582, #1565c0);
  color: white;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}
.confirm-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(11, 69, 130, 0.2);
}
.confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.feedback-err {
  font-size: 12px;
  color: #dc2626;
}

.feedback-confirmed {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border-radius: 12px;
  color: #16a34a;
  font-size: 14px;
  font-weight: 600;
  animation: fadeSlideUp 0.35s ease;
}
.confirmed-icon { font-size: 22px; display: flex; }

/* Fade transition */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
