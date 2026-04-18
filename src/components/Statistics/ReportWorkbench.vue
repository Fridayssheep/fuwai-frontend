<template>
  <section class="workbench">
    <div class="top">
      <div>
        <h3>报表工作台</h3>
        <p>统一查看报表详情、AI 追问与 AI 运维分析。生成入口已移动到建筑表和设备表。</p>
      </div>
      <button class="secondary small" :disabled="reportListLoading" @click="refreshReports">
        <Icon :icon="reportListLoading ? 'lucide:loader-2' : 'lucide:refresh-cw'" :class="{ spin: reportListLoading }" />
        刷新列表
      </button>
    </div>

    <div v-if="reportNotice" class="msg" :class="reportNotice.type">
      <Icon :icon="reportNotice.type === 'ok' ? 'lucide:check-circle-2' : 'lucide:alert-circle'" />
      {{ reportNotice.text }}
    </div>

    <div class="layout">
      <section class="card left">
        <div class="subhead"><strong>已有报表</strong></div>
        <div class="filters">
          <label><span>类型</span><select v-model="reportFilters.report_type" @change="applyFilters"><option value="">全部</option><option v-for="item in reportTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
          <label><span>状态</span><select v-model="reportFilters.status" @change="applyFilters"><option value="">全部</option><option v-for="item in reportStatusOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
          <label><span>每页数量</span><select v-model.number="reportFilters.page_size" @change="applyFilters"><option :value="5">5</option><option :value="10">10</option><option :value="20">20</option></select></label>
        </div>
        <div v-if="reportListError" class="msg err"><Icon icon="lucide:alert-circle" />{{ reportListError }}</div>
        <div v-if="reportListLoading" class="state"><Icon icon="lucide:loader-2" class="spin" /><span>正在加载报表列表...</span></div>
        <div v-else-if="!reportList.length" class="state"><Icon icon="lucide:file-search" /><span>当前筛选条件下暂无报表。</span></div>
        <div v-else class="list">
          <button v-for="item in reportList" :key="item.report_id" class="item" :class="{ active: item.report_id === selectedReportId }" @click="selectReport(item.report_id)">
            <div class="row"><strong>{{ getReportTypeLabel(item.report_type) }}</strong><span class="pill" :class="item.status">{{ getReportStatusLabel(item.status) }}</span></div>
            <small>{{ formatTimeRange(item.time_range) }}</small>
            <small>建筑：{{ item.building_id || activeSourceContext?.buildingId || '-' }}</small>
            <small v-if="getSourceText(item.report_id)">{{ getSourceText(item.report_id) }}</small>
            <small>生成时间：{{ formatGeneratedAt(item.generated_at) }}</small>
          </button>
        </div>
        <div class="pager">
          <button class="secondary small" :disabled="reportFilters.page <= 1 || reportListLoading" @click="changePage(-1)">上一页</button>
          <span>第 {{ reportPagination.page }} / {{ totalPages }} 页</span>
          <button class="secondary small" :disabled="reportPagination.page >= totalPages || reportListLoading" @click="changePage(1)">下一页</button>
        </div>
      </section>

      <div class="right">
        <section class="card">
          <div class="subhead">
            <strong>报表详情</strong>
            <div class="actions">
              <button class="secondary small" :disabled="!selectedReportId || reportDetailLoading" @click="reloadSelectedReport"><Icon :icon="reportDetailLoading ? 'lucide:loader-2' : 'lucide:refresh-cw'" :class="{ spin: reportDetailLoading }" />刷新详情</button>
              <button class="secondary small" :disabled="!canViewReportFile" @click="viewReportFile"><Icon icon="lucide:external-link" />查看文件</button>
              <button class="primary small" :disabled="!selectedReportId" @click="downloadReportFile"><Icon icon="lucide:download" />下载 Markdown</button>
              <button class="secondary small danger" :disabled="!selectedReportId || deletingReport" @click="removeSelectedReport"><Icon :icon="deletingReport ? 'lucide:loader-2' : 'lucide:trash-2'" :class="{ spin: deletingReport }" />{{ deletingReport ? '删除中...' : '删除报表' }}</button>
            </div>
          </div>
          <div v-if="reportDetailError" class="msg err"><Icon icon="lucide:alert-circle" />{{ reportDetailError }}</div>
          <div v-if="reportDetailLoading" class="state"><Icon icon="lucide:loader-2" class="spin" /><span>正在加载报表详情...</span></div>
          <div v-else-if="reportDetail" class="stack">
            <div class="detail-grid">
              <div class="detail-item"><span>报表 ID</span><strong>{{ reportDetail.report_id }}</strong></div>
              <div class="detail-item"><span>状态</span><strong>{{ getReportStatusLabel(reportDetail.status) }}</strong></div>
              <div class="detail-item"><span>类型</span><strong>{{ getReportTypeLabel(reportDetail.report_type) }}</strong></div>
              <div class="detail-item"><span>所属建筑</span><strong>{{ reportDetail.building_id || activeSourceContext?.buildingId || '-' }}</strong></div>
              <div class="detail-item"><span>来源对象</span><strong>{{ activeSourceLabel }}</strong></div>
              <div class="detail-item"><span>时间范围</span><strong>{{ formatTimeRange(reportDetail.time_range) }}</strong></div>
            </div>
            <div v-if="baseReportSummary" class="box"><div class="title"><Icon icon="lucide:file-text" />报表摘要</div><p>{{ baseReportSummary }}</p></div>
            <div v-if="reportHourlyData.length" class="box"><div class="title"><Icon icon="lucide:clock" />小时数据</div><table class="table"><thead><tr><th>时间</th><th>总能耗</th><th>峰值</th><th>平均</th></tr></thead><tbody><tr v-for="(item, idx) in reportHourlyData" :key="idx"><td>{{ item.hour }}</td><td>{{ formatNumber(item.total) }}</td><td>{{ formatNumber(item.peak) }}</td><td>{{ formatNumber(item.average) }}</td></tr></tbody></table></div>
            <div v-if="reportSummaryMetrics.length" class="box"><div class="title"><Icon icon="lucide:bar-chart-3" />指标摘要</div><div class="metrics"><div v-for="metric in reportSummaryMetrics" :key="metric.key" class="metric"><span>{{ metric.label }}</span><strong>{{ formatNumber(metric.value) }}<small v-if="metric.unit">{{ metric.unit }}</small></strong></div></div></div>
          </div>
          <div v-else class="state"><Icon icon="lucide:file-stack" /><span>从左侧报表列表中选择一条记录查看详情。</span></div>
        </section>

        <section class="card">
          <div class="subhead">
            <strong>AI 报表追问</strong>
            <button class="secondary small" :disabled="summarizing || !reportDetail" @click="askReportQuestion('')">
              <Icon :icon="summarizing ? 'lucide:loader-2' : 'lucide:sparkles'" :class="{ spin: summarizing }" />
              生成总结
            </button>
          </div>
          <label><span>提问内容</span><textarea v-model="reportQuestion" rows="3" placeholder="例如：这份报表最值得关注的风险是什么？接下来建议做哪些排查？" /></label>
          <div v-if="reportAiError" class="msg err"><Icon icon="lucide:alert-circle" />{{ reportAiError }}</div>
          <div class="actions"><button class="primary" :disabled="summarizing || !reportDetail" @click="askReportQuestion(reportQuestion)"><Icon :icon="summarizing ? 'lucide:loader-2' : 'lucide:messages-square'" :class="{ spin: summarizing }" />{{ summarizing ? '提问中...' : '提交问题' }}</button></div>
          <div v-if="reportAiResponse" class="stack">
            <div v-if="reportAiResponse.summary" class="box"><div class="title"><Icon icon="lucide:sparkles" />AI 总结</div><p>{{ reportAiResponse.summary }}</p></div>
            <section v-if="reportAiResponse.highlights?.length" class="box"><div class="title"><Icon icon="lucide:star" />关键亮点</div><ul><li v-for="(item, index) in reportAiResponse.highlights" :key="`highlight-${index}`">{{ item }}</li></ul></section>
            <section v-if="reportAiResponse.risks?.length" class="box"><div class="title"><Icon icon="lucide:triangle-alert" />风险提示</div><ul class="risk"><li v-for="(item, index) in reportAiResponse.risks" :key="`risk-${index}`">{{ item }}</li></ul></section>
            <section v-if="reportAiResponse.suggestions?.length" class="box"><div class="title"><Icon icon="lucide:list-checks" />建议动作</div><ul><li v-for="(item, index) in reportAiResponse.suggestions" :key="`suggestion-${index}`">{{ item }}</li></ul></section>
            <section v-if="reportAiMetaText.length" class="meta"><span v-for="item in reportAiMetaText" :key="item">{{ item }}</span></section>
          </div>
        </section>

        <section class="card">
          <div class="subhead">
            <strong>AI 运维分析</strong>
            <div class="actions">
              <button class="primary small" :disabled="opsLoading || !reportDetail" @click="startAnalysis"><Icon :icon="opsLoading ? 'lucide:loader-2' : 'lucide:bot'" :class="{ spin: opsLoading }" />{{ opsLoading ? '分析中...' : '开始分析' }}</button>
              <button class="secondary small" :disabled="!opsLoading" @click="cancelOpsGuide">取消</button>
            </div>
          </div>
          <div v-if="opsLoading" class="state"><Icon icon="lucide:loader-2" class="spin" /><span>{{ opsProgressMsg || 'AI 正在分析运维数据，请稍候...' }}</span></div>
          <div v-else-if="opsError" class="msg err"><Icon icon="lucide:alert-circle" />{{ opsError }}</div>
          <div v-else-if="opsResult" class="stack">
            <section class="box"><p class="lead">{{ opsResult.summary }}</p></section>
            <section v-if="opsResult.preconditions?.length" class="box"><div class="title"><Icon icon="lucide:shield-check" />前置条件</div><ul><li v-for="(item, index) in opsResult.preconditions" :key="index">{{ item }}</li></ul></section>
            <section v-if="opsResult.steps?.length" class="box"><div class="title"><Icon icon="lucide:list-ordered" />运维步骤</div><div class="stack"><div v-for="(step, index) in opsResult.steps" :key="step.step_id" class="step"><div class="row"><span class="badge">{{ index + 1 }}</span><strong>{{ step.title }}</strong><em>{{ step.priority }}</em></div><p>{{ step.instruction }}</p><small>预期结果：{{ step.expected_result }}</small><small>未达预期时处理：{{ step.if_not_met }}</small></div></div></section>
            <section v-if="opsResult.risk_notice?.length" class="box"><div class="title"><Icon icon="lucide:triangle-alert" />风险提示</div><ul class="risk"><li v-for="(item, index) in opsResult.risk_notice" :key="index">{{ item }}</li></ul></section>
          </div>
          <div v-else class="state"><Icon icon="lucide:bot" /><span>选择报表后，可基于报表上下文发起 AI 运维分析。</span></div>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { connectOpsGuideStream, type OpsGuideResponse, type OpsGuideSSEEvent } from '../../api/anomaly'
