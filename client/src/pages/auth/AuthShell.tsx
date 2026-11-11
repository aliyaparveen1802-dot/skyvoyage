import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Plane } from 'lucide-react';
import { cn } from '@/utils/cn';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  panelClassName,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  panelClassName?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-4 py-10">
      <Link to="/" className="mb-6 inline-flex items-center gap-2 self-start text-sm font-semibold text-muted transition hover:text-brand">
        ← Back to home
      </Link>
      <div className={cn('card p-6 sm:p-8', panelClassName)}>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-navy shadow-[0_0_20px_rgba(230,255,25,0.4)]">
          <Plane className="h-6 w-6 -rotate-45" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
    </div>
  );
}
