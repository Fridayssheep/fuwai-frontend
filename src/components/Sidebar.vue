<script setup lang="ts">
import { Icon } from '@iconify/vue'
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

    <nav class="nav-menu">
      <router-link to="/" class="nav-item" exact-active-class="active">
        <Icon icon="lucide:layout-dashboard" class="icon" />
        <span class="nav-text">首页</span>
      </router-link>
      <router-link to="/query" class="nav-item" exact-active-class="active">
        <Icon icon="lucide:search" class="icon" />
        <span class="nav-text">查询</span>
      </router-link>
      <router-link to="/statistics" class="nav-item" exact-active-class="active">
        <Icon icon="lucide:bar-chart-2" class="icon" />
        <span class="nav-text">统计</span>
      </router-link>
      <router-link to="/fault-analysis" class="nav-item" exact-active-class="active">
        <Icon icon="lucide:alert-triangle" class="icon" />
        <span class="nav-text">故障分析</span>
      </router-link>
      <router-link to="/knowledge" class="nav-item" exact-active-class="active">
        <Icon icon="lucide:book-open" class="icon" />
        <span class="nav-text">知识库</span>
      </router-link>
      <router-link to="/setting" class="nav-item" exact-active-class="active">
        <Icon icon="lucide:settings" class="icon" />
        <span class="nav-text">设置</span>
      </router-link>
    </nav>

    <div class="bottom-menu">
      <a href="#" class="nav-item">
        <Icon icon="lucide:help-circle" class="icon" />
        <span class="nav-text">支持</span>
      </a>
      <a href="#" class="nav-item">
        <Icon icon="lucide:log-out" class="icon" />
        <span class="nav-text">退出登录</span>
      </a>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  background-color: #0b4582; /* 深蓝色背景 */
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
.logo-text h2 { margin: 0; font-size: 20px; font-weight: 700; line-height: 1.2; }
.logo-text p { margin: 0; font-size: 12px; opacity: 0.7; }

.nav-menu { flex: 1; display: flex; flex-direction: column; padding: 0 16px; gap: 8px;}
.bottom-menu { padding: 0 16px; margin-bottom: 20px; }

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: #a0c4f2;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-size: 15px;
}
.nav-item .icon { 
  font-size: 18px; 
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.nav-text {
  flex-grow: 1;
}

.nav-item:hover, .nav-item.active {
  background-color: rgba(255,255,255,0.1);
  color: white;
  font-weight: 600;
}
.nav-item.active {
  background-color: #2b6cb0; /* 激活态背景 */
}
</style>