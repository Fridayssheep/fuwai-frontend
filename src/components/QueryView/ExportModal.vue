<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <!-- 头部 -->
      <div class="modal-header">
        <div class="header-title">
          <div class="icon-circle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <h3>导出运行分析报表</h3>
        </div>
        <button class="close-btn" @click="handleClose">×</button>
      </div>
      
      <!-- 内容区域 -->
      <div class="modal-body">
        <div class="summary-info">
          <p>当前选定时段: <strong>{{ startTime.split('T')[0] }}</strong> 至 <strong>{{ endTime.split('T')[0] }}</strong></p>
        </div>

        <div class="report-type-grid">
          <div 
            :class="['type-card', { active: form.reportCategory === 'summary' }]"
            @click="form.reportCategory = 'summary'"
          >
            <div class="type-icon summary-icon">📊</div>
            <div class="type-text">
              <span class="type-name">能耗汇总报表</span>
              <span class="type-desc">包含能效指标、用电分布及趋势分析</span>
            </div>
          </div>

          <div 
            :class="['type-card', { active: form.reportCategory === 'anomaly' }]"
            @click="form.reportCategory = 'anomaly'"
          >
            <div class="type-icon anomaly-icon">⚠️</div>
            <div class="type-text">
              <span class="type-name">智能故障分析表</span>
              <span class="type-desc">侧重于异常诊断、故障定位及专家建议</span>
            </div>
          </div>
        </div>

        <div class="settings-group">
          <div class="setting-item">
            <label>导出格式</label>
            <div class="format-tag">Markdown (.md)</div>
          </div>

          <div class="ai-toggle-card" :class="{ active: form.includeAiSummary }">
            <div class="ai-info">
              <div class="ai-title">✨ AI 深度分析摘要</div>
              <p class="ai-desc">利用大模型对选定时段的数据进行多维度智能诊断与总结。</p>
            </div>
            <div class="switch-wrap">
              <input type="checkbox" id="ai-switch" v-model="form.includeAiSummary" class="switch-input">
              <label for="ai-switch" class="switch-label"></label>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部 -->
      <div class="modal-footer">
        <button class="btn btn-cancel" @click="handleClose">取消</button>
        <button class="btn btn-export" @click="handleConfirm">提交生成任务</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

const props = defineProps<{
  visible: boolean
  selectedCount: number
  startTime: string
  endTime: string
}>()

const emit = defineEmits(['update:visible', 'export'])

const form = reactive({
  reportCategory: 'summary', // summary 或 anomaly
  includeAiSummary: true
})

const handleClose = () => emit('update:visible', false)

const handleConfirm = () => {
  emit('export', { ...form })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 15, 40, 0.45); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 2000;
}
.modal-content {
  background: white; border-radius: 20px; width: 500px; overflow: hidden;
  box-shadow: 0 25px 60px rgba(0,0,0,0.2); animation: modalIn 0.3s ease-out;
}
@keyframes modalIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

.modal-header { padding: 24px 28px; border-bottom: 1px solid #F3F4F6; display: flex; justify-content: space-between; align-items: center; }
.header-title { display: flex; align-items: center; gap: 14px; }
.icon-circle { width: 38px; height: 38px; background: #EEF2FF; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #4F46E5; }
h3 { margin: 0; font-size: 19px; color: #111827; font-weight: 700; }
.close-btn { border: none; background: transparent; font-size: 24px; color: #9CA3AF; cursor: pointer; }

.modal-body { padding: 28px; }
.summary-info { margin-bottom: 24px; font-size: 14px; color: #4B5563; }

.report-type-grid { display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px; }
.type-card {
  padding: 16px 20px; border: 2px solid #F3F4F6; border-radius: 14px; cursor: pointer;
  display: flex; gap: 16px; align-items: center; transition: all 0.2s;
}
.type-card:hover { border-color: #E0E7FF; background: #F9FAFF; }
.type-card.active { border-color: #005BAC; background: #F0F7FF; }
.type-icon { font-size: 24px; width: 44px; height: 44px; background: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.type-text { display: flex; flex-direction: column; }
.type-name { font-size: 15px; font-weight: 700; color: #111; margin-bottom: 2px; }
.type-desc { font-size: 12px; color: #6B7280; }

.settings-group { display: flex; flex-direction: column; gap: 18px; border-top: 1px dashed #E5E7EB; pt: 20px; }
.setting-item label { font-size: 13px; font-weight: 600; color: #666; margin-bottom: 8px; display: block; }
.format-tag { display: inline-block; padding: 6px 14px; background: #F3F4F6; border-radius: 8px; font-size: 13px; color: #333; font-weight: 600; }

.ai-toggle-card { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #F8FAFF; border-radius: 12px; }
.ai-title { font-size: 14px; font-weight: 700; color: #005BAC; margin-bottom: 4px; }
.ai-desc { font-size: 12px; color: #6B7280; margin: 0; line-height: 1.4; }

.switch-wrap { position: relative; width: 44px; height: 22px; }
.switch-input { opacity: 0; width: 0; height: 0; }
.switch-label { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 34px; }
.switch-label:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
.switch-input:checked + .switch-label { background-color: #005BAC; }
.switch-input:checked + .switch-label:before { transform: translateX(22px); }

.modal-footer { padding: 20px 28px 28px; display: flex; gap: 14px; }
.btn { flex: 1; height: 48px; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; border: none; }
.btn-cancel { background: #F3F4F6; color: #4B5563; }
.btn-export { background: linear-gradient(135deg, #005BAC 0%, #003d75 100%); color: white; }
</style>
