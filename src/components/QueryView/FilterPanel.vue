<template>
  <div class="filter-panel">
    <div class="panel-header">
      <div class="title-area">
        <div class="icon-box">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" style="color: #005BAC;">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
        </div>
        <h2>查询筛选面板</h2>
        
        <div class="alert-badge">
          <span class="dot red"></span>
          <span>系统运行状态：检测到2处紧急故障待处理</span>
        </div>
      </div>
    </div>
    
    <div class="filter-row">
      <!-- 建筑选择（状态筛选） -->
      <div class="filter-item">
        <label>建筑选择</label>
        <select v-model="form.status" class="select-box">
          <option value="">全部</option>
          <option value="normal">正常</option>
          <option value="warning">告警</option>
          <option value="error">异常</option>
        </select>
      </div>

      <!-- 站点选择（改为输入框） -->
      <div class="filter-item">
        <label>站点选择</label>
        <input 
          v-model="form.site" 
          type="text" 
          class="input-box" 
          placeholder="请输入站点名称"
          @keyup.enter="handleSearch"
        />
      </div>

      <div class="button-group">
        <button class="btn btn-primary" @click="handleAdvanced">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
            <line x1="4" y1="21" x2="4" y2="14"></line>
            <line x1="4" y1="10" x2="4" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12" y2="3"></line>
            <line x1="20" y1="21" x2="20" y2="16"></line>
            <line x1="20" y1="12" x2="20" y2="3"></line>
            <line x1="1" y1="14" x2="7" y2="14"></line>
            <line x1="9" y1="8" x2="15" y2="8"></line>
            <line x1="17" y1="16" x2="23" y2="16"></line>
          </svg>
          高级筛选配置
        </button>
        <button class="btn btn-default" @click="handleReset">重置</button>
        <button class="btn btn-outline" @click="handleSearch">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          查询
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

const emit = defineEmits(['search', 'reset', 'advanced'])

// 修改：timeRange 改为 site（站点输入）
const form = reactive({
  status: '',      // 建筑选择（状态筛选：空/normal/warning/error）
  site: ''         // 站点选择（文本输入）
})

// 查询：传递完整表单数据
const handleSearch = () => {
  emit('search', { 
    status: form.status, 
    site: form.site.trim() 
  })
}

// 重置：清空所有条件
const handleReset = () => {
  form.status = ''
  form.site = ''
  emit('reset')
}

// 高级筛选
const handleAdvanced = () => emit('advanced')
</script>

<style scoped>
.filter-panel {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #E5E7EB;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  padding: 20px;
  margin-bottom: 16px;
}

.panel-header {
  margin-bottom: 20px;
}

.title-area {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.icon-box {
  width: 32px;
  height: 32px;
  background: #EFF6FF;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

h2 {
  font-size: 16px;
  font-weight: 600;
  color: #1F2937;
  margin: 0;
}

.alert-badge {
  margin-left: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 6px;
  font-size: 12px;
  color: #DC2626;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #DC2626;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

label {
  font-size: 14px;
  color: #4B5563;
  font-weight: 500;
  white-space: nowrap;
}

.select-box {
  width: 160px;
  height: 36px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  color: #374151;
  background: white;
  outline: none;
  cursor: pointer;
}

/* 新增：输入框样式 */
.input-box {
  width: 200px;
  height: 36px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  color: #374151;
  background: white;
  outline: none;
  transition: all 0.2s;
}

.input-box:focus {
  border-color: #005BAC;
  box-shadow: 0 0 0 3px rgba(0, 91, 172, 0.1);
}

.input-box::placeholder {
  color: #9CA3AF;
}

.button-group {
  margin-left: auto;
  display: flex;
  gap: 12px;
}

.btn {
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: #005BAC;
  color: white;
}

.btn-primary:hover {
  background: #004a8d;
}

.btn-default {
  background: #F3F4F6;
  color: #374151;
  border: 1px solid #D1D5DB;
}

.btn-default:hover {
  background: #E5E7EB;
}

.btn-outline {
  background: white;
  color: #005BAC;
  border: 1px solid #005BAC;
}

.btn-outline:hover {
  background: #F0F7FF;
}
</style>
