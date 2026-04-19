<template>
  <Transition name="filter-modal-shell" appear>
    <div v-if="visible" class="modal-overlay" @click.self="handleClose">
      <div class="modal-content">
      <div class="modal-header">
        <div class="header-title">
          <div class="icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#005BAC" stroke-width="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
          </div>
          <div>
            <h3>高级筛选与自定义时间</h3>
            <p class="subtitle">可以在这里按照建筑类型与能耗筛选</p>
          </div>
        </div>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <div class="modal-tabs">
        <SlidingOptionGroup
          :model-value="activeTab"
          :options="tabs"
          :highlighted-values="localHighlightedTabs"
          variant="track"
          aria-label="高级筛选分类"
          class="filter-tab-group"
          @update:model-value="(value) => activeTab = value as ModalTab"
        />
      </div>

      <div class="modal-body">
        <Transition name="tab-panel" mode="out-in">
          <div v-if="activeTab === 'time'" key="time" class="tab-content">
          <div class="section">
            <div class="section-title"><span class="title-dot"></span>查询时段</div>
            <div class="form-row">
              <div :class="['form-item', { 'ai-field-flash': isHighlighted('startTime') }]">
                <label>开始时间</label>
                <input type="datetime-local" class="themed-input input-box" v-model="form.startTime" />
              </div>
              <div :class="['form-item', { 'ai-field-flash': isHighlighted('endTime') }]">
                <label>结束时间</label>
                <input type="datetime-local" class="themed-input input-box" v-model="form.endTime" />
              </div>
            </div>
          </div>
          </div>

          <div v-else-if="activeTab === 'property'" key="property" class="tab-content">
          <div class="section">
            <div class="section-title"><span class="title-dot"></span>基础属性</div>
            <div class="form-row">
              <div :class="['form-item', { 'ai-field-flash': isHighlighted('keyword') }]">
                <label>关键词 (ID/名称)</label>
                <input type="text" placeholder="模糊搜索" class="themed-input input-box" v-model="form.keyword" />
              </div>
              <div :class="['form-item', { 'ai-field-flash': isHighlighted('site_id') }]">
                <label>所属站点</label>
                <input type="text" placeholder="站点筛选" class="themed-input input-box" v-model="form.site_id" />
              </div>
            </div>
            <div class="form-row">
              <div :class="['form-item', { 'ai-field-flash': isHighlighted('primaryspaceusage') }]">
                <label>主用途</label>
                <ThemedSelect
                  v-model="form.primaryspaceusage"
                  class="input-box"
                  aria-label="主用途"
                  :options="primarySpaceUsageOptions"
                />
              </div>
            </div>
          </div>
          </div>

          <div v-else key="energy" class="tab-content">
          <div class="section">
            <div class="section-title"><span class="title-dot"></span>动态指标筛选 (基于选定时段)</div>
            <div class="energy-grid">
              <div :class="['form-item', { 'ai-field-flash': isHighlighted('min_energy') || isHighlighted('max_energy') }]">
                <label>总能耗范围 (KWH)</label>
                <div class="range-wrap">
                  <input type="number" class="themed-input range-input" placeholder="最小" v-model="form.min_energy" />
                  <span>-</span>
                  <input type="number" class="themed-input range-input" placeholder="最大" v-model="form.max_energy" />
                </div>
              </div>
              <div :class="['form-item', { 'ai-field-flash': isHighlighted('min_eui') || isHighlighted('max_eui') }]">
                <label>EUI 强度 (KWH/㎡)</label>
                <div class="range-wrap">
                  <input type="number" class="themed-input range-input" placeholder="最小" v-model="form.min_eui" />
                  <span>-</span>
                  <input type="number" class="themed-input range-input" placeholder="最大" v-model="form.max_eui" />
                </div>
              </div>
              <div :class="['form-item', { 'ai-field-flash': isHighlighted('min_carbon') || isHighlighted('max_carbon') }]">
                <label>碳排放 (kgCO2e)</label>
                <div class="range-wrap">
                  <input type="number" class="themed-input range-input" placeholder="最小" v-model="form.min_carbon" />
                  <span>-</span>
                  <input type="number" class="themed-input range-input" placeholder="最大" v-model="form.max_carbon" />
                </div>
              </div>
            </div>
          </div>
          </div>
        </Transition>
      </div>

      <div class="modal-footer">
        <div class="footer-buttons">
          <button class="btn btn-default" @click="handleClose">取消</button>
          <button class="btn btn-primary" @click="handleSave">应用筛选并查询</button>
        </div>
      </div>
    </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, watch, nextTick } from 'vue'
