export type ReportSourceType = 'building' | 'meter'

export interface ReportSourceContext {
  sourceType: ReportSourceType
  sourceId: string
  sourceLabel: string
  buildingId: string
  reportId?: string
}
