<template>
  <div class="todo-view">
    <!-- Hero Section -->
    <div class="hero">
      <div class="hero-text">
        <h1 class="hero-title">{{ greeting }}</h1>
        <p class="hero-sub">{{ heroSub }}</p>
      </div>
      <div class="hero-actions">
        <button class="btn-ghost" @click="importCalendar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          导入日历
        </button>
        <button class="btn-primary" @click="openAddDialog">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新建待办
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <button
        v-for="f in filters"
        :key="f.value"
        :class="['filter-pill', { active: currentFilter === f.value }]"
        @click="currentFilter = f.value"
      >
        {{ f.label }}
        <span class="filter-count">{{ f.count }}</span>
      </button>
    </div>

    <!-- Content grouped by date -->
    <div class="content-list">
      <template v-for="group in groupedItems" :key="group.date">
        <div class="date-group">
          <div class="date-header">
            <span class="date-label">{{ group.dateLabel }}</span>
            <span class="date-count">{{ group.items.length }} 项</span>
          </div>
          <TransitionGroup name="item" tag="div" class="group-items">
            <template v-for="item in group.items" :key="item.type === 'todo' ? item.data.id : item.data.uid">
              <TodoItem
                v-if="item.type === 'todo'"
                :todo="item.data"
                @toggle="toggleTodo"
                @delete="deleteTodo"
                @schedule="openScheduleDialog"
              />
              <CalendarEventItem
                v-else
                :event="item.data"
                :all-events="group.events"
                @delete="deleteCalendarEvent"
                @check-in="checkInEvent"
              />
            </template>
          </TransitionGroup>
        </div>
      </template>

      <!-- Empty State -->
      <div v-if="groupedItems.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
          </svg>
        </div>
        <p class="empty-title">{{ emptyTitle }}</p>
        <p class="empty-desc">{{ emptyDesc }}</p>
      </div>
    </div>

    <!-- Add Dialog -->
    <Transition name="overlay">
      <div v-if="showAddDialog" class="dialog-overlay" @click.self="closeAddDialog">
        <Transition name="dialog">
          <div v-if="showAddDialog" class="dialog">
            <div class="dialog-header">
              <h2>新建待办</h2>
              <button class="dialog-close" @click="closeAddDialog">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form @submit.prevent="addTodo" class="dialog-form">
              <div class="field">
                <input
                  ref="titleInput"
                  v-model="newTodo.title"
                  type="text"
                  placeholder="写点什么..."
                  class="field-title"
                  required
                />
              </div>
              <div class="field">
                <textarea
                  v-model="newTodo.description"
                  placeholder="添加描述（可选）"
                  class="field-desc"
                  rows="3"
                ></textarea>
              </div>
              <div class="field-row">
                <div class="field">
                  <label class="field-label">优先级</label>
                  <div class="priority-picker">
                    <button
                      v-for="p in priorities"
                      :key="p.value"
                      type="button"
                      :class="['priority-opt', p.value, { active: newTodo.priority === p.value }]"
                      @click="newTodo.priority = p.value"
                    >
                      {{ p.label }}
                    </button>
                  </div>
                </div>
                <div class="field">
                  <label class="field-label">截止日期</label>
                  <input v-model="newTodo.dueDate" type="date" class="field-date" />
                </div>
              </div>
              <div class="dialog-footer">
                <button type="button" class="btn-cancel" @click="closeAddDialog">取消</button>
                <button type="submit" class="btn-submit" :disabled="!newTodo.title.trim()">创建</button>
              </div>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- Schedule Dialog -->
    <Transition name="overlay">
      <div v-if="showScheduleDialog" class="dialog-overlay" @click.self="closeScheduleDialog">
        <Transition name="dialog">
          <div v-if="showScheduleDialog" class="dialog">
            <div class="dialog-header">
              <h2>安排为日程</h2>
              <button class="dialog-close" @click="closeScheduleDialog">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form @submit.prevent="convertToEvent" class="dialog-form">
              <p class="schedule-hint">「{{ schedulingTodo?.title }}」将转为日程</p>
              <div class="field-row">
                <div class="field">
                  <label class="field-label">开始时间</label>
                  <input v-model="scheduleData.startDate" type="datetime-local" class="field-date" required />
                </div>
                <div class="field">
                  <label class="field-label">持续时间</label>
                  <div class="duration-picker">
                    <button
                      v-for="d in durations"
                      :key="d.value"
                      type="button"
                      :class="['duration-opt', { active: scheduleData.duration === d.value }]"
                      @click="scheduleData.duration = d.value"
                    >
                      {{ d.label }}
                    </button>
                  </div>
                </div>
              </div>
              <div class="dialog-footer">
                <button type="button" class="btn-cancel" @click="closeScheduleDialog">取消</button>
                <button type="submit" class="btn-submit" :disabled="!scheduleData.startDate">确认安排</button>
              </div>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import type { Todo, CalendarEvent } from '../../../shared/types';
