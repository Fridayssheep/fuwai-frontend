<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

type NavItem = {
  to: string
  label: string
  icon: string
}

const route = useRoute()

const navItems: NavItem[] = [
  { to: '/', label: '首页', icon: 'lucide:layout-dashboard' },
  { to: '/query', label: '查询', icon: 'lucide:search' },
  { to: '/statistics', label: '统计', icon: 'lucide:bar-chart-2' },
  { to: '/fault-analysis', label: '故障分析', icon: 'lucide:alert-triangle' },
  { to: '/knowledge', label: '知识库', icon: 'lucide:book-open' },
  { to: '/setting', label: '设置', icon: 'lucide:settings' }
]

const navMenuRef = ref<HTMLElement | null>(null)
const itemRefs = ref<(HTMLElement | null)[]>([])
const indicatorStyle = ref({
  transform: 'translateY(0px)',
  height: '0px',
  opacity: '0'
})
let resizeFrame = 0

const isItemActive = (to: string) => {
  if (to === '/') return route.path === '/'
  if (to === '/query' && route.path.startsWith('/building/')) return true
  return route.path === to || route.path.startsWith(`${to}/`)
}

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
  const container = navMenuRef.value
  if (!container) return

  const activeIndex = navItems.findIndex((item) => isItemActive(item.to))
  const activeElement = activeIndex >= 0 ? itemRefs.value[activeIndex] : null

  if (!activeElement) {
    indicatorStyle.value = {
      transform: 'translateY(0px)',
      height: '0px',
      opacity: '0'
    }
    return
  }

  const containerRect = container.getBoundingClientRect()
  const activeRect = activeElement.getBoundingClientRect()
  indicatorStyle.value = {
    transform: `translateY(${activeRect.top - containerRect.top + 10}px)`,
    height: `${Math.max(activeRect.height - 20, 16)}px`,
    opacity: '1'
  }
}

const scheduleIndicatorUpdate = () => {
  cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(() => {
    updateIndicator()
  })
}

onMounted(async () => {
  await nextTick()
  scheduleIndicatorUpdate()
  window.addEventListener('resize', scheduleIndicatorUpdate)
})

watch(
  () => route.fullPath,
  async () => {
    await nextTick()
    scheduleIndicatorUpdate()
  }
)

onBeforeUnmount(() => {
  cancelAnimationFrame(resizeFrame)
  window.removeEventListener('resize', scheduleIndicatorUpdate)
})
</script>

<template>
  <aside class="sidebar">
    <div class="logo">
      <div class="logo-icon"><Icon icon="lucide:building-2" /></div>
      <div class="logo-text">
        <h2>CSCEC-8</h2>
        <p>智慧能源系统</p>
      </div>
    </div>

    <nav ref="navMenuRef" class="nav-menu">
      <div class="nav-indicator" :style="indicatorStyle"></div>

      <router-link
        v-for="(item, index) in navItems"
        :key="item.to"
        :to="item.to"
        :class="['nav-item', { active: isItemActive(item.to) }]"
        :ref="(element) => setItemRef(index, element)"
      >
        <Icon :icon="item.icon" class="icon" />
        <span class="nav-text">{{ item.label }}</span>
      </router-link>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  background-color: #0b4582;
  color: white;
  display: flex;
  flex-direction: column;
  padding: 20px 0;
}

.logo {
  display: flex;
  align-items: center;
  padding: 0 20px 30px;
  gap: 12px;
}

.logo-icon {
  font-size: 28px;
  display: flex;
  align-items: center;
}

.logo-text h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.logo-text p {
  margin: 0;
  font-size: 12px;
  opacity: 0.7;
}

.nav-menu {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 16px;
  gap: 8px;
}

.nav-indicator {
  position: absolute;
  left: 24px;
  width: 4px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(160, 212, 255, 0.84));
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12), 0 0 22px rgba(125, 196, 255, 0.36);
  transition:
    transform 0.34s cubic-bezier(0.22, 1, 0.36, 1),
    height 0.34s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.24s ease;
  pointer-events: none;
  z-index: 2;
}

.nav-item {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: #a0c4f2;
  text-decoration: none;
  border-radius: 8px;
  transition:
    transform 0.24s ease,
    background-color 0.24s ease,
    color 0.24s ease,
    box-shadow 0.24s ease;
  font-size: 15px;
  overflow: hidden;
}

.nav-item .icon {
  font-size: 18px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: transform 0.24s ease, color 0.24s ease;
}

.nav-text {
  flex-grow: 1;
  transition: transform 0.24s ease;
}

.nav-item:hover,
.nav-item.active {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  font-weight: 600;
}

.nav-item:hover {
  transform: translateX(4px);
}

.nav-item.active {
  background-color: #2b6cb0;
  box-shadow: 0 10px 24px rgba(7, 34, 73, 0.24);
}

.nav-item.active .icon {
  transform: translateX(1px) scale(1.04);
}

.nav-item.active .nav-text {
  transform: translateX(1px);
}
</style>
