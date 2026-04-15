import request from '../utils/request'

// ─── Types: Common ───────────────────────────────────────────────
export interface TimeRange {
  start: string
  end: string
}

// ─── Types: Dashboard Overview ───────────────────────────────────
export interface MetricCard {
  key: string
  label: string
  value: number
  unit?: string | null
  change_rate?: number | null
}

export interface AnomalySummary {
  anomaly_id: string
  building_id: string
  device_id?: string | null
  meter?: string
  severity: string
  status: string
  title: string
  start_time: string
}

export interface DashboardOverviewResponse {
  time_range: TimeRange
  metrics: MetricCard[]
  top_anomalies: AnomalySummary[]
  ai_summary_hint?: string
}

// ─── Types: Dashboard Highlights ─────────────────────────────────
export interface HighlightItem {
  type: 'anomaly' | 'insight' | 'task'
  title: string
  description: string
  target?: string
  target_id?: string
}

export interface HighlightsResponse {
  items: HighlightItem[]
}

// ─── Types: Energy Trend ─────────────────────────────────────────
export interface EnergyPoint {
  timestamp: string
  building_id?: string | null
  meter?: string | null
  value: number
}

export interface EnergySeries {
  building_id?: string | null
  meter: string
  unit?: string | null
  points: EnergyPoint[]
}

export interface EnergyTrendResponse {
  time_range: TimeRange
  series: EnergySeries[]
}

// ─── API Functions ───────────────────────────────────────────────

/** 获取 Dashboard 总览数据（KPI 卡片 + 异常摘要 + AI 提示） */
export const getDashboardOverview = (params?: {
  start_time?: string
  end_time?: string
  site_id?: string
  building_id?: string
}) => {
  return request.get<DashboardOverviewResponse>('/dashboard/overview', {
    params: { ...params },
    timeout: 60000
  })
}

/** 获取 Dashboard 首页高亮事项 */
export const getHighlights = (limit: number = 3, params?: {
  start_time?: string
  end_time?: string
  site_id?: string
  building_id?: string
  chart_range?: 'day' | 'week' | 'month'
}) => {
  return request.get<HighlightsResponse>('/dashboard/highlights', {
    params: { limit, ...params }
  })
}

/** 获取能耗趋势图数据 */
export const getEnergyTrend = (params?: {
  building_ids?: string[]
  site_id?: string
  meter?: string
  start_time?: string
  end_time?: string
  granularity?: 'hour' | 'day' | 'week' | 'month'
}) => {
  return request.get<EnergyTrendResponse>('/energy/trend', {
    params: { ...params },
    timeout: 30000
  })
}