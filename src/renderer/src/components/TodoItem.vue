<template>
  <div :class="['todo-item', { completed: todo.completed, scheduled: todo.scheduled && !todo.completed }]">
    <button v-if="todo.scheduled" class="check-btn scheduled-icon" disabled>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    </button>
    <button v-else class="check-btn" @click="$emit('toggle', todo.id)" :aria-label="todo.completed ? '标记为未完成' : '标记为已完成'">
      <svg v-if="!todo.completed" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" fill="var(--green)" stroke="var(--green)" />
        <path d="M8 12l3 3 5-6" stroke="#fff" />
      </svg>
    </button>

    <div class="content">
      <div class="title-row">
        <span class="title">{{ todo.title }}</span>
        <span v-if="todo.scheduled && !todo.completed" class="scheduled-tag">计划执行中</span>
        <span v-else :class="['priority-dot', todo.priority]" :title="priorityLabel"></span>
      </div>
      <p v-if="todo.description" class="desc">{{ todo.description }}</p>
      <div class="meta">
        <span v-if="todo.dueDate" class="due" :class="{ overdue: isOverdue }">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {{ formatDate(todo.dueDate) }}
        </span>
      </div>
    </div>

    <div class="actions">
      <button v-if="!todo.scheduled && !todo.completed" class="schedule-btn" @click="$emit('schedule', todo.id)" title="安排为日程">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      <button class="delete-btn" @click="$emit('delete', todo.id)" title="删除">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Todo } from '../../../shared/types';

const props = defineProps<{
  todo: Todo;
}>();

defineEmits<{
  toggle: [id: string];
  delete: [id: string];
  schedule: [id: string];
}>();

const priorityLabel = computed(() => {
  const labels = { low: '低优先级', medium: '中优先级', high: '高优先级' };
  return labels[props.todo.priority];
});

const isOverdue = computed(() => {
  if (!props.todo.dueDate || props.todo.completed) return false;
  return new Date(props.todo.dueDate) < new Date(new Date().toDateString());
});

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === now.toDateString()) return '今天';
  if (d.toDateString() === tomorrow.toDateString()) return '明天';
  if (d.toDateString() === yesterday.toDateString()) return '昨天';

  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
</script>

<style scoped>
.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  margin-bottom: 4px;
  transition: all 0.2s ease;
  position: relative;
  border: 1px solid transparent;
}

.todo-item:hover {
  background: var(--paper-warm);
  border-color: var(--border);
}

.todo-item:hover .delete-btn {
  opacity: 1;
}

.todo-item.completed {
  opacity: 0.55;
}

.todo-item.completed:hover {
  opacity: 0.75;
}

.todo-item.scheduled {
  border-color: var(--amber);
  background: var(--amber-bg);
}

.todo-item.scheduled:hover {
  background: color-mix(in srgb, var(--amber-bg) 80%, var(--paper-warm));
}

/* Check Button */
.check-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  margin-top: 1px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink-faint);
  transition: all 0.15s;
}

.check-btn:hover {
  color: var(--accent);
  transform: scale(1.1);
}

.check-btn.scheduled-icon {
  cursor: default;
  color: var(--amber);
}

.check-btn.scheduled-icon:hover {
  color: var(--amber);
  transform: none;
}

.todo-item.completed .check-btn {
  color: var(--green);
}

/* Content */
.content {
  flex: 1;
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-size: 14px;
  font-weight: 450;
  color: var(--ink);
  line-height: 1.5;
  transition: all 0.2s;
}

.todo-item.completed .title {
  text-decoration: line-through;
  color: var(--ink-faint);
}

.priority-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.priority-dot.low {
  background: var(--green);
}

.priority-dot.medium {
  background: var(--amber);
}

.priority-dot.high {
  background: var(--accent);
}

.scheduled-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--amber-bg);
  color: var(--amber);
  font-weight: 500;
}

.desc {
  font-size: 13px;
  color: var(--ink-faint);
  margin-top: 4px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta {
  display: flex;
  gap: 12px;
  margin-top: 6px;
}

.due {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--ink-faint);
}

.due.overdue {
  color: var(--accent);
}

/* Actions */
.actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.todo-item:hover .actions {
  opacity: 1;
}

.schedule-btn,
.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: none;
  border: none;
  border-radius: var(--radius);
  color: var(--ink-faint);
  cursor: pointer;
  transition: all 0.15s;
}

.schedule-btn:hover {
  background: var(--accent-bg);
  color: var(--accent-soft);
}

.delete-btn:hover {
  background: var(--accent-bg);
  color: var(--accent);
}
</style>