import { deleteReport, downloadReport, getReportDetail, listReports, summarizeReport, type GenerateReportRequest, type ReportDetailResponse, type ReportListItem, type ReportStatus, type ReportSummaryResponse } from '../../api/statistics'
import type { ReportSourceContext } from './reportWorkbenchTypes'

type ReportType = GenerateReportRequest['report_type']
const reportTypeOptions = [{ value: 'daily_summary', label: '日报' }, { value: 'weekly_summary', label: '周报' }, { value: 'monthly_summary', label: '月报' }, { value: 'anomaly_report', label: '异常分析报告' }] as { value: ReportType; label: string }[]
const reportStatusOptions = [{ value: 'queued', label: '排队中' }, { value: 'processing', label: '处理中' }, { value: 'ready', label: '已完成' }, { value: 'failed', label: '失败' }] as { value: ReportStatus; label: string }[]

const props = defineProps<{ selectedReportId?: string; selectionVersion?: number; sourceContext?: ReportSourceContext | null }>()
const reportListLoading = ref(false)
const reportListError = ref('')
const reportList = ref<ReportListItem[]>([])
const reportPagination = ref({ page: 1, page_size: 10, total: 0 })
const reportFilters = ref({ report_type: '' as '' | ReportType, status: '' as '' | ReportStatus, page: 1, page_size: 10 })
const reportNotice = ref<{ type: 'ok' | 'err'; text: string } | null>(null)
const deletingReport = ref(false)
const summarizing = ref(false)
const selectedReportId = ref('')
const reportDetailLoading = ref(false)
const reportDetailError = ref('')
const reportDetail = ref<ReportDetailResponse | null>(null)
const reportQuestion = ref('')
const reportAiError = ref('')
const reportAiResponse = ref<ReportSummaryResponse | null>(null)
const opsLoading = ref(false)
const opsError = ref('')
const opsResult = ref<OpsGuideResponse | null>(null)
const opsProgressMsg = ref('')
const opsAbortController = ref<AbortController | null>(null)
const reportContextMap = ref<Record<string, ReportSourceContext>>({})

