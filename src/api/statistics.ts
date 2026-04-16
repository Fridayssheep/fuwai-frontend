import request from '../utils/request'

// ─── Types: Common ───────────────────────────────────────────────
export interface TimeRange {
    start: string
    end: string
}

// ─── Types: Energy Query ─────────────────────────────────────────
export interface EnergyPoint {
    timestamp: string
    building_id?: string | null
    meter?: string | null
    value: number
}

export interface EnergySummary {
    meter: string
    total: number
    average: number
    peak: number
    peak_time?: string | null
    unit: string
}

export interface Pagination {
    page: number
    page_size: number
    total: number
}

export interface EnergyQueryResponse {
    items: EnergyPoint[]
    summary: EnergySummary
    pagination?: Pagination
}

export interface EnergyQueryParams {
    building_ids?: string[]
    site_id?: string
    meter?: string
    start_time?: string
    end_time?: string
    granularity?: 'hour' | 'day' | 'week' | 'month'
    aggregation?: 'raw' | 'sum' | 'avg' | 'min' | 'max'
    page?: number
    page_size?: number
}

// ─── Types: COP Analysis ────────────────────────────────────────
export interface CopPoint {
    timestamp: string
    cop: number
}

export interface CopSummary {
    avg_cop: number
    min_cop: number
    max_cop: number
}

export interface CopAnalysisResponse {
    building_id: string
    time_range: TimeRange
    points: CopPoint[]
    summary?: CopSummary
}

export interface CopAnalysisParams {
    building_id?: string
    start_time?: string
    end_time?: string
    granularity?: 'hour' | 'day' | 'week' | 'month'
}

// ─── Types: Energy Trend ────────────────────────────────────────
export interface EnergyTrendParams {
    building_ids?: string[]
    site_id?: string
    meter?: string
    start_time?: string
    end_time?: string
    granularity?: 'hour' | 'day' | 'week' | 'month'
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

/** 执行通用能耗查询（含 summary: total / peak / peak_time） */
export const getEnergyQuery = (params?: EnergyQueryParams) => {
    return request.get<EnergyQueryResponse>('/energy/query', {
        params: { ...params },
        timeout: 30000
    })
}

/** 获取 COP 计算结果（含 summary: avg_cop / min_cop / max_cop） */
export const getCopAnalysis = (params?: CopAnalysisParams) => {
    return request.get<CopAnalysisResponse>('/energy/cop', {
        params: { ...params },
        timeout: 30000
    })
}

/** 获取能耗趋势图数据 */
export const getEnergyTrendData = (params?: EnergyTrendParams) => {
    return request.get<EnergyTrendResponse>('/energy/trend', {
        params: { ...params },
        timeout: 30000
    })
}

// ─── Types: Buildings ───────────────────────────────────────────
export interface Building {
    building_id: string
    site_id: string
    primaryspaceusage: string
    sub_primaryspaceusage?: string
    sqm?: number
    lat?: number
    lng?: number
    timezone?: string
    yearbuilt?: number | null
    leed_level?: string | null
}

export interface BuildingListResponse {
    items: Building[]
    pagination: Pagination
}

export interface BuildingListParams {
    keyword?: string
    site_id?: string
    primaryspaceusage?: string
    page?: number
    page_size?: number
}

// ─── Types: Meters ──────────────────────────────────────────────
export interface MeterSummary {
    meter_id: string
    meter_name: string
    meter_type: string
    building_id: string
    status: string
}

export interface Meter extends MeterSummary {
    manufacturer?: string | null
    model?: string | null
    install_date?: string | null
    last_seen_at?: string | null
}

export interface MeterListResponse {
    items: Meter[]
    pagination: Pagination
}

export interface MeterListParams {
    building_id?: string
    meter_type?: string
    status?: 'online' | 'offline' | 'warning' | 'fault'
    page?: number
    page_size?: number
}

// ─── Types: Building Detail ─────────────────────────────────────
export interface MeterAvailability {
    meter: string
    available: boolean
}

export interface MetricCard {
    key: string
    label: string
    value: number
    unit?: string
    change_rate?: number
}

export interface BuildingDetailResponse {
    building: Building
    meters: MeterAvailability[]
    summary_metrics: MetricCard[]
}

// ─── External API Functions ────────────────────────────────────

/** 获取建筑列表 */
export const getBuildings = (params?: BuildingListParams) => {
    return request.get<BuildingListResponse>('/buildings', {
        params: { ...params },
        timeout: 10000
    })
}

/** 获取建筑详情 */
export const getBuildingById = (buildingId: string) => {
    return request.get<BuildingDetailResponse>(`/buildings/${buildingId}`, {
        timeout: 10000
    })
}

/** 获取设备列表 */
export const getMeters = (params?: MeterListParams) => {
    return request.get<MeterListResponse>('/meters', {
        params: { ...params },
        timeout: 10000
    })
}

// ─── Types: Meter Detail ────────────────────────────────────────
export interface MeterAlarm {
    alarm_id: string
    meter_id: string
    level: string
    code?: string
    message: string
    status: string
    occurred_at: string
}

export interface MeterDetailResponse {
    meter: Meter
    recent_alarms?: MeterAlarm[]
    recent_metrics?: MetricCard[]
}

/** 获取设备详情 */
export const getMeterById = (meterId: string) => {
    return request.get<MeterDetailResponse>(`/meters/${meterId}`, {
        timeout: 10000
    })
}

// ─── Types: Building Energy Summary ─────────────────────────────
export interface BuildingEnergySummaryParams {
    meter?: 'electricity' | 'water' | 'gas' | 'steam' | 'chilledwater' | 'hotwater' | 'irrigation' | 'solar'
    start_time?: string
    end_time?: string
    granularity?: 'hour' | 'day' | 'week' | 'month'
}

export interface BuildingEnergySummaryResponse {
    building_id: string
    time_range: TimeRange
    summary: EnergySummary
}

/** 获取建筑级能耗摘要 */
export const getBuildingEnergySummary = (buildingId: string, params?: BuildingEnergySummaryParams) => {
    return request.get<BuildingEnergySummaryResponse>(`/buildings/${buildingId}/energy/summary`, {
        params: { ...params },
        timeout: 15000
    })
}
