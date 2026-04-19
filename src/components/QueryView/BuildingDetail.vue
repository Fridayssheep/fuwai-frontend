<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <!-- 头部 - 白色背景 -->
      <div class="modal-header">
        <h3>导出运行数据</h3>
        <button class="close-btn" @click="handleClose">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <!-- 内容区域 - 仅保留格式选择，删除预览 -->
      <div class="modal-body">
        <div class="format-option" :class="{ 'disabled': exporting }">
          <div class="download-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <polyline points="8 12 12 16 16 12"></polyline>
            </svg>
          </div>
          <div class="format-info">
            <span class="format-text">Markdown (.md)</span>
            <span class="format-desc">导出为Markdown表格格式，包含基础信息、小时级监测数据及表计状态</span>
          </div>
        </div>
      </div>

      <!-- 底部 -->
      <div class="modal-footer">
        <button class="btn btn-cancel" @click="handleClose" :disabled="exporting">取消</button>
        <button 
          class="btn btn-export" 
          @click="handleExport" 
          :disabled="exporting"
        >
          <svg v-if="exporting" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;" class="spin">
            <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="10"></circle>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          {{ exporting ? '导出中...' : '开始导出' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { usePageAIContext } from '../../composables/useAIContext';
import { getCurrentTimeString } from '@/utils/timeManager';
import TimeFilterModal from './TimeFilterModal.vue';
import ExportModal from './ExportModal.vue';
import {
  getBuildingById,
  type BuildingDetailResponse as ApiBuildingDetailResponse,
  getBuildingEnergySummary
} from '../../api/statistics';

withDefaults(defineProps<{
  visible?: boolean
}>(), {
  visible: true
});

const rawData = ref({
  buildingDetail: null as any,
  energySummary: null as any,
  categoryEnergy: null as any,  // 当前选中的分类能耗
  copEui: null as any,          // COP接口数据 (avg_cop, min_cop, max_cop)
  carbonData: null as any,      // 年度总碳排放数据 (b.carbon)
  solarData: null as any,       // 太阳能发电量
  electricityData: null as any, // 建筑总用电量 (electricity)
  waterData: null as any,       // 水耗总量 (water)
});

// ===== 扩展接口定义以解决类型问题 =====
interface BuildingInfo {
  building_id?: string;
  site_id?: string;
  primaryspaceusage?: string;
  sub_primaryspaceusage?: string;
  sqm?: number;
  area_ft?: number;
  floors?: number | string;
  build_year?: number | string;
  timezone?: string;
  time_zone?: string;
  start_date?: string;
  occupancy?: number | string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  coordinates?: string;
  leed_certification?: string;
  leed?: string;
  energy_star?: number | string;
  [key: string]: any; // 允许其他字段
}

interface HourlyDataItem {
  hour: string;
  displayTime: string;
  time: string;
  energyData: Record<string, number>;
  envData: Record<string, any>;
  hasEnergy: boolean;
  hasEnv: boolean;
}

interface WeatherData {
  temperature?: number;
  cloudCover?: number;
  cloud_cover?: number;
  precipitation?: number;
  rain?: number;
  windSpeed?: number;
  wind_speed?: number;
  dewPoint?: number;
  dew_point?: number;
  pressure?: number;
  seaLevelPressure?: number;
  windDirection?: number;
  wind_direction?: number;
  [key: string]: any;
}

// ===== 常量定义 =====
// 添加中文到英文的映射（根据图2枚举值）
const meterTypeMap: Record<string, string> = {
  '电力': 'electricity',
  '热水': 'hotwater',
  '冷冻水': 'chilledwater',
  '蒸汽': 'steam',
  '灌溉': 'irrigation',
  '太阳能': 'solar',
  '燃气': 'gas',
  '水': 'water'
};

// ===== 组件状态 =====
const route = useRoute();
const router = useRouter();

const buildingId = ref<string>(route.params.id as string || 'BLDG-HQ-A01');
usePageAIContext('building-detail', computed(() => ({
  building_id: buildingId.value
})));

const loading = ref(false);
const detailData = ref<ApiBuildingDetailResponse | null>(null);
const error = ref(false);
const errorTitle = ref('加载失败');
const errorMessage = ref('无法获取建筑详情数据');

const hourlyData = ref<HourlyDataItem[]>([]);
const hourlyLoading = ref(false);
const selectedDay = ref<string>('');
const currentPage = ref<number>(1);
const pageSize = 8;

const activeTab = ref<'metadata' | 'derived'>('metadata');

const showEnergyModal = ref(false);
const showEnvModal = ref(false);
const showExportModal = ref(false);
const exporting = ref(false);
const currentEnergyItem = ref<HourlyDataItem | null>(null);
const currentEnvItem = ref<HourlyDataItem | null>(null);
const envLoading = ref(false);

const energyCategory = ref('电力');
const timeRange = ref<'today' | 'week' | 'month' | 'quarter' | 'year'>('month');

// ===== 计算属性：建筑信息（带类型安全）=====
const buildingInfo = computed<BuildingInfo>(() => {
  const building = (detailData.value as any)?.building || {};
  return building as BuildingInfo;
});

// ===== 辅助函数 =====
const formatCoordinates = (building: BuildingInfo): string => {
  if (!building) return '-';
  if (building.coordinates) return building.coordinates;
  if (building.lat !== undefined && building.lng !== undefined) {
    return `${building.lat}, ${building.lng}`;
  }
  if (building.latitude !== undefined && building.longitude !== undefined) {
    return `${building.latitude}, ${building.longitude}`;
  }
  return '-';
};

const formatArea = (area: number | string | undefined): string => {
  if (area === null || area === undefined || area === '') return '-';
  const num = typeof area === 'string' ? parseFloat(area) : area;
  return isNaN(num) ? '-' : num.toLocaleString();
};

const getLeedClass = (level: string | undefined): string => {
  if (!level) return '';
  const upper = level.toString().toUpperCase();
  if (upper.includes('PLATINUM')) return 'platinum';
  if (upper.includes('GOLD')) return 'gold';
  if (upper.includes('SILVER')) return 'silver';
  if (upper.includes('CERTIFIED')) return 'certified';
  return '';
};

// ===== 核心：获取小时级数据（修复：查询所有表计类型）=====
const fetchHourlyData = async () => {
  if (!buildingId.value || !selectedDay.value) return;
  hourlyLoading.value = true;
  hourlyData.value = [];

  try {
    // 所有表计类型（根据你的 meterTypeMap）
    const meterTypes = ['electricity', 'hotwater', 'chilledwater', 'steam', 'irrigation', 'solar', 'gas', 'water'];
    
    // 每小时并发查询所有表计类型
    const hourlyPromises = Array.from({ length: 24 }, (_, i) => {
      const hh = String(i).padStart(2, '0');
      const startStr = `${selectedDay.value}T${hh}:00:00`;
      const endStr = `${selectedDay.value}T${hh}:59:59`;
      
      // 并发查询该小时的所有表计类型
      return Promise.all(
        meterTypes.map(type => 
          getBuildingEnergySummary(buildingId.value, {
            meter: type as any,
            granularity: 'hour',
            start_time: startStr,
            end_time: endStr
          })
            .then(raw => {
              const data = (raw as any)?.data ?? raw;
              return {
                type,
                total: data?.summary?.total ?? 0
              };
            })
            .catch(() => ({ type, total: 0 }))
        )
      ).then(results => {
        // 汇总该小时所有表计数据
        const summary: Record<string, number> = {};
        let hasAnyEnergy = false;
        
        results.forEach(({ type, total }) => {
          if (total > 0) {
            summary[type] = total;
            hasAnyEnergy = true;
          }
        });
        
        return {
          hour: i,
          hasEnergy: hasAnyEnergy,
          summary // 包含该小时所有表计类型的数据
        };
      });
    });

    // 【修复】环境数据：查全天，再按小时匹配
    let weatherMap: Record<number, any> = {};
    try {
      const weatherRes = await axios.get('/api/energy/weather', {
        params: {
          building_ids: buildingId.value,
          start_time: `${selectedDay.value}T00:00:00`,
          end_time: `${selectedDay.value}T23:59:59`,
          granularity: 'hour'
        },
        timeout: 10000
      });
      
      const weatherData = weatherRes.data?.data ?? weatherRes.data;
      
      // 解析返回的环境数据（确保包含所有字段：temperature, cloudCover, precipitation, windSpeed, dewPoint, pressure, windDirection）
      if (weatherData?.series && Array.isArray(weatherData.series)) {
        const series = weatherData.series.find((s: any) => s.building_id === buildingId.value);
        if (series?.points && Array.isArray(series.points)) {
          series.points.forEach((point: any) => {
            const h = new Date(point.timestamp || point.time).getHours();
            if (!isNaN(h)) {
              // 确保存储完整的点数据，包含所有环境字段
              weatherMap[h] = {
                temperature: point.temperature,
                cloudCover: point.cloudCover,
                cloud_cover: point.cloud_cover,
                precipitation: point.precipitation,
                rain: point.rain,
                windSpeed: point.windSpeed,
                wind_speed: point.wind_speed,
                dewPoint: point.dewPoint,
                dew_point: point.dew_point,
                pressure: point.pressure,
                seaLevelPressure: point.seaLevelPressure,
                windDirection: point.windDirection,
                wind_direction: point.wind_direction,
                ...point // 保留原始所有字段
              };
            }
          });
        }
      }
    } catch (e) {
      console.error('环境数据获取失败:', e);
    }

    const energyResults = await Promise.all(hourlyPromises);

    // 组装24小时数据
    hourlyData.value = energyResults.map((er: any, i: number) => {
      const hh = String(i).padStart(2, '0');
      return {
        hour: `${hh}:00`,
        displayTime: `${selectedDay.value} ${hh}:00`,
        time: `${selectedDay.value}T${hh}:00:00`,
        energyData: er.summary, // 现在包含所有表计类型数据
        envData: weatherMap[i] || {},
        hasEnergy: er.hasEnergy, // 任意类型有数据即为true
        hasEnv: !!weatherMap[i] && Object.keys(weatherMap[i]).length > 0
      };
    });
  } catch (err) {
    console.error('Failed to fetch hourly data', err);
  } finally {
    hourlyLoading.value = false;
  }
};

// ===== 分页计算 =====
const totalCount = computed(() => hourlyData.value.length);
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize) || 1);

