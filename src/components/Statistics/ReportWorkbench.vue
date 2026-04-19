<template>
  <section class="workbench">
    <div class="top">
      <div>
        <h3>报表工作台</h3>
        <p>统一浏览报表详情、下载文件，并对已生成报表继续进行 AI 追问。生成入口已移动到建筑表和设备表。</p>
      </div>
      <button class="secondary small" :disabled="reportListLoading" @click="refreshReports">
        <Icon :icon="reportListLoading ? 'lucide:loader-2' : 'lucide:refresh-cw'" :class="{ spin: reportListLoading }" />
        刷新
      </button>
    </div>

    <div v-if="reportNotice" class="msg" :class="reportNotice.type">
      <Icon :icon="reportNotice.type === 'ok' ? 'lucide:check-circle-2' : 'lucide:alert-circle'" />
      {{ reportNotice.text }}
    </div>

    <div class="layout">
      <section class="card left report-sidebar">
        <div class="report-sidebar-header">
          <span class="header-icon"><Icon icon="lucide:file-stack" /></span>
          <strong>已有报表</strong>
        </div>
        <div class="filters">
          <label>
            <span>类型</span>
            <ThemedSelect
              v-model="reportFilters.report_type"
              class="workbench-select"
              aria-label="报表类型筛选"
              :options="allReportTypeOptions"
              @change="applyFilters"
            />
          </label>
          <label>
            <span>状态</span>
            <ThemedSelect
              v-model="reportFilters.status"
              class="workbench-select"
              aria-label="报表状态筛选"
              :options="allReportStatusOptions"
              @change="applyFilters"
            />
          </label>
          <label>
            <span>每页数量</span>
            <ThemedSelect
              v-model="reportFilters.page_size"
              class="workbench-select"
              aria-label="每页数量"
              :options="pageSizeOptions"
              @change="applyFilters"
            />
          </label>
        </div>
        <div v-if="reportListError" class="msg err"><Icon icon="lucide:alert-circle" />{{ reportListError }}</div>
        <Transition name="report-list-state" mode="out-in">
          <div v-if="reportListLoading" key="loading" class="state"><Icon icon="lucide:loader-2" class="spin" /><span>正在加载报表列表...</span></div>
          <div v-else-if="!reportList.length" key="empty" class="state"><Icon icon="lucide:file-search" /><span>当前筛选条件下暂无报表。</span></div>
          <SlidingOptionGroup
            v-else
            key="list"
            :model-value="selectedReportId"
            :options="reportNavOptions"
            orientation="vertical"
            variant="list"
            aria-label="已有报表"
            class="report-list-nav"
            @update:model-value="(value) => selectReport(String(value))"
          >
            <template #option="{ option, active }">
              <span class="report-option-icon" :class="{ active }"><Icon icon="lucide:file-text" /></span>
              <span class="report-option-main">
                <span class="report-option-head">
                  <strong>{{ option.label }}</strong>
                  <span class="pill" :class="String(option.status)">{{ option.statusLabel }}</span>
                </span>
                <small>{{ option.timeText }}</small>
                <small>{{ option.buildingText }}</small>
                <small v-if="option.sourceText">{{ option.sourceText }}</small>
                <small>{{ option.generatedText }}</small>
              </span>
            </template>
          </SlidingOptionGroup>
        </Transition>
        <div class="pager">
          <button class="secondary small" :disabled="reportFilters.page <= 1 || reportListLoading" @click="changePage(-1)">上一页</button>
          <span>第 {{ reportPagination.page }} / {{ totalPages }} 页</span>
          <button class="secondary small" :disabled="reportPagination.page >= totalPages || reportListLoading" @click="changePage(1)">下一页</button>
        </div>
      </section>

      <div class="right">
        <section ref="detailSectionRef" class="card">
          <div class="subhead">
            <strong>报表详情</strong>
            <div class="actions">
              <button class="secondary small" :disabled="!selectedReportId || reportDetailLoading" @click="reloadSelectedReport"><Icon :icon="reportDetailLoading ? 'lucide:loader-2' : 'lucide:refresh-cw'" :class="{ spin: reportDetailLoading }" />刷新</button>
              <button class="secondary small" :disabled="!canViewReportFile" @click="viewReportDetail"><Icon icon="lucide:external-link" />查看</button>
              <button class="primary small" :disabled="!isSelectedReportReady" @click="downloadReportFile"><Icon icon="lucide:download" />下载</button>
              <button class="secondary small danger" :disabled="!selectedReportId || deletingReport" @click="removeSelectedReport"><Icon :icon="deletingReport ? 'lucide:loader-2' : 'lucide:trash-2'" :class="{ spin: deletingReport }" />{{ deletingReport ? '删除中' : '删除' }}</button>
            </div>
          </div>
          <div v-if="reportDetailError" class="msg err"><Icon icon="lucide:alert-circle" />{{ reportDetailError }}</div>
          <Transition name="report-detail-swap" mode="out-in">
            <div v-if="reportDetailLoading" key="loading" class="state"><Icon icon="lucide:loader-2" class="spin" /><span>正在加载报表详情...</span></div>
            <div v-else-if="reportDetail" :key="`detail-${reportDetail.report_id}`" class="stack">
              <div class="detail-grid">
                <div class="detail-item mono"><span>报表 ID</span><strong :title="reportDetail.report_id">{{ reportDetail.report_id }}</strong></div>
                <div class="detail-item"><span>状态</span><strong>{{ getReportStatusLabel(reportDetail.status) }}</strong></div>
                <div class="detail-item"><span>类型</span><strong>{{ getReportTypeLabel(reportDetail.report_type) }}</strong></div>
                <div class="detail-item"><span>所属建筑</span><strong :title="reportDetail.building_id || activeSourceContext?.buildingId || '-'">{{ reportDetail.building_id || activeSourceContext?.buildingId || '-' }}</strong></div>
                <div class="detail-item"><span>来源对象</span><strong :title="activeSourceLabel">{{ activeSourceLabel }}</strong></div>
                <div class="detail-item range"><span>时间范围</span><strong>{{ formatTimeRange(reportDetail.time_range) }}</strong></div>
              </div>
              <div v-if="baseReportSummary" class="box"><div class="title"><Icon icon="lucide:file-text" />报表摘要</div><p>{{ baseReportSummary }}</p></div>
              <div v-if="reportHourlyData.length" class="box"><div class="title"><Icon icon="lucide:clock" />小时数据</div><table class="table"><thead><tr><th>时间</th><th>总能耗</th><th>峰值</th><th>平均</th></tr></thead><tbody><tr v-for="(item, idx) in reportHourlyData" :key="idx"><td>{{ item.hour }}</td><td>{{ formatNumber(item.total) }}</td><td>{{ formatNumber(item.peak) }}</td><td>{{ formatNumber(item.average) }}</td></tr></tbody></table></div>
              <div v-if="reportSummaryMetrics.length" class="box"><div class="title"><Icon icon="lucide:bar-chart-3" />指标摘要</div><div class="metrics"><div v-for="metric in reportSummaryMetrics" :key="metric.key" class="metric"><span>{{ metric.label }}</span><strong>{{ formatNumber(metric.value) }}<small v-if="metric.unit">{{ metric.unit }}</small></strong></div></div></div>
            </div>
            <div v-else key="empty" class="state"><Icon icon="lucide:file-stack" /><span>从左侧报表列表中选择一条记录查看详情。</span></div>
          </Transition>
        </section>

        <section class="card">
          <div class="subhead">
            <strong>AI 报表追问</strong>
            <button class="secondary small" :disabled="summarizing || !isSelectedReportReady" @click="askReportQuestion('')">
              <Icon :icon="summarizing ? 'lucide:loader-2' : 'lucide:sparkles'" :class="{ spin: summarizing }" />
              生成总结
            </button>
          </div>
          <label><span>提问内容</span><textarea class="themed-textarea workbench-textarea" v-model="reportQuestion" rows="3" placeholder="例如：这份报表最值得关注的风险是什么？接下来建议做哪些排查？" /></label>
          <div v-if="reportAiError" class="msg err"><Icon icon="lucide:alert-circle" />{{ reportAiError }}</div>
          <div class="actions question-actions"><button class="primary" :disabled="summarizing || !isSelectedReportReady" @click="askReportQuestion(reportQuestion)"><Icon :icon="summarizing ? 'lucide:loader-2' : 'lucide:messages-square'" :class="{ spin: summarizing }" />{{ summarizing ? '提问中...' : '提交问题' }}</button></div>
          <div v-if="reportAiResponse" class="stack">
            <div v-if="reportAiResponse.summary" class="box"><div class="title"><Icon icon="lucide:sparkles" />AI 总结</div><p>{{ reportAiResponse.summary }}</p></div>
            <section v-if="reportAiResponse.highlights?.length" class="box"><div class="title"><Icon icon="lucide:star" />关键亮点</div><ul><li v-for="(item, index) in reportAiResponse.highlights" :key="`highlight-${index}`">{{ item }}</li></ul></section>
            <section v-if="reportAiResponse.risks?.length" class="box"><div class="title"><Icon icon="lucide:triangle-alert" />风险提示</div><ul class="risk"><li v-for="(item, index) in reportAiResponse.risks" :key="`risk-${index}`">{{ item }}</li></ul></section>
            <section v-if="reportAiResponse.suggestions?.length" class="box"><div class="title"><Icon icon="lucide:list-checks" />建议动作</div><ul><li v-for="(item, index) in reportAiResponse.suggestions" :key="`suggestion-${index}`">{{ item }}</li></ul></section>
            <section v-if="reportAiMetaText.length" class="meta"><span v-for="item in reportAiMetaText" :key="item">{{ item }}</span></section>
          </div>
        </section>

      </div>
    </div>

    <ReportPreviewModal
      v-model:visible="previewVisible"
      :loading="previewLoading"
      :error="previewError"
      :content="previewContent"
      :title="previewTitle"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { deleteReport, downloadReport, getReportDetail, listReports, summarizeReport, type GenerateReportRequest, type ReportDetailResponse, type ReportListItem, type ReportStatus, type ReportSummaryResponse } from '../../api/statistics'