const unwrap = <T>(payload: T | { data?: T }) => ((payload as { data?: T })?.data ?? payload) as T
const formatNumber = (val: number | null | undefined) => val == null || Number.isNaN(val) ? '0.0' : val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const formatGeneratedAt = (value?: string | null) => !value ? '-' : (Number.isNaN(new Date(value).getTime()) ? value : new Date(value).toLocaleString('zh-CN'))
const formatTimeRange = (timeRange?: { start?: string; end?: string } | null) => !timeRange?.start || !timeRange?.end ? '-' : `${formatGeneratedAt(timeRange.start)} - ${formatGeneratedAt(timeRange.end)}`
const getReportTypeLabel = (reportType?: string | null) => reportTypeOptions.find(item => item.value === reportType)?.label || reportType || '-'
const getReportStatusLabel = (status?: string | null) => reportStatusOptions.find(item => item.value === status)?.label || status || '-'
const totalPages = computed(() => Math.max(1, Math.ceil((reportPagination.value.total || 0) / (reportPagination.value.page_size || 1))))
const selectedReportListItem = computed(() => reportList.value.find(item => item.report_id === selectedReportId.value) || null)
const activeSourceContext = computed(() => selectedReportId.value && reportContextMap.value[selectedReportId.value] ? reportContextMap.value[selectedReportId.value] : null)
const activeSourceLabel = computed(() => !activeSourceContext.value ? reportDetail.value?.building_id || '-' : activeSourceContext.value.sourceType === 'meter' ? `设备 ${activeSourceContext.value.sourceLabel}` : `建筑 ${activeSourceContext.value.sourceLabel}`)
const baseReportSummary = computed(() => reportDetail.value?.summary || reportDetail.value?.ai_summary || selectedReportListItem.value?.summary || '')
const reportHourlyData = computed(() => reportDetail.value?.data?.hourly_data || [])
const reportSummaryMetrics = computed(() => reportDetail.value?.data?.summary_metrics || [])
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
const resolveReportUrl = () => reportDetail.value?.download_url || reportDetail.value?.exports?.[0]?.download_url || selectedReportListItem.value?.download_url || ''
const canViewReportFile = computed(() => Boolean(resolveReportUrl()) || Boolean(selectedReportId.value))
const getSourceText = (reportId: string) => {
  const context = reportContextMap.value[reportId]
  return !context ? '' : context.sourceType === 'meter' ? `来源设备：${context.sourceLabel}` : `来源建筑：${context.sourceLabel}`
}
const clearReportInteraction = () => { reportDetailError.value = ''; reportAiError.value = ''; reportAiResponse.value = null; opsError.value = ''; opsResult.value = null }
const registerContext = (context?: ReportSourceContext | null) => {
  if (!context?.reportId) return
  reportContextMap.value = { ...reportContextMap.value, [context.reportId]: context }
}
const loadReportList = async (selectFirst = false) => {
  reportListLoading.value = true
  reportListError.value = ''
  try {
    const response = unwrap(await listReports({ report_type: reportFilters.value.report_type || undefined, status: reportFilters.value.status || undefined, page: reportFilters.value.page, page_size: reportFilters.value.page_size }))
    reportList.value = response?.items || []
    reportPagination.value = response?.pagination || { page: reportFilters.value.page, page_size: reportFilters.value.page_size, total: reportList.value.length }
    if (selectedReportId.value && !reportList.value.some(item => item.report_id === selectedReportId.value)) { selectedReportId.value = ''; reportDetail.value = null }
    if (!selectedReportId.value && (selectFirst || reportList.value.length)) { const targetId = reportList.value[0]?.report_id; if (targetId) await selectReport(targetId) }
  } catch (error: any) {
    reportListError.value = error?.message || '报表列表加载失败'
  } finally {
    reportListLoading.value = false
  }
}
const fetchReportDetail = async (reportId: string) => {
  reportDetailLoading.value = true
  reportDetailError.value = ''
  try { reportDetail.value = unwrap(await getReportDetail(reportId)) } catch (error: any) { reportDetailError.value = error?.message || '报表详情加载失败'; reportDetail.value = null } finally { reportDetailLoading.value = false }
}
const selectReport = async (reportId: string) => { if (!reportId) return; selectedReportId.value = reportId; reportQuestion.value = ''; clearReportInteraction(); await fetchReportDetail(reportId) }
const applyFilters = async () => { reportFilters.value.page = 1; await loadReportList(true) }
const changePage = async (step: number) => { const nextPage = reportFilters.value.page + step; if (nextPage < 1 || nextPage > totalPages.value) return; reportFilters.value.page = nextPage; await loadReportList() }
const refreshReports = async () => { await loadReportList(); if (selectedReportId.value) await fetchReportDetail(selectedReportId.value) }
const reloadSelectedReport = async () => { if (selectedReportId.value) await fetchReportDetail(selectedReportId.value) }
const viewReportFile = () => { const url = resolveReportUrl(); if (url) window.open(url, '_blank'); else if (selectedReportId.value) window.open(`/api/reports/${selectedReportId.value}?download=true&format=md`, '_blank') }
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
  } catch (error: any) {
    reportNotice.value = { type: 'err', text: error?.message || '报表下载失败' }
  }
}
const removeSelectedReport = async () => {
  const reportId = selectedReportId.value || reportDetail.value?.report_id
  if (!reportId || deletingReport.value || !window.confirm(`确认删除报表 ${reportId} 吗？删除后不可恢复。`)) return
  deletingReport.value = true
  try {
    const response = unwrap(await deleteReport(reportId))
    if (!response?.deleted) throw new Error(response?.message || '报表删除失败')
    if (selectedReportId.value === reportId) { selectedReportId.value = ''; reportDetail.value = null; reportAiResponse.value = null; reportQuestion.value = ''; opsResult.value = null }
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
    reportAiResponse.value = unwrap(await summarizeReport({ question: question.trim() || undefined, report_type: reportDetail.value.report_type, audience: 'manager', include_anomaly_insight: true, include_actions: true, context: { report_id: reportDetail.value.report_id, building_id: reportDetail.value.building_id || activeSourceContext.value?.buildingId || null, time_range: reportDetail.value.time_range, summary: reportDetail.value.summary || reportDetail.value.ai_summary || selectedReportListItem.value?.summary || null, page_context: { source: activeSourceContext.value?.sourceType === 'meter' ? 'statistics_meter_report' : 'statistics_building_report', page_type: 'statistics' } } }))
  } catch (error: any) {
    reportAiError.value = error?.message || 'AI 报表分析失败'
  } finally {
    summarizing.value = false
  }
}
const handleOpsSSEEvent = (event: OpsGuideSSEEvent) => {
  const { event: type, data } = event
  if (type === 'status' || type === 'progress') opsProgressMsg.value = data?.message || data?.status || JSON.stringify(data)
  else if (type === 'summary') opsResult.value = opsResult.value ? { ...opsResult.value, summary: data?.summary || data || '' } : { incident_id: '', status: 'streaming', summary: data?.summary || data || '', steps: [], meta: { generated_at: new Date().toISOString(), model: '' } }
  else if (type === 'preconditions' && opsResult.value) opsResult.value.preconditions = Array.isArray(data) ? data : data?.preconditions || []
  else if (type === 'step' && opsResult.value) { const step = data?.step || data; if (step) { const index = opsResult.value.steps.findIndex(item => item.step_id === step.step_id); if (index >= 0) opsResult.value.steps[index] = step; else opsResult.value.steps.push(step) } }
  else if (type === 'risk_notice' && opsResult.value) opsResult.value.risk_notice = Array.isArray(data) ? data : data?.risk_notice || []
  else if ((type === 'complete' || type === 'done') && data && typeof data === 'object' && data.steps) { opsResult.value = data; opsLoading.value = false; opsProgressMsg.value = '' }
  else if (type === 'error') { opsLoading.value = false; opsError.value = data?.message || data?.detail || 'AI 运维分析出错'; opsProgressMsg.value = '' }
}
const startAnalysis = () => {
  if (!reportDetail.value) return
  const buildingId = reportDetail.value.building_id || activeSourceContext.value?.buildingId
  if (!buildingId) { opsError.value = '当前报表缺少建筑上下文，无法执行 AI 运维分析。'; return }
  opsLoading.value = true
  opsError.value = ''
  opsResult.value = null
  opsProgressMsg.value = '正在连接 AI 服务...'
  const sourceText = activeSourceContext.value?.sourceType === 'meter' ? `设备 ${activeSourceContext.value.sourceLabel}` : `建筑 ${activeSourceContext.value?.sourceLabel || buildingId}`
  opsAbortController.value = connectOpsGuideStream({ question: `请基于报表 ${reportDetail.value.report_id} 和 ${sourceText} 输出运维分析与排查建议`, guide_mode: 'standard_sop', context: { building_id: buildingId, meter: activeSourceContext.value?.sourceType === 'meter' ? activeSourceContext.value.sourceId : 'electricity', time_range: reportDetail.value.time_range, page_context: { source: activeSourceContext.value?.sourceType === 'meter' ? 'statistics_meter_report' : 'statistics_building_report', page_type: 'statistics' } }, include_knowledge: true, include_history: true, include_actions: true }, handleOpsSSEEvent, (error: Error) => { opsLoading.value = false; opsAbortController.value = null; opsError.value = error.message || 'AI 运维分析请求失败' }, (fullResult: OpsGuideResponse | null) => { opsLoading.value = false; opsAbortController.value = null; if (fullResult) opsResult.value = fullResult })
}
const cancelOpsGuide = () => { if (opsAbortController.value) { opsAbortController.value.abort(); opsAbortController.value = null } opsLoading.value = false; opsProgressMsg.value = '' }
const syncExternalSelection = async () => { registerContext(props.sourceContext); if (!props.selectedReportId) return; if (reportList.value.length === 0) await loadReportList(); reportNotice.value = { type: 'ok', text: '已切换到新生成的报表。' }; await selectReport(props.selectedReportId) }
watch(() => [props.selectedReportId, props.selectionVersion], syncExternalSelection)
onMounted(async () => { registerContext(props.sourceContext); await loadReportList(true); if (props.selectedReportId) await syncExternalSelection() })
onUnmounted(cancelOpsGuide)
</script>

