import { dialog } from 'electron';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import ICAL from 'ical.js';
import type { CalendarEvent, Todo } from '../../shared/types';
import type { Store } from 'electron-store';

export class CalendarService {
  private store: Store;

  constructor(store: Store) {
    this.store = store;
  }

  private getEvents(): CalendarEvent[] {
    return (this.store.get('calendarEvents', []) as unknown) as CalendarEvent[];
  }

  private saveEvents(events: CalendarEvent[]): void {
    this.store.set('calendarEvents', events as any);
  }

  getAll(): CalendarEvent[] {
    return this.getEvents();
  }

  create(data: Omit<CalendarEvent, 'uid'>): CalendarEvent {
    const events = this.getEvents();
    const event: CalendarEvent = { ...data, uid: uuidv4() };
    events.push(event);
    this.saveEvents(events);
    return event;
  }

  createBatch(items: Omit<CalendarEvent, 'uid'>[]): CalendarEvent[] {
    const events = this.getEvents();
    const created = items.map((data) => {
      const event: CalendarEvent = { ...data, uid: uuidv4() };
      events.push(event);
      return event;
    });
    this.saveEvents(events);
    return created;
  }

  async importFile(): Promise<CalendarEvent[]> {
    const result = await dialog.showOpenDialog({
      title: '选择 ICS 日历文件',
      filters: [{ name: 'ICS 日历文件', extensions: ['ics'] }],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return [];
    }

    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    const events = this.parseICS(content);

    // 持久化存储
    const existing = this.getEvents();
    const existingUids = new Set(existing.map((e) => e.uid));
    const newEvents = events.filter((e) => !existingUids.has(e.uid));
    this.saveEvents([...existing, ...newEvents]);

    return events;
  }

  delete(uid: string): { success: boolean; reason?: string } {
    const events = this.getEvents();
    const event = events.find((e) => e.uid === uid);
    if (!event) return { success: false, reason: 'not_found' };

    if (event.checkedIn) return { success: false, reason: 'checked_in' };

    const filtered = events.filter((e) => e.uid !== uid);
    this.saveEvents(filtered);

    // 恢复关联待办的计划状态
    if (event.sourceTodoId) {
      const todos = (this.store.get('todos', []) as unknown) as Todo[];
      const todoIdx = todos.findIndex((t) => t.id === event.sourceTodoId);
      if (todoIdx !== -1) {
        todos[todoIdx] = {
          ...todos[todoIdx],
          scheduled: false,
          linkedEventUid: undefined,
          updatedAt: new Date().toISOString(),
        };
        this.store.set('todos', todos as any);
      }
    }

    return { success: true };
  }

  checkIn(uid: string): CalendarEvent | null {
    const events = this.getEvents();
    const index = events.findIndex((e) => e.uid === uid);
    if (index === -1) return null;

    const newCheckedIn = !events[index].checkedIn;
    events[index] = { ...events[index], checkedIn: newCheckedIn };
    this.saveEvents(events);

    // 联动：打卡/取消打卡时同步关联的待办
    const sourceTodoId = events[index].sourceTodoId;
    if (sourceTodoId) {
      const todos = (this.store.get('todos', []) as unknown) as Todo[];
      const todoIdx = todos.findIndex((t) => t.id === sourceTodoId);
      if (todoIdx !== -1) {
        todos[todoIdx] = {
          ...todos[todoIdx],
          completed: newCheckedIn,
          updatedAt: new Date().toISOString(),
        };
        this.store.set('todos', todos as any);
      }
    }

    return events[index];
  }

  private parseICS(content: string): CalendarEvent[] {
    const jcalData = ICAL.parse(content);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    return vevents.map((vevent) => {
      const event = new ICAL.Event(vevent);
      const startDate = event.startDate;
      const endDate = event.endDate;

      return {
        uid: event.uid,
        summary: event.summary,
        description: event.description || undefined,
        dtstart: startDate.toJSDate().toISOString(),
        dtend: endDate ? endDate.toJSDate().toISOString() : undefined,
        location: event.location || undefined,
        allDay: startDate.isDate,
      };
    });
  }
}
