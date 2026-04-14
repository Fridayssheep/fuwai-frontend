import { createRouter, createWebHistory } from 'vue-router'
import Setting from '../components/Setting.vue'
import MainContent from '../components/MainContent.vue'
import KnowledgeBase from '../components/KnowledgeBase.vue'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: MainContent
  },
  {
    path: '/setting',
    name: 'Setting',
    component: Setting
  },
  {
    path: '/knowledge',
    name: 'Knowledge',
    component: KnowledgeBase
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
