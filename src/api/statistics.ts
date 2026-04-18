import request from '../utils/request'

const STATISTICS_QUERY_TIMEOUT = 120000

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

const normalizeEnergyParams = (params?: EnergyQueryParams) => {
    if (!params?.building_ids?.length) return { ...params }
    return { ...params, building_ids: params.building_ids.join(',') }
}

/** 执行通用能耗查询（含 summary: total / peak / peak_time） */
export const getEnergyQuery = (params?: EnergyQueryParams) => {
    return request.get<EnergyQueryResponse>('/energy/query', {
        params: normalizeEnergyParams(params),
        timeout: STATISTICS_QUERY_TIMEOUT
    })
}

/** 获取 COP 计算结果（含 summary: avg_cop / min_cop / max_cop） */
export const getCopAnalysis = (params?: CopAnalysisParams) => {
    return request.get<CopAnalysisResponse>('/energy/cop', {
        params: { ...params },
        timeout: STATISTICS_QUERY_TIMEOUT
    })
}

/** 获取能耗趋势图数据 */
export const getEnergyTrendData = (params?: EnergyTrendParams) => {
    return request.get<EnergyTrendResponse>('/energy/trend', {
        params: { ...params },
        timeout: STATISTICS_QUERY_TIMEOUT
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
    energy?: number | null
    eui?: number | null
    carbon?: number | null
    meter_count?: number | null
    status?: 'normal' | 'warning' | 'fault' | 'offline' | string | null
    status_text?: string | null
}

export interface BuildingListResponse {
    items: Building[]
    pagination: Pagination
}

export interface BuildingListParams {
    keyword?: string
    site_id?: string
    primaryspaceusage?: string
    min_energy?: number
    max_energy?: number
    min_eui?: number
    max_eui?: number
    min_carbon?: number
    max_carbon?: number
    status?: 'normal' | 'warning' | 'fault' | 'offline'
    start_time?: string
    end_time?: string
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
    start_time?: string
    end_time?: string
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
        timeout: STATISTICS_QUERY_TIMEOUT
    })
}

/** 获取建筑详情 */
export const getBuildingById = (buildingId: string) => {
    return request.get<BuildingDetailResponse>(`/buildings/${buildingId}`, {
        timeout: 30000
    })
}

/** 获取设备列表 */
export const getMeters = (params?: MeterListParams) => {
    return request.get<MeterListResponse>('/meters', {
        params: { ...params },
        timeout: STATISTICS_QUERY_TIMEOUT
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
        timeout: 30000
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
        timeout: STATISTICS_QUERY_TIMEOUT
    })
}

// ─── Types: Reports Integration ───────────────────────────────────

export type ReportType = 'daily_summary' | 'weekly_summary' | 'monthly_summary' | 'custom_summary' | 'anomaly_report'

export type ReportStatus = 'queued' | 'processing' | 'ready' | 'failed'

export interface GenerateReportRequest {
    report_type: ReportType
    building_id?: string
    time_range: TimeRange
    include_ai_summary?: boolean
}

export interface GenerateReportResponse {
    report_id: string
    status: ReportStatus
    include_ai_summary?: boolean
    ai_summary_applied?: boolean
    ai_summary_skipped_reason?: string | null
}

export interface ReportStatusResponse {
    report_id: string
    status: ReportStatus
    [key: string]: any
}

export interface ReportHourlyItem {
    hour: string
    total: number
    peak: number
    average: number
}

export interface ReportSummaryMetric {
    key: string
    label: string
    value: number
    unit?: string
}

export interface ReportDetailData {
    hourly_data: ReportHourlyItem[]
    summary_metrics: ReportSummaryMetric[]
}

export interface ReportExportItem {
    format: string
    download_url: string
    content_type?: string
}

export interface ReportDetailResponse {
    report_id: string
    report_type: ReportType | string
    status: ReportStatus
    building_id?: string | null
    time_range: TimeRange
    created_at?: string
    completed_at?: string
    generated_at?: string | null
    summary?: string | null
    ai_summary?: string | null
    download_url?: string | null
    exports?: ReportExportItem[]
    data?: ReportDetailData
}

