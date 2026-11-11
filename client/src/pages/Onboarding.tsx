import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Armchair, Check, Navigation, Radar, Search, Sparkles, Plane } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';
import { ONBOARDING_SLIDES } from '@/constants';
import { cn } from '@/utils/cn';

const ICONS: Record<string, typeof Search> = {
  search: Search,
  seat: Armchair,
  navigation: Navigation,
  radar: Radar,
  sparkles: Sparkles,
};

const DETAILS: Record<string, string[]> = {
  search: ['30+ airport pairs in the demo dataset', 'One-way, round-trip and multi-city', 'Filters, sorting and a price calendar'],
  seat: ['Window, aisle and exit-row seats', 'Business, premium and economy cabins', 'Occupied seats blocked automatically'],
  navigation: ['Ten guided stages from kerb to gate', 'Counter, terminal and security guidance', 'Accessibility-friendly voice instructions'],
  radar: ['Status, delay and gate updates', 'Aircraft position along the route', 'Clearly labelled demo tracking data'],
  sparkles: ['Respects your boarding time', 'Includes a safe return-to-gate buffer', 'Lounges, dining, rest and shopping'],
};

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const navigate = useNavigate();
  const { user } = useAuth();

  const slide = ONBOARDING_SLIDES[index];
  const Icon = ICONS[slide.icon] ?? Sparkles;
  const isLast = index === ONBOARDING_SLIDES.length - 1;

  const go = (next: number) => {
    if (next < 0 || next >= ONBOARDING_SLIDES.length) return;
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  };

  const finish = () => {
    try {
      localStorage.setItem('skyvoyage_onboarded', '1');
    } catch {
      /* ignore */
    }
    navigate(user ? '/dashboard' : '/');
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-navy">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-navy">
            <Plane className="h-4 w-4 -rotate-45" />
          </span>
          SkyVoyage
        </span>
        <button onClick={finish} className="text-sm font-semibold text-muted hover:text-ink">
          Skip
        </button>
      </div>

      {/* Progress */}
      <div className="mb-8 flex items-center gap-2" aria-label={`Step ${index + 1} of ${ONBOARDING_SLIDES.length}`}>
        {ONBOARDING_SLIDES.map((s, i) => (
          <button
            key={s.title}
            onClick={() => go(i)}
            aria-label={`Go to step ${i + 1}: ${s.title}`}
            aria-current={i === index}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i === index ? 'w-8 bg-brand' : i < index ? 'w-4 bg-brand/45' : 'w-4 bg-line',
            )}
          />
        ))}
        <span className="ml-auto text-xs font-semibold text-muted">
          {index + 1} / {ONBOARDING_SLIDES.length}
        </span>
      </div>

      <div className="card relative overflow-hidden p-6 sm:p-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.title}
            custom={direction}
            initial={{ opacity: 0, x: direction * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -28 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <Icon className="h-7 w-7" aria-hidden />
            </span>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">{slide.title}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{slide.body}</p>
            <ul className="mt-5 space-y-2.5">
              {DETAILS[slide.icon].map((d) => (
                <li key={d} className="flex items-start gap-2.5 text-sm text-ink">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                    <Check className="h-3 w-3" aria-hidden />
                  </span>
                  {d}
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          icon={<ArrowLeft className="h-4 w-4" />}
          className="flex-1 sm:flex-none"
        >
          Previous
        </Button>
        {!isLast ? (
          <Button
            onClick={() => go(index + 1)}
            icon={<ArrowRight className="h-4 w-4" />}
            className="flex-1 sm:flex-none"
          >
            Next
          </Button>
        ) : (
          <Button onClick={finish} className="flex-1 sm:flex-none">
            {user ? 'Open my dashboard' : 'Get started'}
          </Button>
        )}
      </div>

      {!user && (
        <div className="mt-6 rounded-xl border border-line bg-surface p-4 text-center">
          <p className="text-sm text-muted">
            Ready when you are — create an account to book, track and get guided.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <LinkButton to="/register" label="Create account" primary />
            <LinkButton to="/login" label="Sign in" />
          </div>
        </div>
      )}
    </div>
  );
}

function LinkButton({ to, label, primary }: { to: string; label: string; primary?: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className={cn('h-10 flex-1 rounded-xl px-4 text-sm font-semibold transition sm:flex-none', primary ? 'bg-navy text-white hover:bg-navy-soft' : 'border border-line text-ink hover:bg-canvas')}
    >
      {label}
    </button>
  );
}
