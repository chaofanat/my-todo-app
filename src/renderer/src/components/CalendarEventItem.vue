<template>
  <div :class="['event-item', status]">
    <div class="event-time-badge">
      <span :class="['time-dot', status]"></span>
      <div class="time-line"></div>
    </div>
    <div class="event-content">
      <div class="event-header">
        <span class="event-time">{{ timeRange }}</span>
        <span v-if="event.allDay" class="all-day-tag">全天</span>
        <span v-if="hasConflict" class="conflict-tag">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          时间冲突
        </span>
        <span v-if="status === 'ongoing'" class="ongoing-tag">进行中</span>
        <span v-if="event.checkedIn" class="checked-tag">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          已打卡
        </span>
        <span v-else-if="status === 'ended'" class="missed-tag">未打卡</span>
      </div>
      <div class="event-title">{{ event.summary }}</div>
      <p v-if="event.description" class="event-desc">{{ event.description }}</p>
      <div class="event-footer">
        <span v-if="event.location" class="event-location">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {{ event.location }}
        </span>
      </div>
    </div>
    <div class="actions">
      <button
        v-if="status === 'ended' || status === 'ongoing'"
        :class="['checkin-btn', { checked: event.checkedIn }]"
        @click="$emit('checkIn', event.uid)"
        :title="event.checkedIn ? '取消打卡' : '打卡'"
      >
        <svg v-if="event.checkedIn" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </button>
      <button v-if="!event.checkedIn" class="delete-btn" @click="$emit('delete', event.uid)" title="删除">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import type { CalendarEvent } from '../../../shared/types';
import { utcToLocal, utcToLocalDate, utcToLocalTime, getEffectiveTimezone } from '../../../shared/timezone';

const tz = ref(getEffectiveTimezone('system'));

onMounted(async () => {
  if (window.electronAPI) {
    const saved = await window.electronAPI.store.get<string>('user.preferences.timezone');
    if (saved) tz.value = getEffectiveTimezone(saved);
  }
});

const props = defineProps<{
  event: CalendarEvent;
  allEvents: CalendarEvent[];
}>();

defineEmits<{
  delete: [uid: string];
  checkIn: [uid: string];
}>();

const now = ref(Date.now());
let timer: ReturnType<typeof setInterval>;

onMounted(() => {
  timer = setInterval(() => { now.value = Date.now(); }, 30000);
});

onUnmounted(() => clearInterval(timer));

const status = computed(() => {
  if (props.event.allDay) return '';
  const start = new Date(props.event.dtstart).getTime();
  const end = props.event.dtend ? new Date(props.event.dtend).getTime() : start + 3600000;
  const t = now.value;

  if (t >= start && t < end) return 'ongoing';
  if (t >= end) return 'ended';
  return '';
});

const hasConflict = computed(() => {
  if (props.event.allDay) return false;
  const start = new Date(props.event.dtstart).getTime();
  const end = props.event.dtend ? new Date(props.event.dtend).getTime() : start + 3600000;

  return props.allEvents.some((other) => {
    if (other.uid === props.event.uid || other.allDay) return false;
    const oStart = new Date(other.dtstart).getTime();
    const oEnd = other.dtend ? new Date(other.dtend).getTime() : oStart + 3600000;
    return start < oEnd && oStart < end;
  });
});

const timeRange = computed(() => {
  if (props.event.allDay) {
    return formatLocalDate(props.event.dtstart);
  }
  const startStr = formatLocalTime(props.event.dtstart);
  if (props.event.dtend) {
    return `${formatLocalDate(props.event.dtstart)} ${startStr} - ${formatLocalTime(props.event.dtend)}`;
  }
  return `${formatLocalDate(props.event.dtstart)} ${startStr}`;
});

function formatLocalDate(utcIso: string) {
  const localDateStr = utcToLocalDate(utcIso, tz.value);
  const todayStr = utcToLocalDate(new Date().toISOString(), tz.value);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = utcToLocalDate(tomorrow.toISOString(), tz.value);
  if (localDateStr === todayStr) return '今天';
  if (localDateStr === tomorrowStr) return '明天';
  const [_, m, d] = localDateStr.split('-');
  return `${parseInt(m)}月${parseInt(d)}日`;
}

function formatLocalTime(utcIso: string) {
  return utcToLocalTime(utcIso, tz.value);
}
</script>

<style scoped>
.event-item {
  display: flex;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 8px;
  margin-bottom: 4px;
  transition: all 0.2s ease;
  position: relative;
  border: 1px solid transparent;
}

.event-item:hover {
  background: var(--paper-warm);
  border-color: var(--border);
}

/* 进行中 */
.event-item.ongoing {
  border-color: var(--green);
  background: var(--green-bg);
}

.event-item.ongoing:hover {
  background: color-mix(in srgb, var(--green-bg) 80%, var(--paper-warm));
}

/* 已结束 - 已打卡 */
.event-item.ended:not(.checked) {
  opacity: 0.55;
}

/* 已结束 - 未打卡 */
.event-item.ended {
  opacity: 0.65;
}

.event-item:hover .actions {
  opacity: 1;
}

.event-time-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 6px;
  flex-shrink: 0;
  width: 12px;
}

.time-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-soft);
  flex-shrink: 0;
}

.time-dot.conflict { background: #f59e0b; }
.time-dot.ongoing { background: var(--green); box-shadow: 0 0 0 3px rgba(90, 122, 92, 0.2); }
.time-dot.ended { background: var(--ink-faint); }

.time-line {
  flex: 1;
  width: 1px;
  background: var(--border);
  margin-top: 4px;
}

.event-content {
  flex: 1;
  min-width: 0;
}

.event-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.event-time {
  font-size: 12px;
  color: var(--ink-faint);
  letter-spacing: 0.3px;
}

.all-day-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--accent-bg);
  color: var(--accent);
}

.conflict-tag {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  background: #fef3c7;
  color: #b45309;
}

.ongoing-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--green-bg);
  color: var(--green);
  font-weight: 500;
}

.checked-tag {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--green-bg);
  color: var(--green);
}

.missed-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--paper-warm);
  color: var(--ink-faint);
}

.event-title {
  font-size: 14px;
  font-weight: 450;
  color: var(--ink);
  line-height: 1.5;
}

.event-desc {
  font-size: 13px;
  color: var(--ink-faint);
  margin-top: 4px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event-footer {
  margin-top: 6px;
}

.event-location {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--ink-faint);
}

/* Actions */
.actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.ongoing .actions,
.ended .actions {
  opacity: 1;
}

.checkin-btn,
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

.checkin-btn:hover {
  background: var(--green-bg);
  color: var(--green);
}

.checkin-btn.checked {
  color: var(--green);
}

.checkin-btn.checked:hover {
  background: var(--green-bg);
}

.delete-btn {
  opacity: 0;
  transition: all 0.15s;
}

.event-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: var(--accent-bg);
  color: var(--accent);
}
</style>
