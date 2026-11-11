const dateTimeCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string, opts: Intl.DateTimeFormatOptions) {
  const key = timeZone + JSON.stringify(opts);
  let f = dateTimeCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone, ...opts });
    dateTimeCache.set(key, f);
  }
  return f;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatMoney(amount: number, currency = 'INR'): string {
  try {
    const isInr = currency === 'INR';
    return new Intl.NumberFormat(isInr ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: isInr || amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatTime(iso: string, timeZone?: string): string {
  if (!timeZone) {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(
      new Date(iso),
    );
  }
  return formatter(timeZone, { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}

export function formatDate(iso: string, timeZone?: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  if (timeZone) return formatter(timeZone, opts).format(new Date(iso));
  return new Intl.DateTimeFormat('en-GB', opts).format(new Date(iso));
}

export function formatDateShort(iso: string, timeZone?: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (timeZone) return formatter(timeZone, opts).format(new Date(iso));
  return new Intl.DateTimeFormat('en-GB', opts).format(new Date(iso));
}

export function formatWeekday(iso: string, timeZone?: string): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short' };
  if (timeZone) return formatter(timeZone, opts).format(new Date(iso));
  return new Intl.DateTimeFormat('en-GB', opts).format(new Date(iso));
}

/** Day key (YYYY-MM-DD) in a given timezone. */
export function dayKey(iso: string, timeZone = 'UTC'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
  return parts;
}

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (mins < 60) return rtf.format(Math.round(diff / 60000), 'minute');
  const hours = Math.round(abs / 3600000);
  if (hours < 24) return rtf.format(Math.round(diff / 3600000), 'hour');
  const days = Math.round(abs / 86400000);
  if (days < 30) return rtf.format(Math.round(diff / 86400000), 'day');
  return rtf.format(Math.round(diff / 2592000000), 'month');
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateString: string, days: number): string {
  const d = new Date(`${dateString}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function minutesUntil(iso: string, now = Date.now()): number {
  return Math.round((new Date(iso).getTime() - now) / 60000);
}

export function pluralize(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
