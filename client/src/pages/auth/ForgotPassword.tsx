import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Check, KeyRound, Mail } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/FormFields';
import { authApi } from '@/services/api/auth';
import { ApiError } from '@/services/api/client';

const schema = z.object({ email: z.email('Enter a valid email address') });
type FormValues = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [sent, setSent] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const res = await authApi.forgotPassword(values.email);
      setSent(res.message);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Could not process your request.');
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle="If an account exists for that address, a reset link is on its way."
        footer={
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="rounded-xl border border-success/25 bg-success-soft p-5 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface text-success">
            <Check className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">Reset instructions sent</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{sent}</p>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <Button variant="secondary" fullWidth onClick={() => setSent(null)}>
            Send to a different email
          </Button>
          <Link to="/login" className="btn-ghost text-sm">
            Return to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email linked to your account and we'll send reset instructions."
      footer={
        <>
          Remembered it?{' '}
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
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" fullWidth loading={isSubmitting} icon={<KeyRound className="h-4 w-4" />}>
          Send reset instructions
        </Button>
      </form>
      <p className="mt-4 flex items-start gap-2 rounded-xl bg-canvas p-3.5 text-xs leading-relaxed text-muted">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
        In this demo, emails are stored in a developer outbox instead of being delivered — the same response is
        returned whether or not an account exists.
      </p>
    </AuthShell>
  );
}
