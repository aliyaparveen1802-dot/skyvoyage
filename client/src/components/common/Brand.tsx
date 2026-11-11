import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function AirlineLogo({ code, name, size = 36 }: { code: string; name: string; size?: number }) {
  const initials = name
    .split(' ')
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(135deg, ${getColor(code)}, ${shade(getColor(code))})`,
      }}
      title={name}
    >
      {initials || code}
    </span>
  );
}

const PALETTE: Record<string, string> = {
  AI: '#C2410C',
  '6E': '#1D4ED8',
  SG: '#DC2626',
  EK: '#B91C1C',
  QR: '#7C2D12',
  EY: '#B45309',
  SQ: '#F59E0B',
  BA: '#1E3A8A',
  LH: '#1D4ED8',
  AF: '#2563EB',
  KL: '#0891B2',
  TK: '#DC2626',
  CX: '#0F766E',
  JL: '#1E40AF',
  QF: '#DC2626',
  AA: '#398BFA',
  UA: '#1E40AF',
  DL: '#1E3A8A',
  B6: '#2563EB',
  LA: '#DC2626',
  SQ2: '#F59E0B',
};

function hash(code: string): number {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) % 360;
  return h;
}

function getColor(code: string): string {
  return PALETTE[code] ?? `hsl(${hash(code)}, 58%, 45%)`;
}

function shade(hex: string): string {
  if (!hex.startsWith('#')) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - 46);
  const g = Math.max(0, ((n >> 8) & 255) - 46);
  const b = Math.max(0, (n & 255) - 46);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
