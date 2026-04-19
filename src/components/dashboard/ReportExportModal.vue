<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="rpt-modal-backdrop" @click.self="close">
        <div class="rpt-modal-container" @click.stop>
          <!-- Header -->
          <div class="rpt-modal-header">
            <div class="rpt-modal-title-row">
              <Icon icon="lucide:file-bar-chart" class="rpt-modal-title-icon" />
              <h2>快捷导出报表</h2>
            </div>
            <button class="rpt-modal-close" @click="close">
              <Icon icon="lucide:x" />
            </button>
          </div>

          <!-- Body -->
          <div class="rpt-modal-body">
            <label class="rpt-field-label">选择报告类型</label>
            <div class="rpt-type-grid">
              <button
                v-for="rt in reportTypeOptions"
                :key="rt.value"
                class="rpt-type-card"
                :class="{ selected: selectedType === rt.value }"
                @click="selectType(rt.value)"
              >
                <Icon :icon="rt.icon" class="rpt-type-card-icon" />
                <div class="rpt-type-card-text">
                  <strong>{{ rt.label }}</strong>
                  <span>{{ rt.desc }}</span>
                </div>
              </button>
            </div>

            <!-- Anomaly report: secondary granularity selector -->
            <Transition name="slide-fade">
              <div v-if="selectedType === 'anomaly_report'" class="rpt-granularity-section">
                <label class="rpt-field-label">分析跨度</label>
                <div class="rpt-granularity-tabs">
                  <SlidingOptionGroup
                    v-model="anomalyGranularity"
                    :options="granularityOptions"
                    aria-label="异常分析跨度"
                  >
                    <template #option="{ option, active }">
                      <Icon :icon="String(option.icon)" :class="['rpt-gran-icon', { active }]" />
                      {{ option.label }}
                    </template>
                  </SlidingOptionGroup>
                </div>
              </div>
            </Transition>

            <!-- Auto-computed time range display -->
            <div class="rpt-time-info">
              <Icon icon="lucide:calendar-range" class="rpt-time-info-icon" />
              <div class="rpt-time-info-text">
                <strong>报表时间范围</strong>
                <span>{{ computedTimeRangeLabel }}</span>
              </div>
              <span class="rpt-time-badge">自动</span>
            </div>

            <!-- AI Toggle -->
            <div class="rpt-ai-toggle-row">
              <div class="rpt-ai-toggle-info">
                <Icon icon="lucide:sparkles" class="rpt-ai-toggle-icon" />
                <div>
                  <strong>包含 AI 分析摘要</strong>
                  <span>在报表中自动生成 AI 数据洞察与建议</span>
                </div>
              </div>
              <label class="rpt-toggle-switch">
                <input type="checkbox" v-model="includeAI" />
                <span class="rpt-toggle-slider"></span>
              </label>
            </div>

            <!-- Error -->
            <div v-if="error" class="rpt-modal-error">
              <Icon icon="lucide:alert-circle" class="rpt-modal-error-icon" />
              {{ error }}
            </div>

            <!-- Success -->
            <div v-if="success" class="rpt-modal-success">
              <Icon icon="lucide:check-circle-2" class="rpt-modal-success-icon" />
              <div>
                <strong>报表生成成功</strong>
                <span>{{ successDetail }}</span>
              </div>
              <button class="rpt-download-btn" @click="handleDownload">
                <Icon icon="lucide:download" />
                下载报表
              </button>
            </div>
          </div>

          <!-- Footer -->
          <div class="rpt-modal-footer">
            <button class="rpt-btn-cancel" @click="close">取消</button>
            <button
              class="rpt-btn-generate"
              :disabled="generating"
              @click="handleGenerate"
            >
              <Icon
                :icon="generating ? 'lucide:loader-2' : 'lucide:file-down'"
                class="rpt-btn-icon"
                :class="{ spin: generating }"
              />
              {{ generating ? '生成中…' : '生成并导出' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { getCurrentTimeString } from '../../utils/timeManager'
import { generateReport, getReportDetail, type ReportType } from '../../api/dashboard'
import SlidingOptionGroup from '../common/SlidingOptionGroup.vue'

// ─── Options ─────────────────────────────────────────────────────
const reportTypeOptions: { value: ReportType; label: string; desc: string; icon: string }[] = [
  { value: 'daily_summary', label: '每日能耗快报', desc: '当日各建筑用电用水概览', icon: 'lucide:calendar-clock' },
  { value: 'weekly_summary', label: '周度能耗报告', desc: '按周汇总各建筑能耗数据', icon: 'lucide:calendar-range' },
  { value: 'monthly_summary', label: '月度统计报告', desc: '按月聚合能耗与碳排趋势', icon: 'lucide:calendar-days' },
  { value: 'anomaly_report', label: '异常分析报告', desc: '异常建筑诊断与偏离分析', icon: 'lucide:shield-alert' }
]

type AnomalyGranularity = 'day' | 'week' | 'month'
const granularityOptions: { value: AnomalyGranularity; label: string; icon: string }[] = [
  { value: 'day', label: '近一天', icon: 'lucide:clock' },
  { value: 'week', label: '近一周', icon: 'lucide:calendar-range' },
  { value: 'month', label: '近一月', icon: 'lucide:calendar-days' }
]

// ─── State ───────────────────────────────────────────────────────
const visible = ref(false)
const selectedType = ref<ReportType>('daily_summary')
const anomalyGranularity = ref<AnomalyGranularity>('week')
const includeAI = ref(true)
const generating = ref(false)
const error = ref('')
const success = ref(false)
const successDetail = ref('')
const generatedReportId = ref('')

// ─── Auto-computed time range from virtual "now" ─────────────────
const MS_DAY = 24 * 60 * 60 * 1000

const computedTimeRange = computed(() => {
  const now = new Date(getCurrentTimeString())
  let start: Date

  switch (selectedType.value) {
    case 'daily_summary':
      // 当天 00:00 ~ now
      start = new Date(now)
      start.setHours(0, 0, 0, 0)
      break
    case 'weekly_summary':
      start = new Date(now.getTime() - 7 * MS_DAY)
      break
    case 'monthly_summary':
      start = new Date(now.getTime() - 30 * MS_DAY)
      break
    case 'anomaly_report':
      // Based on user-selected granularity
      switch (anomalyGranularity.value) {
        case 'day': start = new Date(now.getTime() - 1 * MS_DAY); break
        case 'week': start = new Date(now.getTime() - 7 * MS_DAY); break
        case 'month': start = new Date(now.getTime() - 30 * MS_DAY); break
      }
      break
    default:
      start = new Date(now.getTime() - 7 * MS_DAY)
  }

  return {
    start: start.toISOString(),
    end: now.toISOString()
  }
})

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

const computedTimeRangeLabel = computed(() => {
  const { start, end } = computedTimeRange.value
  return `${formatDate(start)} — ${formatDate(end)}`
})

// ─── Actions ─────────────────────────────────────────────────────
const selectType = (type: ReportType) => {
  selectedType.value = type
  // Reset states on type change
  error.value = ''
  success.value = false
}

const unwrap = (res: any) => res?.data ?? res

const open = () => {
  error.value = ''
  success.value = false
  generating.value = false
  generatedReportId.value = ''
  selectedType.value = 'daily_summary'
  anomalyGranularity.value = 'week'
  includeAI.value = true
  visible.value = true
}

const close = () => {
  visible.value = false
}

defineExpose({ open, close })

const handleGenerate = async () => {
  error.value = ''
  success.value = false
  generating.value = true

  try {
    const { start, end } = computedTimeRange.value
    const raw = await generateReport({
      report_type: selectedType.value,
      time_range: { start, end },
      include_ai_summary: includeAI.value
    })
    const data = unwrap(raw)
    const reportId = data?.report_id

    if (!reportId) {
      error.value = '报表生成失败：未返回报表 ID'
      return
    }

    generatedReportId.value = reportId

    // Poll for completion
    let attempts = 0
    let status = data?.status || 'queued'

    while (['queued', 'processing'].includes(status) && attempts < 10) {
      await new Promise(r => setTimeout(r, 1500))
      const detail = unwrap(await getReportDetail(reportId))
      status = detail?.status || 'failed'
      attempts++
    }

    if (status === 'ready') {
      const typeLabel = reportTypeOptions.find(t => t.value === selectedType.value)?.label || '报表'
      success.value = true
      successDetail.value = `${typeLabel} 已就绪 (ID: ${reportId.slice(0, 8)}…)`
    } else if (status === 'failed') {
      error.value = '报表生成失败，请稍后重试'
    } else {
      success.value = true
      successDetail.value = `报表仍在处理中 (ID: ${reportId.slice(0, 8)}…)，可稍后下载`
    }
  } catch (err: any) {
    error.value = err?.message || '报表生成请求失败'
  } finally {
    generating.value = false
  }
}

const handleDownload = () => {
  if (!generatedReportId.value) return
  const url = `/api/reports/${generatedReportId.value}?download=true&format=md`
  const link = document.createElement('a')
  link.href = url
  link.download = `report_${generatedReportId.value}.md`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<style>
/* ═══ Report Modal (global because Teleport) ═══════════════════ */
.rpt-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(6px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-sans);
}

.rpt-modal-container {
  background: #ffffff;
  border-radius: 18px;
  width: 520px;
  max-width: 92vw;
  max-height: 88vh;
  overflow-y: auto;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.06);
  animation: rptModalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes rptModalSlideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-fade-enter-active { transition: opacity 0.25s ease; }
.modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

/* Header */
.rpt-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 28px 18px;
  border-bottom: 1px solid #e8ecf1;
}

.rpt-modal-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rpt-modal-title-icon {
  font-size: 22px;
  color: #0b4582;
  display: flex;
}

.rpt-modal-header h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.rpt-modal-close {
  border: none;
  background: transparent;
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
  color: #94a3b8;
  font-size: 20px;
  display: flex;
  transition: all 0.15s;
}

.rpt-modal-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}

