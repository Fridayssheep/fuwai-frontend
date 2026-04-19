<template>
  <Teleport to="body">
    <div v-if="visible" class="overlay" @click.self="close">
      <div class="modal">
        <div class="header">
          <div>
            <h3>{{ titleText }}</h3>
            <p>{{ contextSummary }}</p>
          </div>
          <button class="icon-btn" type="button" @click="close">
            <Icon icon="lucide:x" />
          </button>
        </div>

        <div class="body">
          <div class="grid">
            <label>
              <span>报表类型</span>
              <select v-model="form.report_type" @change="handleReportTypeChange">
                <option v-for="item in reportTypeOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </option>
              </select>
            </label>

            <label>
              <span>所属建筑</span>
              <input :value="context?.buildingId || '-'" disabled />
            </label>

            <label>
              <span>{{ context?.sourceType === 'meter' ? '设备' : '对象' }}</span>
              <input :value="context?.sourceLabel || '-'" disabled />
            </label>

            <label>
              <span>开始时间</span>
              <input v-model="form.start" type="datetime-local" @input="handleManualTimeChange" />
            </label>

            <label>
              <span>结束时间</span>
              <input v-model="form.end" type="datetime-local" @input="handleManualTimeChange" />
            </label>
          </div>

          <div class="toggle-row">
            <div>
              <strong>生成时附带 AI 摘要</strong>
              <small>提交后会立即进入报表工作台，AI 摘要会在后台生成完成后展示。</small>
            </div>
            <label class="toggle-switch">
              <input v-model="form.includeAI" type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div v-if="notice" class="notice" :class="notice.type">
            <Icon :icon="notice.type === 'ok' ? 'lucide:check-circle-2' : 'lucide:alert-circle'" />
            <span>{{ notice.text }}</span>
          </div>
        </div>

        <div class="footer">
          <button class="secondary" type="button" :disabled="submitting" @click="close">取消</button>
          <button class="primary" type="button" :disabled="submitting || !context" @click="submit">
            <Icon :icon="submitting ? 'lucide:loader-2' : 'lucide:file-output'" :class="{ spin: submitting }" />
            {{ submitting ? '生成中...' : '生成报表' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { generateReport, type GenerateReportRequest } from '../../api/statistics'
import type { ReportSourceContext } from './reportWorkbenchTypes'

type ReportType = GenerateReportRequest['report_type']

const reportTypeOptions: { value: ReportType; label: string }[] = [
  { value: 'daily_summary', label: '日报' },
  { value: 'weekly_summary', label: '周报' },
  { value: 'monthly_summary', label: '月报' },
  { value: 'custom_summary', label: '自定义报表' },
  { value: 'anomaly_report', label: '异常分析报告' }
]

const props = defineProps<{
  visible: boolean
  context: ReportSourceContext | null
  startTime: string
  endTime: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'generated', payload: { reportId: string; context: ReportSourceContext }): void
}>()

const submitting = ref(false)
const notice = ref<{ type: 'ok' | 'err'; text: string } | null>(null)
const form = ref({
  report_type: 'daily_summary' as ReportType,
  start: '',
  end: '',
  includeAI: true
})

const titleText = computed(() => props.context?.sourceType === 'meter' ? '生成设备报表' : '生成建筑报表')

const contextSummary = computed(() => {
  if (!props.context) return '请选择建筑或设备后再生成报表。'
  return props.context.sourceType === 'meter'
    ? `设备 ${props.context.sourceLabel}，所属建筑 ${props.context.buildingId}`
    : `建筑 ${props.context.buildingId}`
})

const close = () => {
  emit('update:visible', false)
}

const formatDateTimeLocal = (value?: string) => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const normalizeToISOString = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

const getAnchorDate = () => {
  const end = props.endTime ? new Date(props.endTime) : new Date()
  if (!Number.isNaN(end.getTime())) return end
  const start = props.startTime ? new Date(props.startTime) : new Date()
  return Number.isNaN(start.getTime()) ? new Date() : start
}

const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)

const getPresetRange = (reportType: ReportType) => {
  const anchor = getAnchorDate()
  if (reportType === 'daily_summary') {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 0, 0, 0)
    return { start, end: endOfDay(anchor) }
  }
  if (reportType === 'weekly_summary') {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - 6, 0, 0, 0)
    return { start, end: endOfDay(anchor) }
  }
  if (reportType === 'monthly_summary') {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0)
    return { start, end: endOfDay(anchor) }
  }
  return null
}

const applyPresetRange = (reportType: ReportType) => {
  const range = getPresetRange(reportType)
  if (!range) return
  form.value.start = formatDateTimeLocal(range.start.toISOString())
  form.value.end = formatDateTimeLocal(range.end.toISOString())
}

