<template>
  <main class="knowledge-page">
    <section class="hero-card">
      <div>
        <p class="eyebrow">Knowledge Center</p>
        <h2>知识库文档</h2>
        <p class="hero-desc">接入“获取知识库文档列表”接口，支持关键词搜索、分类筛选和分页浏览。</p>
      </div>
      <div class="hero-stats">
        <div class="stat-card">
          <span class="stat-label">文档总数</span>
          <strong>{{ pagination.total }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">当前分类</span>
          <strong>{{ selectedCategoryLabel }}</strong>
        </div>
      </div>
    </section>

    <section class="toolbar-card">
      <div class="search-box">
        <span class="search-icon">⌕</span>
        <input
          v-model.trim="keyword"
          type="text"
          placeholder="搜索文档标题"
          @keyup.enter="handleSearch"
        />
      </div>
      <button class="primary-btn" @click="handleSearch" :disabled="loading">搜索</button>
      <button class="ghost-btn" @click="resetFilters" :disabled="loading">重置</button>
    </section>

    <section class="category-card">
      <div class="section-title">
        <h3>分类筛选</h3>
        <span>{{ categories.length }} 个分类</span>
      </div>
      <div class="category-list">
        <button
          class="category-pill"
          :class="{ active: selectedCategory === '' }"
          @click="selectCategory('')"
        >
          全部
        </button>
        <button
          v-for="category in categories"
          :key="category"
          class="category-pill"
          :class="{ active: selectedCategory === category }"
          @click="selectCategory(category)"
        >
          {{ category }}
        </button>
      </div>
    </section>

    <section class="table-card">
      <div class="section-title table-head">
        <div>
          <h3>文档列表</h3>
          <span>{{ paginationText }}</span>
        </div>
        <label class="page-size-box">
          <span>每页</span>
          <select v-model.number="pageSize" @change="handlePageSizeChange">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </label>
      </div>

      <div v-if="error" class="state-card error-state">
        <p>{{ error }}</p>
        <button class="primary-btn" @click="reloadDocuments">重新加载</button>
      </div>

      <div v-else-if="loading" class="state-card loading-state">
        <div class="spinner"></div>
        <p>正在加载文档列表...</p>
      </div>

      <template v-else>
        <div v-if="documents.length === 0" class="state-card empty-state">
          <p>暂无符合条件的文档</p>
          <button class="ghost-btn" @click="resetFilters">清空筛选</button>
        </div>

        <template v-else>
          <div class="table-wrapper desktop-table">
            <table class="document-table">
              <thead>
                <tr>
                  <th>文档标题</th>
                  <th>分类</th>
                  <th>来源类型</th>
                  <th>更新时间</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="doc in documents" :key="doc.document_id">
                  <td>
                    <div class="title-cell">
                      <span class="doc-icon">{{ getSourceIcon(doc.source_type) }}</span>
                      <div>
                        <div class="doc-title">{{ doc.title }}</div>
                        <div class="doc-subtitle">文档编号：{{ doc.document_id }}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="tag category-tag">{{ doc.category }}</span></td>
                  <td><span class="tag source-tag">{{ formatSourceType(doc.source_type) }}</span></td>
                  <td>{{ formatDateTime(doc.updated_at) }}</td>
                  <td class="mono">{{ doc.document_id }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mobile-list">
            <article v-for="doc in documents" :key="doc.document_id" class="mobile-card">
              <div class="mobile-top">
                <span class="doc-icon">{{ getSourceIcon(doc.source_type) }}</span>
                <div>
                  <h4>{{ doc.title }}</h4>
                  <p>{{ doc.document_id }}</p>
                </div>
              </div>
              <div class="mobile-tags">
                <span class="tag category-tag">{{ doc.category }}</span>
                <span class="tag source-tag">{{ formatSourceType(doc.source_type) }}</span>
              </div>
              <div class="mobile-meta">更新时间：{{ formatDateTime(doc.updated_at) }}</div>
            </article>
          </div>
        </template>
      </template>

      <div class="pagination-bar">
        <button class="ghost-btn" @click="changePage(pagination.page - 1)" :disabled="loading || pagination.page <= 1">
          上一页
        </button>
        <div class="page-indicator">第 {{ pagination.page }} / {{ totalPages }} 页</div>
        <button
          class="ghost-btn"
          @click="changePage(pagination.page + 1)"
          :disabled="loading || pagination.page >= totalPages"
        >
          下一页
        </button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getKnowledgeDocuments, type KnowledgeDocument, type KnowledgeDocumentListResponse } from '../api/knowledge'

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

const paginationText = computed(() => {
  if (!pagination.value.total) return '当前没有数据'

  const start = (pagination.value.page - 1) * pagination.value.page_size + 1
  const end = Math.min(pagination.value.page * pagination.value.page_size, pagination.value.total)
  return `显示 ${start}-${end} 条，共 ${pagination.value.total} 条`
})

const selectedCategoryLabel = computed(() => selectedCategory.value || '全部')

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

    const categorySet = new Set(categories.value)
    documents.value.forEach((item) => {
      if (item.category) categorySet.add(item.category)
    })
    categories.value = Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'zh-CN'))
  } catch (err: any) {
    console.error('获取知识库文档列表失败:', err)
    error.value = err?.response?.data?.detail || err?.message || '获取知识库文档列表失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  fetchDocuments(1)
}

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

const handlePageSizeChange = () => {
  fetchDocuments(1)
}

const reloadDocuments = () => {
  fetchDocuments()
}

