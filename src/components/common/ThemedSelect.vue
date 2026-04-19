<template>
  <div
    ref="rootRef"
    :class="[
      'themed-select',
      size,
      {
        open: isOpen,
        disabled,
        placeholder: showPlaceholder
      }
    ]"
  >
    <button
      type="button"
      class="themed-select-trigger"
      :aria-expanded="isOpen"
      :aria-haspopup="'listbox'"
      :aria-label="ariaLabel"
      :disabled="disabled"
      @click="toggleOpen"
      @keydown.enter.prevent="toggleOpen"
      @keydown.space.prevent="toggleOpen"
      @keydown.esc.prevent="closeMenu"
    >
      <span class="themed-select-value">{{ displayLabel }}</span>
      <Icon icon="lucide:chevron-down" class="themed-select-arrow" :class="{ open: isOpen }" />
    </button>

    <Transition name="themed-select-menu">
      <ul v-if="isOpen" class="themed-select-options" role="listbox">
        <li
          v-for="option in options"
          :key="optionKey(option)"
          :class="[
            'themed-select-option',
            {
              selected: isSelected(option),
              disabled: option.disabled
            }
          ]"
          role="option"
          :aria-selected="isSelected(option)"
          @click.stop="selectOption(option)"
        >
          {{ option.label }}
        </li>
      </ul>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'

type OptionValue = string | number | boolean | null
type SelectOption = {
  label: string
  value: OptionValue
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue: OptionValue
  options: SelectOption[]
  placeholder?: string
  ariaLabel?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}>(), {
  placeholder: '',
  ariaLabel: '下拉选择',
  disabled: false,
  size: 'md'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: OptionValue): void
  (e: 'change', value: OptionValue): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue) ?? null)
const showPlaceholder = computed(() => !selectedOption.value && props.placeholder)
const displayLabel = computed(() => {
  if (selectedOption.value) return selectedOption.value.label
  if (props.placeholder) return props.placeholder
  if (props.modelValue === null || props.modelValue === undefined || props.modelValue === '') return ''
  return String(props.modelValue)
})

const optionKey = (option: SelectOption) => `${String(option.value)}__${option.label}`
const isSelected = (option: SelectOption) => option.value === props.modelValue

const closeMenu = () => {
  isOpen.value = false
}

const toggleOpen = () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

const selectOption = (option: SelectOption) => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  closeMenu()
}

const handleDocumentClick = (event: MouseEvent) => {
  if (!rootRef.value?.contains(event.target as Node)) {
    closeMenu()
  }
}

const handleDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>

<style scoped>
.themed-select {
  --select-width: 100%;
  --select-min-width: 0;
  --select-height: 42px;
  --select-padding-x: 14px;
  --select-radius: 16px;
  --select-font-size: 14px;
  --select-font-weight: 600;
  --select-border-color: #dbe5ef;
  --select-bg: #f5f8fc;
  --select-color: #16304d;
  --select-placeholder-color: #7d91a8;
  --select-shadow: 0 0 0 0 rgba(11, 69, 130, 0);
  --select-hover-border: #0b4582;
  --select-hover-bg: #eef5fd;
  --select-open-border: #0b4582;
  --select-open-bg: #eef5fd;
  --select-menu-top: calc(100% + 8px);
  --select-menu-radius: 18px;
  --select-menu-padding: 6px;
  --select-menu-shadow: 0 18px 38px rgba(11, 69, 130, 0.14);
  --select-option-radius: 12px;
  --select-option-padding-y: 12px;
  --select-option-padding-x: 14px;
  --select-option-color: #334155;
  --select-option-hover-bg: #f0f5fb;
  --select-option-hover-color: #0b4582;
  --select-option-active-bg: #0b4582;
  --select-option-active-color: #ffffff;
  --select-arrow-color: #6a8098;
  --select-menu-z: 60;
  --select-max-menu-height: 260px;

  position: relative;
  width: var(--select-width);
  min-width: var(--select-min-width);
  user-select: none;
}

.themed-select.sm {
  --select-height: 36px;
  --select-padding-x: 12px;
  --select-radius: 14px;
  --select-font-size: 13px;
  --select-menu-radius: 16px;
  --select-menu-padding: 5px;
  --select-option-radius: 10px;
  --select-option-padding-y: 10px;
  --select-option-padding-x: 12px;
}

.themed-select.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.themed-select-trigger {
  width: 100%;
  min-height: var(--select-height);
  padding: 0 var(--select-padding-x);
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1.5px solid var(--select-border-color);
  border-radius: var(--select-radius);
  background: var(--select-bg);
  color: var(--select-color);
  font-size: var(--select-font-size);
  font-weight: var(--select-font-weight);
  box-shadow: var(--select-shadow);
  transition:
    border-color 0.22s ease,
    background 0.22s ease,
    box-shadow 0.22s ease,
    transform 0.22s ease;
  cursor: pointer;
  font-family: inherit;
}

.themed-select-trigger:hover:not(:disabled) {
  border-color: var(--select-hover-border);
  background: var(--select-hover-bg);
}

.themed-select.open .themed-select-trigger {
  border-color: var(--select-open-border);
  background: var(--select-open-bg);
  box-shadow: 0 0 0 4px rgba(11, 69, 130, 0.08), var(--select-shadow);
}

.themed-select-trigger:focus-visible {
  outline: none;
  border-color: var(--select-open-border);
  box-shadow: 0 0 0 4px rgba(11, 69, 130, 0.08), var(--select-shadow);
}

.themed-select-trigger:disabled {
  cursor: not-allowed;
}

.themed-select-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.themed-select.placeholder .themed-select-value {
  color: var(--select-placeholder-color);
}

.themed-select-arrow {
  flex: 0 0 auto;
  color: var(--select-arrow-color);
  font-size: 16px;
  transition: transform 0.2s ease, color 0.2s ease;
}

.themed-select-arrow.open {
  transform: rotate(180deg);
  color: var(--select-open-border);
}

.themed-select-options {
  position: absolute;
  top: var(--select-menu-top);
  left: 0;
  right: 0;
  max-height: var(--select-max-menu-height);
  overflow-y: auto;
  margin: 0;
  padding: var(--select-menu-padding);
  list-style: none;
  border: 1px solid #e3edf6;
  border-radius: var(--select-menu-radius);
  background: #ffffff;
  box-shadow: var(--select-menu-shadow);
  z-index: var(--select-menu-z);
}

.themed-select-option {
  padding: var(--select-option-padding-y) var(--select-option-padding-x);
  border-radius: var(--select-option-radius);
  color: var(--select-option-color);
  font-size: var(--select-font-size);
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
  transition:
    background 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease;
}

.themed-select-option:hover:not(.disabled) {
  background: var(--select-option-hover-bg);
  color: var(--select-option-hover-color);
}

.themed-select-option.selected {
  background: var(--select-option-active-bg);
  color: var(--select-option-active-color);
  font-weight: 700;
}

.themed-select-option.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.themed-select-menu-enter-active,
.themed-select-menu-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
  transform-origin: top center;
}

.themed-select-menu-enter-from,
.themed-select-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>