import type { ReportSourceContext } from './reportWorkbenchTypes'
import ReportPreviewModal from './ReportPreviewModal.vue'
import ThemedSelect from '../common/ThemedSelect.vue'
import SlidingOptionGroup from '../common/SlidingOptionGroup.vue'

type ReportType = GenerateReportRequest['report_type']
const reportTypeOptions = [{ value: 'daily_summary', label: '日报' }, { value: 'weekly_summary', label: '周报' }, { value: 'monthly_summary', label: '月报' }, { value: 'custom_summary', label: '自定义报表' }, { value: 'anomaly_report', label: '异常分析报告' }] as { value: ReportType; label: string }[]
const reportStatusOptions = [{ value: 'queued', label: '排队中' }, { value: 'processing', label: '处理中' }, { value: 'ready', label: '已完成' }, { value: 'failed', label: '失败' }] as { value: ReportStatus; label: string }[]
const allReportTypeOptions = [{ value: '', label: '全部' }, ...reportTypeOptions]
const allReportStatusOptions = [{ value: '', label: '全部' }, ...reportStatusOptions]
const pageSizeOptions = [{ value: 5, label: '5' }, { value: 10, label: '10' }, { value: 20, label: '20' }]

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
const reportContextMap = ref<Record<string, ReportSourceContext>>({})
const detailSectionRef = ref<HTMLElement | null>(null)
const previewVisible = ref(false)
const previewLoading = ref(false)
const previewError = ref('')
const previewContent = ref('')
const previewTitle = ref('')
const REPORT_POLL_INTERVAL_MS = 15000
let reportPollingTimer: ReturnType<typeof setInterval> | null = null
let reportPollingInFlight = false

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
const selectedReportStatus = computed(() => reportDetail.value?.status || selectedReportListItem.value?.status || '')
const isSelectedReportReady = computed(() => selectedReportStatus.value === 'ready')
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
const getSourceText = (reportId: string) => {
  const context = reportContextMap.value[reportId]
  return !context ? '' : context.sourceType === 'meter' ? `来源设备：${context.sourceLabel}` : `来源建筑：${context.sourceLabel}`
}
const reportNavOptions = computed(() => reportList.value.map(item => ({
  value: item.report_id,
  label: getReportTypeLabel(item.report_type),
  status: item.status || '',
  statusLabel: getReportStatusLabel(item.status),
  timeText: formatTimeRange(item.time_range),
  buildingText: `建筑：${item.building_id || activeSourceContext.value?.buildingId || '-'}`,
  sourceText: getSourceText(item.report_id),
  generatedText: `生成时间：${formatGeneratedAt(item.generated_at)}`
})))
const resolveReportUrl = () => reportDetail.value?.download_url || reportDetail.value?.exports?.[0]?.download_url || selectedReportListItem.value?.download_url || ''
const canViewReportFile = computed(() => isSelectedReportReady.value && (Boolean(resolveReportUrl()) || Boolean(selectedReportId.value)))
const clearReportInteraction = () => { reportDetailError.value = ''; reportAiError.value = ''; reportAiResponse.value = null }
const registerContext = (context?: ReportSourceContext | null) => {
  if (!context?.reportId) return
  reportContextMap.value = { ...reportContextMap.value, [context.reportId]: context }
}
const loadReportList = async (selectFirst = false, options: { silent?: boolean } = {}) => {
  if (!options.silent) {
    reportListLoading.value = true
    reportListError.value = ''
  }
  try {
    const response = unwrap(await listReports({ report_type: reportFilters.value.report_type || undefined, status: reportFilters.value.status || undefined, page: reportFilters.value.page, page_size: reportFilters.value.page_size }))
    reportList.value = response?.items || []
    reportPagination.value = response?.pagination || { page: reportFilters.value.page, page_size: reportFilters.value.page_size, total: reportList.value.length }
    if (selectedReportId.value && !reportList.value.some(item => item.report_id === selectedReportId.value)) { selectedReportId.value = ''; reportDetail.value = null }
    if (!selectedReportId.value && (selectFirst || reportList.value.length)) { const targetId = reportList.value[0]?.report_id; if (targetId) await selectReport(targetId) }
    syncReportPolling()
  } catch (error: any) {
    if (options.silent) {
      console.warn('报表后台刷新失败:', error)
    } else {
      reportListError.value = error?.message || '报表列表加载失败'
    }
  } finally {
    if (!options.silent) reportListLoading.value = false
  }
}
const fetchReportDetail = async (reportId: string, options: { silent?: boolean } = {}) => {
  if (!options.silent) {
    reportDetailLoading.value = true
    reportDetailError.value = ''
  }
  try {
    reportDetail.value = unwrap(await getReportDetail(reportId))
  } catch (error: any) {
    if (options.silent) {
      console.warn('报表详情后台刷新失败:', error)
    } else {
      reportDetailError.value = error?.message || '报表详情加载失败'
      reportDetail.value = null
    }
  } finally {
    if (!options.silent) reportDetailLoading.value = false
  }
}
const hasPendingReports = () => reportList.value.some(item => item.status === 'queued' || item.status === 'processing')
const refreshPendingReports = async () => {
  if (reportListLoading.value || reportPollingInFlight) return
  reportPollingInFlight = true
  try {
    await loadReportList(false, { silent: true })
    if (selectedReportId.value) await fetchReportDetail(selectedReportId.value, { silent: true })
  } finally {
    reportPollingInFlight = false
  }
}
const syncReportPolling = () => {
  if (hasPendingReports()) {
    if (!reportPollingTimer) reportPollingTimer = setInterval(refreshPendingReports, REPORT_POLL_INTERVAL_MS)
    return
  }
  if (reportPollingTimer) {
    clearInterval(reportPollingTimer)
    reportPollingTimer = null
  }
}
const selectReport = async (reportId: string) => { if (!reportId) return; selectedReportId.value = reportId; reportQuestion.value = ''; clearReportInteraction(); await fetchReportDetail(reportId) }
const applyFilters = async () => { reportFilters.value.page = 1; await loadReportList(true) }
const changePage = async (step: number) => { const nextPage = reportFilters.value.page + step; if (nextPage < 1 || nextPage > totalPages.value) return; reportFilters.value.page = nextPage; await loadReportList() }
const refreshReports = async () => { await loadReportList(); if (selectedReportId.value) await fetchReportDetail(selectedReportId.value) }
const reloadSelectedReport = async () => { if (selectedReportId.value) await fetchReportDetail(selectedReportId.value) }
const viewReportDetail = async () => {
  if (!selectedReportId.value || !isSelectedReportReady.value) return
  previewVisible.value = true
  previewLoading.value = true
  previewError.value = ''
  previewContent.value = ''
  previewTitle.value = selectedReportListItem.value
    ? `${getReportTypeLabel(selectedReportListItem.value.report_type)} · ${selectedReportId.value}`
    : `报表 ${selectedReportId.value}`

  try {
    const blob = await downloadReport(selectedReportId.value, 'md') as unknown as Blob
    const markdown = await blob.text()
    previewContent.value = markdown
    reportNotice.value = { type: 'ok', text: '已打开报表预览。' }
    await fetchReportDetail(selectedReportId.value)
  } catch (error: any) {
    previewError.value = error?.message || '报表预览加载失败。'
    reportNotice.value = { type: 'err', text: previewError.value }
  } finally {
    previewLoading.value = false
  }
}
const downloadReportFile = async () => {
  const reportId = selectedReportId.value || reportDetail.value?.report_id
  if (!reportId || !isSelectedReportReady.value) return
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
    if (selectedReportId.value === reportId) { selectedReportId.value = ''; reportDetail.value = null; reportAiResponse.value = null; reportQuestion.value = '' }
    reportNotice.value = { type: 'ok', text: response.message || '报表已删除。' }
    await loadReportList(true)
  } catch (error: any) {
    reportNotice.value = { type: 'err', text: error?.message || '报表删除失败' }
  } finally {
    deletingReport.value = false
  }
}
const askReportQuestion = async (question: string) => {
  if (!reportDetail.value || !isSelectedReportReady.value) return
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
const syncExternalSelection = async () => {
  registerContext(props.sourceContext)
  if (!props.selectedReportId) return
  await loadReportList()
  await selectReport(props.selectedReportId)
}
watch(() => [props.selectedReportId, props.selectionVersion], syncExternalSelection)
onMounted(async () => { registerContext(props.sourceContext); await loadReportList(true); if (props.selectedReportId) await syncExternalSelection() })
onUnmounted(() => { if (reportPollingTimer) clearInterval(reportPollingTimer) })
</script>

<style scoped>
.workbench {
  --report-blue: #0b4582;
  --report-blue-2: #155fa6;
  --report-ink: #0f172a;
  --report-muted: #667085;
  --report-soft: #f6f9fc;
  --report-line: #dbe5ef;
  --report-line-strong: #c7d6e5;
  --report-danger: #dc2626;
  --report-success: #059669;
  position: relative;
  inset: auto;
  width: 100%;
  min-width: 0;
  height: auto;
  min-height: max-content;
  box-sizing: border-box;
  overflow: visible;
  padding: 22px;
  border: 1px solid var(--report-line);
  border-radius: 22px;
  background:
    radial-gradient(circle at 4% 0%, rgba(11, 69, 130, 0.08), transparent 28%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 14px 38px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  gap: 18px;
  color: var(--report-ink);
  font-family: var(--font-sans);
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
}

.top h3 {
  margin: 0;
  color: var(--report-ink);
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.top p {
  max-width: 860px;
  margin: 8px 0 0;
  color: var(--report-muted);
  font-size: 13px;
  line-height: 1.65;
}

.layout {
  display: grid;
  grid-template-columns: minmax(300px, 0.42fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.right,
.stack {
  display: flex;
  flex-direction: column;
}

.right {
  gap: 18px;
  min-width: 0;
}

.stack {
  gap: 14px;
}

.card,
.box,
.item,
.detail-item,
.metric {
  border: 1px solid var(--report-line);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.94);
}

.card {
  min-width: 0;
  padding: 18px;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.035);
}

.left {
  position: sticky;
  top: 14px;
}

.report-sidebar {
  padding: 20px 16px;
  border-color: #e3edf6;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(30, 64, 175, 0.02);
}

.report-sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding-left: 8px;
}

.report-sidebar-header .header-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #eef6ff;
  color: var(--report-blue);
  font-size: 16px;
}

.report-sidebar-header strong {
  color: #12233d;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.box {
  padding: 16px;
}

.subhead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.subhead strong {
  min-width: 0;
  color: var(--report-ink);
  font-size: 17px;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 100%;
}

.question-actions {
  margin-top: 12px;
}

.filters {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid #e3edf6;
  border-radius: 16px;
  background: #f8fbff;
}

label {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label span {
  color: #52637a;
  font-size: 12px;
  font-weight: 800;
}

textarea {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.workbench-select {
  --select-width: 100%;
  --select-height: 38px;
  --select-padding-x: 12px;
  --select-radius: 12px;
  --select-font-size: 13px;
  --select-font-weight: 600;
  --select-border-color: var(--report-line-strong);
  --select-bg: #ffffff;
  --select-hover-bg: #f8fbff;
  --select-option-active-bg: var(--report-blue);
}

.workbench-textarea {
  --themed-input-height: 96px;
  --themed-input-padding-x: 12px;
  --themed-input-padding-y: 12px;
  --themed-input-radius: 12px;
  --themed-input-font-size: 13px;
  --themed-input-font-weight: 500;
  --themed-input-border: var(--report-line-strong);
  --themed-input-bg: #ffffff;
  --themed-input-hover-bg: #f8fbff;
}

.report-list-nav {
  margin: 0;
  gap: 6px;
}

.report-list-nav :deep(.sliding-indicator) {
  border-radius: 14px;
  background: var(--report-blue);
  box-shadow: 0 16px 30px rgba(7, 34, 73, 0.16);
}

.report-list-nav :deep(.sliding-option) {
  align-items: flex-start;
  min-height: 102px;
  padding: 13px 14px;
  border-radius: 14px;
  color: #56708e;
}

.report-list-nav :deep(.sliding-option:hover:not(.active):not(.disabled)) {
  color: #12233d;
  background: #f7fbff;
  transform: translateX(2px);
}

.report-option-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  margin-top: 1px;
  color: #92a5b8;
  font-size: 16px;
  transition: color 0.22s ease, transform 0.22s ease;
}

.report-option-main {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
}

.report-option-head {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.report-option-head strong {
  min-width: 0;
  color: #12233d;
  font-size: 15px;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.22s ease;
}

.report-option-main small {
  display: block;
  min-width: 0;
  margin-top: 6px;
  color: #506078;
  font-size: 12px;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.22s ease;
}

.report-list-nav :deep(.sliding-option.active) .report-option-icon,
.report-list-nav :deep(.sliding-option.active) .report-option-head strong,
.report-list-nav :deep(.sliding-option.active) .report-option-main small {
  color: #ffffff;
}

.report-list-nav :deep(.sliding-option.active) .report-option-icon {
  transform: scale(1.03);
}

.report-list-nav :deep(.sliding-option.active) .pill {
  border-color: rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

.pill {
  flex: 0 0 auto;
  padding: 4px 9px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.pill.queued {
  background: #f1f5f9;
  color: #475569;
}

.pill.processing {
  background: #eff6ff;
  color: #1d4ed8;
}

.pill.ready {
  background: #ecfdf5;
  color: var(--report-success);
}

.pill.failed {
  background: #fef2f2;
  color: var(--report-danger);
}

.pager {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}

.pager span {
  color: var(--report-muted);
  font-size: 12px;
  white-space: nowrap;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.detail-item,
.metric {
  min-width: 0;
  padding: 15px;
  background: linear-gradient(180deg, #fbfdff, #f6f9fc);
}

.detail-item span,
.metric span {
  display: block;
  margin-bottom: 8px;
  color: #62748b;
  font-size: 12px;
  font-weight: 850;
}

.detail-item strong,
.metric strong {
  display: block;
  max-width: 100%;
  color: var(--report-ink);
  font-size: 17px;
  font-weight: 900;
  line-height: 1.28;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-item.mono strong {
  font-size: 16px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  letter-spacing: -0.03em;
}

.detail-item.range strong {
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: normal;
}

.box p,
.box ul {
  color: #475569;
  font-size: 13px;
  line-height: 1.72;
}

.box p {
  margin: 10px 0 0;
}

.title,
.msg,
.state,
.meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  color: var(--report-blue);
  font-weight: 900;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.metric strong {
  font-size: 17px;
}

.metric small {
  margin-left: 4px;
  color: var(--report-muted);
  font-size: 11px;
}

.msg {
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 700;
}

.msg.ok {
  background: #ecfdf5;
  color: var(--report-success);
}

.msg.err {
  background: #fef2f2;
  color: var(--report-danger);
}

.state {
  justify-content: center;
  min-height: 96px;
  padding: 16px;
  border: 1px dashed var(--report-line-strong);
  border-radius: 16px;
  background: var(--report-soft);
  color: var(--report-muted);
  text-align: center;
}

.report-list-state-enter-active,
.report-list-state-leave-active,
.report-detail-swap-enter-active,
.report-detail-swap-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.28s ease;
}

.report-list-state-enter-from,
.report-list-state-leave-to {
  opacity: 0;
  transform: translateY(8px);
  filter: blur(6px);
}

.report-detail-swap-enter-from {
  opacity: 0;
  transform: translateX(14px);
  filter: blur(8px);
}

.report-detail-swap-leave-to {
  opacity: 0;
  transform: translateX(-10px);
  filter: blur(8px);
}

.meta {
  flex-wrap: wrap;
  color: #94a3b8;
  font-size: 11px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin-top: 10px;
}

.table th,
.table td {
  padding: 9px 10px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  color: #475569;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table th {
  color: var(--report-ink);
  font-weight: 900;
}

.primary,
.secondary {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid transparent;
  cursor: pointer;
  font: 800 13px inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  line-height: 1;
  transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
}

.primary {
  background: linear-gradient(135deg, var(--report-blue), var(--report-blue-2));
  color: #fff;
  box-shadow: 0 10px 18px rgba(11, 69, 130, 0.16);
}

.secondary {
  background: #f4f7fb;
  color: #344054;
  border-color: var(--report-line);
}

.secondary.danger {
  background: #fff5f5;
  color: var(--report-danger);
  border-color: #fecaca;
}

.small {
  min-height: 34px;
  padding: 0 12px;
  font-size: 12px;
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.risk li {
  color: var(--report-danger);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1400px) {
  .layout {
    grid-template-columns: minmax(290px, 0.38fr) minmax(0, 1fr);
  }

  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1180px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .left {
    position: static;
  }
}

@media (max-width: 720px) {
  .workbench {
    padding: 16px;
    border-radius: 18px;
  }

  .top,
  .subhead {
    flex-direction: column;
    align-items: stretch;
  }

  .filters,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .actions,
  .pager {
    justify-content: flex-start;
  }
}
</style>