const changePage = (page: number) => {
  if (page < 1 || page > totalPages.value || page === pagination.value.page) return
  fetchDocuments(page)
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '暂无'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

const formatSourceType = (value?: string) => {
  if (!value) return '未标注'

  return value
    .split(/[_-]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

const getSourceIcon = (value?: string) => {
  const source = value?.toLowerCase() || ''

  if (source.includes('pdf')) return 'PDF'
  if (source.includes('markdown') || source.includes('md')) return 'MD'
  if (source.includes('word') || source.includes('doc')) return 'DOC'
  if (source.includes('excel') || source.includes('xls')) return 'XLS'
  return 'DOC'
}

onMounted(() => {
  fetchDocuments(1)
})
</script>

<style scoped>
.knowledge-page {
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 100%;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top left, rgba(213, 236, 255, 0.9), transparent 30%),
    linear-gradient(180deg, #f5f8fb 0%, #eef3f9 100%);
}

.hero-card,
.toolbar-card,
.category-card,
.table-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(207, 220, 232, 0.9);
  border-radius: 24px;
  box-shadow: 0 16px 40px rgba(30, 64, 175, 0.06);
  backdrop-filter: blur(10px);
}

.hero-card {
  padding: 28px;
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
}

.eyebrow {
  margin: 0 0 8px;
  color: #0b4582;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 12px;
  font-weight: 700;
}

.hero-card h2,
.section-title h3 {
  margin: 0;
  color: #12233d;
}

.hero-desc {
  margin: 12px 0 0;
  max-width: 620px;
  color: #56708e;
  line-height: 1.7;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(140px, 1fr));
  gap: 12px;
  width: min(100%, 320px);
}

.stat-card {
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, #f7fbff 0%, #edf4fb 100%);
  border: 1px solid #d8e5f2;
}

.stat-label,
.section-title span,
.mobile-meta,
.doc-subtitle {
  color: #6a8098;
  font-size: 13px;
}

.stat-card strong {
  display: block;
  margin-top: 8px;
  font-size: 24px;
  color: #0f2744;
}

.toolbar-card {
  padding: 18px 20px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 0 14px;
  height: 48px;
  border-radius: 16px;
  background: #f5f8fc;
  border: 1px solid #dbe5ef;
}

.search-box input,
.page-size-box select {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: #16304d;
  font-size: 14px;
}

.search-icon {
  color: #6a8098;
  font-size: 18px;
}

.primary-btn,
.ghost-btn,
.category-pill {
  border: none;
  cursor: pointer;
  transition: 0.2s ease;
  font-size: 14px;
}

.primary-btn,
.ghost-btn {
  height: 44px;
  padding: 0 18px;
  border-radius: 14px;
  font-weight: 600;
}

.primary-btn {
  background: linear-gradient(135deg, #0b4582, #1d78d6);
  color: #fff;
}

.ghost-btn {
  background: #edf3f9;
  color: #1d3d63;
}

.primary-btn:disabled,
.ghost-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.category-card,
.table-card {
  padding: 22px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.category-pill {
  padding: 10px 16px;
  border-radius: 999px;
  background: #f2f6fb;
  color: #31506f;
}

.category-pill.active {
  background: #0b4582;
  color: white;
}

.table-head {
  align-items: flex-end;
}

.page-size-box {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #58718d;
  font-size: 13px;
}

.page-size-box select {
  width: 84px;
  padding: 8px 12px;
  border-radius: 12px;
  background: #f5f8fc;
  border: 1px solid #dbe5ef;
}

.table-wrapper {
  overflow-x: auto;
}

.document-table {
  width: 100%;
  border-collapse: collapse;
}

.document-table th,
.document-table td {
  padding: 16px 14px;
  text-align: left;
  border-bottom: 1px solid #e8eef5;
  color: #17314d;
  font-size: 14px;
  vertical-align: middle;
}

.document-table th {
  color: #6a8098;
  font-weight: 600;
  background: #f8fbfe;
}

.title-cell,
.mobile-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.doc-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, #dcecff, #eff6ff);
  color: #0b4582;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.doc-title {
  font-weight: 700;
  color: #102741;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.category-tag {
  background: #e9f4ff;
  color: #0b5dc0;
}

.source-tag {
  background: #eef7ef;
  color: #2f7d47;
}

.mono {
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
}

.state-card {
  min-height: 240px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: #f8fbfe;
  color: #56708e;
}

.error-state {
  background: #fff6f5;
  color: #b6402f;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #d6e2ef;
  border-top-color: #0b4582;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.page-indicator {
  min-width: 112px;
  text-align: center;
  color: #486481;
  font-size: 14px;
}

.mobile-list {
  display: none;
}

.mobile-card {
  padding: 16px;
  border-radius: 18px;
  background: #f8fbfe;
  border: 1px solid #e3edf6;
}

.mobile-card + .mobile-card {
  margin-top: 12px;
}

.mobile-card h4 {
  margin: 0 0 4px;
  color: #102741;
  font-size: 15px;
}

.mobile-card p,
.mobile-meta {
  margin: 0;
}

.mobile-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 14px 0 10px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 960px) {
  .knowledge-page {
    padding: 20px;
  }

  .hero-card,
  .toolbar-card {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-stats {
    width: 100%;
  }

  .table-head,
  .pagination-bar {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 720px) {
  .desktop-table {
    display: none;
  }

  .mobile-list {
    display: block;
  }

  .toolbar-card {
    padding: 16px;
  }
}
</style>
