import axios from 'axios'
import { getRuntimeAISettings } from './system'

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
  // 1. Fetch runtime AI proxy/credentials dynamically from backend
  const aiSettings: any = await getRuntimeAISettings()
  const ragflowConfig = aiSettings?.ragflow || {}

  if (!ragflowConfig.api_url || !ragflowConfig.api_key) {
    throw new Error('未配置 RAGFlow 服务，请在系统设置中完成相关凭证录入。')
  }

  // Provide clear indication if CORS is an issue in dev tools
  const ragClient = axios.create({
    baseURL: ragflowConfig.api_url.replace(/\/$/, ''),
    headers: {
      'Authorization': `Bearer ${ragflowConfig.api_key}`
    }
  })

  // 2. Fetch all datasets to build the category mapping
  let datasets = []
  try {
    const dsRes = await ragClient.get('/datasets', { params: { page_size: 100 } })
    datasets = dsRes.data.data || []
    if (ragflowConfig.dataset_ids && Array.isArray(ragflowConfig.dataset_ids) && ragflowConfig.dataset_ids.length > 0) {
      datasets = datasets.filter((d: any) => ragflowConfig.dataset_ids.includes(d.id))
    }
  } catch (err: any) {
    console.error('RAGFlow API connection failed:', err)
    if (err.message === 'Network Error') {
      throw new Error('连接 RAGFlow 失败！这通常是因为 RAGFlow 服务器未开启 CORS 跨域请求造成的。请通知运维人员或开启反向代理。')
    }
    throw new Error('拉取知识库分类(数据集)失败，请检查 API Key 是否有效。')
  }

  if (datasets.length === 0) {
    return {
      items: [],
      pagination: {
        page: params.page || 1,
        page_size: params.page_size || 20,
        total: 0
      }
    }
  }

  // 3. Filter specific dataset if Category is selected
  let validDatasets = datasets;
  if (params.category) {
    validDatasets = datasets.filter((d: any) => d.name === params.category)
  }

  let allDocs: KnowledgeDocument[] = []

  // 4. Parallel fetch from selected datasets 
  await Promise.all(validDatasets.map(async (ds: any) => {
    try {
      const docRes = await ragClient.get(`/datasets/${ds.id}/documents`, {
        params: {
          keywords: params.keyword || undefined,
          page: 1,
          page_size: 200
        }
      })
      const dsDocs = docRes.data.data.docs || []
      dsDocs.forEach((doc: any) => {
        // RAGFlow 没有独立的 extension 字段，从文件名提取
        const fileName: string = doc.name || ''
        const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/)
        const ext = extMatch && extMatch[1] ? extMatch[1].toLowerCase() : 'unknown'
        
        // update_time 是毫秒级 Unix 时间戳
        let updatedAt: string | null = null
        if (doc.update_time) {
          updatedAt = new Date(doc.update_time).toISOString()
        } else if (doc.create_time) {
          updatedAt = new Date(doc.create_time).toISOString()
        }
        
        allDocs.push({
          document_id: doc.id,
          dataset_id: ds.id,
          title: fileName,
          category: ds.name,
          source_type: ext,
          updated_at: updatedAt,
          size: doc.size || 0
        })
      })
    } catch (e) {
      console.warn('获取特定数据集文档失败:', ds.id, e)
    }
  }))

  // 5. Software-level sorting and pagination across combined pool
  allDocs.sort((a, b) => {
    const timeA = new Date(a.updated_at || 0).getTime()
    const timeB = new Date(b.updated_at || 0).getTime()
    return timeB - timeA
  })

  const page = params.page || 1
  const pageSize = params.page_size || 20
  const paginatedDocs = allDocs.slice((page - 1) * pageSize, page * pageSize)

  return {
    items: paginatedDocs,
    pagination: {
      page: page,
      page_size: pageSize,
      total: allDocs.length
    },
    categories_available: datasets.map((d: any) => d.name)
  }
}
