<template>
  <main class="settings-page">
    <div class="settings-grid">

      <!-- 左上：用户资料卡 -->
      <div class="card profile-card">
        <div class="profile-header">
          <div class="avatar-wrapper">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="Alex Chen" class="avatar" />
            <button class="edit-avatar-btn"><Icon icon="lucide:pencil" /></button>
          </div>
          <div class="profile-title">
            <h3>Alex Chen</h3>
            <span class="user-id">ID: CSCEC-2024-0892</span>
            <div class="status-badge"><span class="dot"></span> 在线状态</div>
          </div>
        </div>
        <ul class="info-list">
          <li>
            <span class="label">所属部门</span>
            <span class="value">能源管理事业部</span>
          </li>
          <li><span class="label">当前职位</span><span class="value">首席工程师</span></li>
          <li><span class="label">联系电话</span><span class="value font-num">+86 138 **** 8888</span></li>
          <li><span class="label">电子邮箱</span><span class="value font-num">alex.chen@cscec.com</span></li>
        </ul>
      </div>

      <!-- 右上：数据管理卡 -->
      <div class="card data-card">
        <div class="card-header">
          <span class="card-icon data-icon"><Icon icon="lucide:database" /></span>
          <h3>数据管理</h3>
        </div>

        <div class="data-source">
          <span class="source-label">当前当前数据源：</span>
          <div class="source-name">BDG2 (Building Data Genome Project 2)</div>
        </div>

        <div class="data-stats">
          <div class="stat-box">
            <span class="stat-label">元数据表 (metadata)</span>
            <div class="stat-value green">1,284,502 <span class="unit">条</span></div>
          </div>
          <div class="stat-box">
            <span class="stat-label">气象表 (weather)</span>
            <div class="stat-value green">1,284,502 <span class="unit">条</span></div>
          </div>
          <div class="stat-box">
            <span class="stat-label">能耗表 (meters)</span>
            <div class="stat-value green">1,284,502 <span class="unit">条</span></div>
          </div>
        </div>

        <!-- 导入数据集入口 -->
        <div class="upload-entry" @click="openModal">
          <Icon icon="lucide:upload-cloud" class="upload-entry-icon" />
          <div>
            <h4>导入数据集</h4>
            <p>CSV / JSON / XLSX，最大 500MB</p>
          </div>
        </div>
      </div>

      <!-- 左侧下方堆叠：智能通知 + 系统时间与同步 -->
      <div class="left-stack">
        <!-- 智能通知卡 -->
        <div class="card notify-card">
          <div class="card-header">
            <span class="card-icon notify-icon"><Icon icon="lucide:bell-ring" /></span>
            <h3>智能通知</h3>
          </div>
          <p class="card-desc">通知页面配置</p>

          <div class="toggle-list">
            <div class="toggle-item" v-for="(item, index) in notifySettings" :key="index">
              <span class="item-icon" :class="item.iconClass"><Icon :icon="item.icon" /></span>
              <div class="item-info">
                <h4>{{ item.title }}</h4>
                <p>{{ item.desc }}</p>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="item.enabled" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- 系统时间与同步卡 -->
        <div class="card time-sync-card">
          <div class="card-header">
            <span class="card-icon time-icon"><Icon icon="lucide:clock" /></span>
            <h3>系统时间与同步</h3>
          </div>

          <div class="time-content-stacked">
            <div class="time-display-compact">
              <div class="time-value">{{ currentTime }}</div>
              <div class="time-date">{{ currentDate }}</div>
            </div>

            <div class="time-controls">
              <div class="input-group">
                <label>目标时间设置（数据集时间范围：2015-2016）</label>
                <input type="datetime-local" v-model="targetTime" class="themed-input datetime-input" />
              </div>

              <div class="input-group">
                <label>时区设置</label>
                <ThemedSelect
                  v-model="timezone"
                  class="setting-select"
                  aria-label="时区设置"
                  :options="timezoneOptions"
                />
              </div>

              <div class="time-actions">
                <button class="time-btn primary" :disabled="timeSaving" @click="applyTime">
                  {{ timeSaving ? '同步中...' : '立即修改当前时间' }}
                </button>
                <button class="time-btn secondary" :disabled="timeSaving" @click="restoreTime">
                  {{ timeSaving ? '请稍候...' : '恢复真实系统时间' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右下：AI 引擎配置卡 -->
      <div class="card ai-card">
        <div class="card-header">
          <span class="card-icon ai-icon"><Icon icon="lucide:bot" /></span>
          <h3>AI引擎配置</h3>
          <span v-if="!aiLoading" class="connection-status" :class="{ active: aiSettings?.llm?.api_key_configured }">
            {{ aiSettings?.llm?.api_key_configured ? '已连接 (Active)' : '未连接 (Inactive)' }}
          </span>
        </div>
        <p class="card-desc">配置 LLM 大模型与 RAGFlow 知识库引擎</p>

        <template v-if="aiLoading">
          <div class="ai-loading">加载 AI 配置中...</div>
        </template>
        <template v-else-if="aiError">
          <div class="ai-error">{{ aiError }}</div>
          <button class="retry-btn" @click="fetchAISettings">重新加载</button>
        </template>
        <template v-else>
          <!-- LLM 大模型配置 (可折叠) -->
          <div class="ai-accordion">
            <button class="ai-accordion-header" @click="toggleSection('llm')">
              <span class="ai-accordion-title">LLM 大模型配置</span>
              <Icon :icon="expandedSections.llm ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="ai-accordion-arrow" />
            </button>
            <div class="ai-accordion-body" :class="{ expanded: expandedSections.llm }">
              <div class="ai-accordion-inner">
                <div class="input-group">
                  <label>服务地址 (Base URL)</label>
                  <input class="themed-input settings-field" type="text" v-model="aiSettings.llm.base_url" placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1" />
                </div>

                <div class="input-group">
                  <label>API KEY</label>
                  <div class="input-with-icon">
                    <input
                      class="themed-input settings-field"
                      :type="showApiKey ? 'text' : 'password'"
                      :value="aiSettings.llm.api_key || (aiSettings.llm.api_key_configured ? '********************' : '')"
                      @input="onApiKeyInput"
                    />
                    <button class="eye-btn" @click="showApiKey = !showApiKey">
                      <Icon :icon="showApiKey ? 'lucide:eye' : 'lucide:eye-off'" />
                    </button>
                  </div>
                </div>

                <div class="input-group">
                  <label>模型名称 (Model)</label>
                  <input class="themed-input settings-field" type="text" v-model="aiSettings.llm.model" placeholder="qwen3.5-plus" />
                </div>

                <div class="ai-params-row">
                  <div class="input-group half">
                    <label>温度 (Temperature)</label>
                    <input class="themed-input settings-field" type="number" step="0.1" min="0" max="2" v-model.number="aiSettings.llm.temperature" />
                  </div>
                  <div class="input-group half">
                    <label>Top-P</label>
                    <input class="themed-input settings-field" type="number" step="0.1" min="0" max="1" v-model.number="aiSettings.llm.top_p" />
                  </div>
                  <div class="input-group half">
                    <label>超时 (秒)</label>
                    <input class="themed-input settings-field" type="number" min="10" v-model.number="aiSettings.llm.timeout_seconds" />
                  </div>
                </div>

                <div class="toggle-row">
                  <span class="toggle-label">启用历史对话</span>
                  <label class="switch">
                    <input type="checkbox" v-model="aiSettings.features.enable_history" />
                    <span class="slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- RAGFlow 知识库配置 (可折叠) -->
          <div class="ai-accordion">
            <button class="ai-accordion-header" @click="toggleSection('ragflow')">
              <span class="ai-accordion-title">RAGFlow 知识库配置</span>
              <Icon :icon="expandedSections.ragflow ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="ai-accordion-arrow" />
            </button>
            <div class="ai-accordion-body" :class="{ expanded: expandedSections.ragflow }">
              <div class="ai-accordion-inner">
                <div class="input-group">
                  <label>RAGFlow API 地址</label>
                  <input class="themed-input settings-field" type="text" v-model="aiSettings.ragflow.api_url" placeholder="http://127.0.0.1:8450/api/v1" />
                </div>

                <div class="input-group">
                  <label>RAGFlow API KEY</label>
                  <div class="input-with-icon">
                    <input
                      class="themed-input settings-field"
                      :type="showRagflowKey ? 'text' : 'password'"
                      :value="aiSettings.ragflow.api_key || (aiSettings.ragflow.api_key_configured ? '********************' : '')"
                      @input="onRagflowKeyInput"
                    />
                    <button class="eye-btn" @click="showRagflowKey = !showRagflowKey">
                      <Icon :icon="showRagflowKey ? 'lucide:eye' : 'lucide:eye-off'" />
                    </button>
                  </div>
                </div>

                <div class="ai-params-row">
                  <div class="input-group half">
                    <label>Chat Model</label>
                    <input class="themed-input settings-field" type="text" v-model="aiSettings.ragflow.chat_model" placeholder="ragflow-chat" />
                  </div>
                  <div class="input-group half">
                    <label>Default Chat ID</label>
                    <input class="themed-input settings-field" type="text" v-model="aiSettings.ragflow.default_chat_id" placeholder="" />
                  </div>
                </div>

                <div class="input-group">
                  <label>数据集 ID (dataset_ids，逗号分隔)</label>
                  <input class="themed-input settings-field" type="text" :value="aiSettings.ragflow.dataset_ids?.join(', ')" @input="onDatasetIdsInput" placeholder="dataset_001, dataset_002" />
                </div>

                <div class="toggle-row">
                  <span class="toggle-label">使用知识图谱</span>
                  <label class="switch">
                    <input type="checkbox" v-model="aiSettings.features.enable_knowledge" />
                    <span class="slider"></span>
                  </label>
                </div>
                <p class="kg-hint">开启后AI将基于设备拓扑关系进行深度推理，关闭则仅匹配文档文字</p>
              </div>
            </div>
          </div>

          <button class="save-ai-btn" @click="saveAISettings">保存 AI 配置</button>
        </template>
      </div>

    </div>

    <Transition name="settings-toast">
      <div v-if="toast.visible" class="settings-toast" :class="toast.type" role="status" aria-live="polite">
        <div class="toast-icon">
          <Icon :icon="toastIcon" />
        </div>
        <div class="toast-copy">
          <strong>{{ toast.title }}</strong>
          <span>{{ toast.message }}</span>
        </div>
        <button class="toast-close" type="button" aria-label="关闭提示" @click="hideToast">
          <Icon icon="lucide:x" />
        </button>
      </div>
    </Transition>

    <!-- 上传数据集确认弹窗 -->
    <div v-if="showUploadModal" class="upload-modal-overlay" @click.self="closeModal">
      <div class="upload-modal">
        <div class="modal-header">
          <div class="modal-title-area">
            <h3>上传数据集确认</h3>
          </div>
          <button class="modal-close-btn" @click="closeModal">✕</button>
        </div>

        <div class="modal-body">
          <p class="modal-subtitle">请找到上传的原始数据文件信息，并分配数据类型</p>

          <div class="info-banner">
            <span>无法直接查看文件上传后，该操作仅对文件进行元数据匹配。</span>
          </div>

          <div class="file-info-card" @click="triggerFileSelect">
            <div class="file-info-left">
              <div class="file-detail">
                <span class="file-name-text">{{ uploadedFileName || '未选择文件' }}</span>
                <span class="file-size-text">{{ uploadedFileSize }}</span>
              </div>
            </div>
            <span class="file-tag">CSV 文件</span>
          </div>

          <div class="section-label">数据源类型</div>
          <div class="tab-group">
            <button
              v-for="tab in dataSourceTabs"
              :key="tab.key"
              class="tab-item"
              :class="{ active: activeTab === tab.key }"
              @click="activeTab = tab.key"
            >{{ tab.label }}</button>
          </div>

          <template v-if="activeTab === 'raw'">
            <div class="sub-type-section">
              <label class="sub-label">子数据类型（按表计类别）</label>
              <ThemedSelect
                v-model="selectedMeterType"
                class="meter-select"
                aria-label="子数据类型"
                placeholder="请选择表计类型"
                :options="meterTypes"
              />
            </div>
          </template>

          <div class="hint-bar">
            <span>确认后，系统将开启数据解析和自动校验流程，预计耗时约 45 秒，上传过程中请保持页面活跃。</span>
          </div>

          <div v-if="uploadMessage" class="upload-status-bar" :class="{ success: uploadSuccess, error: !uploadSuccess && !uploading }">
            <span class="status-icon">{{ uploading ? '执行中...' : (uploadSuccess ? '已完成' : '失败') }}</span>
            <span class="status-text">{{ uploadMessage }}</span>
          </div>
        </div>

        <input
          ref="fileInputRef"
          type="file"
          accept=".csv,.xlsx,.xls"
          style="display: none"
          @change="handleFileSelected"
        />

        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal" :disabled="uploading">取消</button>
          <button class="btn-confirm" :disabled="!canConfirm || uploading" @click="confirmUpload">
            {{ uploading ? '上传中...' : '确认上传' }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { getRuntimeAISettings, type RuntimeAISettingsResponse, uploadMetadataDataset, uploadWeatherDataset, uploadRawMeterDataset } from '../api/system'
import { useTimeManager } from '../utils/timeManager'
import { Icon } from '@iconify/vue'
import ThemedSelect from './common/ThemedSelect.vue'

// AI 配置折叠面板状态
const expandedSections = reactive<Record<string, boolean>>({
  llm: false,
  ragflow: false
})
const toggleSection = (key: string) => {
  expandedSections[key] = !expandedSections[key]
}

const notifySettings = reactive([
  { title: '异常预警提醒', desc: '能耗突破预设阈值时即时通知', icon: 'lucide:alert-triangle', iconClass: 'red', enabled: true },
  { title: '告警通知', desc: '系统层级安全告警与维护提示', icon: 'lucide:shield-alert', iconClass: 'gray', enabled: true },
  { title: '待办任务提醒', desc: '每日节能任务与巡检任务提醒', icon: 'lucide:calendar-check', iconClass: 'blue', enabled: false },
  { title: '功能通知', desc: '系统功能升级与周报推送', icon: 'lucide:info', iconClass: 'gray', enabled: true }
])

const showApiKey = ref(false)
const showRagflowKey = ref(false)
const timezone = ref('GMT+08:00')
const timeSaving = ref(false)
let toastTimer: number | null = null

const toast = reactive({
  visible: false,
  type: 'success' as 'success' | 'error' | 'info',
  title: '',
  message: ''
})

const toastIcon = computed(() => {
  if (toast.type === 'success') return 'lucide:check-circle-2'
  if (toast.type === 'error') return 'lucide:alert-circle'
  return 'lucide:info'
})

const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
  if (toastTimer !== null) {
    window.clearTimeout(toastTimer)
    toastTimer = null
  }
  toast.type = type
  toast.title = title
  toast.message = message
  toast.visible = true
  toastTimer = window.setTimeout(() => {
    toast.visible = false
    toastTimer = null
  }, 4200)
}

const hideToast = () => {
  if (toastTimer !== null) {
    window.clearTimeout(toastTimer)
    toastTimer = null
  }
  toast.visible = false
}

const aiLoading = ref(true)
const aiError = ref('')
const aiSettings = reactive<RuntimeAISettingsResponse>({
  config_path: '',
  llm: {
    base_url: '',
    api_key: '',
    api_key_configured: false,
    model: '',
    timeout_seconds: 420,
    temperature: 0.2,
    top_p: 0.9
  },
  ragflow: {
    api_url: '',
    api_key: '',
    api_key_configured: false,
    timeout_seconds: 60,
    chat_model: 'ragflow-chat',
    dataset_ids: [],
    default_chat_id: ''
  },
  features: {
    enable_history: true,
    enable_knowledge: true
  }
})

const fetchAISettings = async () => {
  aiLoading.value = true
  aiError.value = ''
  try {
    const res = await getRuntimeAISettings() as any
    Object.assign(aiSettings, res)
    if (res.llm) Object.assign(aiSettings.llm, res.llm)
    if (res.ragflow) Object.assign(aiSettings.ragflow, res.ragflow)
    if (res.features) Object.assign(aiSettings.features, res.features)
  } catch (err) {
    console.error('获取AI配置失败:', err)
    aiError.value = '无法连接后端服务，请检查网络或服务状态'
  } finally {
    aiLoading.value = false
  }
}

const onApiKeyInput = (e: Event) => {
  aiSettings.llm.api_key = (e.target as HTMLInputElement).value
}

const onRagflowKeyInput = (e: Event) => {
  aiSettings.ragflow.api_key = (e.target as HTMLInputElement).value
}

const onDatasetIdsInput = (e: Event) => {
  const raw = (e.target as HTMLInputElement).value
  aiSettings.ragflow.dataset_ids = raw.split(',').map(s => s.trim()).filter(Boolean)
}

const saveAISettings = async () => {
  try {
    const { config_path, ...payload } = aiSettings
    await import('../utils/request').then(m => m.default.put('/system/ai-settings', payload))
    showToast('success', 'AI 配置已保存', '新的模型与知识库配置已写入系统。')
  } catch (err: any) {
    console.error('保存AI配置失败:', err)
    showToast('error', 'AI 配置保存失败', err?.response?.data?.detail || err?.message || '请检查网络连接或后端服务状态。')
  }
}

const { state: timeState, startCustomTime, resetToNaturalTime, syncTimeToBackend, getCurrentTimeString } = useTimeManager()

const currentTime = ref('14:32:05')
const currentDate = ref('2026年10月4日 星期四')
const targetTime = ref('')
let timeTimer: number | null = null

const timezoneMap: Record<string, string> = {
  'GMT+08:00': 'Asia/Shanghai',
  'GMT+09:00': 'Asia/Tokyo',
  'GMT+00:00': 'Europe/London',
  'GMT-05:00': 'America/New_York'
}
const timezoneOptions = [
  { value: 'GMT+08:00', label: '(GMT+08:00) 北京、上海、香港' },
  { value: 'GMT+09:00', label: '(GMT+09:00) 东京、首尔' },
  { value: 'GMT+00:00', label: '(GMT+00:00) 伦敦、都柏林' },
  { value: 'GMT-05:00', label: '(GMT-05:00) 纽约、华盛顿' }
]

const getTimezoneOffset = (tz: string): string => {
  const map: Record<string, string> = {
    'GMT+08:00': '+08:00',
    'GMT+09:00': '+09:00',
    'GMT+00:00': '+00:00',
    'GMT-05:00': '-05:00'
  }
  return map[tz] || '+08:00'
}

const updateTime = () => {
  const current = new Date(getCurrentTimeString())
  formatAndDisplayTime(current)
}

const formatAndDisplayTime = (date: Date) => {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  currentTime.value = `${h}:${m}:${s}`

  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  currentDate.value = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`
}

const formatReadableDateTime = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

const reverseTimezoneMap: Record<string, string> = {
  'Asia/Shanghai': 'GMT+08:00',
  'Asia/Tokyo': 'GMT+09:00',
  'Europe/London': 'GMT+00:00',
  'America/New_York': 'GMT-05:00'
}

onMounted(() => {
  updateTime()
  timeTimer = window.setInterval(updateTime, 1000)
  fetchAISettings()
  if (timeState.timezone) {
    timezone.value = reverseTimezoneMap[timeState.timezone] || 'GMT+08:00'
  }
})

onUnmounted(() => {
  if (timeTimer !== null) clearInterval(timeTimer)
  if (toastTimer !== null) window.clearTimeout(toastTimer)
})

const applyTime = async () => {
  if (!targetTime.value) {
    showToast('info', '请选择目标时间', '先在时间输入框中选择一个数据集内的时间点，再执行修改。')
    return
  }
  const offset = getTimezoneOffset(timezone.value)
  const isoTime = `${targetTime.value}${offset}`
  const ianaTz = timezoneMap[timezone.value] || 'Asia/Shanghai'
  const previousWasCustom = timeState.isCustomTime
  const previousTime = getCurrentTimeString()
  const previousTimezone = timeState.timezone
  timeSaving.value = true
  try {
    startCustomTime(isoTime, ianaTz)
    await syncTimeToBackend()
    showToast('success', '系统时间已切换', `当前页面和后端服务已同步至 ${formatReadableDateTime(isoTime)}。`)
  } catch (err: any) {
    if (previousWasCustom) startCustomTime(previousTime, previousTimezone)
    else resetToNaturalTime()
    console.error('设置时间失败:', err)
    showToast('error', '时间设置失败', err?.response?.data?.detail || err?.message || '未能同步到后端服务，已保留原时间设置。')
  } finally {
    timeSaving.value = false
  }
}

const restoreTime = async () => {
  const previousWasCustom = timeState.isCustomTime
  const previousTime = getCurrentTimeString()
  const previousTimezone = timeState.timezone
  timeSaving.value = true
  try {
    resetToNaturalTime()
    await syncTimeToBackend()
    showToast('success', '已恢复真实时间', '系统将重新使用当前真实环境时间作为数据查询基准。')
  } catch (err: any) {
    if (previousWasCustom) startCustomTime(previousTime, previousTimezone)
    console.error('时间恢复失败:', err)
    showToast('error', '时间恢复失败', err?.response?.data?.detail || err?.message || '后端同步未完成，已保留原时间设置。')
  } finally {
    timeSaving.value = false
  }
}

// 上传数据集相关
const showUploadModal = ref(false)
const uploading = ref(false)
const uploadMessage = ref('')
const uploadSuccess = ref(false)
const uploadedFile = ref<File | null>(null)
const uploadedFileName = ref('')
const uploadedFileSize = ref('')
const activeTab = ref<'weather' | 'metadata' | 'raw'>('raw')
const selectedMeterType = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

const dataSourceTabs = [
  { key: 'weather' as const, label: '天气数据' },
  { key: 'metadata' as const, label: '建筑元数据' },
  { key: 'raw' as const, label: '表计原始数据' }
]

const meterTypes = [
  { value: 'electricity', label: '电表 (Electricity)' },
  { value: 'water', label: '水表 (Water)' },
  { value: 'gas', label: '燃气表 (Gas)' },
  { value: 'steam', label: '蒸汽表 (Steam)' },
  { value: 'hotwater', label: '热水表 (Hotwater)' },
  { value: 'chilledwater', label: '冷水表 (Chilledwater)' },
  { value: 'irrigation', label: '灌溉表 (Irrigation)' },
  { value: 'solar', label: '太阳能表 (Solar)' }
]

const canConfirm = computed(() => {
  if (!uploadedFile.value) return false
  if (activeTab.value === 'raw') return !!selectedMeterType.value
  return true
})

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const openModal = () => { resetUploadState(); showUploadModal.value = true }
const closeModal = () => { if (!uploading.value) { showUploadModal.value = false; resetUploadState() } }
const triggerFileSelect = () => { fileInputRef.value?.click() }

const handleFileSelected = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadedFile.value = file
  uploadedFileName.value = file.name
  uploadedFileSize.value = formatFileSize(file.size)
  if (!canConfirm.value && activeTab.value === 'raw') selectedMeterType.value = ''
}

const confirmUpload = async () => {
  if (!uploadedFile.value || !canConfirm.value) return
  uploading.value = true
  uploadMessage.value = ''
  uploadSuccess.value = false
  try {
    let res
    if (activeTab.value === 'metadata') res = await uploadMetadataDataset(uploadedFile.value)
    else if (activeTab.value === 'weather') res = await uploadWeatherDataset(uploadedFile.value)
    else res = await uploadRawMeterDataset(selectedMeterType.value, uploadedFile.value)
    uploadMessage.value = (res as any).message || '文件已接收，后台任务已入队'
    uploadSuccess.value = true
    setTimeout(() => { showUploadModal.value = false; resetUploadState() }, 2000)
  } catch (err: any) {
    console.error('上传失败:', err)
    uploadMessage.value = err?.response?.data?.detail || err?.message || '上传失败，请重试'
    uploadSuccess.value = false
  } finally {
    uploading.value = false
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

const resetUploadState = () => {
  uploadedFile.value = null; uploadedFileName.value = ''; uploadedFileSize.value = ''
  activeTab.value = 'raw'; selectedMeterType.value = ''
  uploading.value = false; uploadMessage.value = ''; uploadSuccess.value = false
}
</script>

<style scoped>
.settings-page {
  padding: 30px 40px;
  background-color: #f4f7f9;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}

/* 2x2 网格 */
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* 左侧堆叠容器 */
.left-stack {
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-self: start;
}

.ai-card {
  align-self: start;
}

.card {
  background: white;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
}
.full-width { grid-column: 1 / -1; }

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}
.card-header h3 { margin: 0; font-size: 18px; color: #111; font-weight: 700; }
.card-desc { margin: 0 0 20px 0; font-size: 13px; color: #888; }

.card-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.data-icon { background: #eff6ff; color: #0b4582; }
.notify-icon { background: #eff6ff; color: #0b4582; }
.ai-icon { background: #eff6ff; color: #0b4582; }
.time-icon { background: #eff6ff; color: #0b4582; }

.font-num { font-family: 'Courier New', Courier, monospace; font-weight: 600; }

/* 用户资料卡 */
.profile-header { display: flex; align-items: center; gap: 20px; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px dashed #eee; }
.avatar-wrapper { position: relative; width: 80px; height: 80px; }
.avatar { width: 100%; height: 100%; border-radius: 16px; object-fit: cover; }
.edit-avatar-btn { position: absolute; bottom: -6px; right: -6px; background: #0b4582; color: white; border: none; border-radius: 50%; width: 28px; height: 28px; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
.profile-title h3 { margin: 0 0 4px 0; font-size: 20px; color: #111; }
.user-id { display: inline-block; font-size: 13px; color: #0b4582; background: #eff6ff; padding: 2px 8px; border-radius: 4px; font-weight: 600; margin-bottom: 8px; }
.status-badge { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #666; background: #f9f9f9; width: max-content; padding: 2px 10px; border-radius: 12px; }
.status-badge .dot { width: 6px; height: 6px; background: #10b981; border-radius: 50%; }

.dept-badge { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; background: #0b4582; color: white; border-radius: 6px; font-size: 11px; font-weight: 700; margin-right: 6px; }

.info-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 20px; }
.info-list li { display: flex; justify-content: space-between; font-size: 14px; }
.info-list .label { color: #888; }
.info-list .value { color: #111; font-weight: 500; display: flex; align-items: center; }

/* 数据管理卡 */
.data-source { background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 20px; }
.source-label { font-size: 12px; color: #888; display: block; margin-bottom: 4px; }
.source-name { font-size: 18px; font-weight: 700; color: #111; }
.data-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
.stat-box { background: #f8fafc; padding: 16px; border-radius: 12px; }
.stat-label { font-size: 12px; color: #666; display: block; margin-bottom: 8px; }
.stat-value { font-size: 20px; font-weight: bold; color: #111; }
.stat-value.green { color: #10b981; }
.stat-value .unit { font-size: 12px; font-weight: normal; color: #888; }

.upload-entry {
  display: flex; align-items: center; gap: 16px;
  padding: 16px 20px;
  border: 2px dashed #d0dbe5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.upload-entry:hover { border-color: #0b4582; background: #fafcff; }
.upload-entry-icon { font-size: 28px; color: #0b4582; }
.upload-entry h4 { margin: 0 0 2px 0; font-size: 14px; color: #111; }
.upload-entry p { margin: 0; font-size: 12px; color: #888; }

/* 智能通知卡 */
.toggle-list { display: flex; flex-direction: column; gap: 22px; }
.toggle-item { display: flex; align-items: center; gap: 16px; }
.item-icon {
  width: 40px; height: 40px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.item-icon.red { background: #fef2f2; color: #ef4444; }
.item-icon.gray { background: #f4f4f5; color: #52525b; }
.item-icon.blue { background: #eff6ff; color: #3b82f6; }
.item-info { flex: 1; }
.item-info h4 { margin: 0 0 4px 0; font-size: 15px; color: #333; }
.item-info p { margin: 0; font-size: 12px; color: #888; }

/* Toggle Switch */
.switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #e4e4e7; transition: .3s; border-radius: 24px; }
.slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
input:checked + .slider { background-color: #0b4582; }
input:checked + .slider:before { transform: translateX(20px); }

/* AI 引擎配置卡 */
.connection-status {
  margin-left: auto;
  font-size: 11px; padding: 4px 12px; border-radius: 10px;
  font-weight: 600; background: #f1f5f9; color: #666;
}
.connection-status.active { background: #ecfdf5; color: #059669; }

.input-group { margin-bottom: 20px; }
.input-group label { display: block; font-size: 12px; color: #666; margin-bottom: 8px; font-weight: 500; }
.settings-field {
  --themed-input-height: 44px;
  --themed-input-padding-x: 14px;
  --themed-input-radius: 14px;
  --themed-input-font-size: 14px;
  --themed-input-font-weight: 600;
  --themed-input-border: #dbe5ef;
  --themed-input-bg: #f8fbff;
  --themed-input-hover-bg: #eef5fd;
}

.setting-select {
  --select-width: 100%;
  --select-height: 42px;
  --select-padding-x: 14px;
  --select-radius: 14px;
  --select-font-size: 14px;
  --select-font-weight: 500;
  --select-border-color: #dbe5ef;
  --select-bg: #f8fbff;
  --select-hover-bg: #eef5fd;
  --select-option-active-bg: #0b4582;
}

.input-with-icon { position: relative; display: flex; align-items: center; }
.input-with-icon input { padding-right: 40px; }
.eye-btn {
  position: absolute; right: 0;
  background: none; border: none; cursor: pointer;
  color: #888; font-size: 18px;
  display: flex; align-items: center; justify-content: center;
  padding: 4px;
  transition: color 0.2s;
}
.eye-btn:hover { color: #0b4582; }

.select-wrapper { position: relative; }
.select-wrapper input { cursor: pointer; }
.select-caret {
  position: absolute; right: 0; top: 50%;
  transform: translateY(-50%);
  color: #888; font-size: 18px;
  pointer-events: none;
}

.toggle-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 12px; padding-top: 16px; border-top: 1px solid #f0f0f0;
}
.toggle-label { font-size: 14px; color: #333; font-weight: 500; }
.kg-hint { margin: 10px 0 0 0; font-size: 11px; color: #aaa; line-height: 1.6; }

.ai-loading { text-align: center; padding: 40px 0; color: #888; font-size: 14px; }
.ai-error { color: #ef4444; font-size: 13px; text-align: center; padding: 20px 0; }
.retry-btn { width: 100%; padding: 10px; margin-top: 12px; background: #fef2f2; border: none; border-radius: 8px; color: #ef4444; font-size: 13px; cursor: pointer; }

.ai-section-label {
  font-size: 12px; font-weight: 700; color: #0b4582;
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 16px; padding-bottom: 8px;
  border-bottom: 2px solid #eff6ff;
}

/* 折叠面板 (Accordion) */
.ai-accordion {
  margin-bottom: 10px;
  border: 1.5px solid #e8eef5;
  border-radius: 14px;
  overflow: hidden;
  transition: border-color 0.2s;
}
.ai-accordion:hover { border-color: #c8d8ec; }

.ai-accordion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px 20px;
  background: #f8fafc;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}
.ai-accordion-header:hover { background: #eef3fa; }
.ai-accordion-title {
  font-size: 13px;
  font-weight: 700;
  color: #0b4582;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.ai-accordion-arrow {
  font-size: 18px;
  color: #0b4582;
  transition: transform 0.3s ease;
}

.ai-accordion-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.ai-accordion-body.expanded {
  max-height: 800px;
}
.ai-accordion-inner {
  padding: 20px;
}

.ai-params-row { display: flex; gap: 16px; }
.input-group.half { flex: 1; }

.save-ai-btn {
  width: 100%; padding: 12px; margin-top: 20px;
  background: #0b4582; color: white;
  border: none; border-radius: 12px;
  font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
}
.save-ai-btn:hover { background: #093b6e; }
.save-ai-btn:active { transform: scale(0.98); }

/* 时间同步卡 (竖向布局) */
.time-content-stacked {
  display: flex; flex-direction: column; gap: 20px;
}
.time-display-compact {
  text-align: center;
  padding: 18px 20px;
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f0fe 100%);
  border-radius: 14px;
}
.time-value {
  font-size: 34px; font-weight: 700; color: #0b4582;
  letter-spacing: 2px; font-family: 'Courier New', Courier, monospace;
}
.time-date { font-size: 13px; color: #666; margin-top: 6px; }

.time-controls { flex: 1; }
.time-actions { display: flex; gap: 12px; margin-top: 4px; }
.time-btn {
  flex: 1; padding: 12px;
  border: none; border-radius: 12px;
  font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
}
.time-btn:active { transform: scale(0.98); }
.time-btn:disabled {
  cursor: not-allowed;
  opacity: 0.62;
  transform: none;
}
.time-btn.primary { background: #eff6ff; color: #0b4582; }
.time-btn.primary:hover { background: #dbeafe; }
.time-btn.secondary { background: #fafbfc; color: #333; border: 1px solid #c8d8ec; }
.time-btn.secondary:hover { background: #f0f4f8; }

.datetime-input {
  --themed-input-height: 42px;
  --themed-input-padding-x: 14px;
  --themed-input-radius: 12px;
  --themed-input-font-size: 14px;
  --themed-input-font-weight: 600;
  --themed-input-border: #dbe5ef;
  --themed-input-bg: #f8fbff;
  --themed-input-hover-bg: #eef5fd;
}

@media (max-width: 1200px) {
  .settings-grid { grid-template-columns: 1fr; }
}

.settings-toast {
  position: fixed;
  right: 34px;
  top: 88px;
  z-index: 1100;
  width: min(420px, calc(100vw - 32px));
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 30px;
  gap: 12px;
  align-items: center;
  padding: 16px 16px 16px 14px;
  border: 1px solid rgba(219, 229, 239, 0.92);
  border-radius: 18px;
  background:
    radial-gradient(circle at 8% 12%, rgba(11, 69, 130, 0.11), transparent 30%),
    rgba(255, 255, 255, 0.96);
  box-shadow: 0 22px 55px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(16px);
}

.settings-toast::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  border-radius: 18px 0 0 18px;
  background: #0b4582;
}

.settings-toast.success::before { background: #059669; }
.settings-toast.error::before { background: #dc2626; }
.settings-toast.info::before { background: #0b4582; }

.toast-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0b4582;
  background: #eff6ff;
  font-size: 21px;
}

.settings-toast.success .toast-icon {
  color: #059669;
  background: #ecfdf5;
}

.settings-toast.error .toast-icon {
  color: #dc2626;
  background: #fef2f2;
}

.toast-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toast-copy strong {
  color: #0f172a;
  font-size: 14px;
  font-weight: 800;
}

.toast-copy span {
  color: #52637a;
  font-size: 12px;
  line-height: 1.55;
}

.toast-close {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 10px;
  background: #f4f7fb;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s ease;
}

.toast-close:hover {
  color: #0b4582;
  background: #e8f0fe;
}

.settings-toast-enter-active,
.settings-toast-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.settings-toast-enter-from,
.settings-toast-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

/* 上传弹窗 */
.upload-modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.upload-modal {
  background: #fff; border-radius: 16px;
  width: 540px; max-height: 85vh;
  display: flex; flex-direction: column;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 16px;
}
.modal-title-area { display: flex; align-items: center; gap: 10px; }
.modal-header h3 { margin: 0; font-size: 17px; color: #111; font-weight: 600; }
.modal-close-btn {
  background: #f1f3f5; border: none; color: #666; font-size: 15px;
  cursor: pointer; width: 30px; height: 30px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.modal-close-btn:hover { background: #e2e4e7; color: #333; }

.modal-body { flex: 1; overflow-y: auto; padding: 0 24px 20px; }
.modal-subtitle { margin: 0 0 14px; font-size: 13px; color: #555; }
.info-banner {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 14px; background: #f8fafc; border-radius: 8px;
  margin-bottom: 18px; font-size: 12px; color: #666; line-height: 1.5;
}

.file-info-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; background: #fff; border: 1.5px solid #e2e8f0;
  border-radius: 10px; cursor: pointer; transition: all 0.2s; margin-bottom: 22px;
}
.file-info-card:hover { border-color: #0b4582; background: #fbfdff; }
.file-info-left { display: flex; align-items: center; gap: 12px; }
.file-detail { display: flex; flex-direction: column; gap: 2px; }
.file-name-text { font-size: 14px; font-weight: 600; color: #111; }
.file-size-text { font-size: 11px; color: #888; font-family: monospace; }
.file-tag { padding: 4px 10px; background: #eef6ff; color: #0b4582; font-size: 11px; font-weight: 600; border-radius: 6px; }

.section-label { font-size: 12px; color: #666; font-weight: 600; margin-bottom: 8px; }
.tab-group {
  display: flex; gap: 0;
  border: 1.5px solid #e2e8f0; border-radius: 10px;
  overflow: hidden; margin-bottom: 18px;
}
.tab-item {
  flex: 1; padding: 9px 0; text-align: center;
  font-size: 13px; color: #555; background: #fff;
  border: none; cursor: pointer; transition: all 0.2s;
  font-weight: 500; border-right: 1.5px solid #e2e8f0;
}
.tab-item:last-child { border-right: none; }
.tab-item:hover { background: #f8fafc; }
.tab-item.active { background: #0b4582; color: #fff; font-weight: 600; }
.tab-item.active:hover { background: #093b6e; }

.sub-type-section { margin-bottom: 18px; }
.sub-label { display: block; font-size: 12px; color: #666; font-weight: 500; margin-bottom: 6px; }
.meter-select {
  --select-width: 100%;
  --select-height: 42px;
  --select-padding-x: 14px;
  --select-radius: 10px;
  --select-font-size: 13px;
  --select-font-weight: 500;
  --select-border-color: #e2e8f0;
  --select-bg: #ffffff;
  --select-hover-bg: #f8fbff;
}

.hint-bar {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 12px 14px; background: #ecfdf5; border-radius: 8px;
  margin-bottom: 14px; font-size: 12px; color: #059669; line-height: 1.5;
}

.modal-footer {
  display: flex; justify-content: flex-end; gap: 12px;
  padding: 16px 24px; border-top: 1px solid #eee; background: #fafbfc;
}
.btn-cancel {
  padding: 9px 24px; border-radius: 8px; font-size: 13px; font-weight: 500;
  cursor: pointer; border: 1.5px solid #d0dbe5; background: #fff; color: #555;
}
.btn-cancel:hover:not(:disabled) { background: #f4f7fa; }
.btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-confirm {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 24px; border-radius: 8px; font-size: 13px; font-weight: 600;
  cursor: pointer; border: none; background: #0b4582; color: #fff;
}
.btn-confirm:hover:not(:disabled) { background: #093b6e; }
.btn-confirm:disabled { opacity: 0.45; cursor: not-allowed; }

.upload-status-bar {
  display: flex; align-items: center; gap: 8px;
  margin-top: 12px; padding: 10px 14px;
  border-radius: 8px; font-size: 13px;
  animation: fadeIn 0.25s ease;
}
.upload-status-bar.success { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
.upload-status-bar.error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.status-icon { font-size: 15px; flex-shrink: 0; }
.status-text { flex: 1; word-break: break-word; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
