import { ref, computed, onUnmounted, watch } from 'vue'
import { getCurrentTimeString } from '../../utils/timeManager'
import { useAnomalyTaskStore } from '../../store/anomalyTask'
import {
  triggerDetection,
  getEnergyAnomalies,
  getAnomalyAnalysis,
  aiAnalyzeAnomaly,
  submitAnomalyFeedback,
  type AnomalySummary,
  type EnergyAnomalyListResponse,
  type EnergyAnomalyAnalysisResponse,
  type AIAnalyzeAnomalyResponse,
  type AnomalyFeedbackResponse,
  type AICandidateCause
} from '../../api/anomaly'

export type ChartRange = 'day' | 'week' | 'month'

const DEFAULT_PAGINATION = { page: 1, page_size: 10, total: 0 }
const AI_STATE_CACHE_KEY = 'fw_fault_analysis_ai_state_cache_v1'

type CachedAIState = {
  aiError: string
  aiResult: AIAnalyzeAnomalyResponse | null
  selectedCauseId: string | null
  feedbackError: string
  feedbackResult: AnomalyFeedbackResponse | null
  feedbackComment: string
  aiLoading?: boolean
  feedbackLoading?: boolean
}

const loadCachedAIStateMap = (): Record<string, CachedAIState> => {
  try {
    const raw = sessionStorage.getItem(AI_STATE_CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function useFaultAnalysis() {
  const { 
    detecting, 
    detectProgress, 
    detectLogs, 
    detectError, 
    initAnomalyTaskMonitor,
    setDetectingStatus,
    setDetectError,
    clearDetectLogs,
    disposeSSE
  } = useAnomalyTaskStore()

  // 组件卸载时关闭 SSE 连接
  onUnmounted(() => {
    disposeSSE()
  })

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
    loadOverview(1)
  }

  // ─── 概览数据 ──────────────────────────────────────
  const overviewLoading = ref(false)
  const overviewError = ref('')
  const overview = ref<EnergyAnomalyListResponse | null>(null)
  const anomalyList = computed(() => overview.value?.items ?? [])
  const pagination = computed(() => overview.value?.pagination ?? DEFAULT_PAGINATION)
  const totalPages = computed(() => Math.max(1, Math.ceil(pagination.value.total / pagination.value.page_size)))

  const loadOverview = async (page = pagination.value.page) => {
    if (overviewLoading.value) return
    overviewLoading.value = true
    overviewError.value = ''
    try {
      const { start_time, end_time } = getTimeRange()
      const res = await getEnergyAnomalies({
        start_time,
        end_time,
        page,
        page_size: pagination.value.page_size
      }) as any
      overview.value = res

      if (selectedAnomaly.value) {
        const matched = res?.items?.find((item: AnomalySummary) => item.anomaly_id === selectedAnomaly.value?.anomaly_id)
        if (matched) {
          selectedAnomaly.value = matched
        } else {
          clearSelection()
        }
      }
    } catch (err: any) {
      console.error('获取异常总览失败:', err)
      overviewError.value = err?.response?.data?.detail || err?.message || '获取数据失败'
    } finally {
      overviewLoading.value = false
    }
  }

  const fetchOverview = async () => {
    await loadOverview(pagination.value.page)
  }

  const changePage = (page: number) => {
    if (overviewLoading.value) return
    if (page < 1 || page > totalPages.value) return
    loadOverview(page)
  }

  // ─── 检测触发 & SSE 进度 ───────────────────────────
  const startDetection = async () => {
    if (detecting.value) return
    
    // 关闭旧的 SSE 连接，防止重复连接导致进度条鬼畜
    disposeSSE()
    setDetectingStatus(true)
    clearDetectLogs()

    try {
      await triggerDetection()
      // 建立新的单一 SSE 连接监听进度
      initAnomalyTaskMonitor(() => {
        // 完成后的回调
        fetchOverview()
      })
    } catch (err: any) {
      setDetectError(err?.response?.data?.detail || err?.message || '触发失败')
      console.error('触发异常检测失败:', err)
    }
  }

  // ─── 选中异常 & 详情加载 ──────────────────────────
  const selectedAnomaly = ref<AnomalySummary | null>(null)
  const detailLoading = ref(false)
  const detailError = ref('')
  const detailData = ref<EnergyAnomalyAnalysisResponse | null>(null)
  const aiStateCache = ref<Record<string, CachedAIState>>(loadCachedAIStateMap())

  const persistCachedAIStateMap = () => {
    try {
      const serializable = Object.fromEntries(
        Object.entries(aiStateCache.value).map(([anomalyId, state]) => [
          anomalyId,
          {
            aiError: state.aiError,
            aiResult: state.aiResult,
            selectedCauseId: state.selectedCauseId,
            feedbackError: state.feedbackError,
            feedbackResult: state.feedbackResult,
            feedbackComment: state.feedbackComment
          }
        ])
      )
      sessionStorage.setItem(AI_STATE_CACHE_KEY, JSON.stringify(serializable))
    } catch {
      // ignore cache persistence failures
    }
  }

  const clearCurrentAIState = () => {
    aiLoading.value = false
    aiError.value = ''
    aiResult.value = null
    selectedCause.value = null
    feedbackLoading.value = false
    feedbackError.value = ''
    feedbackResult.value = null
    feedbackComment.value = ''
  }

  const applyCachedAIState = (anomalyId: string | null) => {
    if (!anomalyId) {
      clearCurrentAIState()
      return
    }

    const cached = aiStateCache.value[anomalyId]
    if (!cached) {
      clearCurrentAIState()
      return
    }

    aiLoading.value = !!cached.aiLoading
    aiError.value = cached.aiError || ''
    aiResult.value = cached.aiResult || null
    feedbackLoading.value = !!cached.feedbackLoading
    feedbackError.value = cached.feedbackError || ''
    feedbackResult.value = cached.feedbackResult || null
    feedbackComment.value = cached.feedbackComment || ''
    selectedCause.value =
      cached.selectedCauseId && cached.aiResult
        ? cached.aiResult.candidate_causes.find(cause => cause.cause_id === cached.selectedCauseId) || null
        : null
  }

  const updateCachedAIState = (anomalyId: string, patch: Partial<CachedAIState>) => {
    const previous = aiStateCache.value[anomalyId] || {
      aiError: '',
      aiResult: null,
      selectedCauseId: null,
      feedbackError: '',
      feedbackResult: null,
      feedbackComment: '',
      aiLoading: false,
      feedbackLoading: false
    }
    aiStateCache.value = {
      ...aiStateCache.value,
      [anomalyId]: {
        ...previous,
        ...patch
      }
    }
    persistCachedAIStateMap()
  }

  const selectAnomaly = async (anomaly: AnomalySummary) => {
    selectedAnomaly.value = anomaly
    applyCachedAIState(anomaly.anomaly_id)

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
    clearCurrentAIState()
  }

  // ─── AI 诊断 ──────────────────────────────────────
  const aiLoading = ref(false)
  const aiError = ref('')
  const aiResult = ref<AIAnalyzeAnomalyResponse | null>(null)

  const runAIDiagnosis = async () => {
    if (!selectedAnomaly.value || !detailData.value) return
    const anomalyId = selectedAnomaly.value.anomaly_id
    aiLoading.value = true
    aiError.value = ''
    aiResult.value = null
    selectedCause.value = null
    feedbackResult.value = null
    feedbackError.value = ''
    feedbackComment.value = ''
    updateCachedAIState(anomalyId, {
      aiLoading: true,
      aiError: '',
      aiResult: null,
      selectedCauseId: null,
      feedbackError: '',
      feedbackResult: null,
      feedbackComment: ''
    })

    try {
      const res = await aiAnalyzeAnomaly({
        building_id: detailData.value.building_id,
        meter: detailData.value.meter,
        time_range: detailData.value.time_range,
        analysis_mode: detailData.value.analysis_mode || 'offline_event_review',
        include_history_feedback: true,
        max_candidate_causes: 3
      }) as any
      updateCachedAIState(anomalyId, {
        aiLoading: false,
        aiError: '',
        aiResult: res,
        selectedCauseId: null,
        feedbackError: '',
        feedbackResult: null
      })
      if (selectedAnomaly.value?.anomaly_id === anomalyId) {
        aiResult.value = res
      }
    } catch (err: any) {
      console.error('AI 诊断失败:', err)
      const errorMessage = err?.response?.data?.detail || err?.message || 'AI 分析失败'
      updateCachedAIState(anomalyId, {
        aiLoading: false,
        aiError: errorMessage
      })
      if (selectedAnomaly.value?.anomaly_id === anomalyId) {
        aiError.value = errorMessage
      }
    } finally {
      if (selectedAnomaly.value?.anomaly_id === anomalyId) {
        aiLoading.value = false
      }
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
    if (selectedAnomaly.value) {
      updateCachedAIState(selectedAnomaly.value.anomaly_id, {
        selectedCauseId: cause.cause_id
      })
    }
  }

  const submitFeedback = async () => {
    if (!aiResult.value || !selectedCause.value || !detailData.value) return
    const anomalyId = selectedAnomaly.value?.anomaly_id
    feedbackLoading.value = true
    feedbackError.value = ''
    if (anomalyId) {
      updateCachedAIState(anomalyId, {
        feedbackLoading: true,
        feedbackError: '',
        feedbackComment: feedbackComment.value
      })
    }

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
      if (anomalyId) {
        updateCachedAIState(anomalyId, {
          feedbackLoading: false,
          feedbackError: '',
          feedbackResult: res,
          feedbackComment: ''
        })
      }

      // 核心修复：反馈成功后同步更新列表状态，实现全站联动
      if (overview.value?.items && selectedAnomaly.value) {
        const target = overview.value.items.find(
          a => a.anomaly_id === selectedAnomaly.value!.anomaly_id
        )
        if (target) {
          // 强制修改响应式对象中的状态
          target.resolution_status = 'confirmed'
        }
        // 同时也更新当前选中对象的副本状态
        selectedAnomaly.value.resolution_status = 'confirmed'
      }
      
      // 清空评论
      feedbackComment.value = ''
      
    } catch (err: any) {
      console.error('提交反馈失败:', err)
      const errorMessage = err?.response?.data?.detail || err?.message || '提交失败'
      feedbackError.value = errorMessage
      if (anomalyId) {
        updateCachedAIState(anomalyId, {
          feedbackLoading: false,
          feedbackError: errorMessage,
          feedbackComment: feedbackComment.value
        })
      }
    } finally {
      feedbackLoading.value = false
    }
  }

  watch(feedbackComment, value => {
    if (!selectedAnomaly.value) return
    updateCachedAIState(selectedAnomaly.value.anomaly_id, {
      feedbackComment: value
    })
  })

  // ─── 统计计算 ─────────────────────────────────────
  const severityStats = computed(() => {
    const stats = overview.value?.severity_stats
    if (stats) {
      return stats
    }
    const list = anomalyList.value
    return {
      total: list.length,
      high: list.filter(a => a.severity === 'high' || a.severity === 'critical').length,
      medium: list.filter(a => a.severity === 'medium' || a.severity === 'warning').length,
      low: list.filter(a => a.severity === 'low' || a.severity === 'info').length
    }
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
    pagination,
    totalPages,
    fetchOverview,
    changePage,
    // 检测
    detecting,
    detectProgress,
    detectLogs,
    detectError,
    startDetection,
    initAnomalyTaskMonitor,
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
