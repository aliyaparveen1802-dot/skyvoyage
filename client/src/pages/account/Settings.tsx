import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Accessibility,
  Bell,
  Eye,
  Globe,
  KeyRound,
  Languages,
  Lock,
  LogOut,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  useProfile,
  useUpdatePreferences,
} from '@/hooks/queries/useProfile';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/queries/useNotifications';
import { PageHeader } from '@/components/common/Brand';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Input, Select } from '@/components/common/FormFields';
import { Modal } from '@/components/common/Modal';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/common/States';
import { CABINS, SUPPORTED_CURRENCIES } from '@/constants';
import { cn } from '@/utils/cn';
import type { CabinClass, NotificationPreferences, UserPreferences } from '@/types';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'ar', label: 'العربية' },
];

type AccessibilityPreferences = UserPreferences['accessibility'];

type PreferencesDraft = {
  currency: string;
  language: string;
  cabin: CabinClass;
  distanceUnit: 'km' | 'mi';
};

const NOTIF_ROWS: Array<{ key: keyof NotificationPreferences; label: string; description: string }> = [
  { key: 'push', label: 'Push notifications', description: 'Real-time alerts on this device' },
  { key: 'email', label: 'Email updates', description: 'Trip summaries sent to your inbox' },
  { key: 'gateChanges', label: 'Gate changes', description: 'When your departure gate moves' },
  { key: 'boarding', label: 'Boarding alerts', description: 'Boarding start and final call' },
  { key: 'delays', label: 'Delays and cancellations', description: 'Schedule changes on your flights' },
  { key: 'promotions', label: 'Promotions', description: 'Occasional fare deals and offers' },
];

