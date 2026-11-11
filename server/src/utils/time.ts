const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export function timeZoneOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - date.getTime();
}

export function wallClockIso(utcMs: number, timeZone: string): string {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  const hour = String(Number(map.hour) % 24).padStart(2, '0');
  return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}:${map.second}`;
}

function offsetLabel(timeZone: string, utcMs: number): string {
  const offset = timeZoneOffsetMs(timeZone, new Date(utcMs));
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const hh = String(Math.floor(abs / HOUR_MS)).padStart(2, '0');
  const mm = String(Math.floor((abs % HOUR_MS) / MINUTE_MS)).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

export function isoWithOffset(utcMs: number, timeZone: string): string {
  return `${wallClockIso(utcMs, timeZone)}${offsetLabel(timeZone, utcMs)}`;
}

export function wallClockToUtcMs(wall: string, timeZone: string): number {
  const naive = Date.parse(`${wall}Z`);
  if (Number.isNaN(naive)) return Number.NaN;
  let guess = naive;
  for (let i = 0; i < 2; i++) {
    const offset = timeZoneOffsetMs(timeZone, new Date(guess));
    guess = naive - offset;
  }
  return guess;
}

export function localMinutesInZone(timeZone: string, date: Date = new Date()): number {
  const wall = wallClockIso(date.getTime(), timeZone);
  const hour = Number(wall.slice(11, 13));
  const minute = Number(wall.slice(14, 16));
  return hour * 60 + minute;
}

export function todayInZone(timeZone: string, date: Date = new Date()): string {
  return wallClockIso(date.getTime(), timeZone).slice(0, 10);
}

export function todayUtc(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function addMinutesIso(iso: string, minutes: number): string {
  const ms = Date.parse(iso);
  return new Date(ms + minutes * MINUTE_MS).toISOString();
}

export function minutesBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / MINUTE_MS);
}

export function isWeekend(date: string): boolean {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

export function daysBetween(fromDate: string, toDate: string): number {
  return Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / DAY_MS);
}

export function formatClock(iso: string, timeZone: string): string {
  return wallClockIso(Date.parse(iso), timeZone).slice(11, 16);
}

export function formatOpeningHours(openingHours: string, timeZone: string): string {
  return `${openingHours} (${timeZone})`;
}

export function isOpenAt(openingHours: string, timeZone: string, now: Date = new Date()): boolean {
  const match = /^(\d{1,2}):(\d{2})[–-](\d{1,2}):(\d{2})$/.exec(openingHours.trim());
  if (!match) return true;
  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = Number(match[3]) * 60 + Number(match[4]);
  const current = localMinutesInZone(timeZone, now);
  if (start <= end) return current >= start && current <= end;
  return current >= start || current <= end;
}

export function monthDays(month: string): string[] {
  const [year, mon] = month.split('-').map(Number);
  const count = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const days: string[] = [];
  for (let day = 1; day <= count; day++) {
    days.push(`${month}-${String(day).padStart(2, '0')}`);
  }
  return days;
}

export function nowIso(): string {
  return new Date().toISOString();
}