import { getCurrentTimeString } from '../../utils/timeManager'
import ThemedSelect from '../common/ThemedSelect.vue'
import SlidingOptionGroup from '../common/SlidingOptionGroup.vue'

type FilterModalForm = {
  startTime: string
  endTime: string
  keyword: string
  site_id: string
  primaryspaceusage: string
  min_energy: number | null
  max_energy: number | null
  min_eui: number | null
  max_eui: number | null
  min_carbon: number | null
  max_carbon: number | null
}

type ModalTab = 'time' | 'property' | 'energy'

const props = withDefaults(defineProps<{
  visible: boolean
  seedValues?: Partial<FilterModalForm>
  highlightedFields?: string[]
  initialTab?: ModalTab
  highlightPulseId?: number
}>(), {
  seedValues: () => ({}),
  highlightedFields: () => [],
  highlightPulseId: 0
})

const emit = defineEmits(['update:visible', 'save'])

const activeTab = ref<ModalTab>('time')
const tabs: Array<{ value: ModalTab; label: string }> = [
  { value: 'time', label: '时间维度' },
  { value: 'property', label: '基础属性' },
  { value: 'energy', label: '能耗指标' }
]
const primarySpaceUsageOptions = [
  { value: '', label: '全部用途' },
  { value: 'Office', label: '办公楼' },
  { value: 'Retail', label: '商业零售' },
  { value: 'Education', label: '教育' },
  { value: 'Healthcare', label: '医疗' }
]

const createDefaultForm = (): FilterModalForm => {
  const now = new Date(getCurrentTimeString())
  const lastWeek = new Date(now.getTime() - 7 * 86400000)
  const format = (d: Date) => d.toISOString().slice(0, 16)
  return {
    startTime: format(lastWeek),
    endTime: format(now),
    keyword: '',
    site_id: '',
    primaryspaceusage: '',
    min_energy: null,
    max_energy: null,
    min_eui: null,
    max_eui: null,
    min_carbon: null,
    max_carbon: null
  }
}

const form = reactive<FilterModalForm>(createDefaultForm())
const localHighlightedFields = ref<string[]>([])
const localHighlightedTabs = ref<ModalTab[]>([])
let localHighlightTimer: ReturnType<typeof setTimeout> | null = null

const normalizeDateTimeLocal = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60_000)
  return localDate.toISOString().slice(0, 16)
}

const applySeedValues = () => {
  const next = createDefaultForm()
  Object.assign(next, {
    ...props.seedValues,
    startTime: normalizeDateTimeLocal(props.seedValues?.startTime) || next.startTime,
    endTime: normalizeDateTimeLocal(props.seedValues?.endTime) || next.endTime
  })
  Object.assign(form, next)
}

const buildHighlightedTabs = (fieldsInput: string[]) => {
  const fields = new Set(fieldsInput || [])
  const tabsToFlash: ModalTab[] = []
  if (['startTime', 'endTime'].some((item) => fields.has(item))) tabsToFlash.push('time')
  if (['keyword', 'site_id', 'primaryspaceusage'].some((item) => fields.has(item))) tabsToFlash.push('property')
  if (['min_energy', 'max_energy', 'min_eui', 'max_eui', 'min_carbon', 'max_carbon'].some((item) => fields.has(item))) {
    tabsToFlash.push('energy')
  }
  return tabsToFlash
}

const isHighlighted = (field: string) => localHighlightedFields.value.includes(field)