const ACCESSIBILITY_ROWS: Array<{
  key: keyof AccessibilityPreferences;
  label: string;
  description: string;
}> = [
  {
    key: 'reduceMotion',
    label: 'Reduce motion',
    description: 'Minimise animations and transitions across the app',
  },
  { key: 'largeText', label: 'Larger text', description: 'Increase the default text size' },
  { key: 'highContrast', label: 'High contrast', description: 'Stronger colour separation for readability' },
  {
    key: 'voiceInstructions',
    label: 'Voice instructions',
    description: 'Spoken guidance for airport navigation steps',
  },
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

function Section({
  id,
  title,
  description,
  icon,
  children,
  footer,
}: {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="card p-4 sm:p-5" aria-labelledby={id}>
      <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {icon && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h2 id={id} className="text-sm font-bold uppercase tracking-wide text-muted">
              {title}
            </h2>
            {description && <p className="mt-1 text-xs text-muted">{description}</p>}
          </div>
        </div>
      </div>
      <div className="mt-3">{children}</div>
      {footer && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">{footer}</div>
      )}
    </section>
  );
}

const passwordSchema = z
  .object({
    current: z.string().min(8, 'Enter your current password (8+ characters)'),
    next: z.string().min(8, 'New password must be at least 8 characters'),
    confirm: z.string().min(8, 'Confirm your new password'),
  })
  .refine((values) => values.next === values.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();

  const profileQuery = useProfile();
  const updatePreferences = useUpdatePreferences();
  const notifPreferencesQuery = useNotificationPreferences();
  const updateNotifPreferences = useUpdateNotificationPreferences();

  const [prefs, setPrefs] = useState<PreferencesDraft | null>(null);
  const [accessibility, setAccessibility] = useState<AccessibilityPreferences | null>(null);
  const [privacy, setPrivacy] = useState({ marketing: false, dataSharing: false });
  const [motionFeedback, setMotionFeedback] = useState('');
  const [passwordOpen, setPasswordOpen] = useState(false);

  const syncedRef = useRef(false);
  useEffect(() => {
    const stored = profileQuery.data?.preferences;
    if (!stored || syncedRef.current) return;
    syncedRef.current = true;
    setPrefs({
      currency: stored.currency,
      language: stored.language,
      cabin: stored.cabin,
      distanceUnit: stored.distanceUnit,
    });
    setAccessibility(stored.accessibility);
  }, [profileQuery.data]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', accessibility?.reduceMotion ?? false);
  }, [accessibility?.reduceMotion]);

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: '', next: '', confirm: '' },
  });

  useEffect(() => {
    if (passwordOpen) resetPassword({ current: '', next: '', confirm: '' });
  }, [passwordOpen, resetPassword]);

  const savePreferences = () => {
    if (!prefs) return;
    updatePreferences.mutate(prefs, {
      onSuccess: () => {
        toast({
          title: 'Preferences saved',
          description: 'Currency, language, cabin and distance unit updated.',
          variant: 'success',
        });
      },
      onError: (error: Error) => {
        toast({ title: 'Could not save preferences', description: error.message, variant: 'error' });
      },
    });
  };

  const toggleNotification = (
    key: keyof NotificationPreferences,
    label: string,
    value: boolean,
  ) => {
    const current = notifPreferencesQuery.data?.preferences;
    if (!current) return;
    const next: NotificationPreferences = { ...current, [key]: value };
    updateNotifPreferences.mutate(next, {
      onSuccess: () => {
        toast({
          title: 'Notification preference saved',
          description: `${label} turned ${value ? 'on' : 'off'}.`,
          variant: 'success',
        });
      },
      onError: (error: Error) => {
        toast({ title: 'Could not save preference', description: error.message, variant: 'error' });
      },
    });
  };

  const toggleAccessibility = (
    key: keyof AccessibilityPreferences,
    label: string,
    value: boolean,
  ) => {
    if (!accessibility) return;
    const previous = accessibility;
    const next: AccessibilityPreferences = { ...accessibility, [key]: value };
    setAccessibility(next);
    if (key === 'reduceMotion') {
      setMotionFeedback(value ? 'Reduced motion enabled' : 'Reduced motion disabled');
    }
    updatePreferences.mutate(
      { accessibility: next },
      {
        onSuccess: () => {
          toast({
            title: 'Accessibility saved',
            description: `${label} turned ${value ? 'on' : 'off'}.`,
            variant: 'success',
          });
        },
        onError: (error: Error) => {
          setAccessibility(previous);
          toast({ title: 'Could not save setting', description: error.message, variant: 'error' });
        },
      },
    );
  };

  const savePrivacy = () => {
    toast({
      title: 'Saved locally',
      description:
        'Marketing and data-sharing choices are stored locally in this demo and are not sent to a server.',
      variant: 'success',
    });
  };

  const onChangePassword = () => {
    setPasswordOpen(false);
    toast({
      title: 'Password change not enabled',
      description:
        'Server-side password change is not enabled in this demo mode, so your password was not modified.',
      variant: 'info',
    });
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data || !prefs || !accessibility) {
    return (
      <div className="card">
        <ErrorState
          title="Settings unavailable"
          description="We could not load your preferences."
          onRetry={() => void profileQuery.refetch()}
        />
      </div>
    );
  }

  const notifPreferences = notifPreferencesQuery.data?.preferences;

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Preferences, notifications, privacy and security." />

      <Section
        id="prefs-heading"
        title="Preferences"
        description="Applies across search, prices and trip displays."
        icon={<SlidersHorizontal className="h-4 w-4" aria-hidden />}
        footer={
          <>
            <Button
              onClick={savePreferences}
              loading={updatePreferences.isPending}
              disabled={updatePreferences.isPending}
            >
              Save preferences
            </Button>
            <p className="text-xs text-muted">Changes apply to your whole account.</p>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Display currency"
            value={prefs.currency}
            onChange={(e) => setPrefs({ ...prefs, currency: e.target.value })}
          >
            {SUPPORTED_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
          <Select
            label="Language"
            value={prefs.language}
            onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}
          >
            {LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </Select>
          <Select
            label="Default cabin"
            value={prefs.cabin}
            onChange={(e) => setPrefs({ ...prefs, cabin: e.target.value as CabinClass })}
          >
            {CABINS.map((cabin) => (
              <option key={cabin.value} value={cabin.value}>
                {cabin.label}
              </option>
            ))}
          </Select>
          <Select
            label="Distance unit"
            value={prefs.distanceUnit}
            onChange={(e) => setPrefs({ ...prefs, distanceUnit: e.target.value === 'mi' ? 'mi' : 'km' })}
          >
            <option value="km">Kilometres (km)</option>
            <option value="mi">Miles (mi)</option>
          </Select>
        </div>
      </Section>

      <Section
        id="notif-heading"
        title="Notifications"
        description="Choose which alerts you receive. Changes save immediately."
        icon={<Bell className="h-4 w-4" aria-hidden />}
      >
        {notifPreferencesQuery.isError ? (
          <ErrorState
            title="Notification settings unavailable"
            description="We could not load your notification preferences."
            onRetry={() => void notifPreferencesQuery.refetch()}
          />
        ) : notifPreferencesQuery.isLoading || !notifPreferences ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-line">
            {NOTIF_ROWS.map((row) => (
              <Toggle
                key={row.key}
                label={row.label}
                description={row.description}
                checked={notifPreferences[row.key]}
                disabled={updateNotifPreferences.isPending}
                onChange={(value) => toggleNotification(row.key, row.label, value)}
              />
            ))}
          </div>
        )}
      </Section>

      <Section
        id="a11y-heading"
        title="Accessibility"
        description="Saved to your account and applied as you toggle."
        icon={<Accessibility className="h-4 w-4" aria-hidden />}
      >
        <div className="divide-y divide-line">
          {ACCESSIBILITY_ROWS.map((row) => (
            <Toggle
              key={row.key}
              label={row.label}
              description={row.description}
              checked={accessibility[row.key]}
              disabled={updatePreferences.isPending}
              onChange={(value) => toggleAccessibility(row.key, row.label, value)}
            />
          ))}
        </div>
        <p aria-live="polite" className="mt-2 min-h-4 text-xs text-muted">
          {motionFeedback}
        </p>
      </Section>

      <Section
        id="privacy-heading"
        title="Privacy"
        description="Stored locally in this demo — nothing is sent to a server."
        icon={<Eye className="h-4 w-4" aria-hidden />}
        footer={
          <Button onClick={savePrivacy} variant="secondary">
            Save privacy choices
          </Button>
        }
      >
        <div className="divide-y divide-line">
          <Toggle
            label="Marketing emails"
            description="Product news and fare deals"
            checked={privacy.marketing}
            onChange={(value) => setPrivacy((prev) => ({ ...prev, marketing: value }))}
          />
          <Toggle
            label="Share usage data"
            description="Anonymous analytics to improve the demo"
            checked={privacy.dataSharing}
            onChange={(value) => setPrivacy((prev) => ({ ...prev, dataSharing: value }))}
          />
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Badge tone="warning">Local only</Badge>
          These two choices reset when you reload the page.
        </p>
      </Section>

      <Section
        id="security-heading"
        title="Security"
        description="Keep access to your SkyVoyage account safe."
        icon={<Lock className="h-4 w-4" aria-hidden />}
        footer={
          <Button
            variant="secondary"
            icon={<KeyRound className="h-4 w-4" />}
            onClick={() => setPasswordOpen(true)}
          >
            Change password
          </Button>
        }
      >
        <ul className="space-y-2 text-sm text-muted">
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-hidden />
            Your session token is stored locally and cleared when you sign out.
          </li>
          <li className="flex items-center gap-2">
            <Globe className="h-4 w-4 shrink-0 text-brand" aria-hidden />
            Password changes are disabled in this demo — no credentials are ever transmitted.
          </li>
          <li className="flex items-center gap-2">
            <Languages className="h-4 w-4 shrink-0 text-brand" aria-hidden />
            Account email: {profileQuery.data.user.email}
          </li>
        </ul>
      </Section>

      <section className="card border-error/30 p-4 sm:p-5" aria-labelledby="danger-heading">
        <div className="border-b border-line pb-3">
          <h2 id="danger-heading" className="text-sm font-bold uppercase tracking-wide text-error">
            Danger zone
          </h2>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <LogOut className="h-4 w-4 text-error" aria-hidden /> Sign out of this device
            </p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted">
              Ends your session on this browser. You will need to sign in again to see your trips and
              settings.
            </p>
          </div>
          <Button variant="danger" icon={<LogOut className="h-4 w-4" />} onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </section>

      <Modal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title="Change password"
        description="Demo mode — no password will actually be changed."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPasswordOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="change-password-form">
              Update password
            </Button>
          </>
        }
      >
        <form
          id="change-password-form"
          onSubmit={handlePasswordSubmit(onChangePassword)}
          className="space-y-4"
          noValidate
        >
          <Input
            label="Current password"
            type="password"
            required
            autoComplete="current-password"
            error={passwordErrors.current?.message}
            {...registerPassword('current')}
          />
          <Input
            label="New password"
            type="password"
            required
            autoComplete="new-password"
            hint="At least 8 characters."
            error={passwordErrors.next?.message}
            {...registerPassword('next')}
          />
          <Input
            label="Confirm new password"
            type="password"
            required
            autoComplete="new-password"
            error={passwordErrors.confirm?.message}
            {...registerPassword('confirm')}
          />
          <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-3.5 py-2.5 text-xs text-warning">
            <UserRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Server password change is not enabled in this demo mode, so submitting shows a notice
            instead of changing anything.
          </p>
        </form>
      </Modal>

      <div className="flex items-center gap-2 text-xs text-muted">
        <Palette className="h-3.5 w-3.5" aria-hidden />
        SkyVoyage demo build · preferences persist to your account where the demo API supports it.
      </div>
    </div>
  );
}
