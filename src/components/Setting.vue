<template>
  <main class="settings-page">
    <header class="page-header">
      <div class="title-area">
        <h2>系统设置</h2>
        <p class="subtitle">管理您的个人资料、数据连接及 AI 引擎配置</p>
      </div>
      <div class="action-buttons">
        <button class="btn btn-default">取消更改</button>
        <button class="btn btn-primary" @click="saveSettings">保存设置</button>
      </div>
    </header>

    <div class="settings-grid">

      <div class="grid-column">

        <div class="card profile-card">
          <div class="profile-header">
            <div class="avatar-wrapper">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="Alex Chen" class="avatar" />
              <button class="edit-avatar-btn">✏️</button>
            </div>
            <div class="profile-title">
              <h3>Alex Chen</h3>
              <span class="user-id">ID: CSCEC-2024-0892</span>
              <div class="status-badge"><span class="dot"></span> 在线状态</div>
            </div>
          </div>

          <ul class="info-list">
            <li><span class="label">所属部门</span><span class="value">能源管理事业部</span></li>
            <li><span class="label">当前职位</span><span class="value">首席工程师</span></li>
            <li><span class="label">联系电话</span><span class="value font-num">+86 138 **** 8888</span></li>
            <li><span class="label">电子邮箱</span><span class="value font-num">alex.chen@cscec.com</span></li>
          </ul>
        </div>

        <div class="card notify-card">
          <div class="card-header">
            <span class="icon">🔔</span>
            <h3>智能通知</h3>
          </div>
          <p class="card-desc">通知页面配置</p>

          <div class="toggle-list">
            <div class="toggle-item" v-for="(item, index) in notifySettings" :key="index">
              <div class="item-icon" :class="item.iconClass">{{ item.icon }}</div>
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

        <div class="card time-sync-card">
          <div class="card-header">
            <span class="icon">🕐</span>
            <h3>系统时间与同步</h3>
          </div>

          <div class="time-display">
            <div class="time-value">{{ currentTime }}</div>
            <div class="time-date">{{ currentDate }}</div>
          </div>

          <div class="input-group">
            <label>目标时间设置（数据集时间范围：2015-2016）</label>
            <input type="datetime-local" v-model="targetTime" class="datetime-input" />
          </div>

          <div class="input-group">
            <label>NTP 服务器地址</label>
            <input type="text" v-model="ntpServer" />
          </div>

          <div class="input-group">
            <label>时区设置</label>
            <select v-model="timezone">
              <option value="GMT+08:00">(GMT+08:00) 北京、上海、香港</option>
              <option value="GMT+09:00">(GMT+09:00) 东京、首尔</option>
              <option value="GMT+00:00">(GMT+00:00) 伦敦、都柏林</option>
              <option value="GMT-05:00">(GMT-05:00) 纽约、华盛顿</option>
            </select>
          </div>

          <button class="sync-time-btn" @click="applyTime">
            <span class="btn-icon">✏️</span> 立即修改当前时间
          </button>
        </div>
      </div>

      <div class="grid-column">

        <div class="card data-card">
          <div class="card-header">
            <span class="icon">🗄️</span>
            <h3>数据管理</h3>
          </div>

          <div class="data-source">
            <span class="source-label">当前数据源：</span>
            <div class="source-name">BDG2 (Building Data Genome Project 2)</div>
          </div>

          <div class="data-stats">
            <div class="stat-box">
              <span class="stat-label">元数据表 (metadata)</span>
              <div class="stat-value green">1,284,502 <span class="unit">条</span></div>
            </div>
            <div class="stat-box">
              <span class="stat-label">天气表 (weather)</span>
              <div class="stat-value green">1,284,502 <span class="unit">条</span></div>
            </div>
            <div class="stat-box">
              <span class="stat-label">能耗表 (meters)</span>
              <div class="stat-value green">1,284,502 <span class="unit">条</span></div>
            </div>
          </div>

          <div class="storage-action-row">
            <div class="storage-info">
              <div class="storage-text">
                <span class="label">云存储使用情况</span>
                <span class="usage"><b>1.8GB</b> / 5.0GB</span>
                <span class="percent">36%</span>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width: 36%"></div></div>
            </div>
            <button class="clear-cache-btn">
              <span class="icon">⬇️</span>
              清除缓存
            </button>
          </div>
        </div>

        <div class="card ai-card">
          <div class="card-header">
            <span class="icon">🤖</span>
            <h3>AI引擎配置</h3>
            <span v-if="!aiLoading" class="connection-status" :class="{ active: aiSettings?.llm?.api_key_configured }">
              {{ aiSettings?.llm?.api_key_configured ? '已连接 Active' : '未连接 Inactive' }}
            </span>
          </div>
          <p class="card-desc">配置核心 LLM 服务及 RAGFlow 知识库连接</p>

          <template v-if="aiLoading">
            <div class="ai-loading">加载 AI 配置中...</div>
          </template>
          <template v-else-if="aiError">
            <div class="ai-error">{{ aiError }}</div>
            <button class="retry-btn" @click="fetchAISettings">重新加载</button>
          </template>
          <template v-else>
            <div class="input-group">
              <label>LLM 服务地址 (Base URL)</label>
              <input type="text" v-model="aiSettings.llm.base_url" />
            </div>

            <div class="input-group">
              <label>API KEY</label>
              <div class="input-with-icon">
                <input :type="showApiKey ? 'text' : 'password'" :value="aiSettings.llm.api_key || (aiSettings.llm.api_key_configured ? '********************' : '')" @input="onApiKeyInput" />
                <div class="input-actions">
                  <button @click="showApiKey = !showApiKey" class="icon-btn">👁️</button>
                  <button class="icon-btn" @click="copyApiKey">📄</button>
                </div>
              </div>
            </div>

            <div class="input-group">
              <label>模型名称 (Model)</label>
              <input type="text" v-model="aiSettings.llm.model" />
            </div>

            <div class="ai-params-row">
              <div class="input-group half">
                <label>温度 (Temperature)</label>
                <input type="number" step="0.1" min="0" max="2" v-model.number="aiSettings.llm.temperature" />
              </div>
              <div class="input-group half">
                <label>Top-P</label>
                <input type="number" step="0.1" min="0" max="1" v-model.number="aiSettings.llm.top_p" />
              </div>
            </div>

            <div class="input-group">
              <label>RAGFlow API 地址</label>
              <input type="text" v-model="aiSettings.ragflow.api_url" />
            </div>

            <div class="toggle-row">
              <div class="toggle-left">
                <span class="toggle-label">使用知识图谱</span>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="aiSettings.features.enable_knowledge" />
                <span class="slider"></span>
              </label>
            </div>
            <p class="kg-hint">开启后AI模型将结合领域知识图谱，对结构化历史文本与「用能策略」关联规则（内建）</p>
          </template>
        </div>

        <div class="card upload-card">
          <div class="upload-area">
            <span class="cloud-icon">☁️</span>
            <h4>导入数据集</h4>
            <p>将文件拖到此处或 <a href="#">点击上传</a></p>
            <span class="file-types">注：目前仅支持单个文件上传，支持格式为 CSV / JSON / XLSX，最大 500MB。</span>
          </div>
        </div>

      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { setSystemCurrentTime, getRuntimeAISettings, type RuntimeAISettingsResponse } from '../api/system'