const handleReportTypeChange = () => {
  if (form.value.report_type === 'anomaly_report' || form.value.report_type === 'custom_summary') return
  applyPresetRange(form.value.report_type)
}

const handleManualTimeChange = () => {
  if (form.value.report_type !== 'anomaly_report') {
    form.value.report_type = 'custom_summary'
  }
}

const resetForm = () => {
  form.value = {
    report_type: 'daily_summary',
    start: '',
    end: '',
    includeAI: true
  }
  applyPresetRange('daily_summary')
  notice.value = null
}

const submit = async () => {
  if (!props.context) return

  const start = normalizeToISOString(form.value.start)
  const end = normalizeToISOString(form.value.end)

  if (!start || !end) {
    notice.value = { type: 'err', text: '请完整填写时间范围。' }
    return
  }

  if (new Date(start).getTime() >= new Date(end).getTime()) {
    notice.value = { type: 'err', text: '结束时间必须晚于开始时间。' }
    return
  }

  submitting.value = true
  notice.value = null

  try {
    const response = await generateReport({
      report_type: form.value.report_type,
      building_id: props.context.buildingId,
      time_range: { start, end },
      include_ai_summary: form.value.includeAI
    })

    const data = (response as any)?.data ?? response
    const reportId = data?.report_id

    if (!reportId) {
      throw new Error('生成报表失败：未返回 report_id')
    }

    notice.value = { type: 'ok', text: '报表任务已创建，正在后台生成。' }
    emit('generated', {
      reportId,
      context: {
        ...props.context,
        reportId
      }
    })
    emit('update:visible', false)
  } catch (error: any) {
    notice.value = { type: 'err', text: error?.message || '报表生成失败，请稍后重试。' }
  } finally {
    submitting.value = false
  }
}

watch(() => [props.visible, props.context, props.startTime, props.endTime], resetForm, { immediate: true })
</script>

<style scoped>
.overlay{position:fixed;inset:0;background:rgba(15,23,42,.38);display:flex;align-items:center;justify-content:center;padding:24px;z-index:10000}
.modal{width:min(720px,100%);background:#fff;border:1px solid #dbe5f0;border-radius:18px;box-shadow:0 24px 60px rgba(15,23,42,.18);display:flex;flex-direction:column}
.header,.footer{display:flex;align-items:center;justify-content:space-between;padding:18px 20px}
.header{border-bottom:1px solid #e8ecf1;gap:12px}
.header h3{margin:0;font-size:18px;color:#0f172a}
.header p{margin:6px 0 0;font-size:12px;color:#64748b}
.body{padding:20px;display:flex;flex-direction:column;gap:16px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
label{display:flex;flex-direction:column;gap:6px}
label span{font-size:12px;font-weight:700;color:#475569}
input,select{min-height:42px;border:1px solid #cbd5e1;border-radius:10px;padding:0 12px;font-size:13px;background:#fff;outline:none}
input:focus,select:focus{border-color:#0b4582;box-shadow:0 0 0 3px rgba(11,69,130,.08)}
input:disabled{background:#f8fafc;color:#64748b}
.toggle-row{padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;gap:12px}
.toggle-row strong{display:block;font-size:13px;color:#0f172a}
.toggle-row small{display:block;margin-top:4px;font-size:12px;color:#64748b;line-height:1.6}
.toggle-switch{position:relative;width:44px;height:24px;flex-shrink:0}
.toggle-switch input{opacity:0;width:0;height:0;min-height:0;padding:0}
.toggle-slider{position:absolute;inset:0;background:#cbd5e1;border-radius:999px;cursor:pointer;transition:all .2s ease}
.toggle-slider::before{content:'';position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:all .2s ease}
.toggle-switch input:checked + .toggle-slider{background:#0b4582}
.toggle-switch input:checked + .toggle-slider::before{transform:translateX(20px)}
.notice{display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:12px;font-size:12px;font-weight:600}
.notice.ok{background:#ecfdf5;color:#059669}
.notice.err{background:#fef2f2;color:#dc2626}
.icon-btn,.primary,.secondary{border:none;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.icon-btn{width:34px;height:34px;background:transparent;color:#64748b}
.icon-btn:hover{background:#eef2f7}
.primary,.secondary{min-height:40px;padding:0 16px;font:700 13px inherit;gap:6px}
.primary{background:linear-gradient(135deg,#0b4582,#1565c0);color:#fff}
.secondary{background:#eef2f7;color:#334155}
.primary:disabled,.secondary:disabled,.icon-btn:disabled{opacity:.6;cursor:not-allowed}
.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media (max-width:640px){
  .overlay{padding:12px}
  .grid{grid-template-columns:1fr}
  .header,.footer,.body{padding:16px}
}
</style>
