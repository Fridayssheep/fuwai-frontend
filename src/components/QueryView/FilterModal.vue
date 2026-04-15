<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <!-- 头部 -->
      <div class="modal-header">
        <div class="header-title">
          <div class="icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#005BAC" stroke-width="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
          </div>
          <div>
            <h3>高级筛选</h3>
            <p class="subtitle">主要用于查询符合条件的建筑</p>
          </div>
        </div>
        <button class="close-btn" @click="handleClose">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Tab 切换 -->
      <div class="modal-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="['tab-btn', { active: activeTab === tab.key }]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 内容区域 -->
      <div class="modal-body">
        
        <!-- ========== 时间维度配置 Tab ========== -->
        <div v-show="activeTab === 'time'" class="tab-content">
          <!-- 快捷范围 -->
          <div class="section">
            <div class="section-title">
              <span class="title-dot"></span>
              <span>快捷范围</span>
            </div>
            <div class="quick-range">
              <button 
                v-for="range in timeRanges" 
                :key="range.value"
                @click="form.timeRange = range.value"
                :class="['range-btn', { active: form.timeRange === range.value }]"
              >
                {{ range.label }}
              </button>
            </div>
          </div>

          <!-- 精确时间 -->
          <div class="section">
            <div class="section-title">
              <span class="title-dot"></span>
              <span>精确时间</span>
            </div>
            <div class="precise-time">
              <div class="time-block">
                <label>开始时间</label>
                <div class="time-inputs">
                  <input type="text" v-model="form.startTime.year" class="time-input" placeholder="2023" />
                  <span class="time-unit">年</span>
                  <input type="text" v-model="form.startTime.month" class="time-input" placeholder="10" />
                  <span class="time-unit">月</span>
                  <input type="text" v-model="form.startTime.day" class="time-input" placeholder="01" />
                  <span class="time-unit">日</span>
                  <input type="text" v-model="form.startTime.hour" class="time-input" placeholder="00" />
                  <span class="time-unit">时</span>
                </div>
              </div>
              <div class="time-block">
                <label>结束时间</label>
                <div class="time-inputs">
                  <input type="text" v-model="form.endTime.year" class="time-input" placeholder="2023" />
                  <span class="time-unit">年</span>
                  <input type="text" v-model="form.endTime.month" class="time-input" placeholder="10" />
                  <span class="time-unit">月</span>
                  <input type="text" v-model="form.endTime.day" class="time-input" placeholder="31" />
                  <span class="time-unit">日</span>
                  <input type="text" v-model="form.endTime.hour" class="time-input" placeholder="23" />
                  <span class="time-unit">时</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 时间特征 -->
          <div class="section">
            <div class="section-title">
              <span class="title-dot"></span>
              <span>时间特征</span>
            </div>
            <div class="time-features">
              <label class="feature-checkbox">
                <input type="checkbox" v-model="form.timeFeatures.workday" />
                <span class="check-box"></span>
                <span>工作日</span>
                <select v-model="form.timeFeatures.workdayPrice" class="feature-select">
                  <option value="peak">电价高峰</option>
                  <option value="valley">电价低谷</option>
                  <option value="normal">全部</option>
                </select>
              </label>
              
              <label class="feature-checkbox">
                <input type="checkbox" v-model="form.timeFeatures.weekend" />
                <span class="check-box"></span>
                <span>周末</span>
                <select v-model="form.timeFeatures.weekendPrice" class="feature-select">
                  <option value="valley">电价低谷</option>
                  <option value="peak">电价高峰</option>
                  <option value="normal">全部</option>
                </select>
              </label>
              
              <label class="feature-checkbox">
                <input type="checkbox" v-model="form.timeFeatures.holiday" />
                <span class="check-box"></span>
                <span>节假日</span>
                <select v-model="form.timeFeatures.holidayPrice" class="feature-select">
                  <option value="valley">电价低谷</option>
                  <option value="peak">电价高峰</option>
                  <option value="normal">全部</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <!-- ========== 建筑属性筛选 Tab（已有） ========== -->
        <div v-show="activeTab === 'property'" class="tab-content">
          <div class="section">
            <div class="section-title">
              <span class="title-dot"></span>
              <span>标识定位</span>
            </div>
            <div class="form-row">
              <div class="form-item">
                <label>建筑ID：</label>
                <input type="text" placeholder="请输入文字" class="input-box" v-model="form.buildingId" />
              </div>
              <div class="form-item">
                <label>站点：</label>
                <input type="text" placeholder="请输入文字" class="input-box" v-model="form.site" />
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">
              <span class="title-dot"></span>
              <span>物理属性</span>
            </div>
            <div class="checkbox-row">
              <label>建筑类型：</label>
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="form.buildingType" value="education" />
                  <span class="check-box"></span>
                  <span>教育</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" v-model="form.buildingType" value="office" />
                  <span class="check-box"></span>
                  <span>办公</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" v-model="form.buildingType" value="dormitory" />
                  <span class="check-box"></span>
                  <span>住宿</span>
                </label>
              </div>
              <label style="margin-left: 40px;">细分用途：</label>
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="form.subUsage" value="research" />
                  <span class="check-box"></span>
                  <span>研究</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" v-model="form.subUsage" value="classroom" />
                  <span class="check-box"></span>
                  <span>教室</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" v-model="form.subUsage" value="dorm" />
                  <span class="check-box"></span>
                  <span>宿舍</span>
                </label>
              </div>
            </div>
            <div class="form-row">
              <div class="form-item">
                <label>建造年份：</label>
                <input type="text" placeholder="请输入年份数字" class="input-box" v-model="form.builtYear" />
              </div>
              <div class="form-item">
                <label>建造面积：</label>
                <div class="input-with-unit">
                  <input type="text" placeholder="请输入面积数字" class="input-box" v-model="form.area" />
                  <span class="unit">m²</span>
                </div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-item">
                <label>楼层数：</label>
                <input type="text" placeholder="请输入楼层数字" class="input-box" v-model="form.floors" />
              </div>
              <div class="form-item">
                <label>容纳人数：</label>
                <input type="text" placeholder="请输入使用者数量" class="input-box" v-model="form.occupancy" />
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">
              <span class="title-dot"></span>
              <span>能效基准</span>
            </div>
            <div class="checkbox-row">
              <label>LEED等级：</label>
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="form.leedLevel" value="gold" />
                  <span class="check-box"></span>
                  <span>金奖</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" v-model="form.leedLevel" value="silver" />
                  <span class="check-box"></span>
                  <span>银奖</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" v-model="form.leedLevel" value="none" />
                  <span class="check-box"></span>
                  <span>无</span>
                </label>
              </div>
            </div>
            <div class="form-row">
              <div class="form-item">
                <label>EnergyStar：</label>
                <input type="text" placeholder="请输入评分数字" class="input-box" v-model="form.energyStar" />
              </div>
              <div class="form-item">
                <label>EUI：</label>
                <input type="text" placeholder="请输入基准数值" class="input-box" v-model="form.euiMin" />
              </div>
            </div>
          </div>
        </div>

        <!-- ========== 能耗指标筛选 Tab ========== -->
        <div v-show="activeTab === 'energy'" class="tab-content">
          <!-- 能效指标 -->
          <div class="section">
            <div class="section-title">
              <span class="title-dot"></span>
              <span>能效指标</span>
            </div>
            
            <div class="energy-grid">
              <div class="energy-item">
                <label>EUI 范围 (KWH/M²/年)</label>
                <div class="range-inputs">
                  <input type="text" placeholder="最小" v-model="form.euiRange.min" />
                  <span class="separator">—</span>
                  <input type="text" placeholder="最大" v-model="form.euiRange.max" />
                </div>
              </div>
              
              <div class="energy-item">
                <label>场地级EUI 范围 (KWH/M²/年)</label>
                <div class="range-inputs">
                  <input type="text" placeholder="最小" v-model="form.siteEuiRange.min" />
                  <span class="separator">—</span>
                  <input type="text" placeholder="最大" v-model="form.siteEuiRange.max" />
                </div>
              </div>
              
              <div class="energy-item">
                <label>源头级EUI 范围 (KWH/M²/年)</label>
                <div class="range-inputs">
                  <input type="text" placeholder="最小" v-model="form.sourceEuiRange.min" />
                  <span class="separator">—</span>
                  <input type="text" placeholder="最大" v-model="form.sourceEuiRange.max" />
                </div>
              </div>

              <div class="energy-item">
                <label>电力能耗范围 (KWH)</label>
                <div class="range-inputs">
                  <input type="text" placeholder="最小" v-model="form.electricityRange.min" />
                  <span class="separator">—</span>
                  <input type="text" placeholder="最大" v-model="form.electricityRange.max" />
                </div>
              </div>
              
              <div class="energy-item">
                <label>热水能耗范围 (KWH)</label>
                <div class="range-inputs">
                  <input type="text" placeholder="最小" v-model="form.hotWaterRange.min" />
                  <span class="separator">—</span>
                  <input type="text" placeholder="最大" v-model="form.hotWaterRange.max" />
                </div>
              </div>
              
              <div class="energy-item">
                <label>冷冻水能耗范围 (KWH)</label>
                <div class="range-inputs">
                  <input type="text" placeholder="最小" v-model="form.chilledWaterRange.min" />
                  <span class="separator">—</span>
                  <input type="text" placeholder="最大" v-model="form.chilledWaterRange.max" />
                </div>
              </div>

              <div class="energy-item">
                <label>蒸汽能耗范围 (KWH)</label>
                <div class="range-inputs">
                  <input type="text" placeholder="最小" v-model="form.steamRange.min" />
                  <span class="separator">—</span>
                  <input type="text" placeholder="最大" v-model="form.steamRange.max" />
                </div>
              </div>
              
              <div class="energy-item">
                <label>用水量范围 (M³)</label>
                <div class="range-inputs">
                  <input type="text" placeholder="最小" v-model="form.waterRange.min" />
                  <span class="separator">—</span>
                  <input type="text" placeholder="最大" v-model="form.waterRange.max" />
                </div>
              </div>
              
              <div class="energy-item">
                <label>灌溉能耗范围 (KWH)</label>
                <div class="range-inputs">
                  <input type="text" placeholder="最小" v-model="form.irrigationRange.min" />
                  <span class="separator">—</span>
                  <input type="text" placeholder="最大" v-model="form.irrigationRange.max" />
                </div>
              </div>

              <div class="energy-item">
                <label>太阳能发电量范围 (KWH)</label>
                <div class="range-inputs">
                  <input type="text" placeholder="最小" v-model="form.solarRange.min" />
                  <span class="separator">—</span>
                  <input type="text" placeholder="最大" v-model="form.solarRange.max" />
                </div>
              </div>
              
              <div class="energy-item">
                <label>燃气能耗范围 (KWH)</label>
                <div class="range-inputs">
                  <input type="text" placeholder="最小" v-model="form.gasRange.min" />
                  <span class="separator">—</span>
                  <input type="text" placeholder="最大" v-model="form.gasRange.max" />
                </div>
              </div>
              
              <div class="energy-item">
                <label>人均能耗范围 (KWH/人)</label>
                <div class="range-inputs">
                  <input type="text" placeholder="最小" v-model="form.perCapitaRange.min" />
                  <span class="separator">—</span>
                  <input type="text" placeholder="最大" v-model="form.perCapitaRange.max" />
                </div>
              </div>
            </div>
          </div>

          <!-- 设备健康度 -->
          <div class="section">
            <div class="section-title">
              <span class="title-dot"></span>
              <span>设备健康度</span>
            </div>
            <div class="energy-item single">
              <label>COP范围</label>
              <div class="range-inputs">
                <input type="text" placeholder="最小" v-model="form.copRange.min" />
                <span class="separator">—</span>
                <input type="text" placeholder="最大" v-model="form.copRange.max" />
              </div>
            </div>
          </div>

          <!-- 双碳指标 -->
          <div class="section">
            <div class="section-title">
              <span class="title-dot"></span>
              <span>双碳指标</span>
            </div>
            <div class="carbon-grid">
              <div class="carbon-item">
                <label>建筑年度总碳排放量</label>
                <div class="compare-input">
                  <select v-model="form.carbonTotal.compare" class="compare-select">
                    <option value=">">></option>
                    <option value="<"><</option>
                    <option value="=">=</option>
                    <option value="<="><=</option>
                    <option value=">=">>=</option>
                  </select>
                  <input type="text" placeholder="请输入" v-model="form.carbonTotal.value" />
                  <span class="unit">kgCO₂e</span>
                </div>
              </div>
              
              <div class="carbon-item">
                <label>单位面积碳排放量</label>
                <div class="compare-input">
                  <select v-model="form.carbonPerArea.compare" class="compare-select">
                    <option value=">">></option>
                    <option value="<"><</option>
                    <option value="=">=</option>
                    <option value="<="><=</option>
                    <option value=">=">>=</option>
                  </select>
                  <input type="text" placeholder="请输入" v-model="form.carbonPerArea.value" />
                  <span class="unit">kgCO₂e/m²</span>
                </div>
              </div>
              
              <div class="carbon-item">
                <label>人均碳排放量</label>
                <div class="compare-input">
                  <select v-model="form.carbonPerCapita.compare" class="compare-select">
                    <option value=">">></option>
                    <option value="<"><</option>
                    <option value="=">=</option>
                    <option value="<="><=</option>
                    <option value=">=">>=</option>
                  </select>
                  <input type="text" placeholder="请输入" v-model="form.carbonPerCapita.value" />
                  <span class="unit">kgCO₂e/m²</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部 -->
      <div class="modal-footer">
        <span class="status-text">配置筛选条件</span>
        <div class="footer-buttons">
          <button class="btn btn-default" @click="handleClose">取消</button>
          <button class="btn btn-primary" @click="handleSave">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            保存查询条件
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits(['update:visible', 'save'])

