<template>
  <section class="ai-assistant-card">
    <div class="assistant-head">
      <div class="assistant-brand">
        <div class="assistant-badge">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
            <path d="M12 3v3"></path>
            <path d="M5.6 6.6l2.2 2.2"></path>
            <path d="M3 12h3"></path>
            <path d="M18 12h3"></path>
            <path d="M16.2 8.8a4.2 4.2 0 1 1-8.4 0 4.2 4.2 0 0 1 8.4 0Z"></path>
            <path d="M8 17h8"></path>
            <path d="M9 21h6"></path>
          </svg>
        </div>
        <div>
          <h3>AI 查询助手</h3>
          <p>描述你需要查询的条件</p>
        </div>
      </div>

      <button
        class="ghost-btn"
        :disabled="!canUndo"
        @click="$emit('undo')"
      >
        撤销上一次
      </button>
    </div>

    <div class="assistant-body">
      <div class="command-shell" :class="{ loading: isLoading }">
        <div class="prompt-mark">AI</div>
        <textarea
          v-model="prompt"
          class="prompt-input"
          rows="2"
          :disabled="isLoading"
          placeholder="例如：帮我查本月告警状态的办公楼，EUI 大于 80，并按总能耗降序。"
          @keydown.enter.exact.prevent="submitPrompt"
        />
        <button class="submit-btn" :disabled="isLoading || !prompt.trim()" @click="submitPrompt">
          <span v-if="isLoading" class="spinner"></span>
          <span v-else>应用筛选</span>
        </button>
      </div>

      <div class="quick-prompts">
        <button
          v-for="item in quickPrompts"
          :key="item"
          class="quick-chip"
          :disabled="isLoading"
          @click="fillPrompt(item)"
        >
          {{ item }}
        </button>
      </div>

      <div v-if="errorMessage" class="feedback error">
        {{ errorMessage }}
      </div>

      <div v-else-if="lastResponse" class="feedback success">
        <div class="feedback-title">
          <strong>本次筛选已更新</strong>
          <span class="feedback-model">{{ lastResponse.meta.used_fallback ? '规则兜底' : 'AI 解析' }}</span>
        </div>
        <p class="feedback-summary">{{ lastResponse.summary }}</p>

        <div v-if="appliedChips.length" class="applied-grid">
          <span v-for="chip in appliedChips" :key="chip.label + chip.value" class="applied-chip">
            <small>{{ chip.label }}</small>
            <strong>{{ chip.value }}</strong>
          </span>
        </div>

        <ul v-if="lastResponse.warnings.length" class="warning-list">
          <li v-for="item in lastResponse.warnings" :key="item">{{ item }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  parseAIQueryAssistant,
  type AIQueryAssistantFilters,
  type AIQueryAssistantResponse
} from '../../api/ai'

const props = defineProps<{
  currentFilters: AIQueryAssistantFilters
  currentTime: string
  timezone?: string
  canUndo?: boolean
}>()

const emit = defineEmits<{
  (e: 'apply', response: AIQueryAssistantResponse): void
  (e: 'undo'): void
}>()

const quickPrompts = [
  '查本月告警状态的办公楼',
  '切到 Bear_assembly_Angel，并看最近30天',
  '筛出 EUI 大于 80 的建筑',
  '只看 Site_1 的教育类建筑，按碳排放升序'
]

const prompt = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const lastResponse = ref<AIQueryAssistantResponse | null>(null)

const formatTime = (value?: string | null) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('zh-CN')
}

const appliedChips = computed(() => {
  const filters = lastResponse.value?.applied_filters
  if (!filters) return []

  const chips: Array<{ label: string; value: string }> = []
  const pushChip = (label: string, value?: string | number | null) => {
    if (value === null || value === undefined || value === '') return
    chips.push({ label, value: String(value) })
  }

  pushChip('关键词', filters.keyword)
  pushChip('站点', filters.site_id)
  pushChip('用途', filters.primaryspaceusage)
  pushChip('状态', filters.status)
  if (filters.time_range?.start && filters.time_range?.end) {
    pushChip('时间', `${formatTime(filters.time_range.start)} - ${formatTime(filters.time_range.end)}`)
  }
  if (filters.min_energy != null || filters.max_energy != null) {
    pushChip('总能耗', `${filters.min_energy ?? '不限'} ~ ${filters.max_energy ?? '不限'}`)
  }
  if (filters.min_eui != null || filters.max_eui != null) {
    pushChip('EUI', `${filters.min_eui ?? '不限'} ~ ${filters.max_eui ?? '不限'}`)
  }
  if (filters.min_carbon != null || filters.max_carbon != null) {
    pushChip('碳排放', `${filters.min_carbon ?? '不限'} ~ ${filters.max_carbon ?? '不限'}`)
  }
  if (filters.sort_by) {
    pushChip('排序字段', filters.sort_by)
  }
  if (filters.sort_order) {
    pushChip('排序方向', filters.sort_order)
  }
  return chips
})

