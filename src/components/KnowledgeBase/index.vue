<template>
  <main class="knowledge-page">
    <DatasetSidebar 
      :categories="categories" 
      :selectedCategory="selectedCategory" 
      @select="selectCategory" 
    />

    <section class="document-content">
      <TopToolbar 
        v-model:keyword="keyword" 
        :loading="loading" 
        @search="handleSearch" 
        @reset="resetFilters" 
      />

      <DocumentTable 
        :documents="documents" 
        :loading="loading" 
        :error="error" 
        :pagination="pagination" 
        :totalPages="totalPages" 
        :pageSize="pageSize" 
        @changePage="changePage" 
        @setPageSize="setPageSize" 
        @reload="reloadDocuments" 
        @reset="resetFilters" 
        @download="downloadFile" 
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useKnowledge } from './useKnowledge'
import DatasetSidebar from './DatasetSidebar.vue'
import TopToolbar from './TopToolbar.vue'
import DocumentTable from './DocumentTable.vue'

const {
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
} = useKnowledge()

onMounted(() => {
  fetchDocuments(1)
})
</script>

<style scoped>
.knowledge-page {
  padding: 24px;
  display: flex;
  gap: 24px;
  box-sizing: border-box;
  background: #f4f7fb;
  height: 100%;
  overflow: hidden;
}

.document-content {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

@media (max-width: 900px) {
  .knowledge-page {
    flex-direction: column;
  }
}
</style>
