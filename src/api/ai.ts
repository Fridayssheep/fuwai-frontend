import request from '../utils/request'

export interface TimeRange {
  start: string
  end: string
}

export interface Pagination {
  page: number
  page_size: number
  total: number
}

export interface AIQAContext {
  building_id?: string | null
  meter?: string | null
  time_range?: TimeRange | null
}

export interface AIReferenceItem {
  source_type: string
  document_id?: string | null
  document_name?: string | null
  chunk_id?: string | null
  snippet: string
  score?: number | null
}

export interface AIQAReferences {
  knowledge: AIReferenceItem[]
  data: AIReferenceItem[]
  history_cases: AIReferenceItem[]
}

export interface AIUsedToolItem {
  tool_name: string
  tool_type: string
  reason: string
}

export interface AISuggestedAction {
  label: string
  action_type: string
  target?: string | null
}

export interface AIQAMeta {
  provider: string
  model: string
  generated_at: string
  used_tools_count: number
  has_references: boolean
  stage_timings_ms: Record<string, number>
}

export interface AIQARequest {
  use_current_time?: boolean
  current_time?: string | null
  timezone?: string | null
  question: string
  session_id?: string | null
  context?: AIQAContext | null
}

export interface AIQAResponse {
  session_id: string
  answer: string
  question_type: string
  references: AIQAReferences
  used_tools: AIUsedToolItem[]
  suggested_actions: AISuggestedAction[]
  meta: AIQAMeta
}

export interface AIQASessionSummary {
  session_id: string
  title: string
  last_question_type?: string | null
  sticky_context?: AIQAContext | null
  last_message?: string | null
  message_count: number
  created_at: string
  updated_at: string
}

export interface AIQASessionMessage {
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

export interface AIQASessionListResponse {
  items: AIQASessionSummary[]
  pagination: Pagination
}

export interface AIQASessionDetailResponse {
  session: AIQASessionSummary
  messages: AIQASessionMessage[]
}

export interface AIQASessionDeleteResponse {
  session_id: string
  deleted: boolean
  message: string
}

export interface AIStatusEvent {
  action: string
  message: string
  context: string
}

export const askAIQuestion = (payload: AIQARequest) => {
  return request.post<AIQAResponse, AIQAResponse>('/ai/qa', payload, {
    timeout: 120000
  })
}

export const getAIQASessions = (params?: {
  page?: number
  page_size?: number
}) => {
  return request.get<AIQASessionListResponse, AIQASessionListResponse>('/ai/qa/sessions', {
    params
  })
}

export const getAIQASessionDetail = (sessionId: string) => {
  return request.get<AIQASessionDetailResponse, AIQASessionDetailResponse>(`/ai/qa/sessions/${sessionId}`)
}

export const deleteAIQASession = (sessionId: string) => {
  return request.delete<AIQASessionDeleteResponse, AIQASessionDeleteResponse>(`/ai/qa/sessions/${sessionId}`)
}

export const connectAIStatus = (
  onMessage: (event: AIStatusEvent) => void,
  onError?: (event: Event) => void
): EventSource => {
  const es = new EventSource('/api/ai/status')

  es.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data) as AIStatusEvent
      onMessage(payload)
    } catch (error) {
      console.warn('AI status SSE parse error:', error)
    }
  }

  es.onerror = (event) => {
    onError?.(event)
  }

  return es
}
