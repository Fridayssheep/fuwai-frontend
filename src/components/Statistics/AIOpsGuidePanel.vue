<template>
  <Teleport to="body">
    <Transition name="slide">
      <div v-if="visible" class="mask" @click.self="close">
        <aside class="panel">
          <header class="head">
            <div>
              <h2>AI 运维指导</h2>
              <span>{{ buildingId }}</span>
            </div>
            <div class="head-actions">
              <button class="icon-btn" :class="{ active: reportOpen }" @click="reportOpen = !reportOpen">
                <Icon icon="lucide:file-output" />
              </button>
              <button class="icon-btn" :disabled="opsLoading" @click="startAnalysis">
                <Icon icon="lucide:refresh-cw" :class="{ spin: opsLoading }" />
              </button>
              <button class="icon-btn danger" @click="close">
                <Icon icon="lucide:x" />
              </button>
            </div>
          </header>

          <div class="body">
            <section class="card">
              <div class="section-top">
                <div>
                  <h3>报表导出</h3>
                  <p>创建报表时通过 `include_ai_summary` 明确是否包含 AI 分析摘要，已有报表分析走 `/ai/report-summary`。</p>
                </div>
                <button class="icon-btn" @click="reportOpen = !reportOpen">
                  <Icon :icon="reportOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'" />
                </button>
              </div>

              <div v-if="reportOpen" class="stack">
                <div class="grid">
                  <label>
                    <span>报表类型</span>
                    <select v-model="form.report_type">
                      <option v-for="item in reportTypeOptions" :key="item.value" :value="item.value">
                        {{ item.label }}
                      </option>
                    </select>
                  </label>

                  <label>
                    <span>建筑 ID</span>
                    <input :value="buildingId" disabled />
                  </label>

                  <label>
                    <span>开始时间</span>
                    <input v-model="form.start" type="datetime-local" />
                  </label>

                  <label>
                    <span>结束时间</span>
                    <input v-model="form.end" type="datetime-local" />
                  </label>
                </div>

                <div class="toggle-row">
                  <div class="ai-toggle-info">
                    <Icon icon="lucide:sparkles" class="ai-toggle-icon" />
                    <div>
                      <strong>包含 AI 分析摘要</strong>
                      <small>在报表中自动生成 AI 数据洞察与建议，传参字段：`include_ai_summary`</small>
                    </div>
                  </div>
                  <label class="toggle-switch">
                    <input v-model="form.includeAI" type="checkbox" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>

                <div v-if="reportError" class="msg err">
                  <Icon icon="lucide:alert-circle" />
                  {{ reportError }}
                </div>

                <div v-if="reportSuccess" class="msg ok">
                  <Icon icon="lucide:check-circle-2" />
                  {{ reportSuccess }}
                </div>

                <div v-if="reportDetail" class="result stack-sm">
                  <div class="kv">
                    <span>任务状态</span>
                    <strong>{{ reportDetail.status }}</strong>
                  </div>
                  <div class="kv">
                    <span>报表 ID</span>
                    <strong>{{ reportDetail.report_id }}</strong>
                  </div>
                  <div class="actions">
                    <button class="primary" :disabled="reportDetail.status !== 'ready'" @click="downloadReportFile">
                      <Icon icon="lucide:download" />
                      下载 Markdown
                    </button>
                    <button class="secondary" :disabled="summarizing || !reportDetail.report_id" @click="analyzeReport">
                      <Icon :icon="summarizing ? 'lucide:loader-2' : 'lucide:sparkles'" :class="{ spin: summarizing }" />
                      {{ summarizing ? '分析中...' : 'AI 分析已有报表' }}
                    </button>
                  </div>
                </div>

                <div v-if="reportSummary" class="summary-box">
                  <div class="title">
                    <Icon icon="lucide:sparkles" />
                    AI 分析摘要
                  </div>
                  <p>{{ reportSummary }}</p>
                </div>

                <div class="actions">
                  <button class="secondary" :disabled="generating" @click="resetReportForm">重置参数</button>
                  <button class="primary" :disabled="generating" @click="generate">
                    <Icon :icon="generating ? 'lucide:loader-2' : 'lucide:file-output'" :class="{ spin: generating }" />
                    {{ generating ? '生成中...' : '生成并导出报表' }}
                  </button>
                </div>
              </div>
            </section>

            <div v-if="opsLoading" class="card center">
              <Icon icon="lucide:loader-2" class="spin big" />
              <p>{{ opsProgressMsg || 'AI 正在分析运维数据，请稍候...' }}</p>
              <button class="secondary" @click="cancelOpsGuide">取消分析</button>
            </div>

            <div v-else-if="opsError" class="card err-block">
              <Icon icon="lucide:alert-circle" />
              <span>{{ opsError }}</span>
              <button class="secondary" @click="startAnalysis">重试</button>
            </div>

            <div v-else-if="opsResult" class="stack">
              <section class="card">
                <p class="lead">{{ opsResult.summary }}</p>
              </section>

              <section v-if="opsResult.preconditions?.length" class="card">
                <h4>前置条件</h4>
                <ul>
                  <li v-for="(item, index) in opsResult.preconditions" :key="index">{{ item }}</li>
                </ul>
              </section>

              <section v-if="opsResult.steps?.length" class="card">
                <h4>运维步骤</h4>
                <div class="stack-sm">
                  <div v-for="(step, index) in opsResult.steps" :key="step.step_id" class="step">
                    <div class="step-head">
                      <span class="badge">{{ index + 1 }}</span>
                      <strong>{{ step.title }}</strong>
                      <em>{{ step.priority }}</em>
                    </div>
                    <p>{{ step.instruction }}</p>
                    <small>预期结果：{{ step.expected_result }}</small>
                    <small>未达标处理：{{ step.if_not_met }}</small>
                  </div>
                </div>
              </section>

              <section v-if="opsResult.risk_notice?.length" class="card">
                <h4>风险提示</h4>
                <ul class="risk">
                  <li v-for="(item, index) in opsResult.risk_notice" :key="index">{{ item }}</li>
                </ul>
              </section>

              <section v-if="opsResult.actions?.length" class="card">
                <h4>建议操作</h4>
                <div class="actions">
                  <button v-for="(action, index) in opsResult.actions" :key="index" class="primary small">
                    <Icon icon="lucide:arrow-right" />
                    {{ action.label }}
                  </button>
                </div>
              </section>

              <section v-if="opsResult.evidence?.length" class="card">
                <h4>相关依据</h4>
                <div class="stack-sm">
                  <div v-for="(item, index) in opsResult.evidence" :key="index" class="evidence">
                    <div>
                      <strong>{{ item.source }}</strong>
                      <em>{{ item.source_type }}</em>
                    </div>
                    <p>{{ item.snippet }}</p>
                  </div>
                </div>
              </section>

              <section v-if="opsResult.applicability" class="card">
                <h4>适用范围</h4>
                <div class="stack-sm">
                  <div v-if="opsResult.applicability.applies_to?.length" class="tags">
                    <strong>适用</strong>
                    <span v-for="(item, index) in opsResult.applicability.applies_to" :key="index">{{ item }}</span>
                  </div>
                  <div v-if="opsResult.applicability.not_applies_to?.length" class="tags">
                    <strong>不适用</strong>
                    <span v-for="(item, index) in opsResult.applicability.not_applies_to" :key="index" class="bad">{{ item }}</span>
                  </div>
                </div>
              </section>

              <section class="meta">
                <span><Icon icon="lucide:cpu" />{{ opsResult.meta?.model || '-' }}</span>
                <span><Icon icon="lucide:clock" />{{ formatGeneratedAt(opsResult.meta?.generated_at) }}</span>
                <span v-if="opsResult.meta?.knowledge_hits != null"><Icon icon="lucide:book-open" />知识命中 {{ opsResult.meta.knowledge_hits }}</span>
                <span v-if="opsResult.meta?.history_feedback_hits != null"><Icon icon="lucide:history" />历史反馈 {{ opsResult.meta.history_feedback_hits }}</span>
              </section>
            </div>

            <div v-else class="card center">
              <Icon icon="lucide:brain-circuit" class="big" />
              <h3>AI 运维分析</h3>
              <p>点击按钮后，AI 会基于当前建筑数据生成运维指导方案。</p>
              <button class="primary" @click="startAnalysis">
                <Icon icon="lucide:sparkles" />
                开始分析
              </button>
            </div>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { connectOpsGuideStream, type OpsGuideResponse, type OpsGuideSSEEvent } from '../../api/anomaly'
