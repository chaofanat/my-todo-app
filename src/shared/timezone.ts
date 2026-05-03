export type TimezoneName = string;

export function getSystemTimezone(): TimezoneName {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function getEffectiveTimezone(tzPref: string): TimezoneName {
  return tzPref === 'system' ? getSystemTimezone() : tzPref;
}

function parseTzOffsetToMs(gmtStr: string): number {
  if (gmtStr === 'GMT' || gmtStr === 'UTC') return 0;
  const match = gmtStr.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === '+' ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = match[3] ? parseInt(match[3], 10) : 0;
  return sign * (hours * 60 + minutes) * 60 * 1000;
}

export function getOffsetMs(utcDate: Date, tz: TimezoneName): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'shortOffset',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });
  const parts = formatter.formatToParts(utcDate);
  const tzPart = parts.find((p) => p.type === 'timeZoneName');
  if (!tzPart) return -utcDate.getTimezoneOffset() * 60 * 1000;
  return parseTzOffsetToMs(tzPart.value);
}

function formatOffset(ms: number): string {
  const sign = ms >= 0 ? '+' : '-';
  const totalMin = Math.abs(ms) / 60000;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `UTC${sign}${h}:${m.toString().padStart(2, '0')}` : `UTC${sign}${h}`;
}

export function localToUtc(datetimeLocal: string, tz: TimezoneName): string {
  const fakeUtc = new Date(datetimeLocal + 'Z');
  const offsetMs = getOffsetMs(fakeUtc, tz);
  const realUtc = new Date(fakeUtc.getTime() - offsetMs);
  return realUtc.toISOString();
}

export function utcToLocal(utcIso: string, tz: TimezoneName): string {
  const utcDate = new Date(utcIso);
  const offsetMs = getOffsetMs(utcDate, tz);
  const localDate = new Date(utcDate.getTime() + offsetMs);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${localDate.getUTCFullYear()}-${pad(localDate.getUTCMonth() + 1)}-${pad(localDate.getUTCDate())}T${pad(localDate.getUTCHours())}:${pad(localDate.getUTCMinutes())}`;
}

export function utcToLocalDate(utcIso: string, tz: TimezoneName): string {
  const utcDate = new Date(utcIso);
  const offsetMs = getOffsetMs(utcDate, tz);
  const localDate = new Date(utcDate.getTime() + offsetMs);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${localDate.getUTCFullYear()}-${pad(localDate.getUTCMonth() + 1)}-${pad(localDate.getUTCDate())}`;
}

export function utcToLocalTime(utcIso: string, tz: TimezoneName): string {
  const utcDate = new Date(utcIso);
  const offsetMs = getOffsetMs(utcDate, tz);
  const localDate = new Date(utcDate.getTime() + offsetMs);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(localDate.getUTCHours())}:${pad(localDate.getUTCMinutes())}`;
}

export function normalizeToUtc(
  isoStr: string,
  tz: TimezoneName,
): { result: string } | { error: string } {
  if (!isoStr) return { error: '空时间字符串' };

  if (isoStr.endsWith('Z')) {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return { error: `无效的 UTC 时间: ${isoStr}` };
    return { result: d.toISOString() };
  }

  const offsetMatch = isoStr.match(/[+-]\d{2}:?\d{2}$/);
  if (offsetMatch) {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return { error: `无效的带偏移时间: ${isoStr}` };
    return { result: d.toISOString() };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) {
    return { result: isoStr };
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(isoStr)) {
    return { result: localToUtc(isoStr, tz) };
  }

  return { error: `无法识别的时间格式: ${isoStr}` };
}

export function validateAndNormalize(
  isoStr: string | undefined,
  userTz: TimezoneName,
): { result: string | undefined } | { error: string } {
  if (!isoStr) return { result: undefined };

  const offsetMatch = isoStr.match(/([+-])(\d{2}):?(\d{2})$/);
  const hasZ = isoStr.endsWith('Z');

  if (offsetMatch) {
    const sign = offsetMatch[1] === '+' ? 1 : -1;
    const inputOffsetMin =
      sign * (parseInt(offsetMatch[2], 10) * 60 + parseInt(offsetMatch[3], 10));

    const tempDate = new Date(isoStr);
    if (isNaN(tempDate.getTime())) return { error: `无效的带偏移时间: ${isoStr}` };

    const userOffsetMs = getOffsetMs(tempDate, userTz);
    const userOffsetMin = userOffsetMs / 60000;

    if (Math.abs(inputOffsetMin - userOffsetMin) > 1) {
      return {
        error:
          `时区不一致：传入时间偏移为 UTC${formatOffset(inputOffsetMin * 60000)}，` +
          `但应用设定时区为 ${userTz} (${formatOffset(userOffsetMs)})。` +
          `请使用应用时区或传入无时区后缀的时间字符串。`,
      };
    }
    return { result: tempDate.toISOString() };
  }

  if (hasZ) {
    const userOffsetMs = getOffsetMs(new Date(isoStr), userTz);
    if (Math.abs(userOffsetMs) > 1) {
      return {
        error:
          `时区不一致：传入时间为 UTC，` +
          `但应用设定时区为 ${userTz} (${formatOffset(userOffsetMs)})。` +
          `请使用应用时区偏移或传入无时区后缀的时间字符串，注意你设定的时间应与应用时区一致。`,
      };
    }
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return { error: `无效的 UTC 时间: ${isoStr}` };
    return { result: d.toISOString() };
  }

  return normalizeToUtc(isoStr, userTz);
}

export function getTimezoneOptions(): { value: string; label: string; offset: string }[] {
  const common = [
    'Pacific/Honolulu',
    'America/Anchorage',
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Moscow',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Bangkok',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Australia/Sydney',
    'Pacific/Auckland',
  ];
  const now = new Date();
  return common.map((tz) => ({
    value: tz,
    label: tz.replace(/_/g, ' '),
    offset: formatOffset(getOffsetMs(now, tz)),
  }));
}
