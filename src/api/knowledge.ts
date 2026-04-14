import request from '../utils/request'

export interface KnowledgeDocument {
  document_id: string
  title: string
  category: string
  source_type?: string
  updated_at?: string | null
}

export interface KnowledgePagination {
  page: number
  page_size: number
  total: number
}

export interface KnowledgeDocumentListResponse {
  items: KnowledgeDocument[]
  pagination: KnowledgePagination
}

export interface KnowledgeDocumentListParams {
  keyword?: string
  category?: string
  page?: number
  page_size?: number
}

export const getKnowledgeDocuments = (params: KnowledgeDocumentListParams) => {
  // 注意这里的泛型 <any, KnowledgeDocumentListResponse>
  return request.get<any, KnowledgeDocumentListResponse>('/knowledge/documents', { params })
}