import { generateReport, getReportDetail, summarizeReport, type GenerateReportRequest, type ReportDetailResponse } from '../../api/statistics'

type ReportType = GenerateReportRequest['report_type']

const reportTypeOptions: { value: ReportType; label: string }[] = [
  { value: 'daily_summary', label: '日报' },
  { value: 'weekly_summary', label: '周报' },
  { value: 'monthly_summary', label: '月报' },
  { value: 'anomaly_report', label: '异常分析报告' }
]

const props = defineProps<{ visible: boolean; buildingId: string; selectedDay: string }>()
const emit = defineEmits<{ (e: 'update:visible', val: boolean): void }>()

const opsLoading = ref(false)
const opsError = ref('')
const opsResult = ref<OpsGuideResponse | null>(null)
const opsProgressMsg = ref('')
const opsAbortController = ref<AbortController | null>(null)

const reportOpen = ref(true)
const generating = ref(false)
const summarizing = ref(false)
const reportError = ref('')
const reportSuccess = ref('')
const reportSummary = ref('')
const reportDetail = ref<ReportDetailResponse | null>(null)
const form = ref({ report_type: 'daily_summary' as ReportType, start: '', end: '', includeAI: true })

const unwrap = <T>(payload: T | { data?: T }) => ((payload as { data?: T })?.data ?? payload) as T