const displayData = computed<HourlyDataItem[]>(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return hourlyData.value.slice(start, end);
});

const emptyRows = computed(() => {
  const currentRows = displayData.value.length;
  return Math.max(0, pageSize - currentRows);
});

const paginationInfo = computed(() => {
  if (totalCount.value === 0) return '暂无数据';
  const start = (currentPage.value - 1) * pageSize + 1;
  const end = Math.min(currentPage.value * pageSize, totalCount.value);
  return `显示 ${start} 到 ${end} 条，共 ${totalCount.value} 条记录`;
});

const visiblePages = computed<(number | string)[]>(() => {
  const pages: (number | string)[] = [];
  const total = totalPages.value;
  const current = currentPage.value;
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    if (current <= 4) {
      pages.push(1, 2, 3, 4, 5);
      pages.push('...', total);
    } else if (current >= total - 3) {
      pages.push(1, '...');
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push(1, '...');
      pages.push(current - 1, current, current + 1);
      pages.push('...', total);
    }
  }
  return pages;
});

const handlePrevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

const handleNextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};

const handlePageChange = (page: number | string) => {
  if (typeof page === 'number') {
    currentPage.value = page;
  }
};

// ===== 详情弹窗 =====
const currentEnergyDetail = computed<Record<string, number>>(() => {
  return currentEnergyItem.value?.energyData || {};
});

