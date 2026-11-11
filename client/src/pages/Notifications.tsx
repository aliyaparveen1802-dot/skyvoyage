import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlarmClock,
  Ban,
  Bell,
  CheckCheck,
  CircleCheckBig,
  Clock,
  DoorOpen,
  Luggage,
  PlaneLanding,
  PlaneTakeoff,
  Siren,
  TicketCheck,
} from 'lucide-react';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationPreferences,
  useNotifications,
  useUpdateNotificationPreferences,
} from '@/hooks/queries/useNotifications';
import { useToast } from '@/context/ToastContext';
import { PageHeader } from '@/components/common/Brand';
import { Button } from '@/components/common/Button';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Tabs } from '@/components/common/Tabs';
import { cn } from '@/utils/cn';
import { dayKey, formatDate, relativeTime } from '@/utils/format';
import type { AppNotification, NotificationPreferences, NotificationType } from '@/types';

type FilterTab = 'all' | 'unread';

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  booking_confirmed: CircleCheckBig,
  checkin_available: TicketCheck,
  checkin_reminder: Clock,
  gate_assigned: DoorOpen,
  gate_changed: DoorOpen,
  boarding_started: PlaneTakeoff,
  final_call: Siren,
  flight_delayed: AlarmClock,
  flight_cancelled: Ban,
  flight_landed: PlaneLanding,
  baggage_updated: Luggage,
};

const TYPE_TONE: Record<NotificationType, string> = {
  booking_confirmed: 'bg-success-soft text-success',
  checkin_available: 'bg-brand-soft text-brand',
  checkin_reminder: 'bg-brand-soft text-brand',
  gate_assigned: 'bg-brand-soft text-brand',
  gate_changed: 'bg-warning-soft text-warning',
  boarding_started: 'bg-navy text-white',
  final_call: 'bg-warning-soft text-warning',
  flight_delayed: 'bg-warning-soft text-warning',
  flight_cancelled: 'bg-error-soft text-error',
  flight_landed: 'bg-success-soft text-success',
  baggage_updated: 'bg-brand-soft text-brand',
};

const PREF_ROWS: Array<{ key: keyof NotificationPreferences; label: string; description: string }> = [
  { key: 'push', label: 'Push notifications', description: 'Real-time alerts on this device' },
  { key: 'email', label: 'Email updates', description: 'Trip summaries sent to your inbox' },
  { key: 'gateChanges', label: 'Gate changes', description: 'When your departure gate moves' },
  { key: 'boarding', label: 'Boarding alerts', description: 'Boarding start and final call' },
  { key: 'delays', label: 'Delays and cancellations', description: 'Schedule changes on your flights' },
  { key: 'promotions', label: 'Promotions', description: 'Occasional fare deals and offers' },
];

function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-brand' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
          aria-hidden
        />
      </button>
    </div>
  );
}

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
}) {
  const Icon = TYPE_ICON[notification.type];
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className={cn(
          'card flex w-full items-start gap-3 border-l-4 px-4 py-3.5 text-left transition hover:shadow-[0_8px_24px_rgba(7,19,28,0.35)]',
          notification.read ? 'border-l-transparent' : 'border-l-brand bg-brand-soft/40',
        )}
      >
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            TYPE_TONE[notification.type],
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">{notification.title}</span>
            {!notification.read && (
              <span className="h-2 w-2 rounded-full bg-brand" aria-label="Unread" />
            )}
          </span>
          <span className="mt-0.5 block text-sm leading-snug text-muted">{notification.body}</span>
          <span className="mt-1.5 block text-xs text-muted">
            {formatDate(notification.createdAt)} · {relativeTime(notification.createdAt)}
          </span>
        </span>
      </button>
    </li>
  );
}

