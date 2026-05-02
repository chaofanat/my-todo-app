<template>
  <div class="app">
    <header class="topbar">
      <div class="topbar-left">
        <span class="logo-mark">记</span>
        <span class="app-name">待办笔记</span>
        <nav class="topbar-nav">
          <router-link to="/" class="nav-link" :class="{ active: $route.path === '/' }">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            待办
          </router-link>
          <router-link to="/settings" class="nav-link" :class="{ active: $route.path === '/settings' }">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            设置
          </router-link>
        </nav>
      </div>
      <div class="window-controls">
        <button class="win-btn" @click="minimize" title="最小化">
          <svg width="12" height="12" viewBox="0 0 12 12"><line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.2"/></svg>
        </button>
        <button class="win-btn" @click="maximize" title="最大化">
          <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>
        </button>
        <button class="win-btn win-btn-close" @click="close" title="关闭">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" stroke-width="1.2"/>
            <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" stroke-width="1.2"/>
          </svg>
        </button>
      </div>
    </header>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
async function minimize() {
  await window.electronAPI.window.minimize();
}

async function maximize() {
  await window.electronAPI.window.maximize();
}

async function close() {
  await window.electronAPI.window.close();
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Noto+Sans+SC:wght@300;400;500&display=swap');

:root {
  --radius: 6px;
  --font-serif: 'Noto Serif SC', 'Songti SC', serif;
  --font-sans: 'Noto Sans SC', 'PingFang SC', sans-serif;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow: hidden;
}

body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-sans);
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--paper);
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 0 20px;
  height: 40px;
  border-bottom: 1px solid var(--border);
  background: var(--paper);
  flex-shrink: 0;
  -webkit-app-region: drag;
  user-select: none;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.logo-mark {
  font-family: var(--font-serif);
  font-size: 14px;
  font-weight: 700;
  color: var(--accent);
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--accent);
  border-radius: 3px;
  line-height: 1;
}

.app-name {
  font-family: var(--font-serif);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.3px;
}

.topbar-nav {
  display: flex;
  gap: 2px;
  margin-left: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius);
  text-decoration: none;
  color: var(--ink-light);
  font-size: 12px;
  font-weight: 400;
  transition: all 0.15s ease;
}

.nav-link:hover {
  color: var(--ink);
  background: var(--paper-warm);
}

.nav-link.active {
  color: var(--accent);
  background: var(--accent-bg);
  font-weight: 500;
}

.nav-link svg {
  opacity: 0.7;
}

.nav-link.active svg {
  opacity: 1;
}

/* Window Controls */
.window-controls {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
}

.win-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--ink-light);
  cursor: pointer;
  transition: all 0.1s;
  border-radius: 4px;
}

.win-btn:hover {
  background: var(--paper-warm);
  color: var(--ink);
}

.win-btn-close:hover {
  background: #e81123;
  color: #fff;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Scrollbar */
.main-content::-webkit-scrollbar {
  width: 6px;
}

.main-content::-webkit-scrollbar-track {
  background: transparent;
}

.main-content::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: var(--ink-faint);
}

/* Selection */
::selection {
  background: rgba(196, 85, 58, 0.15);
}
</style>
