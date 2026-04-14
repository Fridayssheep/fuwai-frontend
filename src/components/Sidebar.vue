<template>
  <aside class="sidebar">
    <div class="logo">
      <div class="logo-icon">🏢</div>
      <div class="logo-text">
        <h2>CSCEC-8</h2>
        <p>智慧能源系统</p>
      </div>
    </div>

    <nav class="nav-menu">
      <router-link to="/" class="nav-item" exact-active-class="active">
        <span class="icon">⊞</span> 首页
      </router-link>
      <a href="#" class="nav-item"><span class="icon">🔍</span> 查询</a>
      <a href="#" class="nav-item"><span class="icon">📊</span> 统计</a>
      <a href="#" class="nav-item"><span class="icon">⚠️</span> 故障分析</a>
      <router-link to="/knowledge" class="nav-item" exact-active-class="active"><span class="icon">📖</span> 知识库</router-link>
      <router-link to="/setting" class="nav-item" exact-active-class="active"><span class="icon">⚙️</span> 设置</router-link>
    </nav>

    <div class="bottom-menu">
      <a href="#" class="nav-item"><span class="icon">❓</span> 支持</a>
      <a href="#" class="nav-item"><span class="icon">🚪</span> 退出登录</a>
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
.logo-icon { font-size: 32px; }
.logo-text h2 { margin: 0; font-size: 20px; font-weight: 700; }
.logo-text p { margin: 0; font-size: 12px; opacity: 0.7; }

.nav-menu { flex: 1; display: flex; flex-direction: column; padding: 0 16px; gap: 8px;}
.bottom-menu { padding: 0 16px; margin-bottom: 20px; }

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: #a0c4f2;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-size: 15px;
}
.nav-item .icon { margin-right: 12px; font-size: 18px; }
.nav-item:hover, .nav-item.active {
  background-color: rgba(255,255,255,0.1);
  color: white;
  font-weight: 600;
}
.nav-item.active {
  background-color: #2b6cb0; /* 激活态背景 */
}
</style>