const hasEnergyData = computed(() => Object.keys(currentEnergyDetail.value).length > 0);

const currentEnvDetail = computed<WeatherData>(() => {
  return currentEnvItem.value?.envData || {};
});

const hasEnvData = computed(() => Object.keys(currentEnvDetail.value).length > 0);

const handleViewEnergy = async (item: HourlyDataItem) => {
  currentEnergyItem.value = item;
  showEnergyModal.value = true;
  
  // 弹窗内并发加载该小时所有8种表计类型
  const meterTypes = ['electricity', 'hotwater', 'chilledwater', 'irrigation', 'solar', 'gas', 'steam', 'water'];
  const hour = item.hour.split(':')[0];
  const startStr = `${selectedDay.value}T${hour}:00:00`;
  const endStr = `${selectedDay.value}T${hour}:59:59`;
  
  const results: Record<string, number> = {};
  await Promise.all(
    meterTypes.map(type => 
      getBuildingEnergySummary(buildingId.value, {
        meter: type as any,
        granularity: 'hour',
        start_time: startStr,
        end_time: endStr
      })
        .then(raw => {
          const data = (raw as any)?.data ?? raw;
          const total = data?.summary?.total ?? 0;
          if (total > 0) results[type] = total;
        })
        .catch(() => {})
    )
  );
  
  currentEnergyItem.value = { ...item, energyData: results };
};


