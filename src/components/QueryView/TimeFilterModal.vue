<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <!-- 头部 -->
      <div class="modal-header">
        <div class="header-title">
          <div class="icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#005BAC" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <h3>时间维度配置</h3>
            <p class="subtitle">配置数据查询的时间范围</p>
          </div>
        </div>
        <button class="close-btn" @click="handleClose">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- 内容区域 -->
      <div class="modal-body">
        <!-- 快捷范围 -->
        <div class="section">
          <div class="section-title">
            <span class="title-dot"></span>
            <span>快捷范围</span>
          </div>
          <div class="quick-range">
            <button 
              v-for="range in timeRanges" 
              :key="range.value"
              @click="form.timeRange = range.value"
              :class="['range-btn', { active: form.timeRange === range.value }]"
            >
              {{ range.label }}
            </button>
          </div>
        </div>

        <!-- 精确时间 -->
        <div class="section">
          <div class="section-title">
            <span class="title-dot"></span>
            <span>精确时间</span>
          </div>
          <div class="precise-time">
            <div class="time-block">
              <label>开始时间</label>
              <div class="time-inputs">
                <input type="text" v-model="form.startTime.year" class="time-input" placeholder="2023" />
                <span class="time-unit">年</span>
                <input type="text" v-model="form.startTime.month" class="time-input" placeholder="10" />
                <span class="time-unit">月</span>
                <input type="text" v-model="form.startTime.day" class="time-input" placeholder="01" />
                <span class="time-unit">日</span>
                <input type="text" v-model="form.startTime.hour" class="time-input" placeholder="00" />
                <span class="time-unit">时</span>
              </div>
            </div>
            <div class="time-block">
              <label>结束时间</label>
              <div class="time-inputs">
                <input type="text" v-model="form.endTime.year" class="time-input" placeholder="2023" />
                <span class="time-unit">年</span>
                <input type="text" v-model="form.endTime.month" class="time-input" placeholder="10" />
                <span class="time-unit">月</span>
                <input type="text" v-model="form.endTime.day" class="time-input" placeholder="31" />
                <span class="time-unit">日</span>
                <input type="text" v-model="form.endTime.hour" class="time-input" placeholder="23" />
                <span class="time-unit">时</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 时间特征 -->
        <div class="section">
          <div class="section-title">
            <span class="title-dot"></span>
            <span>时间特征</span>
          </div>
          <div class="time-features">
            <label class="feature-checkbox">
              <input type="checkbox" v-model="form.timeFeatures.workday" />
              <span class="check-box"></span>
              <span>工作日</span>
              <select v-model="form.timeFeatures.workdayPrice" class="feature-select">
                <option value="peak">电价高峰</option>
                <option value="valley">电价低谷</option>
                <option value="normal">全部</option>
              </select>
            </label>
            
            <label class="feature-checkbox">
              <input type="checkbox" v-model="form.timeFeatures.weekend" />
              <span class="check-box"></span>
              <span>周末</span>
              <select v-model="form.timeFeatures.weekendPrice" class="feature-select">
                <option value="valley">电价低谷</option>
                <option value="peak">电价高峰</option>
                <option value="normal">全部</option>
              </select>
            </label>
            
            <label class="feature-checkbox">
              <input type="checkbox" v-model="form.timeFeatures.holiday" />
              <span class="check-box"></span>
              <span>节假日</span>
              <select v-model="form.timeFeatures.holidayPrice" class="feature-select">
                <option value="valley">电价低谷</option>
                <option value="peak">电价高峰</option>
                <option value="normal">全部</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <!-- 底部 - 修改按钮文本为"开始查询" -->
      <div class="modal-footer">
        <span class="status-text">配置时间筛选</span>
        <div class="footer-buttons">
          <button class="btn btn-default" @click="handleClose">取消</button>
          <button class="btn btn-primary" @click="handleQuery">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            开始查询
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits(['update:visible', 'query'])

const timeRanges = [
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '上周', value: 'lastWeek' },
  { label: '本月', value: 'month' },
  { label: '上月', value: 'lastMonth' },
  { label: '本季度', value: 'quarter' },
  { label: '本年', value: 'year' }
]

const form = reactive({
  timeRange: 'month',
  startTime: { year: '2023', month: '10', day: '01', hour: '00' },
  endTime: { year: '2023', month: '10', day: '31', hour: '23' },
  timeFeatures: {
    workday: true,
    workdayPrice: 'peak',
    weekend: false,
    weekendPrice: 'valley',
    holiday: false,
    holidayPrice: 'valley'
  }
})

