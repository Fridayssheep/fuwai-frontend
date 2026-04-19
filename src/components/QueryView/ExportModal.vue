<template>
  <Transition name="export-modal-shell" appear>
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
            <div>
              <h3>{{ modalTitle }}</h3>
              <p>{{ modalDescription }}</p>
            </div>
          </div>
          <button class="close-btn" @click="handleClose">×</button>
        </div>

        <!-- 内容区域 -->
        <div class="modal-body">
          <div class="summary-stack">
            <div v-if="targetName" class="summary-info">
              <span>报表对象</span>
              <strong>{{ targetName }}</strong>
            </div>
            <div class="summary-info">
              <span>当前选定时段</span>
              <strong>{{ timeRangeText }}</strong>
            </div>
          </div>

          <div class="report-type-grid">
            <button 
              type="button"
              :class="['type-card', { active: form.reportCategory === 'summary' }]"
              @click="form.reportCategory = 'summary'"
            >
              <div class="type-icon summary-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </div>
              <div class="type-text">
                <span class="type-name">能耗汇总报表</span>
                <span class="type-desc">能效指标、用电分布与趋势分析</span>
              </div>
            </button>

            <button 
              type="button"
              :class="['type-card', { active: form.reportCategory === 'anomaly' }]"
              @click="form.reportCategory = 'anomaly'"
            >
              <div class="type-icon anomaly-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div class="type-text">
                <span class="type-name">智能故障分析表</span>
                <span class="type-desc">异常诊断、故障定位与专家建议</span>
              </div>
            </button>
          </div>

          <div class="settings-group">
            <div class="setting-item">
              <label>导出格式</label>
              <div class="format-tag">Markdown (.md)</div>
            </div>

            <div class="ai-toggle-card" :class="{ active: form.includeAiSummary }">
              <div class="ai-info">
                <div class="ai-title">AI 深度分析摘要</div>
                <p class="ai-desc">对选定时段的数据进行多维度智能诊断与总结。</p>
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
          <button class="btn btn-export" @click="handleConfirm">{{ confirmText || '提交生成任务' }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'

const props = defineProps<{
  visible: boolean
  selectedCount: number
  startTime: string
  endTime: string
  title?: string
  description?: string
  targetName?: string
  confirmText?: string
}>()

const emit = defineEmits(['update:visible', 'export'])

const form = reactive({
  reportCategory: 'summary', // summary 或 anomaly
  includeAiSummary: true
})

const timeRangeText = computed(() => `${props.startTime.split('T')[0]} 至 ${props.endTime.split('T')[0]}`)
const modalTitle = computed(() => props.title || '导出运行分析报表')
const modalDescription = computed(() => props.description || `已选择 ${props.selectedCount} 栋建筑，生成任务会进入统计报表工作台。`)

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
  background: white; border-radius: 22px; width: min(520px, calc(100vw - 32px)); overflow: hidden;
  box-shadow: 0 25px 60px rgba(0,0,0,0.2);
}

