<template>
  <Teleport to="body">
    <div class="ai-orbit" :class="{ open: isOpen }">
      <button
        ref="triggerRef"
        class="ai-fab"
        :class="{ active: isOpen, busy: isSending }"
        type="button"
        aria-label="打开全局 AI 助手"
        @click="toggleAssistant"
      >
        <span class="fab-scan fab-scan-left" aria-hidden="true"></span>
        <span class="fab-scan fab-scan-right" aria-hidden="true"></span>
        <span class="fab-aura" aria-hidden="true"></span>
        <img src="/character+mini.png" alt="" class="fab-avatar" />
        <span v-if="notificationCount > 0" class="fab-dot">{{ notificationCount > 9 ? '9+' : notificationCount }}</span>
      </button>

      <Transition name="assistant-shell">
        <div v-if="isOpen" ref="panelRef" class="assistant-shell">
          <Transition name="history-sheet">
            <section v-if="showHistory" class="history-sheet">
              <div class="history-head">
                <span class="history-title">历史对话主题</span>
                <button
                  v-if="hasMoreSessions"
                  class="history-more"
                  type="button"
                  :disabled="sessionsLoading"
                  @click="loadSessions(true)"
                >
                  {{ sessionsLoading ? '加载中…' : '查看更多' }}
                </button>
              </div>

              <div v-if="historyError" class="history-error">{{ historyError }}</div>

              <div v-else-if="sessions.length === 0 && !sessionsLoading" class="history-empty">
                <img src="/character.png" alt="" class="history-empty-avatar" />
                <div>
                  <strong>还没有历史会话</strong>
                  <p>第一轮提问会自动创建新的 AI 会话。</p>
                </div>
              </div>

              <div v-else class="history-list">
                <article
                  v-for="session in sessions"
                  :key="session.session_id"
                  class="history-card"
                  :class="{ selected: session.session_id === activeSessionId }"
                  @click="selectSession(session.session_id)"
                >
                  <div class="history-card-main">
                    <div class="history-card-icon">
                      <span></span>
                    </div>
                    <div class="history-card-copy">
                      <h4>{{ session.title || '新会话' }}</h4>
                      <p>{{ session.last_message || buildSessionHint(session) }}</p>
                    </div>
                    <div class="history-card-meta">
                      <span>{{ formatRelativeTime(session.updated_at) }}</span>
                      <button
                        class="history-card-menu"
                        type="button"
                        :aria-label="`更多操作：${session.title}`"
                        @click.stop="toggleHistoryMenu(session.session_id)"
                      >
                        <Icon icon="lucide:ellipsis-vertical" />
                      </button>
                    </div>
                  </div>

                  <Transition name="menu-fade">
                    <div
                      v-if="menuSessionId === session.session_id"
                      class="history-menu"
                      @click.stop
                    >
                      <button
                        class="history-menu-item danger"
                        type="button"
                        :disabled="deletingSessionId === session.session_id"
                        @click.stop="removeSession(session.session_id)"
                      >
                        <Icon icon="lucide:trash-2" />
                        {{ deletingSessionId === session.session_id ? '删除中…' : '删除' }}
                      </button>
                    </div>
                  </Transition>
                </article>
              </div>
            </section>
          </Transition>

          <section class="assistant-panel">
            <header class="assistant-head">
              <div class="assistant-brand">
                <div class="assistant-brand-badge">
                  <Icon icon="lucide:zap" />
                </div>
                <div class="assistant-brand-copy">
                  <h2>RAG 智慧助手</h2>
                  <div class="assistant-brand-status">
                    <span class="status-led" :class="{ busy: isSending }"></span>
                    <span>{{ currentStatusText }}</span>
                  </div>
                </div>
              </div>

              <div class="assistant-actions">
                <button class="head-btn" type="button" title="新对话" @click="startFreshChat">
                  <Icon icon="lucide:message-circle-plus" />
                </button>
                <button class="head-btn" type="button" title="历史会话" @click="toggleHistory">
                  <Icon icon="lucide:history" />
                </button>
                <button class="head-btn close" type="button" title="收起" @click="closeAssistant">
                  <Icon icon="lucide:x" />
                </button>
              </div>
            </header>

            <div v-if="effectiveContext" class="context-ribbon">
              <span class="context-ribbon-label">当前上下文</span>
              <span v-if="effectiveContext.building_id" class="context-chip">
                <Icon icon="lucide:building-2" />
                {{ effectiveContext.building_id }}
              </span>
              <span v-if="effectiveContext.meter" class="context-chip">
                <Icon icon="lucide:gauge" />
                {{ effectiveContext.meter }}
              </span>
              <span v-if="effectiveContext.time_range" class="context-chip">
                <Icon icon="lucide:calendar-range" />
                {{ formatRange(effectiveContext.time_range) }}
              </span>
            </div>

            <div ref="messageScrollerRef" class="assistant-body">
              <div v-if="sessionLoading" class="loading-state">
                <Icon icon="lucide:loader-circle" class="spin" />
                <span>正在载入历史会话…</span>
              </div>

              <template v-else-if="messages.length === 0">
                <div class="welcome-card">
                  <div class="welcome-media">
                    <img src="/character.png" alt="" class="welcome-avatar" />
                    <div class="welcome-glow"></div>
                  </div>
                  <div class="welcome-copy">
                    <p class="welcome-kicker">GLOBAL AI</p>
                    <h3>可以直接问我设备维保、能耗分析或异常排查。</h3>
                    <p>
                      我会自动在知识库、数据查询和故障分析之间选择合适能力，并尽量带上你当前页面的业务上下文。
                    </p>
                  </div>
                </div>

                <div class="prompt-grid">
                  <button
                    v-for="promptItem in promptSuggestions"
                    :key="promptItem"
                    class="prompt-card"
                    type="button"
                    @click="sendQuestion(promptItem)"
                  >
                    <Icon icon="lucide:sparkles" />
                    <span>{{ promptItem }}</span>
                  </button>
                </div>
              </template>

              <template v-else>
                <article
                  v-for="message in messages"
                  :key="message.message_id"
                  class="chat-row"
                  :class="message.role"
                >
                  <div v-if="message.role === 'assistant'" class="avatar-bubble">
                    <img src="/character+mini.png" alt="" />
                  </div>

                  <div class="message-column">
                    <div class="message-bubble" :class="message.role">
                      <div v-if="message.role === 'assistant'" class="bubble-topline">
                        <span class="bubble-tag" :class="message.question_type || 'knowledge'">
                          {{ questionTypeLabel(message.question_type) }}
                        </span>
                        <span class="bubble-time">{{ formatClock(message.created_at) }}</span>
                      </div>

                      <p class="bubble-text">{{ message.content }}</p>

                      <div
                        v-if="message.role === 'assistant' && hasAnyReferences(message.references)"
                        class="reference-cluster"
                      >
                        <div class="reference-title">
                          <span></span>
                          检索来源
                        </div>
                        <div class="reference-list">
                          <button
                            v-for="reference in flattenReferences(message.references)"
                            :key="`${message.message_id}_${reference.source_type}_${reference.document_name}_${reference.chunk_id}_${reference.snippet}`"
                            class="reference-pill"
                            type="button"
                            @click="highlightReference(message.message_id)"
                          >
                            <Icon :icon="iconForReference(reference.source_type)" />
                            <span>{{ reference.document_name || reference.source_type }}</span>
                          </button>
                        </div>
                        <div
                          v-if="highlightedMessageId === message.message_id"
                          class="reference-detail-list"
                        >
                          <div
                            v-for="reference in flattenReferences(message.references)"
                            :key="`${message.message_id}_detail_${reference.source_type}_${reference.document_name}_${reference.chunk_id}_${reference.snippet}`"
                            class="reference-detail"
                          >
                            <strong>{{ reference.document_name || sourceTypeLabel(reference.source_type) }}</strong>
                            <p>{{ reference.snippet }}</p>
                          </div>
                        </div>
                      </div>

                      <div
                        v-if="message.role === 'assistant' && message.suggested_actions.length > 0"
                        class="action-row"
                      >
                        <button
                          v-for="action in message.suggested_actions"
                          :key="`${message.message_id}_${action.action_type}_${action.target}`"
                          class="action-chip"
                          type="button"
                          @click="handleSuggestedAction(action, message)"
                        >
                          <Icon :icon="iconForAction(action.action_type)" />
                          <span>{{ action.label }}</span>
                        </button>
                      </div>

                      <details
                        v-if="message.role === 'assistant' && message.used_tools.length > 0"
                        class="tool-trace"
                      >
                        <summary>本轮调用轨迹</summary>
                        <div class="tool-list">
                          <div
                            v-for="tool in message.used_tools"
                            :key="`${message.message_id}_${tool.tool_name}_${tool.reason}`"
                            class="tool-item"
                          >
                            <strong>{{ tool.tool_name }}</strong>
                            <p>{{ tool.reason }}</p>
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                </article>
              </template>

              <Transition name="status-card">
                <div v-if="isSending" class="status-card">
                  <div class="status-card-head">
                    <Icon icon="lucide:loader-circle" class="spin" />
                    <span>AI 正在编排能力链路</span>
                  </div>
                  <div class="status-feed">
                    <div v-for="item in liveStatuses" :key="`${item.action}_${item.message}`" class="status-line">
                      <span class="status-line-dot"></span>
                      <span>{{ item.message }}</span>
                    </div>
                    <div v-if="liveStatuses.length === 0" class="status-line">
                      <span class="status-line-dot"></span>
                      <span>正在整理上下文并检索相关证据…</span>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>

            <footer class="assistant-foot">
              <div v-if="actionError" class="action-error">{{ actionError }}</div>
              <div class="composer">
                <input
                  ref="inputRef"
                  v-model="draftQuestion"
                  class="composer-input"
                  type="text"
                  placeholder="输入您的问题…"
                  :disabled="isSending"
                  @keyup.enter="sendQuestion()"
                />
                <button
                  class="composer-send"
                  type="button"
                  :disabled="isSending || !draftQuestion.trim()"
                  @click="sendQuestion()"
                >
                  <Icon :icon="isSending ? 'lucide:loader-circle' : 'lucide:send-horizontal'" :class="{ spin: isSending }" />
                </button>
              </div>
            </footer>
          </section>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useRoute, useRouter } from 'vue-router'

