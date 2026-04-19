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
                  <h3>报表工作台</h3>
                  <p>创建报表时可选择是否附带 AI 摘要。已有报表支持查看详情、下载文件，并继续向 AI 追问。</p>
                </div>
                <button class="icon-btn" @click="reportOpen = !reportOpen">
                  <Icon :icon="reportOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'" />
                </button>
              </div>

              <div v-if="reportOpen" class="stack">
                <section class="subcard stack-sm">
                  <div class="subhead">
                    <strong>1. 创建报表</strong>
                    <span>{{ buildingId }}</span>
                  </div>

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
                        <small>创建报表时直接请求 AI 总结，后续仍可继续追问报表内容。</small>
                      </div>
                    </div>
                    <label class="toggle-switch">
                      <input v-model="form.includeAI" type="checkbox" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>

                  <div v-if="reportNotice" class="msg" :class="reportNotice.type">
                    <Icon :icon="reportNotice.type === 'ok' ? 'lucide:check-circle-2' : 'lucide:alert-circle'" />
                    {{ reportNotice.text }}
                  </div>

                  <div class="actions">
                    <button class="secondary" :disabled="generating" @click="resetReportForm">重置参数</button>
                    <button class="primary" :disabled="generating" @click="generate">
                      <Icon :icon="generating ? 'lucide:loader-2' : 'lucide:file-output'" :class="{ spin: generating }" />
                      {{ generating ? '生成中...' : '生成报表' }}
                    </button>
                  </div>
                </section>

                <section class="subcard stack-sm">
                  <div class="subhead">
                    <strong>2. 已有报表</strong>
                    <button class="secondary small" :disabled="reportListLoading" @click="refreshReports">
                      <Icon :icon="reportListLoading ? 'lucide:loader-2' : 'lucide:refresh-cw'" :class="{ spin: reportListLoading }" />
                      刷新
                    </button>
                  </div>

                  <div class="filters">
                    <label>
                      <span>类型</span>
                      <select v-model="reportFilters.report_type" @change="applyFilters">
                        <option value="">全部</option>
                        <option v-for="item in reportTypeOptions" :key="item.value" :value="item.value">
                          {{ item.label }}
                        </option>
                      </select>
                    </label>

                    <label>
                      <span>状态</span>
                      <select v-model="reportFilters.status" @change="applyFilters">
                        <option value="">全部</option>
                        <option v-for="item in reportStatusOptions" :key="item.value" :value="item.value">
                          {{ item.label }}
                        </option>
                      </select>
                    </label>

                    <label>
                      <span>每页数量</span>
                      <select v-model.number="reportFilters.page_size" @change="applyFilters">
                        <option :value="5">5</option>
                        <option :value="10">10</option>
                        <option :value="20">20</option>
                      </select>
                    </label>
                  </div>

                  <div v-if="reportListError" class="msg err">
                    <Icon icon="lucide:alert-circle" />
                    {{ reportListError }}
                  </div>

                  <div v-if="reportListLoading" class="mini-state">
                    <Icon icon="lucide:loader-2" class="spin" />
                    <span>正在加载报表列表...</span>
                  </div>

                  <div v-else-if="!reportList.length" class="empty-state">
                    <Icon icon="lucide:file-search" />
                    <span>当前筛选条件下暂无报表。</span>
                  </div>

                  <div v-else class="report-list">
                    <button
                      v-for="item in reportList"
                      :key="item.report_id"
                      class="report-item"
                      :class="{ active: item.report_id === selectedReportId }"
                      @click="selectReport(item.report_id)"
                    >
                      <div class="report-item-head">
                        <strong>{{ getReportTypeLabel(item.report_type) }}</strong>
                        <span class="status-pill" :class="item.status">{{ getReportStatusLabel(item.status) }}</span>
                      </div>
                      <small>{{ formatTimeRange(item.time_range) }}</small>
                      <small>生成时间：{{ formatGeneratedAt(item.generated_at) }}</small>
                      <small>AI 摘要：{{ item.include_ai_summary ? (item.ai_summary_applied ? '已执行' : `已请求${item.ai_summary_skipped_reason ? `，未执行：${item.ai_summary_skipped_reason}` : ''}`) : '未请求' }}</small>
                      <small v-if="item.summary">{{ item.summary }}</small>
                      <small v-if="item.error_message" class="danger-text">失败原因：{{ item.error_message }}</small>
                    </button>
                  </div>

                  <div class="pager">
                    <button class="secondary small" :disabled="reportFilters.page <= 1 || reportListLoading" @click="changePage(-1)">上一页</button>
                    <span>第 {{ reportPagination.page }} / {{ totalPages }} 页</span>
                    <button class="secondary small" :disabled="reportPagination.page >= totalPages || reportListLoading" @click="changePage(1)">下一页</button>
                  </div>
                </section>

                <section class="subcard stack-sm">
                  <div class="subhead">
                    <strong>3. 报表详情</strong>
                    <div class="actions">
                      <button class="secondary small" :disabled="!selectedReportId || reportDetailLoading" @click="reloadSelectedReport">
                        <Icon :icon="reportDetailLoading ? 'lucide:loader-2' : 'lucide:refresh-cw'" :class="{ spin: reportDetailLoading }" />
                        刷新详情
                      </button>
                      <button class="secondary small" :disabled="!selectedReportId || reportDetailLoading" @click="viewReportFile">
                        <Icon icon="lucide:external-link" />
                        查看报表
                      </button>
                      <button class="primary small" :disabled="!selectedReportId" @click="downloadReportFile">
                        <Icon icon="lucide:download" />
                        下载 Markdown
                      </button>
                      <button class="secondary small danger-btn" :disabled="!selectedReportId || deletingReport" @click="removeSelectedReport">
                        <Icon :icon="deletingReport ? 'lucide:loader-2' : 'lucide:trash-2'" :class="{ spin: deletingReport }" />
                        {{ deletingReport ? '删除中...' : '删除报表' }}
                      </button>
                    </div>
                  </div>

                  <div v-if="reportDetailError" class="msg err">
                    <Icon icon="lucide:alert-circle" />
                    {{ reportDetailError }}
                  </div>

                  <div v-if="reportDetailLoading" class="mini-state">
                    <Icon icon="lucide:loader-2" class="spin" />
                    <span>正在加载报表详情...</span>
                  </div>

                  <div v-else-if="reportDetail" class="stack-sm">
                    <div class="detail-grid">
                      <div class="detail-item">
                        <span>报表 ID</span>
                        <strong>{{ reportDetail.report_id }}</strong>
                      </div>
                      <div class="detail-item">
                        <span>状态</span>
                        <strong>{{ getReportStatusLabel(reportDetail.status) }}</strong>
                      </div>
                      <div class="detail-item">
                        <span>类型</span>
                        <strong>{{ getReportTypeLabel(reportDetail.report_type) }}</strong>
                      </div>
                      <div class="detail-item">
                        <span>建筑</span>
                        <strong>{{ reportDetail.building_id || buildingId || '-' }}</strong>
                      </div>
                      <div class="detail-item">
                        <span>时间范围</span>
                        <strong>{{ formatTimeRange(reportDetail.time_range) }}</strong>
                      </div>
                      <div class="detail-item">
                        <span>生成时间</span>
                        <strong>{{ formatGeneratedAt(reportDetail.generated_at || reportDetail.created_at) }}</strong>
                      </div>
                    </div>

                    <div v-if="baseReportSummary" class="summary-box">
                      <div class="title">
                        <Icon icon="lucide:file-text" />
                        报表摘要
                      </div>
                      <p>{{ baseReportSummary }}</p>
                    </div>

                    <div v-if="reportHourlyData.length" class="hourly-table-wrapper">
                      <div class="title">
                        <Icon icon="lucide:clock" />
                        小时级数据
                      </div>
                      <table class="hourly-table">
                        <thead>
                          <tr>
                            <th>时间</th>
                            <th>总能耗</th>
                            <th>峰值</th>
                            <th>平均</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(item, idx) in reportHourlyData" :key="idx">
                            <td>{{ item.hour }}</td>
                            <td class="font-numeric">{{ formatNumber(item.total) }}</td>
                            <td class="font-numeric">{{ formatNumber(item.peak) }}</td>
                            <td class="font-numeric">{{ formatNumber(item.average) }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div v-if="reportSummaryMetrics.length" class="metrics-grid">
                      <div class="title">
                        <Icon icon="lucide:bar-chart-3" />
                        指标摘要
                      </div>
                      <div class="metrics-cards">
                        <div v-for="metric in reportSummaryMetrics" :key="metric.key" class="metric-card">
                          <span class="metric-label">{{ metric.label }}</span>
                          <span class="metric-value">{{ formatNumber(metric.value) }}<span v-if="metric.unit" class="metric-unit">{{ metric.unit }}</span></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-else class="empty-state">
                    <Icon icon="lucide:file-stack" />
                    <span>从上方报表列表选择一条记录查看详情。</span>
                  </div>
                </section>

                <section class="subcard stack-sm">
                  <div class="subhead">
                    <strong>4. AI 报表问答</strong>
                    <button class="secondary small" :disabled="summarizing || !reportDetail" @click="askReportQuestion('')">
                      <Icon :icon="summarizing ? 'lucide:loader-2' : 'lucide:sparkles'" :class="{ spin: summarizing }" />
                      生成总结
                    </button>
                  </div>

                  <label>
                    <span>提问内容</span>
                    <textarea
                      v-model="reportQuestion"
                      rows="3"
                      placeholder="例如：这份报表最值得关注的风险是什么？接下来建议做哪些排查？"
                    />
                  </label>

                  <div v-if="reportAiError" class="msg err">
                    <Icon icon="lucide:alert-circle" />
                    {{ reportAiError }}
                  </div>

                  <div class="actions">
                    <button class="primary" :disabled="summarizing || !reportDetail" @click="askReportQuestion(reportQuestion)">
                      <Icon :icon="summarizing ? 'lucide:loader-2' : 'lucide:messages-square'" :class="{ spin: summarizing }" />
                      {{ summarizing ? '提问中...' : '提交问题' }}
                    </button>
                  </div>

                  <div v-if="reportAiResponse" class="stack-sm">
                    <div v-if="reportAiResponse.summary" class="summary-box">
                      <div class="title">
                        <Icon icon="lucide:sparkles" />
                        AI 总结
                      </div>
                      <p>{{ reportAiResponse.summary }}</p>
                    </div>

                    <section v-if="reportAiResponse.highlights?.length" class="result stack-sm">
                      <div class="title"><Icon icon="lucide:star" />关键亮点</div>
                      <ul>
                        <li v-for="(item, index) in reportAiResponse.highlights" :key="`highlight-${index}`">{{ item }}</li>
                      </ul>
                    </section>

                    <section v-if="reportAiResponse.risks?.length" class="result stack-sm">
                      <div class="title"><Icon icon="lucide:triangle-alert" />风险提示</div>
                      <ul class="risk">
                        <li v-for="(item, index) in reportAiResponse.risks" :key="`risk-${index}`">{{ item }}</li>
                      </ul>
                    </section>

                    <section v-if="reportAiResponse.suggestions?.length" class="result stack-sm">
                      <div class="title"><Icon icon="lucide:list-checks" />建议动作</div>
                      <ul>
                        <li v-for="(item, index) in reportAiResponse.suggestions" :key="`suggestion-${index}`">{{ item }}</li>
                      </ul>
                    </section>

                    <section v-if="reportAiResponse.actions?.length" class="result stack-sm">
                      <div class="title"><Icon icon="lucide:bolt" />可执行动作</div>
                      <div class="actions">
                        <button v-for="(item, index) in reportAiResponse.actions" :key="`action-${index}`" class="secondary small">
                          {{ item.label }}
                        </button>
                      </div>
                    </section>

                    <section v-if="reportAiResponse.evidence?.length" class="result stack-sm">
                      <div class="title"><Icon icon="lucide:book-open-text" />依据</div>
                      <div v-for="(item, index) in reportAiResponse.evidence" :key="`evidence-${index}`" class="evidence">
                        <div>
                          <strong>{{ item.source || '未知来源' }}</strong>
                          <em>{{ item.source_type || 'context' }}</em>
                        </div>
                        <p>{{ item.snippet || '-' }}</p>
                      </div>
                    </section>

                    <section v-if="reportAiMetaText.length" class="meta">
                      <span v-for="item in reportAiMetaText" :key="item">{{ item }}</span>
                    </section>
                  </div>
                </section>
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
                    <small>未达到时处理：{{ step.if_not_met }}</small>
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
import { computed, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { connectOpsGuideStream, type OpsGuideResponse, type OpsGuideSSEEvent } from '../../api/anomaly'
import {
  deleteReport,
  downloadReport,
  generateReport,
  getReportDetail,
  listReports,
  summarizeReport,
  type GenerateReportRequest,
  type ReportDetailResponse,
  type ReportListItem,
  type ReportStatus,
  type ReportSummaryResponse
} from '../../api/statistics'

type ReportType = GenerateReportRequest['report_type']

const reportTypeOptions: { value: ReportType; label: string }[] = [
  { value: 'daily_summary', label: '日报' },
  { value: 'weekly_summary', label: '周报' },
  { value: 'monthly_summary', label: '月报' },
  { value: 'custom_summary', label: '自定义报表' },
  { value: 'anomaly_report', label: '异常分析报告' }
]

const reportStatusOptions: { value: ReportStatus; label: string }[] = [
  { value: 'queued', label: '排队中' },
  { value: 'processing', label: '处理中' },
  { value: 'ready', label: '已完成' },
  { value: 'failed', label: '失败' }
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
const deletingReport = ref(false)
const reportNotice = ref<{ type: 'ok' | 'err'; text: string } | null>(null)

const form = ref({
  report_type: 'daily_summary' as ReportType,
  start: '',
  end: '',
  includeAI: true
})

const reportFilters = ref({
  report_type: '' as '' | ReportType,
  status: '' as '' | ReportStatus,
  page: 1,
  page_size: 10
})

const reportListLoading = ref(false)
const reportListError = ref('')
const reportList = ref<ReportListItem[]>([])
const reportPagination = ref({ page: 1, page_size: 10, total: 0 })

const selectedReportId = ref('')
const reportDetailLoading = ref(false)
const reportDetailError = ref('')
const reportDetail = ref<ReportDetailResponse | null>(null)

const reportQuestion = ref('')
const reportAiError = ref('')
const reportAiResponse = ref<ReportSummaryResponse | null>(null)

const close = () => emit('update:visible', false)

const unwrap = <T>(payload: T | { data?: T }) => ((payload as { data?: T })?.data ?? payload) as T

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const formatDateTimeLocal = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}T${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`

const normalizeToISOString = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

const formatNumber = (val: number | null | undefined): string => {
  if (val == null || isNaN(val)) return '0.0'
  return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

const formatGeneratedAt = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN')
}

const formatTimeRange = (timeRange?: { start?: string; end?: string } | null) => {
  if (!timeRange?.start || !timeRange?.end) return '-'
  return `${formatGeneratedAt(timeRange.start)} - ${formatGeneratedAt(timeRange.end)}`
}

const getReportTypeLabel = (reportType?: string | null) =>
  reportTypeOptions.find(item => item.value === reportType)?.label || reportType || '-'

const getReportStatusLabel = (status?: string | null) =>
  reportStatusOptions.find(item => item.value === status)?.label || status || '-'

const totalPages = computed(() => Math.max(1, Math.ceil((reportPagination.value.total || 0) / (reportPagination.value.page_size || 1))))

const selectedReportListItem = computed(() =>
  reportList.value.find(item => item.report_id === selectedReportId.value) || null
)

const baseReportSummary = computed(() =>
  reportDetail.value?.summary ||
  reportDetail.value?.ai_summary ||
  selectedReportListItem.value?.summary ||
  ''
)

const reportHourlyData = computed(() => {
  return reportDetail.value?.data?.hourly_data || []
})

const reportSummaryMetrics = computed(() => {
  return reportDetail.value?.data?.summary_metrics || []
})

const reportAiMetaText = computed(() => {
  const meta = reportAiResponse.value?.meta
  if (!meta) return []
  const items: string[] = []
  if (meta.model) items.push(`模型：${meta.model}`)
  if (meta.generated_at) items.push(`生成时间：${formatGeneratedAt(meta.generated_at)}`)
  if (meta.confidence) items.push(`置信度：${meta.confidence}`)
  if (meta.low_confidence) items.push('当前结果置信度偏低')
  if (meta.needs_more_context) items.push('需要更多上下文')
  return items
})

const resolveReportUrl = () => {
  if (reportDetail.value?.download_url) return reportDetail.value.download_url
  if (reportDetail.value?.exports?.length) return reportDetail.value.exports[0]?.download_url || ''
  const selectedItem = selectedReportListItem.value
  if (selectedItem?.download_url) return selectedItem.download_url
  return ''
}

const canViewReportFile = computed(() => Boolean(resolveReportUrl()) || Boolean(selectedReportId.value))

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

  reportNotice.value = null
}

const clearReportInteraction = () => {
  reportDetailError.value = ''
  reportAiError.value = ''
  reportAiResponse.value = null
}

const loadReportList = async (selectFirst = false) => {
  if (!props.buildingId) return

  reportListLoading.value = true
  reportListError.value = ''

  try {
    const response = unwrap(await listReports({
      building_id: props.buildingId,
      report_type: reportFilters.value.report_type || undefined,
      status: reportFilters.value.status || undefined,
      page: reportFilters.value.page,
      page_size: reportFilters.value.page_size
    }))

    reportList.value = response?.items || []
    reportPagination.value = response?.pagination || {
      page: reportFilters.value.page,
      page_size: reportFilters.value.page_size,
      total: reportList.value.length
    }

    if (selectedReportId.value) {
      const stillExists = reportList.value.some(item => item.report_id === selectedReportId.value)
      if (!stillExists) {
        selectedReportId.value = ''
        reportDetail.value = null
      }
    }

    if (!selectedReportId.value && (selectFirst || reportList.value.length)) {
      const targetId = reportList.value[0]?.report_id
      if (targetId) await selectReport(targetId)
    }
  } catch (error: any) {
    reportListError.value = error?.message || '报表列表加载失败'
  } finally {
    reportListLoading.value = false
  }
}

const fetchReportDetail = async (reportId: string) => {
  reportDetailLoading.value = true
  reportDetailError.value = ''

  try {
    reportDetail.value = unwrap(await getReportDetail(reportId))
  } catch (error: any) {
    reportDetailError.value = error?.message || '报表详情加载失败'
    reportDetail.value = null
  } finally {
    reportDetailLoading.value = false
  }
}

const selectReport = async (reportId: string) => {
  if (!reportId) return
  selectedReportId.value = reportId
  reportQuestion.value = ''
  clearReportInteraction()
  await fetchReportDetail(reportId)
}

const pollReportUntilSettled = async (reportId: string) => {
  let latest: ReportDetailResponse | null = null

  for (let index = 0; index < 8; index += 1) {
    latest = unwrap(await getReportDetail(reportId))
    if (latest && (latest.status === 'ready' || latest.status === 'failed')) return latest
    await sleep(1500)
  }

  return latest
}

const generate = async () => {
  const start = normalizeToISOString(form.value.start)
  const end = normalizeToISOString(form.value.end)

  if (!start || !end) {
    reportNotice.value = { type: 'err', text: '请完整填写时间范围。' }
    return
  }

  if (new Date(start).getTime() >= new Date(end).getTime()) {
    reportNotice.value = { type: 'err', text: '结束时间必须晚于开始时间。' }
    return
  }

  generating.value = true
  reportNotice.value = null

  try {
    const created = unwrap(await generateReport({
      report_type: form.value.report_type,
      building_id: props.buildingId || undefined,
      time_range: { start, end },
      include_ai_summary: form.value.includeAI
    }))

    if (!created?.report_id) throw new Error('创建报表任务失败，未返回 report_id')

    selectedReportId.value = created.report_id
    reportNotice.value = { type: 'ok', text: '报表任务已创建，正在同步详情和列表。' }
    await loadReportList()
    await fetchReportDetail(created.report_id)

    const settled = await pollReportUntilSettled(created.report_id)
    if (settled) {
      reportDetail.value = settled
      reportNotice.value = settled.status === 'ready'
        ? { type: 'ok', text: '报表已生成，可直接查看详情或下载。' }
        : settled.status === 'failed'
          ? { type: 'err', text: '报表生成失败，请稍后重试。' }
          : { type: 'ok', text: '报表仍在处理中，列表已刷新。' }
    }

    await loadReportList()
  } catch (error: any) {
    reportNotice.value = { type: 'err', text: error?.message || '报表生成请求失败' }
  } finally {
    generating.value = false
  }
}

const applyFilters = async () => {
  reportFilters.value.page = 1
  await loadReportList(true)
}

const changePage = async (step: number) => {
  const nextPage = reportFilters.value.page + step
  if (nextPage < 1 || nextPage > totalPages.value) return
  reportFilters.value.page = nextPage
  await loadReportList()
}

const refreshReports = async () => {
  await loadReportList()
  if (selectedReportId.value) await fetchReportDetail(selectedReportId.value)
}

const reloadSelectedReport = async () => {
  if (!selectedReportId.value) return
  await fetchReportDetail(selectedReportId.value)
}

const viewReportFile = async () => {
  if (!selectedReportId.value) return
  await fetchReportDetail(selectedReportId.value)
}

const downloadReportFile = async () => {
  const reportId = selectedReportId.value || reportDetail.value?.report_id
  if (!reportId) return

  try {
    const blob = await downloadReport(reportId, 'md') as unknown as Blob
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `report_${reportId}.md`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (err: any) {
    alert('下载失败: ' + (err.message || '未知错误'))
    console.error(err)
  }
}

const removeSelectedReport = async () => {
  const reportId = selectedReportId.value || reportDetail.value?.report_id
  if (!reportId || deletingReport.value) return

  const confirmed = window.confirm(`确认删除报表 ${reportId} 吗？删除后不可恢复。`)
  if (!confirmed) return

  deletingReport.value = true
  reportNotice.value = null
  reportDetailError.value = ''
  reportAiError.value = ''

  try {
    const response = unwrap(await deleteReport(reportId))

    if (!response?.deleted) {
      throw new Error(response?.message || '报表删除失败')
    }

    if (selectedReportId.value === reportId) {
      selectedReportId.value = ''
      reportDetail.value = null
      reportAiResponse.value = null
      reportQuestion.value = ''
    }

    reportNotice.value = { type: 'ok', text: response.message || '报表已删除。' }
    await loadReportList(true)
  } catch (error: any) {
    reportNotice.value = { type: 'err', text: error?.message || '报表删除失败' }
  } finally {
    deletingReport.value = false
  }
}

const askReportQuestion = async (question: string) => {
  if (!reportDetail.value) return

  summarizing.value = true
  reportAiError.value = ''

  try {
    reportAiResponse.value = unwrap(await summarizeReport({
      question: question.trim() || undefined,
      report_type: reportDetail.value.report_type,
      audience: 'manager',
      include_anomaly_insight: true,
      include_actions: true,
      context: {
        report_id: reportDetail.value.report_id,
        building_id: reportDetail.value.building_id || props.buildingId || null,
        time_range: reportDetail.value.time_range,
        summary: reportDetail.value.summary || reportDetail.value.ai_summary || selectedReportListItem.value?.summary || null,
        page_context: {
          source: 'building_details_modal',
          page_type: 'statistics'
        }
      }
    }))
  } catch (error: any) {
    reportAiError.value = error?.message || 'AI 报表分析失败'
  } finally {
    summarizing.value = false
  }
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

const cancelOpsGuide = () => {
  if (opsAbortController.value) {
    opsAbortController.value.abort()
    opsAbortController.value = null
  }
  opsLoading.value = false
  opsProgressMsg.value = ''
}

watch(() => props.selectedDay, resetReportForm, { immediate: true })

watch(
  () => props.visible,
  async visible => {
    if (!visible) return

    resetReportForm()
    reportFilters.value.page = 1
    await loadReportList(true)

    if (!opsResult.value && !opsLoading.value) startAnalysis()
  }
)

watch(
  () => props.buildingId,
  async (next, prev) => {
    if (!props.visible || !next || next === prev) return
    selectedReportId.value = ''
    reportDetail.value = null
    await loadReportList(true)
  }
)

onUnmounted(cancelOpsGuide)
</script>

<style scoped>
.mask{position:fixed;inset:0;background:rgba(15,23,42,.35);backdrop-filter:blur(3px);z-index:10000;display:flex;justify-content:flex-end}
.panel{width:620px;max-width:94vw;height:100vh;background:#f3f6fb;display:flex;flex-direction:column;box-shadow:-10px 0 40px rgba(15,23,42,.18);font-family:'Plus Jakarta Sans',-apple-system,'PingFang SC',sans-serif}
.head{background:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #dbe5f0}
.head h2{margin:0;font-size:17px;color:#0f172a}
.head span{font-size:12px;color:#64748b}
.head-actions,.actions,.stack,.stack-sm,.pager,.report-item-head,.meta{display:flex}
.head-actions,.actions{gap:8px;flex-wrap:wrap}
.stack,.stack-sm{flex-direction:column}
.stack{gap:16px}
.stack-sm{gap:10px}
.body{flex:1;overflow:auto;padding:20px;display:flex;flex-direction:column;gap:16px}
.card,.meta,.subcard{background:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(15,23,42,.06)}
.card,.subcard{padding:16px}
.subcard{border:1px solid #e2e8f0}
.meta{padding:12px 16px;gap:14px;flex-wrap:wrap;font-size:11px;color:#94a3b8}
.meta span,.title,.kv,.step-head,.tags,.err-block,.center,.msg,.mini-state,.empty-state{display:flex;align-items:center}
.icon-btn{width:34px;height:34px;border:none;border-radius:8px;background:transparent;color:#64748b;cursor:pointer}
.icon-btn:hover,.icon-btn.active{background:#e8f0fb;color:#0b4582}
.icon-btn.danger:hover{background:#fef2f2;color:#dc2626}
.icon-btn:disabled{opacity:.5;cursor:not-allowed}
.section-top,.kv,.subhead,.report-item-head,.pager{justify-content:space-between}
.section-top,.subhead{display:flex;gap:12px}
.section-top h3,h4,.subhead strong{margin:0;color:#0f172a}
.section-top p,.card p,small,ul{color:#475569}
.section-top p,.lead,.card p,small{line-height:1.7}
.grid,.detail-grid,.filters{display:grid;gap:12px}
.grid{grid-template-columns:1fr 1fr}
.detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.filters{grid-template-columns:repeat(3,minmax(0,1fr))}
label{display:flex;flex-direction:column;gap:6px}
label span{font-size:12px;font-weight:700;color:#475569}
input,select,textarea{min-height:42px;border:1px solid #cbd5e1;border-radius:10px;padding:0 12px;font-size:13px;outline:none;background:#fff}
textarea{min-height:auto;padding:12px;resize:vertical}
input:focus,select:focus,textarea:focus{border-color:#0b4582;box-shadow:0 0 0 3px rgba(11,69,130,.08)}
input:disabled{background:#f8fafc;color:#64748b}
.toggle-row{padding:16px 18px;border:1.5px solid #e8ecf1;border-radius:12px;background:#fff;display:flex;justify-content:space-between;align-items:center;gap:12px}
.toggle-row:has(input:checked){border-color:#c7d2fe;background:#fafbff}
.ai-toggle-info{display:flex;align-items:center;gap:12px}
.ai-toggle-icon{font-size:20px;color:#7c3aed;display:flex}
.toggle-row strong{display:block;font-size:13px;color:#0f172a}
.toggle-row small{display:block;margin-top:1px;font-size:11.5px;color:#94a3b8;font-weight:500;line-height:1.5}
.toggle-switch{position:relative;width:44px;height:24px;flex-shrink:0}
.toggle-switch input{opacity:0;width:0;height:0;min-height:0;padding:0}
.toggle-slider{position:absolute;cursor:pointer;inset:0;background:#cbd5e1;border-radius:24px;transition:all .25s ease}
.toggle-slider::before{content:'';position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:all .25s ease;box-shadow:0 1px 3px rgba(0,0,0,.15)}
.toggle-switch input:checked + .toggle-slider{background:linear-gradient(135deg,#0b4582,#7c3aed)}
.toggle-switch input:checked + .toggle-slider::before{transform:translateX(20px)}
.msg{gap:8px;padding:12px 14px;border-radius:12px;font-size:12px;font-weight:600}
.err{background:#fef2f2;color:#dc2626}
.ok{background:#ecfdf5;color:#059669}
.result,.summary-box,.step,.evidence,.report-item{border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#fff}
.summary-box{background:linear-gradient(135deg,#eff6ff,#f8fafc);border-color:#dbeafe}
.title{gap:6px;font-weight:800;color:#0b4582}
.primary,.secondary{min-height:40px;padding:0 16px;border:none;border-radius:10px;cursor:pointer;font:700 13px inherit;display:inline-flex;align-items:center;gap:6px}
.primary{background:linear-gradient(135deg,#0b4582,#1565c0);color:#fff}
.secondary{background:#eef2f7;color:#334155;border:1px solid #dbe5f0}
.danger-btn{background:#fef2f2;color:#dc2626;border-color:#fecaca}
.small{min-height:34px;padding:0 14px;font-size:12px}
.primary:hover:not(:disabled),.report-item:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(11,69,130,.12)}
.secondary:hover:not(:disabled){background:#e2e8f0}
.danger-btn:hover:not(:disabled){background:#fee2e2}
.primary:disabled,.secondary:disabled{opacity:.6;cursor:not-allowed}
.center{display:flex;flex-direction:column;justify-content:center;text-align:center;gap:12px}
.mini-state,.empty-state{gap:8px;justify-content:center;padding:14px;border:1px dashed #cbd5e1;border-radius:12px;color:#64748b;background:#f8fafc}
.report-list{display:flex;flex-direction:column;gap:10px}
.report-item{cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:4px}
.report-item.active{border-color:#0b4582;background:#eff6ff}
.status-pill{padding:4px 8px;border-radius:999px;font-size:11px;font-weight:700}
.status-pill.queued{background:#f1f5f9;color:#475569}
.status-pill.processing{background:#eff6ff;color:#1d4ed8}
.status-pill.ready{background:#ecfdf5;color:#059669}
.status-pill.failed{background:#fef2f2;color:#dc2626}
.detail-item{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border-radius:12px;background:#f8fafc}
.detail-item span{font-size:11px;color:#64748b}
.detail-item strong{font-size:13px;color:#0f172a;word-break:break-word}
.pager{align-items:center;gap:12px}
.big{font-size:30px;color:#0b4582}
.lead{margin:0;color:#1e3a5f;font-size:14px}
.step-head{gap:10px}
.badge{width:24px;height:24px;border-radius:999px;background:#0b4582;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800}
em{font-style:normal;font-size:11px;padding:3px 8px;border-radius:999px;background:#eff6ff;color:#0b4582}
.risk li,.danger-text{color:#dc2626}
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
@media (max-width:640px){
  .panel{width:100vw;max-width:100vw}
  .body{padding:14px}
  .grid,.filters,.detail-grid{grid-template-columns:1fr}
}
.font-numeric{text-align:right;font-variant-numeric:tabular-nums}
.hourly-table-wrapper,.metrics-grid{margin-top:12px}
.hourly-table{width:100%;border-collapse:collapse;font-size:13px}
.hourly-table th,.hourly-table td{padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:left}
.hourly-table th{background:#f8fafc;font-weight:600;color:#475569}
.hourly-table td{color:#334155}
.hourly-table tr:hover td{background:#f8fafc}
.metrics-grid .metrics-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-top:8px}
.metrics-cards .metric-card{display:flex;flex-direction:column;gap:4px;padding:12px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0}
.metric-label{font-size:11px;color:#64748b}
.metric-value{font-size:15px;font-weight:700;color:#0f172a}
.metric-unit{font-size:12px;color:#64748b;margin-left:2px}
</style>
