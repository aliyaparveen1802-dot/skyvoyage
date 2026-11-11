import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  AddonsSelection,
  FlightOffer,
  FlightSearchQuery,
  PassengerInput,
  QuoteResponse,
  SelectedSeat,
} from '@/types';

export const DEFAULT_ADDONS: AddonsSelection = {
  extraBaggageKg: 0,
  seatSelection: true,
  meal: 'none',
  specialAssistance: 'none',
  priorityBoarding: false,
  travelInsurance: false,
};

export const DEFAULT_SEARCH: FlightSearchQuery = {
  tripType: 'roundtrip',
  legs: [{ from: 'MAA', to: 'DXB', date: '' }, { from: 'DXB', to: 'MAA', date: '' }],
  passengers: { adult: 1, child: 0, infant: 0 },
  cabin: 'economy',
};

interface BookingDraft {
  search: FlightSearchQuery;
  searchId: string | null;
  offer: FlightOffer | null;
  seats: SelectedSeat[];
  passengers: PassengerInput[];
  addons: AddonsSelection;
  quote: QuoteResponse | null;
}

const EMPTY_DRAFT: BookingDraft = {
  search: DEFAULT_SEARCH,
  searchId: null,
  offer: null,
  seats: [],
  passengers: [],
  addons: DEFAULT_ADDONS,
  quote: null,
};

interface BookingContextValue extends BookingDraft {
  setSearch: (search: FlightSearchQuery, searchId: string | null) => void;
  selectOffer: (offer: FlightOffer, searchId: string) => void;
  clearOffer: () => void;
  setSeats: (seats: SelectedSeat[]) => void;
  setPassengers: (passengers: PassengerInput[]) => void;
  setAddons: (addons: AddonsSelection) => void;
  setQuote: (quote: QuoteResponse | null) => void;
  reset: () => void;
}

const STORAGE_KEY = 'skyvoyage_booking_draft';

const BookingContext = createContext<BookingContextValue | null>(null);

function loadDraft(): BookingDraft {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as Partial<BookingDraft>;
    return { ...EMPTY_DRAFT, ...parsed };
  } catch {
    return EMPTY_DRAFT;
  }
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft>(() => loadDraft());

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* ignore quota errors */
    }
  }, [draft]);

  const setSearch = useCallback((search: FlightSearchQuery, searchId: string | null) => {
    setDraft((d) => ({ ...d, search, searchId, offer: null, seats: [], quote: null }));
  }, []);

  const selectOffer = useCallback((offer: FlightOffer, searchId: string) => {
    setDraft((d) => ({ ...d, offer, searchId, seats: [], quote: null }));
  }, []);

  const clearOffer = useCallback(() => {
    setDraft((d) => ({ ...d, offer: null, seats: [], quote: null }));
  }, []);

  const setSeats = useCallback((seats: SelectedSeat[]) => setDraft((d) => ({ ...d, seats, quote: null })), []);
  const setPassengers = useCallback(
    (passengers: PassengerInput[]) => setDraft((d) => ({ ...d, passengers })),
    [],
  );
  const setAddons = useCallback((addons: AddonsSelection) => setDraft((d) => ({ ...d, addons })), []);
  const setQuote = useCallback((quote: QuoteResponse | null) => setDraft((d) => ({ ...d, quote })), []);
  const reset = useCallback(() => setDraft(EMPTY_DRAFT), []);

  const value = useMemo(
    () => ({ ...draft, setSearch, selectOffer, clearOffer, setSeats, setPassengers, setAddons, setQuote, reset }),
    [draft, setSearch, selectOffer, clearOffer, setSeats, setPassengers, setAddons, setQuote, reset],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}
