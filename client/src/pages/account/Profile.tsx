import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Info, Plus, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import {
  useAddPassenger,
  useProfile,
  useRemovePassenger,
  useUpdateProfile,
} from '@/hooks/queries/useProfile';
import { useToast } from '@/context/ToastContext';
import { PageHeader } from '@/components/common/Brand';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Input, Select } from '@/components/common/FormFields';
import { Modal } from '@/components/common/Modal';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/common/States';
import { formatDate, pluralize } from '@/utils/format';
import type { PassengerType, SavedPassenger } from '@/types';

const profileSchema = z.object({
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters'),
  email: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passengerSchema = z.object({
  type: z.enum(['adult', 'child', 'infant']),
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
});

type PassengerFormValues = z.infer<typeof passengerSchema>;

const PASSENGER_TONE: Record<PassengerType, 'info' | 'warning' | 'neutral'> = {
  adult: 'info',
  child: 'warning',
  infant: 'neutral',
};

function maskPassport(value: string): string {
  if (value.length <= 4) return '••••';
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}

function formatDob(value: string): string {
  return formatDate(value.length === 10 ? `${value}T12:00:00Z` : value);
}

export default function Profile() {
  const { toast } = useToast();
  const profileQuery = useProfile();
  const updateProfile = useUpdateProfile();
  const addPassenger = useAddPassenger();
  const removePassenger = useRemovePassenger();

  const [addOpen, setAddOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: '', lastName: '', email: '' },
  });

  const loadedRef = useRef(false);
  useEffect(() => {
    if (profileQuery.data && !loadedRef.current) {
      loadedRef.current = true;
      reset({
        firstName: profileQuery.data.user.firstName,
        lastName: profileQuery.data.user.lastName,
        email: profileQuery.data.user.email,
      });
    }
  }, [profileQuery.data, reset]);

  const {
    register: registerPassenger,
    handleSubmit: handlePassengerSubmit,
    reset: resetPassenger,
    formState: { errors: passengerErrors },
  } = useForm<PassengerFormValues>({
    resolver: zodResolver(passengerSchema),
    defaultValues: { type: 'adult', firstName: '', lastName: '', dateOfBirth: '' },
  });

  useEffect(() => {
    if (addOpen) {
      resetPassenger({ type: 'adult', firstName: '', lastName: '', dateOfBirth: '' });
    }
  }, [addOpen, resetPassenger]);

  const onSaveProfile = (values: ProfileFormValues) => {
    updateProfile.mutate(
      { firstName: values.firstName, lastName: values.lastName },
      {
        onSuccess: () => {
          toast({
            title: 'Profile saved',
            description: 'Your personal details have been updated.',
            variant: 'success',
          });
        },
        onError: (error: Error) => {
          toast({ title: 'Could not save profile', description: error.message, variant: 'error' });
        },
      },
    );
  };

  const onAddPassenger = (values: PassengerFormValues) => {
    addPassenger.mutate(
      {
        type: values.type,
        firstName: values.firstName,
        lastName: values.lastName,
        dateOfBirth: values.dateOfBirth,
      },
      {
        onSuccess: () => {
          setAddOpen(false);
          toast({
            title: 'Passenger saved',
            description: `${values.firstName} ${values.lastName} was added to your profile.`,
            variant: 'success',
          });
        },
        onError: (error: Error) => {
          toast({ title: 'Could not save passenger', description: error.message, variant: 'error' });
        },
      },
    );
  };

  const onRemovePassenger = (passenger: SavedPassenger) => {
    removePassenger.mutate(passenger.id, {
      onSuccess: () => {
        toast({
          title: 'Passenger removed',
          description: `${passenger.firstName} ${passenger.lastName} was removed.`,
          variant: 'success',
        });
      },
      onError: (error: Error) => {
        toast({ title: 'Could not remove passenger', description: error.message, variant: 'error' });
      },
    });
  };

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-72 rounded-card" />
        <Skeleton className="h-56 rounded-card" />
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="card">
        <ErrorState
          title="Profile unavailable"
          description="We could not load your account details."
          onRetry={() => void profileQuery.refetch()}
        />
      </div>
    );
  }

  const { user, passengers } = profileQuery.data;
  const withPassport = passengers.filter((p) => !!p.passportNumber);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Profile"
        subtitle={`Signed in as ${user.email}`}
      />

      <section className="card p-4 sm:p-5" aria-labelledby="personal-heading">
        <div className="border-b border-line pb-3">
          <h2 id="personal-heading" className="text-sm font-bold uppercase tracking-wide text-muted">
            Personal information
          </h2>
        </div>
        <form onSubmit={handleSubmit(onSaveProfile)} className="mt-4 max-w-xl space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              required
              autoComplete="given-name"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Last name"
              required
              autoComplete="family-name"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>
          <Input
            label="Email"
            type="email"
            readOnly
            autoComplete="email"
            hint="Email changes are handled by support in this demo."
            {...register('email')}
          />
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={updateProfile.isPending} disabled={!isDirty}>
              Save changes
            </Button>
            <p className="text-xs text-muted">Member since {formatDate(user.createdAt)}</p>
          </div>
        </form>
      </section>

      <section className="card p-4 sm:p-5" aria-labelledby="passengers-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <h2 id="passengers-heading" className="text-sm font-bold uppercase tracking-wide text-muted">
              Saved passengers
            </h2>
            <p className="mt-1 text-xs text-muted">
              {passengers.length > 0
                ? pluralize(passengers.length, 'traveller') + ' saved for faster checkout'
                : 'Save travellers once, reuse them on every booking'}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setAddOpen(true)}
          >
            Add passenger
          </Button>
        </div>

        {passengers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <UserRound className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-sm font-semibold text-ink">No saved passengers</p>
            <p className="max-w-sm text-sm text-muted">
              Add travellers you book for often — their details will be ready at checkout.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {passengers.map((passenger) => (
              <li
                key={passenger.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">
                      {passenger.firstName} {passenger.lastName}
                    </p>
                    <Badge tone={PASSENGER_TONE[passenger.type]}>{passenger.type}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {passenger.dateOfBirth
                      ? `Born ${formatDob(passenger.dateOfBirth)}`
                      : 'Date of birth not set'}
                    {passenger.nationality ? ` · ${passenger.nationality}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemovePassenger(passenger)}
                  aria-label={`Remove ${passenger.firstName} ${passenger.lastName}`}
                  disabled={removePassenger.isPending}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-muted transition hover:border-error/40 hover:bg-error-soft hover:text-error disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4 sm:p-5" aria-labelledby="passport-heading">
        <div className="border-b border-line pb-3">
          <h2 id="passport-heading" className="text-sm font-bold uppercase tracking-wide text-muted">
            Passport information
          </h2>
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-brand-soft px-3.5 py-2.5 text-xs text-brand-dark">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Security: passport numbers are masked. Only the first two and last two characters are ever
          shown in the interface.
        </p>

        {withPassport.length === 0 ? (
          <p className="mt-4 flex items-start gap-2 text-sm text-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            No passport details saved yet. Passport numbers are optional for this demo and are never
            displayed in full.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {withPassport.map((passenger) => (
              <li
                key={passenger.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {passenger.firstName} {passenger.lastName}
                  </p>
                  <p className="text-xs text-muted">
                    {passenger.nationality ? `Nationality ${passenger.nationality}` : 'Nationality not set'}
                  </p>
                </div>
                <p className="rounded-lg bg-canvas px-3 py-1.5 font-mono text-sm tracking-widest text-ink">
                  {maskPassport(passenger.passportNumber ?? '')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a passenger"
        description="Save a traveller once and reuse them at checkout."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-passenger-form"
              loading={addPassenger.isPending}
            >
              Save passenger
            </Button>
          </>
        }
      >
        <form
          id="add-passenger-form"
          onSubmit={handlePassengerSubmit(onAddPassenger)}
          className="space-y-4"
          noValidate
        >
          <Select label="Passenger type" required {...registerPassenger('type')}>
            <option value="adult">Adult (12+ years)</option>
            <option value="child">Child (2–11 years)</option>
            <option value="infant">Infant (under 2 years)</option>
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              required
              error={passengerErrors.firstName?.message}
              {...registerPassenger('firstName')}
            />
            <Input
              label="Last name"
              required
              error={passengerErrors.lastName?.message}
              {...registerPassenger('lastName')}
            />
          </div>
          <Input
            label="Date of birth"
            type="date"
            required
            error={passengerErrors.dateOfBirth?.message}
            {...registerPassenger('dateOfBirth')}
          />
        </form>
      </Modal>
    </div>
  );
}