import {
  askAIQuestion,
  connectAIStatus,
  deleteAIQASession,
  type AIQAResponse,
  getAIQASessionDetail,
  getAIQASessions,
  type AIQAContext,
  type AIQAReferences,
  type AIQASessionMessage,
  type AIQASessionSummary,
  type AIReferenceItem,
  type AISuggestedAction,
  type AIStatusEvent,
  type AIUsedToolItem
} from '../../api/ai'
import { useGlobalAIContext } from '../../composables/useAIContext'
import { getCurrentTimeString, useTimeManager } from '../../utils/timeManager'

type ChatMessage = {
  message_id: string
  role: 'user' | 'assistant'
  question_type?: string | null
  content: string
  context?: AIQAContext | null
  references: AIQAReferences
  used_tools: AIUsedToolItem[]
  suggested_actions: AISuggestedAction[]
  created_at: string
}

const STORAGE_SESSION_KEY = 'fw_global_ai_session_id'

const router = useRouter()
const route = useRoute()
const { state: timeState } = useTimeManager()
const { context: sharedContext } = useGlobalAIContext()

const isOpen = ref(false)
const showHistory = ref(false)
const sessionsLoading = ref(false)
const sessionLoading = ref(false)
const isSending = ref(false)
const historyError = ref('')
const actionError = ref('')
const draftQuestion = ref('')
const notificationCount = ref(0)
const menuSessionId = ref<string | null>(null)
const deletingSessionId = ref<string | null>(null)
const highlightedMessageId = ref<string | null>(null)

