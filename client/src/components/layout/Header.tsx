import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, LogOut, Menu, Settings, Plane, User as UserIcon, X, HelpCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotificationsUnread } from '@/hooks/queries/useNotifications';
import { cn } from '@/utils/cn';

export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="SkyVoyage home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-navy shadow-[0_0_18px_rgba(230,255,25,0.4)] transition-shadow duration-300 group-hover:shadow-[0_0_26px_rgba(230,255,25,0.6)]">
        <Plane className="h-5 w-5 -rotate-45 transition-transform duration-300 group-hover:-rotate-0" aria-hidden />
      </span>
      {!compact && (
        <span className={cn('text-lg font-extrabold tracking-tight text-white', light ? 'text-white' : 'text-white')}>
          Sky<span className="text-brand">Voyage</span>
        </span>
      )}
    </Link>
  );
}

const publicLinks = [
  { to: '/', label: 'Flights' },
  { to: '/airport-guide', label: 'Airport guide' },
  { to: '/flight-tracking', label: 'Flight tracking' },
  { to: '/help', label: 'Help' },
];

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-navy ring-2 ring-brand/30 transition hover:bg-brand-dark hover:shadow-[0_0_16px_rgba(230,255,25,0.45)]"
      >
        {initials}
        <span className="sr-only">Account menu</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            role="menu"
            className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-xl border border-line bg-surface py-1.5 shadow-pop"
          >
            <div className="border-b border-line px-4 py-3">
              <p className="truncate text-sm font-semibold text-ink">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
            <MenuLink to="/dashboard" icon={<Plane className="h-4 w-4" />} onClick={() => setOpen(false)}>
              Dashboard
            </MenuLink>
            <MenuLink to="/profile" icon={<UserIcon className="h-4 w-4" />} onClick={() => setOpen(false)}>
              Profile
            </MenuLink>
            <MenuLink to="/settings" icon={<Settings className="h-4 w-4" />} onClick={() => setOpen(false)}>
              Settings
            </MenuLink>
            <button
              role="menuitem"
              onClick={() => {
                logout();
                setOpen(false);
                navigate('/login');
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-error transition hover:bg-error-soft"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({
  to,
  children,
  icon,
  onClick,
}: {
  to: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-canvas"
    >
      {icon}
      {children}
    </Link>
  );
}

export function Header() {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { data: unreadData } = useNotificationsUnread();
  const unread = unreadData?.unread ?? 0;

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-[#07131C]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {publicLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'text-white'
                    : 'text-muted hover:translate-y-px hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {l.label}
                  <span
                    className={cn(
                      'absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-brand transition-all duration-300',
                      isActive ? 'opacity-100 shadow-[0_0_10px_rgba(230,255,25,0.8)]' : 'opacity-0',
                    )}
                    aria-hidden
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-10 w-24 animate-[skeleton_1.4s_ease-in-out_infinite] rounded-xl bg-line/70" />
          ) : user ? (
            <>
              <Link
                to="/notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-surface hover:text-white"
                aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-navy shadow-[0_0_10px_rgba(230,255,25,0.7)]">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
              <div className="hidden sm:block">
                <UserMenu />
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="btn-ghost text-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary h-10 rounded-xl px-4 text-sm">
                Create account
              </Link>
            </div>
          )}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl text-ink transition hover:bg-surface lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line bg-[#07131C] lg:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {publicLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-brand bg-brand-soft text-brand'
                        : 'border-transparent text-ink hover:bg-surface',
                    )
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              <div className="pt-2">
                {user ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/dashboard" className="btn-secondary text-sm">
                      Dashboard
                    </Link>
                    <Link to="/settings" className="btn-secondary text-sm">
                      Settings
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/login" className="btn-secondary text-sm">
                      Sign in
                    </Link>
                    <Link to="/register" className="btn-primary text-sm">
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-1">
          <Logo />
          <p className="mt-3 text-sm leading-relaxed text-muted">
            One app. Every flight. Every airport. Every step of your journey.
          </p>
        </div>
        <FooterCol
          title="Product"
          links={[
            { to: '/search', label: 'Search flights' },
            { to: '/flight-tracking', label: 'Flight tracking' },
            { to: '/airport-guide', label: 'Airport guide' },
            { to: '/airport-explorer', label: 'Airport explorer' },
          ]}
        />
        <FooterCol
          title="Account"
          links={[
            { to: '/login', label: 'Sign in' },
            { to: '/register', label: 'Create account' },
            { to: '/dashboard', label: 'Dashboard' },
            { to: '/settings', label: 'Settings' },
          ]}
        />
        <FooterCol
          title="Support"
          links={[
            { to: '/help', label: 'Help centre' },
            { to: '/onboarding', label: 'Product tour' },
          ]}
        />
      </div>
      <div className="border-t border-line px-4 py-5 text-center text-xs text-muted sm:px-6 lg:px-8">
        © {new Date().getFullYear()} SkyVoyage. Demo product — flight, price and airport data shown are sample data
        from a mock provider unless otherwise labelled.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<{ to: string; label: string }> }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.to + l.label}>
            <Link to={l.to} className="text-sm text-muted transition hover:text-brand">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HelpShortcut() {
  return (
    <Link
      to="/help"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-brand"
    >
      <HelpCircle className="h-4 w-4" /> Help
    </Link>
  );
}
