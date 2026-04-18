<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <div class="header-title">
          <div class="icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#005BAC" stroke-width="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
          </div>
          <div>
            <h3>高级筛选与自定义时间</h3>
            <p class="subtitle">可以在这里按照建筑类型与能耗筛选</p>
          </div>
        </div>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <div class="modal-tabs">
        <button
          v-for="tab in tabs" :key="tab.key"
          @click="activeTab = tab.key"
          :class="['tab-btn', { active: activeTab === tab.key }]"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="modal-body">
        <!-- 时间维度 -->
        <div v-show="activeTab === 'time'" class="tab-content">
          <div class="section">
            <div class="section-title"><span class="title-dot"></span>查询时段</div>
            <div class="form-row">
              <div class="form-item">
                <label>开始时间</label>
                <input type="datetime-local" class="input-box" v-model="form.startTime" />
              </div>
              <div class="form-item">
                <label>结束时间</label>
                <input type="datetime-local" class="input-box" v-model="form.endTime" />
              </div>
            </div>
          </div>
        </div>

        <!-- 建筑过滤 -->
        <div v-show="activeTab === 'property'" class="tab-content">
          <div class="section">
            <div class="section-title"><span class="title-dot"></span>基础属性</div>
            <div class="form-row">
              <div class="form-item">
                <label>关键词 (ID/名称)</label>
                <input type="text" placeholder="模糊搜索" class="input-box" v-model="form.keyword" />
              </div>
              <div class="form-item">
                <label>所属站点 ID</label>
                <input type="text" placeholder="Site ID" class="input-box" v-model="form.site_id" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-item">
                <label>主用途</label>
                <select class="input-box" v-model="form.primaryspaceusage">
                  <option value="">全部用途</option>
                  <option value="Office">办公楼</option>
                  <option value="Retail">商业零售</option>
                  <option value="Education">教育</option>
                  <option value="Healthcare">医疗</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- 能耗指标 (实装版) -->
        <div v-show="activeTab === 'energy'" class="tab-content">
          <div class="section">
            <div class="section-title"><span class="title-dot"></span>动态指标筛选 (基于选定时段)</div>
            <div class="energy-grid">
              <div class="form-item">
                <label>总能耗范围 (KWH)</label>
                <div class="range-wrap">
                  <input type="number" placeholder="最小" v-model="form.min_energy" />
                  <span>-</span>
                  <input type="number" placeholder="最大" v-model="form.max_energy" />
                </div>
              </div>
              <div class="form-item">
                <label>EUI 强度 (KWH/㎡)</label>
                <div class="range-wrap">
                  <input type="number" placeholder="最小" v-model="form.min_eui" />
                  <span>-</span>
                  <input type="number" placeholder="最大" v-model="form.max_eui" />
                </div>
              </div>
              <div class="form-item">
                <label>碳排放 (kgCO2e)</label>
                <div class="range-wrap">
                  <input type="number" placeholder="最小" v-model="form.min_carbon" />
                  <span>-</span>
                  <input type="number" placeholder="最大" v-model="form.max_carbon" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="footer-buttons">
          <button class="btn btn-default" @click="handleClose">取消</button>
          <button class="btn btn-primary" @click="handleSave">应用筛选并查询</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { getCurrentTimeString } from '../../utils/timeManager'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits(['update:visible', 'save'])

const activeTab = ref('time')
const tabs = [
  { key: 'time', label: '时间维度' },
  { key: 'property', label: '基础属性' },
  { key: 'energy', label: '能耗指标' }
]

const form = reactive({
  startTime: '',
  endTime: '',
  keyword: '',
  site_id: '',
  primaryspaceusage: '',
  min_energy: null as number | null,
  max_energy: null as number | null,
  min_eui: null as number | null,
  max_eui: null as number | null,
  min_carbon: null as number | null,
  max_carbon: null as number | null
})

onMounted(() => {
  const now = new Date(getCurrentTimeString())
  const lastWeek = new Date(now.getTime() - 7 * 86400000)
  const format = (d: Date) => d.toISOString().slice(0, 16)
  form.endTime = format(now)
  form.startTime = format(lastWeek)
})

const handleClose = () => emit('update:visible', false)

const handleSave = () => {
  emit('save', {
    ...form,
    startTime: form.startTime ? new Date(form.startTime).toISOString() : '',
    endTime: form.endTime ? new Date(form.endTime).toISOString() : ''
  })
  handleClose()
}
</script>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.modal-content { background: white; border-radius: 16px; width: 720px; box-shadow: 0 25px 50px rgba(0,0,0,0.2); }
.modal-header { padding: 20px 24px; border-bottom: 1px solid #F3F4F6; display: flex; justify-content: space-between; }
.icon-box { width: 36px; height: 36px; background: #F0F7FF; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.modal-tabs { display: flex; padding: 0 24px; background: #F9FAFB; border-bottom: 1px solid #F3F4F6; }
.tab-btn { padding: 14px 20px; border: none; background: transparent; cursor: pointer; border-bottom: 2px solid transparent; }
.tab-btn.active { color: #005BAC; border-bottom-color: #005BAC; font-weight: 600; }
.modal-body { padding: 24px; }
.section-title { display: flex; align-items: center; gap: 8px; font-weight: 700; margin-bottom: 20px; }
.title-dot { width: 4px; height: 14px; background: #005BAC; }
.form-row { display: flex; gap: 20px; margin-bottom: 16px; }
.form-item { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.form-item label { font-size: 12px; font-weight: 600; color: #666; }
.input-box { height: 38px; border: 1px solid #D1D5DB; border-radius: 8px; padding: 0 10px; }
.range-wrap { display: flex; align-items: center; gap: 8px; }
.range-wrap input { flex: 1; height: 38px; border: 1px solid #D1D5DB; border-radius: 8px; padding: 0 10px; text-align: center; }
.energy-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
.modal-footer { padding: 18px 24px; border-top: 1px solid #F3F4F6; display: flex; justify-content: flex-end; }
.footer-buttons { display: flex; align-items: center; gap: 14px; }
.btn { height: 40px; padding: 0 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; }
.btn-default { background: #F8FAFC; color: #475569; border: 1px solid #D8E0EA; }
.btn-primary { background: #002B54; color: white; }
.close-btn { border: none; background: transparent; font-size: 20px; cursor: pointer; }
</style>