const sessions = ref<AIQASessionSummary[]>([])
const messages = ref<ChatMessage[]>([])
const liveStatuses = ref<AIStatusEvent[]>([])
const pagination = ref({ page: 1, page_size: 20, total: 0 })
const activeSessionId = ref<string | null>(localStorage.getItem(STORAGE_SESSION_KEY))

const panelRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const messageScrollerRef = ref<HTMLElement | null>(null)

let statusStream: EventSource | null = null
let statusCleanupTimer: number | null = null

const emptyReferences = (): AIQAReferences => ({
  knowledge: [],
  data: [],
  history_cases: []
})

const routeContext = computed<AIQAContext | null>(() => {
  const context: AIQAContext = {}
  const routeBuildingId = typeof route.params.id === 'string' ? route.params.id : null
  const queryBuildingId = typeof route.query.building_id === 'string' ? route.query.building_id : null
  const queryMeter = typeof route.query.meter === 'string' ? route.query.meter : null

  if (route.name === 'BuildingDetail' && routeBuildingId) {
    context.building_id = routeBuildingId
  }

  if (queryBuildingId) {
    context.building_id = queryBuildingId
  }

  if (queryMeter) {
    context.meter = queryMeter
  }

  return normalizeContext(context)
})

const effectiveContext = computed<AIQAContext | null>(() => {
  return normalizeContext({
    ...(routeContext.value || {}),
    ...(sharedContext.value || {})
  })
})

const promptSuggestions = computed(() => {
  if (effectiveContext.value?.building_id && effectiveContext.value?.meter) {
    return [
      `分析 ${effectiveContext.value.building_id} 当前 ${effectiveContext.value.meter} 的异常原因`,
      `总结 ${effectiveContext.value.building_id} 最近这段时间的能耗表现`,
      `给出 ${effectiveContext.value.building_id} 的排障建议`
    ]
  }

  if (effectiveContext.value?.building_id) {
    return [
      `建筑 ${effectiveContext.value.building_id} 最近的能耗趋势如何`,
      `建筑 ${effectiveContext.value.building_id} 是否有异常记录`,
      `建筑 ${effectiveContext.value.building_id} 适合关注哪些运维风险`
    ]
  }

  return [
    '帮我查一下最近一周能耗异常的建筑',
    '设备维保规范里冷却水泵效率异常通常怎么排查',
    '给我总结当前系统里最值得关注的能耗风险'
  ]
})

const currentStatusText = computed(() => {
  if (isSending.value && liveStatuses.value.length > 0) {
    return liveStatuses.value.at(-1)?.message || '正在检索相关线索'
  }
  if (isSending.value) {
    return '正在检索相关线索'
  }
  if (effectiveContext.value?.building_id) {
    return `已感知 ${effectiveContext.value.building_id} 上下文`
  }
  return '全局智能检索已就绪'
})

const hasMoreSessions = computed(() => {
  return sessions.value.length < pagination.value.total
})

const normalizeContext = (value: AIQAContext | null | undefined): AIQAContext | null => {
  if (!value) return null

  const next: AIQAContext = {}

  if (value.building_id) next.building_id = value.building_id
  if (value.meter) next.meter = value.meter
  if (value.time_range?.start && value.time_range?.end) {
    next.time_range = {
      start: value.time_range.start,
      end: value.time_range.end
    }
  }

  return Object.keys(next).length > 0 ? next : null
}

const buildSessionHint = (session: AIQASessionSummary) => {
  const hints: string[] = []
  if (session.sticky_context?.building_id) hints.push(session.sticky_context.building_id)
  if (session.sticky_context?.meter) hints.push(session.sticky_context.meter)
  return hints.length > 0 ? hints.join(' · ') : '等待继续提问'
}

const flattenReferences = (references: AIQAReferences): AIReferenceItem[] => {
  return [
    ...references.knowledge,
    ...references.data,
    ...references.history_cases
  ]
}

const hasAnyReferences = (references: AIQAReferences) => {
  return flattenReferences(references).length > 0
}

