import { useCallback, useState } from 'react';
import type { FlightSearchQuery } from '@/types';

const KEY = 'skyvoyage_recent_searches';

export interface RecentSearch {
  id: string;
  query: FlightSearchQuery;
  label: string;
  sublabel: string;
  at: number;
}

function read(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentSearch[]) : [];
  } catch {
    return [];
  }
}

function write(items: RecentSearch[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 5)));
  } catch {
    /* storage unavailable */
  }
}

export function useRecentSearches() {
  const [items, setItems] = useState<RecentSearch[]>(() => read());

  const push = useCallback((query: FlightSearchQuery) => {
    const legs = query.legs;
    const label =
      query.tripType === 'multicity'
        ? `${legs.length} flights · multi-city`
        : `${legs[0]?.from ?? ''} → ${legs[0]?.to ?? ''}`;
    const sublabel =
      query.tripType === 'roundtrip' && legs[1]
        ? `${legs[0].date} – ${legs[1].date}`
        : (legs[0]?.date ?? '');
    const entry: RecentSearch = {
      id: `${legs.map((l) => `${l.from}${l.to}${l.date}`).join('-')}-${query.cabin}`,
      query,
      label,
      sublabel,
      at: Date.now(),
    };
    const next = [entry, ...read().filter((r) => r.id !== entry.id)];
    write(next);
    setItems(next);
  }, []);

  const clear = useCallback(() => {
    write([]);
    setItems([]);
  }, []);

  return { items, push, clear };
}
