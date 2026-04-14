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
  return request.get('/knowledge/documents', { params }) as unknown as Promise<KnowledgeDocumentListResponse>
}
