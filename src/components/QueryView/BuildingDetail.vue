<template>
  <div class="building-detail">
    <!-- 顶部标题栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1>建筑ID- {{ buildingId }}</h1>
        <span :class="['status-badge', statusClass]">
          <span class="status-dot"></span>
          {{ statusText }}
        </span>
      </div>
      <div class="header-right">
        <button class="btn-back" @click="handleBack">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          返回
        </button>
        <button class="btn-primary" @click="handleViewStats">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 20V10M12 20V4M6 20v-6"/>
          </svg>
          查看统计数据
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>正在加载建筑数据...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h3>{{ errorTitle }}</h3>
      <p>{{ errorMessage }}</p>
      <button class="btn-retry" @click="fetchBuildingDetail">重新加载</button>
    </div>

    <!-- 数据内容 -->
    <div v-else class="content-grid">
      <!-- 左侧信息面板 -->
      <div class="left-panel">
        <!-- 标签页切换 -->
        <div class="tab-header">
          <button 
            :class="['tab-btn', { active: activeTab === 'metadata' }]"
            @click="activeTab = 'metadata'"
          >
            建筑元数据
          </button>
          <button 
            :class="['tab-btn', { active: activeTab === 'derived' }]"
            @click="activeTab = 'derived'"
          >
            建筑衍生数据
          </button>
        </div>

        <!-- 建筑元数据面板 -->
        <div v-show="activeTab === 'metadata'" class="info-card">
          <div class="metadata-grid">
            <div class="meta-item">
              <span class="meta-label">建筑标识ID</span>
              <span class="meta-value">{{ buildingInfo.buildingId }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">设备标识</span>
              <span class="meta-value">{{ buildingInfo.siteId }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">主要用途</span>
              <span class="meta-value">{{ buildingInfo.primaryUse }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">建筑面积</span>
              <span class="meta-value">
                {{ buildingInfo.area }} m²
                <span class="sub-value">({{ buildingInfo.areaFt }} ft²)</span>
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-label">细分用途</span>
              <span class="meta-value">{{ buildingInfo.subUse }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">建造年份</span>
              <span class="meta-value">{{ buildingInfo.buildYear }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">楼层数</span>
              <span class="meta-value">{{ buildingInfo.floors }} 层</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">时区</span>
              <span class="meta-value">{{ buildingInfo.timezone }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">启用日期</span>
              <span class="meta-value">{{ buildingInfo.startDate }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">入住/使用人数</span>
              <span class="meta-value">{{ buildingInfo.occupancy }} 人</span>
            </div>
            <div class="meta-item full-width">
              <span class="meta-label">地理坐标</span>
              <span class="meta-value">{{ buildingInfo.coordinates }}</span>
            </div>
          </div>

          <!-- 认证标识 -->
          <div class="certifications">
            <div class="cert-item">
              <span class="cert-label">LEED 认证</span>
              <span class="cert-badge platinum">PLATINUM</span>
            </div>
            <div class="cert-item">
              <span class="cert-label">ENERGY STAR</span>
              <div class="energy-star">
                <span class="star-value">94</span>
                <svg class="star-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- 建筑衍生数据面板 -->
        <div v-show="activeTab === 'derived'" class="info-card derived-card">
          <div class="derived-header">
            <span class="derived-time-range">统计周期：{{ timeRangeText }}</span>
          </div>
          <div class="derived-grid">
            <div class="derived-item">
              <span class="derived-label">COP</span>
              <span class="derived-value">{{ derivedData.cop }}</span>
            </div>
            <div class="derived-item">
              <span class="derived-label">建筑年度总碳排放量(KgCO2e)</span>
              <span class="derived-value">{{ derivedData.annualCarbon }}</span>
            </div>
            <div class="derived-item">
              <span class="derived-label">单位面积碳排放量(KgCO2e/m²)</span>
              <span class="derived-value">{{ derivedData.carbonPerArea }}</span>
            </div>
            <div class="derived-item">
              <span class="derived-label">人均碳排放量(KgCO2e/人)</span>
              <span class="derived-value">{{ derivedData.carbonPerPerson }}</span>
            </div>
            <div class="derived-item">
              <span class="derived-label">碳减排量（相对于基准）</span>
              <span class="derived-value">{{ derivedData.carbonReduction }}</span>
            </div>
            <div class="derived-item">
              <span class="derived-label">碳减排率</span>
              <span class="derived-value">{{ derivedData.carbonReductionRate }}</span>
            </div>
            <div class="derived-item">
              <span class="derived-label">可再生能源替代率</span>
              <span class="derived-value">{{ derivedData.renewableRate }}</span>
            </div>
            <div class="derived-item">
              <span class="derived-label">能耗强度基准值EUI(kWh/m²/年)</span>
              <span class="derived-value">{{ derivedData.euiBaseline }}</span>
            </div>
            <div class="derived-item">
              <span class="derived-label">源头级EUI(kWh/m²/年)</span>
              <span class="derived-value">{{ derivedData.euiSource }}</span>
            </div>
            <div class="derived-item">
              <span class="derived-label">场地级EUI(kWh/m²/年)</span>
              <span class="derived-value">{{ derivedData.euiSite }}</span>
            </div>
            <div class="derived-item">
              <span class="derived-label">单位面积水耗(m³/m²)</span>
              <span class="derived-value">{{ derivedData.waterPerArea }}</span>
            </div>
            <div class="derived-item">
              <span class="derived-label">人均能耗强度(kWh/m²/年/人)</span>
              <span class="derived-value">{{ derivedData.energyPerPerson }}</span>
            </div>
            <div class="derived-item">
              <span class="derived-label">能耗类别</span>
              <div class="derived-value">
                <select v-model="energyCategory" class="energy-select" @change="handleEnergyCategoryChange">
                  <option value="电力">电力</option>
                  <option value="热水">热水</option>
                  <option value="冷冻水">冷冻水</option>
                  <option value="蒸汽">蒸汽</option>
                  <option value="灌溉">灌溉</option>
                  <option value="太阳能">太阳能</option>
                  <option value="燃气">燃气</option>
                  <option value="水">水</option>
                </select>
              </div>
            </div>
            <div class="derived-item">
              <span class="derived-label">对应总能耗(kWh)</span>
              <span class="derived-value">{{ derivedData.totalEnergy }}</span>
            </div>
            <div class="derived-item">
              <span class="derived-label">分项能耗占比</span>
              <span class="derived-value">{{ derivedData.energyRatio }}</span>
            </div>
            <div class="derived-item">
              <span class="derived-label">总能耗(kWh)</span>
              <span class="derived-value">{{ derivedData.totalEnergyAll }}</span>
            </div>
          </div>

          <!-- 认证标识 -->
          <div class="certifications">
            <div class="cert-item">
              <span class="cert-label">LEED 认证</span>
              <span class="cert-badge platinum">PLATINUM</span>
            </div>
            <div class="cert-item">
              <span class="cert-label">ENERGY STAR</span>
              <div class="energy-star">
                <span class="star-value">94</span>
                <svg class="star-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- 运行关键指标 -->
        <div class="metrics-card">
          <h3>运行关键指标</h3>
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="metric-label">能耗异常率</span>
              <span class="metric-value abnormal">{{ metrics.abnormalRate }}%</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">EUI 达标率</span>
              <span class="metric-value eui">{{ metrics.euiRate }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧监控数据 -->
      <div class="right-panel">
        <div class="monitor-card">
          <div class="monitor-header">
            <div class="header-title">
              <svg class="monitor-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <h3>小时级多维监控数据</h3>
            </div>
            <div class="header-actions">
              <button class="btn-icon btn-filter" @click="showTimeFilter = true" title="时间筛选">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
              <button class="btn-icon btn-download" @click="showExportModal = true" title="导出数据">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="monitor-table-wrapper">
            <table class="monitor-table">
              <thead>
                <tr>
                  <th class="col-time">时间</th>
                  <th class="col-energy">动态详耗数据</th>
                  <th class="col-env">环境数据</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in displayData" :key="index">
                  <td class="col-time">{{ item.time }}</td>
                  <td class="col-energy">
                    <button class="btn-view" @click="handleViewEnergy(item)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                      查看
                    </button>
                  </td>
                  <td class="col-env">
                    <button class="btn-view green" @click="handleViewEnv(item)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
                        <circle cx="11.5" cy="16.5" r="1.5" fill="currentColor"/>
                        <path d="M11.5 9v6"/>
                      </svg>
                      查看
                    </button>
                  </td>
                </tr>
                <tr v-for="n in emptyRows" :key="`empty-${n}`" class="empty-row">
                  <td colspan="3">&nbsp;</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 分页 -->
          <div class="pagination-wrapper">
            <div class="pagination-info">
              显示 {{ pagination.start }}-{{ pagination.end }} 到 {{ filteredTotal }} 条记录
            </div>
            <div class="pagination-controls">
              <button 
                class="page-btn" 
                :disabled="pagination.current === 1"
                @click="handlePrevPage"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <button 
                v-for="page in visiblePages" 
                :key="page"
                :class="['page-btn', { active: page === pagination.current }]"
                @click="handlePageChange(page)"
              >
                {{ page }}
              </button>
              <button 
                class="page-btn" 
                :disabled="pagination.current === totalPages"
                @click="handleNextPage"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="page-bottom-spacer"></div>

    <!-- 能源消耗详情弹窗 -->
    <teleport to="body">
      <div v-if="showEnergyModal" class="modal-overlay" @click.self="closeEnergyModal">
        <div class="modal-card energy-modal">
          <div class="modal-header">
            <div class="modal-title">
              <svg class="modal-icon energy" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
              </svg>
              <h3>能源消耗详情</h3>
            </div>
            <button class="btn-close" @click="closeEnergyModal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="energy-grid">
              <div 
                v-for="(value, key) in currentEnergyDetail" 
                :key="key" 
                class="energy-item"
                v-show="value !== null && value !== undefined && value !== 0"
              >
                <div :class="['item-icon', getEnergyIconClass(key)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
                  </svg>
                </div>
                <span class="item-name">{{ formatEnergyLabel(key) }}</span>
                <span class="item-value">
                  {{ formatNumber(value) }}
                  <span class="unit">{{ getEnergyUnit(key) }}</span>
                </span>
              </div>
              <div v-if="Object.keys(currentEnergyDetail).length === 0 || Object.values(currentEnergyDetail).every(v => !v)" class="energy-empty">
                <div class="empty-icon">⚡</div>
                <p>该时段暂无能耗数据</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 环境监控详情弹窗 -->
    <teleport to="body">
      <div v-if="showEnvModal" class="modal-overlay" @click.self="closeEnvModal">
        <div class="modal-card env-modal">
          <div class="modal-header">
            <div class="modal-title">
              <svg class="modal-icon env" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
              </svg>
              <h3>环境监控详情</h3>
            </div>
            <button class="btn-close" @click="closeEnvModal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <!-- 加载状态 -->
            <div v-if="envLoading" class="loading-container" style="padding: 40px 0;">
              <div class="loading-spinner"></div>
              <p>正在加载环境数据...</p>
            </div>
            <!-- 无数据提示 -->
            <div v-else-if="!currentEnvDetail || Object.keys(currentEnvDetail).length === 0" class="energy-empty">
              <div class="empty-icon">🌤️</div>
              <p>暂无环境数据</p>
            </div>
            <!-- 数据展示 -->
            <div v-else class="env-grid">
              <div class="env-item">
                <div class="item-icon temp">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
                    <circle cx="11.5" cy="16.5" r="1.5" fill="currentColor"/>
                  </svg>
                </div>
                <span class="item-name">气温</span>
                <span class="item-value">{{ currentEnvDetail.temperature ?? '-' }}<span class="unit">°C</span></span>
              </div>
              <div class="env-item">
                <div class="item-icon cloud">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.5 19c0-3.037-2.463-5.5-5.5-5.5S6.5 15.963 6.5 19"/>
                    <circle cx="17.5" cy="6.5" r="2.5"/>
                    <circle cx="14" cy="12" r="1"/>
                    <circle cx="8" cy="9" r="1"/>
                  </svg>
                </div>
                <span class="item-name">云量</span>
                <span class="item-value">{{ currentEnvDetail.cloudCover ?? currentEnvDetail.cloud_cover ?? '-' }}<span class="unit">%</span></span>
              </div>
              <div class="env-item">
                <div class="item-icon rain">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 13v8M8 13v8M12 15v8M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
                  </svg>
                </div>
                <span class="item-name">降水量</span>
                <span class="item-value">{{ currentEnvDetail.precipitation ?? currentEnvDetail.rain ?? '-' }}<span class="unit">mm</span></span>
              </div>
              <div class="env-item">
                <div class="item-icon wind">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
                  </svg>
                </div>
                <span class="item-name">风速</span>
                <span class="item-value">{{ currentEnvDetail.windSpeed ?? currentEnvDetail.wind_speed ?? '-' }}<span class="unit">m/s</span></span>
              </div>
              <div class="env-item">
                <div class="item-icon dew">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22c4.97 0 9-4.03 9-9V7c0-4.97-4.03-9-9-9S3 2.03 3 7v6c0 4.97 4.03 9 9 9z"/>
                    <path d="M12 6v6l4 2"/>
                    <path d="M12 16v6"/>
                  </svg>
                </div>
                <span class="item-name">露点温度</span>
                <span class="item-value">{{ currentEnvDetail.dewPoint ?? currentEnvDetail.dew_point ?? '-' }}<span class="unit">°C</span></span>
              </div>
              <div class="env-item">
                <div class="item-icon pressure">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v20M12 2l-4 4M12 2l4 4"/>
                    <path d="M4 10h16M4 14h16"/>
                    <path d="M4 10v4M20 10v4"/>
                  </svg>
                </div>
                <span class="item-name">海平面气压</span>
                <span class="item-value">{{ currentEnvDetail.pressure ?? currentEnvDetail.seaLevelPressure ?? '-' }}<span class="unit">hPa</span></span>
              </div>
              <div class="env-item">
                <div class="item-icon direction">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v8M12 8l-3 3M12 8l3 3"/>
                    <path d="M12 16l-4-4M12 16l4-4"/>
                  </svg>
                </div>
                <span class="item-name">风向</span>
                <span class="item-value">{{ formatWindDirection(currentEnvDetail.windDirection ?? currentEnvDetail.wind_direction) }}<span class="unit">{{ currentEnvDetail.windDirection ?? currentEnvDetail.wind_direction ? '°' : '' }}</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 时间维度配置弹窗 -->
    <TimeFilterModal 
      v-model:visible="showTimeFilter"
      @query="handleTimeQuery"
    />

    <!-- 导出报表弹窗 -->
    <ExportModal 
      v-model:visible="showExportModal"
      @export="handleExport"
    />
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

const route = useRoute();
const router = useRouter();

const buildingId = ref(route.params.id as string || 'BLDG-HQ-A01');
usePageAIContext('building-detail', computed(() => ({
  building_id: buildingId.value
})));

const formatEnergyLabel = (key: string): string => {
  const labelMap: Record<string, string> = {
    'electricity': '电力',
    'hotWater': '热水',
    'chilledWater': '冷冻水',
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
    'hotWater': 'm³',
    'chilledWater': 'GJ',
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
    'hotWater': 'red',
    'chilledWater': 'cyan',
    'steam': 'gray',
    'gas': 'orange',
    'irrigation': 'green',
    'water': 'blue-light',
    'solar': 'yellow'
  };
  return classMap[key] || 'blue';
};

const formatNumber = (num: number | string | undefined): string => {
  if (num === undefined || num === null) return '0';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  return n.toLocaleString();
};

// 格式化风向角度为文字
const formatWindDirection = (degree: number | string | undefined): string => {
  if (degree === undefined || degree === null) return '-';
  let num = typeof degree === 'string' ? parseFloat(degree) : degree;
  if (isNaN(num)) return '-';
  
  const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  num = num % 360;
  const index = Math.round((num < 0 ? num + 360 : num) / 45) % 8;
  return directions[index] ?? '-';
};

const energyCategory = ref('电力');
const timeRange = ref<'today' | 'week' | 'month' | 'quarter' | 'year'>('month');

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

const EUI_BASELINE_CHINA = 110;

const rawData = ref({
  buildingDetail: null as any,
  energySummary: null as any,
  categoryEnergy: null as any,
  copEui: null as any
});

const showTimeFilter = ref(false);
const showExportModal = ref(false);

const getSettingPageTime = () => {
  const virtualTime = localStorage.getItem('virtualSystemTime');
  if (virtualTime) {
    return new Date(virtualTime).toISOString();
  }
  return new Date().toISOString();
};

const currentSystemTime = ref(getSettingPageTime());

window.addEventListener('storage', async (e) => {
  if (e.key === 'virtualSystemTime') {
    currentSystemTime.value = e.newValue || new Date().toISOString();
    await Promise.all([
      fetchMonitorData(),
      fetchBuildingDetail()
    ]);
  }
});

const timeFilterConfig = ref({
  range: 'month',
  startTime: '',
  endTime: '',
  features: {
    workday: true,
    workdayPrice: 'peak',
    weekend: false,
    weekendPrice: 'valley',
    holiday: false,
    holidayPrice: 'valley'
  }
});

const activeTab = ref<'metadata' | 'derived'>('derived');

const status = ref<'normal' | 'warning' | 'error'>('normal');
const statusText = computed(() => {
  const map = { normal: '运行正常', warning: '告警状态', error: '异常状态' };
  return map[status.value];
});
const statusClass = computed(() => status.value);

const showEnergyModal = ref(false);
const showEnvModal = ref(false);

const buildingInfo = ref<any>({
  buildingId: '-',
  siteId: '-',
  primaryUse: '-',
  area: '0',
  areaFt: '0',
  subUse: '-',
  buildYear: '-',
  floors: '0',
  timezone: '-',
  startDate: '-',
  occupancy: '0',
  coordinates: '-'
});

const derivedData = computed(() => {
  const building = rawData.value.buildingDetail;
  const summary = rawData.value.energySummary;
  const categoryData = rawData.value.categoryEnergy;
  
  if (!building || !summary) return {
    cop: '0',
    annualCarbon: '0',
    carbonPerArea: '0',
    carbonPerPerson: '0',
    carbonReduction: '0',
    carbonReductionRate: '0%',
    renewableRate: '0%',
    euiBaseline: EUI_BASELINE_CHINA.toString(),
    euiSource: '0',
    euiSite: '0',
    waterPerArea: '0',
    energyPerPerson: '0',
    energyType: energyCategory.value,
    totalEnergy: '0',
    energyRatio: '0%',
    totalEnergyAll: '0'
  };
  
  const area = parseFloat(buildingInfo.value.area?.toString().replace(/,/g, '')) || 124500;
  const occupancy = parseInt(buildingInfo.value.occupancy?.toString().replace(/,/g, '')) || 8500;
  
  const copEuiData = rawData.value.copEui;
  const cop = copEuiData?.cop || copEuiData?.eui || 0;
  const euiSource = copEuiData?.sourceEui || copEuiData?.source_eui || 0;
  const euiSite = copEuiData?.siteEui || copEuiData?.site_eui || 0;
  
  const totalEnergyAll = summary.totalEnergy || summary.total_energy || 0;
  
  let totalEnergy = 0;
  if (categoryData && categoryData.energy !== undefined) {
    totalEnergy = categoryData.energy;
  } else {
    const categoryMap: Record<string, string> = {
      '电力': 'electricity',
      '热水': 'hotWater',
      '冷冻水': 'chilledWater',
      '蒸汽': 'steam',
      '灌溉': 'irrigation',
      '太阳能': 'solar',
      '燃气': 'gas',
      '水': 'water'
    };
    const key = categoryMap[energyCategory.value];
    totalEnergy = (key && summary[key]) || 0;
  }
  
  const emissionFactor = getEmissionFactor(energyCategory.value);
  const annualCarbon = totalEnergyAll * emissionFactor;
  const carbonPerArea = area > 0 ? annualCarbon / area : 0;
  const carbonPerPerson = occupancy > 0 ? annualCarbon / occupancy : 0;
  const baselineEmission = area * EUI_BASELINE_CHINA * 0.5703;
  const carbonReduction = Math.max(0, baselineEmission - annualCarbon);
  const carbonReductionRate = baselineEmission > 0 ? (carbonReduction / baselineEmission * 100) : 0;
  const solarEnergy = summary.solar || summary.solarEnergy || 0;
  const electricityEnergy = summary.electricity || totalEnergyAll * 0.6;
  const renewableRate = electricityEnergy > 0 ? (solarEnergy / electricityEnergy * 100) : 0;
  const euiBaseline = EUI_BASELINE_CHINA;
  const waterConsumption = summary.water || 0;
  const waterPerArea = area > 0 ? waterConsumption / area : 0;
  const energyPerPerson = occupancy > 0 ? (totalEnergyAll / occupancy) : 0;
  const energyRatio = totalEnergyAll > 0 ? (totalEnergy / totalEnergyAll * 100) : 0;
  
  return {
    cop: cop.toFixed(1),
    annualCarbon: annualCarbon.toFixed(2),
    carbonPerArea: carbonPerArea.toFixed(1),
    carbonPerPerson: carbonPerPerson.toFixed(2),
    carbonReduction: carbonReduction.toFixed(1),
    carbonReductionRate: carbonReductionRate.toFixed(1) + '%',
    renewableRate: renewableRate.toFixed(0) + '%',
    euiBaseline: euiBaseline.toString(),
    euiSource: euiSource.toString(),
    euiSite: euiSite.toString(),
    waterPerArea: waterPerArea.toFixed(3),
    energyPerPerson: energyPerPerson.toFixed(1),
    energyType: energyCategory.value,
    totalEnergy: totalEnergy.toFixed(1),
    energyRatio: energyRatio.toFixed(0) + '%',
    totalEnergyAll: totalEnergyAll.toFixed(2)
  };
});

const getEmissionFactor = (category: string): number => {
  const factors: Record<string, number> = {
    '电力': 0.5703,
    '热水': 0.11,
    '冷冻水': 0.5703,
    '蒸汽': 0.15,
    '灌溉': 0.0,
    '太阳能': 0.0,
    '燃气': 0.2,
    '水': 0.0
  };
  return factors[category] || 0.5703;
};

const fetchCategoryEnergy = async () => {
  try {
    const { startTime, endTime } = calculateTimeRange(timeRange.value);
    const response = await axios.post('/api/energy/query', {
      buildingId: buildingId.value,
      energyType: energyCategory.value,
      startTime,
      endTime
    });
    rawData.value.categoryEnergy = response.data;
  } catch (err) {
    console.error('获取分类能耗失败:', err);
    rawData.value.categoryEnergy = null;
  }
};

const handleEnergyCategoryChange = async () => {
  await fetchCategoryEnergy();
  updatePaginationRange();
};

const fetchMonitorData = async () => {
  try {
    tableLoading.value = true;
    const { startTime, endTime } = calculateTimeRange(timeFilterConfig.value.range);
    const priceFilter = timeFilterConfig.value.features?.workdayPrice || 'all';
    
    const response = await axios.get(`/api/buildings/${buildingId.value}/energy/hourly`, {
      params: {
        buildingId: buildingId.value,
        startTime,
        endTime,
        priceType: priceFilter !== 'all' ? priceFilter : undefined
      }
    });
    
    let hourlyData = response.data?.data || response.data || [];
    hourlyData = hourlyData.map((item: any) => ({
      time: item.time || item.timestamp || item.date,
      meters: item.meters || item.energyDetail || item.consumption || {},
      env: item.env || {}
    }));
    
    if (priceFilter && priceFilter !== 'all' && hourlyData.length > 0) {
      hourlyData = hourlyData.filter((item: any) => {
        const hour = new Date(item.time).getHours();
        return getPricePeriodType(hour) === priceFilter;
      });
    }
    
    allMonitorData.value = hourlyData;
    pagination.value.total = hourlyData.length;
    pagination.value.current = 1;
    updatePaginationRange();
  } catch (err) {
    console.error('获取小时级监测数据失败:', err);
    allMonitorData.value = [];
    pagination.value.total = 0;
  } finally {
    tableLoading.value = false;
  }
};

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
    startTime: formatDateTime(start) + ' 00:00:00',
    endTime: formatDateTime(end) + ' 23:59:59'
  };
};

const fetchBuildingDetail = async () => {
  loading.value = true;
  error.value = false;
  
  try {
    const [detailRes, summaryRes, copEuiRes] = await Promise.all([
      axios.get(`/api/buildings/${buildingId.value}`),
      axios.get(`/api/buildings/${buildingId.value}/energy/summary`),
      axios.get('/api/energy/cop', {
        params: { buildingId: buildingId.value }
      }).catch(err => {
        console.error('获取COP/EUI数据失败:', err);
        return { data: null };
      })
    ]);
    
    rawData.value.buildingDetail = detailRes.data;
    rawData.value.energySummary = summaryRes.data;
    rawData.value.copEui = copEuiRes.data;
    
    const detail = detailRes.data;
    buildingInfo.value = {
      buildingId: detail.buildingId || detail.id || buildingId.value,
      siteId: detail.siteId || detail.site_id || '-',
      primaryUse: detail.primaryUse || detail.primary_use || '-',
      area: detail.area || detail.buildingArea || '0',
      areaFt: detail.areaFt || detail.area_ft || '0',
      subUse: detail.subUse || detail.sub_use || '-',
      buildYear: detail.buildYear || detail.build_year || '-',
      floors: detail.floors || detail.floorCount || '0',
      timezone: detail.timezone || 'UTC+8',
      startDate: detail.startDate || detail.start_date || '-',
      occupancy: detail.occupancy || detail.occupancyCount || '0',
      coordinates: detail.coordinates || 
        (detail.latitude && detail.longitude ? `${detail.latitude}, ${detail.longitude}` : '-')
    };
    
    await fetchCategoryEnergy();
    
    const currentEui = parseFloat(derivedData.value.euiSite) || 0;
    const euiRate = EUI_BASELINE_CHINA > 0 
      ? Math.max(0, (1 - (currentEui / EUI_BASELINE_CHINA)) * 100).toFixed(2)
      : '0.00';
    
    metrics.value = {
      abnormalRate: detailRes.data.metrics?.abnormalRate || '0.42',
      euiRate: euiRate
    };
    
    if (detailRes.data.monitorData && Array.isArray(detailRes.data.monitorData)) {
      allMonitorData.value = detailRes.data.monitorData;
    } else {
      allMonitorData.value = [];
    }
    pagination.value.total = allMonitorData.value.length;
    updatePaginationRange();
    
  } catch (err: any) {
    console.error('获取建筑详情失败:', err);
    error.value = true;
    if (err.response) {
      if (err.response.status === 404) {
        errorTitle.value = '建筑不存在';
        errorMessage.value = `未找到ID为 ${buildingId.value} 的建筑信息`;
      } else {
        errorTitle.value = `服务器错误 (${err.response.status})`;
        errorMessage.value = '后端服务异常，请稍后再试';
      }
    } else if (err.request) {
      errorTitle.value = '网络连接失败';
      errorMessage.value = '无法连接到后端服务，请检查代理配置';
    } else {
      errorTitle.value = '请求错误';
      errorMessage.value = err.message || '未知错误';
    }
  } finally {
    loading.value = false;
  }
};

const metrics = ref<any>({
  abnormalRate: '0.00',
  euiRate: '0.00'
});

const allMonitorData = ref<any[]>([]);
const currentEnergyDetail = ref<Record<string, number>>({});
const currentEnvDetail = ref<any>({});
const envLoading = ref(false);

const loading = ref(true);
const tableLoading = ref(false);
const error = ref(false);
const errorTitle = ref('加载失败');
const errorMessage = ref('无法获取建筑详情数据');

const PEAK_HOURS = [9, 10, 11, 14, 15, 16, 17, 19, 20, 21];
const VALLEY_HOURS = [23, 0, 1, 2, 3, 4, 5, 6, 7];
const FLAT_HOURS = [8, 12, 13, 18, 22];

const getPricePeriodType = (hour: number): 'peak' | 'valley' | 'flat' => {
  if (PEAK_HOURS.includes(hour)) return 'peak';
  if (VALLEY_HOURS.includes(hour)) return 'valley';
  return 'flat';
};

const filteredData = computed(() => {
  if (!timeFilterConfig.value.startTime || !timeFilterConfig.value.endTime) {
    return allMonitorData.value;
  }
  const start = new Date(timeFilterConfig.value.startTime);
  const end = new Date(timeFilterConfig.value.endTime);
  return allMonitorData.value.filter(item => {
    const itemTime = new Date(item.time);
    return itemTime >= start && itemTime <= end;
  });
});

const filteredTotal = computed(() => filteredData.value.length);
const PAGE_SIZE = 8;
const pagination = ref({
  current: 1,
  pageSize: PAGE_SIZE,
  total: 0,
  start: 1,
  end: PAGE_SIZE
});

const displayData = computed(() => {
  const start = (pagination.value.current - 1) * pagination.value.pageSize;
  const end = start + pagination.value.pageSize;
  return filteredData.value.slice(start, end);
});

const emptyRows = computed(() => {
  const currentRows = displayData.value.length;
  const targetRows = PAGE_SIZE;
  return Math.max(0, targetRows - currentRows);
});

const totalPages = computed(() => Math.ceil(filteredTotal.value / pagination.value.pageSize) || 1);

const visiblePages = computed(() => {
  const pages: (number | string)[] = [];
  const current = pagination.value.current;
  const total = totalPages.value;
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    if (current <= 4) {
      pages.push(1, 2, 3, 4, 5);
      if (total > 7) pages.push('...', total);
    } else if (current >= total - 3) {
      pages.push(1, '...');
      pages.push(total - 4, total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, '...');
      pages.push(current - 1, current, current + 1);
      pages.push('...', total);
    }
  }
  return pages;
});

const updatePaginationRange = () => {
  const start = (pagination.value.current - 1) * pagination.value.pageSize + 1;
  const end = Math.min(start + pagination.value.pageSize - 1, filteredTotal.value);
  pagination.value.start = start;
  pagination.value.end = end;
};

const handleTimeQuery = async (timeConfig: any) => {
  timeFilterConfig.value = {
    range: timeConfig.range || 'month',
    startTime: timeConfig.startTime || '',
    endTime: timeConfig.endTime || '',
    features: {
      workday: timeConfig.features?.workday ?? true,
      workdayPrice: timeConfig.features?.workdayPrice || 'all',
      weekend: timeConfig.features?.weekend ?? false,
      weekendPrice: timeConfig.features?.weekendPrice || 'valley',
      holiday: timeConfig.features?.holiday ?? false,
      holidayPrice: timeConfig.features?.holidayPrice || 'valley'
    }
  };
  pagination.value.current = 1;
  await fetchMonitorData();
  updatePaginationRange();
};

const handleExport = (exportConfig: { format: string }) => {
  console.log('导出配置：', exportConfig);
};

// 【修改】环境数据接口调用
const fetchEnvData = async (item: any) => {
  envLoading.value = true;
  try {
    // 从行数据中获取时间
    const timeStr = item.time;
    // 解析时间，获取该小时的起止时间
    const date = new Date(timeStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    
    const startTime = `${year}-${month}-${day} ${hour}:00:00`;
    const endTime = `${year}-${month}-${day} ${hour}:59:59`;
    
    const response = await axios.get('/api/energy/weather', {
      params: {
        buildingId: buildingId.value,
        startTime,
        endTime
      }
    });
    
    // 假设接口返回数据包含环境数据字段
    const data = response.data?.data || response.data || {};
    currentEnvDetail.value = data;
  } catch (err) {
    console.error('获取环境数据失败:', err);
    currentEnvDetail.value = {};
  } finally {
    envLoading.value = false;
  }
};

const handleViewEnergy = (item: any) => {
  currentEnergyDetail.value = item.meters || item.energyDetail || {};
  showEnergyModal.value = true;
};

const handleViewEnv = async (item: any) => {
  console.log('查看环境数据:', item.time);
  await fetchEnvData(item);
  showEnvModal.value = true;
};

const closeEnergyModal = () => {
  showEnergyModal.value = false;
};

const closeEnvModal = () => {
  showEnvModal.value = false;
};

const handleBack = () => {
  router.back();
};

const handleViewStats = () => {
  console.log('查看统计数据');
};

const handlePageChange = (page: number | string) => {
  if (typeof page === 'number') {
    pagination.value.current = page;
    updatePaginationRange();
  }
};

const handlePrevPage = () => {
  if (pagination.value.current > 1) {
    pagination.value.current--;
    updatePaginationRange();
  }
};

const handleNextPage = () => {
  if (pagination.value.current < totalPages.value) {
    pagination.value.current++;
    updatePaginationRange();
  }
};

// 【修复】onMounted 添加 async
onMounted(async () => {
  if (route.query.timeRange) {
    timeRange.value = route.query.timeRange as any;
    timeFilterConfig.value.range = route.query.timeRange as string;
  }
  
  const routeBuildingId = route.params.id as string;
  if (routeBuildingId) {
    buildingId.value = routeBuildingId;
  }
  
  currentSystemTime.value = getSettingPageTime();
  
  await Promise.all([
    fetchBuildingDetail(),
    fetchMonitorData()
  ]);
});
</script>

<style scoped>
/* 样式部分保持不变，与提供的一致 */
.building-detail {
  min-height: 100%;
  background: #f5f7fa;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: white;
  padding: 20px 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h1 {
  font-size: 24px;
  font-weight: 700;
  color: #002b54;
  margin: 0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.status-badge.normal {
  background: #e6f7e6;
  color: #52c41a;
}

.status-badge.warning {
  background: #fff7e6;
  color: #fa8c16;
}

.status-badge.error {
  background: #fff1f0;
  color: #ff4d4f;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.header-right {
  display: flex;
  gap: 12px;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-back:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #0056b3;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover {
  background: #004494;
}

.content-grid {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 24px;
  align-items: start;
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.tab-header {
  display: flex;
  background: white;
  border-radius: 12px 12px 0 0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.tab-btn {
  flex: 1;
  padding: 16px;
  border: none;
  background: #f5f7fa;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.tab-btn:hover {
  background: #e8ecf1;
}

.tab-btn.active {
  background: white;
  color: #0056b3;
  font-weight: 600;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  width: 60%;
  height: 2px;
  background: #0056b3;
  border-radius: 2px;
}

.info-card {
  background: white;
  border-radius: 0 0 12px 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.metadata-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item.full-width {
  grid-column: span 2;
}

.meta-label {
  font-size: 12px;
  color: #999;
  font-weight: 400;
}

.meta-value {
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.sub-value {
  color: #999;
  font-weight: 400;
  margin-left: 4px;
}

.certifications {
  display: flex;
  gap: 40px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.cert-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cert-label {
  font-size: 12px;
  color: #999;
}

.cert-badge {
  display: inline-flex;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.cert-badge.platinum {
  background: #f0f5ff;
  color: #2f54eb;
}

.energy-star {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.star-icon {
  color: #faad14;
}

.derived-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.derived-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.derived-label {
  font-size: 12px;
  color: #999;
  font-weight: 400;
}

.derived-value {
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.energy-select {
  width: 100%;
  height: 32px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 14px;
  color: #333;
  background: white;
  cursor: pointer;
  outline: none;
}

.energy-select:focus {
  border-color: #0056b3;
}

.derived-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.derived-time-range {
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  padding: 4px 12px;
  border-radius: 12px;
}

.metrics-card {
  background: white;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.metrics-card h3 {
  font-size: 14px;
  color: #333;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.metric-label {
  font-size: 12px;
  color: #666;
}

.metric-value {
  font-size: 20px;
  font-weight: 700;
}

.metric-value.abnormal {
  color: #52c41a;
}

.metric-value.eui {
  color: #0056b3;
}

.right-panel {
  min-width: 0;
}

.monitor-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.monitor-icon {
  color: #0056b3;
}

.header-title h3 {
  font-size: 16px;
  color: #333;
  font-weight: 600;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-icon {
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  border-color: #1890ff;
  color: #1890ff;
  background: #e6f7ff;
}

.btn-filter:hover {
  border-color: #52c41a;
  color: #52c41a;
  background: #f6ffed;
}

.btn-download {
  padding: 8px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-download:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.monitor-table-wrapper {
  margin-bottom: 20px;
  min-height: 480px;
}

.monitor-table {
  width: 100%;
  border-collapse: collapse;
}

.monitor-table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 13px;
  color: #666;
  font-weight: 500;
  border-bottom: 1px solid #f0f0f0;
}

.monitor-table td {
  padding: 16px;
  border-bottom: 1px solid #f5f5f5;
  vertical-align: middle;
  height: 60px;
}

.empty-row td {
  border-bottom: 1px solid #f5f5f5;
  height: 60px;
}

.col-time {
  width: 200px;
  color: #666;
  font-size: 14px;
}

.col-energy, .col-env {
  width: 150px;
}

.btn-view {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 4px;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-view:hover {
  border-color: #1890ff;
  color: #1890ff;
  background: #e6f7ff;
}

.btn-view.green {
  border-color: #b7eb8f;
  background: #f6ffed;
  color: #52c41a;
}

.btn-view.green:hover {
  background: #d9f7be;
}

.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.pagination-info {
  font-size: 13px;
  color: #999;
}

.pagination-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.page-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.page-btn:hover:not(:disabled) {
  border-color: #1890ff;
  color: #1890ff;
}

.page-btn.active {
  background: #0056b3;
  border-color: #0056b3;
  color: white;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-bottom-spacer {
  height: 60px;
  width: 100%;
  background: #f5f7fa;
  margin-top: 24px;
  border-radius: 12px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.modal-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 100%;
  max-width: 420px;
  overflow: hidden;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-title h3 {
  font-size: 16px;
  font-weight: 600;
  color: #002b54;
  margin: 0;
}

.modal-icon {
  width: 24px;
  height: 24px;
}

.modal-icon.energy {
  color: #0056b3;
}

.modal-icon.env {
  color: #52c41a;
}

.btn-close {
  padding: 6px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.btn-close:hover {
  background: #e0e0e0;
  color: #333;
}

.modal-body {
  padding: 24px;
}

.energy-grid {
  display: grid;
  gap: 16px;
}

.energy-item, .env-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  transition: all 0.3s;
}

.energy-item:hover, .env-item:hover {
  background: #f0f2f5;
  transform: translateX(4px);
}

.item-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-icon.blue {
  background: #e6f7ff;
  color: #1890ff;
}

.item-icon.red {
  background: #fff2e8;
  color: #fa541c;
}

.item-icon.cyan {
  background: #e6fffb;
  color: #13c2c2;
}

.item-icon.gray {
  background: #f5f5f5;
  color: #666;
}

.item-icon.orange {
  background: #fff7e6;
  color: #fa8c16;
}

.item-icon.green {
  background: #f6ffed;
  color: #52c41a;
}

.item-icon.blue-light {
  background: #f0f5ff;
  color: #2f54eb;
}

.item-icon.yellow {
  background: #fffbe6;
  color: #fadb14;
}

.item-icon.temp {
  background: #fff2f0;
  color: #ff4d4f;
}

.item-icon.cloud {
  background: #f0f2f5;
  color: #8c8c8c;
}

.item-icon.rain {
  background: #e6f7ff;
  color: #1890ff;
}

.item-icon.wind {
  background: #f6ffed;
  color: #52c41a;
}

.item-icon.dew {
  background: #e6fffb;
  color: #13c2c2;
}

.item-icon.pressure {
  background: #f9f0ff;
  color: #722ed1;
}

.item-icon.direction {
  background: #fff2e8;
  color: #fa541c;
}

.item-name {
  flex: 1;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.item-value {
  font-size: 20px;
  font-weight: 700;
  color: #002b54;
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.unit {
  font-size: 12px;
  font-weight: 400;
  color: #666;
}

.env-grid {
  display: grid;
  gap: 16px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  margin-top: 24px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E7EB;
  border-top-color: #0056b3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  margin-top: 24px;
  text-align: center;
}

.error-icon {
  color: #DC2626;
  margin-bottom: 16px;
}

.error-container h3 {
  font-size: 18px;
  color: #1F2937;
  margin: 0 0 8px 0;
}

.error-container p {
  color: #6B7280;
  margin-bottom: 24px;
}

.btn-retry {
  padding: 10px 24px;
  background: #0056b3;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-retry:hover {
  background: #004494;
}

.energy-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #999;
  grid-column: span 2;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.energy-empty p {
  font-size: 14px;
  margin: 0;
}
</style>
