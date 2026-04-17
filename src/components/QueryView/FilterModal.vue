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
        <!-- ========== 建筑属性筛选 Tab ========== -->
        <div v-show="activeTab === 'property'" class="tab-content">
          <div class="section">
            <div class="section-title">
              <span class="title-dot"></span>
              <span>标识定位</span>
            </div>
            <div class="form-row">
              <div class="form-item">
                <label>建筑ID：</label>
                <input type="text" placeholder="请输入建筑ID，如 BLDG-001" class="input-box" v-model="form.buildingId" />
              </div>
              <div class="form-item">
                <label>站点：</label>
                <input type="text" placeholder="请输入站点名称或编号" class="input-box" v-model="form.site" />
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">
              <span class="title-dot"></span>
              <span>物理属性</span>
            </div>
            <div class="form-row">
              <div class="form-item">
                <label>建筑类型：</label>
                <input type="text" placeholder="如：办公楼、商场、医院" class="input-box" v-model="form.buildingType" />
              </div>
              <div class="form-item">
                <label>细分用途：</label>
                <input type="text" placeholder="如：总部大楼、分店、仓库" class="input-box" v-model="form.subUsage" />
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
            <div class="form-row">
              <div class="form-item">
                <label>LEED等级：</label>
                <input type="text" placeholder="如：PLATINUM、GOLD、SILVER" class="input-box" v-model="form.leedLevel" />
              </div>
              <div class="form-item">
                <label>EnergyStar：</label>
                <input type="text" placeholder="请输入EnergyStar评分" class="input-box" v-model="form.energyStar" />
              </div>
            </div>
            <div class="form-row">
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
            <div class="health-grid">
              <div class="energy-item">
                <label>COP范围</label>
                <div class="range-inputs">
                  <input type="text" placeholder="最小" v-model="form.copRange.min" />
                  <span class="separator">—</span>
                  <input type="text" placeholder="最大" v-model="form.copRange.max" />
                </div>
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
                  <select class="compare-select" v-model="form.carbonTotal.compare">
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="=">=</option>
                  </select>
                  <input type="text" placeholder="请输入" v-model="form.carbonTotal.value" />
                  <span class="unit">kgCO₂/m²</span>
                </div>
              </div>
              <div class="carbon-item">
                <label>单位面积碳排放量</label>
                <div class="compare-input">
                  <select class="compare-select" v-model="form.carbonPerArea.compare">
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="=">=</option>
                  </select>
                  <input type="text" placeholder="请输入" v-model="form.carbonPerArea.value" />
                  <span class="unit">kgCO₂/m²</span>
                </div>
              </div>
              <div class="carbon-item">
                <label>人均碳排放量</label>
                <div class="compare-input">
                  <select class="compare-select" v-model="form.carbonPerCapita.compare">
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="=">=</option>
                  </select>
                  <input type="text" placeholder="请输入" v-model="form.carbonPerCapita.value" />
                  <span class="unit">kgCO₂/m²</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部 -->
      <div class="modal-footer">
        <span class="status-text">已配置筛选条件</span>
        <div class="footer-buttons">
          <button class="btn btn-default" @click="handleClose">取消</button>
          <button class="btn btn-primary" @click="handleSave">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            立即查询
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

// 默认显示能耗指标筛选
const activeTab = ref('energy')

const tabs = [
  { key: 'property', label: '建筑属性筛选' },
  { key: 'energy', label: '能耗指标筛选' }
]

const form = reactive({
  // 建筑属性
  buildingId: '',
  site: '',
  buildingType: '',
  subUsage: '',
  builtYear: '',
  area: '',
  floors: '',
  occupancy: '',
  leedLevel: '',
  energyStar: '',
  euiMin: '',
  
  // 能耗指标
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
  
  // 双碳指标
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
/* ===== 弹窗基础样式 ===== */
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
  max-width: 1000px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

/* ===== 头部样式 ===== */
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

/* ===== Tab 切换（修复双下划线） ===== */
.modal-tabs {
  display: flex;
  gap: 0;
  padding: 0 24px;
  background: #F9FAFB;
  position: relative;
}

/* 使用伪元素实现底部边框，避免与 tab 按钮边框重叠 */
.modal-tabs::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: #E5E7EB;
  z-index: 0;
}

.tab-btn {
  padding: 12px 20px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #6B7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  position: relative;
  z-index: 1;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #374151;
  background: rgba(255, 255, 255, 0.5);
}

.tab-btn.active {
  color: #005BAC;
  border-bottom-color: #005BAC;
  background: white;
  font-weight: 500;
}

/* ===== 内容区域 ===== */
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

.section:last-child {
  margin-bottom: 0;
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

/* ===== 建筑属性样式 ===== */
.form-row {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.form-item label {
  width: 80px;
  font-size: 14px;
  color: #374151;
  flex-shrink: 0;
  white-space: nowrap;
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
  min-width: 0;
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
  min-width: 0;
}

.input-with-unit .input-box {
  border: none;
  border-radius: 0;
  flex: 1;
}

.input-with-unit .unit {
  padding: 0 12px;
  font-size: 14px;
  color: #6B7280;
  background: #F3F4F6;
  height: 36px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* ===== 能耗指标样式（3列网格） ===== */
.energy-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.energy-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.energy-item label {
  font-size: 13px;
  color: #4B5563;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  padding: 0 8px;
  font-size: 14px;
  color: #374151;
  outline: none;
  text-align: center;
  transition: border-color 0.2s;
  min-width: 0;
}

.range-inputs input:focus {
  border-color: #005BAC;
}

.range-inputs input::placeholder {
  color: #9CA3AF;
  font-size: 13px;
}

.separator {
  color: #9CA3AF;
  font-size: 12px;
  flex-shrink: 0;
}

/* ===== 设备健康度样式（单列布局） ===== */
.health-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;  /* 只占1/3宽度，避免太宽 */
  gap: 20px;
}

@media (max-width: 768px) {
  .health-grid {
    grid-template-columns: 1fr;
  }
}

/* ===== 双碳指标样式 ===== */
.carbon-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.carbon-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.carbon-item label {
  font-size: 13px;
  color: #4B5563;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  cursor: pointer;
  flex-shrink: 0;
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
  transition: border-color 0.2s;
  min-width: 0;
}

.compare-input input:focus {
  border-color: #005BAC;
}

.compare-input input::placeholder {
  color: #9CA3AF;
}

.compare-input .unit {
  font-size: 12px;
  color: #6B7280;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ===== 底部样式 ===== */
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

/* ===== 响应式调整 ===== */
@media (max-width: 768px) {
  .energy-grid,
  .carbon-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .form-row {
    flex-direction: column;
    gap: 12px;
  }
  
  .health-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .energy-grid,
  .carbon-grid {
    grid-template-columns: 1fr;
  }
  
  .form-item label {
    width: 70px;
    font-size: 13px;
  }
  
  .input-box,
  .compare-input input {
    font-size: 13px;
  }
}
</style>
