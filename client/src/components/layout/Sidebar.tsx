import { NavLink } from 'react-router-dom';
import { dashboardNav, mobileNav } from '@/constants/navigation';
import { useNotificationsUnread } from '@/hooks/queries/useNotifications';
import { Logo } from './Header';
import { cn } from '@/utils/cn';

export function Sidebar() {
  const { data } = useNotificationsUnread();
  const unread = data?.unread ?? 0;

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-r border-line bg-surface lg:block">
      <nav className="flex flex-col gap-1 p-3" aria-label="Dashboard">
        {dashboardNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl border-l-2 px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'border-brand bg-brand-soft text-brand shadow-[inset_0_0_20px_rgba(230,255,25,0.06)]'
                    : 'border-transparent text-muted hover:bg-canvas hover:text-ink',
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {item.to === '/notifications' && unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="absolute bottom-4 left-3 right-3 rounded-xl bg-canvas p-4">
        <p className="text-xs font-semibold text-ink">Need a hand?</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Our help centre covers check-in, baggage, seats and airport navigation.
        </p>
        <NavLink to="/help" className="mt-2 inline-block text-xs font-semibold text-brand hover:underline">
          Open help centre →
        </NavLink>
      </div>
    </aside>
  );
}

export function MobileBottomNav() {
  const { data } = useNotificationsUnread();
  const unread = data?.unread ?? 0;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'relative flex min-w-16 flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-brand' : 'text-muted',
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              {item.label}
              {item.to === '/notifications' && unread > 0 && (
                <span className="absolute right-3 top-1.5 h-2 w-2 rounded-full bg-error" aria-hidden />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export function BrandBar() {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3 lg:hidden">
      <Logo compact />
      <span className="text-sm font-bold text-navy">SkyVoyage</span>
    </div>
  );
}