const handleViewEnv = async (item: HourlyDataItem) => {
  currentEnvItem.value = item;
  showEnvModal.value = true;
};

const closeEnergyModal = () => {
  showEnergyModal.value = false;
  currentEnergyItem.value = null;
};

const closeEnvModal = () => {
  showEnvModal.value = false;
  currentEnvItem.value = null;
};

// ===== 建筑详情数据获取 =====
const fetchData = async () => {
  // 从路由参数获取时间范围（如果父组件通过 query 传递）
  const routeTimeRange = route.query.timeRange as any;
  if (routeTimeRange && ['today', 'week', 'month', 'quarter', 'year'].includes(routeTimeRange)) {
    timeRange.value = routeTimeRange;
  }
  if (!buildingId.value) return;
  loading.value = true;
  error.value = false;
  
  try {
    const raw = await getBuildingById(buildingId.value);
    detailData.value = (raw as any)?.data ?? raw;
    
    const now = new Date(getCurrentTimeString());
    selectedDay.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    await fetchHourlyData();
    await fetchMetricsData(); // 新增：获取EUI和故障次数
    await fetchCategoryEnergy();

  } catch (err: any) {
    console.error('Failed to fetch building details', err);
    error.value = true;
    if (err.response?.status === 404) {
      errorTitle.value = '建筑不存在';
      errorMessage.value = `未找到ID为 ${buildingId.value} 的建筑信息`;
    } else if (err.request) {
      errorTitle.value = '网络连接失败';
      errorMessage.value = '无法连接到后端服务';
    } else {
      errorTitle.value = '请求错误';
      errorMessage.value = err.message || '未知错误';
    }
  } finally {
    exporting.value = false
  }
};

