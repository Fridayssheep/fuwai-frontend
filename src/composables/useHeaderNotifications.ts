import { computed, ref } from 'vue'
import { getHighlights, type HighlightItem } from '../api/dashboard'

export type HeaderNotificationType = HighlightItem['type']

export interface HeaderNotificationItem {
  id: string
  type: HeaderNotificationType
  title: string
  description: string
  targetId?: string
  unread: boolean
}

const STORAGE_KEY = 'fw_header_notification_read_ids'

const items = ref<HeaderNotificationItem[]>([])
const loading = ref(false)
const loaded = ref(false)

const loadReadIds = (): string[] => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const readIds = ref<string[]>(loadReadIds())

const persistReadIds = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(readIds.value))
}

const buildNotificationId = (item: HighlightItem) => {
  return [item.type, item.title, item.description, item.target || '', item.target_id || ''].join('::')
}

const toNotificationItem = (item: HighlightItem): HeaderNotificationItem => {
  const id = buildNotificationId(item)

  return {
    id,
    type: item.type,
    title: item.title,
    description: item.description,
    targetId: item.target_id,
    unread: !readIds.value.includes(id)
  }
}

const unwrap = (res: any) => res?.data ?? res

export const useHeaderNotifications = () => {
  const unreadCount = computed(() => items.value.filter((item) => item.unread).length)

  const refresh = async (limit: number = 6) => {
    loading.value = true

    try {
      const raw = await getHighlights(limit)
      const data = unwrap(raw)
      items.value = (data?.items ?? []).map(toNotificationItem)
      loaded.value = true
    } catch (error: any) {
      console.error('Header notifications load failed:', error?.message || error)
    } finally {
      loading.value = false
    }
  }

  const ensureLoaded = async (limit: number = 6) => {
    if (!loaded.value) {
      await refresh(limit)
    }
  }

  const markAsRead = (id: string) => {
    if (!readIds.value.includes(id)) {
      readIds.value = [...readIds.value, id]
      persistReadIds()
    }

    items.value = items.value.map((item) =>
      item.id === id ? { ...item, unread: false } : item
    )
  }

  const markAllAsRead = () => {
    const nextIds = new Set(readIds.value)
    items.value.forEach((item) => nextIds.add(item.id))
    readIds.value = Array.from(nextIds)
    persistReadIds()

    items.value = items.value.map((item) => ({ ...item, unread: false }))
  }

  return {
    items,
    loading,
    unreadCount,
    refresh,
    ensureLoaded,
    markAsRead,
    markAllAsRead
  }
}
