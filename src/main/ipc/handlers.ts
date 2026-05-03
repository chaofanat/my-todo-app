import { ipcMain, app } from 'electron';
import { channels } from './channels';
import { WindowManager } from '../window/WindowManager';
import { checkForUpdates, downloadUpdate, installUpdate } from '../updater';
import { TodoService } from '../services/todoService';
import { CalendarService } from '../services/calendarService';
import type { Store } from 'electron-store';
import type { Logger } from 'electron-log';
import type { McpServerService } from '../mcp';
import type { CreateWindowOptions, Todo } from '../../shared/types';
import { normalizeToUtc, getEffectiveTimezone } from '../../shared/timezone';

export function setupIPC(
  windowManager: WindowManager,
  store: Store,
  logger: Logger,
  todoService: TodoService,
  calendarService: CalendarService,
  mcpServerService: McpServerService
): void {
  // 应用信息
  ipcMain.handle(channels.app.getVersion, () => {
    return app.getVersion();
  });

  ipcMain.handle(channels.app.getName, () => {
    return app.getName();
  });

  ipcMain.handle(channels.app.getPath, (_, name: string) => {
    return app.getPath(name as any);
  });

  // 窗口操作
  ipcMain.handle(channels.window.minimize, () => {
    windowManager.getMainWindow()?.minimize();
  });

  ipcMain.handle(channels.window.maximize, () => {
    windowManager.getMainWindow()?.maximize();
  });

  ipcMain.handle(channels.window.close, () => {
    windowManager.getMainWindow()?.close();
  });

  ipcMain.handle(channels.window.isMaximized, () => {
    return windowManager.getMainWindow()?.isMaximized() || false;
  });

  ipcMain.handle(channels.window.create, (_, options: CreateWindowOptions) => {
    windowManager.createChildWindow(options);
  });

  ipcMain.handle(channels.window.destroy, (_, windowId: number) => {
    return windowManager.destroyChildWindow(windowId);
  });

  ipcMain.handle(channels.window.list, () => {
    return windowManager.getWindowList();
  });

  // 数据存储
  ipcMain.handle(channels.store.get, (_, key: string) => {
    return store.get(key);
  });

  ipcMain.handle(channels.store.set, (_, key: string, value: unknown) => {
    store.set(key, value);
  });

  ipcMain.handle(channels.store.delete, (_, key: string) => {
    store.delete(key);
  });

  // 日志
  ipcMain.handle(channels.log.info, (_, message: string) => {
    logger.info(message);
  });

  ipcMain.handle(channels.log.warn, (_, message: string) => {
    logger.warn(message);
  });

  ipcMain.handle(channels.log.error, (_, message: string) => {
    logger.error(message);
  });

  // 自动更新
  ipcMain.handle(channels.updater.check, () => {
    checkForUpdates();
  });

  ipcMain.handle(channels.updater.download, () => {
    downloadUpdate();
  });

  ipcMain.handle(channels.updater.install, () => {
    installUpdate();
  });

  // 待办事项
  ipcMain.handle(channels.todo.getAll, () => {
    return todoService.getAll();
  });

  ipcMain.handle(channels.todo.create, (_, data: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => {
    return todoService.create(data);
  });

  ipcMain.handle(channels.todo.update, (_, id: string, updates: Partial<Todo>) => {
    return todoService.update(id, updates);
  });

  ipcMain.handle(channels.todo.delete, (_, id: string) => {
    return todoService.delete(id);
  });

  ipcMain.handle(channels.todo.convertToEvent, (_, id: string, startDate: string, durationMinutes: number) => {
    const tz = getEffectiveTimezone(store.get('user.preferences.timezone', 'system') as string);
    const norm = normalizeToUtc(startDate, tz);
    if ('error' in norm) return null;
    const result = todoService.convertToEvent(id, norm.result, durationMinutes);
    if (result && 'error' in result) return null;
    return result;
  });

  // 日程
  ipcMain.handle(channels.calendar.getAll, () => {
    return calendarService.getAll();
  });

  ipcMain.handle(channels.calendar.import, async () => {
    return await calendarService.importFile();
  });

  ipcMain.handle(channels.calendar.delete, (_, uid: string) => {
    return calendarService.delete(uid);
  });

  ipcMain.handle(channels.calendar.checkIn, (_, uid: string) => {
    return calendarService.checkIn(uid);
  });

  // MCP
  ipcMain.handle(channels.mcp.restart, () => {
    mcpServerService.restart();
  });

  logger.info('IPC 处理器已注册');
}