const restartHighlightPulse = async () => {
  if (localHighlightTimer) clearTimeout(localHighlightTimer)
  localHighlightedFields.value = []
  localHighlightedTabs.value = []

  const fields = [...new Set(props.highlightedFields || [])]
  if (!fields.length || !props.visible) return

  await nextTick()
  localHighlightedFields.value = fields
  localHighlightedTabs.value = buildHighlightedTabs(fields)
  localHighlightTimer = setTimeout(() => {
    localHighlightedFields.value = []
    localHighlightedTabs.value = []
    localHighlightTimer = null
  }, 2200)
}

const handleClose = () => emit('update:visible', false)

const handleSave = () => {
  emit('save', {
    ...form,
    startTime: form.startTime ? new Date(form.startTime).toISOString() : '',
    endTime: form.endTime ? new Date(form.endTime).toISOString() : ''
  })
  handleClose()
}

onMounted(() => {
  applySeedValues()
})

watch(
  () => props.seedValues,
  () => {
    if (!props.visible) return
    applySeedValues()
  },
  { deep: true }
)

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      if (localHighlightTimer) clearTimeout(localHighlightTimer)
      localHighlightedFields.value = []
      localHighlightedTabs.value = []
      return
    }
    applySeedValues()
    activeTab.value = props.initialTab || buildHighlightedTabs(props.highlightedFields || [])[0] || 'time'
    await restartHighlightPulse()
  },
  { immediate: true }
)

watch(
  () => props.initialTab,
  (tab) => {
    if (!props.visible || !tab) return
    activeTab.value = tab
  }
)

watch(
  () => props.highlightPulseId,
  async () => {
    if (!props.visible) return
    await restartHighlightPulse()
  }
)

