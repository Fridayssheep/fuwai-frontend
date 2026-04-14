<template>
  <div class="table-card">
    <div class="section-title table-head">
      <div>
        <h3>文件展示</h3>
        <span>{{ paginationText }}</span>
      </div>
      <div class="page-size-box">
        <span>每页</span>
        <div class="custom-select" ref="pageSizeRef" @click.stop="pageSizeOpen = !pageSizeOpen">
          <div class="custom-select-trigger">
            <span>{{ pageSize }}</span>
            <Icon icon="lucide:chevron-down" class="select-arrow" :class="{ open: pageSizeOpen }" />
          </div>
          <ul class="custom-select-options" v-show="pageSizeOpen">
            <li v-for="opt in pageSizeOptions" :key="opt" :class="{ selected: pageSize === opt }" @click.stop="setPageSize(opt)">{{ opt }}</li>
          </ul>
        </div>
        <span>条</span>
      </div>
    </div>

    <div v-if="error" class="state-card error-state">
      <p>{{ error }}</p>
      <button class="primary-btn" @click="emit('reload')">重新加载</button>
    </div>

    <div v-else-if="loading" class="state-card loading-state">
      <div class="spinner"></div>
      <p>正在加载文件列表...</p>
    </div>

    <template v-else>
      <div v-if="documents.length === 0" class="state-card empty-state">
        <p>暂无符合条件的文件</p>
        <button class="ghost-btn" @click="emit('reset')">清空筛选</button>
      </div>

      <template v-else>
        <div class="table-wrapper desktop-table">
          <table class="document-table">
            <thead>
              <tr>
                <th>文件名称</th>
                <th>所属数据集</th>
                <th>类型</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="doc in documents" :key="doc.document_id">
                <td>
                  <div class="title-cell">
                    <span class="doc-icon" :class="getFileColorClass(doc.source_type)"><Icon :icon="getFileIcon(doc.source_type)" /></span>
                    <div>
                      <div class="doc-title">{{ doc.title }}</div>
                      <div class="doc-subtitle">ID: {{ doc.document_id }}</div>
                    </div>
                  </div>
                </td>
                <td><span class="tag category-tag">{{ doc.category }}</span></td>
                <td><span class="tag" :class="getFileTagClass(doc.source_type)">{{ formatSourceType(doc.source_type) }}</span></td>
                <td>{{ formatDateTime(doc.updated_at) }}</td>
                <td>
                  <button class="action-btn" @click="emit('download', doc)" title="下载文件">
                    <Icon icon="lucide:download" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mobile-list">
          <article v-for="doc in documents" :key="doc.document_id" class="mobile-card">
            <div class="mobile-top">
              <span class="doc-icon" :class="getFileColorClass(doc.source_type)"><Icon :icon="getFileIcon(doc.source_type)" /></span>
              <div>
                <h4>{{ doc.title }}</h4>
                <p>{{ doc.document_id }}</p>
              </div>
            </div>
            <div class="mobile-tags">
              <span class="tag category-tag">{{ doc.category }}</span>
              <span class="tag" :class="getFileTagClass(doc.source_type)">{{ formatSourceType(doc.source_type) }}</span>
            </div>
            <div class="mobile-meta">更新时间：{{ formatDateTime(doc.updated_at) }}</div>
          </article>
        </div>
      </template>
    </template>

    <div class="pagination-bar">
      <button class="ghost-btn" @click="emit('changePage', pagination.page - 1)" :disabled="loading || pagination.page <= 1">
        上一页
      </button>
      <div class="page-indicator">第 {{ pagination.page }} / {{ totalPages }} 页</div>
      <button
        class="ghost-btn"
        @click="emit('changePage', pagination.page + 1)"
        :disabled="loading || pagination.page >= totalPages"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { KnowledgeDocument } from '../../api/knowledge'
import { formatDateTime, formatSourceType, getFileIcon, getFileColorClass, getFileTagClass } from './utils'

const props = defineProps<{
  documents: KnowledgeDocument[]
  loading: boolean
  error: string
  pagination: { page: number; page_size: number; total: number }
  totalPages: number
  pageSize: number
}>()

const emit = defineEmits<{
  (e: 'changePage', page: number): void
  (e: 'setPageSize', size: number): void
  (e: 'reload'): void
  (e: 'reset'): void
  (e: 'download', doc: KnowledgeDocument): void
}>()

const pageSizeOpen = ref(false)
const pageSizeRef = ref<HTMLElement | null>(null)
const pageSizeOptions = [10, 20, 50, 100]

const paginationText = computed(() => {
  if (!props.pagination.total) return '当前没有数据'
  const start = (props.pagination.page - 1) * props.pagination.page_size + 1
  const end = Math.min(props.pagination.page * props.pagination.page_size, props.pagination.total)
  return `显示 ${start}-${end} 条，共 ${props.pagination.total} 条`
})

const setPageSize = (val: number) => {
  pageSizeOpen.value = false
  emit('setPageSize', val)
}