const activeTab = ref('time')  // 默认显示时间维度配置

const tabs = [
  { key: 'time', label: '时间维度配置' },
  { key: 'property', label: '建筑属性筛选' },
  { key: 'energy', label: '能耗指标筛选' }
]

const timeRanges = [
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '上周', value: 'lastWeek' },
  { label: '本月', value: 'month' },
  { label: '上月', value: 'lastMonth' },
  { label: '本季度', value: 'quarter' },
  { label: '本年', value: 'year' }
]

// 完整的表单数据结构
const form = reactive({
  // 时间维度
  timeRange: 'month',
  startTime: { year: '2023', month: '10', day: '01', hour: '00' },
  endTime: { year: '2023', month: '10', day: '31', hour: '23' },
  timeFeatures: {
    workday: true,
    workdayPrice: 'peak',
    weekend: false,
    weekendPrice: 'valley',
    holiday: false,
    holidayPrice: 'valley'
  },
  
  // 建筑属性
  buildingId: '',
  site: '',
  buildingType: [] as string[],
  subUsage: [] as string[],
  builtYear: '',
  area: '',
  floors: '',
  occupancy: '',
  leedLevel: [] as string[],
  energyStar: '',
  euiMin: '',
  
  // 能耗指标（所有范围都是 min/max）
  euiRange: { min: '', max: '' },
  siteEuiRange: { min: '', max: '' },
  sourceEuiRange: { min: '', max: '' },
  electricityRange: { min: '', max: '' },
  hotWaterRange: { min: '', max: '' },
  chilledWaterRange: { min: '', max: '' },
  steamRange: { min: '', max: '' },
  waterRange: { min: '', max: '' },
  irrigationRange: { min: '', max: '' },
  solarRange: { min: '', max: '' },
  gasRange: { min: '', max: '' },
  perCapitaRange: { min: '', max: '' },
  copRange: { min: '', max: '' },
  
  // 双碳指标（带比较运算符）
  carbonTotal: { compare: '>', value: '' },
  carbonPerArea: { compare: '>', value: '' },
  carbonPerCapita: { compare: '>', value: '' }
})

