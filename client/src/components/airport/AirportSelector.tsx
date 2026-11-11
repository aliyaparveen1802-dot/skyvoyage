import { AIRPORTS_WITH_GUIDE } from '@/constants';
import { cn } from '@/utils/cn';

interface AirportSelectorProps {
  value: string;
  onChange: (iata: string) => void;
  label?: string;
}

export function AirportSelector({ value, onChange, label = 'Airport' }: AirportSelectorProps) {
  return (
    <div>
      <p className="label" id="airport-selector-label">
        {label}
      </p>
      <div role="group" aria-labelledby="airport-selector-label" className="flex flex-wrap gap-2">
        {AIRPORTS_WITH_GUIDE.map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={value === code}
            onClick={() => onChange(code)}
            className={cn(
              'chip min-h-11 px-4 text-sm',
              value === code && 'chip-active border-brand/40',
            )}
          >
            {code}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">More airports coming soon</p>
    </div>
  );
}
