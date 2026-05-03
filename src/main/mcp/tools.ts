import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { TodoService } from '../services/todoService';
import type { CalendarService } from '../services/calendarService';

export function registerTools(
  server: McpServer,
  todoService: TodoService,
  calendarService: CalendarService
): void {
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
      dueDate: z.string().optional().describe('截止日期 (ISO 8601)'),
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
      dueDate: z.string().optional().describe('新截止日期 (ISO 8601)'),
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
      startDate: z.string().describe('日程开始时间 (ISO 8601)'),
      durationMinutes: z.number().default(60).describe('持续时间（分钟）'),
    },
    ({ id, startDate, durationMinutes }) => {
      const event = todoService.convertToEvent(id, startDate, durationMinutes);
      if (!event) {
        return {
          content: [{ type: 'text' as const, text: `转换失败，未找到待办: ${id}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(event, null, 2) }],
      };
    }
  );

  server.tool('calendar_list', '获取所有日程', {}, () => {
    const events = calendarService.getAll();
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(events, null, 2) }],
    };
  });

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
