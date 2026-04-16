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

    <div class="content-grid">
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
              <span class="derived-value">{{ derivedData.energyType }}</span>
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
            <!-- 新增：按钮组容器，包含筛选和下载按钮 -->
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
                      <!-- 温度计图标 -->
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
                        <circle cx="11.5" cy="16.5" r="1.5" fill="currentColor"/>
                        <path d="M11.5 9v6"/>
                      </svg>
                      查看
                    </button>
                  </td>
                </tr>
                <!-- 空白填充行（当数据不足8条时保持高度） -->
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

    <!-- 页面最底部占位条 -->
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
              <div class="energy-item">
                <div class="item-icon blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
                  </svg>
                </div>
                <span class="item-name">电力</span>
                <span class="item-value">1,245.2<span class="unit">kWh</span></span>
              </div>
              <div class="energy-item">
                <div class="item-icon red">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8.56 2.9A7 7 0 0 1 19 9v4m-2 4H2a3 3 0 0 1 3-3h5a2 2 0 0 0 2-2V9a5 5 0 0 1 5-5h.05"/>
                    <path d="M12 12v10"/>
                    <path d="M8 22h8"/>
                    <path d="M7 10h10"/>
                  </svg>
                </div>
                <span class="item-name">热水</span>
                <span class="item-value">84.5<span class="unit">m³</span></span>
              </div>
              <div class="energy-item">
                <div class="item-icon cyan">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 2v20M2 12h20"/>
                    <path d="M8 8l8 8M16 8l-8 8" stroke-opacity="0.3"/>
                  </svg>
                </div>
                <span class="item-name">冷冻水</span>
                <span class="item-value">312.1<span class="unit">GJ</span></span>
              </div>
              <div class="energy-item">
                <div class="item-icon gray">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v20M12 2l-4 4M12 2l4 4M12 22l-4-4M12 22l4-4"/>
                    <path d="M4 12h16"/>
                    <path d="M4 12l4-2M4 12l4 2M20 12l-4-2M20 12l-4 2" stroke-opacity="0.5"/>
                  </svg>
                </div>
                <span class="item-name">蒸汽</span>
                <span class="item-value">12.8<span class="unit">t</span></span>
              </div>
              <div class="energy-item">
                <div class="item-icon orange">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="4"/>
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                  </svg>
                </div>
                <span class="item-name">燃气</span>
                <span class="item-value">450.0<span class="unit">m³</span></span>
              </div>
              <div class="energy-item">
                <div class="item-icon green">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L4 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-8-4z"/>
                    <path d="M12 6v12"/>
                    <path d="M12 18c-2-2-3-5-3-8"/>
                  </svg>
                </div>
                <span class="item-name">灌溉</span>
                <span class="item-value">5.2<span class="unit">m³</span></span>
              </div>
              <div class="energy-item">
                <div class="item-icon blue-light">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
                    <path d="M12 8v8"/>
                    <path d="M12 16l3-3M12 16l-3-3"/>
                  </svg>
                </div>
                <span class="item-name">用水量</span>
                <span class="item-value">28.4<span class="unit">m³</span></span>
              </div>
              <div class="energy-item">
                <div class="item-icon yellow">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                </div>
                <span class="item-name">太阳能发电量</span>
                <span class="item-value">15.6<span class="unit">kWh</span></span>
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
            <div class="env-grid">
              <div class="env-item">
                <div class="item-icon temp">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
                    <circle cx="11.5" cy="16.5" r="1.5" fill="currentColor"/>
                  </svg>
                </div>
                <span class="item-name">气温</span>
                <span class="item-value">24.5<span class="unit">°C</span></span>
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
                <span class="item-value">15<span class="unit">%</span></span>
              </div>
              <div class="env-item">
                <div class="item-icon rain">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 13v8M8 13v8M12 15v8M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
                  </svg>
                </div>
                <span class="item-name">降水量</span>
                <span class="item-value">0.0<span class="unit">mm</span></span>
              </div>
              <div class="env-item">
                <div class="item-icon wind">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
                  </svg>
                </div>
                <span class="item-name">风速</span>
                <span class="item-value">3.2<span class="unit">m/s</span></span>
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
                <span class="item-value">18.2<span class="unit">°C</span></span>
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
                <span class="item-value">1,012<span class="unit">hPa</span></span>
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
                <span class="item-value">东南<span class="unit">135°</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 新增：时间维度配置弹窗 -->
    <TimeFilterModal 
      v-model:visible="showTimeFilter"
      @query="handleTimeQuery"
    />

    <!-- 新增：导出报表弹窗 -->
    <ExportModal 
      v-model:visible="showExportModal"
      @export="handleExport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePageAIContext } from '../../composables/useAIContext';
import { getCurrentTimeString } from '@/utils/timeManager';
// 新增：导入弹窗组件
import TimeFilterModal from './TimeFilterModal.vue';
import ExportModal from './ExportModal.vue';

const route = useRoute();
const router = useRouter();

const buildingId = computed(() => route.params.id as string || 'BLDG-HQ-A01');
usePageAIContext('building-detail', computed(() => ({
  building_id: buildingId.value
})));

// 新增：弹窗显示状态控制
const showTimeFilter = ref(false);
const showExportModal = ref(false);

// 新增：当前系统时间（从设置页面获取）
const currentSystemTime = ref(getCurrentTimeString());

// 新增：时间筛选配置
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

// 标签页状态
const activeTab = ref<'metadata' | 'derived'>('derived');