function Group({
  title,
  notifications,
  onOpen,
}: {
  title: string;
  notifications: AppNotification[];
  onOpen: (notification: AppNotification) => void;
}) {
  if (notifications.length === 0) return null;
  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{title}</h2>
      <ul className="space-y-3">
        {notifications.map((notification) => (
          <NotificationRow key={notification.id} notification={notification} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  );
}

export default function Notifications() {
  const [tab, setTab] = useState<FilterTab>('all');
  const navigate = useNavigate();
  const { toast } = useToast();

  const notificationsQuery = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const preferencesQuery = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  const notifications = notificationsQuery.data?.notifications ?? [];
  const unread = notificationsQuery.data?.unread ?? 0;

  const filtered = useMemo(() => {
    const list = notifications.filter((n) => (tab === 'all' ? true : !n.read));
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [notifications, tab]);

  const todayKey = dayKey(new Date().toISOString());
  const today = filtered.filter((n) => dayKey(n.createdAt) === todayKey);
  const earlier = filtered.filter((n) => dayKey(n.createdAt) !== todayKey);

  const preferences = preferencesQuery.data?.preferences;

  const handleOpen = (notification: AppNotification) => {
    if (!notification.read) markRead.mutate(notification.id);
    if (notification.href) navigate(notification.href);
  };

  const handleToggle = (key: keyof NotificationPreferences, label: string, value: boolean) => {
    if (!preferences) return;
    const next: NotificationPreferences = { ...preferences, [key]: value };
    updatePreferences.mutate(next, {
      onSuccess: () => {
        toast({
          title: 'Preference saved',
          description: `${label} turned ${value ? 'on' : 'off'}.`,
          variant: 'success',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Could not save preference',
          description: error.message,
          variant: 'error',
        });
      },
    });
  };

  const handleMarkAll = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        toast({ title: 'All caught up', description: 'Every notification is marked as read.', variant: 'success' });
      },
      onError: (error: Error) => {
        toast({ title: 'Could not mark all read', description: error.message, variant: 'error' });
      },
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        subtitle="Booking updates, gate changes and boarding calls."
        actions={
          <Button
            variant="secondary"
            icon={<CheckCheck className="h-4 w-4" />}
            loading={markAllRead.isPending}
            disabled={unread === 0}
            onClick={handleMarkAll}
          >
            Mark all read
          </Button>
        }
      />

      <Tabs
        ariaLabel="Filter notifications"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'all', label: 'All', count: notifications.length },
          { value: 'unread', label: 'Unread', count: unread },
        ]}
      />

      {notificationsQuery.isError ? (
        <div className="card">
          <ErrorState
            title="Notifications unavailable"
            description="We could not load your alerts right now."
            onRetry={() => void notificationsQuery.refetch()}
          />
        </div>
      ) : notificationsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title="No notifications yet"
            description="Booking confirmations, check-in reminders and gate changes will appear here as they happen."
            action={
              <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard')}>
                Back to dashboard
              </button>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title="You are all caught up"
            description="There are no unread notifications waiting for you."
            action={
              <button type="button" className="btn-secondary" onClick={() => setTab('all')}>
                Show all notifications
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          <Group title="Today" notifications={today} onOpen={handleOpen} />
          <Group title="Earlier" notifications={earlier} onOpen={handleOpen} />
        </div>
      )}

      <section className="card p-4 sm:p-5" aria-labelledby="notif-prefs-heading">
        <div className="border-b border-line pb-3">
          <h2 id="notif-prefs-heading" className="text-sm font-bold uppercase tracking-wide text-muted">
            Notification preferences
          </h2>
          <p className="mt-1 text-xs text-muted">Changes save immediately.</p>
        </div>

        {preferencesQuery.isError ? (
          <div className="pt-4">
            <ErrorState
              title="Preferences unavailable"
              description="We could not load your notification settings."
              onRetry={() => void preferencesQuery.refetch()}
            />
          </div>
        ) : preferencesQuery.isLoading || !preferences ? (
          <div className="space-y-3 pt-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-line">
            {PREF_ROWS.map((row) => (
              <Toggle
                key={row.key}
                label={row.label}
                description={row.description}
                checked={preferences[row.key]}
                disabled={updatePreferences.isPending}
                onChange={(value) => handleToggle(row.key, row.label, value)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
