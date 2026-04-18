<template>
  <div class="building-detail-page">
    <!-- 面包屑与头部 -->
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="router.back()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div class="title-info">
          <h2>建筑详情：{{ buildingId }}</h2>
          <span class="site-tag">{{ buildingInfo.site_id || '加载中...' }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline" @click="handleFaultAnalysis">
          故障分析专项
        </button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="detail-grid">
      <!-- 左侧：基础元数据 -->
      <div class="metadata-card">
        <div class="card-header">
          <span class="icon">🏠</span>
          <h3>基础元数据</h3>
        </div>
        <div class="info-list">
          <div class="info-item">
            <span class="label">主要用途</span>
            <span class="value">{{ buildingInfo.primaryspaceusage || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">建筑面积</span>
            <span class="value">{{ buildingInfo.sqm ? buildingInfo.sqm.toLocaleString() + ' ㎡' : '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">建成年份</span>
            <span class="value">{{ buildingInfo.yearbuilt || '-' }} 年</span>
          </div>
          <div class="info-item">
            <span class="label">LEED 等级</span>
            <span class="value">{{ buildingInfo.leed_level || '未评级' }}</span>
          </div>
          <div class="info-item">
            <span class="label">时区</span>
            <span class="value">{{ buildingInfo.timezone || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧：能耗摘要 -->
      <div class="energy-summary-card">
        <div class="card-header">
          <span class="icon">⚡</span>
          <h3>期间能耗摘要 (最近24小时)</h3>
        </div>
        <div v-if="summaryLoading" class="loading-state">计算中...</div>
        <div v-else class="summary-grid">
          <div class="summary-stat">
            <span class="stat-label">累计消耗</span>
            <span class="stat-value">{{ summaryData.total?.toFixed(1) || '0.0' }} <small>KWH</small></span>
          </div>
          <div class="summary-stat">
            <span class="stat-label">峰值负荷</span>
            <span class="stat-value">{{ summaryData.peak?.toFixed(1) || '0.0' }} <small>KW</small></span>
          </div>
          <div class="summary-stat">
            <span class="stat-label">平均负荷</span>
            <span class="stat-value">{{ summaryData.average?.toFixed(1) || '0.0' }} <small>KWH</small></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部：小时级读数列表 -->
    <div class="hourly-table-card">
      <div class="card-header">
        <div class="header-left">
          <span class="icon">📅</span>
          <h3>实时小时级监测 ({{ selectedDay }})</h3>
        </div>
        <input type="date" v-model="selectedDay" class="date-picker" @change="fetchHourlyData" />
      </div>
      <div class="table-wrapper">
        <table class="hourly-table">
          <thead>
            <tr>
              <th>时间点</th>
              <th>电力 (KWH)</th>
              <th>状态判定</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in hourlyData" :key="h.hour">
              <td class="font-numeric">{{ h.hour }}</td>
              <td class="font-numeric">{{ h.value?.toFixed(2) || '0.0' }}</td>
              <td>
                <span :class="['status-dot', h.value > 0 ? 'active' : 'idle']"></span>
                {{ h.value > 0 ? '运行中' : '无数据' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getBuildingById, getBuildingEnergySummary } from '../../api/statistics';
import { getCurrentTimeString } from '../../utils/timeManager';

const route = useRoute();
const router = useRouter();
const buildingId = ref(route.params.id as string);

const buildingInfo = ref<any>({});
const summaryData = ref<any>({});
const hourlyData = ref<any[]>([]);
const summaryLoading = ref(false);
const selectedDay = ref(new Date(getCurrentTimeString()).toISOString().split('T')[0]);

const fetchBuildingInfo = async () => {
  try {
    const res = await getBuildingById(buildingId.value);
    buildingInfo.value = res.data.building;
  } catch (e) {
    console.error('获取建筑元数据失败:', e);
  }
};

const fetchHourlyData = async () => {
  summaryLoading.value = true;
  try {
    const startTime = `${selectedDay.value}T00:00:00`;
    const endTime = `${selectedDay.value}T23:59:59`;
    
    // 调用真实后端摘要接口
    const res = await getBuildingEnergySummary(buildingId.value, {
      meter: 'electricity',
      granularity: 'hour',
      start_time: startTime,
      end_time: endTime
    });
    
    const data = res.data;
    summaryData.value = data.summary || {};
    
    // 构造小时列表
    if (data.points) {
      hourlyData.value = data.points.map((p: any) => ({
        hour: new Date(p.timestamp).getHours() + ':00',
        value: p.value
      }));
    } else {
      hourlyData.value = Array.from({ length: 24 }, (_, i) => ({ hour: i + ':00', value: 0 }));
    }
  } catch (e) {
    console.error('获取小时数据失败:', e);
  } finally {
    summaryLoading.value = false;
  }
};

const handleFaultAnalysis = () => {
  router.push({ path: '/fault-analysis', query: { building_id: buildingId.value } });
};

onMounted(() => {
  fetchBuildingInfo();
  fetchHourlyData();
});
</script>

<style scoped>
.building-detail-page { padding: 24px; background: #F8FAFC; min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header-left { display: flex; gap: 16px; align-items: center; }
.back-btn { width: 40px; height: 40px; border-radius: 50%; border: 1px solid #E2E8F0; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.title-info h2 { margin: 0; font-size: 22px; color: #1E293B; }
.site-tag { font-size: 13px; color: #64748B; background: #F1F5F9; padding: 2px 8px; border-radius: 4px; }

.detail-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 24px; margin-bottom: 24px; }
.metadata-card, .energy-summary-card, .hourly-table-card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

.card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
.card-header h3 { margin: 0; font-size: 16px; color: #334155; }

.info-list { display: flex; flex-direction: column; gap: 14px; }
.info-item { display: flex; justify-content: space-between; border-bottom: 1px solid #F1F5F9; padding-bottom: 10px; }
.info-item .label { color: #64748B; font-size: 14px; }
.info-item .value { color: #1E293B; font-weight: 600; font-size: 14px; }

.summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.summary-stat { text-align: center; padding: 16px; background: #F8FAFF; border-radius: 12px; }
.stat-label { display: block; font-size: 12px; color: #475569; margin-bottom: 8px; }
.stat-value { font-size: 20px; font-weight: 700; color: #005BAC; }
.stat-value small { font-size: 12px; font-weight: normal; color: #94A3B8; }

.hourly-table-card { width: 100%; }
.date-picker { padding: 6px 12px; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 14px; }
.table-wrapper { overflow-x: auto; }
.hourly-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
.hourly-table th { text-align: left; padding: 12px; font-size: 12px; color: #64748B; border-bottom: 2px solid #F1F5F9; }
.hourly-table td { padding: 12px; border-bottom: 1px solid #F1F5F9; color: #334155; }
.font-numeric { font-variant-numeric: tabular-nums; font-family: monospace; }
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.status-dot.active { background: #10B981; box-shadow: 0 0 8px rgba(16,185,129,0.5); }
.status-dot.idle { background: #CBD5E1; }

.btn { height: 40px; padding: 0 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; }
.btn-outline { background: white; border: 1px solid #005BAC; color: #005BAC; }
</style>