const close = () => emit('update:visible', false)

const formatDateTimeLocal = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}T${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`

const normalizeToISOString = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

const formatGeneratedAt = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN')
}

const resetReportForm = () => {
  const end = props.selectedDay ? new Date(`${props.selectedDay}T23:59`) : new Date()
  const start = props.selectedDay ? new Date(`${props.selectedDay}T00:00`) : new Date(end)
  if (!props.selectedDay) start.setHours(0, 0, 0, 0)

  form.value = {
    report_type: 'daily_summary',
    start: formatDateTimeLocal(start),
    end: formatDateTimeLocal(end),
    includeAI: true
  }

  reportError.value = ''
  reportSuccess.value = ''
  reportSummary.value = ''
  reportDetail.value = null
}

const handleOpsSSEEvent = (event: OpsGuideSSEEvent) => {
  const { event: type, data } = event

  switch (type) {
    case 'status':
    case 'progress':
      opsProgressMsg.value = data?.message || data?.status || JSON.stringify(data)
      break
    case 'summary':
      if (!opsResult.value) {
        opsResult.value = {
          incident_id: '',
          status: 'streaming',
          summary: data?.summary || data || '',
          steps: [],
          meta: { generated_at: new Date().toISOString(), model: '' }
        }
      } else {
        opsResult.value.summary = data?.summary || data || ''
      }
      break
    case 'preconditions':
      if (opsResult.value) opsResult.value.preconditions = Array.isArray(data) ? data : data?.preconditions || []
      break
    case 'step':
      if (opsResult.value) {
        const step = data?.step || data
        if (step) {
          const index = opsResult.value.steps.findIndex(item => item.step_id === step.step_id)
          if (index >= 0) opsResult.value.steps[index] = step
          else opsResult.value.steps.push(step)
        }
      }
      break
    case 'evidence':
      if (opsResult.value) opsResult.value.evidence = Array.isArray(data) ? data : data?.evidence || []
      break
    case 'actions':
      if (opsResult.value) opsResult.value.actions = Array.isArray(data) ? data : data?.actions || []
      break
    case 'risk_notice':
      if (opsResult.value) opsResult.value.risk_notice = Array.isArray(data) ? data : data?.risk_notice || []
      break
    case 'applicability':
      if (opsResult.value) opsResult.value.applicability = data?.applicability || data
      break
    case 'diagnosis_snapshot':
      if (opsResult.value) opsResult.value.diagnosis_snapshot = data?.diagnosis_snapshot || data
      break
    case 'meta':
      if (opsResult.value) opsResult.value.meta = data?.meta || data
      break
    case 'complete':
    case 'done':
      opsLoading.value = false
      if (data && typeof data === 'object' && data.steps) opsResult.value = data
      opsProgressMsg.value = ''
      break
    case 'error':
      opsLoading.value = false
      opsError.value = data?.message || data?.detail || 'AI 运维分析出错'
      opsProgressMsg.value = ''
      break
    default:
      if (data && typeof data === 'object' && data.steps) {
        opsResult.value = data
        opsLoading.value = false
        opsProgressMsg.value = ''
      }
  }
}

const startAnalysis = () => {
  if (!props.buildingId) return

  opsLoading.value = true
  opsError.value = ''
  opsResult.value = null
  opsProgressMsg.value = '正在连接 AI 服务...'

  const controller = connectOpsGuideStream(
    {
      question: `建筑 ${props.buildingId} 的运维分析`,
      guide_mode: 'standard_sop',
      context: {
        building_id: props.buildingId,
        meter: 'electricity',
        time_range: {
          start: props.selectedDay ? `${props.selectedDay}T00:00:00Z` : new Date(Date.now() - 7 * 86400000).toISOString(),
          end: props.selectedDay ? `${props.selectedDay}T23:59:59Z` : new Date().toISOString()
        },
        page_context: {
          source: 'building_details_modal',
          page_type: 'statistics'
        }
      },
      include_knowledge: true,
      include_history: true,
      include_actions: true
    },
    handleOpsSSEEvent,
    (error: Error) => {
      opsLoading.value = false
      opsAbortController.value = null
      opsError.value = error.message || 'AI 运维分析请求失败'
    },
    (fullResult: OpsGuideResponse | null) => {
      opsLoading.value = false
      opsAbortController.value = null
      if (fullResult) opsResult.value = fullResult
    }
  )

  opsAbortController.value = controller
}

const generate = async () => {
  const start = normalizeToISOString(form.value.start)
  const end = normalizeToISOString(form.value.end)

  if (!start || !end) {
    reportError.value = '请完整填写时间范围'
    return
  }

  if (new Date(start).getTime() >= new Date(end).getTime()) {
    reportError.value = '结束时间必须晚于开始时间'
    return
  }

  generating.value = true
  reportError.value = ''
  reportSuccess.value = ''
  reportSummary.value = ''
  reportDetail.value = null

  try {
    const created = unwrap(
      await generateReport({
        report_type: form.value.report_type,
        building_id: props.buildingId || undefined,
        time_range: { start, end },
        include_ai_summary: form.value.includeAI
      })
    )

    if (!created?.report_id) {
      throw new Error('创建报表任务失败，未返回 report_id')
    }

    let detail: ReportDetailResponse | null = null

    for (let i = 0; i < 12; i += 1) {
      detail = unwrap(await getReportDetail(created.report_id))
      if (detail?.status === 'ready' || detail?.status === 'failed') break
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    if (!detail) {
      throw new Error('未获取到报表详情')
    }

    reportDetail.value = detail
    reportSummary.value = detail.ai_summary || ''
    reportSuccess.value = detail.status === 'ready' ? '报表已生成，可直接下载。' : '报表任务已创建，仍在处理中，请稍后下载。'

    if (detail.status === 'failed') {
      reportError.value = '报表生成失败，请稍后重试'
    }
  } catch (error: any) {
    reportError.value = error?.message || '报表生成请求失败'
  } finally {
    generating.value = false
  }
}

const downloadReportFile = () => {
  const reportId = reportDetail.value?.report_id
  if (reportId) window.open(`/api/reports/${reportId}?download=true&format=md`, '_blank')
}

const analyzeReport = async () => {
  const reportId = reportDetail.value?.report_id
  if (!reportId) return

  summarizing.value = true
  reportError.value = ''

  try {
    const response = unwrap(await summarizeReport({ report_id: reportId }))
    reportSummary.value = response?.summary || response?.ai_summary || 'AI 已完成报表分析，但未返回可展示的摘要。'
    reportSuccess.value = 'AI 报表分析完成。'
  } catch (error: any) {
    reportError.value = error?.message || 'AI 报表分析失败'
  } finally {
    summarizing.value = false
  }
}

const cancelOpsGuide = () => {
  if (opsAbortController.value) {
    opsAbortController.value.abort()
    opsAbortController.value = null
  }
  opsLoading.value = false
  opsProgressMsg.value = ''
}

watch(() => props.selectedDay, resetReportForm, { immediate: true })
watch(() => props.visible, visible => {
  if (visible) {
    resetReportForm()
    if (!opsResult.value && !opsLoading.value) startAnalysis()
  }
})

onUnmounted(cancelOpsGuide)
</script>

<style scoped>
.mask{position:fixed;inset:0;background:rgba(15,23,42,.35);backdrop-filter:blur(3px);z-index:10000;display:flex;justify-content:flex-end}
.panel{width:560px;max-width:92vw;height:100vh;background:#f3f6fb;display:flex;flex-direction:column;box-shadow:-10px 0 40px rgba(15,23,42,.18);font-family:'Plus Jakarta Sans',-apple-system,'PingFang SC',sans-serif}
.head{background:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #dbe5f0}
.head h2{margin:0;font-size:17px;color:#0f172a}
.head span{font-size:12px;color:#64748b}
.head-actions,.actions,.stack,.stack-sm{display:flex}
.head-actions,.actions{gap:8px;flex-wrap:wrap}
.stack,.stack-sm{flex-direction:column}
.stack{gap:16px}
.stack-sm{gap:10px}
.body{flex:1;overflow:auto;padding:20px;display:flex;flex-direction:column;gap:16px}
.card,.meta{background:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(15,23,42,.06)}
.card{padding:16px}
.meta{padding:12px 16px;display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:#94a3b8}
.meta span,.title,.kv,.step-head,.tags,.err-block,.center,.msg{display:flex;align-items:center}
.icon-btn{width:34px;height:34px;border:none;border-radius:8px;background:transparent;color:#64748b;cursor:pointer}
.icon-btn:hover,.icon-btn.active{background:#e8f0fb;color:#0b4582}
.icon-btn.danger:hover{background:#fef2f2;color:#dc2626}
.icon-btn:disabled{opacity:.5;cursor:not-allowed}
.section-top,.kv{justify-content:space-between}
.section-top{display:flex;gap:12px}
.section-top h3,h4{margin:0;color:#0f172a}
.section-top p,.card p,small,ul{color:#475569}
.section-top p,.lead,.card p,small{line-height:1.7}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
label{display:flex;flex-direction:column;gap:6px}
label span{font-size:12px;font-weight:700;color:#475569}
input,select{min-height:42px;border:1px solid #cbd5e1;border-radius:10px;padding:0 12px;font-size:13px;outline:none}
input:focus,select:focus{border-color:#0b4582;box-shadow:0 0 0 3px rgba(11,69,130,.08)}
input:disabled{background:#f8fafc;color:#64748b}
.toggle-row{padding:16px 18px;border:1.5px solid #e8ecf1;border-radius:12px;background:#fff;display:flex;justify-content:space-between;align-items:center;gap:12px}
.toggle-row:has(input:checked){border-color:#c7d2fe;background:#fafbff}
.ai-toggle-info{display:flex;align-items:center;gap:12px}
.ai-toggle-icon{font-size:20px;color:#7c3aed;display:flex}
.toggle-row strong{display:block;font-size:13px;color:#0f172a}
.toggle-row small{display:block;margin-top:1px;font-size:11.5px;color:#94a3b8;font-weight:500;line-height:1.5}
.toggle-switch{position:relative;width:44px;height:24px;flex-shrink:0}
.toggle-switch input{opacity:0;width:0;height:0}
.toggle-slider{position:absolute;cursor:pointer;inset:0;background:#cbd5e1;border-radius:24px;transition:all .25s ease}
.toggle-slider::before{content:'';position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:all .25s ease;box-shadow:0 1px 3px rgba(0,0,0,.15)}
.toggle-switch input:checked + .toggle-slider{background:linear-gradient(135deg,#0b4582,#7c3aed)}
.toggle-switch input:checked + .toggle-slider::before{transform:translateX(20px)}
.msg{gap:8px;padding:12px 14px;border-radius:12px;font-size:12px;font-weight:600}
.err{background:#fef2f2;color:#dc2626}
.ok{background:#ecfdf5;color:#059669}
.result,.summary-box,.step,.evidence{border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#fff}
.summary-box{background:linear-gradient(135deg,#eff6ff,#f8fafc);border-color:#dbeafe}
.title{gap:6px;font-weight:800;color:#0b4582}
.primary,.secondary{min-height:40px;padding:0 16px;border:none;border-radius:10px;cursor:pointer;font:700 13px inherit;display:inline-flex;align-items:center;gap:6px}
.primary{background:linear-gradient(135deg,#0b4582,#1565c0);color:#fff}
.secondary{background:#eef2f7;color:#334155;border:1px solid #dbe5f0}
.small{min-height:34px;padding:0 14px;font-size:12px}
.primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 20px rgba(11,69,130,.22)}
.secondary:hover:not(:disabled){background:#e2e8f0}
.primary:disabled,.secondary:disabled{opacity:.6;cursor:not-allowed}
.center{display:flex;flex-direction:column;justify-content:center;text-align:center;gap:12px}
.big{font-size:30px;color:#0b4582}
.lead{margin:0;color:#1e3a5f;font-size:14px}
.step-head{gap:10px}
.badge{width:24px;height:24px;border-radius:999px;background:#0b4582;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800}
em{font-style:normal;font-size:11px;padding:3px 8px;border-radius:999px;background:#eff6ff;color:#0b4582}
.risk li{color:#dc2626}
.evidence div{display:flex;gap:8px;align-items:center}
.evidence em{background:#e0e7ff;color:#3730a3}
.tags{gap:8px;flex-wrap:wrap}
.tags span{padding:4px 8px;border-radius:999px;background:#ecfdf5;color:#059669;font-size:11px;font-weight:700}
.tags span.bad{background:#fef2f2;color:#dc2626}
.err-block{gap:8px;color:#dc2626}
.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.slide-enter-active,.slide-leave-active{transition:opacity .24s ease}
.slide-enter-active .panel,.slide-leave-active .panel{transition:transform .28s ease}
.slide-enter-from,.slide-leave-to{opacity:0}
.slide-enter-from .panel,.slide-leave-to .panel{transform:translateX(100%)}
@media (max-width:640px){.panel{width:100vw;max-width:100vw}.body{padding:14px}.grid{grid-template-columns:1fr}}
</style>