import TodoItem from '../components/TodoItem.vue';
import CalendarEventItem from '../components/CalendarEventItem.vue';

const todos = ref<Todo[]>([]);
const calendarEvents = ref<CalendarEvent[]>([]);
const showAddDialog = ref(false);
const currentFilter = ref<'all' | 'active' | 'completed' | 'events'>('events');
const titleInput = ref<HTMLInputElement | null>(null);

const newTodo = ref({
  title: '',
  description: '',
  priority: 'medium' as 'low' | 'medium' | 'high',
  dueDate: '',
});

const priorities = [
  { value: 'low' as const, label: '低' },
  { value: 'medium' as const, label: '中' },
  { value: 'high' as const, label: '高' },
];

// Schedule dialog
const showScheduleDialog = ref(false);
const schedulingTodo = ref<Todo | null>(null);
const scheduleData = ref({
  startDate: '',
  duration: 30,
});

const durations = [
  { value: 15, label: '15 分钟' },
  { value: 30, label: '30 分钟' },
  { value: 60, label: '1 小时' },
  { value: 90, label: '1.5 小时' },
  { value: 120, label: '2 小时' },
  { value: 180, label: '3 小时' },
];

type ItemType = { type: 'todo'; data: Todo } | { type: 'event'; data: CalendarEvent };

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早上好';
  if (h < 18) return '下午好';
  return '晚上好';
});

const completedCount = computed(() => todos.value.filter((t) => t.completed).length);

const heroSub = computed(() => {
  const total = todos.value.length + calendarEvents.value.length;
  if (total === 0) return '还没有待办或日程';
  const parts: string[] = [];
  if (todos.value.length > 0) {
    const active = todos.value.filter((t) => !t.completed).length;
    parts.push(`${todos.value.length} 个待办`);
    if (active > 0) parts.push(`${active} 个待完成`);
  }
  if (calendarEvents.value.length > 0) {
    parts.push(`${calendarEvents.value.length} 个日程`);
  }
  return parts.join(' · ');
});

const filters = computed(() => [
  { label: '日程', value: 'events' as const, count: calendarEvents.value.length },
  { label: '待办', value: 'active' as const, count: todos.value.filter((t) => !t.completed).length },
  { label: '已完成', value: 'completed' as const, count: completedCount.value },
  { label: '全部', value: 'all' as const, count: todos.value.length + calendarEvents.value.length },
]);

const filteredItems = computed((): ItemType[] => {
  let items: ItemType[] = [];
  switch (currentFilter.value) {
    case 'active':
      items = todos.value.filter((t) => !t.completed).map((t) => ({ type: 'todo' as const, data: t }));
      break;
    case 'completed':
      items = todos.value.filter((t) => t.completed).map((t) => ({ type: 'todo' as const, data: t }));
      break;
    case 'events':
      items = calendarEvents.value.map((e) => ({ type: 'event' as const, data: e }));
      break;
    default:
      items = [
        ...todos.value.map((t) => ({ type: 'todo' as const, data: t })),
        ...calendarEvents.value.map((e) => ({ type: 'event' as const, data: e })),
      ];
  }
  return items;
});