export interface ReportListItem {
    report_id: string
    report_type: ReportType | string
    status: ReportStatus
    time_range: TimeRange
    building_id?: string | null
    summary?: string | null
    download_url?: string | null
    generated_at?: string | null
    include_ai_summary?: boolean
    ai_summary_applied?: boolean
    ai_summary_skipped_reason?: string | null
    error_message?: string | null
}

export interface ReportListParams {
    report_type?: ReportType
    status?: ReportStatus
    building_id?: string
    page?: number
    page_size?: number
}

export interface ReportListResponse {
    items?: ReportListItem[]
    pagination: Pagination
}

export interface ReportSummaryContext {
    report_id?: string
    building_id?: string | null
    time_range?: TimeRange
    page_context?: {
        source?: string
        page_type?: string
        [key: string]: any
    }
    summary?: string | null
    metrics_snapshot?: Record<string, any> | null
    trend_summary?: string | null
    anomaly_summary?: string | null
    [key: string]: any
}

export interface ReportSummaryRequest {
    question?: string
    report_type?: ReportType | string
    audience?: string
    include_anomaly_insight?: boolean
    include_actions?: boolean
    context: ReportSummaryContext
}

export interface ReportSummaryEvidence {
    source?: string
    source_type?: string
    snippet?: string
    [key: string]: any
}

export interface ReportSummaryAction {
    label: string
    action?: string
    target?: string
    [key: string]: any
}

export interface ReportSummaryMeta {
    model?: string
    generated_at?: string
    confidence?: string
    low_confidence?: boolean
    needs_more_context?: boolean
    [key: string]: any
}

export interface ReportSummaryResponse {
    summary?: string
    highlights?: string[]
    risks?: string[]
    suggestions?: string[]
    evidence?: ReportSummaryEvidence[]
    actions?: ReportSummaryAction[]
    meta?: ReportSummaryMeta
    status?: string
    [key: string]: any
}

export interface DeleteReportResponse {
    report_id: string
    deleted: boolean
    message?: string
}

/** 1. 创建报表生成任务 */
export const generateReport = (data: GenerateReportRequest) => {
    return request.post<GenerateReportResponse>('/reports/generate', data, {
        // 后端只创建任务并立即返回 report_id，实际生成在后台执行。
        timeout: 30000
    })
}

/** 2. 获取报表处理状态 (不下载文件流) */
export const listReports = (params?: ReportListParams) => {
    return request.get<ReportListResponse>('/reports', {
        params: { ...params },
        timeout: 30000
    })
}

export const getReportStatus = (reportId: string) => {
    return request.get<ReportStatusResponse>(`/reports/${reportId}`, {
        params: { download: false },
        timeout: 30000
    })
}

/** 2.5 获取报表详情（含 AI 摘要和结构化数据，用于前端预览） */
export const getReportDetail = (reportId: string) => {
    return request.get<ReportDetailResponse>(`/reports/${reportId}`, {
        timeout: 30000
    })
}

/** 2.6 对已有报表进行 AI 分析 */
export const summarizeReport = (data: ReportSummaryRequest) => {
    return request.post<ReportSummaryResponse>('/ai/report-summary', data, {
        timeout: 120000
    })
}

/** 3. 当准备就绪后，直接获取文件流进行下载 */
export const downloadReport = (reportId: string, format: string = 'md') => {
    return request.get(`/reports/${reportId}`, {
        params: { download: true, format },
        responseType: 'blob', // 关键点：将响应体作为 Blob 读取，以便用于前端下载
        // 下载文件流同样需要充分时间，特别是处于外网或文件较大时
        timeout: 120000
    })
}

/** 4. 删除暂存的报表 */
export const deleteReport = (reportId: string) => {
    return request.delete<DeleteReportResponse>(`/reports/${reportId}`, {
        timeout: 10000
    })
}
