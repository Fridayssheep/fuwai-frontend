<template>
  <header class="header">
    <div class="page-title">中建八局建筑能源管理系统</div>
    <div class="user-info">
      <div ref="notificationRef" class="notification-wrap">
        <button class="notification-btn" type="button" @click="togglePanel">
          <Icon icon="lucide:bell" />
          <span v-if="unreadCount > 0" class="notification-badge">
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </span>
        </button>

        <HeaderNotificationPanel
          v-if="panelOpen"
          :items="items"
          :loading="loading"
          :unreadCount="unreadCount"
          @mark-all-read="markAllAsRead"
          @select="handleSelect"
        />
      </div>

      <div class="profile">
        <div class="text">
          <span class="name">陈欢</span>
          <span class="role">能源监控中心</span>
        </div>
        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" class="avatar" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import HeaderNotificationPanel from './header/HeaderNotificationPanel.vue'
import {
  useHeaderNotifications,
  type HeaderNotificationItem
} from '../composables/useHeaderNotifications'

const router = useRouter()
const notificationRef = ref<HTMLElement | null>(null)
const panelOpen = ref(false)

const {
  items,
  loading,
  unreadCount,
  refresh,
  ensureLoaded,
  markAsRead,
  markAllAsRead
} = useHeaderNotifications()

const togglePanel = async () => {
  panelOpen.value = !panelOpen.value
  if (panelOpen.value) {
    await ensureLoaded()
    refresh()
  }
}

const closePanel = () => {
  panelOpen.value = false
}

const handleSelect = async (item: HeaderNotificationItem) => {
  markAsRead(item.id)
  closePanel()

  if (item.targetId) {
    await router.push({
      path: '/fault-analysis',
      query: { building_id: item.targetId }
    })
    return
  }

  await router.push('/')
}

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as Node | null
  if (!target || !notificationRef.value) return

  if (!notificationRef.value.contains(target)) {
    closePanel()
  }
}

onMounted(() => {
  refresh()
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<style scoped>
.header {
  background-color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
  z-index: 10;
}

.page-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 24px;
}

.notification-wrap {
  position: relative;
}

.notification-btn {
  position: relative;
  width: 42px;
  height: 42px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  font-size: 18px;
  cursor: pointer;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.notification-btn:hover {
  color: #0b4582;
  border-color: #bfdbfe;
  box-shadow: 0 8px 18px rgba(11, 69, 130, 0.08);
}

.notification-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #ef4444;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.profile {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile .text {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.profile .name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.profile .role {
  font-size: 12px;
  color: #888;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #eee;
}

@media (max-width: 768px) {
  .header {
    padding: 0 16px;
  }

  .page-title {
    font-size: 16px;
  }

  .user-info {
    gap: 14px;
  }
}
</style>
