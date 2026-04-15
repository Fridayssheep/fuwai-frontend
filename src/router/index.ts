import { createRouter, createWebHistory } from 'vue-router'
import Setting from '../components/Setting.vue'
import MainContent from '../components/MainContent.vue'
import KnowledgeBase from '../components/KnowledgeBase/index.vue'
import FaultAnalysis from '../components/FaultAnalysis/index.vue'
import Statistics from '../components/Statistics/index.vue'

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
  },
  {
    path: '/fault-analysis',
    name: 'FaultAnalysis',
    component: FaultAnalysis
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: Statistics
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
