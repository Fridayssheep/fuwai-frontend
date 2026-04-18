import { createRouter, createWebHistory } from 'vue-router'
import Setting from '../components/Setting.vue'
import MainContent from '../components/MainContent.vue'
import KnowledgeBase from '../components/KnowledgeBase/index.vue'
import FaultAnalysis from '../components/FaultAnalysis/index.vue'
import QueryView from '../components/QueryView/index.vue'
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
    path: '/query',
    name: 'Query',
    component: QueryView
  },
  {
    path: '/building/:id',
    name: 'BuildingDetail',
    // 注意路径指向 components/QueryView
    component: () => import('../components/QueryView/BuildingDetail.vue'),
    props: true,
    meta: { title: '建筑详情' }
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