<style scoped>
.workbench,.card,.box,.item,.detail-item,.metric,.step{border:1px solid #e2e8f0;border-radius:14px;background:#fff}.workbench{padding:24px;display:flex;flex-direction:column;gap:16px;box-shadow:0 1px 3px rgba(15,23,42,.04),0 4px 14px rgba(15,23,42,.03)}.top,.subhead,.row,.pager,.actions{display:flex;justify-content:space-between;align-items:center;gap:12px}.layout{display:grid;grid-template-columns:340px minmax(0,1fr);gap:16px}.right,.stack,.list{display:flex;flex-direction:column;gap:16px}.filters,.detail-grid,.metrics{display:grid;gap:12px}.filters{grid-template-columns:repeat(3,minmax(0,1fr))}.detail-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.metrics{grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}.top h3,.subhead strong{margin:0;color:#0f172a}.top p,p,small,ul,span{color:#475569}.box,.card{padding:16px}.item{padding:12px;text-align:left;cursor:pointer}.item.active{border-color:#0b4582;background:#eff6ff}.detail-item,.metric,.step{padding:12px;background:#f8fafc}.detail-item span,.metric span{font-size:12px;color:#64748b}.detail-item strong,.metric strong{color:#0f172a}.msg,.state,.title,.meta{display:flex;align-items:center;gap:8px}.msg{padding:12px 14px;border-radius:12px;font-size:12px;font-weight:600}.msg.ok{background:#ecfdf5;color:#059669}.msg.err{background:#fef2f2;color:#dc2626}.state{justify-content:center;padding:14px;border:1px dashed #cbd5e1;border-radius:12px;background:#f8fafc}.title{font-weight:800;color:#0b4582}.meta{flex-wrap:wrap;font-size:11px;color:#94a3b8}.table{width:100%;border-collapse:collapse}.table th,.table td{padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:left}.pill{padding:4px 8px;border-radius:999px;font-size:11px;font-weight:700}.pill.queued{background:#f1f5f9;color:#475569}.pill.processing{background:#eff6ff;color:#1d4ed8}.pill.ready{background:#ecfdf5;color:#059669}.pill.failed{background:#fef2f2;color:#dc2626}.primary,.secondary{min-height:40px;padding:0 16px;border:none;border-radius:10px;cursor:pointer;font:700 13px inherit;display:inline-flex;align-items:center;gap:6px}.primary{background:linear-gradient(135deg,#0b4582,#1565c0);color:#fff}.secondary{background:#eef2f7;color:#334155;border:1px solid #dbe5f0}.secondary.danger{background:#fef2f2;color:#dc2626;border-color:#fecaca}.small{min-height:34px;padding:0 14px;font-size:12px}label{display:flex;flex-direction:column;gap:6px}label span{font-size:12px;font-weight:700;color:#475569}select,textarea{min-height:42px;border:1px solid #cbd5e1;border-radius:10px;padding:0 12px;font-size:13px;outline:none;background:#fff}textarea{padding:12px;resize:vertical}.badge{width:24px;height:24px;border-radius:50%;background:#0b4582;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800}em{font-style:normal;font-size:11px;padding:3px 8px;border-radius:999px;background:#eff6ff;color:#0b4582}.lead{margin:0;color:#1e3a5f}.risk li{color:#dc2626}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media (max-width:1200px){.layout{grid-template-columns:1fr}.filters,.detail-grid{grid-template-columns:1fr}}@media (max-width:640px){.workbench{padding:16px}}
</style>
