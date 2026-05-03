import { v4 as uuidv4 } from 'uuid';
import type { Todo, CalendarEvent } from '../../shared/types';
import type { Store } from 'electron-store';

export class TodoService {
  private store: Store;

  constructor(store: Store) {
    this.store = store;
  }

  private getTodos(): Todo[] {
    return (this.store.get('todos', []) as unknown) as Todo[];
  }

  private saveTodos(todos: Todo[]): void {
    this.store.set('todos', todos as any);
  }

  private getCalendarEvents(): CalendarEvent[] {
    return (this.store.get('calendarEvents', []) as unknown) as CalendarEvent[];
  }

  private saveCalendarEvents(events: CalendarEvent[]): void {
    this.store.set('calendarEvents', events as any);
  }

  getAll(): Todo[] {
    return this.getTodos();
  }

  create(data: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>): Todo {
    const todos = this.getTodos();
    const now = new Date().toISOString();
    const newTodo: Todo = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    todos.push(newTodo);
    this.saveTodos(todos);
    return newTodo;
  }

  update(id: string, updates: Partial<Todo>): Todo | null {
    const todos = this.getTodos();
    const index = todos.findIndex((t) => t.id === id);
    if (index === -1) return null;
    todos[index] = { ...todos[index], ...updates, updatedAt: new Date().toISOString() };
    this.saveTodos(todos);
    return todos[index];
  }

  delete(id: string): boolean {
    const todos = this.getTodos();
    const filtered = todos.filter((t) => t.id !== id);
    if (filtered.length === todos.length) return false;
    this.saveTodos(filtered);
    return true;
  }

  convertToEvent(id: string, startDate: string, durationMinutes: number): CalendarEvent | { error: string } | null {
    const todos = this.getTodos();
    const index = todos.findIndex((t) => t.id === id);
    if (index === -1) return null;
    const todo = todos[index];
    if (todo.completed) return { error: '已完成的待办不能转为日程' };

    const start = new Date(startDate);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const eventUid = uuidv4();
    const event: CalendarEvent = {
      uid: eventUid,
      summary: todo.title,
      description: todo.description,
      dtstart: start.toISOString(),
      dtend: end.toISOString(),
      allDay: false,
      sourceTodoId: todo.id,
    };

    // 保存日程
    const events = this.getCalendarEvents();
    events.push(event);
    this.saveCalendarEvents(events);

    // 标记待办为计划执行中，而非删除
    todos[index] = {
      ...todo,
      scheduled: true,
      linkedEventUid: eventUid,
      updatedAt: new Date().toISOString(),
    };
    this.saveTodos(todos);

    return event;
  }
}