const notifySettings = reactive([
  { title: '异常预警提醒', desc: '能耗突变破预设阈值时即时通知', icon: '⚠️', iconClass: 'red', enabled: true },
  { title: '告警通知', desc: '系统层级安全告警与维护提示', icon: '❗', iconClass: 'gray', enabled: true },
  { title: '待办任务提醒', desc: '每日节能任务与巡检任务提醒', icon: '📅', iconClass: 'blue', enabled: false },
  { title: '功能通知', desc: '系统功能升级与周报推送', icon: 'ℹ️', iconClass: 'gray', enabled: true }
])

const showApiKey = ref(false)
const ntpServer = ref('ntp.cscec8.com.cn')
const timezone = ref('GMT+08:00')

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

const currentTime = ref('14:32:05')
const currentDate = ref('2026年10月4日 星期四')
const targetTime = ref('')
let timeTimer: number | null = null
let isManualTime = false
let manualDate: Date | null = null

const timezoneMap: Record<string, string> = {
  'GMT+08:00': 'Asia/Shanghai',
  'GMT+09:00': 'Asia/Tokyo',
  'GMT+00:00': 'Europe/London',
  'GMT-05:00': 'America/New_York'
}

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
  if (isManualTime && manualDate) {
    manualDate = new Date(manualDate.getTime() + 1000)
    formatAndDisplayTime(manualDate)
    return
  }
  const now = new Date()
  formatAndDisplayTime(now)
}

