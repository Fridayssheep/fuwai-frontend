import { ref, reactive, computed, onUnmounted } from 'vue'
import { getCurrentTimeString } from '../../utils/timeManager'
import {
  triggerDetection,
  getDashboardOverview,
  getAnomalyAnalysis,
  aiAnalyzeAnomaly,
  submitAnomalyFeedback,
  connectAnomalyProgress,
  type AnomalySummary,
  type DashboardOverviewResponse,
  type EnergyAnomalyAnalysisResponse,
  type AIAnalyzeAnomalyResponse,
  type AnomalyFeedbackResponse,
  type AnomalyProgressEvent,
  type AICandidateCause
} from '../../api/anomaly'

export type ChartRange = 'day' | 'week' | 'month'

export function useFaultAnalysis() {
  // ─── 时间范围选择 ──────────────────────────────────
  const chartRange = ref<ChartRange>('week')

  const RANGE_MS: Record<ChartRange, number> = {
    day: 1 * 86400000,
    week: 7 * 86400000,
    month: 30 * 86400000
  }

  /** 根据 timeManager 的"现在时间"和选中范围计算时间区间 */
  const getTimeRange = () => {
    const now = new Date(getCurrentTimeString())
    const start = new Date(now.getTime() - RANGE_MS[chartRange.value])
    return {
      end_time: now.toISOString(),
      start_time: start.toISOString()
    }
  }

  /** 切换范围并自动重新拉取 */
  const setChartRange = (range: ChartRange) => {
    chartRange.value = range
    fetchOverview()
  }

  // ─── 概览数据 ──────────────────────────────────────
  const overviewLoading = ref(false)
  const overviewError = ref('')
  const overview = ref<DashboardOverviewResponse | null>(null)
  const anomalyList = computed(() => overview.value?.top_anomalies ?? [])

  const fetchOverview = async () => {
    if (overviewLoading.value) return
    overviewLoading.value = true
    overviewError.value = ''
    try {
      const { start_time, end_time } = getTimeRange()
      const res = await getDashboardOverview({
        start_time,
        end_time,
        chart_range: chartRange.value
      }) as any
      overview.value = res
    } catch (err: any) {
      console.error('获取异常总览失败:', err)
      overviewError.value = err?.response?.data?.detail || err?.message || '获取数据失败'
    } finally {
      overviewLoading.value = false
    }
  }

  // ─── 检测触发 & SSE 进度 ───────────────────────────
  const detecting = ref(false)
  const detectProgress = ref('')
  const detectLogs = reactive<string[]>([])
  const detectError = ref('')
  let sseSource: EventSource | null = null

  const startDetection = async () => {
    if (detecting.value) return
    detecting.value = true
    detectProgress.value = ''
    detectLogs.length = 0
    detectError.value = ''

    try {
      await triggerDetection()

      // SSE 监听进度
      sseSource = connectAnomalyProgress(
        (event: AnomalyProgressEvent) => {
          detectProgress.value = event.message
          detectLogs.push(event.message)
          // 保持日志不超过 200 条
          if (detectLogs.length > 200) detectLogs.splice(0, detectLogs.length - 200)
        },
        (err) => {
          console.warn('SSE 连接异常:', err)
        },
        () => {
          // 完成后自动刷新数据
          detecting.value = false
          detectProgress.value = '分析完成'
          fetchOverview()
        }
      )
    } catch (err: any) {
      detecting.value = false
      detectError.value = err?.response?.data?.detail || err?.message || '触发失败'
      console.error('触发异常检测失败:', err)
    }
  }

  // ─── 选中异常 & 详情加载 ──────────────────────────
  const selectedAnomaly = ref<AnomalySummary | null>(null)
  const detailLoading = ref(false)
  const detailError = ref('')
  const detailData = ref<EnergyAnomalyAnalysisResponse | null>(null)

  const selectAnomaly = async (anomaly: AnomalySummary) => {
    selectedAnomaly.value = anomaly
    // 重置 AI 状态
    aiResult.value = null
    aiError.value = ''
    feedbackResult.value = null
    selectedCause.value = null

    detailLoading.value = true
    detailError.value = ''
    detailData.value = null

    try {
      // 用异常的 building_id 和 meter 请求详细分析
      // 时间范围：以异常发生时间为中心，前3天到后30天作为分析窗口
      const anomalyStart = new Date(anomaly.start_time)
      const rangeStart = new Date(anomalyStart.getTime() - 3 * 86400000)
      const rangeEnd = new Date(anomalyStart.getTime() + 30 * 86400000)
      const res = await getAnomalyAnalysis({
        building_id: anomaly.building_id,
        meter: anomaly.meter || 'electricity',
        time_range: {
          start: rangeStart.toISOString(),
          end: rangeEnd.toISOString()
        }
      }) as any
      detailData.value = res
    } catch (err: any) {
      console.error('加载异常详情失败:', err)
      detailError.value = err?.response?.data?.detail || err?.message || '加载失败'
    } finally {
      detailLoading.value = false
    }
  }

  const clearSelection = () => {
    selectedAnomaly.value = null
    detailData.value = null
    aiResult.value = null
    feedbackResult.value = null
    selectedCause.value = null
  }

  // ─── AI 诊断 ──────────────────────────────────────
  const aiLoading = ref(false)
  const aiError = ref('')
  const aiResult = ref<AIAnalyzeAnomalyResponse | null>(null)

  const runAIDiagnosis = async () => {
    if (!selectedAnomaly.value || !detailData.value) return
    aiLoading.value = true
    aiError.value = ''
    aiResult.value = null
    selectedCause.value = null
    feedbackResult.value = null

    try {
      const res = await aiAnalyzeAnomaly({
        building_id: detailData.value.building_id,
        meter: detailData.value.meter,
        time_range: detailData.value.time_range,
        analysis_mode: detailData.value.analysis_mode || 'offline_event_review',
        include_history_feedback: true,
        max_candidate_causes: 3
      }) as any
      aiResult.value = res
    } catch (err: any) {
      console.error('AI 诊断失败:', err)
      aiError.value = err?.response?.data?.detail || err?.message || 'AI 分析失败'
    } finally {
      aiLoading.value = false
    }
  }

  // ─── 反馈提交 ──────────────────────────────────────
  const selectedCause = ref<AICandidateCause | null>(null)
  const feedbackLoading = ref(false)
  const feedbackError = ref('')
  const feedbackResult = ref<AnomalyFeedbackResponse | null>(null)
  const feedbackComment = ref('')

  const selectCause = (cause: AICandidateCause) => {
    selectedCause.value = cause
  }

  const submitFeedback = async () => {
    if (!aiResult.value || !selectedCause.value || !detailData.value) return
    feedbackLoading.value = true
    feedbackError.value = ''

    try {
      const res = await submitAnomalyFeedback({
        analysis_id: aiResult.value.analysis_id,
        building_id: detailData.value.building_id,
        meter: detailData.value.meter,
        time_range: detailData.value.time_range,
        selected_cause_id: selectedCause.value.cause_id,
        selected_score: Math.round(selectedCause.value.confidence * 100),
        selected_cause_title: selectedCause.value.title,
        candidate_feedbacks: aiResult.value.candidate_causes.map(c => ({
          cause_id: c.cause_id,
          score: c.cause_id === selectedCause.value!.cause_id ? Math.round(c.confidence * 100) : 0,
          title: c.title
        })),
        comment: feedbackComment.value || undefined,
        resolution_status: 'confirmed',
        model_name: aiResult.value.meta?.model,
        analysis_mode: aiResult.value.meta?.analysis_mode
      }) as any
      feedbackResult.value = res
    } catch (err: any) {
      console.error('提交反馈失败:', err)
      feedbackError.value = err?.response?.data?.detail || err?.message || '提交失败'
    } finally {
      feedbackLoading.value = false
    }
  }

  // ─── 统计计算 ─────────────────────────────────────
  const severityStats = computed(() => {
    const list = anomalyList.value
    return {
      total: list.length,
      high: list.filter(a => a.severity === 'high' || a.severity === 'critical').length,
      medium: list.filter(a => a.severity === 'medium' || a.severity === 'warning').length,
      low: list.filter(a => a.severity === 'low' || a.severity === 'info').length
    }
  })

  // ─── 清理 ─────────────────────────────────────────
  onUnmounted(() => {
    sseSource?.close()
  })

  return {
    // 时间范围
    chartRange,
    setChartRange,
    // 概览
    overviewLoading,
    overviewError,
    overview,
    anomalyList,
    fetchOverview,
    // 检测
    detecting,
    detectProgress,
    detectLogs,
    detectError,
    startDetection,
    // 详情
    selectedAnomaly,
    detailLoading,
    detailError,
    detailData,
    selectAnomaly,
    clearSelection,
    // AI
    aiLoading,
    aiError,
    aiResult,
    runAIDiagnosis,
    // 反馈
    selectedCause,
    feedbackLoading,
    feedbackError,
    feedbackResult,
    feedbackComment,
    selectCause,
    submitFeedback,
    // 统计
    severityStats
  }
}