const groupedItems = computed(() => {
  const groups = new Map<string, ItemType[]>();

  for (const item of filteredItems.value) {
    let dateKey: string;
    if (item.type === 'todo') {
      dateKey = item.data.dueDate || 'no-date';
    } else {
      dateKey = item.data.dtstart.split('T')[0];
    }
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(item);
  }

  // Sort groups by date
  const sorted = [...groups.entries()].sort(([a], [b]) => {
    if (a === 'no-date') return 1;
    if (b === 'no-date') return -1;
    return a.localeCompare(b);
  });

  return sorted.map(([date, items]) => {
    // 组内排序：日程按开始时间，待办排后面
    items.sort((a, b) => {
      const getTime = (item: ItemType) => {
        if (item.type === 'event') return new Date(item.data.dtstart).getTime();
        if (item.type === 'todo' && item.data.dueDate) return new Date(item.data.dueDate).getTime() + 86400000;
        return Infinity;
      };
      return getTime(a) - getTime(b);
    });
    let dateLabel: string;
    if (date === 'no-date') {
      dateLabel = '无截止日期';
    } else {
      const d = new Date(date + 'T00:00:00');
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

      if (targetDate.getTime() === today.getTime()) {
        dateLabel = '今天';
      } else if (targetDate.getTime() === tomorrow.getTime()) {
        dateLabel = '明天';
      } else {
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        dateLabel = `${d.getMonth() + 1}月${d.getDate()}日 周${weekdays[d.getDay()]}`;
      }
    }
    const events = items
      .filter((i): i is { type: 'event'; data: CalendarEvent } => i.type === 'event')
      .map((i) => i.data);
    return { date, dateLabel, items, events };
  });
});

const emptyTitle = computed(() => {
  if (currentFilter.value === 'active') return '全部完成';
  if (currentFilter.value === 'completed') return '还没有完成的事项';
  if (currentFilter.value === 'events') return '还没有日程';
  return '还没有待办或日程';
});

const emptyDesc = computed(() => {
  if (currentFilter.value === 'active') return '所有事项都已完成，做得好！';
  if (currentFilter.value === 'completed') return '完成一些事项后会在这里显示';
  if (currentFilter.value === 'events') return '点击「导入日历」添加 .ics 日程文件';
  return '点击「新建待办」或「导入日历」开始';
});

onMounted(async () => {
  todos.value = await window.electronAPI.todo.getAll();
  calendarEvents.value = await window.electronAPI.calendar.getAll();
});

function openAddDialog() {
  showAddDialog.value = true;
  nextTick(() => titleInput.value?.focus());
}

function closeAddDialog() {
  showAddDialog.value = false;
  resetNewTodo();
}

async function addTodo() {
  if (!newTodo.value.title.trim()) return;
  const created = await window.electronAPI.todo.create({
    title: newTodo.value.title,
    description: newTodo.value.description || undefined,
    completed: false,
    priority: newTodo.value.priority,
    dueDate: newTodo.value.dueDate || undefined,
  });
  todos.value.unshift(created);
  currentFilter.value = 'active';
  closeAddDialog();
}

async function toggleTodo(id: string) {
  const todo = todos.value.find((t) => t.id === id);
  if (!todo) return;
  const updated = await window.electronAPI.todo.update(id, { completed: !todo.completed });
  if (updated) {
    const index = todos.value.findIndex((t) => t.id === id);
    todos.value[index] = updated;
  }
}

async function deleteTodo(id: string) {
  const success = await window.electronAPI.todo.delete(id);
  if (success) {
    todos.value = todos.value.filter((t) => t.id !== id);
  }
}

