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
          <p>只负责把自然语言转成查询页筛选条件</p>
        </div>
      </div>

      <div class="head-actions">
        <button
          class="mode-toggle"
          :class="{ active: inheritCurrentFilters }"
          type="button"
          @click="inheritCurrentFilters = !inheritCurrentFilters"
        >
          <span class="mode-dot"></span>
          {{ inheritCurrentFilters ? '沿用当前筛选' : '从空白筛选开始' }}
        </button>

        <button
          class="ghost-btn"
          type="button"
          :disabled="!canUndo"
          @click="$emit('undo')"
        >
          撤销上一次
        </button>
      </div>
    </div>

    <div class="assistant-body">
      <div class="context-panel">
        <div class="context-copy">
          <strong>{{ inheritCurrentFilters ? '本次会叠加在当前页面筛选之上' : '本次不会继承当前页面筛选' }}</strong>
          <p>
            {{
              inheritCurrentFilters
                ? '适合继续补充条件，例如“再加上 EUI 大于 80”。'
                : '适合重新发起一次全新的查询。'
            }}
          </p>
        </div>

        <div v-if="inheritCurrentFilters && currentFilterChips.length" class="context-chip-group">
          <span
            v-for="chip in currentFilterChips"
            :key="`${chip.key}_${chip.value}`"
            class="context-chip"
          >
            <small>{{ chip.label }}</small>
            <strong>{{ chip.value }}</strong>
          </span>
        </div>
        <div v-else class="context-empty">
          {{ inheritCurrentFilters ? '当前页面还没有可继承的筛选条件。' : '将只按本次输入的自然语言重新解析。' }}
        </div>
      </div>

      <div class="command-shell" :class="{ loading: isLoading }">
        <div class="prompt-mark">AI</div>
        <textarea
          v-model="prompt"
          class="themed-textarea prompt-input"
          rows="3"
          :disabled="isLoading"
          placeholder="例如：最近30天告警状态的办公楼，EUI 大于 80，按总能耗降序。"
          @keydown.enter.exact.prevent="submitPrompt"
        />
        <div class="command-actions">
          <button
            class="clear-btn"
            type="button"
            :disabled="isLoading || !prompt.trim()"
            @click="prompt = ''"
          >
            清空
          </button>
          <button class="submit-btn" type="button" :disabled="isLoading || !prompt.trim()" @click="submitPrompt">
            <span v-if="isLoading" class="spinner"></span>
            <span v-else>解析并应用</span>
          </button>
        </div>
      </div>

      <div class="quick-prompts">
        <button
          v-for="item in quickPrompts"
          :key="item"
          class="quick-chip"
          type="button"
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
        <div class="feedback-topline">
          <div class="feedback-title">
            <strong>筛选条件已更新</strong>
            <span class="feedback-model">{{ lastResponse.meta.used_fallback ? '规则兜底' : 'AI 解析' }}</span>
          </div>
          <span class="mode-hint">{{ lastRunModeLabel }}</span>
        </div>

        <p class="feedback-summary">{{ formatSummary(lastResponse) }}</p>

        <div v-if="changedFilterChips.length" class="result-section">
          <div class="section-label">本次识别并更新的条件</div>
          <div class="applied-grid">
            <span v-for="chip in changedFilterChips" :key="`${chip.key}_${chip.value}`" class="applied-chip">
              <small>{{ chip.label }}</small>
              <strong>{{ chip.value }}</strong>
            </span>
          </div>
        </div>

        <div v-if="focusFields.length" class="result-section">
          <div class="section-label">本轮重点识别字段</div>
          <div class="focus-tags">
            <span v-for="item in focusFields" :key="item" class="focus-tag">{{ item }}</span>
          </div>
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

type FilterChip = {
  key: string
  label: string
  value: string
}

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
  '最近30天 EUI 大于 80 的建筑',
  '只看教育类建筑，按碳排放升序',
  '筛出 Bear_assembly_Angel，并看 2026-04-01 到 2026-04-15'
]

