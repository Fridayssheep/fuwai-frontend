<template>
  <div v-if="visible" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <!-- 模态框头部 -->
      <div class="modal-header">
        <div class="title-area">
          <Icon :icon="getMeterIcon(meterDetail?.meter?.meter_type)" class="header-meter-icon" :class="meterDetail?.meter?.meter_type" />
          <div class="title-text">
            <h2>{{ meterDetail?.meter?.meter_name || meterId }}</h2>
            <span class="subtitle">{{ getMeterTypeLabel(meterDetail?.meter?.meter_type) }} · {{ meterDetail?.meter?.building_id || '—' }}</span>
          </div>
          <span v-if="meterDetail?.meter?.status" class="status-badge" :class="meterDetail.meter.status">
            <span class="dot"></span>
            {{ getStatusText(meterDetail.meter.status) }}
          </span>
        </div>
        <button class="close-btn" @click="close">
          <Icon icon="lucide:x" />
        </button>
      </div>

      <!-- Loading -->
      <div class="modal-body" v-if="loading">
        <div class="loading-state">
          <Icon icon="lucide:loader-2" class="spin loading-icon" />
          <p>正在加载设备详情...</p>
        </div>
      </div>

      <!-- Error -->
      <div class="modal-body" v-else-if="error">
        <div class="error-state">
          <Icon icon="lucide:alert-circle" class="error-icon" />
          <p>{{ error }}</p>
          <button class="retry-btn" @click="fetchData">重试</button>
        </div>
      </div>

      <!-- 内容 -->
      <div class="modal-body" v-else-if="meterDetail">
        <!-- 指标卡片行 -->
        <div class="metrics-row" v-if="meterDetail.recent_metrics && meterDetail.recent_metrics.length > 0">
          <div class="metric-card" v-for="mc in meterDetail.recent_metrics" :key="mc.key">
            <span class="mc-label">{{ mc.label }}</span>
            <div class="mc-value-row">
              <span class="mc-value">{{ formatMetricValue(mc.value) }}</span>
              <span v-if="mc.unit" class="mc-unit">{{ mc.unit }}</span>
            </div>
            <div v-if="mc.change_rate != null" class="mc-change" :class="mc.change_rate >= 0 ? 'up' : 'down'">
              <Icon :icon="mc.change_rate >= 0 ? 'lucide:trending-up' : 'lucide:trending-down'" class="change-icon" />
              {{ Math.abs(mc.change_rate).toFixed(1) }}%
            </div>
          </div>
        </div>

        <!-- 两列布局 -->
        <div class="detail-cols">
          <!-- 左列：基本信息 -->
          <div class="col-info">
            <div class="card-section">
              <h3>
                <Icon icon="lucide:info" class="section-icon" />
                基本信息
              </h3>
              <div class="kv-list">
                <div class="kv-item">
                  <span class="k-label">设备 ID</span>
                  <span class="v-val mono">{{ meterDetail.meter.meter_id }}</span>
                </div>
                <div class="kv-item">
                  <span class="k-label">设备名称</span>
                  <span class="v-val">{{ meterDetail.meter.meter_name }}</span>
                </div>
                <div class="kv-item">
                  <span class="k-label">表计类型</span>
                  <span class="v-val">
                    <span class="meter-type-badge" :class="meterDetail.meter.meter_type">{{ getMeterTypeLabel(meterDetail.meter.meter_type) }}</span>
                  </span>
                </div>
                <div class="kv-item">
                  <span class="k-label">所属建筑</span>
                  <span class="v-val link-style">{{ meterDetail.meter.building_id || '—' }}</span>
                </div>
                <div class="kv-item">
                  <span class="k-label">当前状态</span>
                  <span class="v-val">
                    <span class="status-badge sm" :class="meterDetail.meter.status">
                      <span class="dot"></span>
                      {{ getStatusText(meterDetail.meter.status) }}
                    </span>
                  </span>
                </div>
                <div class="kv-item">
                  <span class="k-label">制造商</span>
                  <span class="v-val">{{ meterDetail.meter.manufacturer || '暂无数据' }}</span>
                </div>
                <div class="kv-item">
                  <span class="k-label">设备型号</span>
                  <span class="v-val">{{ meterDetail.meter.model || '暂无数据' }}</span>
                </div>
                <div class="kv-item">
                  <span class="k-label">安装日期</span>
                  <span class="v-val">{{ meterDetail.meter.install_date || '暂无数据' }}</span>
                </div>
                <div class="kv-item">
                  <span class="k-label">最后活跃</span>
                  <span class="v-val font-numeric">{{ formatLastSeen(meterDetail.meter.last_seen_at) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 右列：告警记录 -->
          <div class="col-alarms">
            <div class="card-section">
              <h3>
                <Icon icon="lucide:bell-ring" class="section-icon" />
                近期告警
                <span v-if="alarmCount > 0" class="alarm-count-badge">{{ alarmCount }}</span>
              </h3>

              <div v-if="!meterDetail.recent_alarms || meterDetail.recent_alarms.length === 0" class="empty-alarms">
                <Icon icon="lucide:shield-check" class="empty-alarm-icon" />
                <span>暂无告警记录</span>
              </div>

              <div v-else class="alarm-list">
                <div v-for="alarm in meterDetail.recent_alarms" :key="alarm.alarm_id" class="alarm-item" :class="alarm.level">
                  <div class="alarm-header">
                    <span class="alarm-level-badge" :class="alarm.level">
                      <Icon :icon="getAlarmIcon(alarm.level)" class="alarm-level-icon" />
                      {{ getAlarmLevelText(alarm.level) }}
                    </span>
                    <span class="alarm-status-tag" :class="alarm.status">{{ alarm.status === 'open' ? '未处理' : '已关闭' }}</span>
                  </div>
                  <p class="alarm-message">{{ alarm.message }}</p>
                  <div class="alarm-footer">
                    <span v-if="alarm.code" class="alarm-code">{{ alarm.code }}</span>
                    <span class="alarm-time">
                      <Icon icon="lucide:clock" class="alarm-time-icon" />
                      {{ formatLastSeen(alarm.occurred_at) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 模态框底部 -->
      <div class="modal-footer">
        <button class="btn btn-default" @click="close">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { getMeterById, type MeterDetailResponse } from '../../api/statistics'

const props = defineProps<{
  visible: boolean
  meterId: string
}>()

const emit = defineEmits(['update:visible'])

const loading = ref(false)
const error = ref('')
const meterDetail = ref<MeterDetailResponse | null>(null)

const alarmCount = computed(() => meterDetail.value?.recent_alarms?.length || 0)

const close = () => {
  emit('update:visible', false)
}

const unwrap = (res: any) => res?.data ?? res

const getMeterIcon = (type?: string): string => {
  if (!type) return 'lucide:gauge'
  const icons: Record<string, string> = {
    electricity: 'lucide:zap',
    chilledwater: 'lucide:snowflake',
    steam: 'lucide:cloud',
    gas: 'lucide:flame',
    hotwater: 'lucide:droplets',
    water: 'lucide:droplet',
    irrigation: 'lucide:sprout',
    solar: 'lucide:sun',
  }
  return icons[type] || 'lucide:gauge'
}

const getMeterTypeLabel = (type?: string): string => {
  if (!type) return '—'
  const labels: Record<string, string> = {
    electricity: '电力',
    chilledwater: '冷冻水',
    steam: '蒸汽',
    gas: '燃气',
    hotwater: '热水',
    water: '水',
    irrigation: '灌溉',
    solar: '光伏',
  }
  return labels[type] || type
}

const getStatusText = (status?: string): string => {
  if (!status) return '—'
  const texts: Record<string, string> = {
    online: '在线',
    warning: '告警',
    fault: '故障',
    offline: '离线',
  }
  return texts[status] || status
}

const getAlarmIcon = (level: string): string => {
  const icons: Record<string, string> = {
    critical: 'lucide:alert-octagon',
    warning: 'lucide:alert-triangle',
    info: 'lucide:info',
  }
  return icons[level] || 'lucide:bell'
}

const getAlarmLevelText = (level: string): string => {
  const texts: Record<string, string> = {
    critical: '严重',
    warning: '警告',
    info: '信息',
  }
  return texts[level] || level
}

const formatLastSeen = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const formatMetricValue = (val: number | null | undefined): string => {
  if (val == null || isNaN(val)) return '—'
  if (val >= 10000) return (val / 1000).toFixed(1) + 'k'
  return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

const fetchData = async () => {
  if (!props.meterId) return
  loading.value = true
  error.value = ''
  meterDetail.value = null

  try {
    const raw = await getMeterById(props.meterId)
    meterDetail.value = unwrap(raw)
  } catch (err: any) {
    console.error('设备详情获取失败:', err)
    error.value = '设备详情加载失败: ' + (err?.message || '未知错误')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.visible,
  (newVal) => {
    if (newVal && props.meterId) {
      fetchData()
    }
  }
)
</script>

<style scoped>
/* ─── Overlay ──────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(3px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: overlayIn 0.2s ease;
}

@keyframes overlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: #f4f7f9;
  width: 880px;
  max-width: 95vw;
  max-height: 90vh;
  border-radius: 16px;
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Plus Jakarta Sans', -apple-system, 'PingFang SC', sans-serif;
  animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalSlideIn {
  from { opacity: 0; transform: translateY(-12px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* ─── Header ───────────────────────────────────────────────── */
.modal-header {
  background: white;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
}

.title-area {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-meter-icon {
  font-size: 28px;
  padding: 10px;
  border-radius: 12px;
  background: #f1f5f9;
  display: flex;
}

.header-meter-icon.electricity { color: #f59e0b; background: #fef3c7; }
.header-meter-icon.chilledwater { color: #06b6d4; background: #cffafe; }
.header-meter-icon.steam { color: #8b5cf6; background: #ede9fe; }
.header-meter-icon.gas { color: #ef4444; background: #fee2e2; }
.header-meter-icon.hotwater { color: #f97316; background: #ffedd5; }
.header-meter-icon.water { color: #3b82f6; background: #dbeafe; }
.header-meter-icon.irrigation { color: #22c55e; background: #dcfce7; }
.header-meter-icon.solar { color: #eab308; background: #fef9c3; }

.title-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title-text h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
}

.title-text .subtitle {
  font-size: 13px;
  color: #64748b;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  font-size: 20px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

/* ─── Status Badge ─────────────────────────────────────────── */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 20px;
  background: #f1f5f9;
  color: #64748b;
}

.status-badge.sm {
  padding: 3px 8px;
  font-size: 11px;
}

.status-badge .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-badge.online { background: #ecfdf5; color: #059669; }
.status-badge.warning { background: #fffbeb; color: #d97706; }
.status-badge.fault { background: #fef2f2; color: #dc2626; }
.status-badge.offline { background: #f1f5f9; color: #94a3b8; }

/* ─── Body ─────────────────────────────────────────────────── */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* ─── Loading / Error ──────────────────────────────────────── */
.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #64748b;
  font-size: 14px;
}

.loading-icon {
  font-size: 32px;
  color: #0b4582;
  margin-bottom: 12px;
}

.error-icon {
  font-size: 32px;
  color: #dc2626;
  margin-bottom: 12px;
}

.retry-btn {
  margin-top: 12px;
  padding: 6px 16px;
  background: #0b4582;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.retry-btn:hover { background: #093463; }

/* ─── Metric Cards Row ─────────────────────────────────────── */
.metrics-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

.metric-card {
  background: white;
  border-radius: 12px;
  padding: 16px 18px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  border: 1px solid #e8ecf1;
  transition: transform 0.2s, box-shadow 0.2s;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
}

.mc-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  display: block;
  margin-bottom: 8px;
}

.mc-value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 4px;
}

.mc-value {
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.mc-unit {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

.mc-change {
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.mc-change.up { color: #dc2626; }
.mc-change.down { color: #059669; }

.change-icon {
  font-size: 14px;
  display: flex;
}

/* ─── Two Column Layout ────────────────────────────────────── */
.detail-cols {
  display: flex;
  gap: 20px;
}

.col-info {
  flex: 0 0 340px;
}

.col-alarms {
  flex: 1;
  min-width: 0;
}

@media (max-width: 768px) {
  .detail-cols {
    flex-direction: column;
  }
  .col-info {
    flex: auto;
  }
}

/* ─── Card Section ─────────────────────────────────────────── */
.card-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  border: 1px solid #e8ecf1;
}

.card-section h3 {
  margin: 0 0 16px 0;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 16px;
  color: #0b4582;
  display: flex;
}

.alarm-count-badge {
  background: #fef2f2;
  color: #dc2626;
  font-size: 11px;
  font-weight: 700;
  min-width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  padding: 0 6px;
}

/* ─── KV List ──────────────────────────────────────────────── */
.kv-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.kv-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}

.kv-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.k-label {
  color: #64748b;
  flex-shrink: 0;
}

.v-val {
  font-weight: 600;
  color: #0f172a;
  text-align: right;
  word-break: break-all;
}

.v-val.mono {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: #475569;
}

.v-val.link-style {
  color: #0b4582;
}

.font-numeric {
  font-variant-numeric: tabular-nums;
}

/* ─── Meter Type Badge ─────────────────────────────────────── */
.meter-type-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 5px;
  background: #f1f5f9;
  color: #64748b;
}

.meter-type-badge.electricity { background: #fef3c7; color: #b45309; }
.meter-type-badge.chilledwater { background: #cffafe; color: #0e7490; }
.meter-type-badge.steam { background: #ede9fe; color: #6d28d9; }
.meter-type-badge.gas { background: #fee2e2; color: #b91c1c; }
.meter-type-badge.hotwater { background: #ffedd5; color: #c2410c; }
.meter-type-badge.water { background: #dbeafe; color: #1d4ed8; }
.meter-type-badge.irrigation { background: #dcfce7; color: #15803d; }
.meter-type-badge.solar { background: #fef9c3; color: #a16207; }

/* ─── Alarm List ───────────────────────────────────────────── */
.empty-alarms {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0;
  color: #94a3b8;
  font-size: 13px;
  gap: 8px;
}

.empty-alarm-icon {
  font-size: 28px;
  color: #059669;
}

.alarm-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 360px;
  overflow-y: auto;
}

.alarm-item {
  padding: 14px 16px;
  border-radius: 10px;
  background: #f8fafc;
  border-left: 3px solid #94a3b8;
  transition: background 0.15s;
}

.alarm-item:hover {
  background: #f1f5f9;
}

.alarm-item.critical {
  border-left-color: #dc2626;
  background: #fef8f8;
}

.alarm-item.warning {
  border-left-color: #d97706;
  background: #fffdf5;
}

.alarm-item.info {
  border-left-color: #3b82f6;
  background: #f8faff;
}

.alarm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.alarm-level-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.alarm-level-icon {
  font-size: 12px;
  display: flex;
}

.alarm-level-badge.critical { background: #fee2e2; color: #b91c1c; }
.alarm-level-badge.warning { background: #fef3c7; color: #b45309; }
.alarm-level-badge.info { background: #dbeafe; color: #1d4ed8; }

.alarm-status-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}

.alarm-status-tag.open {
  background: #fef2f2;
  color: #dc2626;
}

.alarm-status-tag.closed {
  background: #f1f5f9;
  color: #94a3b8;
}

.alarm-message {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #334155;
  line-height: 1.5;
}

.alarm-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: #94a3b8;
}

.alarm-code {
  background: #e2e8f0;
  padding: 1px 6px;
  border-radius: 3px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #475569;
}

.alarm-time {
  display: flex;
  align-items: center;
  gap: 4px;
}

.alarm-time-icon {
  font-size: 12px;
  display: flex;
}

/* ─── Footer ───────────────────────────────────────────────── */
.modal-footer {
  background: white;
  padding: 14px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-default {
  background: white;
  border-color: #cbd5e1;
  color: #475569;
}

.btn-default:hover {
  background: #f1f5f9;
}

/* ─── Common ───────────────────────────────────────────────── */
.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
</style>
