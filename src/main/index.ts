import { app, BrowserWindow } from 'electron';
import { WindowManager } from './window/WindowManager';
import { setupIPC } from './ipc/handlers';
import { setupTray } from './tray';
import { setupMenu } from './menu';
import { setupLogger } from './logger';
import { setupStore } from './store';
import { setupCrashReporter } from './crash';
import { setupUpdater } from './updater';
import { handleSquirrelEvent } from './squirrel';
import { NotificationService } from './services/notificationService';
import { TodoService } from './services/todoService';
import { CalendarService } from './services/calendarService';
import { McpServerService } from './mcp';
import type { CalendarEvent } from '../shared/types';

// 处理 Squirrel 安装事件
if (handleSquirrelEvent()) {
  process.exit(0);
}

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // 初始化日志
  const logger = setupLogger();

  // 初始化数据存储
  const store = setupStore();

  // 初始化崩溃报告
  setupCrashReporter();

  // 修复旧数据：为 MCP 创建的无 Z 后缀 ISO datetime 补回 Z
  {
    const events = (store.get('calendarEvents', []) as unknown) as CalendarEvent[];
    let dirty = false;
    for (const e of events) {
      if (e.dtstart && !e.dtstart.endsWith('Z') && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/.test(e.dtstart)) {
        e.dtstart += 'Z'; dirty = true;
      }
      if (e.dtend && !e.dtend.endsWith('Z') && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/.test(e.dtend)) {
        e.dtend += 'Z'; dirty = true;
      }
    }
    if (dirty) store.set('calendarEvents', events as any);
  }

  // 窗口管理器
  let windowManager: WindowManager;
  let notificationService: NotificationService;
  let mcpServerService: McpServerService;
  const todoService = new TodoService(store);
  const calendarService = new CalendarService(store);

  app.whenReady().then(() => {
    logger.info('应用启动');

    app.setAppUserModelId('com.todo-notes.app');

    // 创建窗口管理器
    windowManager = new WindowManager(store, logger);

    // 创建主窗口
    const mainWindow = windowManager.createMainWindow();

    // 关闭到托盘设置
    mainWindow.getWindow().on('close', (event) => {
      const closeToTray = store.get('app.settings.closeToTray') as boolean;
      if (closeToTray && !app.isQuitting) {
        event.preventDefault();
        mainWindow.hide();
      }
    });

    // 设置 IPC 通信
    mcpServerService = new McpServerService(store, logger, todoService, calendarService);
    setupIPC(windowManager, store, logger, todoService, calendarService, mcpServerService);

    // 设置应用菜单
    setupMenu(windowManager, logger);

    // 设置系统托盘
    setupTray(windowManager, logger);

    // 设置自动更新
    setupUpdater(windowManager, store, logger);

    // 启动通知服务
    notificationService = new NotificationService(store, windowManager, logger);
    notificationService.start();

    // 启动 MCP 服务
    mcpServerService.start();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        windowManager.createMainWindow();
      }
    });
  });

  app.on('second-instance', () => {
    // 用户尝试运行第二个实例，聚焦到主窗口
    const mainWindow = windowManager?.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    (app as any).isQuitting = true;
    notificationService?.stop();
    mcpServerService?.stop();
    logger.info('应用退出');
  });

  // 安全网：确保进程退出，防止 HTTP 连接等阻止进程终止
  app.on('will-quit', () => {
    setImmediate(() => process.exit(0));
  });
}