watch(
  () => props.highlightedFields,
  async () => {
    if (!props.visible) return
    await restartHighlightPulse()
  },
  { deep: true }
)
</script>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.modal-content { background: white; border-radius: 16px; width: 720px; box-shadow: 0 25px 50px rgba(0,0,0,0.2); }
.modal-header { padding: 20px 24px; border-bottom: 1px solid #F3F4F6; display: flex; justify-content: space-between; }
.icon-box { width: 36px; height: 36px; background: #F0F7FF; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.modal-tabs {
  display: flex;
  padding: 14px 24px;
  background: linear-gradient(180deg, #f8fbff, #f3f7fb);
  border-bottom: 1px solid #e3edf6;
}

.modal-tabs .filter-tab-group.sliding-group.track {
  width: 100%;
  padding: 4px;
  border: 1px solid #dbe7f3;
  border-radius: 16px;
  background: #edf4fb;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.modal-tabs .filter-tab-group.sliding-group.track :deep(.sliding-indicator) {
  border-radius: 12px;
  background: linear-gradient(135deg, #003d75, #0b5faa);
  box-shadow: 0 12px 24px rgba(11, 69, 130, 0.18);
}

.modal-tabs .filter-tab-group.sliding-group.track :deep(.sliding-option) {
  flex: 1 1 0;
  min-height: 44px;
  justify-content: center;
  padding: 8px 18px;
  border-radius: 12px;
  color: #415773;
  font-size: 14px;
  font-weight: 850;
  letter-spacing: -0.01em;
}

.modal-tabs .filter-tab-group.sliding-group.track :deep(.sliding-option:hover:not(.active):not(.disabled)) {
  color: #12233d;
  transform: translateY(-1px);
}

.modal-tabs .filter-tab-group.sliding-group.track :deep(.sliding-option.active) {
  color: #ffffff;
}

.modal-tabs .filter-tab-group.sliding-group.track :deep(.sliding-option.ai-glow) {
  animation: tabFlash 1.45s ease;
}
.modal-body { padding: 24px; min-height: 292px; }
.tab-content { will-change: transform, opacity; }
.section-title { display: flex; align-items: center; gap: 8px; font-weight: 700; margin-bottom: 20px; }
.title-dot { width: 4px; height: 14px; background: #005BAC; }
.form-row { display: flex; gap: 20px; margin-bottom: 16px; }
.form-item { flex: 1; display: flex; flex-direction: column; gap: 6px; padding: 8px; margin: -8px; border-radius: 12px; transition: background .25s ease, box-shadow .25s ease, transform .25s ease; }
.form-item.ai-field-flash { animation: fieldFlash 1.7s ease; background: linear-gradient(135deg, rgba(0,91,172,.12), rgba(0,91,172,.03)); box-shadow: 0 0 0 1px rgba(0,91,172,.18); }
.form-item label { font-size: 12px; font-weight: 600; color: #666; }
.input-box {
  width: 100%;
  --themed-input-width: 100%;
  --themed-input-height: 38px;
  --themed-input-padding-x: 10px;
  --themed-input-radius: 8px;
  --themed-input-font-size: 13px;
  --themed-input-font-weight: 500;
  --themed-input-border: #d1d5db;
  --themed-input-bg: #ffffff;
  --themed-input-hover-bg: #f8fbff;
  --select-height: 38px;
  --select-padding-x: 10px;
  --select-radius: 8px;
  --select-font-size: 13px;
  --select-font-weight: 500;
  --select-border-color: #d1d5db;
  --select-bg: #ffffff;
  --select-hover-bg: #f8fbff;
  --select-option-active-bg: #0b4582;
}
.form-item.ai-field-flash .input-box,
.form-item.ai-field-flash .range-input { border-color: #60A5FA; box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.16); background: #f8fbff; }
.form-item.ai-field-flash .input-box {
  --select-border-color: #60A5FA;
  --select-open-border: #60A5FA;
  --select-hover-border: #60A5FA;
  --select-shadow: 0 0 0 4px rgba(96, 165, 250, 0.16);
  --select-bg: #f8fbff;
  --select-hover-bg: #f8fbff;
  --themed-input-border: #60A5FA;
  --themed-input-bg: #f8fbff;
  --themed-input-hover-bg: #f8fbff;
  --themed-input-focus-shadow: 0 0 0 4px rgba(96, 165, 250, 0.16);
}
.range-wrap { display: flex; align-items: center; gap: 8px; }
.range-input { flex: 1; --themed-input-height: 38px; --themed-input-padding-x: 10px; --themed-input-radius: 8px; --themed-input-font-size: 13px; --themed-input-font-weight: 500; --themed-input-border: #d1d5db; --themed-input-bg: #ffffff; --themed-input-hover-bg: #f8fbff; text-align: center; }
.energy-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
.modal-footer { padding: 18px 24px; border-top: 1px solid #F3F4F6; display: flex; justify-content: flex-end; }
.footer-buttons { display: flex; align-items: center; gap: 14px; }
.btn { height: 40px; padding: 0 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; }
.btn-default { background: #F8FAFC; color: #475569; border: 1px solid #D8E0EA; }
.btn-primary { background: #002B54; color: white; }
.close-btn { border: none; background: transparent; font-size: 20px; cursor: pointer; }

@keyframes modalRise {
  from { opacity: 0; transform: translateY(18px) scale(.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.filter-modal-shell-enter-active,
.filter-modal-shell-leave-active {
  transition: opacity .26s ease;
}

.filter-modal-shell-enter-active .modal-content,
.filter-modal-shell-leave-active .modal-content {
  transition: transform .3s cubic-bezier(.22, 1, .36, 1), opacity .26s ease;
}

.filter-modal-shell-enter-from,
.filter-modal-shell-leave-to {
  opacity: 0;
}

.filter-modal-shell-enter-from .modal-content,
.filter-modal-shell-leave-to .modal-content {
  opacity: 0;
  transform: translateY(22px) scale(.985);
}

.tab-panel-enter-active,
.tab-panel-leave-active {
  transition: opacity .2s ease, transform .24s ease;
}

.tab-panel-enter-from {
  opacity: 0;
  transform: translateX(12px);
}

.tab-panel-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

@keyframes fieldFlash {
  0% { transform: translateY(10px) scale(.98); opacity: .55; }
  18% { transform: translateY(0) scale(1); opacity: 1; }
  52% { box-shadow: 0 0 0 1px rgba(0,91,172,.24), 0 0 0 14px rgba(96, 165, 250, 0.12); }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

@keyframes tabFlash {
  0% { background: rgba(0,91,172,.06); }
  35% { background: rgba(0,91,172,.16); box-shadow: inset 0 -2px 0 rgba(0,91,172,.3); }
  100% { background: transparent; }
}
</style>
