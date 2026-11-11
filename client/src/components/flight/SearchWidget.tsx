import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Plus, Search, X } from 'lucide-react';
import { AirportAutocomplete } from './AirportAutocomplete';
import { FareCalendar } from './FareCalendar';
import { PassengerPicker } from './PassengerPicker';
import { Tabs } from '@/components/common/Tabs';
import { Button } from '@/components/common/Button';
import { Input, Select } from '@/components/common/FormFields';
import { useFlightSearch } from '@/hooks/queries/useFlights';
import { useBooking } from '@/context/BookingContext';
import { useToast } from '@/context/ToastContext';
import { CABINS, TRIP_TYPES } from '@/constants';
import type { Airport, CabinClass, TripType } from '@/types';
import { addDays, toDateString } from '@/utils/format';
import { errorMessage as errorMessageSafe } from '@/services/api/client';
import { useRecentSearches } from '@/hooks/useRecentSearches';

interface RouteState {
  from: Airport | null;
  to: Airport | null;
}

interface LegDraft extends RouteState {
  fromIata: string | null;
  toIata: string | null;
  date: string;
}

interface Props {
  /** "hero" renders on the marketing home, "page" on /search */
  variant?: 'hero' | 'page';
  /** "inline" renders the reference hero layout (trip row above card, single-row fields, centered button); "stacked" is the card layout */
  layout?: 'stacked' | 'inline';
}

