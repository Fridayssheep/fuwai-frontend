import request from '../utils/request'

export interface SystemCurrentTimeRequest {
  use_current_time: boolean
  current_time: string | null
  timezone: string | null
}

export interface SystemCurrentTimeResponse {
  use_current_time: boolean
  current_time: string
  timezone: string
  source: 'server_now' | 'custom_time'
}

export const setSystemCurrentTime = (data: SystemCurrentTimeRequest) => {
  return request.post<SystemCurrentTimeResponse>('/system/current-time', data)
}

export interface RuntimeLLMSettings {
  base_url: string
  api_key: string
  api_key_configured: boolean
  model: string
  timeout_seconds: number
  temperature: number
  top_p: number
}

export interface RuntimeRagFlowSettings {
  api_url: string
  api_key: string
  api_key_configured: boolean
  timeout_seconds: number
  chat_model: string
  dataset_ids: string[]
  default_chat_id: string
}

export interface RuntimeAIFeatureSettings {
  enable_history: boolean
  enable_knowledge: boolean
}

export interface RuntimeAISettingsPayload {
  llm: RuntimeLLMSettings
  ragflow: RuntimeRagFlowSettings
  features: RuntimeAIFeatureSettings
}

export interface RuntimeAISettingsResponse extends RuntimeAISettingsPayload {
  config_path: string
}

export const getRuntimeAISettings = () => {
  return request.get<RuntimeAISettingsResponse>('/system/ai-settings')
}

export interface AsyncTaskAcceptedResponse {
  status: string
  message: string
}

export const uploadMetadataDataset = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<AsyncTaskAcceptedResponse>(
    '/dataset/upload/metadata',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
}

export const uploadWeatherDataset = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<AsyncTaskAcceptedResponse>(
    '/dataset/upload/weather',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
}

export const uploadRawMeterDataset = (meterType: string, file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<AsyncTaskAcceptedResponse>(
    `/dataset/upload/raw/${meterType}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
}