const formatAndDisplayTime = (date: Date) => {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  currentTime.value = `${h}:${m}:${s}`

  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  currentDate.value = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`
}

const reverseTimezoneMap: Record<string, string> = {
  'Asia/Shanghai': 'GMT+08:00',
  'Asia/Tokyo': 'GMT+09:00',
  'Europe/London': 'GMT+00:00',
  'America/New_York': 'GMT-05:00'
}

const fetchCurrentTimeSetting = () => {
  try {
    const savedTime = localStorage.getItem('manualTime')
    const savedTimezone = localStorage.getItem('timezone')
    const savedTargetTime = localStorage.getItem('targetTime')
    
    if (savedTime) {
      isManualTime = true
      manualDate = new Date(savedTime)
      formatAndDisplayTime(manualDate)
      if (savedTimezone) {
        timezone.value = savedTimezone
      }
      if (savedTargetTime) {
        targetTime.value = savedTargetTime
      }
    }
  } catch (err) {
    console.error('获取当前时间设置失败:', err)
  }
}

onMounted(() => {
  updateTime()
  timeTimer = window.setInterval(updateTime, 1000)
  fetchAISettings()
  fetchCurrentTimeSetting()
})

onUnmounted(() => {
  if (timeTimer !== null) clearInterval(timeTimer)
})

const applyTime = async () => {
  if (!targetTime.value) {
    alert('请先选择目标时间')
    return
  }
  const offset = getTimezoneOffset(timezone.value)
  const isoTime = `${targetTime.value}${offset}`
  const ianaTz = timezoneMap[timezone.value] || 'Asia/Shanghai'

  try {
    const res = await setSystemCurrentTime({
      use_current_time: false,
      current_time: isoTime,
      timezone: ianaTz
    }) as any
    isManualTime = true
    manualDate = new Date(targetTime.value)
    formatAndDisplayTime(manualDate)
    
    // 保存到本地存储
    localStorage.setItem('manualTime', manualDate.toISOString())
    localStorage.setItem('timezone', timezone.value)
    localStorage.setItem('targetTime', targetTime.value)
    
    alert(`系统时间已修改为：${currentDate.value} ${currentTime.value}（来源：${res.source}）`)
  } catch (err) {
    console.error('设置时间失败:', err)
    alert('时间设置失败，请检查网络连接或后端服务')
  }
}

const copyApiKey = () => {
  navigator.clipboard.writeText(aiSettings.llm.api_key)
  alert('API Key 已复制到剪贴板')
}

const saveSettings = () => {
  alert('设置正在保存...')
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

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}
.page-header h2 { margin: 0 0 8px 0; font-size: 24px; color: #111; font-weight: 600;}
.page-header .subtitle { margin: 0; color: #666; font-size: 14px; }

.action-buttons { display: flex; gap: 12px; }
.btn { padding: 10px 24px; border-radius: 20px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; transition: 0.2s;}
.btn-default { background: #eef2f6; color: #0b4582; border: 1px solid #d0dbe5;}
.btn-default:hover { background: #e0e8f0; }
.btn-primary { background: #0056e0; color: white; box-shadow: 0 4px 10px rgba(0, 86, 224, 0.2);}
.btn-primary:hover { background: #004ac2; }

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
}
.grid-column { display: flex; flex-direction: column; gap: 24px; }

.card {
  background: white;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
}
.card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px;}
.card-header h3 { margin: 0; font-size: 18px; color: #111; font-weight: 600;}
.card-desc { margin: 0 0 20px 0; font-size: 13px; color: #888; }
.font-num { font-family: 'Courier New', Courier, monospace; font-weight: 600;}

.profile-header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px dashed #eee;}
.avatar-wrapper { position: relative; width: 80px; height: 80px; }
.avatar { width: 100%; height: 100%; border-radius: 16px; object-fit: cover;}
.edit-avatar-btn { position: absolute; bottom: -6px; right: -6px; background: #0056e0; color: white; border: none; border-radius: 50%; width: 26px; height: 26px; font-size: 12px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2);}
.profile-title h3 { margin: 0 0 4px 0; font-size: 20px;}
.user-id { display: inline-block; font-size: 13px; color: #0056e0; background: #eff6ff; padding: 2px 8px; border-radius: 4px; font-weight: 600; margin-bottom: 8px;}
.status-badge { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #666; background: #f9f9f9; width: max-content; padding: 2px 10px; border-radius: 12px;}
.status-badge .dot { width: 6px; height: 6px; background: #10b981; border-radius: 50%; }

.info-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 20px;}
.info-list li { display: flex; justify-content: space-between; font-size: 14px;}
.info-list .label { color: #888; }
.info-list .value { color: #111; font-weight: 500;}

.toggle-list { display: flex; flex-direction: column; gap: 24px; margin-top: 24px;}
.toggle-item { display: flex; align-items: center; gap: 16px;}
.item-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px;}
.item-icon.red { background: #fef2f2; color: #ef4444;}
.item-icon.gray { background: #f4f4f5; color: #52525b;}
.item-icon.blue { background: #eff6ff; color: #3b82f6;}
.item-info { flex: 1; }
.item-info h4 { margin: 0 0 4px 0; font-size: 15px; color: #333;}
.item-info p { margin: 0; font-size: 12px; color: #888;}

.switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #e4e4e7; transition: .3s; border-radius: 24px; }
.slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1);}
input:checked + .slider { background-color: #0b4582; }
input:checked + .slider:before { transform: translateX(20px); }

.time-display {
  text-align: center;
  padding: 24px 16px;
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f0fe 100%);
  border-radius: 14px;
  margin-bottom: 24px;
}
.time-value {
  font-size: 42px;
  font-weight: 700;
  color: #0b4582;
  letter-spacing: 2px;
  font-family: 'Courier New', Courier, monospace;
}
.time-date {
  font-size: 13px;
  color: #666;
  margin-top: 6px;
}

.sync-time-btn {
  width: 100%;
  padding: 12px;
  background: #eff6ff;
  border: none;
  border-radius: 12px;
  color: #0b4582;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.sync-time-btn:hover { background: #dbeafe; }
.btn-icon { font-size: 16px; }

.datetime-input {
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  color: #333;
  outline: none;
  transition: border-color 0.2s;
  background: #fafbfc;
}
.datetime-input:focus { border-color: #0056e0; background: white; }

.data-source { background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 20px;}
.source-label { font-size: 12px; color: #888; display: block; margin-bottom: 4px;}
.source-name { font-size: 18px; font-weight: 700; color: #111;}

.data-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px;}
.stat-box { background: #f8fafc; padding: 16px; border-radius: 12px; }
.stat-label { font-size: 12px; color: #666; display: block; margin-bottom: 8px;}
.stat-value { font-size: 20px; font-weight: bold; color: #111;}
.stat-value.green { color: #10b981; }
.stat-value .unit { font-size: 12px; font-weight: normal; color: #888;}

.storage-action-row { display: flex; gap: 16px; align-items: stretch;}
.storage-info { flex: 1; display: flex; flex-direction: column; justify-content: center;}
.storage-text { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; font-size: 12px;}
.storage-text .label { color: #888;}
.storage-text .usage { color: #333;}
.storage-text .percent { color: #0056e0; font-weight: bold;}
.progress-bar { height: 8px; background: #eef2f6; border-radius: 4px; overflow: hidden;}
.progress-fill { height: 100%; background: #0056e0; border-radius: 4px;}
.clear-cache-btn { background: #f8fafc; border: none; border-radius: 12px; padding: 0 24px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; font-size: 13px; color: #333; font-weight: 500; transition: background 0.2s;}
.clear-cache-btn:hover { background: #f1f5f9; }

.connection-status {
  margin-left: auto;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 10px;
  font-weight: 500;
  background: #f1f5f9;
  color: #666;
}
.connection-status.active {
  background: #ecfdf5;
  color: #059669;
}

.input-group { margin-bottom: 20px; }
.input-group label { display: block; font-size: 12px; color: #666; margin-bottom: 8px; font-weight: 500;}
.input-group input[type="text"], .input-group input[type="password"] {
  width: 100%;
  border: none;
  border-bottom: 1px solid #ddd;
  padding: 8px 0;
  font-size: 15px;
  color: #0b4582;
  font-family: monospace;
  font-weight: 600;
  outline: none;
  background: transparent;
  transition: border-color 0.2s;
}
.input-group input:focus { border-bottom-color: #0056e0; }
.input-group select {
  width: 100%;
  border: none;
  border-bottom: 1px solid #ddd;
  padding: 8px 0;
  font-size: 14px;
  color: #333;
  outline: none;
  background: transparent;
  transition: border-color 0.2s;
  cursor: pointer;
}
.input-group select:focus { border-bottom-color: #0056e0; }

.input-with-icon { position: relative; display: flex; align-items: center;}
.input-actions { position: absolute; right: 0; display: flex; gap: 8px;}
.icon-btn { background: transparent; border: none; cursor: pointer; font-size: 16px; opacity: 0.6; transition: opacity 0.2s;}
.icon-btn:hover { opacity: 1; }

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
.toggle-label { font-size: 14px; color: #333; font-weight: 500; }
.kg-hint { margin: 10px 0 0 0; font-size: 11px; color: #aaa; line-height: 1.6; }

.ai-loading { text-align: center; padding: 40px 0; color: #888; font-size: 14px; }
.ai-error { color: #ef4444; font-size: 13px; text-align: center; padding: 20px 0; }
.retry-btn { width: 100%; padding: 10px; margin-top: 12px; background: #fef2f2; border: none; border-radius: 8px; color: #ef4444; font-size: 13px; cursor: pointer; }
.retry-btn:hover { background: #fee2e2; }

.ai-params-row { display: flex; gap: 16px; }
.input-group.half { flex: 1; }

.upload-card { padding: 0; border: 2px dashed #d0dbe5; background: transparent; box-shadow: none; display: flex; justify-content: center;}
.upload-area { padding: 30px; text-align: center; width: 100%; border-radius: 20px; transition: background 0.2s; cursor: pointer;}
.upload-area:hover { background: rgba(0, 86, 224, 0.02); border-color: #0056e0;}
.cloud-icon { font-size: 32px; display: block; margin-bottom: 12px; color: #0056e0;}
.upload-area h4 { margin: 0 0 4px 0; font-size: 16px; color: #111;}
.upload-area p { margin: 0 0 8px 0; font-size: 13px; color: #666;}
.upload-area a { color: #0056e0; text-decoration: none;}
.file-types { font-size: 11px; color: #999; }

@media (max-width: 1200px) {
  .settings-grid { grid-template-columns: 1fr; }
  .data-stats { grid-template-columns: 1fr; }
}
</style>