export function SearchWidget({ variant = 'page', layout = 'stacked' }: Props) {
  const { search, setSearch } = useBooking();
  const navigate = useNavigate();
  const { toast } = useToast();
  const today = toDateString(new Date());

  const initialFrom = search.legs[0]?.from ?? 'MAA';
  const initialTo = search.legs[0]?.to ?? 'DXB';
  const initialDepart = search.legs[0]?.date && search.legs[0].date >= today ? search.legs[0].date : addDays(today, 21);
  const initialReturn =
    search.legs[1]?.date && search.legs[1].date >= initialDepart ? search.legs[1].date : addDays(initialDepart, 7);

  const [tripType, setTripType] = useState<TripType>(search.tripType);
  const [route, setRoute] = useState<RouteState>({ from: null, to: null });
  const [departDate, setDepartDate] = useState(initialDepart);
  const [returnDate, setReturnDate] = useState(initialReturn);
  const [passengers, setPassengers] = useState(search.passengers);
  const [cabin, setCabin] = useState<CabinClass>(search.cabin);
  const [multiLegs, setMultiLegs] = useState<LegDraft[]>(() => {
    const seed: LegDraft = {
      from: null,
      to: null,
      fromIata: initialFrom,
      toIata: initialTo,
      date: initialDepart,
    };
    const second: LegDraft = {
      from: null,
      to: null,
      fromIata: initialTo,
      toIata: initialFrom,
      date: initialReturn,
    };
    const fromDraft =
      search.tripType === 'multicity' && search.legs.length > 0
        ? search.legs.map((l) => ({
            from: null,
            to: null,
            fromIata: l.from,
            toIata: l.to,
            date: l.date >= today ? l.date : '',
          }))
        : null;
    return fromDraft && fromDraft.length >= 2 ? fromDraft : [seed, second];
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const searchMutation = useFlightSearch();
  const recent = useRecentSearches();

  const swap = () => setRoute((r) => ({ from: r.to, to: r.from }));

  const swapLeg = (index: number) =>
    setMultiLegs((legs) =>
      legs.map((l, i) =>
        i === index
          ? { ...l, from: l.to, to: l.from, fromIata: l.toIata, toIata: l.fromIata }
          : l,
      ),
    );

  const addLeg = () =>
    setMultiLegs((legs) => {
      if (legs.length >= 6) return legs;
      const last = legs[legs.length - 1];
      return [
        ...legs,
        { from: null, to: null, fromIata: last.toIata, toIata: null, date: addDays(last.date || today, 3) },
      ];
    });

  const removeLeg = (index: number) =>
    setMultiLegs((legs) => (legs.length <= 2 ? legs : legs.filter((_, i) => i !== index)));

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (tripType === 'multicity') {
      multiLegs.forEach((leg, i) => {
        if (!leg.from) next[`leg${i}.from`] = 'Select departure airport';
        if (!leg.to) next[`leg${i}.to`] = 'Select arrival airport';
        if (leg.from && leg.to && leg.from.iata === leg.to.iata)
          next[`leg${i}.to`] = 'Origin and destination must differ';
        if (!leg.date) next[`leg${i}.date`] = 'Select a date';
        else if (leg.date < today) next[`leg${i}.date`] = 'Date cannot be in the past';
      });
    } else {
      if (!route.from) next['route.from'] = 'Select departure airport';
      if (!route.to) next['route.to'] = 'Select arrival airport';
      if (route.from && route.to && route.from.iata === route.to.iata)
        next['route.to'] = 'Origin and destination must differ';
      if (!departDate) next['depart'] = 'Select a departure date';
      else if (departDate < today) next['depart'] = 'Date cannot be in the past';
      if (tripType === 'roundtrip') {
        if (!returnDate) next['return'] = 'Select a return date';
        else if (returnDate < departDate) next['return'] = 'Return must be on or after departure';
      }
    }

    const total = passengers.adult + passengers.child + passengers.infant;
    if (total > 9) next['passengers'] = 'Maximum 9 passengers per booking';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!validate()) {
      const firstKey = Object.keys(errors)[0];
      if (firstKey) document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`)?.focus();
      return;
    }

    const legs =
      tripType === 'multicity'
        ? multiLegs.map((l) => ({ from: l.from!.iata, to: l.to!.iata, date: l.date }))
        : tripType === 'roundtrip'
          ? [
              { from: route.from!.iata, to: route.to!.iata, date: departDate },
              { from: route.to!.iata, to: route.from!.iata, date: returnDate },
            ]
          : [{ from: route.from!.iata, to: route.to!.iata, date: departDate }];

    const query = { tripType, legs, passengers, cabin };

    try {
      const result = await searchMutation.mutateAsync(query);
      setSearch(query, result.searchId);
      recent.push(query);
      navigate('/search/results');
    } catch (err) {
      toast({
        title: 'Flight search failed',
        description: errorMessageSafe(err),
        variant: 'error',
      });
    }
  }

  const heroInline = variant === 'hero' && layout === 'inline';

  const tripTabs = (className: string) => (
    <Tabs
      items={TRIP_TYPES.map((t) => ({ value: t.value, label: t.label }))}
      value={tripType}
      onChange={(v) => setTripType(v)}
      ariaLabel="Trip type"
      className={className}
    />
  );

  const fromField = (
    <AirportAutocomplete
      label="Leaving From"
      required
      value={route.from}
      defaultIata={initialFrom}
      onChange={(a) => {
        setRoute((r) => ({ ...r, from: a }));
        if (submitAttempted) validate();
      }}
      error={errors['route.from']}
      placeholder="City or airport"
    />
  );

  const toField = (
    <AirportAutocomplete
      label="Going To"
      required
      value={route.to}
      defaultIata={initialTo}
      onChange={(a) => {
        setRoute((r) => ({ ...r, to: a }));
        if (submitAttempted) validate();
      }}
      error={errors['route.to']}
      placeholder="City or airport"
    />
  );

  const departField = (
    <FareCalendar
      label="Departure date"
      required
      value={departDate}
      minDate={today}
      cabin={cabin}
      fromIata={route.from?.iata ?? initialFrom}
      toIata={route.to?.iata ?? initialTo}
      error={errors['depart']}
      onChange={(d) => {
        setDepartDate(d);
        if (d && tripType === 'roundtrip' && returnDate && returnDate < d) {
          setReturnDate(addDays(d, 7));
        }
        if (submitAttempted) validate();
      }}
    />
  );

  const returnField = (
    <FareCalendar
      label="Return date"
      required
      value={returnDate}
      minDate={departDate}
      cabin={cabin}
      fromIata={route.to?.iata ?? initialTo}
      toIata={route.from?.iata ?? initialFrom}
      error={errors['return']}
      onChange={(d) => {
        setReturnDate(d);
        if (submitAttempted) validate();
      }}
    />
  );

  const swapButton = (
    <button
      type="button"
      onClick={swap}
      aria-label="Swap departure and arrival airports"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-sm transition duration-300 hover:rotate-180 hover:border-brand hover:text-brand hover:shadow-[0_0_14px_rgba(230,255,25,0.35)]"
    >
      <ArrowLeftRight className="h-4 w-4" />
    </button>
  );

  const paxField = (
    <PassengerPicker
      value={passengers}
      onChange={(p) => {
        setPassengers(p);
        if (submitAttempted) validate();
      }}
      error={errors['passengers']}
    />
  );

  const classField = (
    <Select label="Travel class" value={cabin} onChange={(e) => setCabin(e.target.value as CabinClass)}>
      {CABINS.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
        </option>
      ))}
    </Select>
  );

  const searchButton = (
    <Button
      type="submit"
      size="lg"
      loading={searchMutation.isPending}
      icon={<Search className="h-4 w-4" />}
      className="w-full lg:w-auto"
    >
      {searchMutation.isPending ? 'Searching…' : 'Search flights'}
    </Button>
  );

  const multicityForm = (
    <div key={tripType} className="animate-fade-in space-y-3">
      {multiLegs.map((leg, i) => (
        <fieldset key={i} className="rounded-xl border border-line/70 bg-canvas/60 p-3">
          <legend className="px-1 text-xs font-bold uppercase tracking-wide text-muted">
            Flight {i + 1}
          </legend>
          <div className="grid items-start gap-3 sm:grid-cols-[1fr_auto_1fr_160px_auto]">
            <div data-field={`leg${i}.from`}>
              <AirportAutocomplete
                label="Leaving From"
                required
                value={leg.from}
                defaultIata={leg.fromIata ?? undefined}
                onChange={(a) => {
                  setMultiLegs((ls) => ls.map((l, idx) => (idx === i ? { ...l, from: a } : l)));
                  if (submitAttempted) validate();
                }}
                error={errors[`leg${i}.from`]}
              />
            </div>
            <div className="hidden items-center justify-center pt-7 sm:flex">
              <button
                type="button"
                onClick={() => swapLeg(i)}
                aria-label={`Swap airports in flight ${i + 1}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:border-brand hover:text-brand"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>
            </div>
            <div data-field={`leg${i}.to`}>
              <AirportAutocomplete
                label="Going To"
                required
                value={leg.to}
                defaultIata={leg.toIata ?? undefined}
                onChange={(a) => {
                  setMultiLegs((ls) => ls.map((l, idx) => (idx === i ? { ...l, to: a } : l)));
                  if (submitAttempted) validate();
                }}
                error={errors[`leg${i}.to`]}
              />
            </div>
            <div data-field={`leg${i}.date`}>
              <Input
                label="Date"
                type="date"
                required
                value={leg.date}
                min={today}
                onChange={(e) => {
                  setMultiLegs((ls) => ls.map((l, idx) => (idx === i ? { ...l, date: e.target.value } : l)));
                  if (submitAttempted) validate();
                }}
                error={errors[`leg${i}.date`]}
              />
            </div>
            <div className="flex items-end justify-end pb-1">
              <button
                type="button"
                onClick={() => removeLeg(i)}
                disabled={multiLegs.length <= 2}
                aria-label={`Remove flight ${i + 1}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-error-soft hover:text-error disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        onClick={addLeg}
        disabled={multiLegs.length >= 6}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
      >
        <Plus className="h-4 w-4" /> Add another flight
        {multiLegs.length >= 6 && <span className="text-xs font-normal">(max 6)</span>}
      </button>
    </div>
  );

  if (heroInline) {
    return (
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 sm:gap-5">
        <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-x-5">
          <div className="flex w-full justify-center sm:w-auto">{tripTabs('w-auto')}</div>
          <div data-field="passengers" className="w-full sm:w-[180px]">
            {paxField}
          </div>
          <div className="w-full sm:w-[176px]">{classField}</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0b171e]/85 p-4 shadow-pop backdrop-blur-xl transition-all duration-300 hover:border-brand/30 hover:shadow-[0_0_40px_rgba(230,255,25,0.12)] sm:p-5">
          {tripType !== 'multicity' ? (
            <div
              key={tripType}
              className={
                tripType === 'roundtrip'
                  ? 'animate-fade-in grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1fr_1fr]'
                  : 'animate-fade-in grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1fr]'
              }
            >
              <div data-field="route.from">{fromField}</div>
              <div className="hidden items-center justify-center pt-7 lg:flex">{swapButton}</div>
              <div data-field="route.to">{toField}</div>
              <div data-field="depart">{departField}</div>
              {tripType === 'roundtrip' && <div data-field="return">{returnField}</div>}
            </div>
          ) : (
            multicityForm
          )}
        </div>

        <div className="flex justify-center">
          <Button
            type="submit"
            size="lg"
            loading={searchMutation.isPending}
            icon={<Search className="h-4 w-4" />}
            className="px-8"
          >
            {searchMutation.isPending ? 'Searching…' : 'Search flights'}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card p-4 sm:p-5 lg:p-6">
      {tripTabs('mb-4 max-w-md')}

      {tripType !== 'multicity' ? (
        <div key={tripType} className="animate-fade-in flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <div data-field="route.from">{fromField}</div>
            <div className="hidden items-center justify-center pt-7 sm:flex">{swapButton}</div>
            <div data-field="route.to">{toField}</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[340px]">
            <div data-field="depart">{departField}</div>
            {tripType === 'roundtrip' && <div data-field="return">{returnField}</div>}
          </div>
        </div>
      ) : (
        multicityForm
      )}

      <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 lg:flex-row lg:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-lg">
          <div data-field="passengers">{paxField}</div>
          {classField}
        </div>
        {searchButton}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Search results come from a demo flight provider — prices are estimates and clearly labelled until a live
        flight search API is connected.
      </p>
    </form>
  );
}
