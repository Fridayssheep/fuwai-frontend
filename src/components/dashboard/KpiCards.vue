<template>
  <section class="top-row">
    <div class="kpi-row">
      <div
        v-for="(card, i) in displayedMetrics"
        :key="card.key"
        class="kpi-card"
        :class="card.key"
        :style="{ animationDelay: i * 0.07 + 's' }"
      >
        <div class="kpi-top">
          <span class="kpi-label">{{ card.label }}</span>
          <Icon :icon="card.icon" class="kpi-icon" />
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value">{{ formatNumber(card.value) }}</span>
          <span class="kpi-unit">{{ card.displayUnit }}</span>
        </div>
        <div v-if="card.change_rate != null" class="kpi-trend" :class="trendDirection(card)">
          <Icon :icon="card.change_rate >= 0 ? 'lucide:trending-up' : 'lucide:trending-down'" class="trend-icon" />
          {{ Math.abs(card.change_rate * 100).toFixed(1) }}%
          <span class="trend-label">较上期</span>
        </div>
        <div v-else class="kpi-trend neutral">
          <span class="trend-label">—</span>
        </div>
        <div class="kpi-accent"></div>
      </div>

      <!-- Skeleton cards while loading -->
      <template v-if="loading && displayedMetrics.length === 0">
        <div v-for="n in 4" :key="'sk-' + n" class="kpi-card skeleton">
          <div class="sk-line sk-label"></div>
          <div class="sk-line sk-value"></div>
          <div class="sk-line sk-trend"></div>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { MetricCard } from '../../api/dashboard'

const props = defineProps<{
  metrics: MetricCard[]
  loading: boolean
}>()

interface DisplayMetric extends MetricCard {
  icon: string
  displayUnit: string
}

const metricConfig: Record<string, { icon: string; displayUnit: string; priority: number }> = {
  electricity_total: { icon: 'lucide:zap', displayUnit: 'kWh', priority: 1 },
  electricity_eui: { icon: 'lucide:ratio', displayUnit: 'kWh/㎡', priority: 2 },
  high_energy_buildings: { icon: 'lucide:triangle-alert', displayUnit: '栋', priority: 3 },
  estimated_carbon: { icon: 'lucide:leaf', displayUnit: 'kgCO₂', priority: 4 },
  scoped_buildings: { icon: 'lucide:building-2', displayUnit: '栋', priority: 5 },
  active_buildings: { icon: 'lucide:bar-chart-3', displayUnit: '栋', priority: 6 },
  scoped_sites: { icon: 'lucide:map-pin', displayUnit: '个', priority: 7 }
}

const displayedMetrics = computed<DisplayMetric[]>(() => {
  const selected = props.metrics
    .filter(m => m.key in metricConfig)
    .sort((a, b) => (metricConfig[a.key]?.priority ?? 99) - (metricConfig[b.key]?.priority ?? 99))
    .slice(0, 4)

  return selected.map(m => ({
    ...m,
    icon: metricConfig[m.key]?.icon ?? 'lucide:clipboard-list',
    displayUnit: metricConfig[m.key]?.displayUnit ?? m.unit ?? ''
  }))
})

const formatNumber = (val: number | null | undefined): string => {
  if (val == null) return '—'
  if (Math.abs(val) >= 10000) return (val / 10000).toFixed(2) + '万'
  if (Number.isInteger(val)) return val.toLocaleString()
  return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}

const trendDirection = (card: DisplayMetric): string => {
  if (card.change_rate == null) return 'neutral'
  if (['electricity_total', 'electricity_eui', 'estimated_carbon', 'high_energy_buildings'].includes(card.key)) {
    return card.change_rate >= 0 ? 'bad' : 'good'
  }
  return card.change_rate >= 0 ? 'good' : 'bad'
}
</script>

<style scoped>
/* ═══ KPI Cards ══════════════════════════════════════════════════ */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 18px;
}

.kpi-card {
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius, 14px);
  padding: 22px 24px 18px;
  box-shadow: var(--shadow-card, 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 14px rgba(15, 23, 42, 0.03));
  border: 1px solid var(--color-border, #e8ecf1);
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.25s ease;
  animation: cardReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  transform: translateY(12px);
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover, 0 8px 28px rgba(15, 23, 42, 0.08));
}

@keyframes cardReveal {
  to { opacity: 1; transform: translateY(0); }
}

.kpi-accent {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 0 0 var(--radius, 14px) var(--radius, 14px);
}

.kpi-card.electricity_total .kpi-accent { background: linear-gradient(90deg, #2563eb, #60a5fa); }
.kpi-card.electricity_eui .kpi-accent { background: linear-gradient(90deg, #7c3aed, #a78bfa); }
.kpi-card.high_energy_buildings .kpi-accent { background: linear-gradient(90deg, #d97706, #fbbf24); }
.kpi-card.estimated_carbon .kpi-accent { background: linear-gradient(90deg, #059669, #34d399); }
.kpi-card.scoped_buildings .kpi-accent { background: linear-gradient(90deg, #0891b2, #22d3ee); }
.kpi-card.active_buildings .kpi-accent { background: linear-gradient(90deg, #4f46e5, #818cf8); }

.kpi-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.kpi-label {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--color-text-secondary, #64748b);
  letter-spacing: 0.02em;
}

.kpi-icon {
  font-size: 20px;
  color: var(--color-primary-light, #1e6fd0);
  opacity: 0.8;
}

.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 12px;
}

.kpi-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.kpi-unit {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #64748b);
}

.kpi-trend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;
  background: #f8fafc;
}

.trend-icon { font-size: 14px; display: flex; }
.trend-label { font-weight: 500; opacity: 0.8; font-size: 11.5px; margin-left: 2px; }

.kpi-trend.good { color: var(--color-good, #059669); background: #ecfdf5; }
.kpi-trend.bad { color: var(--color-bad, #dc2626); background: #fef2f2; }
.kpi-trend.neutral { color: var(--color-text-secondary, #64748b); background: #f1f5f9; }

/* Skeleton */
.kpi-card.skeleton { pointer-events: none; }
.sk-line {
  background: #f1f5f9;
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}
.sk-label { width: 40%; height: 16px; margin-bottom: 20px; }
.sk-value { width: 70%; height: 32px; margin-bottom: 16px; border-radius: 6px; }
.sk-trend { width: 50%; height: 24px; border-radius: 6px; }

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
</style>
