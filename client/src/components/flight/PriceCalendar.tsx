import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PriceCalendarDay } from '@/types';
import { cn } from '@/utils/cn';
import { addDays, formatDateShort, formatMoney, formatWeekday } from '@/utils/format';

interface Props {
  baseDate: string;
  days: PriceCalendarDay[];
  activeDate: string;
  onPick: (date: string) => void;
  onShift: (direction: -1 | 1) => void;
  loading?: boolean;
}

const SPAN = 4;

export function PriceCalendar({ baseDate, days, activeDate, onPick, onShift, loading }: Props) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const dates: string[] = [];
  for (let i = -SPAN; i <= SPAN; i++) dates.push(addDays(baseDate, i));

  return (
    <section aria-label="Price calendar" className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-ink">Flexible on dates?</h2>
          <p className="text-xs text-muted">Estimated one-way prices per person · demo provider</p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => onShift(-1)}
            aria-label="View earlier dates"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition hover:border-brand hover:text-brand"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onShift(1)}
            aria-label="View later dates"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition hover:border-brand hover:text-brand"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:thin]">
        {dates.map((date) => {
          const day = byDate.get(date);
          const active = date === activeDate;
          const unavailable = day ? !day.available : false;
          return (
            <button
              key={date}
              onClick={() => !unavailable && onPick(date)}
              disabled={unavailable}
              aria-pressed={active}
              aria-label={`${formatDateShort(date)}${day ? `, ${formatMoney(day.price)}` : ', no data'}`}
              className={cn(
                'flex min-w-[76px] flex-1 flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition',
                active
                  ? 'border-brand bg-brand text-navy shadow-[0_0_18px_rgba(230,255,25,0.35)]'
                  : 'border-line bg-surface hover:border-brand/50',
                unavailable && 'cursor-not-allowed opacity-45',
              )}
            >
              <span className={cn('text-[11px] font-semibold', active ? 'text-white/80' : 'text-muted')}>
                {formatWeekday(date)}
              </span>
              <span className={cn('text-sm font-bold', active ? 'text-white' : 'text-ink')}>
                {formatDateShort(date)}
              </span>
              <span className={cn('text-xs font-semibold', active ? 'text-white/90' : 'text-brand')}>
                {loading ? '··' : day ? formatMoney(day.price) : '—'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