async function deleteCalendarEvent(uid: string) {
  const result = await window.electronAPI.calendar.delete(uid);
  if (result.success) {
    // 找到被删日程关联的待办，恢复其状态
    const deleted = calendarEvents.value.find((e) => e.uid === uid);
    if (deleted?.sourceTodoId) {
      const todoIdx = todos.value.findIndex((t) => t.id === deleted.sourceTodoId);
      if (todoIdx !== -1) {
        todos.value[todoIdx] = { ...todos.value[todoIdx], scheduled: false, linkedEventUid: undefined };
      }
    }
    calendarEvents.value = calendarEvents.value.filter((e) => e.uid !== uid);
  }
}

async function checkInEvent(uid: string) {
  const updated = await window.electronAPI.calendar.checkIn(uid);
  if (updated) {
    const index = calendarEvents.value.findIndex((e) => e.uid === uid);
    if (index !== -1) calendarEvents.value[index] = updated;

    // 联动：同步关联待办的完成状态
    if (updated.sourceTodoId) {
      const todoIdx = todos.value.findIndex((t) => t.id === updated.sourceTodoId);
      if (todoIdx !== -1) {
        todos.value[todoIdx] = { ...todos.value[todoIdx], completed: updated.checkedIn ?? false };
      }
    }
  }
}

async function importCalendar() {
  const events = await window.electronAPI.calendar.import();
  if (events.length === 0) return;
  // Reload all events to get the persisted ones
  calendarEvents.value = await window.electronAPI.calendar.getAll();
}

function resetNewTodo() {
  newTodo.value = { title: '', description: '', priority: 'medium', dueDate: '' };
}

function openScheduleDialog(id: string) {
  const todo = todos.value.find((t) => t.id === id);
  if (!todo) return;
  schedulingTodo.value = todo;
  // 默认当前时间
  const now = new Date();
  scheduleData.value = {
    startDate: formatDateTimeLocal(now),
    duration: 30,
  };
  showScheduleDialog.value = true;
}

function closeScheduleDialog() {
  showScheduleDialog.value = false;
  schedulingTodo.value = null;
}

async function convertToEvent() {
  if (!schedulingTodo.value || !scheduleData.value.startDate) return;
  const event = await window.electronAPI.todo.convertToEvent(
    schedulingTodo.value.id,
    scheduleData.value.startDate,
    scheduleData.value.duration,
  );
  if (event) {
    // 更新待办状态为计划执行中，而非删除
    const todoIdx = todos.value.findIndex((t) => t.id === schedulingTodo.value!.id);
    if (todoIdx !== -1) {
      todos.value[todoIdx] = {
        ...todos.value[todoIdx],
        scheduled: true,
        linkedEventUid: event.uid,
      };
    }
    calendarEvents.value.push(event);
  }
  closeScheduleDialog();
}

function formatDateTimeLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
</script>

<style scoped>
.todo-view {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 40px 60px;
}

/* Hero */
.hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
}

.hero-title {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.hero-sub {
  font-size: 13px;
  color: var(--ink-faint);
  letter-spacing: 0.3px;
}

.hero-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* Buttons */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-sans);
}

.btn-primary:hover {
  filter: brightness(0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--shadow-md);
}

.btn-ghost {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: transparent;
  color: var(--ink-light);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-sans);
}

.btn-ghost:hover {
  color: var(--ink);
  border-color: var(--ink-faint);
  background: var(--paper-warm);
}

/* Filters */
.filters {
  display: flex;
  gap: 6px;
  margin-bottom: 24px;
}

.filter-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 20px;
  font-size: 13px;
  color: var(--ink-light);
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-sans);
}

.filter-pill:hover {
  background: var(--paper-warm);
}

.filter-pill.active {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}

.filter-count {
  font-size: 11px;
  opacity: 0.6;
  min-width: 16px;
  text-align: center;
}

.filter-pill.active .filter-count {
  opacity: 0.8;
}

/* Date Groups */
.content-list {
  min-height: 300px;
}

.date-group {
  margin-bottom: 24px;
}

.date-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 8px;
  margin-bottom: 4px;
}

.date-label {
  font-family: var(--font-serif);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-light);
  letter-spacing: 0.5px;
}