/* Body */
.rpt-modal-body {
  padding: 22px 28px;
}

.rpt-field-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  margin-bottom: 10px;
}

.rpt-field-label:not(:first-child) {
  margin-top: 20px;
}

/* Type Grid */
.rpt-type-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.rpt-type-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 1.5px solid #e8ecf1;
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-family: inherit;
}

.rpt-type-card:hover {
  border-color: #c7d2fe;
  background: #f8faff;
}

.rpt-type-card.selected {
  border-color: #0b4582;
  background: #eff6ff;
  box-shadow: 0 0 0 3px rgba(11, 69, 130, 0.08);
}

.rpt-type-card-icon {
  font-size: 20px;
  color: #64748b;
  display: flex;
  margin-top: 2px;
  flex-shrink: 0;
  transition: color 0.2s;
}

.rpt-type-card.selected .rpt-type-card-icon {
  color: #0b4582;
}

.rpt-type-card-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rpt-type-card-text strong {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.rpt-type-card-text span {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

.rpt-type-card.selected .rpt-type-card-text strong {
  color: #0b4582;
}

/* Anomaly Granularity */
.rpt-granularity-section {
  margin-top: 18px;
}

.rpt-granularity-tabs {
  display: flex;
}

.rpt-granularity-tabs .sliding-group.track {
  width: 100%;
  padding: 4px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1.5px solid #e8ecf1;
}

.rpt-granularity-tabs .sliding-indicator {
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  box-shadow: 0 10px 20px rgba(11, 69, 130, 0.1);
}

.rpt-granularity-tabs .sliding-option {
  flex: 1;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
}

.rpt-granularity-tabs .sliding-option.active {
  color: #0b4582;
}

.rpt-gran-icon {
  font-size: 15px;
  display: flex;
}

.rpt-gran-icon.active {
  color: #0b4582;
}

.slide-fade-enter-active {
  transition: all 0.25s ease;
}
.slide-fade-leave-active {
  transition: all 0.2s ease;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Time Info (read-only computed range) */
.rpt-time-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  padding: 14px 18px;
  border: 1.5px solid #e8ecf1;
  border-radius: 12px;
  background: #f8fafc;
}

.rpt-time-info-icon {
  font-size: 20px;
  color: #0b4582;
  display: flex;
  flex-shrink: 0;
}

.rpt-time-info-text {
  flex: 1;
}

.rpt-time-info-text strong {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.02em;
}

.rpt-time-info-text span {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}

.rpt-time-badge {
  font-size: 10px;
  font-weight: 800;
  background: linear-gradient(135deg, #0b4582, #1e6fd0);
  color: white;
  padding: 3px 10px;
  border-radius: 20px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* AI Toggle */
.rpt-ai-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border: 1.5px solid #e8ecf1;
  border-radius: 12px;
  margin-top: 14px;
  transition: border-color 0.2s;
}

.rpt-ai-toggle-row:has(input:checked) {
  border-color: #c7d2fe;
  background: #fafbff;
}

.rpt-ai-toggle-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rpt-ai-toggle-icon {
  font-size: 20px;
  color: #7c3aed;
  display: flex;
}

.rpt-ai-toggle-info strong {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.rpt-ai-toggle-info span {
  display: block;
  font-size: 11.5px;
  color: #94a3b8;
  font-weight: 500;
  margin-top: 1px;
}

/* Toggle Switch */
.rpt-toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.rpt-toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.rpt-toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #cbd5e1;
  border-radius: 24px;
  transition: all 0.25s ease;
}

.rpt-toggle-slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: all 0.25s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.rpt-toggle-switch input:checked + .rpt-toggle-slider {
  background: linear-gradient(135deg, #0b4582, #7c3aed);
}

.rpt-toggle-switch input:checked + .rpt-toggle-slider::before {
  transform: translateX(20px);
}

/* Error / Success */
.rpt-modal-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
  margin-top: 16px;
}

.rpt-modal-error-icon { font-size: 16px; display: flex; }

.rpt-modal-success {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 12px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  margin-top: 16px;
}

.rpt-modal-success-icon {
  font-size: 24px;
  color: #059669;
  display: flex;
  flex-shrink: 0;
}

.rpt-modal-success strong {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #059669;
}

.rpt-modal-success span {
  display: block;
  font-size: 11.5px;
  color: #64748b;
  margin-top: 1px;
}

.rpt-modal-success div { flex: 1; }

.rpt-download-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #059669;
  color: white;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all 0.2s;
  flex-shrink: 0;
}

.rpt-download-btn:hover {
  background: #047857;
  transform: translateY(-1px);
}

/* Footer */
.rpt-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 18px 28px 22px;
  border-top: 1px solid #e8ecf1;
}

.rpt-btn-cancel {
  padding: 10px 22px;
  border: 1.5px solid #e8ecf1;
  border-radius: 10px;
  background: white;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.rpt-btn-cancel:hover {
  background: #f8fafc;
  color: #0f172a;
}

.rpt-btn-generate {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #0b4582, #1e6fd0);
  font-size: 13px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.rpt-btn-generate:hover:not(:disabled) {
  box-shadow: 0 4px 14px rgba(11, 69, 130, 0.3);
  transform: translateY(-1px);
}

.rpt-btn-generate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.rpt-btn-icon { font-size: 16px; display: flex; }
.rpt-btn-icon.spin { animation: rptSpin 1s linear infinite; }
@keyframes rptSpin { to { transform: rotate(360deg); } }
</style>