const sourceTypeLabel = (sourceType: string) => {
  const map: Record<string, string> = {
    knowledge: '知识库',
    data: '数据结果',
    history_case: '历史案例'
  }
  return map[sourceType] || sourceType
}

const questionTypeLabel = (questionType?: string | null) => {
  const map: Record<string, string> = {
    knowledge: '知识问答',
    data_query: '数据查询',
    fault_analysis: '异常诊断',
    mixed: '综合编排',
    error: '异常'
  }
  return map[questionType || 'knowledge'] || questionType || 'AI 回复'
}

const iconForReference = (sourceType: string) => {
  if (sourceType === 'knowledge') return 'lucide:file-text'
  if (sourceType === 'data') return 'lucide:chart-column'
  return 'lucide:history'
}

const iconForAction = (actionType: string) => {
  if (actionType === 'open_page') return 'lucide:arrow-up-right'
  if (actionType === 'view_reference') return 'lucide:book-open-text'
  return 'lucide:square-function'
}

const formatRelativeTime = (isoString: string) => {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} 小时前`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} 天前`

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric'
  }).format(new Date(isoString))
}

const formatClock = (isoString: string) => {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(isoString))
}

const formatRange = (range: { start: string; end: string }) => {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric'
  })
  return `${formatter.format(new Date(range.start))} - ${formatter.format(new Date(range.end))}`
}

const mapSessionMessage = (message: AIQASessionMessage): ChatMessage => {
  return {
    message_id: message.message_id,
    role: message.role,
    question_type: message.question_type,
    content: message.content,
    context: message.context,
    references: message.references || emptyReferences(),
    used_tools: message.used_tools || [],
    suggested_actions: message.suggested_actions || [],
    created_at: message.created_at
  }
}

const makeUserMessage = (question: string): ChatMessage => {
  return {
    message_id: `local_user_${Date.now()}`,
    role: 'user',
    content: question,
    question_type: null,
    context: effectiveContext.value,
    references: emptyReferences(),
    used_tools: [],
    suggested_actions: [],
    created_at: new Date().toISOString()
  }
}

