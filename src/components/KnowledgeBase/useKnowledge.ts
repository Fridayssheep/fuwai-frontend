import { ref, computed } from 'vue'
import {
  downloadKnowledgeDocument,
  getKnowledgeDocuments,
  type KnowledgeDocument,
  type KnowledgeDocumentListResponse
} from '../../api/knowledge'

export function useKnowledge() {
  const keyword = ref('')
  const selectedCategory = ref('')
  const pageSize = ref(20)
  const loading = ref(false)
  const error = ref('')

  const documents = ref<KnowledgeDocument[]>([])
  const categories = ref<string[]>([])
  const pagination = ref({
    page: 1,
    page_size: 20,
    total: 0
  })

  const totalPages = computed(() => {
    const pages = Math.ceil(pagination.value.total / pagination.value.page_size)
    return Math.max(1, pages || 1)
  })

  const fetchDocuments = async (page = pagination.value.page) => {
    loading.value = true
    error.value = ''

    try {
      const response = await getKnowledgeDocuments({
        keyword: keyword.value || undefined,
        category: selectedCategory.value || undefined,
        page,
        page_size: pageSize.value
      }) as KnowledgeDocumentListResponse

      documents.value = response.items ?? []
      pagination.value = {
        page: response.pagination?.page ?? page,
        page_size: response.pagination?.page_size ?? pageSize.value,
        total: response.pagination?.total ?? 0
      }

      if (response.categories_available && categories.value.length === 0) {
        categories.value = response.categories_available.sort((a, b) => a.localeCompare(b, 'zh-CN'))
      }
    } catch (err: any) {
      console.error('获取知识库列表失败:', err)
      error.value = err?.message || '获取文档列表失败，请检查网络。'
    } finally {
      loading.value = false
    }
  }

  const handleSearch = () => fetchDocuments(1)
  const resetFilters = () => {
    keyword.value = ''
    selectedCategory.value = ''
    pageSize.value = 20
    fetchDocuments(1)
  }
  const selectCategory = (category: string) => {
    selectedCategory.value = category
    fetchDocuments(1)
  }
  const setPageSize = (val: number) => {
    pageSize.value = val
    fetchDocuments(1)
  }
  const reloadDocuments = () => fetchDocuments(pagination.value.page)
  const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) fetchDocuments(page)
  }

  // 下载文件：统一走后端代理接口
  const downloadFile = async (doc: KnowledgeDocument) => {
    try {
      const blob = await downloadKnowledgeDocument(doc.dataset_id, doc.document_id)
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = doc.title
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch (e) {
      console.error('下载失败:', e)
      alert('文件下载失败，请检查网络或权限。')
    }
  }

  return {
    keyword,
    selectedCategory,
    pageSize,
    loading,
    error,
    documents,
    categories,
    pagination,
    totalPages,
    fetchDocuments,
    handleSearch,
    resetFilters,
    selectCategory,
    setPageSize,
    reloadDocuments,
    changePage,
    downloadFile
  }
}