.date-count {
  font-size: 12px;
  color: var(--ink-faint);
}

.group-items {
  border-left: 2px solid var(--border);
  padding-left: 12px;
  margin-left: 4px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  color: var(--border);
  margin-bottom: 20px;
  opacity: 0.6;
}

.empty-title {
  font-family: var(--font-serif);
  font-size: 18px;
  color: var(--ink-light);
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 13px;
  color: var(--ink-faint);
  max-width: 280px;
  line-height: 1.6;
}

/* Dialog */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.dialog {
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 12px;
  width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px var(--shadow-md);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.dialog-header h2 {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 600;
  color: var(--ink);
}

.dialog-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  border-radius: var(--radius);
  color: var(--ink-faint);
  cursor: pointer;
  transition: all 0.15s;
}

.dialog-close:hover {
  background: var(--paper-warm);
  color: var(--ink);
}

.dialog-form {
  padding: 20px 24px 24px;
}

.field {
  margin-bottom: 16px;
}

.field-title {
  width: 100%;
  padding: 12px 0;
  border: none;
  border-bottom: 2px solid var(--border);
  background: transparent;
  font-family: var(--font-serif);
  font-size: 20px;
  color: var(--ink);
  outline: none;
  transition: border-color 0.2s;
}

.field-title::placeholder {
  color: var(--ink-faint);
  font-weight: 400;
}

.field-title:focus {
  border-color: var(--accent);
}

.field-desc {
  width: 100%;
  padding: 10px 0;
  border: none;
  border-bottom: 1px solid var(--border);
  background: transparent;
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--ink);
  outline: none;
  resize: vertical;
  min-height: 60px;
  transition: border-color 0.2s;
}

.field-desc::placeholder {
  color: var(--ink-faint);
}

.field-desc:focus {
  border-color: var(--accent-soft);
}

.field-row {
  display: flex;
  gap: 20px;
}

.field-row .field {
  flex: 1;
}

.field-label {
  display: block;
  font-size: 12px;
  color: var(--ink-faint);
  margin-bottom: 8px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.priority-picker {
  display: flex;
  gap: 6px;
}

.priority-opt {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: transparent;
  font-size: 13px;
  color: var(--ink-light);
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-sans);
}

.priority-opt:hover {
  border-color: var(--ink-faint);
}

.priority-opt.active.low {
  background: var(--green-bg);
  border-color: var(--green);
  color: var(--green);
}

.priority-opt.active.medium {
  background: var(--amber-bg);
  border-color: var(--amber);
  color: var(--amber);
}

.priority-opt.active.high {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
}

/* Schedule Dialog */
.schedule-hint {
  font-size: 14px;
  color: var(--ink-light);
  margin-bottom: 16px;
  padding: 10px 12px;
  background: var(--paper-warm);
  border-radius: var(--radius);
  border-left: 3px solid var(--accent-soft);
}

.duration-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.duration-opt {
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: transparent;
  font-size: 12px;
  color: var(--ink-light);
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-sans);
}

.duration-opt:hover {
  border-color: var(--ink-faint);
}

.duration-opt.active {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
}

.field-date {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: transparent;
  font-size: 13px;
  color: var(--ink);
  font-family: var(--font-sans);
  outline: none;
}

.field-date:focus {
  border-color: var(--accent-soft);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
}

.btn-cancel {
  padding: 8px 18px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 13px;
  color: var(--ink-light);
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-sans);
}

.btn-cancel:hover {
  background: var(--paper-warm);
  border-color: var(--ink-faint);
}

.btn-submit {
  padding: 8px 24px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-sans);
}

.btn-submit:hover:not(:disabled) {
  filter: brightness(0.9);
}

.btn-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Transitions */
.item-enter-active {
  transition: all 0.3s ease;
}

.item-leave-active {
  transition: all 0.2s ease;
}

.item-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.item-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.dialog-enter-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.dialog-leave-active {
  transition: all 0.15s ease;
}

.dialog-enter-from {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}

.dialog-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
