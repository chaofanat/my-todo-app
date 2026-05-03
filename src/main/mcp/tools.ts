import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { TodoService } from '../services/todoService';
import type { CalendarService } from '../services/calendarService';
import type { Store } from 'electron-store';
import { validateAndNormalize, getEffectiveTimezone } from '../../shared/timezone';

export function registerTools(
  server: McpServer,
  todoService: TodoService,
  calendarService: CalendarService,
  store: Store
): void {
  const getUserTz = () => getEffectiveTimezone(store.get('user.preferences.timezone', 'system') as string);

  server.tool('todo_list', '获取所有待办事项', {}, () => {
    const todos = todoService.getAll();
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(todos, null, 2) }],
    };
  });

  server.tool(
    'todo_create',
    '创建待办事项',
    {
      title: z.string().describe('待办标题'),
      description: z.string().optional().describe('待办描述'),
      priority: z.enum(['low', 'medium', 'high']).default('medium').describe('优先级'),
      dueDate: z.string().optional().describe('截止日期 (YYYY-MM-DD)'),
    },
    ({ title, description, priority, dueDate }) => {
      const todo = todoService.create({
        title,
        description,
        completed: false,
        priority,
        dueDate,
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(todo, null, 2) }],
      };
    }
  );

  server.tool(
    'todo_update',
    '更新待办事项',
    {
      id: z.string().describe('待办 ID'),
      title: z.string().optional().describe('新标题'),
      description: z.string().optional().describe('新描述'),
      completed: z.boolean().optional().describe('是否完成'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('新优先级'),
      dueDate: z.string().optional().describe('新截止日期 (YYYY-MM-DD)'),
    },
    ({ id, ...updates }) => {
      const todo = todoService.update(id, updates);
      if (!todo) {
        return {
          content: [{ type: 'text' as const, text: `未找到待办: ${id}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(todo, null, 2) }],
      };
    }
  );

  server.tool(
    'todo_delete',
    '删除待办事项',
    {
      id: z.string().describe('待办 ID'),
    },
    ({ id }) => {
      const success = todoService.delete(id);
      return {
        content: [{ type: 'text' as const, text: success ? `已删除待办: ${id}` : `未找到待办: ${id}` }],
        isError: !success,
      };
    }
  );

  server.tool(
    'todo_convertToEvent',
    '将待办事项转换为日程',
    {
      id: z.string().describe('待办 ID'),
      startDate: z.string().describe('日程开始时间 (ISO 8601，需与应用时区一致或无时区后缀)'),
      durationMinutes: z.number().default(60).describe('持续时间（分钟）'),
    },
    ({ id, startDate, durationMinutes }) => {
      const tz = getUserTz();
      const norm = validateAndNormalize(startDate, tz);
      if ('error' in norm) {
        return { content: [{ type: 'text' as const, text: norm.error }], isError: true };
      }
      const event = todoService.convertToEvent(id, norm.result!, durationMinutes);
      if (!event) {
        return { content: [{ type: 'text' as const, text: `转换失败，未找到待办: ${id}` }], isError: true };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(event, null, 2) }] };
    }
  );

  server.tool('calendar_list', '获取所有日程', {}, () => {
    const events = calendarService.getAll();
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(events, null, 2) }],
    };
  });

  server.tool(
    'calendar_create',
    '创建日程',
    {
      summary: z.string().describe('日程标题'),
      description: z.string().optional().describe('日程描述'),
      dtstart: z.string().describe('开始时间 (ISO 8601，需与应用时区一致或无时区后缀)'),
      dtend: z.string().optional().describe('结束时间 (ISO 8601，需与应用时区一致或无时区后缀)'),
      location: z.string().optional().describe('地点'),
      allDay: z.boolean().default(false).describe('是否全天事件'),
    },
    ({ summary, description, dtstart, dtend, location, allDay }) => {
      const tz = getUserTz();
      const normStart = validateAndNormalize(dtstart, tz);
      if ('error' in normStart) {
        return { content: [{ type: 'text' as const, text: `dtstart ${normStart.error}` }], isError: true };
      }
      const normEnd = validateAndNormalize(dtend, tz);
      if ('error' in normEnd) {
        return { content: [{ type: 'text' as const, text: `dtend ${normEnd.error}` }], isError: true };
      }
      const event = calendarService.create({
        summary,
        description,
        dtstart: normStart.result!,
        dtend: normEnd.result,
        location,
        allDay,
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(event, null, 2) }] };
    }
  );

  server.tool(
    'calendar_createBatch',
    '批量创建日程',
    {
      events: z.array(z.object({
        summary: z.string().describe('日程标题'),
        description: z.string().optional().describe('日程描述'),
        dtstart: z.string().describe('开始时间 (ISO 8601)'),
        dtend: z.string().optional().describe('结束时间 (ISO 8601)'),
        location: z.string().optional().describe('地点'),
        allDay: z.boolean().default(false).describe('是否全天事件'),
      })).describe('日程列表'),
    },
    ({ events }) => {
      const tz = getUserTz();
      const normalized: Array<{
        summary: string;
        description?: string;
        dtstart: string;
        dtend?: string;
        location?: string;
        allDay: boolean;
      }> = [];
      for (let i = 0; i < events.length; i++) {
        const e = events[i];
        const normStart = validateAndNormalize(e.dtstart, tz);
        if ('error' in normStart) {
          return { content: [{ type: 'text' as const, text: `events[${i}].dtstart ${normStart.error}` }], isError: true };
        }
        const normEnd = validateAndNormalize(e.dtend, tz);
        if ('error' in normEnd) {
          return { content: [{ type: 'text' as const, text: `events[${i}].dtend ${normEnd.error}` }], isError: true };
        }
        normalized.push({ ...e, dtstart: normStart.result!, dtend: normEnd.result });
      }
      const created = calendarService.createBatch(normalized);
      return { content: [{ type: 'text' as const, text: JSON.stringify(created, null, 2) }] };
    }
  );

  server.tool(
    'calendar_delete',
    '删除日程（已打卡的日程不可删除）',
    {
      uid: z.string().describe('日程 UID'),
    },
    ({ uid }) => {
      const result = calendarService.delete(uid);
      if (!result.success) {
        const reasons: Record<string, string> = {
          not_found: '日程不存在',
          checked_in: '已打卡日程不可删除',
        };
        return {
          content: [{ type: 'text' as const, text: `删除失败: ${reasons[result.reason ?? 'unknown']}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text' as const, text: `已删除日程: ${uid}` }],
      };
    }
  );

  server.tool(
    'calendar_checkIn',
    '日程打卡/取消打卡',
    {
      uid: z.string().describe('日程 UID'),
    },
    ({ uid }) => {
      const event = calendarService.checkIn(uid);
      if (!event) {
        return {
          content: [{ type: 'text' as const, text: `未找到日程: ${uid}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(event, null, 2) }],
      };
    }
  );
}