const closeDropdown = (e: MouseEvent) => {
  if (pageSizeRef.value && !pageSizeRef.value.contains(e.target as Node)) {
    pageSizeOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})
</script>

<style scoped>
.table-card {
  min-height: 0;
  flex: 1;
  background: white;
  border-radius: 16px;
  border: 1px solid #e3edf6;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(30, 64, 175, 0.02);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-wrapper {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border-bottom: none;
}

.section-title {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
}
.section-title h3 {
  margin: 0 0 6px 0;
  font-size: 18px;
  color: #12233d;
}
.section-title span {
  font-size: 13px;
  color: #6a8098;
}

.page-size-box {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #58718d;
}

.custom-select {
  position: relative;
  user-select: none;
}
.custom-select-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #dbe5ef;
  background: #f5f8fc;
  cursor: pointer;
  font-size: 13px;
  color: #16304d;
  font-weight: 600;
  transition: all 0.2s;
  min-width: 56px;
  justify-content: center;
}
.custom-select-trigger:hover {
  border-color: #0b4582;
  background: #eef5fd;
}
.select-arrow {
  font-size: 14px;
  color: #6a8098;
  transition: transform 0.2s;
}
.select-arrow.open {
  transform: rotate(180deg);
}
.custom-select-options {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e3edf6;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(11, 69, 130, 0.12);
  list-style: none;
  padding: 4px;
  margin: 0;
  z-index: 20;
  animation: dropdown-in 0.15s ease;
}
@keyframes dropdown-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.custom-select-options li {
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #334155;
  transition: all 0.15s;
}
.custom-select-options li:hover {
  background: #f0f5fb;
  color: #0b4582;
}
.custom-select-options li.selected {
  background: #0b4582;
  color: white;
  font-weight: 600;
}

.document-table {
  width: 100%;
  border-collapse: collapse;
}
.document-table th, .document-table td {
  padding: 14px 16px;
  text-align: left;
  font-size: 14px;
  color: #17314d;
}
.document-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  color: #6a8098;
  font-weight: 600;
  background: #f9fbfd;
  border-bottom: 2px solid #e3edf6;
}
.document-table td {
  border-bottom: 1px solid #eff4f9;
}
.document-table tbody tr:last-child td {
  border-bottom: none;
}

.title-cell {
  display: flex;
  align-items: center;
  gap: 16px;
}
.doc-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  font-size: 20px;
  flex-shrink: 0;
}
.doc-icon.icon-pdf { background: #fef2f2; color: #dc2626; }
.doc-icon.icon-word { background: #eff6ff; color: #2563eb; }
.doc-icon.icon-excel { background: #f0fdf4; color: #16a34a; }
.doc-icon.icon-md { background: #f5f3ff; color: #7c3aed; }
.doc-icon.icon-ppt { background: #fff7ed; color: #ea580c; }
.doc-icon.icon-txt { background: #f8fafc; color: #64748b; }
.doc-icon.icon-default { background: #f0f5fb; color: #0b4582; }

.doc-title {
  font-weight: 600;
  color: #102741;
  margin-bottom: 4px;
}
.doc-subtitle {
  font-size: 12px;
  color: #8395a7;
  font-family: monospace;
}

.tag {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}
.category-tag { background: #eef5fd; color: #0b5dc0; }
.tag-pdf { background: #fef2f2; color: #dc2626; }
.tag-word { background: #eff6ff; color: #2563eb; }
.tag-excel { background: #f0fdf4; color: #16a34a; }
.tag-md { background: #f5f3ff; color: #7c3aed; }
.tag-default { background: #f1f5f9; color: #475569; }

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid #e1eaf3;
  border-radius: 8px;
  background: white;
  color: #0b4582;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.action-btn:hover {
  background: #eef5fd;
  border-color: #0b4582;
}

.pagination-bar {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eff4f9;
}

.state-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: #6a8098;
}
.spinner {
  width: 32px; height: 32px;
  border: 3px solid #e1eaf3;
  border-top-color: #0b4582;
  border-radius: 50%;
  animation: spin 1s infinite linear;
}
@keyframes spin { to { transform: rotate(360deg); } }

.primary-btn, .ghost-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: 0.2s;
}
.primary-btn {
  background: #0b4582;
  color: white;
  margin-top: 12px;
}
.ghost-btn {
  background: #edf3f9;
  color: #1d3d63;
}

.mobile-list {
  display: none;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}
.mobile-card {
  padding: 16px;
  border-radius: 12px;
  background: white;
  border: 1px solid #e1eaf3;
  box-shadow: 0 2px 8px rgba(30, 64, 175, 0.02);
}
.mobile-top {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}
.mobile-top h4 {
  margin: 0 0 4px 0;
  color: #102741;
  font-size: 15px;
}
.mobile-top p {
  margin: 0;
  font-size: 13px;
  color: #8395a7;
  font-family: monospace;
}
.mobile-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.mobile-meta {
  font-size: 13px;
  color: #6a8098;
}

@media (max-width: 900px) {
  .desktop-table { display: none; }
  .mobile-list { display: flex; }
}
</style>
