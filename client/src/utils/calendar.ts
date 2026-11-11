export interface CalendarEventInput {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
}

function toUtcStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function buildIcs(events: CalendarEventInput[], calendarName = 'SkyVoyage Trips'): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SkyVoyage//Travel Companion//EN',
    `X-WR-CALNAME:${escape(calendarName)}`,
  ];
  const stamp = toUtcStamp(new Date().toISOString());
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escape(e.uid)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toUtcStamp(e.start)}`,
      `DTEND:${toUtcStamp(e.end)}`,
      `SUMMARY:${escape(e.title)}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${escape(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escape(e.location)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function googleCalendarUrl(e: CalendarEventInput): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${toUtcStamp(e.start)}/${toUtcStamp(e.end)}`,
  });
  if (e.description) params.set('details', e.description);
  if (e.location) params.set('location', e.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadTextFile(filename: string, content: string, mime = 'text/calendar'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