const handleClose = () => {
  emit('update:visible', false)
}

const handleSave = () => {
  emit('save', form)
  handleClose()
}
</script>

<style scoped>
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
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #E5E7EB;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-title {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.icon-box {
  width: 40px;
  height: 40px;
  background: #EFF6FF;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #6B7280;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9CA3AF;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #F3F4F6;
  color: #374151;
}

.modal-tabs {
  display: flex;
  gap: 0;
  padding: 0 24px;
  border-bottom: 1px solid #E5E7EB;
  background: #F9FAFB;
}

.tab-btn {
  padding: 12px 20px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #6B7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.2s;
}

.tab-btn.active {
  color: #005BAC;
  border-bottom-color: #005BAC;
  background: white;
  font-weight: 500;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 16px;
}

.title-dot {
  width: 3px;
  height: 16px;
  background: #005BAC;
  border-radius: 2px;
}

/* 时间维度配置样式 */
.quick-range {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.range-btn {
  padding: 8px 16px;
  border: 1px solid #D1D5DB;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.range-btn:hover {
  border-color: #005BAC;
  color: #005BAC;
}

.range-btn.active {
  background: #002B54;
  color: white;
  border-color: #002B54;
}

.precise-time {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.time-block {
  display: flex;
  align-items: center;
  gap: 12px;
}

.time-block label {
  width: 70px;
  font-size: 14px;
  color: #6B7280;
  flex-shrink: 0;
}

.time-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.time-input {
  width: 60px;
  height: 36px;
  border: 1px solid #D1D5DB;
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
  color: #374151;
  outline: none;
}

.time-input:focus {
  border-color: #005BAC;
}

.time-unit {
  font-size: 14px;
  color: #9CA3AF;
  padding: 0 4px;
}

.time-features {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.feature-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
}

.feature-checkbox input {
  display: none;
}

.feature-checkbox .check-box {
  width: 16px;
  height: 16px;
  border: 2px solid #D1D5DB;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.feature-checkbox input:checked + .check-box {
  background: #005BAC;
  border-color: #005BAC;
}

.feature-checkbox input:checked + .check-box::after {
  content: '';
  width: 5px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 2px;
}

.feature-select {
  margin-left: 8px;
  padding: 4px 8px;
  border: 1px solid #D1D5DB;
  border-radius: 4px;
  font-size: 13px;
  color: #374151;
  background: white;
  outline: none;
}

/* 建筑属性样式（已有） */
.form-row {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.form-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-item label {
  width: 80px;
  font-size: 14px;
  color: #374151;
  flex-shrink: 0;
}

.input-box {
  flex: 1;
  height: 36px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 14px;
  color: #374151;
  outline: none;
  transition: border-color 0.2s;
}

.input-box:focus {
  border-color: #005BAC;
}

.input-box::placeholder {
  color: #9CA3AF;
}

.input-with-unit {
  flex: 1;
  display: flex;
  align-items: center;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  overflow: hidden;
}

.input-with-unit .input-box {
  border: none;
  border-radius: 0;
}

.input-with-unit .unit {
  padding: 0 12px;
  font-size: 14px;
  color: #6B7280;
  background: #F3F4F6;
  height: 36px;
  display: flex;
  align-items: center;
}

.checkbox-row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.checkbox-row > label {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.checkbox-group {
  display: flex;
  gap: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
}

.checkbox-label input {
  display: none;
}

.checkbox-label .check-box {
  width: 16px;
  height: 16px;
  border: 2px solid #D1D5DB;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.checkbox-label input:checked + .check-box {
  background: #005BAC;
  border-color: #005BAC;
}

.checkbox-label input:checked + .check-box::after {
  content: '';
  width: 5px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 2px;
}

/* 能耗指标样式 */
.energy-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.energy-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.energy-item.single {
  max-width: 300px;
}

.energy-item label {
  font-size: 13px;
  color: #6B7280;
  font-weight: 500;
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-inputs input {
  flex: 1;
  height: 36px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 14px;
  color: #374151;
  outline: none;
  text-align: center;
}

.range-inputs input::placeholder {
  color: #9CA3AF;
}

.range-inputs input:focus {
  border-color: #005BAC;
}

.separator {
  color: #9CA3AF;
  font-size: 14px;
}

/* 双碳指标样式 */
.carbon-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.carbon-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.carbon-item label {
  font-size: 13px;
  color: #6B7280;
  font-weight: 500;
}

.compare-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.compare-select {
  width: 50px;
  height: 36px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  text-align: center;
  outline: none;
  background: white;
}

.compare-input input {
  flex: 1;
  height: 36px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 14px;
  color: #374151;
  outline: none;
}

.compare-input input::placeholder {
  color: #9CA3AF;
}

.compare-input .unit {
  font-size: 13px;
  color: #6B7280;
  white-space: nowrap;
}

/* 底部样式 */
.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
  background: #F9FAFB;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-text {
  font-size: 14px;
  color: #6B7280;
}

.footer-buttons {
  display: flex;
  gap: 12px;
}

.btn {
  height: 36px;
  padding: 0 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  border: none;
  transition: all 0.2s;
}

.btn-default {
  background: white;
  color: #374151;
  border: 1px solid #D1D5DB;
}

.btn-default:hover {
  background: #F3F4F6;
}

.btn-primary {
  background: #005BAC;
  color: white;
}

.btn-primary:hover {
  background: #004a8d;
}
</style>