const USAGE_LABELS: Record<string, string> = {
  Office: '办公楼',
  Retail: '商业零售',
  Education: '教育',
  Healthcare: '医疗'
}

const STATUS_LABELS: Record<string, string> = {
  normal: '正常运行',
  warning: '告警状态',
  fault: '故障停机',
  offline: '离线'
}

const SORT_FIELD_LABELS: Record<string, string> = {
  eui: 'EUI 指数',
  totalEnergy: '总能耗',
  status: '系统状态',
  carbonEmission: '碳排放'
}

const SORT_ORDER_LABELS: Record<string, string> = {
  asc: '升序',
  desc: '降序'
}

const UI_FIELD_LABELS: Record<string, string> = {
  keyword: '关键词',
  site_id: '站点',
  primaryspaceusage: '用途',
  status: '状态',
  time_range: '时间范围',
  min_energy: '总能耗下限',
  max_energy: '总能耗上限',
  min_eui: 'EUI 下限',
  max_eui: 'EUI 上限',
  min_carbon: '碳排放下限',
  max_carbon: '碳排放上限',
  sort_by: '排序字段',
  sort_order: '排序方向'
}

const prompt = ref('')
const isLoading = ref(false)
const inheritCurrentFilters = ref(true)
const errorMessage = ref('')
const lastResponse = ref<AIQueryAssistantResponse | null>(null)
const lastBaseFilters = ref<AIQueryAssistantFilters | null>(null)
const lastRunInherited = ref(true)

const formatTime = (value?: string | null) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatSummary = (response: AIQueryAssistantResponse) => {
  const rawSummary = String(response.summary || '').trim()
  if (!rawSummary) return '已按你的描述更新当前查询页筛选条件。'

  return rawSummary
    .replace('/buildings', '当前查询页')
    .replace('页面筛选方案', '筛选条件')
    .replace('已将问题解析为 当前查询页 的筛选条件。', '已按你的描述更新当前查询页筛选条件。')
}

