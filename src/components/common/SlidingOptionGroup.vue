<template>
  <div
    ref="containerRef"
    :class="[
      'sliding-group',
      orientation,
      variant,
      { wrap, ready: indicatorVisible }
    ]"
    :aria-label="ariaLabel"
    role="tablist"
  >
    <div class="sliding-indicator" :style="indicatorStyle"></div>

    <button
      v-for="(option, index) in options"
      :key="String(option.value)"
      :ref="(element) => setItemRef(index, element)"
      type="button"
      role="tab"
      :aria-selected="isActive(option)"
      :class="[
        'sliding-option',
        {
          active: isActive(option),
          'ai-glow': isHighlighted(option),
          disabled: option.disabled
        }
      ]"
      :disabled="option.disabled"
      @click="selectOption(option)"
    >
      <slot
        name="option"
        :option="option"
        :active="isActive(option)"
        :highlighted="isHighlighted(option)"
      >
        {{ option.label }}
      </slot>
    </button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type OptionValue = string | number
type OptionItem = {
  value: OptionValue
  label: string
  disabled?: boolean
  [key: string]: unknown
}

const props = withDefaults(defineProps<{
  modelValue: OptionValue
  options: OptionItem[]
  orientation?: 'horizontal' | 'vertical'
  variant?: 'track' | 'list'
  wrap?: boolean
  ariaLabel?: string
  highlightedValues?: OptionValue[]
}>(), {
  orientation: 'horizontal',
  variant: 'track',
  wrap: false,
  ariaLabel: '选项组',
  highlightedValues: () => []
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: OptionValue): void
  (e: 'change', value: OptionValue): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const itemRefs = ref<(HTMLElement | null)[]>([])
const indicatorVisible = ref(false)
const indicatorStyle = ref<Record<string, string>>({
  transform: 'translate3d(0, 0, 0)',
  width: '0px',
  height: '0px',
  opacity: '0'
})

let resizeObserver: ResizeObserver | null = null
let rafId = 0

const isActive = (option: OptionItem) => option.value === props.modelValue
const isHighlighted = (option: OptionItem) => (props.highlightedValues || []).includes(option.value)

const setItemRef = (index: number, element: unknown) => {
  if (!element) {
    itemRefs.value[index] = null
    return
  }

  if (element instanceof HTMLElement) {
    itemRefs.value[index] = element
    return
  }

  const maybeComponent = element as { $el?: Element | null }
  itemRefs.value[index] = maybeComponent.$el instanceof HTMLElement ? maybeComponent.$el : null
}

const updateIndicator = () => {
  const container = containerRef.value
  if (!container) return

  const activeIndex = props.options.findIndex((option) => option.value === props.modelValue)
  const activeElement = activeIndex >= 0 ? itemRefs.value[activeIndex] : null

  if (!activeElement) {
    indicatorVisible.value = false
    indicatorStyle.value = {
      transform: 'translate3d(0, 0, 0)',
      width: '0px',
      height: '0px',
      opacity: '0'
    }
    return
  }

  const containerRect = container.getBoundingClientRect()
  const activeRect = activeElement.getBoundingClientRect()
  const offsetX = activeRect.left - containerRect.left
  const offsetY = activeRect.top - containerRect.top

  indicatorVisible.value = true
  indicatorStyle.value = {
    transform: `translate3d(${offsetX}px, ${offsetY}px, 0)`,
    width: `${activeRect.width}px`,
    height: `${activeRect.height}px`,
    opacity: '1'
  }
}

const scheduleIndicatorUpdate = () => {
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    updateIndicator()
  })
}

const selectOption = (option: OptionItem) => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
}

onMounted(async () => {
  await nextTick()
  scheduleIndicatorUpdate()

  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      scheduleIndicatorUpdate()
    })
    resizeObserver.observe(containerRef.value)
  } else {
    window.addEventListener('resize', scheduleIndicatorUpdate)
  }
})

watch(
  () => [props.modelValue, props.options.length, props.orientation, props.variant, props.wrap],
  async () => {
    await nextTick()
    scheduleIndicatorUpdate()
  },
  { deep: true }
)

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  resizeObserver?.disconnect()
  if (!resizeObserver) {
    window.removeEventListener('resize', scheduleIndicatorUpdate)
  }
})
</script>

<style scoped>
.sliding-group {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 6px;
}

.sliding-group.horizontal.wrap {
  flex-wrap: wrap;
}

.sliding-group.vertical {
  flex-direction: column;
}

.sliding-indicator {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  z-index: 0;
  transition:
    transform 0.34s cubic-bezier(0.22, 1, 0.36, 1),
    width 0.34s cubic-bezier(0.22, 1, 0.36, 1),
    height 0.34s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.22s ease;
}

.sliding-option {
  position: relative;
  z-index: 1;
  border: none;
  background: transparent;
  cursor: pointer;
  transition:
    color 0.22s ease,
    transform 0.22s ease,
    box-shadow 0.22s ease,
    opacity 0.22s ease;
  font-family: inherit;
}

.sliding-option.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sliding-option.ai-glow {
  animation: optionGlow 1.2s ease;
}

.sliding-group.track {
  padding: 3px;
  border-radius: 12px;
  background: #f1f5f9;
}

.sliding-group.track .sliding-indicator {
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.09);
}

.sliding-group.track .sliding-option {
  min-height: 34px;
  padding: 6px 16px;
  border-radius: 10px;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.sliding-group.track .sliding-option:hover:not(.active):not(.disabled) {
  color: #0f172a;
}

.sliding-group.track .sliding-option.active {
  color: #0b4582;
}

.sliding-group.list {
  gap: 4px;
}

.sliding-group.list .sliding-indicator {
  border-radius: 10px;
  background: #0b4582;
  box-shadow: 0 10px 24px rgba(7, 34, 73, 0.14);
}

.sliding-group.list .sliding-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  color: #56708e;
  font-size: 14px;
  text-align: left;
}

.sliding-group.list .sliding-option:hover:not(.active):not(.disabled) {
  color: #12233d;
  transform: translateX(2px);
}

.sliding-group.list .sliding-option.active {
  color: #ffffff;
  font-weight: 600;
}

@keyframes optionGlow {
  0% {
    box-shadow: 0 0 0 0 rgba(96, 165, 250, 0.24);
  }
  55% {
    box-shadow: 0 0 0 8px rgba(96, 165, 250, 0.1);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(96, 165, 250, 0);
  }
}
</style>