const fillPrompt = (value: string) => {
  prompt.value = value
}

const submitPrompt = async () => {
  const question = prompt.value.trim()
  if (!question || isLoading.value) return

  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await parseAIQueryAssistant({
      question,
      target_scope: 'building_query',
      current_endpoint: '/buildings',
      current_filters: props.currentFilters,
      use_current_time: false,
      current_time: props.currentTime,
      timezone: props.timezone || 'Asia/Shanghai'
    })
    lastResponse.value = response
    emit('apply', response)
  } catch (error: any) {
    errorMessage.value = error?.message || 'AI 筛选助手暂时不可用，请稍后再试。'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.ai-assistant-card {
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
  padding: 18px 20px;
  border: 1px solid #d8e6f5;
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(0, 91, 172, 0.08), rgba(255, 255, 255, 0.98) 36%),
    linear-gradient(180deg, #ffffff, #f8fbff);
  box-shadow: 0 16px 40px rgba(0, 43, 84, 0.06);
}

.ai-assistant-card::after {
  content: '';
  position: absolute;
  inset: auto -60px -90px auto;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 91, 172, 0.12), rgba(0, 91, 172, 0));
  pointer-events: none;
}

.assistant-head,
.assistant-brand,
.feedback-title {
  display: flex;
  align-items: center;
}

.assistant-head {
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}

.assistant-brand {
  gap: 12px;
}

.assistant-badge {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, #003d78, #0c6cc1);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 20px rgba(0, 91, 172, 0.22);
}

.assistant-brand h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: #062847;
}

.assistant-brand p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #5c7289;
}

.assistant-body {
  position: relative;
  z-index: 1;
}

.command-shell {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid #d1dfef;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.command-shell.loading {
  border-color: #8bbbe6;
  box-shadow: 0 0 0 4px rgba(0, 91, 172, 0.08);
}

.prompt-mark {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #eef5fd;
  color: #005bac;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.prompt-input {
  width: 100%;
  border: none;
  resize: none;
  outline: none;
  font: 600 14px/1.6 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #16324f;
  background: transparent;
}

.prompt-input::placeholder {
  color: #8aa0b5;
}

.submit-btn,
.ghost-btn,
.quick-chip {
  border: none;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease, opacity 0.18s ease;
}

.submit-btn,
.ghost-btn {
  height: 40px;
  padding: 0 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
}

.submit-btn {
  background: linear-gradient(135deg, #002b54, #005bac);
  color: #fff;
  min-width: 92px;
}

.ghost-btn {
  background: #f3f7fb;
  color: #41566d;
  border: 1px solid #d8e0ea;
}

.submit-btn:hover:not(:disabled),
.ghost-btn:hover:not(:disabled),
.quick-chip:hover:not(:disabled) {
  transform: translateY(-1px);
}

.submit-btn:disabled,
.ghost-btn:disabled,
.quick-chip:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.quick-chip {
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(0, 91, 172, 0.07);
  color: #0d4a82;
  font-size: 12px;
  font-weight: 600;
}

.feedback {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 16px;
}

.feedback.success {
  border: 1px solid #d6e5f3;
  background: rgba(255, 255, 255, 0.88);
}

.feedback.error {
  border: 1px solid #fecaca;
  background: #fff5f5;
  color: #b42318;
  font-size: 13px;
  font-weight: 600;
}

.feedback-title {
  justify-content: space-between;
  gap: 12px;
}

.feedback-title strong {
  color: #062847;
  font-size: 14px;
}

.feedback-model {
  color: #6c8299;
  font-size: 11px;
  font-weight: 700;
}

.feedback-summary {
  margin: 8px 0 0;
  color: #476178;
  font-size: 13px;
  line-height: 1.6;
}

.applied-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.applied-chip {
  min-width: 120px;
  padding: 10px 12px;
  border-radius: 14px;
  background: linear-gradient(180deg, #f7fbff, #eef5fc);
  border: 1px solid #d6e4f2;
  animation: chip-rise 0.26s ease both;
}

.applied-chip small {
  display: block;
  margin-bottom: 5px;
  color: #7390ac;
  font-size: 11px;
  font-weight: 700;
}

.applied-chip strong {
  color: #0b2949;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.warning-list {
  margin: 12px 0 0;
  padding-left: 18px;
  color: #8a5a00;
  font-size: 12px;
  line-height: 1.6;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  display: inline-block;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes chip-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 960px) {
  .assistant-head,
  .command-shell {
    grid-template-columns: 1fr;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .assistant-head {
    align-items: stretch;
  }

  .prompt-mark {
    width: 100%;
    height: 32px;
    border-radius: 10px;
  }
}
</style>
