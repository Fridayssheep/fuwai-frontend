<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <!-- 头部 - 白色背景 -->
      <div class="modal-header">
        <h3 class="modal-title">导出报表</h3>
        <button class="close-btn" @click="handleClose">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <!-- 内容区域 -->
      <div class="modal-body">
        <div class="format-card" @click="selectFormat('md')">
          <!-- 导出/下载图标（无圆圈） -->
          <div class="format-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          <span class="format-name">Markdown (.md)</span>
        </div>
      </div>
      
      <!-- 底部 -->
      <div class="modal-footer">
        <button class="btn btn-default" @click="handleClose">取消</button>
        <button class="btn btn-primary" @click="handleExport">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          开始导出
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits(['update:visible', 'export'])

const selectedFormat = ref('md')

const selectFormat = (format: string) => {
  selectedFormat.value = format
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleExport = () => {
  emit('export', { format: selectedFormat.value })
  handleClose()
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

/* 头部样式 - 白色背景 */
.modal-header {
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-bottom: 1px solid #F0F0F0;
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #002B54;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

/* 内容区域 */
.modal-body {
  padding: 24px;
  background: white;
}

/* 格式卡片 - 浅蓝色背景 */
.format-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #F0F7FF; /* 浅蓝色背景 */
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.format-card:hover {
  border-color: #005BAC;
  box-shadow: 0 2px 8px rgba(0, 91, 172, 0.1);
}

/* 导出图标 - 无圆圈 */
.format-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4A5568;
  flex-shrink: 0;
}

.format-icon svg {
  width: 22px;
  height: 22px;
}

.format-name {
  font-size: 16px;
  color: #2D3748;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* 底部样式 */
.modal-footer {
  padding: 16px 24px;
  background: #F7F7F7; /* 浅灰色背景 */
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  border-top: 1px solid #EEEEEE;
}

.btn {
  height: 40px;
  padding: 0 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  border: 1px solid transparent;
  transition: all 0.2s;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.btn-default {
  background: white;
  color: #374151;
  border-color: #D1D5DB;
}

.btn-default:hover {
  background: #F9FAFB;
  border-color: #9CA3AF;
}

.btn-primary {
  background: #005BAC;
  color: white;
  border-color: #005BAC;
  box-shadow: 0 2px 4px rgba(0, 91, 172, 0.2);
}

.btn-primary:hover {
  background: #004a8d;
  border-color: #004a8d;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 91, 172, 0.3);
}

.btn-primary:active {
  transform: translateY(0);
}
</style>