// ===== 工具函数 =====
const formatNumber = (val: number | null | undefined): string => {
  if (val == null || isNaN(val)) return '0.0';
  return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

const formatEnergyLabel = (key: string): string => {
  const labelMap: Record<string, string> = {
    'electricity': '电力',
    'hotwater': '热水',
    'chilledwater': '冷冻水',
    'steam': '蒸汽',
    'irrigation': '灌溉',
    'solar': '太阳能',
    'gas': '燃气',
    'water': '用水量'
  };
  return labelMap[key] || key;
};

const getEnergyUnit = (key: string): string => {
  const unitMap: Record<string, string> = {
    'electricity': 'kWh',
    'hotwater': 'm³',
    'chilledwater': 'GJ',
    'steam': 't',
    'irrigation': 'm³',
    'solar': 'kWh',
    'gas': 'm³',
    'water': 'm³'
  };
  return unitMap[key] || 'kWh';
};

const getEnergyIconClass = (key: string): string => {
  const classMap: Record<string, string> = {
    'electricity': 'blue',
    'hotwater': 'red',
    'chilledwater': 'cyan',
    'steam': 'gray',
    'gas': 'orange',
    'irrigation': 'green',
    'water': 'blue-light',
    'solar': 'yellow'
  };
  return classMap[key] || 'blue';
};

const formatWindDirection = (degree: number | string | undefined): string => {
  if (degree === undefined || degree === null) return '-';
  let num = typeof degree === 'string' ? parseFloat(degree) : degree;
  if (isNaN(num)) return '-';
  const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  num = num % 360;
  const index = Math.round((num < 0 ? num + 360 : num) / 45) % 8;
  return directions[index] ?? '-';
};
// 根据《民用建筑能耗标准》GB/T 51161-2016 大型公共建筑能耗约束值
const getBaselineEUI = (buildingType: string): number => {
  const type = (buildingType || '').toLowerCase();
  if (type.includes('office')) return 85;
  if (type.includes('hotel') || type.includes('hospitality')) return 100;
  if (type.includes('retail') || type.includes('market') || type.includes('shop')) return 130;
  if (type.includes('entertainment') || type.includes('assembly') || type.includes('public')) return 110;
  if (type.includes('hospital')) return 140;
  if (type.includes('education') || type.includes('school')) return 70;
  return 100; // 默认公共建筑基准 EUI (kWh/m²/年)
};


// ===== 业务逻辑 =====
const timeRangeText = computed(() => {
  const map: Record<string, string> = { 
    'today': '今日', 
    'week': '本周', 
    'month': '本月', 
    'quarter': '本季', 
    'year': '本年' 
  };
  return map[timeRange.value] || '本月';
});

// ===== 指标数据状态（替换原来的 ref）=====
const euiResponse = ref<any>(null);
const alarmResponse = ref<any>(null);

// 获取EUI、故障、碳排放、可再生能源、水耗等所有数据
const fetchMetricsData = async () => {
  try {
    // 【关键修改】使用 calculateTimeRange 根据当前 timeRange 计算时间
    const { start_time, end_time } = calculateTimeRange(timeRange.value);
    
    // 根据时间范围选择合适的粒度
    let granularity: 'hour' | 'day' | 'week' | 'month' = 'month';
    switch (timeRange.value) {
      case 'today': granularity = 'hour'; break;
      case 'week': granularity = 'day'; break;
      case 'month': granularity = 'day'; break;
      case 'quarter': granularity = 'month'; break;
      case 'year': granularity = 'month'; break;
    }
    
    console.log(`获取指标数据: ${timeRange.value} (${start_time} ~ ${end_time}), 粒度: ${granularity}`);

    // 并行请求所有需要的接口
    const [euiRes, alarmRes, carbonRes, solarRes, elecRes, waterRes] = await Promise.all([
      // 1. COP/EUI计算结果接口
      axios.get('/energy/cop', {
        params: { 
          building_id: buildingId.value,
          start_time,
          end_time,
          granularity
        }
      }).catch(err => {
        console.error('COP接口请求失败:', err);
        return null;
      }),
      
      // 2. 设备告警记录（故障次数）- 告警接口通常不需要时间范围，或根据需求调整
      axios.get('/meters/1/alarms', {
        params: { page: 1, page_size: 999 }
      }).catch(err => {
        console.error('告警接口请求失败:', err);
        return null;
      }),
      
      // 3. 建筑总碳排放（使用通用查询接口）
      axios.get('/energy/query', {
        params: {
          building_id: buildingId.value,
          meter: 'carbon', // 或 electricity 然后转换
          aggregation: 'sum',
          start_time,
          end_time
        }
      }).catch(err => {
        console.error('碳排放接口请求失败:', err);
        return null;
      }),
      
      // 4. 太阳能发电量（可再生能源）
      getBuildingEnergySummary(buildingId.value, {
        meter: 'solar' as any,
        granularity,
        start_time,
        end_time
      }).catch(err => {
        console.error('太阳能接口请求失败:', err);
        return null;
      }),
      
      // 5. 建筑总用电量（用于计算可再生能源替代率）
      getBuildingEnergySummary(buildingId.value, {
        meter: 'electricity' as any,
        granularity,
        start_time,
        end_time
      }).catch(err => {
        console.error('总用电接口请求失败:', err);
        return null;
      }),
      
      // 6. 水耗总量（用于计算单位面积水耗）
      axios.get('/energy/query', {
        params: {
          building_id: buildingId.value,
          meter: 'water',
          aggregation: 'sum',
          start_time,
          end_time
        }
      }).catch(err => {
        console.error('水耗接口请求失败:', err);
        return null;
      })
    ]);
    
    // 存储所有数据
    euiResponse.value = euiRes?.data?.data ?? euiRes?.data;
    alarmResponse.value = alarmRes?.data?.data ?? alarmRes?.data;
    rawData.value.carbonData = carbonRes?.data?.data ?? carbonRes?.data;
    rawData.value.solarData = solarRes?.data ?? solarRes;
    rawData.value.electricityData = elecRes?.data ?? elecRes;
    rawData.value.waterData = waterRes?.data?.data ?? waterRes?.data;
    
    console.log('✅ 指标数据加载完成，时间范围:', timeRange.value);
  } catch (e) {
    console.error('获取运行指标失败:', e);
  }
};

const derivedData = computed(() => {
  // ===== 基础数据提取 =====
  const area = Number(buildingInfo.value.sqm) || 0;
  const occupancy = Number(buildingInfo.value.occupancy) || 0;
  
  // ===== 1. COP数据 (来自 /energy/cop 接口) =====
  const copSummary = euiResponse.value?.summary || {};
  const avgCOP = copSummary.avg_cop ?? 0;
  const minCOP = copSummary.min_cop ?? 0;
  const maxCOP = copSummary.max_cop ?? 0;
  
  // ===== 2. 碳排放数据计算 =====
  const totalCarbon = Number(
    rawData.value.carbonData?.total ?? 
    rawData.value.carbonData?.annual_carbon ?? 
    0
  );
  
  // 基准碳排放量计算
  const baselineEUI = 110;
  const carbonFactor = 0.5703;
  const baselineCarbon = baselineEUI * area * carbonFactor;
  
  // 碳减排量和减排率
  const carbonReduction = Math.max(0, baselineCarbon - totalCarbon);
  const carbonReductionRate = baselineCarbon > 0 ? 
    ((carbonReduction / baselineCarbon) * 100).toFixed(1) : '0.0';
  
  // ===== 3. 单位面积和人均碳排放 =====
  const carbonPerArea = area > 0 ? (totalCarbon / area).toFixed(1) : '-';
  const carbonPerPerson = occupancy > 0 ? (totalCarbon / occupancy).toFixed(1) : '-';
  
  // ===== 4. 能耗数据 =====
  const totalElectricity = Number(
    rawData.value.electricityData?.summary?.total ?? 
    rawData.value.electricityData?.total ?? 
    0
  );
  
  const solarGeneration = Number(
    rawData.value.solarData?.summary?.total ?? 
    rawData.value.solarData?.total ?? 
    0
  );
  
  const energyPerPerson = occupancy > 0 ? 
    (totalElectricity / occupancy).toFixed(1) : '-';
  
  const renewableRate = totalElectricity > 0 ? 
    ((solarGeneration / totalElectricity) * 100).toFixed(1) : '0.0';
  
  // ===== 5. 水耗数据 =====
  const waterConsumption = Number(
    rawData.value.waterData?.summary?.total ?? 
    rawData.value.waterData?.total ?? 
    0
  );
  
  const waterPerArea = area > 0 ? 
    (waterConsumption / area).toFixed(3) : '-';
  
  // ===== 6. 分类能耗数据 =====
  const catData = rawData.value.categoryEnergy;
  const categoryEnergyTotal = Number(catData?.summary?.total ?? 0);
  
  const energyRatio = totalElectricity > 0 ? 
    ((categoryEnergyTotal / totalElectricity) * 100).toFixed(1) + '%' : '0%';
  
  return { 
    cop: avgCOP.toFixed(1),
    annualCarbon: totalCarbon.toFixed(2),
    carbonPerArea: carbonPerArea,
    carbonPerPerson: carbonPerPerson,
    carbonReduction: carbonReduction.toFixed(1),
    carbonReductionRate: carbonReductionRate + '%',
    renewableRate: renewableRate + '%',
    euiBaseline: avgCOP.toFixed(1),
    euiSource: maxCOP.toFixed(1),
    euiSite: minCOP.toFixed(1),
    waterPerArea: waterPerArea,
    energyPerPerson: energyPerPerson,
    energyType: energyCategory.value,
    totalEnergy: categoryEnergyTotal.toFixed(1),
    energyRatio: energyRatio,
    totalEnergyAll: totalElectricity.toFixed(1)
  };
});


// 动态计算指标（从死数据改为接口驱动）
const metrics = computed(() => {
  // 1. 获取基准EUI（基于建筑用途和中国标准）
  const buildingType = buildingInfo.value.primaryspaceusage || '';
  const baselineEUI = getBaselineEUI(buildingType);
  
  // 2. 获取实际EUI（优先接口数据，fallback到衍生数据）
  const actualEUI = euiResponse.value?.site_eui ?? 
                   euiResponse.value?.eui_site ?? 
                   euiResponse.value?.eui ?? 
                   derivedData.value.euiSite ?? 
                   0;  // 删除 88.5，改为 0
  
  // 3. EUI达标率 = (基准EUI - 实际EUI) ÷ 基准EUI × 100%
  let euiRate = 0;
  if (baselineEUI > 0) {
    euiRate = ((baselineEUI - actualEUI) / baselineEUI) * 100;
  }
  
  // 4. 故障次数 = 告警记录条数（根据图3返回结构）
  const alarmItems = alarmResponse.value?.items || [];
  const alarmCount = alarmResponse.value?.pagination?.total ?? alarmItems.length;
  
  return {
    abnormalRate: alarmCount,              // 故障次数（整数，不带%）
    euiRate: euiRate.toFixed(1)           // EUI达标率（保留1位小数）
  };
});

// 计算时间范围（用于衍生数据统计周期）
const calculateTimeRange = (range: string) => {
  const now = new Date(currentSystemTime.value);
  const formatDateTime = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  let start = new Date(now);
  let end = new Date(now);
  
  switch(range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      const day = start.getDay() || 7;
      start.setDate(start.getDate() - day + 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'quarter':
      const quarter = Math.floor(start.getMonth() / 3);
      start.setMonth(quarter * 3, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(quarter * 3 + 3, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
  }
  
  return {
    start_time: formatDateTime(start) + ' 00:00:00',
    end_time: formatDateTime(end) + ' 23:59:59'
  };
};

const getSettingPageTime = () => {
  const virtualTime = localStorage.getItem('virtualSystemTime');
  if (virtualTime) return new Date(virtualTime).toISOString();
  return new Date().toISOString();
};

// 确保 currentSystemTime 也存在
const currentSystemTime = ref(getSettingPageTime());

/// 获取特定类别的能耗数据
const fetchCategoryEnergy = async () => {
  try {
    const { start_time, end_time } = calculateTimeRange(timeRange.value);
    
    // ✅ 使用图2的正确接口地址和参数
    const response = await axios.get(`/api/energy/summary`, {  // 注意：这里假设是基础路径，实际可能是 /buildings/${buildingId.value}/energy/summary
      params: {
        building_id: buildingId.value,
        meter: meterTypeMap[energyCategory.value], // 转换为英文枚举值：'electricity', 'hotwater' 等
        start_time: start_time,
        end_time: end_time,
        granularity: 'hour'
      }
    });
    
    rawData.value.categoryEnergy = response.data?.data || response.data;
    console.log('分类能耗获取成功:', energyCategory.value, rawData.value.categoryEnergy);
  } catch (err) {
    console.error('获取分类能耗失败:', err);
    rawData.value.categoryEnergy = null;
  }
};


const handleEnergyCategoryChange = async () => {
  // 调用上面定义的函数获取新类别的数据
  await fetchCategoryEnergy();
  
  // 注意：不需要手动更新 derivedData，因为它是计算属性，会自动重新计算
  console.log('切换能耗类别为:', energyCategory.value);
};


const handleClose = () => router.back();
const handleExport = async () => {
  exporting.value = true;
  try {
    console.log('开始导出当前建筑运行数据');
  } finally {
    exporting.value = false;
  }
};

const handleBack = () => router.back();
const handleViewStats = () => console.log('查看统计数据');

const status = ref<'normal' | 'warning' | 'error'>('normal');
const statusText = computed(() => ({ 
  normal: '运行正常', 
  warning: '告警状态', 
  error: '异常状态' 
}[status.value]));
const statusClass = computed(() => status.value);

onMounted(async () => {
  await fetchData();
});
</script>

<style scoped>
/* 样式部分保持不变... */
.single-date-picker {
  font-size: 13px;
  background: #f1f5f9;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #F3F4F6;
  color: #6B7280;
}

/* 内容区域 */
.modal-body {
  padding: 20px 24px;
}

.format-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #EFF6FF;
  border-radius: 8px;
  border: 1px solid #BFDBFE;
  transition: all 0.2s;
  cursor: pointer;
}

.format-option:hover:not(.disabled) {
  background: #DBEAFE;
  border-color: #93C5FD;
}

.format-option.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.download-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #005BAC;
  flex-shrink: 0;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.format-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.format-text {
  font-size: 15px;
  color: #1F2937;
  font-weight: 500;
}

.format-desc {
  font-size: 13px;
  color: #6B7280;
}

/* 底部样式 */
.modal-footer {
  padding: 16px 24px 24px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  border-top: 1px solid #EEEEEE;
}

/* 按钮基础样式 - 圆角阴影 */
.btn {
  height: 40px;
  padding: 0 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: none;
  outline: none;
  position: relative;
  overflow: hidden;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

/* 取消按钮样式 */
.btn-cancel {
  background: white;
  color: #4B5563;
  border: 1px solid #E5E7EB;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-cancel:hover:not(:disabled) {
  background: #F9FAFB;
  border-color: #D1D5DB;
  color: #374151;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

/* 开始导出按钮样式 - 深蓝渐变 */
.btn-export {
  background: linear-gradient(135deg, #005BAC 0%, #004a8d 100%);
  color: white;
  box-shadow: 
    0 4px 6px -1px rgba(0, 91, 172, 0.3),
    0 2px 4px -1px rgba(0, 91, 172, 0.2);
}

.btn-export:hover:not(:disabled) {
  background: linear-gradient(135deg, #004a8d 0%, #003d75 100%);
  box-shadow: 
    0 10px 15px -3px rgba(0, 91, 172, 0.4),
    0 4px 6px -2px rgba(0, 91, 172, 0.3);
  transform: translateY(-2px);
}

/* 加载动画 */
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
