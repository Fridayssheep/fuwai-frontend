import request from '../utils/request'

// ─── 类型定义 ───────────────────────────────────────────

export interface BuildingItem {
  id: string
  building_id: string
  name: string
  site_id: string
  site_name: string
  area: number
  floors: number
  built_year: number
  usage_type: string
  sub_usage: string
  leed_level: string
  energy_star: number
  status: 'normal' | 'warning' | 'standby'
  // 实时运行数据
  total_energy: number
  total_energy_unit: string
  cop: number
  eui: number
  carbon_emission: number
  cop_status: 'good' | 'fair' | 'poor'
}

export interface BuildingListParams {
  page?: number
  page_size?: number
  building_type?: string
  usage?: string
  site_id?: string
  status?: string
  time_range?: string
  sort_by?: 'eui' | 'energy' | 'status'
  sort_order?: 'asc' | 'desc'
  // 高级筛选参数
  min_eui?: number
  max_eui?: number
  min_energy?: number
  max_energy?: number
  leed_level?: string
}

export interface BuildingListResponse {
  total: number
  page: number
  page_size: number
  list: BuildingItem[]
}

export interface BuildingDetail {
  id: string
  building_id: string
  name: string
  site_id: string
  site_name: string
  area: number
  floors: number
  built_year: number
  usage_type: string
  sub_usage: string
  occupancy: number
  leed_level: string
  energy_star: number
  timezone: string
  location: {
    latitude: number
    longitude: number
  }
  status: 'normal' | 'warning' | 'standby'
  // 衍生指标
  cop: number
  eui: number
  total_energy: number
  carbon_emission: number
  carbon_per_area: number
  carbon_per_capita: number
  renewable_ratio: number
  energy_saving_rate: number
  // 运行关键指标
  anomaly_rate: number
  eui_compliance_rate: number
}

export interface EnergySummary {
  building_id: string
  time_range: {
    start: string
    end: string
  }
  total_consumption: number
  peak_demand: number
  average_demand: number
  cop_average: number
  eui_value: number
  carbon_total: number
  cost_estimate: number
  trend: 'up' | 'down' | 'stable'
  trend_percentage: number
}

// ─── API 函数 ───────────────────────────────────────────

/** 获取建筑列表（查询页主接口） */
export const getBuildingList = (params?: BuildingListParams) => {
  return request.get<BuildingListResponse>('/buildings', { 
    params,
    timeout: 30000 
  })
}

/** 获取建筑详情（详情页用） */
export const getBuildingDetail = (id: string) => {
  return request.get<BuildingDetail>(`/buildings/${id}`)
}

/** 获取建筑能耗摘要（卡片展示用） */
export const getBuildingEnergySummary = (id: string, timeRange?: string) => {
  return request.get<EnergySummary>(`/buildings/${id}/energy-summary`, {
    params: { time_range: timeRange }
  })
}

/** 批量获取建筑能耗数据（对比分析用） */
export const getBuildingsComparison = (buildingIds: string[], metric: string = 'eui') => {
  return request.post('/buildings/comparison', {
    building_ids: buildingIds,
    metric
  })
}

/** 获取建筑下拉选项（筛选器用） */
export const getBuildingOptions = () => {
  return request.get<{id: string, name: string, site_name: string}[]>('/buildings/options')
}
