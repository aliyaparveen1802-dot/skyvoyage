import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Check, Eye, EyeOff, UserPlus } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/FormFields';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api/client';
import { cn } from '@/utils/cn';

const schema = z
  .object({
    firstName: z.string().min(2, 'Enter your first name'),
    lastName: z.string().min(2, 'Enter your last name'),
    email: z.email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters')
      .regex(/[0-9]/, 'Include at least one number'),
    confirm: z.string().min(1, 'Confirm your password'),
    terms: z.boolean().refine((v) => v, { message: 'Please accept the terms to continue' }),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

type FormValues = z.infer<typeof schema>;

function strength(pw: string): { score: number; label: string; tone: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  const map = [
    { label: 'Too short', tone: 'bg-error' },
    { label: 'Weak', tone: 'bg-error' },
    { label: 'Fair', tone: 'bg-warning' },
    { label: 'Good', tone: 'bg-warning' },
    { label: 'Strong', tone: 'bg-success' },
    { label: 'Excellent', tone: 'bg-success' },
  ];
  return { score, ...map[score] };
}

export default function Register() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirm: '', terms: false },
  });

  const password = watch('password');
  const meter = strength(password ?? '');

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await signUp({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
      });
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setServerError('An account with this email already exists — sign in instead.');
      } else if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('Account creation failed. Please try again.');
      }
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Save passengers, manage bookings and unlock step-by-step airport guidance."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {serverError && (
        <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-xl border border-error/25 bg-error-soft p-3.5 text-sm text-error">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            autoComplete="given-name"
            required
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <Input
            label="Last name"
            autoComplete="family-name"
            required
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <div>
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              placeholder="At least 8 characters with a number"
              error={errors.password?.message}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-[38px] -translate-y-1/2 rounded p-1 text-muted hover:text-ink"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <div
                  className={cn('h-full rounded-full transition-all duration-300', meter.tone)}
                  style={{ width: `${(meter.score / 5) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold text-muted">{meter.label}</span>
            </div>
          )}
        </div>

        <Input
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          error={errors.confirm?.message}
          {...register('confirm')}
        />

        <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-muted">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand focus:ring-brand/30"
            {...register('terms')}
          />
          <span>
            I agree to the terms of service and privacy policy, and understand this is a demo product that uses
            sample flight data.
            {errors.terms && <span className="mt-1 block font-medium text-error">{errors.terms.message}</span>}
          </span>
        </label>

        <Button type="submit" fullWidth loading={isSubmitting} icon={<UserPlus className="h-4 w-4" />}>
          Create account
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <Check className="h-3.5 w-3.5 text-success" aria-hidden />
          Your data stays in this demo deployment — no third-party tracking.
        </p>
      </form>
    </AuthShell>
  );
}
