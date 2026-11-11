import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CircleCheck,
  Clock,
  Info,
  MapPin,
  Mic,
  MicOff,
  Plane,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/common/Brand';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Select } from '@/components/common/FormFields';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState, ErrorState } from '@/components/common/States';
import { AirportMap } from '@/components/airport/AirportMap';
import { AirportSelector } from '@/components/airport/AirportSelector';
import { AIRPORTS_WITH_GUIDE, FACILITY_CATEGORIES, RETURN_GATE_BUFFER_MIN } from '@/constants';
import { useAirportGuide, useCompleteStage, useWaitingAdvice } from '@/hooks/queries/useAirport';
import { useBookings } from '@/hooks/queries/useBookings';
import { useProfile } from '@/hooks/queries/useProfile';
import { useToast } from '@/context/ToastContext';
import type { JourneyStage, WaitingAdvice } from '@/types';
import { cn } from '@/utils/cn';
import { formatTime } from '@/utils/format';

function categoryLabel(category: string): string {
  if (category === 'transit') return 'Transit';
  return FACILITY_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

function Fact({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-canvas px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={cn('mt-1 text-sm font-semibold', muted ? 'text-muted' : 'text-ink')}>{value}</p>
    </div>
  );
}

function StageCard({
  stage,
  completed,
  current,
  busy,
  canMark,
  onToggle,
}: {
  stage: JourneyStage;
  completed: boolean;
  current: boolean;
  busy: boolean;
  canMark: boolean;
  onToggle: () => void;
}) {
  return (
    <li
      className={cn(
        'card p-4 transition-colors sm:p-5',
        completed && 'border-success/40 bg-success-soft/50',
        current && !completed && 'border-brand/60 ring-2 ring-brand/15',
      )}
      aria-current={current ? 'step' : undefined}
    >
      <div className="flex gap-3.5">
        <span
          aria-hidden
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            completed ? 'bg-success text-navy' : current ? 'bg-brand text-navy' : 'bg-surface text-muted',
          )}
        >
          {completed ? <Check className="h-4 w-4" /> : stage.order}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">{stage.title}</h3>
            {completed && (
              <Badge tone="success">
                <Check className="h-3 w-3" aria-hidden /> Done
              </Badge>
            )}
            {current && !completed && <Badge tone="info">Current step</Badge>}
            {stage.isOptional && <Badge tone="neutral">Optional</Badge>}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{stage.task}</p>
          {stage.instructions.length > 0 && (
            <ol className="mt-2.5 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink">
              {stage.instructions.map((instruction, i) => (
                <li key={i}>{instruction}</li>
              ))}
            </ol>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted">
            {stage.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {stage.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />~{stage.estimatedMinutes} min
            </span>
          </div>
          {stage.limitation && (
            <p className="mt-3 flex gap-2 rounded-lg bg-brand-soft px-3 py-2 text-[13px] leading-snug text-brand-dark">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {stage.limitation}
            </p>
          )}
          <div className="mt-3.5">
            <Button
              variant={completed ? 'secondary' : 'primary'}
              size="sm"
              onClick={onToggle}
              loading={busy}
              disabled={!canMark}
              title={
                canMark
                  ? undefined
                  : 'Attach a booking to your journey to mark stages as done'
              }
              icon={completed ? <Check className="h-4 w-4" /> : <CircleCheck className="h-4 w-4" />}
            >
              {completed ? 'Undo' : 'Mark as done'}
            </Button>
            {!canMark && (
              <p className="mt-1.5 text-xs text-muted">
                Attach a booking above to sync your progress.
              </p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function WaitingAdvicePanel({
  advice,
  source,
  model,
}: {
  advice: WaitingAdvice;
  source: 'mock' | 'live';
  model: string;
}) {
  const returnBy = new Date(
    new Date(advice.boardingAt).getTime() - advice.bufferMinutes * 60_000,
  );
  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2" role="list" aria-label="Waiting time summary">
        <span className="chip chip-active" role="listitem">
          {advice.availableMinutes} min until boarding
        </span>
        <span className="chip" role="listitem">
          {advice.bufferMinutes} min gate buffer
        </span>
        <span className="chip" role="listitem">
          {advice.usableMinutes} min usable
        </span>
      </div>

      <div className="rounded-xl border border-line bg-canvas px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Return-to-gate buffer
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink">
          <span className="font-semibold">{formatTime(advice.boardingAt)}</span>
          <span className="text-muted">boarding</span>
          <span className="text-muted">−</span>
          <span className="font-semibold">{advice.bufferMinutes} min</span>
          <span className="text-muted">buffer</span>
          <ArrowRight className="h-4 w-4 text-brand" aria-hidden />
          <span className="font-semibold text-brand-dark">
            back at gate by {formatTime(returnBy.toISOString())}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Anything you do must fit inside the {advice.usableMinutes} usable minutes so you return{' '}
          {advice.bufferMinutes} minutes before boarding starts.
        </p>
      </div>

      {advice.recommendations.length > 0 ? (
        <ul className="space-y-3">
          {advice.recommendations.map((rec) => (
            <li key={rec.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-ink">{rec.title}</h4>
                <Badge tone="info">{categoryLabel(rec.category)}</Badge>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{rec.reason}</p>
              <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                <span className="chip">
                  <Clock className="h-3 w-3" aria-hidden /> {rec.minutesNeeded} min needed
                </span>
                <span className="chip">Return buffer {rec.returnBufferMinutes} min</span>
                {rec.priceLabel && <span className="chip chip-active">{rec.priceLabel}</span>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-canvas px-4 py-3 text-sm text-muted">
          No recommendations for this window — staying near the gate is the safest option.
        </p>
      )}

      <div className="flex gap-2.5 rounded-xl bg-warning-soft px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
        <p className="text-[13px] leading-relaxed text-ink">{advice.safetyNote}</p>
      </div>

      <p className="text-xs text-muted">
        {source === 'mock'
          ? 'Local demo assistant — not an AI API response'
          : `Generated by ${model}`}
      </p>
    </div>
  );
}

export default function AirportGuide() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const rawAirport = (searchParams.get('airport') ?? '').toUpperCase();
  const airport = AIRPORTS_WITH_GUIDE.includes(rawAirport) ? rawAirport : AIRPORTS_WITH_GUIDE[0];
  const bookingReference = searchParams.get('bookingReference') ?? undefined;

  const guideQuery = useAirportGuide({ airport, bookingReference });
  const bookingsQuery = useBookings();
  const profileQuery = useProfile();
  const completeStage = useCompleteStage();
  const adviceMutation = useWaitingAdvice();

  const [speaking, setSpeaking] = useState(false);

  const guide = guideQuery.data;
  const bookings = bookingsQuery.data?.bookings ?? [];

  const setAirport = (code: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('airport', code);
      return next;
    });
  };

  const setBooking = (reference: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (reference) next.set('bookingReference', reference);
      else next.delete('bookingReference');
      return next;
    });
  };

  const stages = useMemo(
    () => (guide ? [...guide.stages].sort((a, b) => a.order - b.order) : []),
    [guide],
  );
  const completedIds = useMemo(
    () => new Set(guide?.progress?.completed ?? []),
    [guide],
  );
  const completedCount = stages.filter((s) => completedIds.has(s.id)).length;
  const currentStage = stages.find((s) => !completedIds.has(s.id) && !s.isOptional);
  const percent = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;

  const voicePref = profileQuery.data?.preferences.accessibility.voiceInstructions;
  const speechSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const voiceEnabled = speechSupported && voicePref !== false;

  useEffect(() => {
    return () => {
      if (speechSupported) window.speechSynthesis.cancel();
    };
  }, [speechSupported]);

  useEffect(() => {
    setSpeaking(false);
    if (speechSupported) window.speechSynthesis.cancel();
  }, [currentStage?.id, speechSupported]);

  const speakCurrent = () => {
    if (!voiceEnabled || !currentStage) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const text = `${currentStage.title}. ${currentStage.task} ${currentStage.instructions.join(' ')}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const toggleStage = (stage: JourneyStage, done: boolean) => {
    if (!bookingReference) return;
    completeStage.mutate(
      { bookingReference, airport, stageId: stage.id, done },
      {
        onSuccess: () =>
          toast({
            title: done ? 'Stage marked as done' : 'Stage reopened',
            description: stage.title,
            variant: 'success',
          }),
        onError: (error) =>
          toast({
            title: 'Could not update stage',
            description: error instanceof Error ? error.message : 'Please try again.',
            variant: 'error',
          }),
      },
    );
  };

  const adviceData = adviceMutation.data;
  const adviceUsable =
    adviceData &&
    adviceData.airport === airport &&
    adviceData.boardingAt === (guide?.boardingAt ?? null)
      ? adviceData
      : null;

  const showDemoBanner = !!guide && (guide.source === 'mock' || guide.limitations.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Airport guide"
        subtitle="Step-by-step journey from the kerb to your gate"
        actions={
          guide?.gate ? (
            <Badge tone="info" className="text-[12px]">
              <Plane className="h-3.5 w-3.5" aria-hidden /> Gate {guide.gate}
            </Badge>
          ) : undefined
        }
      />

      <section className="card p-4 sm:p-5" aria-label="Journey selectors">
        <div className="grid gap-5 lg:grid-cols-2">
          <AirportSelector value={airport} onChange={setAirport} />
          <div>
            {bookings.length > 0 ? (
              <Select
                label="Attach a booking (optional)"
                hint="Enables stage tracking and waiting-time advice for your flight"
                value={bookingReference ?? ''}
                onChange={(e) => setBooking(e.target.value)}
              >
                <option value="">No booking attached</option>
                {bookings.map((booking) => {
                  const segment = booking.offer.legs[0]?.segments[0];
                  const label = segment
                    ? `${booking.reference} · ${segment.flightNumber} · ${segment.from.iata}→${segment.to.iata}`
                    : booking.reference;
                  return (
                    <option key={booking.id} value={booking.reference}>
                      {label}
                    </option>
                  );
                })}
              </Select>
            ) : (
              <div>
                <p className="label">Attach a booking</p>
                <p className="rounded-xl border border-dashed border-line bg-canvas px-4 py-3 text-[13px] leading-relaxed text-muted">
                  You have no bookings yet. Stage completion and waiting-time advice become
                  available once you attach a booking to this journey.
                </p>
              </div>
            )}
            {!bookingReference && bookings.length > 0 && (
              <p className="mt-2 text-xs text-muted">
                Without a booking you can still browse all stages — “Mark as done” stays disabled.
              </p>
            )}
          </div>
        </div>
      </section>

      {guideQuery.isLoading && (
        <div className="space-y-4" aria-busy="true" aria-label="Loading airport guide">
          <Skeleton className="h-24 w-full rounded-card" />
          <Skeleton className="h-40 w-full rounded-card" />
          <Skeleton className="h-56 w-full rounded-card" />
          <Skeleton className="h-40 w-full rounded-card" />
        </div>
      )}

      {guideQuery.isError && (
        <div className="card">
          <ErrorState
            title="Could not load the airport guide"
            description="We could not reach the guidance service. Check your connection and try again."
            onRetry={() => guideQuery.refetch()}
          />
        </div>
      )}

      {guide && (
        <>
          {showDemoBanner && (
            <div
              className="flex gap-3 rounded-card border border-brand/30 bg-brand-soft px-4 py-3.5"
              role="status"
            >
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-dark" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-dark">
                  Demo airport guidance — indoor positioning is unavailable in this build,
                  directions use terminal signage.
                </p>
                {guide.limitations.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] leading-snug text-brand-dark/90">
                    {guide.limitations.map((limitation) => (
                      <li key={limitation}>{limitation}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <section className="card p-4 sm:p-5" aria-label="Journey progress">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Current step
                </p>
                <p className="mt-1 text-base font-semibold text-ink">
                  {currentStage ? currentStage.title : 'All required steps complete'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-lg font-bold text-ink">
                    {completedCount}/{stages.length}
                  </p>
                  <p className="text-xs text-muted">{stages.length - completedCount} remaining</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={speakCurrent}
                  disabled={!voiceEnabled || !currentStage}
                  title={
                    voicePref === false
                      ? 'Voice instructions are switched off in your settings'
                      : !speechSupported
                        ? 'Voice instructions are not supported in this browser'
                        : !currentStage
                          ? 'No current step to read'
                          : speaking
                            ? 'Stop reading'
                            : 'Read instructions aloud'
                  }
                  icon={speaking ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                >
                  {speaking ? 'Stop' : 'Read instructions aloud'}
                </Button>
              </div>
            </div>
            <div
              className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-valuenow={completedCount}
              aria-valuemin={0}
              aria-valuemax={stages.length}
              aria-label="Journey progress"
            >
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Fact label="Terminal" value={guide.terminal ?? 'Not available yet'} muted={!guide.terminal} />
              <Fact label="Gate" value={guide.gate ?? 'Not available yet'} muted={!guide.gate} />
              <Fact
                label="Check-in counter"
                value={guide.counter ?? 'Assigned at check-in'}
                muted={!guide.counter}
              />
              <Fact
                label="Boarding"
                value={guide.boardingAt ? formatTime(guide.boardingAt) : 'Not announced yet'}
                muted={!guide.boardingAt}
              />
            </div>
            {guide.flightNumber && (
              <p className="mt-3 text-[13px] text-muted">
                Flight <span className="font-semibold text-ink">{guide.flightNumber}</span>
                {guide.bookingReference && (
                  <>
                    {' '}
                    · Booking <span className="font-semibold text-ink">{guide.bookingReference}</span>
                  </>
                )}
              </p>
            )}
          </section>

          {currentStage && (
            <section className="card p-4 sm:p-5" aria-label="Walking route for current step">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-ink">Walking route</h2>
                <span className="text-xs text-muted">~{currentStage.estimatedMinutes} min</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-canvas px-4 py-3.5">
                <span className="chip">You are here</span>
                <span className="flex items-center gap-1 text-brand" aria-hidden>
                  <ArrowRight className="h-4 w-4" />
                  <ArrowRight className="h-4 w-4 opacity-60" />
                  <ArrowRight className="h-4 w-4 opacity-30" />
                </span>
                <span className="chip chip-active">
                  {currentStage.location ?? 'Follow terminal signage'}
                </span>
                <span className="ml-auto text-xs font-medium text-muted">
                  ~{currentStage.estimatedMinutes} min walk
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">
                Stylised route strip — not a live indoor map. Follow airport signage on site.
              </p>
              <div className="mt-4">
                <AirportMap
                  iata={airport}
                  label={`${guide.airport.name} (${guide.airport.iata})`}
                />
              </div>
            </section>
          )}

          <section aria-label="Journey stages">
            <h2 className="mb-3 text-sm font-semibold text-ink">All stages</h2>
            <ol className="space-y-3">
              {stages.map((stage) => (
                <StageCard
                  key={stage.id}
                  stage={stage}
                  completed={completedIds.has(stage.id)}
                  current={currentStage?.id === stage.id}
                  busy={
                    completeStage.isPending &&
                    completeStage.variables?.stageId === stage.id
                  }
                  canMark={!!bookingReference}
                  onToggle={() => toggleStage(stage, !completedIds.has(stage.id))}
                />
              ))}
            </ol>
            {stages.length === 0 && (
              <div className="card">
                <EmptyState
                  title="No stages available"
                  description="This airport has not published journey stages yet."
                />
              </div>
            )}
          </section>

          {guide.boardingAt && (
            <section className="card p-4 sm:p-5" aria-label="While you wait">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Sparkles className="h-4 w-4 text-brand" aria-hidden />
                    While you wait
                  </h2>
                  <p className="mt-1 text-[13px] text-muted">
                    Boarding at {formatTime(guide.boardingAt)}
                    {guide.terminal ? ` · Terminal ${guide.terminal}` : ''}
                    {guide.gate ? ` · Gate ${guide.gate}` : ''} — safe buffer{' '}
                    {RETURN_GATE_BUFFER_MIN} min.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  loading={adviceMutation.isPending}
                  disabled={!guide.terminal}
                  title={
                    guide.terminal
                      ? undefined
                      : 'Waiting-time advice needs your terminal assignment'
                  }
                  onClick={() =>
                    adviceMutation.mutate(
                      {
                        airport,
                        terminal: guide.terminal ?? '',
                        boardingAt: guide.boardingAt ?? '',
                        gate: guide.gate,
                        bookingReference,
                      },
                      {
                        onError: (error) =>
                          toast({
                            title: 'Could not get advice',
                            description:
                              error instanceof Error ? error.message : 'Please try again.',
                            variant: 'error',
                          }),
                      },
                    )
                  }
                >
                  Get waiting-time advice
                </Button>
              </div>

              {adviceMutation.isError && (
                <p className="mt-3 rounded-xl bg-error-soft px-4 py-3 text-sm text-error" role="alert">
                  Waiting-time advice is unavailable right now. Please try again shortly.
                </p>
              )}

              {adviceUsable && (
                <WaitingAdvicePanel
                  advice={adviceUsable}
                  source={adviceUsable.source}
                  model={adviceUsable.model}
                />
              )}

              {!adviceUsable && !adviceMutation.isPending && !adviceMutation.isError && (
                <p className="mt-3 text-[13px] text-muted">
                  Get suggestions sized to the time you have before boarding — always with a safe
                  return-to-gate buffer.
                </p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
