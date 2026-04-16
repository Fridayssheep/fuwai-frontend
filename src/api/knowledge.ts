import request from '../utils/request'

export interface KnowledgeDocument {
  document_id: string
  dataset_id: string
  title: string
  category: string
  source_type?: string
  updated_at?: string | null
  size?: number
}

export interface KnowledgePagination {
  page: number
  page_size: number
  total: number
}

export interface KnowledgeDocumentListResponse {
  items: KnowledgeDocument[]
  pagination: KnowledgePagination
  categories_available?: string[]
}

export interface KnowledgeDocumentListParams {
  keyword?: string
  category?: string
  page?: number
  page_size?: number
}

export const getKnowledgeDocuments = async (params: KnowledgeDocumentListParams): Promise<KnowledgeDocumentListResponse> => {
  return request.get('/knowledge/documents', {
    params
  }) as Promise<KnowledgeDocumentListResponse>
}

export const downloadKnowledgeDocument = (datasetId: string, documentId: string) => {
  return request.get(
    `/knowledge/datasets/${encodeURIComponent(datasetId)}/documents/${encodeURIComponent(documentId)}/download`,
    {
      responseType: 'blob',
      timeout: 60000
    }
  ) as Promise<Blob>
}
