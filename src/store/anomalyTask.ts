import { reactive, ref, toRefs } from 'vue'
import { connectAnomalyProgress, type AnomalyProgressEvent } from '../api/anomaly'

interface TaskState {
  detecting: boolean
  detectProgress: string
  detectLogs: string[]
  detectError: string
}

const STORAGE_KEY = 'fw_anomaly_detect_logs'

const loadLogs = (): string[] => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch { }
  }
  return []
}

const state = reactive<TaskState>({
  detecting: false,
  detectProgress: '',
  detectLogs: loadLogs(),
  detectError: ''
})

let sseSource: EventSource | null = null

const saveLogs = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.detectLogs))
}

/**
 * 关闭当前 SSE 连接（如果存在）。
 * 在新建连接前、组件卸载时、任务完成时调用
 */
const closeSSE = () => {
  if (sseSource) {
    sseSource.close()
    sseSource = null
  }
}

/**
 * 核心逻辑：尝试连接 SSE 并监听进度。
 * 如果已有活跃连接则先关闭旧连接，确保单一 SSE 信道。
 */
export const initAnomalyTaskMonitor = (onComplete?: () => void) => {
  // 强制关闭旧连接，确保不会出现多个 SSE 并行导致进度条鬼畜
  closeSSE()

  sseSource = connectAnomalyProgress(
    (event: AnomalyProgressEvent) => {
      // 收到任何进度信息，都说明任务正在跑
      state.detecting = true
      state.detectProgress = event.message
      
      // 只有新消息才入栈
      if (state.detectLogs[state.detectLogs.length - 1] !== event.message) {
        state.detectLogs.push(event.message)
        if (state.detectLogs.length > 200) state.detectLogs.shift()
        saveLogs()
      }
    },
    (err) => {
      console.warn('异常检测 SSE 监听断开或异常:', err)
      // 如果连接直接关闭（后端无任务/异常），则清理状态
      if (sseSource && sseSource.readyState === EventSource.CLOSED) {
        closeSSE()
        // 不重设 detecting，因为可能只是后端还没开始
      }
    },
    () => {
      // 后端明确发送完成信号
      state.detecting = false
      state.detectProgress = '分析完成'
      state.detectLogs.push('--- 分析任务已完成 ---')
      saveLogs()
      closeSSE()
      if (onComplete) onComplete()
    }
  )
}

export const setDetectingStatus = (status: boolean) => {
  state.detecting = status
  if (status) {
    state.detectError = ''
    state.detectProgress = '初始化任务...'
  }
}

export const setDetectError = (msg: string) => {
  state.detectError = msg
  state.detecting = false
}

export const clearDetectLogs = () => {
  state.detectLogs = []
  saveLogs()
}

/**
 * 关闭 SSE（供组件 onUnmounted 调用）
 */
export const disposeSSE = () => {
  closeSSE()
}

export const useAnomalyTaskStore = () => {
  return {
    ...toRefs(state),
    initAnomalyTaskMonitor,
    setDetectingStatus,
    setDetectError,
    clearDetectLogs,
    disposeSSE
  }
}