const formatFieldValue = (key: string, value: unknown) => {
  if (value === null || value === undefined || value === '') return ''

  if (key === 'primaryspaceusage') return USAGE_LABELS[String(value)] || String(value)
  if (key === 'status') return STATUS_LABELS[String(value)] || String(value)
  if (key === 'sort_by') return SORT_FIELD_LABELS[String(value)] || String(value)
  if (key === 'sort_order') return SORT_ORDER_LABELS[String(value)] || String(value)
  if (key === 'time_range' && typeof value === 'object' && value) {
    const range = value as AIQueryAssistantFilters['time_range']
    if (range?.start && range?.end) {
      return `${formatTime(range.start)} - ${formatTime(range.end)}`
    }
    return ''
  }

  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

const buildFilterChips = (filters?: AIQueryAssistantFilters | null): FilterChip[] => {
  if (!filters) return []

  const chips: FilterChip[] = []
  const pushChip = (key: string, label: string, value: unknown) => {
    const formatted = formatFieldValue(key, value)
    if (!formatted) return
    chips.push({ key, label, value: formatted })
  }

  pushChip('keyword', '关键词', filters.keyword)
  pushChip('site_id', '站点', filters.site_id)
  pushChip('primaryspaceusage', '用途', filters.primaryspaceusage)
  pushChip('status', '状态', filters.status)
  pushChip('time_range', '时间范围', filters.time_range)

  if (filters.min_energy != null || filters.max_energy != null) {
    pushChip('energy_range', '总能耗', `${filters.min_energy ?? '不限'} ~ ${filters.max_energy ?? '不限'}`)
  }
  if (filters.min_eui != null || filters.max_eui != null) {
    pushChip('eui_range', 'EUI', `${filters.min_eui ?? '不限'} ~ ${filters.max_eui ?? '不限'}`)
  }
  if (filters.min_carbon != null || filters.max_carbon != null) {
    pushChip('carbon_range', '碳排放', `${filters.min_carbon ?? '不限'} ~ ${filters.max_carbon ?? '不限'}`)
  }

  pushChip('sort_by', '排序字段', filters.sort_by)
  pushChip('sort_order', '排序方向', filters.sort_order)
  return chips
}

const currentFilterChips = computed(() => buildFilterChips(props.currentFilters))

const changedFilterChips = computed(() => {
  const appliedFilters = lastResponse.value?.applied_filters
  if (!appliedFilters) return []

  const nextChips = buildFilterChips(appliedFilters)
  if (!lastRunInherited.value) return nextChips

  const baseMap = new Map(
    buildFilterChips(lastBaseFilters.value).map((chip) => [chip.key, chip.value])
  )
  return nextChips.filter((chip) => baseMap.get(chip.key) !== chip.value)
})

const focusFields = computed(() => {
  const fields = lastResponse.value?.ui_patch.highlighted_filters || []
  return fields
    .map((item) => UI_FIELD_LABELS[item] || item)
    .filter((item, index, source) => source.indexOf(item) === index)
})

const lastRunModeLabel = computed(() => (
  lastRunInherited.value ? '在当前筛选基础上解析' : '按全新查询解析'
))

const fillPrompt = (value: string) => {
  prompt.value = value
}

const submitPrompt = async () => {
  const question = prompt.value.trim()
  if (!question || isLoading.value) return

  isLoading.value = true
  errorMessage.value = ''

  const baseFilters = inheritCurrentFilters.value ? { ...props.currentFilters } : null
  lastBaseFilters.value = baseFilters
  lastRunInherited.value = inheritCurrentFilters.value

  try {
    const response = await parseAIQueryAssistant({
      question,
      target_scope: 'building_query',
      current_endpoint: '/buildings',
      current_filters: baseFilters,
      use_current_time: false,
      current_time: props.currentTime,
      timezone: props.timezone || 'Asia/Shanghai'
    })
    lastResponse.value = response
    emit('apply', response)
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.detail ||
      error?.message ||
      'AI 查询助手暂时不可用，请稍后再试。'
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
  padding: 18px 20px 20px;
  border: 1px solid #d8e6f5;
  border-radius: 20px;
  background:
    linear-gradient(135deg, rgba(0, 91, 172, 0.1), rgba(255, 255, 255, 0.98) 34%),
    linear-gradient(180deg, #ffffff, #f6fbff);
  box-shadow: 0 18px 40px rgba(0, 43, 84, 0.08);
}

.ai-assistant-card::after {
  content: '';
  position: absolute;
  right: -64px;
  bottom: -92px;
  width: 196px;
  height: 196px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 91, 172, 0.12), rgba(0, 91, 172, 0));
  pointer-events: none;
}

.assistant-head,
.assistant-brand,
.head-actions,
.feedback-title,
.feedback-topline {
  display: flex;
  align-items: center;
}

.assistant-head {
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
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

.head-actions {
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.mode-toggle,
.ghost-btn,
.submit-btn,
.quick-chip,
.clear-btn {
  border: none;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease, opacity 0.18s ease;
}

.mode-toggle,
.ghost-btn {
  height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.mode-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 91, 172, 0.08);
  color: #0a4f8f;
}

.mode-toggle.active {
  background: rgba(0, 91, 172, 0.14);
  color: #083b68;
}

.mode-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid #d7e2ee;
  color: #32506c;
}

.ghost-btn:disabled,
.submit-btn:disabled,
.quick-chip:disabled,
.clear-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.assistant-body {
  position: relative;
  z-index: 1;
}

.context-panel {
  padding: 14px 16px;
  margin-bottom: 14px;
  border: 1px solid rgba(0, 91, 172, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
}

.context-copy strong {
  display: block;
  font-size: 13px;
  color: #082f57;
}

.context-copy p,
.context-empty {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: #64809a;
}

.context-chip-group,
.quick-prompts,
.applied-grid,
.focus-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.context-chip-group {
  margin-top: 12px;
}

.context-chip,
.applied-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid #dbe8f5;
  background: #fff;
}

.context-chip small,
.applied-chip small {
  font-size: 11px;
  color: #6b8197;
}

.context-chip strong,
.applied-chip strong {
  font-size: 12px;
  color: #123b5f;
}

.command-shell {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: stretch;
  padding: 12px;
  border: 1.5px solid #dbe5ef;
  border-radius: 18px;
  background: linear-gradient(180deg, #f8fbff 0%, #f1f6fb 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
  transition: border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
}

.command-shell:hover:not(.loading),
.command-shell:focus-within {
  border-color: #0b4582;
  background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
  box-shadow:
    0 0 0 4px rgba(11, 69, 130, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.command-shell.loading {
  border-color: #0b4582;
  background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
  box-shadow:
    0 0 0 4px rgba(11, 69, 130, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.prompt-mark {
  width: 42px;
  min-height: 42px;
  border-radius: 14px;
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
  --themed-input-height: 78px;
  --themed-input-padding-x: 0;
  --themed-input-padding-y: 0;
  --themed-input-radius: 0;
  --themed-input-border: transparent;
  --themed-input-bg: transparent;
  --themed-input-hover-bg: transparent;
  --themed-input-focus-bg: transparent;
  --themed-input-focus-shadow: 0 0 0 0 rgba(11, 69, 130, 0);
  --themed-input-placeholder: #8aa0b5;
  --themed-input-font-size: 14px;
  --themed-input-font-weight: 600;
  --themed-input-color: #16324f;
  width: 100%;
  min-height: 78px;
  border: none;
  box-shadow: none;
  padding: 0;
  resize: none;
  outline: none;
  font: 600 14px/1.7 var(--font-sans);
  color: #16324f;
  background: transparent;
}

.prompt-input::placeholder {
  color: #8aa0b5;
}

.command-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: space-between;
}

.submit-btn,
.clear-btn {
  min-width: 108px;
  height: 40px;
  padding: 0 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
}

.submit-btn {
  background: linear-gradient(135deg, #004d92, #0c6cc1);
  color: #fff;
  box-shadow: 0 12px 24px rgba(0, 91, 172, 0.18);
}

.clear-btn {
  background: #edf4fb;
  color: #34506a;
}

.submit-btn:not(:disabled):hover,
.quick-chip:not(:disabled):hover,
.ghost-btn:not(:disabled):hover,
.clear-btn:not(:disabled):hover,
.mode-toggle:hover {
  transform: translateY(-1px);
}

.quick-prompts {
  margin-top: 12px;
}

.quick-chip {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(0, 91, 172, 0.08);
  color: #0e528f;
  font-size: 12px;
  font-weight: 700;
}

.feedback {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 16px;
}

.feedback.success {
  border: 1px solid #d6e6f7;
  background: linear-gradient(180deg, rgba(248, 252, 255, 0.98), rgba(238, 247, 255, 0.98));
}

.feedback.error {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
}

.feedback-topline {
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.feedback-title {
  gap: 8px;
  flex-wrap: wrap;
}

.feedback-title strong {
  font-size: 14px;
  color: #072b4d;
}

.feedback-model,
.mode-hint,
.focus-tag {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.feedback-model {
  background: rgba(0, 91, 172, 0.12);
  color: #085192;
}

.mode-hint {
  background: #f1f5f9;
  color: #52677b;
}

.feedback-summary {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: #35526e;
}

.result-section {
  margin-top: 14px;
}

.section-label {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #5c7289;
}

.focus-tag {
  background: rgba(10, 79, 143, 0.08);
  color: #0a4f8f;
}

.warning-list {
  margin: 14px 0 0;
  padding-left: 18px;
  color: #946200;
  font-size: 12px;
  line-height: 1.7;
}

.spinner {
  width: 14px;
  height: 14px;
  display: inline-block;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 960px) {
  .assistant-head,
  .feedback-topline {
    align-items: flex-start;
    flex-direction: column;
  }

  .head-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .command-shell {
    grid-template-columns: 1fr;
  }

  .prompt-mark {
    width: 100%;
    min-height: 36px;
  }

  .command-actions {
    flex-direction: row;
  }

  .submit-btn,
  .clear-btn {
    flex: 1;
  }
}
</style>
