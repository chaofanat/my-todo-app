<template>
  <div class="settings">
    <div class="settings-header">
      <button @click="goBack" class="back-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        返回
      </button>
      <h1>设置</h1>
    </div>

    <div class="settings-content">
      <section class="setting-group">
        <h2 class="group-title">外观</h2>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">主题</span>
            <span class="setting-hint">选择应用主题风格</span>
          </div>
          <div class="theme-picker">
            <button
              v-for="t in themes"
              :key="t.value"
              :class="['theme-opt', { active: settings.theme === t.value }]"
              @click="settings.theme = t.value; saveSettings()"
            >
              {{ t.label }}
            </button>
          </div>
        </div>
      </section>

      <section class="setting-group">
        <h2 class="group-title">行为</h2>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">启动行为</span>
            <span class="setting-hint">应用启动时的窗口状态</span>
          </div>
          <select v-model="settings.startupBehavior" @change="saveSettings" class="setting-select">
            <option value="restore">恢复上次状态</option>
            <option value="default">默认大小</option>
          </select>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">关闭时最小化到托盘</span>
            <span class="setting-hint">点击关闭按钮时隐藏到系统托盘而非退出</span>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="settings.closeToTray" @change="saveSettings" />
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>
      </section>

      <section class="setting-group">
        <h2 class="group-title">通知</h2>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">到期提醒</span>
            <span class="setting-hint">待办即将到期或日程即将开始时发送系统通知</span>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="settings.enableNotifications" @change="saveSettings" />
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>
      </section>

      <section class="setting-group">
        <h2 class="group-title">更新</h2>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">自动更新</span>
            <span class="setting-hint">有新版本时自动下载更新</span>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="settings.autoUpdate" @change="saveSettings" />
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>
      </section>

      <section class="setting-group">
        <h2 class="group-title">关于</h2>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">版本</span>
            <span class="setting-hint">{{ appVersion }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from '../composables/useTheme';

const router = useRouter();
const appVersion = ref('');
const { theme, setTheme } = useTheme();

const settings = ref({
  theme: 'system' as 'light' | 'dark' | 'system',
  startupBehavior: 'restore',
  closeToTray: true,
  autoUpdate: true,
  enableNotifications: true,
});

const themes = [
  { value: 'light' as const, label: '浅色' },
  { value: 'dark' as const, label: '深色' },
  { value: 'system' as const, label: '跟随系统' },
];

watch(() => settings.value.theme, (newTheme) => {
  setTheme(newTheme);
});

onMounted(async () => {
  if (window.electronAPI) {
    appVersion.value = await window.electronAPI.app.getVersion();
    const savedTheme = await window.electronAPI.store.get<string>('user.preferences.theme');
    if (savedTheme) settings.value.theme = savedTheme as any;
    const appSettings = await window.electronAPI.store.get<any>('app.settings');
    if (appSettings) {
      settings.value.closeToTray = appSettings.closeToTray ?? true;
      settings.value.autoUpdate = appSettings.autoUpdate ?? true;
      settings.value.enableNotifications = appSettings.enableNotifications ?? true;
    }
    const startupBehavior = await window.electronAPI.store.get<string>('user.preferences.startupBehavior');
    if (startupBehavior) settings.value.startupBehavior = startupBehavior;
  }
});

const saveSettings = async () => {
  if (window.electronAPI) {
    await window.electronAPI.store.set('user.preferences.theme', settings.value.theme);
    await window.electronAPI.store.set('user.preferences.startupBehavior', settings.value.startupBehavior);
    await window.electronAPI.store.set('app.settings.closeToTray', settings.value.closeToTray);
    await window.electronAPI.store.set('app.settings.autoUpdate', settings.value.autoUpdate);
    await window.electronAPI.store.set('app.settings.enableNotifications', settings.value.enableNotifications);
  }
};

const goBack = () => router.push('/');
</script>

<style scoped>
.settings {
  max-width: 640px;
  margin: 0 auto;
  padding: 24px 40px 60px;
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--ink-light);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-sans);
}

.back-btn:hover {
  background: var(--paper-warm);
  border-color: var(--ink-faint);
  color: var(--ink);
}

.settings-header h1 {
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 600;
  color: var(--ink);
}

.setting-group {
  margin-bottom: 28px;
}

.group-title {
  font-family: var(--font-serif);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-faint);
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 12px;
  padding-left: 2px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: var(--paper-warm);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 6px;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-label {
  font-size: 14px;
  font-weight: 450;
  color: var(--ink);
}

.setting-hint {
  font-size: 12px;
  color: var(--ink-faint);
}

.setting-select {
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--paper);
  color: var(--ink);
  font-size: 13px;
  font-family: var(--font-sans);
  outline: none;
  cursor: pointer;
}

.setting-select:focus {
  border-color: var(--accent-soft);
}

/* Theme Picker */
.theme-picker {
  display: flex;
  gap: 4px;
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 3px;
}

.theme-opt {
  padding: 5px 14px;
  border: none;
  border-radius: 4px;
  background: transparent;
  font-size: 13px;
  color: var(--ink-light);
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-sans);
}

.theme-opt:hover {
  color: var(--ink);
}

.theme-opt.active {
  background: var(--accent);
  color: #fff;
}

/* Toggle */
.toggle {
  position: relative;
  display: inline-block;
  cursor: pointer;
}

.toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-track {
  display: block;
  width: 44px;
  height: 24px;
  background: var(--border);
  border-radius: 12px;
  transition: background 0.2s;
  position: relative;
}

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.toggle input:checked + .toggle-track {
  background: var(--green);
}

.toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(20px);
}
</style>
