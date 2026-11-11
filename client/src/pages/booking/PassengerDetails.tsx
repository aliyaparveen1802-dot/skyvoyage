import { useEffect, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  Briefcase,
  Check,
  HeartPulse,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Input, Select } from '@/components/common/FormFields';
import { Badge } from '@/components/common/Badge';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useProfile } from '@/hooks/queries/useProfile';
import type { PassengerInput, PassengerType } from '@/types';
import { cn } from '@/utils/cn';
import { formatMoney } from '@/utils/format';

const passengerSchema = z.object({
  firstName: z.string().min(2, 'Enter the first name as on the ID'),
  lastName: z.string().min(2, 'Enter the last name as on the ID'),
  dob: z
    .string()
    .min(1, 'Date of birth is required')
    .refine((v) => v <= new Date().toISOString().slice(0, 10), 'Date of birth cannot be in the future'),
  gender: z.enum(['', 'male', 'female', 'other']),
  passportNumber: z
    .string()
    .optional()
    .refine((v) => !v || /^[A-Za-z0-9]{6,9}$/.test(v), 'Use 6–9 letters or digits'),
  passportExpiry: z.string().optional(),
});

const schema = z.object({
  passengers: z.array(passengerSchema).min(1).max(9),
  email: z.email('Enter a valid email address'),
  phone: z
    .string()
    .min(7, 'Enter a valid phone number')
    .regex(/^\+?[\d\s()-]{7,18}$/, 'Enter a valid phone number'),
  addons: z.object({
    extraBaggageKg: z.number().min(0).max(40),
    meal: z.enum(['none', 'standard', 'vegetarian', 'vegan', 'halal', 'kosher']),
    specialAssistance: z.enum(['none', 'wheelchair', 'visual', 'hearing', 'medical']),
    priorityBoarding: z.boolean(),
    travelInsurance: z.boolean(),
    seatSelection: z.boolean(),
  }),
});

type FormValues = z.infer<typeof schema>;

const BAGGAGE_OPTIONS = [0, 5, 10, 20, 30];
const BAGGAGE_PRICE_PER_KG = 1660;

