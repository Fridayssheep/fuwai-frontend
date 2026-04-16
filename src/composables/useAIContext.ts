import {
  computed,
  onUnmounted,
  readonly,
  reactive,
  ref,
  toValue,
  watchEffect,
  type MaybeRefOrGetter
} from 'vue'

import type { AIQAContext } from '../api/ai'

const contextRegistry = reactive<Record<string, AIQAContext>>({})
const contextOrder = ref<string[]>([])

const normalizeContext = (value: AIQAContext | null | undefined): AIQAContext | null => {
  if (!value) return null

  const next: AIQAContext = {}

  if (value.building_id) next.building_id = value.building_id
  if (value.meter) next.meter = value.meter
  if (value.time_range?.start && value.time_range?.end) {
    next.time_range = {
      start: value.time_range.start,
      end: value.time_range.end
    }
  }

  return Object.keys(next).length > 0 ? next : null
}

const touchOrder = (source: string) => {
  const index = contextOrder.value.indexOf(source)
  if (index >= 0) {
    contextOrder.value.splice(index, 1)
  }
  contextOrder.value.push(source)
}

const setContextForSource = (source: string, value: AIQAContext | null | undefined) => {
  const normalized = normalizeContext(value)

  if (!normalized) {
    delete contextRegistry[source]
    const index = contextOrder.value.indexOf(source)
    if (index >= 0) {
      contextOrder.value.splice(index, 1)
    }
    return
  }

  contextRegistry[source] = normalized
  touchOrder(source)
}

const currentContext = computed<AIQAContext | null>(() => {
  for (let index = contextOrder.value.length - 1; index >= 0; index -= 1) {
    const source = contextOrder.value[index]
    if (!source) continue

    const context = contextRegistry[source]
    if (context) {
      return context
    }
  }
  return null
})

export const useGlobalAIContext = () => {
  return {
    context: readonly(currentContext)
  }
}

export const usePageAIContext = (
  source: string,
  context: MaybeRefOrGetter<AIQAContext | null | undefined>
) => {
  watchEffect(() => {
    setContextForSource(source, toValue(context))
  })

  onUnmounted(() => {
    setContextForSource(source, null)
  })
}
