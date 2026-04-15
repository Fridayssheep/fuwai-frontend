<template>
  <div class="panel anomalies-panel">
    <div class="panel-header">
      <h3>
        <Icon icon="lucide:shield-alert" class="panel-icon" />
        异常建筑
      </h3>
      <span v-if="anomalies.length > 0" class="anomaly-badge">
        {{ anomalies.length }} 项
      </span>
    </div>
    <div v-if="anomalies.length === 0" class="empty-state compact">
      <Icon icon="lucide:shield-check" class="empty-icon-svg good" />
      <p>当前未检测到异常建筑</p>
    </div>
    <div
      v-for="a in anomalies"
      :key="a.anomaly_id"
      class="anomaly-row"
      @click="goToFaultAnalysis(a)"
    >
      <div class="severity-dot" :class="a.severity"></div>
      <div class="anomaly-info">
        <strong>{{ a.title }}</strong>
        <span class="anomaly-meta">{{ a.building_id }} · {{ a.meter || 'electricity' }}</span>
      </div>
      <button class="anomaly-action">
        分析
        <Icon icon="lucide:arrow-right" class="action-arrow" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import type { AnomalySummary } from '../../api/dashboard'

defineProps<{
  anomalies: AnomalySummary[]
}>()

const router = useRouter()

const goToFaultAnalysis = (anomaly: AnomalySummary) => {
  router.push({
    path: '/fault-analysis',
    query: { building_id: anomaly.building_id, meter: anomaly.meter || 'electricity' }
  })
}
</script>

<style scoped>
/* Common Panel Styles */
.panel {
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius, 14px);
  padding: 22px 24px;
  box-shadow: var(--shadow-card, 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 14px rgba(15, 23, 42, 0.03));
  border: 1px solid var(--color-border, #e8ecf1);
  transition: box-shadow 0.25s ease;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.panel h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-icon {
  font-size: 18px;
  display: flex;
  align-items: center;
  color: var(--color-primary, #0b4582);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--color-text-secondary, #64748b);
}

.empty-state.compact { padding: 24px 16px; }

.empty-icon-svg {
  font-size: 36px;
  margin-bottom: 10px;
  display: flex;
}

.empty-icon-svg.good { color: var(--color-good, #059669); }

.empty-state p {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
}

/* Anomalies Specific Styles */
.anomaly-badge {
  font-size: 11px;
  font-weight: 700;
  background: #fef2f2;
  color: var(--color-bad, #dc2626);
  padding: 4px 10px;
  border-radius: 20px;
  letter-spacing: 0.02em;
}

.anomaly-row {
  display: flex;
  align-items: center;
  padding: 14px 8px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 0.15s ease;
  border-radius: 8px;
  margin: 0 -8px;
}

.anomaly-row:last-child { border-bottom: none; }
.anomaly-row:hover { background: #f8fafc; }

.severity-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 14px;
  flex-shrink: 0;
}

.severity-dot.critical { background: #dc2626; box-shadow: 0 0 6px #dc262640; }
.severity-dot.high { background: #ea580c; box-shadow: 0 0 6px #ea580c40; }
.severity-dot.medium { background: #d97706; }
.severity-dot.low { background: #84cc16; }
.severity-dot.info { background: #94a3b8; }

.anomaly-info { flex: 1; min-width: 0; }
.anomaly-info strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.anomaly-meta {
  font-size: 11px;
  color: var(--color-text-secondary, #64748b);
  font-weight: 500;
}

.anomaly-action {
  border: none;
  background: var(--color-primary, #0b4582);
  color: white;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  font-family: var(--font, sans-serif);
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.anomaly-row:hover .anomaly-action {
  opacity: 1;
  transform: translateX(0);
}

.anomaly-action:hover {
  background: var(--color-primary-light, #1e6fd0);
  transform: translateX(2px);
}

.action-arrow { font-size: 14px; display: flex; }
</style>