// 当快捷范围改变时，自动计算精确时间
watch(() => form.timeRange, (newRange) => {
  const now = new Date('2026-04-15T20:06:11') // 使用设置页面的当前时间
  let start = new Date(now)
  let end = new Date(now)
  
  switch(newRange) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case 'yesterday':
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      end.setDate(end.getDate() - 1)
      end.setHours(23, 59, 59, 999)
      break
    case 'lastWeek':
      start.setDate(start.getDate() - 7)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case 'month':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case 'lastMonth':
      start.setMonth(start.getMonth() - 1)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setDate(0) // 上个月的最后一天
      end.setHours(23, 59, 59, 999)
      break
    case 'quarter':
      const quarter = Math.floor(start.getMonth() / 3)
      start.setMonth(quarter * 3)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case 'year':
      start.setMonth(0)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
  }
  
  form.startTime = {
    year: start.getFullYear().toString(),
    month: (start.getMonth() + 1).toString().padStart(2, '0'),
    day: start.getDate().toString().padStart(2, '0'),
    hour: start.getHours().toString().padStart(2, '0')
  }
  form.endTime = {
    year: end.getFullYear().toString(),
    month: (end.getMonth() + 1).toString().padStart(2, '0'),
    day: end.getDate().toString().padStart(2, '0'),
    hour: end.getHours().toString().padStart(2, '0')
  }
}, { immediate: true })

const handleClose = () => {
  emit('update:visible', false)
}

// 修改：改为开始查询，自动关闭弹窗
const handleQuery = () => {
  // 构建时间范围对象
  const timeConfig = {
    range: form.timeRange,
    startTime: `${form.startTime.year}-${form.startTime.month}-${form.startTime.day} ${form.startTime.hour}:00:00`,
    endTime: `${form.endTime.year}-${form.endTime.month}-${form.endTime.day} ${form.endTime.hour}:59:59`,
    features: form.timeFeatures
  }
  
  emit('query', timeConfig)
  handleClose() // 自动关闭弹窗
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
  border-radius: 12px;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #E5E7EB;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-title {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.icon-box {
  width: 40px;
  height: 40px;
  background: #EFF6FF;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #6B7280;
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
  color: #9CA3AF;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #F3F4F6;
  color: #374151;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 16px;
}

.title-dot {
  width: 3px;
  height: 16px;
  background: #005BAC;
  border-radius: 2px;
}

.quick-range {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.range-btn {
  padding: 8px 16px;
  border: 1px solid #D1D5DB;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.range-btn:hover {
  border-color: #005BAC;
  color: #005BAC;
}

.range-btn.active {
  background: #002B54;
  color: white;
  border-color: #002B54;
}

.precise-time {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.time-block {
  display: flex;
  align-items: center;
  gap: 12px;
}

.time-block label {
  width: 70px;
  font-size: 14px;
  color: #6B7280;
  flex-shrink: 0;
}

.time-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.time-input {
  width: 60px;
  height: 36px;
  border: 1px solid #D1D5DB;
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
  color: #374151;
  outline: none;
}

.time-input:focus {
  border-color: #005BAC;
}

.time-unit {
  font-size: 14px;
  color: #9CA3AF;
  padding: 0 4px;
}

.time-features {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.feature-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
}

.feature-checkbox input {
  display: none;
}

.feature-checkbox .check-box {
  width: 16px;
  height: 16px;
  border: 2px solid #D1D5DB;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.feature-checkbox input:checked + .check-box {
  background: #005BAC;
  border-color: #005BAC;
}

.feature-checkbox input:checked + .check-box::after {
  content: '';
  width: 5px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 2px;
}

.feature-select {
  margin-left: 8px;
  padding: 4px 8px;
  border: 1px solid #D1D5DB;
  border-radius: 4px;
  font-size: 13px;
  color: #374151;
  background: white;
  outline: none;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
  background: #F9FAFB;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-text {
  font-size: 14px;
  color: #6B7280;
}

.footer-buttons {
  display: flex;
  gap: 12px;
}

.btn {
  height: 36px;
  padding: 0 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  border: none;
  transition: all 0.2s;
}

.btn-default {
  background: white;
  color: #374151;
  border: 1px solid #D1D5DB;
}

.btn-default:hover {
  background: #F3F4F6;
}

.btn-primary {
  background: #005BAC;
  color: white;
}

.btn-primary:hover {
  background: #004a8d;
}
</style>
