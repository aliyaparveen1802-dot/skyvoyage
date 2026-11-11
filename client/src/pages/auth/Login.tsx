import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { LoginMapBackground } from './LoginMapBackground';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/FormFields';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api/client';

const schema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  // Already signed in → land on the public Home Page (never auto-open the Dashboard).
  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [loading, user, navigate]);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await login(values);
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Unable to sign in right now. Please try again.');
    }
  }

  async function demoLogin() {
    setServerError(null);
    setDemoBusy(true);
    try {
      await login({ email: 'demo@skyvoyage.app', password: 'Demo1234!' });
      navigate('/', { replace: true });
    } catch {
      try {
        const { authApi } = await import('@/services/api/auth');
        await authApi.register({
          email: 'demo@skyvoyage.app',
          password: 'Demo1234!',
          firstName: 'Demo',
          lastName: 'Traveller',
        });
        await login({ email: 'demo@skyvoyage.app', password: 'Demo1234!' });
        navigate('/', { replace: true });
      } catch (err2) {
        setServerError(err2 instanceof ApiError ? err2.message : 'Demo sign-in failed. Create an account instead.');
      }
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden">
      <LoginMapBackground />
      <div className="relative z-10">
        <AuthShell
          title="Welcome back"
          subtitle="Sign in to manage trips, seats, boarding passes and airport guidance."
          panelClassName="border-white/10 bg-[#0a141c]/85 shadow-[0_28px_90px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl"
          footer={
            <>
              New to SkyVoyage?{' '}
              <Link to="/register" className="font-semibold text-brand hover:underline">
                Create an account
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
        <div>
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="Your password"
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
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-[13px] font-semibold text-brand hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" fullWidth loading={isSubmitting} icon={<LogIn className="h-4 w-4" />}>
          Sign in
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <Button variant="secondary" fullWidth loading={demoBusy} onClick={demoLogin}>
        Continue with the demo account
      </Button>
      <p className="mt-3 text-center text-xs leading-relaxed text-muted">
        The demo account is created on first use with sample data. No real payments are ever processed.
      </p>
        </AuthShell>
      </div>
    </div>
  );
}
