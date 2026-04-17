<template>
  <Teleport to="body">
    <Transition name="slide">
      <div v-if="visible" class="mask" @click.self="close">
        <aside class="panel">
          <header class="head">
            <div>
              <h2>AI 闂佸搫顦弲婊堝礉濡も偓鑿愭い鏇楀亾妤犵偞鍔欏畷鎯邦檨闁?/h2>
              <span>{{ buildingId }}</span>
            </div>
            <div class="head-actions">
              <button class="icon-btn" :class="{ active: reportOpen }" @click="reportOpen = !reportOpen"><Icon icon="lucide:file-output" /></button>
              <button class="icon-btn" :disabled="opsLoading" @click="startAnalysis"><Icon icon="lucide:refresh-cw" :class="{ spin: opsLoading }" /></button>
              <button class="icon-btn danger" @click="close"><Icon icon="lucide:x" /></button>
            </div>
          </header>

          <div class="body">
            <section class="card">
              <div class="section-top">
                <div>
                  <h3>闂備胶顢婄紙浼村磿閹绢喖违闁告劦浜栭崑鎾绘偨闂堟稑浠橀梺?/h3>
                  <p>闂備礁鎲＄敮妤冪矙閹寸姷纾介柟鎹愵嚙缁秹鏌￠崼銏℃毄闁活厼鐭傚娲敃閿濆嫪瀛╃紓?`include_ai_summary` 闂備礁鎼粔鏉懨洪埡鍜佹晩闁搞儺鍓欓崣濠冦亜閺嶃劎顣查柛搴★躬濮婂宕堕敐鍛闂?AI 闁诲海鍋ｉ崐婵堢磽濮橀鏁婇柛娑樼摠閺咁剟鎮橀悙鑸殿棄闁搞倖甯￠弻锟犲醇濠垫劖效婵犳鍠撻崐妤呭箖娴兼潙惟闁靛鍎抽埀顒€顭烽弻锛勨偓锝庡亜婵矂鏌?`/ai/report-summary`闂?/p>
                </div>
                <button class="icon-btn" @click="reportOpen = !reportOpen"><Icon :icon="reportOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'" /></button>
              </div>

              <div v-if="reportOpen" class="stack">
                <div class="grid">
                  <label><span>闂備胶顢婄紙浼村磿閹绢喖违闁告劦浜炵亸鐢告偣閸ヮ亜鐨洪柍?/span><select v-model="form.report_type"><option v-for="item in reportTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
                  <label><span>闁诲海鍋ｉ崐娑樷枍閿濆鍋?ID</span><input :value="buildingId" disabled /></label>
                  <label><span>闁诲孩顔栭崰鎺楀磻閹炬枼鏀芥い鏃傗拡閸庢劖淇婇悙鎻掆偓鍨潖?/span><input v-model="form.start" type="datetime-local" /></label>
                  <label><span>缂傚倸鍊烽悞锕傚箰鐠囧樊鐒芥い鎰剁畱缁秹鏌涢锝嗙闁?/span><input v-model="form.end" type="datetime-local" /></label>
                </div>

                <label class="toggle-row">
                  <div class="ai-toggle-info">
                    <Icon icon="lucide:sparkles" class="ai-toggle-icon" />
                    <div>
                      <strong>闂備礁鎲￠悧鏇㈠箠鎼淬劌绠?AI 闂備礁鎲＄敮鎺懳涘▎鎾村€靛ù鐘差儏缁犵儤淇婇娑卞劌婵?/strong>
                      <small>闂備線娼荤拹鐔煎礉瀹ュ棙鍙忛柕鍫濇处閸嬫﹢鏌曟繛鍨偓娑㈠储椤掑嫭鐓犲┑鍌氼槷缁ㄨ鈹戦瑙勬珚闁诡喕绮欓幃銏㈢矙鐠恒劋娴?AI 闂備浇妗ㄩ懗鑸垫櫠濡も偓閻ｅ灚鎷呯拠銉︽そ閹瑩鎳犻渚団偓澶嬬箾閹寸偞灏Δ鐘叉憸缁辨捇骞橀懜闈涱€涘銈嗘礀濡稓绮堟径濞掑綊鎳栭埡浣囥垻鈧鍣崜娑㈠焵椤掍胶鈯曟い銊ユ椤㈡瑥鐣濋崟顒佹珫濠殿喗绻冮顣攃lude_ai_summary`</small>
                    </div>
                  </div>
                  <label class="toggle-switch">
                    <input v-model="form.includeAI" type="checkbox" />
                    <span class="toggle-slider"></span>
                  </label>
                </label>

                <div v-if="reportError" class="msg err"><Icon icon="lucide:alert-circle" />{{ reportError }}</div>
                <div v-if="reportSuccess" class="msg ok"><Icon icon="lucide:check-circle-2" />{{ reportSuccess }}</div>

                <div v-if="reportDetail" class="result stack-sm">
                  <div class="kv"><span>濠电偛顕慨楣冾敋瑜庨幈銊╂偄閸忕厧浜归梺鐓庢憸椤ｄ粙宕?/span><strong>{{ reportDetail.status }}</strong></div>
                  <div class="kv"><span>闂備胶顢婄紙浼村磿閹绢喖违?ID</span><strong>{{ reportDetail.report_id }}</strong></div>
                  <div class="actions">
                    <button class="primary" :disabled="reportDetail.status !== 'ready'" @click="downloadReportFile"><Icon icon="lucide:download" />濠电偞鍨堕幐鎼侇敄閸緷?Markdown</button>
                    <button class="secondary" :disabled="summarizing || !reportDetail.report_id" @click="analyzeReport"><Icon :icon="summarizing ? 'lucide:loader-2' : 'lucide:sparkles'" :class="{ spin: summarizing }" />{{ summarizing ? '闂備礁鎲＄敮鎺懳涘▎鎾村€甸柤鎭掑劤閳?..' : 'AI 闂備礁鎲＄敮鎺懳涘▎鎾村€甸柦妯侯樈閸熷懘鏌涘▎蹇ｆЧ缂佺姵甯￠弻鐔肩叕閹绘帒濮ら梺? }}</button>
                  </div>
                </div>

                <div v-if="reportSummary" class="summary-box">
                  <div class="title"><Icon icon="lucide:sparkles" />AI 闂備礁鎲＄敮鎺懳涘▎鎾村€靛ù鐘差儏缁犵儤淇婇娑卞劌婵?/div>
                  <p>{{ reportSummary }}</p>
                </div>

                <div class="actions">
                  <button class="secondary" :disabled="generating" @click="resetReportForm">闂傚倷鐒﹁ぐ鍐矓閸洘鍋柛鈩冪☉閻鏌涚仦鍓р姇婵?/button>
                  <button class="primary" :disabled="generating" @click="generate"><Icon :icon="generating ? 'lucide:loader-2' : 'lucide:file-output'" :class="{ spin: generating }" />{{ generating ? '闂備焦鐪归崹濠氬窗閹版澘鍨傛慨姗嗗幘閳?..' : '闂備焦鐪归崹濠氬窗閹版澘鍨傛慨妯哄瀹撲線鎮规潪鎷岊劅闁搞們鍊濋弻娑㈠箣閻樻彃濡烘繝娈垮枔閸婃骞? }}</button>
                </div>
              </div>
            </section>

            <div v-if="opsLoading" class="card center">
              <Icon icon="lucide:loader-2" class="spin big" />
              <p>{{ opsProgressMsg || 'AI 婵犳鍠楃换鎰緤閽樺鑰挎い蹇撶墕缁€鍡涙煕閳╁喚鐒介柍褜鍓濇慨銈咁焽婵犳艾绠涙い鏃囧Г閳绘洟姊烘潪鎷屽厡濠⒀勵殔閻ｅ灚绗熼埀顒勫极瀹ュ懐鏆嗛柛鎰劤濞堣尙绱撴担鍓插剰缂佸鎸抽崺鈧?..' }}</p>
              <button class="secondary" @click="cancelOpsGuide">闂備礁鎲￠悷锕傛偋濡ゅ啰鐭撻柣鎴ｆ缁€鍡涙煕閳╁喚鐒介柍?/button>
            </div>

            <div v-else-if="opsError" class="card err-block">
              <Icon icon="lucide:alert-circle" />
              <span>{{ opsError }}</span>
              <button class="secondary" @click="startAnalysis">闂傚倷鐒﹁ぐ鍐矓閻戣姤鍎?/button>
            </div>

            <div v-else-if="opsResult" class="stack">
              <section class="card"><p class="lead">{{ opsResult.summary }}</p></section>
              <section v-if="opsResult.preconditions?.length" class="card"><h4>闂備礁鎲￠幐鍝ョ矓閸洘鍋柛鈩冪☉缁狙囨煃閵夈儱绾фい?/h4><ul><li v-for="(item, index) in opsResult.preconditions" :key="index">{{ item }}</li></ul></section>
              <section v-if="opsResult.steps?.length" class="card"><h4>闂佸搫顦弲婊堝礉濡も偓鑿愭い鏃傗拡濞间即鏌曟径鍡樻珦闁?/h4><div class="stack-sm"><div v-for="(step, index) in opsResult.steps" :key="step.step_id" class="step"><div class="step-head"><span class="badge">{{ index + 1 }}</span><strong>{{ step.title }}</strong><em>{{ step.priority }}</em></div><p>{{ step.instruction }}</p><small>濠碘槅鍋呭妯尖偓姘煎幖閿曘垽鏁嶉崟顓狅紲闂佽鍎抽顓熺椤栫偞鐓ユ繛鎴炵懐閸旂槀 step.expected_result }}</small><small>闂備礁鎼悧婊勭閿濆绠垫い蹇撶墕閸愨偓闂佹悶鍎滅仦鎷樼喖姊洪懡銈呬粶婵☆偄顕Σ鎰版儍濮?step.if_not_met }}</small></div></div></section>
              <section v-if="opsResult.risk_notice?.length" class="card"><h4>濠碉紕鍋涢鍛存煀閿濆應鏋嶉柟鎹愵嚙缁犵敻鏌熼柇锕€鏋斿ù?/h4><ul class="risk"><li v-for="(item, index) in opsResult.risk_notice" :key="index">{{ item }}</li></ul></section>
              <section v-if="opsResult.actions?.length" class="card"><h4>闁诲海鍋ｉ崐婵堢磽濮橀鏁婇柛娑欐綑缁犺偐鈧箍鍎辩€氼喚绮?/h4><div class="actions"><button v-for="(action, index) in opsResult.actions" :key="index" class="primary small"><Icon icon="lucide:arrow-right" />{{ action.label }}</button></div></section>
              <section v-if="opsResult.evidence?.length" class="card"><h4>闂備胶鍎甸弲婵嬧€﹂崼銉ョ煑鐟滃海绮悢灏佹斀闁搞儜鍛亰</h4><div class="stack-sm"><div v-for="(item, index) in opsResult.evidence" :key="index" class="evidence"><div><strong>{{ item.source }}</strong><em>{{ item.source_type }}</em></div><p>{{ item.snippet }}</p></div></div></section>
              <section v-if="opsResult.applicability" class="card"><h4>闂傚倷绶￠崑鍕磹婵犳艾鏋侀柕鍫濐槹閸ゆ垿鏌涢幇鈺佸缂?/h4><div class="stack-sm"><div v-if="opsResult.applicability.applies_to?.length" class="tags"><strong>闂傚倷绶￠崑鍕磹婵犳艾鏋?/strong><span v-for="(item, index) in opsResult.applicability.applies_to" :key="index">{{ item }}</span></div><div v-if="opsResult.applicability.not_applies_to?.length" class="tags"><strong>濠电偞鍨堕幐鍝ョ矓瑜版帒鐒垫い鎺嗗亾闁稿﹤顭峰?/strong><span class="bad" v-for="(item, index) in opsResult.applicability.not_applies_to" :key="index">{{ item }}</span></div></div></section>
              <section class="meta"><span><Icon icon="lucide:cpu" />{{ opsResult.meta?.model || '-' }}</span><span><Icon icon="lucide:clock" />{{ formatGeneratedAt(opsResult.meta?.generated_at) }}</span><span v-if="opsResult.meta?.knowledge_hits != null"><Icon icon="lucide:book-open" />闂備焦妞块崢褰掑磿閹绢喗鍎婇柟杈剧畱瀹告繈鏌熺€涙ê绗╅柛?{{ opsResult.meta.knowledge_hits }}</span><span v-if="opsResult.meta?.history_feedback_hits != null"><Icon icon="lucide:history" />闂備礁鎲￠敋婵☆偅顨夐妵鎰板醇閺囩偟鐓戦悗骞垮劚椤﹁棄煤?{{ opsResult.meta.history_feedback_hits }}</span></section>
            </div>

            <div v-else class="card center">
              <Icon icon="lucide:brain-circuit" class="big" />
              <h3>AI 闂佸搫顦弲婊堝礉濡も偓鑿愭い鏇楀亾鐎规洘宀稿畷鍗炍熺亸鏍т壕?/h3>
              <p>闂備胶绮崝妤呭箠閹捐鍚规い鏇楀亾妤犵偞鍔栧鍕箛椤撶偛鏀梻浣告啞閼归箖宕欓悾灞绢潟婵犲﹦娲?濠电偞娼欓崥瀣嚌妤ｅ啯鍋勯柍褜鍓欓湁婵犲﹤鍟撮妤冪磽瀹ュ拋鍎旂€规洘绮岄濂稿川椤栨粌顦╃紓鍌欑劍缁嬫帡宕归崼鏇炴辈闁绘梻鍘х粻鍙夈亜閺冨倸浜鹃柡鍛倐閺岀喓鈧稒锚婵瞼绱掔拠鑼ょ紒杈ㄥ笧閳ь剚绋掗敋闁伙箑缍婇幃妤呮濞戞ɑ鍊梺鍝勭灱閸犲酣銆呮總绋块唶婵炴垶甯掓禍?/p>
              <button class="primary" @click="startAnalysis"><Icon icon="lucide:sparkles" />闁诲孩顔栭崰鎺楀磻閹炬枼鏀芥い鏃傗拡閸庡繘鏌涢妸銉╁弰鐎?/button>
            </div>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { connectOpsGuideStream, type OpsGuideResponse, type OpsGuideSSEEvent } from '../../api/anomaly'
import { generateReport, getReportDetail, summarizeReport, type GenerateReportRequest, type ReportDetailResponse } from '../../api/statistics'

type ReportType = GenerateReportRequest['report_type']
const reportTypeOptions: { value: ReportType; label: string }[] = [
  { value: 'daily_summary', label: '日报' },
  { value: 'weekly_summary', label: '周报' },
  { value: 'monthly_summary', label: '月报' },
  { value: 'anomaly_report', label: '异常分析报告' }
]

const props = defineProps<{ visible: boolean; buildingId: string; selectedDay: string }>()
const emit = defineEmits<{ (e: 'update:visible', val: boolean): void }>()

const opsLoading = ref(false)
const opsError = ref('')
const opsResult = ref<OpsGuideResponse | null>(null)
const opsProgressMsg = ref('')
const opsAbortController = ref<AbortController | null>(null)

const reportOpen = ref(true)
const generating = ref(false)
const summarizing = ref(false)
const reportError = ref('')
const reportSuccess = ref('')
const reportSummary = ref('')
const reportDetail = ref<ReportDetailResponse | null>(null)
const form = ref({ report_type: 'daily_summary' as ReportType, start: '', end: '', includeAI: true })

const unwrap = <T>(payload: T | { data?: T }) => ((payload as { data?: T })?.data ?? payload) as T
const close = () => emit('update:visible', false)
const formatDateTimeLocal = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}T${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
const normalizeToISOString = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toISOString() }
const formatGeneratedAt = (value?: string) => { if (!value) return '-'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN') }

const resetReportForm = () => {
  const end = props.selectedDay ? new Date(`${props.selectedDay}T23:59`) : new Date()
  const start = props.selectedDay ? new Date(`${props.selectedDay}T00:00`) : new Date(end)
  if (!props.selectedDay) start.setHours(0, 0, 0, 0)
  form.value = { report_type: 'daily_summary', start: formatDateTimeLocal(start), end: formatDateTimeLocal(end), includeAI: true }
  reportError.value = ''
  reportSuccess.value = ''
  reportSummary.value = ''
  reportDetail.value = null
}

const handleOpsSSEEvent = (event: OpsGuideSSEEvent) => {
  const { event: type, data } = event
  switch (type) {
    case 'status':
    case 'progress':
      opsProgressMsg.value = data?.message || data?.status || JSON.stringify(data)
      break
    case 'summary':
      if (!opsResult.value) {
        opsResult.value = { incident_id: '', status: 'streaming', summary: data?.summary || data || '', steps: [], meta: { generated_at: new Date().toISOString(), model: '' } }
      } else {
        opsResult.value.summary = data?.summary || data || ''
      }
      break
    case 'preconditions':
      if (opsResult.value) opsResult.value.preconditions = Array.isArray(data) ? data : data?.preconditions || []
      break
    case 'step':
      if (opsResult.value) {
        const step = data?.step || data
        if (step) {
          const index = opsResult.value.steps.findIndex(item => item.step_id === step.step_id)
          if (index >= 0) opsResult.value.steps[index] = step
          else opsResult.value.steps.push(step)
        }
      }
      break
    case 'evidence':
      if (opsResult.value) opsResult.value.evidence = Array.isArray(data) ? data : data?.evidence || []
      break
    case 'actions':
      if (opsResult.value) opsResult.value.actions = Array.isArray(data) ? data : data?.actions || []
      break
    case 'risk_notice':
      if (opsResult.value) opsResult.value.risk_notice = Array.isArray(data) ? data : data?.risk_notice || []
      break
    case 'applicability':
      if (opsResult.value) opsResult.value.applicability = data?.applicability || data
      break
    case 'diagnosis_snapshot':
      if (opsResult.value) opsResult.value.diagnosis_snapshot = data?.diagnosis_snapshot || data
      break
    case 'meta':
      if (opsResult.value) opsResult.value.meta = data?.meta || data
      break
    case 'complete':
    case 'done':
      opsLoading.value = false
      if (data && typeof data === 'object' && data.steps) opsResult.value = data
      opsProgressMsg.value = ''
      break
    case 'error':
      opsLoading.value = false
      opsError.value = data?.message || data?.detail || 'AI 运维分析出错'
      opsProgressMsg.value = ''
      break
    default:
      if (data && typeof data === 'object' && data.steps) {
        opsResult.value = data
        opsLoading.value = false
        opsProgressMsg.value = ''
      }
  }
}

const startAnalysis = () => {
  if (!props.buildingId) return
  opsLoading.value = true
  opsError.value = ''
  opsResult.value = null
  opsProgressMsg.value = '正在连接 AI 服务...'
  const controller = connectOpsGuideStream({
    question: `建筑 ${props.buildingId} 的运维分析`,
    guide_mode: 'standard_sop',
    context: {
      building_id: props.buildingId,
      meter: 'electricity',
      time_range: {
        start: props.selectedDay ? `${props.selectedDay}T00:00:00Z` : new Date(Date.now() - 7 * 86400000).toISOString(),
        end: props.selectedDay ? `${props.selectedDay}T23:59:59Z` : new Date().toISOString()
      },
      page_context: { source: 'building_details_modal', page_type: 'statistics' }
    },
    include_knowledge: true,
    include_history: true,
    include_actions: true
  }, handleOpsSSEEvent, (error: Error) => {
    opsLoading.value = false
    opsAbortController.value = null
    opsError.value = error.message || 'AI 运维分析请求失败'
  }, (fullResult: OpsGuideResponse | null) => {
    opsLoading.value = false
    opsAbortController.value = null
    if (fullResult) opsResult.value = fullResult
  })
  opsAbortController.value = controller
}

const generate = async () => {
  const start = normalizeToISOString(form.value.start)
  const end = normalizeToISOString(form.value.end)
  if (!start || !end) { reportError.value = '请完整填写时间范围'; return }
  if (new Date(start).getTime() >= new Date(end).getTime()) { reportError.value = '结束时间必须晚于开始时间'; return }
  generating.value = true
  reportError.value = ''
  reportSuccess.value = ''
  reportSummary.value = ''
  reportDetail.value = null
  try {
    const created = unwrap(await generateReport({ report_type: form.value.report_type, building_id: props.buildingId || undefined, time_range: { start, end }, include_ai_summary: form.value.includeAI }))
    if (!created?.report_id) throw new Error('创建报表任务失败，未返回 report_id')
    let detail: ReportDetailResponse | null = null
    for (let i = 0; i < 12; i += 1) {
      detail = unwrap(await getReportDetail(created.report_id))
      if (detail?.status === 'ready' || detail?.status === 'failed') break
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
    if (!detail) throw new Error('未获取到报表详情')
    reportDetail.value = detail
    reportSummary.value = detail.ai_summary || ''
    reportSuccess.value = detail.status === 'ready' ? '报表已生成，可直接下载。' : '报表任务已创建，仍在处理中，请稍后下载。'
    if (detail.status === 'failed') reportError.value = '报表生成失败，请稍后重试'
  } catch (error: any) {
    reportError.value = error?.message || '报表生成请求失败'
  } finally {
    generating.value = false
  }
}

const downloadReportFile = () => {
  const reportId = reportDetail.value?.report_id
  if (reportId) window.open(`/api/reports/${reportId}?download=true&format=md`, '_blank')
}

const analyzeReport = async () => {
  const reportId = reportDetail.value?.report_id
  if (!reportId) return
  summarizing.value = true
  reportError.value = ''
  try {
    const response = unwrap(await summarizeReport({ report_id: reportId }))
    reportSummary.value = response?.summary || response?.ai_summary || 'AI 已完成报表分析，但未返回可展示的摘要。'
    reportSuccess.value = 'AI 报表分析完成。'
  } catch (error: any) {
    reportError.value = error?.message || 'AI 报表分析失败'
  } finally {
    summarizing.value = false
  }
}

const cancelOpsGuide = () => {
  if (opsAbortController.value) {
    opsAbortController.value.abort()
    opsAbortController.value = null
  }
  opsLoading.value = false
  opsProgressMsg.value = ''
}

watch(() => props.selectedDay, resetReportForm, { immediate: true })
watch(() => props.visible, visible => { if (visible) { resetReportForm(); if (!opsResult.value && !opsLoading.value) startAnalysis() } })
onUnmounted(cancelOpsGuide)
</script>

<style scoped>
.mask{position:fixed;inset:0;background:rgba(15,23,42,.35);backdrop-filter:blur(3px);z-index:10000;display:flex;justify-content:flex-end}.panel{width:560px;max-width:92vw;height:100vh;background:#f3f6fb;display:flex;flex-direction:column;box-shadow:-10px 0 40px rgba(15,23,42,.18);font-family:'Plus Jakarta Sans',-apple-system,'PingFang SC',sans-serif}.head{background:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #dbe5f0}.head h2{margin:0;font-size:17px;color:#0f172a}.head span{font-size:12px;color:#64748b}.head-actions,.actions,.stack,.stack-sm{display:flex}.head-actions,.actions{gap:8px;flex-wrap:wrap}.stack,.stack-sm{flex-direction:column}.stack{gap:16px}.stack-sm{gap:10px}.body{flex:1;overflow:auto;padding:20px;display:flex;flex-direction:column;gap:16px}.card,.meta{background:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(15,23,42,.06)}.card{padding:16px}.meta{padding:12px 16px;display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:#94a3b8}.meta span,.title,.kv,.step-head,.tags,.err-block,.center,.msg{display:flex;align-items:center}.icon-btn{width:34px;height:34px;border:none;border-radius:8px;background:transparent;color:#64748b;cursor:pointer}.icon-btn:hover,.icon-btn.active{background:#e8f0fb;color:#0b4582}.icon-btn.danger:hover{background:#fef2f2;color:#dc2626}.icon-btn:disabled{opacity:.5;cursor:not-allowed}.section-top,.kv{justify-content:space-between}.section-top{display:flex;gap:12px}.section-top h3,h4{margin:0;color:#0f172a}.section-top p,.card p,small,ul{color:#475569}.section-top p,.lead,.card p,small{line-height:1.7}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}label{display:flex;flex-direction:column;gap:6px}label span{font-size:12px;font-weight:700;color:#475569}input,select{min-height:42px;border:1px solid #cbd5e1;border-radius:10px;padding:0 12px;font-size:13px;outline:none}input:focus,select:focus{border-color:#0b4582;box-shadow:0 0 0 3px rgba(11,69,130,.08)}input:disabled{background:#f8fafc;color:#64748b}.toggle-row{padding:16px 18px;border:1.5px solid #e8ecf1;border-radius:12px;background:#fff;flex-direction:row;justify-content:space-between;align-items:center}.toggle-row:has(input:checked){border-color:#c7d2fe;background:#fafbff}.ai-toggle-info{display:flex;align-items:center;gap:12px}.ai-toggle-icon{font-size:20px;color:#7c3aed;display:flex}.toggle-row strong{display:block;font-size:13px;color:#0f172a}.toggle-row small{display:block;margin-top:1px;font-size:11.5px;color:#94a3b8;font-weight:500;line-height:1.5}.toggle-switch{position:relative;width:44px;height:24px;flex-shrink:0}.toggle-switch input{opacity:0;width:0;height:0}.toggle-slider{position:absolute;cursor:pointer;inset:0;background:#cbd5e1;border-radius:24px;transition:all .25s ease}.toggle-slider::before{content:'';position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:all .25s ease;box-shadow:0 1px 3px rgba(0,0,0,.15)}.toggle-switch input:checked + .toggle-slider{background:linear-gradient(135deg,#0b4582,#7c3aed)}.toggle-switch input:checked + .toggle-slider::before{transform:translateX(20px)}.msg{gap:8px;padding:12px 14px;border-radius:12px;font-size:12px;font-weight:600}.err{background:#fef2f2;color:#dc2626}.ok{background:#ecfdf5;color:#059669}.result,.summary-box,.step,.evidence{border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#fff}.summary-box{background:linear-gradient(135deg,#eff6ff,#f8fafc);border-color:#dbeafe}.title{gap:6px;font-weight:800;color:#0b4582}.primary,.secondary{min-height:40px;padding:0 16px;border:none;border-radius:10px;cursor:pointer;font:700 13px inherit;display:inline-flex;align-items:center;gap:6px}.primary{background:linear-gradient(135deg,#0b4582,#1565c0);color:#fff}.secondary{background:#eef2f7;color:#334155;border:1px solid #dbe5f0}.small{min-height:34px;padding:0 14px;font-size:12px}.primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 20px rgba(11,69,130,.22)}.secondary:hover:not(:disabled){background:#e2e8f0}.primary:disabled,.secondary:disabled{opacity:.6;cursor:not-allowed}.center{flex-direction:column;justify-content:center;text-align:center;gap:12px}.big{font-size:30px;color:#0b4582}.lead{margin:0;color:#1e3a5f;font-size:14px}.step-head{gap:10px}.badge{width:24px;height:24px;border-radius:999px;background:#0b4582;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800}em{font-style:normal;font-size:11px;padding:3px 8px;border-radius:999px;background:#eff6ff;color:#0b4582}.risk li{color:#dc2626}.evidence div{display:flex;gap:8px;align-items:center}.evidence em{background:#e0e7ff;color:#3730a3}.tags{gap:8px;flex-wrap:wrap}.tags span{padding:4px 8px;border-radius:999px;background:#ecfdf5;color:#059669;font-size:11px;font-weight:700}.tags span.bad{background:#fef2f2;color:#dc2626}.err-block{gap:8px;color:#dc2626}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.slide-enter-active,.slide-leave-active{transition:opacity .24s ease}.slide-enter-active .panel,.slide-leave-active .panel{transition:transform .28s ease}.slide-enter-from,.slide-leave-to{opacity:0}.slide-enter-from .panel,.slide-leave-to .panel{transform:translateX(100%)}@media (max-width:640px){.panel{width:100vw;max-width:100vw}.body{padding:14px}.grid{grid-template-columns:1fr}}
</style>