// 建筑状态
const status = ref<'normal' | 'warning' | 'error'>('normal');
const statusText = computed(() => {
  const map = { normal: '运行正常', warning: '告警状态', error: '异常状态' };
  return map[status.value];
});
const statusClass = computed(() => status.value);

// 弹窗显示状态
const showEnergyModal = ref(false);
const showEnvModal = ref(false);

// 建筑元数据
const buildingInfo = ref({
  buildingId: 'BLDG-HQ-A01-SH',
  siteId: 'East-China-04 / site_4',
  primaryUse: '办公/商业',
  area: '124,500',
  areaFt: '1,340,107',
  subUse: '建筑',
  buildYear: '2018',
  floors: '42',
  timezone: 'UTC+8 (北京)',
  startDate: '2018-06-28',
  occupancy: '8,500',
  coordinates: '31.23° N, 121.47° E'
});

// 建筑衍生数据
const derivedData = ref({
  cop: '111',
  annualCarbon: '1,245.50',
  carbonPerArea: '12.4',
  carbonPerPerson: '0.85',
  carbonReduction: '111',
  carbonReductionRate: '12.5%',
  renewableRate: '24%',
  euiBaseline: '111',
  euiSource: '111',
  euiSite: '111',
  waterPerArea: '111',
  energyPerPerson: '11',
  energyType: '电力(Electricity)',
  totalEnergy: '111',
  energyRatio: '11%',
  totalEnergyAll: '3510.12'
});

// 运行关键指标
const metrics = ref({
  abnormalRate: '0.42',
  euiRate: '104.2'
});

// 模拟数据（142条）- 基于2024年5月12日的数据
const allMonitorData = ref([
  { time: '2024-05-12 08:00' }, { time: '2024-05-12 09:00' },
  { time: '2024-05-12 10:00' }, { time: '2024-05-12 11:00' },
  { time: '2024-05-12 12:00' }, { time: '2024-05-12 13:00' },
  { time: '2024-05-12 14:00' }, { time: '2024-05-12 15:00' },
  { time: '2024-05-12 16:00' }, { time: '2024-05-12 17:00' },
  { time: '2024-05-12 18:00' }, { time: '2024-05-12 19:00' },
]);

// 生成142条模拟数据（基于当前系统时间2026-04-15生成一些模拟历史数据）
const generateMockData = () => {
  const data = [];
  const current = new Date(currentSystemTime.value);
  
  // 生成最近30天的数据，每小时一条
  for (let i = 0; i < 142; i++) {
    const date = new Date(current);
    date.setHours(date.getHours() - i);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    data.unshift({ time: `${year}-${month}-${day} ${hour}:00` });
  }
  return data;
};

allMonitorData.value = generateMockData();

// 新增：根据时间筛选过滤后的数据
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

// 新增：过滤后的总数
const filteredTotal = computed(() => filteredData.value.length);

// 分页配置 - 固定每页8条
const PAGE_SIZE = 8;
const pagination = ref({
  current: 1,
  pageSize: PAGE_SIZE,
  total: 142,
  start: 1,
  end: PAGE_SIZE
});

// 修改：使用过滤后的数据进行分页显示
const displayData = computed(() => {
  const start = (pagination.value.current - 1) * pagination.value.pageSize;
  const end = start + pagination.value.pageSize;
  return filteredData.value.slice(start, end);
});

// 空白行填充（当数据不足8条时保持高度）
const emptyRows = computed(() => {
  const currentRows = displayData.value.length;
  const targetRows = PAGE_SIZE;
  return Math.max(0, targetRows - currentRows);
});

// 修改：基于过滤后的数据计算总页数
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

// 更新分页范围显示
const updatePaginationRange = () => {
  const start = (pagination.value.current - 1) * pagination.value.pageSize + 1;
  const end = Math.min(start + pagination.value.pageSize - 1, filteredTotal.value);
  pagination.value.start = start;
  pagination.value.end = end;
};

// 新增：处理时间查询
const handleTimeQuery = (timeConfig: any) => {
  console.log('时间查询配置：', timeConfig);
  
  // 保存筛选配置
  timeFilterConfig.value = {
    range: timeConfig.range,
    startTime: timeConfig.startTime,
    endTime: timeConfig.endTime,
    features: timeConfig.features
  };
  
  // 重置到第一页
  pagination.value.current = 1;
  
  // 更新分页信息
  updatePaginationRange();
  
  // 这里可以根据时间配置调用API重新加载数据
  // 目前使用前端过滤演示效果
};

// 新增：处理导出
const handleExport = (exportConfig: { format: string }) => {
  console.log('导出配置：', exportConfig);
  // 这里实现实际的导出逻辑
};

// 弹窗方法
const handleViewEnergy = (item: any) => {
  console.log('查看能耗数据:', item.time);
  showEnergyModal.value = true;
};

const handleViewEnv = (item: any) => {
  console.log('查看环境数据:', item.time);
  showEnvModal.value = true;
};

const closeEnergyModal = () => {
  showEnergyModal.value = false;
};

const closeEnvModal = () => {
  showEnvModal.value = false;
};

// 其他方法
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

// 初始化
onMounted(() => {
  updatePaginationRange();
});
</script>

<style scoped>
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

/* 新增：按钮组容器样式 */
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 新增：图标按钮基础样式 */
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

/* 新增：筛选按钮特殊样式 */
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

/* 弹窗样式 */
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
</style>