function Toggle({
  checked,
  onChange,
  label,
  hint,
  price,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  price?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-line bg-surface p-4 transition hover:border-brand/40">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{hint}</span>}
        {price && <span className="mt-1 block text-xs font-semibold text-brand">{price}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-line transition peer-checked:bg-brand peer-focus-visible:ring-4 peer-focus-visible:ring-brand/25"
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </label>
  );
}

export default function PassengerDetails() {
  const { search, searchId, offer, passengers, setPassengers, addons, setAddons, seats } = useBooking();
  const navigate = useNavigate();
  const { user } = useAuth();
  const profileQuery = useProfile();

  const types: PassengerType[] = useMemo(() => {
    const list: PassengerType[] = [];
    for (let i = 0; i < search.passengers.adult; i++) list.push('adult');
    for (let i = 0; i < search.passengers.child; i++) list.push('child');
    for (let i = 0; i < search.passengers.infant; i++) list.push('infant');
    return list.length ? list : ['adult'];
  }, [search.passengers]);

  const defaults: FormValues = useMemo(() => {
    const saved = profileQuery.data?.passengers ?? [];
    const base: FormValues = {
      passengers: types.map((_, i) => {
        const existing = passengers[i];
        if (existing) {
          return {
            firstName: existing.firstName ?? '',
            lastName: existing.lastName ?? '',
            dob: existing.dateOfBirth ?? '',
            gender: existing.gender ?? '',
            passportNumber: existing.passportNumber ?? '',
            passportExpiry: existing.passportExpiry ?? '',
          };
        }
        const match = saved[i];
        return {
          firstName: match?.firstName ?? '',
          lastName: match?.lastName ?? '',
          dob: match?.dateOfBirth ?? '',
          gender: '',
          passportNumber: match?.passportNumber ?? '',
          passportExpiry: '',
        };
      }),
      email: passengers[0]?.email ?? user?.email ?? '',
      phone: passengers[0]?.phone ?? '',
      addons: {
        extraBaggageKg: addons.extraBaggageKg,
        meal: addons.meal,
        specialAssistance: addons.specialAssistance,
        priorityBoarding: addons.priorityBoarding,
        travelInsurance: addons.travelInsurance,
        seatSelection: seats.length > 0 ? addons.seatSelection : false,
      },
    };
    return base;
  }, [types, passengers, addons, user, seats.length, profileQuery.data]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (profileQuery.data && passengers.length === 0) {
      const rebuilt = defaults;
      rebuilt.passengers.forEach((p, i) => {
        setValue(`passengers.${i}.firstName` as const, p.firstName);
        setValue(`passengers.${i}.lastName` as const, p.lastName);
        setValue(`passengers.${i}.dob` as const, p.dob);
      });
      if (!watch('email')) setValue('email', rebuilt.email);
    }
  }, [profileQuery.data, passengers.length, defaults, setValue, watch]);

  if (!searchId || !offer) {
    return <Navigate to="/search" replace />;
  }

  const baggageKg = watch('addons.extraBaggageKg');
  const insurance = watch('addons.travelInsurance');
  const priority = watch('addons.priorityBoarding');
  const insuranceCost = insurance ? 1494 * types.length : 0;
  const priorityCost = priority ? 996 * types.length : 0;
  const baggageCost = baggageKg * BAGGAGE_PRICE_PER_KG * (types.filter((t) => t !== 'infant').length || 1);

  const passengerError = (i: number, field: 'firstName' | 'lastName' | 'dob' | 'passportNumber' | 'passportExpiry') =>
    errors.passengers?.[i]?.[field]?.message;

  function onSubmit(values: FormValues) {
    const mapped: PassengerInput[] = values.passengers.map((p, i) => ({
      type: types[i] ?? 'adult',
      firstName: p.firstName.trim(),
      lastName: p.lastName.trim(),
      dateOfBirth: p.dob,
      gender: p.gender === '' ? undefined : p.gender,
      passportNumber: p.passportNumber?.trim() || undefined,
      passportExpiry: p.passportExpiry || undefined,
      email: i === 0 ? values.email : undefined,
      phone: i === 0 ? values.phone : undefined,
    }));
    setPassengers(mapped);
    setAddons(values.addons);
    navigate('/checkout');
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-32 sm:px-6 lg:px-8 lg:pb-12">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">Step 3 of 4 · Passenger details</p>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
          Who's travelling?
        </h1>
        <p className="mt-1 text-sm text-muted">
          Details must match the travel document used at check-in · {offer.fareBrand}.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Contact */}
        <section className="card p-5" aria-labelledby="contact-heading">
          <h2 id="contact-heading" className="flex items-center gap-2 text-sm font-bold text-ink">
            <Mail className="h-4 w-4 text-brand" aria-hidden /> Contact for this booking
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Confirmation email"
              type="email"
              required
              autoComplete="email"
              hint="E-ticket, check-in and gate alerts are sent here"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Mobile number"
              type="tel"
              required
              autoComplete="tel"
              placeholder="+91 98765 43210"
              hint="Used for urgent flight updates"
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>
        </section>

        {/* Passengers */}
        {types.map((type, i) => (
          <section key={i} className="card p-5" aria-labelledby={`pax-${i}`}>
            <div className="flex items-center justify-between gap-3">
              <h2 id={`pax-${i}`} className="flex items-center gap-2 text-sm font-bold text-ink">
                {type === 'infant' ? (
                  <Baby className="h-4 w-4 text-brand" aria-hidden />
                ) : type === 'child' ? (
                  <User className="h-4 w-4 text-brand" aria-hidden />
                ) : (
                  <User className="h-4 w-4 text-brand" aria-hidden />
                )}
                Passenger {i + 1}
              </h2>
              <Badge tone={type === 'adult' ? 'info' : type === 'child' ? 'warning' : 'neutral'}>
                {type === 'adult' ? 'Adult 12+' : type === 'child' ? 'Child 2–11' : 'Infant under 2'}
              </Badge>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                label="First name"
                required
                autoComplete="given-name"
                placeholder="As shown on passport"
                error={passengerError(i, 'firstName')}
                {...register(`passengers.${i}.firstName`)}
              />
              <Input
                label="Last name"
                required
                autoComplete="family-name"
                placeholder="As shown on passport"
                error={passengerError(i, 'lastName')}
                {...register(`passengers.${i}.lastName`)}
              />
              <Input
                label="Date of birth"
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                error={passengerError(i, 'dob')}
                {...register(`passengers.${i}.dob`)}
              />
              <Select label="Gender (optional)" defaultValue="" {...register(`passengers.${i}.gender`)}>
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </Select>
              <Input
                label="Passport number (optional)"
                placeholder="A1234567"
                hint="Add now for smoother international check-in"
                error={passengerError(i, 'passportNumber')}
                {...register(`passengers.${i}.passportNumber`)}
              />
              <Input
                label="Passport expiry (optional)"
                type="date"
                error={passengerError(i, 'passportExpiry')}
                {...register(`passengers.${i}.passportExpiry`)}
              />
            </div>

            {type === 'infant' && (
              <p className="mt-3 rounded-xl bg-warning-soft p-3 text-xs leading-relaxed text-ink">
                Infants must travel with an adult on the same booking and do not get a seat — an infant meal can be
                requested below.
              </p>
            )}
          </section>
        ))}

        {/* Add-ons */}
        <section className="card p-5" aria-labelledby="addons-heading">
          <h2 id="addons-heading" className="flex items-center gap-2 text-sm font-bold text-ink">
            <Briefcase className="h-4 w-4 text-brand" aria-hidden /> Travel add-ons
          </h2>
          <p className="mt-1 text-xs text-muted">Prices update in your checkout total before payment.</p>

          <fieldset className="mt-4">
            <legend className="mb-2 text-[13px] font-semibold text-ink">Extra checked baggage</legend>
            <div className="flex flex-wrap gap-2">
              {BAGGAGE_OPTIONS.map((kg) => (
                <button
                  key={kg}
                  type="button"
                  onClick={() => setValue('addons.extraBaggageKg', kg, { shouldDirty: true })}
                  aria-pressed={baggageKg === kg}
                  className={cn(
                    'rounded-xl border px-4 py-2 text-[13px] font-semibold transition',
                    baggageKg === kg ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-muted hover:text-ink',
                  )}
                >
                  {kg === 0 ? 'No extra bag' : `+${kg} kg`}
                  {kg > 0 && <span className="ml-1.5 text-[11px] font-normal">≈ {formatMoney(kg * BAGGAGE_PRICE_PER_KG)}</span>}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select label="Meal preference" {...register('addons.meal')}>
              <option value="none">Standard meal</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="halal">Halal</option>
              <option value="kosher">Kosher</option>
            </Select>
            <Select label="Special assistance" {...register('addons.specialAssistance')}>
              <option value="none">None needed</option>
              <option value="wheelchair">Wheelchair assistance</option>
              <option value="visual">Visual assistance</option>
              <option value="hearing">Hearing assistance</option>
              <option value="medical">Medical assistance</option>
            </Select>
          </div>

          <div className="mt-4 space-y-3">
            <Toggle
              checked={watch('addons.priorityBoarding')}
              onChange={(v) => setValue('addons.priorityBoarding', v, { shouldDirty: true })}
              label="Priority boarding"
              hint="Board in the first group and settle in early."
              price={`+${formatMoney(996 * types.length)} for ${types.length} traveller${types.length > 1 ? 's' : ''}`}
            />
            <Toggle
              checked={watch('addons.travelInsurance')}
              onChange={(v) => setValue('addons.travelInsurance', v, { shouldDirty: true })}
              label="Travel insurance"
              hint="Demo cover for delays, baggage loss and cancellation."
              price={`+${formatMoney(1494 * types.length)} for ${types.length} traveller${types.length > 1 ? 's' : ''}`}
            />
            <Toggle
              checked={watch('addons.seatSelection')}
              onChange={(v) => setValue('addons.seatSelection', v, { shouldDirty: true })}
              label="Keep my chosen seats"
              hint={
                seats.length > 0
                  ? `${seats.length} seat${seats.length > 1 ? 's' : ''} selected — seat charges are added to the fare.`
                  : 'No seats selected yet — you can go back and pick seats, or let the airline assign them at check-in.'
              }
            />
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-canvas p-3.5 text-xs leading-relaxed text-muted">
            <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            Assistance requests are sent with your booking. Airport staff will also support you on the day — mention
            your reference at the check-in counter.
          </div>
        </section>

        {/* Estimated add-on total */}
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
            Add-ons so far: baggage {formatMoney(baggageCost)} · seats {formatMoney(seats.reduce((s, x) => s + x.price, 0))} ·
            extras {formatMoney(insuranceCost + priorityCost)}
          </div>
          <p className="text-xs text-muted">Final total verified by the server at checkout.</p>
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center justify-between gap-3 lg:flex">
          <button type="button" onClick={() => navigate('/seat-selection')} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Back to seats
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving…' : 'Continue to checkout'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-14 z-30 flex items-center gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <button type="button" onClick={() => navigate('/seat-selection')} className="btn-secondary h-11 px-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="btn-primary flex-1"
        >
          {isSubmitting ? 'Saving…' : 'Checkout'} <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <Check className="h-3.5 w-3.5 text-success" aria-hidden /> Your details are sent over encrypted requests and
        never stored in the browser.
      </div>
    </div>
  );
}