const makeAssistantMessage = (payload: {
  content: string
  questionType?: string | null
  references?: AIQAReferences
  usedTools?: AIUsedToolItem[]
  suggestedActions?: AISuggestedAction[]
}): ChatMessage => {
  return {
    message_id: `local_assistant_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    role: 'assistant',
    content: payload.content,
    question_type: payload.questionType || 'knowledge',
    context: effectiveContext.value,
    references: payload.references || emptyReferences(),
    used_tools: payload.usedTools || [],
    suggested_actions: payload.suggestedActions || [],
    created_at: new Date().toISOString()
  }
}

const focusInput = () => {
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messageScrollerRef.value) {
      messageScrollerRef.value.scrollTop = messageScrollerRef.value.scrollHeight
    }
  })
}

const closeStatusStream = (delay = 0) => {
  if (statusCleanupTimer) {
    window.clearTimeout(statusCleanupTimer)
    statusCleanupTimer = null
  }

  const performClose = () => {
    statusStream?.close()
    statusStream = null
    liveStatuses.value = []
  }

  if (delay > 0) {
    statusCleanupTimer = window.setTimeout(performClose, delay)
    return
  }

  performClose()
}

const openStatusStream = () => {
  closeStatusStream()
  liveStatuses.value = []
  statusStream = connectAIStatus(
    (event) => {
      liveStatuses.value = [...liveStatuses.value, event].slice(-5)
    },
    () => {
      closeStatusStream(0)
    }
  )
}

const loadSessions = async (append = false) => {
  if (sessionsLoading.value) return

  sessionsLoading.value = true
  historyError.value = ''
  const nextPage = append ? pagination.value.page + 1 : 1

  try {
    const data = await getAIQASessions({
      page: nextPage,
      page_size: pagination.value.page_size
    })

    sessions.value = append ? [...sessions.value, ...data.items] : data.items
    pagination.value = data.pagination
  } catch (error: any) {
    historyError.value = error?.response?.data?.detail || error?.message || '加载历史会话失败'
  } finally {
    sessionsLoading.value = false
  }
}

const selectSession = async (sessionId: string) => {
  if (sessionLoading.value || sessionId === activeSessionId.value && messages.value.length > 0) {
    menuSessionId.value = null
    showHistory.value = false
    return
  }

  sessionLoading.value = true
  actionError.value = ''
  highlightedMessageId.value = null

  try {
    const data = await getAIQASessionDetail(sessionId)
    activeSessionId.value = data.session.session_id
    messages.value = data.messages.map(mapSessionMessage)
    showHistory.value = false
    notificationCount.value = 0
    scrollToBottom()
  } catch (error: any) {
    actionError.value = error?.response?.data?.detail || error?.message || '加载会话失败'
  } finally {
    sessionLoading.value = false
    menuSessionId.value = null
  }
}

const startFreshChat = () => {
  activeSessionId.value = null
  messages.value = []
  draftQuestion.value = ''
  liveStatuses.value = []
  actionError.value = ''
  highlightedMessageId.value = null
  notificationCount.value = 0
  showHistory.value = false
  focusInput()
}

const removeSession = async (sessionId: string) => {
  if (deletingSessionId.value) return
  deletingSessionId.value = sessionId

  try {
    await deleteAIQASession(sessionId)
    sessions.value = sessions.value.filter((item) => item.session_id !== sessionId)
    pagination.value.total = Math.max(0, pagination.value.total - 1)

    if (sessionId === activeSessionId.value) {
      startFreshChat()
    }
  } catch (error: any) {
    actionError.value = error?.response?.data?.detail || error?.message || '删除会话失败'
  } finally {
    deletingSessionId.value = null
    menuSessionId.value = null
  }
}

const performAsk = async (question: string, allowRetry = true): Promise<AIQAResponse> => {
  return askAIQuestion({
    question,
    session_id: activeSessionId.value,
    context: effectiveContext.value,
    use_current_time: !timeState.isCustomTime,
    current_time: timeState.isCustomTime ? getCurrentTimeString() : null,
    timezone: timeState.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || null
  }).catch(async (error: any) => {
    if (allowRetry && activeSessionId.value && error?.response?.status === 404) {
      activeSessionId.value = null
      return performAsk(question, false)
    }
    throw error
  })
}

const sendQuestion = async (quickQuestion?: string) => {
  const question = (quickQuestion || draftQuestion.value).trim()
  if (!question || isSending.value) return

  actionError.value = ''
  highlightedMessageId.value = null
  showHistory.value = false
  if (!quickQuestion) {
    draftQuestion.value = ''
  }

  messages.value = [...messages.value, makeUserMessage(question)]
  isSending.value = true
  openStatusStream()
  scrollToBottom()

  try {
    const response = await performAsk(question)
    activeSessionId.value = response.session_id
    messages.value = [
      ...messages.value,
      makeAssistantMessage({
        content: response.answer,
        questionType: response.question_type,
        references: response.references,
        usedTools: response.used_tools,
        suggestedActions: response.suggested_actions
      })
    ]

    notificationCount.value = 0
    await loadSessions()
  } catch (error: any) {
    const message = error?.response?.data?.detail || error?.message || 'AI 助手暂时不可用，请稍后重试。'
    messages.value = [
      ...messages.value,
      makeAssistantMessage({
        content: message,
        questionType: 'error'
      })
    ]
    actionError.value = message
  } finally {
    isSending.value = false
    closeStatusStream(600)
    scrollToBottom()
  }
}

const highlightReference = (messageId: string) => {
  highlightedMessageId.value = highlightedMessageId.value === messageId ? null : messageId
}

const resolveActionRoute = (action: AISuggestedAction, message: ChatMessage) => {
  const context = normalizeContext({
    ...(effectiveContext.value || {}),
    ...(message.context || {})
  })

  if (action.action_type === 'open_page') {
    if (action.target === 'anomaly_detail') {
      return {
        path: '/fault-analysis',
        query: {
          building_id: context?.building_id,
          meter: context?.meter
        }
      }
    }

    if (action.target === '/knowledge' || action.target === 'knowledge') {
      return { path: '/knowledge' }
    }
  }

  if (action.action_type === 'call_api' && action.target) {
    if (action.target.includes('energy') || action.target.includes('/energy/')) {
      if (action.target.includes('query')) {
        return { path: '/query' }
      }
      return { path: '/statistics' }
    }
  }

  return null
}

const handleSuggestedAction = async (action: AISuggestedAction, message: ChatMessage) => {
  actionError.value = ''

  if (action.action_type === 'view_reference') {
    highlightReference(message.message_id)
    return
  }

  const routeLocation = resolveActionRoute(action, message)
  if (routeLocation) {
    await router.push(routeLocation)
    return
  }

  actionError.value = `当前前端还没有为动作 ${action.action_type}${action.target ? ` / ${action.target}` : ''} 配置跳转。`
}

const toggleHistory = async () => {
  showHistory.value = !showHistory.value
  if (showHistory.value && sessions.value.length === 0) {
    await loadSessions()
  }
}

const toggleHistoryMenu = (sessionId: string) => {
  menuSessionId.value = menuSessionId.value === sessionId ? null : sessionId
}

const closeAssistant = () => {
  isOpen.value = false
  showHistory.value = false
  menuSessionId.value = null
}

const toggleAssistant = async () => {
  isOpen.value = !isOpen.value

  if (!isOpen.value) {
    showHistory.value = false
    menuSessionId.value = null
    return
  }

  notificationCount.value = 0
  if (sessions.value.length === 0) {
    await loadSessions()
  }
  if (messages.value.length === 0 && sessions.value.length > 0 && activeSessionId.value) {
    await selectSession(activeSessionId.value)
  }
  if (messages.value.length === 0 && sessions.value.length > 0) {
    showHistory.value = true
  }
  focusInput()
}

const handleDocumentPointerDown = (event: PointerEvent) => {
  if (!isOpen.value) return

  const target = event.target as Node | null
  if (!target) return

  if (panelRef.value?.contains(target) || triggerRef.value?.contains(target)) {
    return
  }

  closeAssistant()
}

const handleDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isOpen.value) {
    closeAssistant()
  }
}

watch(activeSessionId, (value) => {
  if (value) {
    localStorage.setItem(STORAGE_SESSION_KEY, value)
    return
  }
  localStorage.removeItem(STORAGE_SESSION_KEY)
})

watch(
  () => messages.value.length,
  () => {
    scrollToBottom()
  }
)

watch(isOpen, (open) => {
  if (open) {
    focusInput()
  }
})

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
  closeStatusStream()
})
</script>

<style scoped>
.ai-orbit {
  --ai-blue-950: #0b3f79;
  --ai-blue-900: #124f92;
  --ai-blue-700: #2475c9;
  --ai-blue-500: #3ca8ff;
  --ai-surface: rgba(255, 255, 255, 0.92);
  --ai-surface-strong: #ffffff;
  --ai-border: rgba(17, 78, 140, 0.14);
  --ai-shadow: 0 30px 80px rgba(10, 62, 118, 0.24);
  --ai-text: #17324d;
  --ai-text-soft: #67809a;
  --ai-soft-line: rgba(32, 94, 156, 0.09);
  --ai-title-font: 'Iowan Old Style', 'Palatino Linotype', 'Source Han Serif SC', 'Songti SC', serif;
  --ai-body-font: 'Avenir Next', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;

  position: fixed;
  right: 28px;
  bottom: 26px;
  z-index: 1200;
  font-family: var(--ai-body-font);
}

.ai-fab {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 72px;
  height: 72px;
  border: none;
  border-radius: 50%;
  background:
    radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.45), transparent 38%),
    linear-gradient(180deg, #1972cd, #0957a7 70%, #0b4a8c);
  box-shadow:
    0 18px 28px rgba(9, 87, 167, 0.34),
    0 0 0 1px rgba(255, 255, 255, 0.3) inset;
  cursor: pointer;
  display: grid;
  place-items: center;
  overflow: visible;
  transition: transform 260ms ease, box-shadow 260ms ease;
}

.ai-fab:hover {
  transform: translateY(-3px) scale(1.04);
  box-shadow:
    0 24px 38px rgba(9, 87, 167, 0.38),
    0 0 0 1px rgba(255, 255, 255, 0.34) inset;
}

.ai-fab.active {
  transform: scale(0.94);
}

.ai-fab.busy::after {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 1.5px solid rgba(60, 168, 255, 0.36);
  animation: fabPulse 1.5s ease-out infinite;
}

.fab-avatar {
  position: relative;
  z-index: 2;
  width: 38px;
  height: 38px;
  object-fit: contain;
  filter: drop-shadow(0 3px 7px rgba(0, 0, 0, 0.24));
}

.fab-aura {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(60, 168, 255, 0.34), transparent 72%);
  filter: blur(7px);
}

.fab-scan {
  position: absolute;
  inset: 10px;
  border: 2px dashed rgba(255, 255, 255, 0.78);
  border-radius: 28px;
  opacity: 0.8;
}

.fab-scan-left {
  clip-path: inset(0 54% 0 0);
}

.fab-scan-right {
  clip-path: inset(0 0 0 54%);
}

.fab-dot {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: #ff8c1a;
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  box-shadow: 0 8px 18px rgba(255, 140, 26, 0.34);
}

.assistant-shell {
  position: absolute;
  right: 0;
  bottom: 96px;
  width: min(560px, calc(100vw - 312px));
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-sheet,
.assistant-panel {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--ai-border);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 251, 255, 0.92)),
    radial-gradient(circle at top left, rgba(81, 148, 220, 0.08), transparent 36%);
  box-shadow: var(--ai-shadow);
  backdrop-filter: blur(20px);
}

.history-sheet::before,
.assistant-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, transparent 0, transparent 48%, rgba(34, 109, 183, 0.03) 49%, transparent 50%, transparent 100%),
    linear-gradient(90deg, rgba(36, 117, 201, 0.02) 1px, transparent 1px),
    linear-gradient(180deg, rgba(36, 117, 201, 0.02) 1px, transparent 1px);
  background-size: auto, 22px 22px, 22px 22px;
  pointer-events: none;
}

.history-sheet {
  padding: 22px 22px 18px;
}

.history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.history-title {
  font-size: 15px;
  font-weight: 700;
  color: #a8adb5;
}

.history-more {
  border: none;
  background: none;
  color: var(--ai-blue-700);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-card {
  position: relative;
  border: 1px solid rgba(21, 87, 152, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.94);
  padding: 16px 18px;
  cursor: pointer;
  transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
  box-shadow: 0 10px 24px rgba(21, 87, 152, 0.08);
}

.history-card:hover {
  transform: translateY(-2px);
  border-color: rgba(21, 87, 152, 0.2);
}

.history-card.selected {
  border-color: rgba(18, 95, 177, 0.34);
  box-shadow: 0 18px 32px rgba(21, 87, 152, 0.12);
}

.history-card-main {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  align-items: start;
  gap: 14px;
}

.history-card-icon {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(151, 165, 182, 0.5);
  border-radius: 6px;
  display: grid;
  place-items: center;
  margin-top: 2px;
}

.history-card-icon span {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: rgba(17, 78, 140, 0.12);
}

.history-card-copy h4 {
  margin: 0;
  font-size: 15px;
  color: var(--ai-text);
  font-weight: 700;
}

.history-card-copy p {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--ai-text-soft);
  line-height: 1.4;
}

.history-card-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #8ca0b6;
  font-size: 12px;
}

.history-card-menu,
.head-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.12);
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 220ms ease, background-color 220ms ease;
}

.history-card-menu:hover,
.head-btn:hover {
  transform: translateY(-1px);
}

.history-menu {
  position: absolute;
  top: calc(100% - 12px);
  right: 12px;
  min-width: 124px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(17, 78, 140, 0.08);
  box-shadow: 0 16px 40px rgba(17, 78, 140, 0.14);
  z-index: 4;
}

.history-menu-item {
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 10px 12px;
  background: none;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: #ef8e11;
  font-weight: 700;
}

.history-menu-item.danger:hover {
  background: rgba(239, 142, 17, 0.08);
}

.history-empty,
.history-error,
.loading-state {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px;
  border-radius: 20px;
  background: rgba(248, 251, 255, 0.9);
  color: var(--ai-text-soft);
}

.history-empty strong {
  display: block;
  color: var(--ai-text);
  margin-bottom: 4px;
}

.history-empty p {
  margin: 0;
  font-size: 13px;
}

.history-empty-avatar {
  width: 54px;
  height: 54px;
  object-fit: contain;
}

.assistant-panel {
  display: flex;
  flex-direction: column;
  min-height: min(680px, calc(100vh - 170px));
  max-height: min(680px, calc(100vh - 170px));
}

.assistant-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 24px 20px;
  color: white;
  background:
    radial-gradient(circle at top right, rgba(96, 171, 255, 0.28), transparent 28%),
    linear-gradient(135deg, #0a4b8e, #083f7a 62%, #063564);
}

.assistant-head::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.22), transparent);
}

.assistant-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.assistant-brand-badge {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(42, 143, 255, 0.95), rgba(25, 106, 201, 0.9));
  display: grid;
  place-items: center;
  font-size: 22px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.assistant-brand-copy h2 {
  margin: 0;
  font-family: var(--ai-title-font);
  font-size: 30px;
  letter-spacing: 0.02em;
}

.assistant-brand-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 13px;
  color: rgba(227, 238, 247, 0.92);
}

.status-led {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2ac455;
  box-shadow: 0 0 0 6px rgba(42, 196, 85, 0.12);
}

.status-led.busy {
  background: #41b9ff;
  box-shadow: 0 0 0 6px rgba(65, 185, 255, 0.16);
  animation: ledPulse 1.2s ease-in-out infinite;
}

.assistant-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.head-btn.close {
  font-size: 18px;
}

.context-ribbon {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 14px 20px 0;
}

.context-ribbon-label {
  font-size: 12px;
  color: #9bacbe;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.context-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px;
  border-radius: 999px;
  background: rgba(14, 88, 159, 0.06);
  color: var(--ai-blue-900);
  font-size: 12px;
  font-weight: 700;
}

.assistant-body {
  position: relative;
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px 26px;
  background:
    radial-gradient(circle at top left, rgba(81, 148, 220, 0.06), transparent 34%),
    linear-gradient(180deg, rgba(251, 253, 255, 0.94), rgba(247, 251, 255, 0.98));
}

.welcome-card {
  position: relative;
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 18px;
  padding: 20px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(245, 250, 255, 0.96));
  border: 1px solid rgba(17, 78, 140, 0.08);
  box-shadow: 0 18px 42px rgba(17, 78, 140, 0.08);
}

.welcome-media {
  position: relative;
  display: grid;
  place-items: center;
}

.welcome-avatar {
  position: relative;
  z-index: 1;
  width: 84px;
  height: 84px;
  object-fit: contain;
}

.welcome-glow {
  position: absolute;
  width: 86px;
  height: 86px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(58, 157, 255, 0.22), transparent 72%);
  filter: blur(10px);
}

.welcome-kicker {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8ca0b6;
}

.welcome-copy h3 {
  margin: 0 0 10px;
  font-size: 24px;
  line-height: 1.25;
  color: var(--ai-text);
  font-family: var(--ai-title-font);
}

.welcome-copy p {
  margin: 0;
  color: var(--ai-text-soft);
  line-height: 1.75;
}

.prompt-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.prompt-card {
  border: 1px solid rgba(17, 78, 140, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  padding: 14px 16px;
  color: var(--ai-blue-900);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.55;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  text-align: left;
  transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
}

.prompt-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(17, 78, 140, 0.08);
  border-color: rgba(17, 78, 140, 0.16);
}

.chat-row {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
}

.chat-row.user {
  justify-content: flex-end;
}

.avatar-bubble {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(180deg, #e8f3ff, #d9ecff);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.avatar-bubble img {
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.message-column {
  max-width: calc(100% - 56px);
}

.message-bubble {
  position: relative;
  border-radius: 24px;
  padding: 16px 18px;
  box-shadow: 0 18px 34px rgba(17, 78, 140, 0.07);
}

.message-bubble.assistant {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(17, 78, 140, 0.08);
}

.message-bubble.user {
  background: linear-gradient(180deg, #1972cd, #0957a7);
  color: white;
  border-bottom-right-radius: 10px;
}

.bubble-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.bubble-tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(14, 88, 159, 0.08);
  color: var(--ai-blue-900);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.bubble-tag.data_query { background: rgba(28, 130, 119, 0.1); color: #0f7f74; }
.bubble-tag.fault_analysis { background: rgba(240, 112, 37, 0.12); color: #d56b24; }
.bubble-tag.mixed { background: rgba(88, 96, 214, 0.1); color: #4651c4; }
.bubble-tag.error { background: rgba(230, 72, 50, 0.1); color: #d63e2a; }

.bubble-time {
  font-size: 11px;
  color: #98abc0;
}

.bubble-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.78;
  color: inherit;
  font-size: 16px;
}

.reference-cluster {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(17, 78, 140, 0.09);
}

.reference-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 800;
  color: #98abc0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.reference-title span {
  width: 30px;
  height: 1px;
  background: rgba(17, 78, 140, 0.16);
}

.reference-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.reference-pill,
.action-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(17, 78, 140, 0.08);
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff, #f5faff);
  padding: 10px 12px;
  color: var(--ai-blue-900);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 220ms ease, box-shadow 220ms ease;
}

.reference-pill:hover,
.action-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(17, 78, 140, 0.08);
}

.reference-detail-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.reference-detail {
  border-radius: 16px;
  background: rgba(242, 248, 255, 0.88);
  padding: 12px 14px;
}

.reference-detail strong {
  display: block;
  font-size: 13px;
  color: var(--ai-text);
}

.reference-detail p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--ai-text-soft);
  line-height: 1.65;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.tool-trace {
  margin-top: 14px;
  border-top: 1px solid rgba(17, 78, 140, 0.09);
  padding-top: 12px;
}

.tool-trace summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  color: #86a0ba;
}

.tool-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.tool-item {
  border-left: 2px solid rgba(17, 78, 140, 0.12);
  padding-left: 12px;
}

.tool-item strong {
  display: block;
  font-size: 13px;
  color: var(--ai-text);
}

.tool-item p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--ai-text-soft);
  line-height: 1.55;
}

.status-card {
  margin-top: 8px;
  border-radius: 20px;
  padding: 16px 18px;
  background: linear-gradient(180deg, rgba(240, 248, 255, 0.94), rgba(230, 243, 255, 0.94));
  border: 1px solid rgba(26, 126, 219, 0.14);
  box-shadow: 0 18px 32px rgba(17, 78, 140, 0.08);
}

.status-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ai-blue-900);
  font-size: 14px;
  font-weight: 800;
}

.status-feed {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-top: 12px;
}

.status-line {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--ai-text-soft);
}

.status-line-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ai-blue-500);
  box-shadow: 0 0 0 5px rgba(60, 168, 255, 0.1);
}

.assistant-foot {
  padding: 16px 20px 20px;
  border-top: 1px solid rgba(17, 78, 140, 0.08);
  background: rgba(255, 255, 255, 0.88);
}

.action-error {
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(233, 91, 67, 0.08);
  color: #c8442f;
  font-size: 12px;
  line-height: 1.5;
}

.composer {
  display: grid;
  grid-template-columns: 1fr 54px;
  gap: 12px;
  align-items: center;
}

.composer-input {
  height: 54px;
  border-radius: 18px;
  border: 1px solid rgba(17, 78, 140, 0.1);
  background: linear-gradient(180deg, rgba(247, 250, 253, 0.98), rgba(240, 245, 250, 0.92));
  padding: 0 18px;
  font-size: 16px;
  color: var(--ai-text);
  outline: none;
  transition: border-color 220ms ease, box-shadow 220ms ease;
}

.composer-input:focus {
  border-color: rgba(24, 114, 205, 0.3);
  box-shadow: 0 0 0 4px rgba(24, 114, 205, 0.1);
}

.composer-send {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  border: none;
  background: linear-gradient(180deg, #1b77d5, #0957a7);
  color: white;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 18px 28px rgba(9, 87, 167, 0.24);
  transition: transform 220ms ease, box-shadow 220ms ease;
}

.composer-send:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 22px 34px rgba(9, 87, 167, 0.28);
}

.composer-send:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.spin {
  animation: spin 0.8s linear infinite;
}

.assistant-shell-enter-active,
.assistant-shell-leave-active,
.history-sheet-enter-active,
.history-sheet-leave-active,
.status-card-enter-active,
.status-card-leave-active,
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: all 260ms ease;
}

.assistant-shell-enter-from,
.assistant-shell-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.96);
  filter: blur(10px);
}

.history-sheet-enter-from,
.history-sheet-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

.status-card-enter-from,
.status-card-leave-to,
.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes fabPulse {
  0% {
    transform: scale(0.9);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.16);
    opacity: 0;
  }
}

@keyframes ledPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

@media (max-width: 1180px) {
  .assistant-shell {
    width: min(540px, calc(100vw - 72px));
  }
}

@media (max-width: 820px) {
  .ai-orbit {
    right: 16px;
    bottom: 16px;
  }

  .assistant-shell {
    right: -2px;
    width: min(calc(100vw - 24px), 100vw - 24px);
    bottom: 88px;
  }

  .assistant-panel {
    min-height: min(76vh, 680px);
    max-height: min(76vh, 680px);
  }

  .assistant-brand-copy h2 {
    font-size: 24px;
  }

  .prompt-grid {
    grid-template-columns: 1fr;
  }

  .welcome-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .assistant-shell {
    width: calc(100vw - 16px);
    right: -4px;
  }

  .history-sheet {
    padding: 16px;
  }

  .assistant-head {
    padding: 18px 16px;
  }

  .context-ribbon,
  .assistant-body,
  .assistant-foot {
    padding-left: 16px;
    padding-right: 16px;
  }

  .assistant-brand-copy h2 {
    font-size: 22px;
  }

  .message-column {
    max-width: 100%;
  }
}
</style>
