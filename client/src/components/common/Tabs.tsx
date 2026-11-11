import { useId, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

export function Tabs<T extends string>({ items, value, onChange, ariaLabel, className }: TabsProps<T>) {
  const baseId = useId();
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex w-full gap-1 overflow-x-auto rounded-xl border border-line bg-canvas p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            id={`${baseId}-${item.value}`}
            aria-selected={active}
            aria-controls={`${baseId}-${item.value}-panel`}
            onClick={() => onChange(item.value)}
            className={cn(
              'flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-[13px] font-semibold transition-all duration-200',
              active ? 'bg-brand-soft text-brand shadow-[0_0_14px_rgba(230,255,25,0.18)]' : 'text-muted hover:text-ink',
            )}
          >
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  active ? 'bg-brand text-navy' : 'bg-line/70 text-muted',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
