import { Notification } from 'electron';
import type { Store } from 'electron-store';
import type { Logger } from 'electron-log';
import type { Todo, CalendarEvent } from '../../shared/types';
import type { WindowManager } from '../window/WindowManager';
import { getEffectiveTimezone, getOffsetMs } from '../../shared/timezone';

export class NotificationService {
  private store: Store;
  private windowManager: WindowManager;
  private logger: Logger;
  private timer: ReturnType<typeof setInterval> | null = null;
  private notifiedTodoIds = new Set<string>();
  private notifiedEventUids = new Set<string>();

  private static CHECK_INTERVAL_MS = 60_000;
  private static EVENT_WARNING_MS = 10 * 60_000;

  constructor(store: Store, windowManager: WindowManager, logger: Logger) {
    this.store = store;
    this.windowManager = windowManager;
    this.logger = logger;
  }

  start(): void {
    if (this.timer) return;
    this.check();
    this.timer = setInterval(() => this.check(), NotificationService.CHECK_INTERVAL_MS);
    this.logger.info('通知服务已启动');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.notifiedTodoIds.clear();
    this.notifiedEventUids.clear();
  }

  private check(): void {
    const enabled = this.store.get('app.settings.enableNotifications', true) as boolean;
    if (!enabled) return;
    this.checkTodos();
    this.checkCalendarEvents();
  }

  private checkTodos(): void {
    const todos = this.store.get('todos', []) as unknown as Todo[];
    const tz = getEffectiveTimezone(this.store.get('user.preferences.timezone', 'system') as string);
    const now = new Date();
    const offsetMs = getOffsetMs(now, tz);
    const localNow = new Date(now.getTime() + offsetMs);
    const todayStr = localNow.toISOString().slice(0, 10);

    for (const todo of todos) {
      if (todo.completed || !todo.dueDate || this.notifiedTodoIds.has(todo.id)) continue;

      const dueDate = todo.dueDate.slice(0, 10);
      if (dueDate > todayStr) continue;

      this.notifiedTodoIds.add(todo.id);
      const minutes = Math.ceil((Date.now() - new Date(dueDate).getTime()) / 60_000);

      if (dueDate === todayStr) {
        this.show(
          '今日待办提醒',
          `${todo.title} — 今天截止，别忘了完成哦`,
        );
      } else if (minutes < 24 * 60) {
        const hours = Math.floor(minutes / 60);
        this.show(
          '待办已过期',
          `${todo.title} — 已过期 ${hours} 小时，抓紧处理吧`,
        );
      } else {
        const days = Math.floor(minutes / (24 * 60));
        this.show(
          '待办已过期',
          `${todo.title} — 已过期 ${days} 天，还需要继续吗？`,
        );
      }
    }
  }

  private checkCalendarEvents(): void {
    const events = this.store.get('calendarEvents', []) as unknown as CalendarEvent[];
    const now = Date.now();

    for (const event of events) {
      if (event.checkedIn || this.notifiedEventUids.has(event.uid)) continue;

      const startTime = new Date(event.dtstart).getTime();
      const endTime = event.dtend ? new Date(event.dtend).getTime() : startTime + 60 * 60_000;
      const diff = startTime - now;

      if (diff > 0 && diff <= NotificationService.EVENT_WARNING_MS) {
        this.notifiedEventUids.add(event.uid);
        const mins = Math.ceil(diff / 60_000);
        this.show(
          '日程提醒',
          `${event.summary} — ${mins} 分钟后开始，准备好了吗？`,
        );
      } else if (diff <= 0 && now <= endTime) {
        this.notifiedEventUids.add(event.uid);
        const remaining = Math.ceil((endTime - now) / 60_000);
        this.show(
          '日程进行中',
          `${event.summary} — 已开始，还剩 ${remaining} 分钟`,
        );
      }
    }
  }

  private show(title: string, body: string): void {
    if (!Notification.isSupported()) return;

    this.logger.info(`通知: ${title} | ${body}`);
    const notification = new Notification({ title, body });
    notification.on('click', () => {
      const win = this.windowManager.getMainWindow();
      if (win) {
        win.show();
        win.focus();
      }
    });
    notification.show();
  }
}