.modal-header { padding: 24px 28px; border-bottom: 1px solid #F3F4F6; display: flex; justify-content: space-between; align-items: center; }
.header-title { display: flex; align-items: center; gap: 14px; }
.icon-circle { width: 38px; height: 38px; background: #eef6ff; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #0b4582; }
h3 { margin: 0; font-size: 19px; color: #111827; font-weight: 900; letter-spacing: -0.02em; }
.header-title p { margin: 4px 0 0; color: #667085; font-size: 12px; font-weight: 600; }
.close-btn { border: none; background: transparent; font-size: 24px; color: #9CA3AF; cursor: pointer; transition: transform .22s ease, color .22s ease; }
.close-btn:hover { color: #0b4582; transform: rotate(90deg); }

.modal-body { padding: 28px; }
.summary-stack { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
.summary-info { padding: 12px 14px; border: 1px solid #e3edf6; border-radius: 14px; background: #f8fbff; display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px; color: #4B5563; }
.summary-info span { color: #667085; font-weight: 700; }
.summary-info strong { color: #0b4582; font-weight: 900; }

.report-type-grid { display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px; }
.type-card {
  width: 100%;
  padding: 16px 18px; border: 1.5px solid #e3edf6; border-radius: 16px; cursor: pointer;
  display: flex; gap: 16px; align-items: center; text-align: left; background: #fff; transition: transform .22s cubic-bezier(.22, 1, .36, 1), box-shadow .22s ease, border-color .22s ease, background .22s ease;
}
.type-card:hover { border-color: rgba(11, 69, 130, .3); background: #f8fbff; transform: translateY(-1px); box-shadow: 0 12px 26px rgba(11, 69, 130, .08); }
.type-card.active { border-color: #0b4582; background: linear-gradient(180deg, #f8fbff, #eef6ff); box-shadow: inset 4px 0 0 #0b4582, 0 14px 28px rgba(11, 69, 130, .1); }
.type-icon { width: 44px; height: 44px; background: #eef6ff; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #0b4582; box-shadow: inset 0 1px 0 rgba(255,255,255,.86); }
.type-card.active .type-icon { background: #0b4582; color: white; }
.type-text { display: flex; flex-direction: column; }
.type-name { font-size: 15px; font-weight: 700; color: #111; margin-bottom: 2px; }
.type-desc { font-size: 12px; color: #6B7280; }

.settings-group { display: flex; flex-direction: column; gap: 18px; border-top: 1px dashed #E5E7EB; padding-top: 20px; }
.setting-item label { font-size: 13px; font-weight: 600; color: #666; margin-bottom: 8px; display: block; }
.format-tag { display: inline-block; padding: 6px 14px; background: #F3F4F6; border-radius: 8px; font-size: 13px; color: #333; font-weight: 600; }

.ai-toggle-card { display: flex; justify-content: space-between; align-items: center; gap: 18px; padding: 16px; background: #F8FAFF; border: 1px solid #e3edf6; border-radius: 14px; transition: border-color .22s ease, box-shadow .22s ease; }
.ai-toggle-card.active { border-color: rgba(11, 69, 130, .22); box-shadow: 0 10px 24px rgba(11, 69, 130, .07); }
.ai-title { font-size: 14px; font-weight: 800; color: #005BAC; margin-bottom: 4px; }
.ai-desc { font-size: 12px; color: #6B7280; margin: 0; line-height: 1.4; }

.switch-wrap { position: relative; width: 44px; height: 22px; }
.switch-input { opacity: 0; width: 0; height: 0; }
.switch-label { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 34px; }
.switch-label:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
.switch-input:checked + .switch-label { background-color: #005BAC; }
.switch-input:checked + .switch-label:before { transform: translateX(22px); }

.modal-footer { padding: 20px 28px 28px; display: flex; gap: 14px; }
.btn { flex: 1; height: 48px; border-radius: 12px; font-size: 15px; font-weight: 800; cursor: pointer; border: none; transition: transform .22s cubic-bezier(.22, 1, .36, 1), box-shadow .22s ease, background .22s ease; }
.btn-cancel { background: #F3F4F6; color: #4B5563; }
.btn-export { background: linear-gradient(135deg, #005BAC 0%, #003d75 100%); color: white; }
.btn:hover { transform: translateY(-1px); }
.btn-export:hover { box-shadow: 0 14px 28px rgba(11, 69, 130, .18); }

.export-modal-shell-enter-active,
.export-modal-shell-leave-active {
  transition: opacity .26s ease;
}
.export-modal-shell-enter-active .modal-content,
.export-modal-shell-leave-active .modal-content {
  transition:
    opacity .28s ease,
    transform .34s cubic-bezier(.22, 1, .36, 1),
    filter .34s ease;
}
.export-modal-shell-enter-from,
.export-modal-shell-leave-to {
  opacity: 0;
}
.export-modal-shell-enter-from .modal-content,
.export-modal-shell-leave-to .modal-content {
  opacity: 0;
  transform: translateY(24px) scale(.97);
  filter: blur(10px);
}
</style>
