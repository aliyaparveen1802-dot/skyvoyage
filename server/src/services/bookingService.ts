import type {
  AddonsSelection,
  BoardingPass,
  Booking,
  BookingPassenger,
  FlightOffer,
  FlightSegment,
  PassengerInput,
  PriceBreakdown,
  QuoteResponse,
  SelectedSeat,
} from '../types.js';
import { AIRPORT_BY_IATA, COUNTER_POOL, GATE_POOL } from '../database/seed.js';
import {
  QUOTE_TTL_MS,
  bookingByReference,
  store,
  type StoredBooking,
  type StoredQuote,
  type UserRecord,
} from '../database/store.js';
import { getCalendarProvider } from '../integrations/calendarProvider.js';
import { getEmailProvider } from '../integrations/emailProvider.js';
import { getPaymentProvider } from '../integrations/paymentProvider.js';
import { isSeatSelectable, findSeat } from './seatService.js';
import { getSearch } from './searchService.js';
import { conflict, forbidden, notFound, unprocessable } from '../utils/errors.js';
import { Rng, round2 } from '../utils/prng.js';
import { randomId, randomReference } from '../utils/reference.js';
import { addMinutesIso, nowIso, wallClockIso } from '../utils/time.js';

export interface QuoteRequest {
  searchId: string;
  offerId: string;
  seats: Array<{ segmentId: string; passengerIndex: number; seatId: string }>;
  addons: AddonsSelection;
  passengers: PassengerInput[];
}

export interface ConfirmPaymentRequest {
  method: 'card' | 'wallet';
  card?: { number: string; name: string; expiry: string; cvc: string };
}

export interface ConfirmPaymentResult {
  booking: Booking;
  verification: {
    verified: boolean;
    verifiedBy: string;
    provider: string;
    note: string;
  };
}

const CHILD_MULTIPLIER = 0.75;
const INFANT_MULTIPLIER = 0.1;
const EXTRA_BAGGAGE_PRICE_PER_KG = 1660;
const PRIORITY_BOARDING_PRICE = 996;
const TRAVEL_INSURANCE_PRICE = 1494;
const MEAL_PRICE = 747;

/**
 * Seat pricing formula (computed server-side, never from client input):
 *   flight      = (offer.base + offer.taxes + offer.fees) * paxMultiplierSum,
 *                 where paxMultiplierSum = adult*1.0 + child*0.75 + infant*0.10
 *   seats       = sum of the selected seat prices (one seat per passenger per segment)
 *   baggage     = extraBaggageKg * Rs1,660 * seatPassengers      (adults + children)
 *   addons      = priorityBoarding(Rs996 * seatPassengers)
 *                 + travelInsurance(Rs1,494 * all passengers)
 *                 + meal(Rs747 * seatPassengers when meal != none)
 *   total       = round(flight + seats + baggage + addons), currency INR
 * The offer's own taxes already embed a 12% tax on base plus airport fees, so no
 * additional tax is layered on top at quote time.
 */
export function computeQuotePrice(
  offer: FlightOffer,
  passengers: PassengerInput[],
  seats: SelectedSeat[],
  addons: AddonsSelection,
): PriceBreakdown {
  const adultCount = passengers.filter((passenger) => passenger.type === 'adult').length;
  const childCount = passengers.filter((passenger) => passenger.type === 'child').length;
  const infantCount = passengers.filter((passenger) => passenger.type === 'infant').length;
  const paxMultiplierSum = adultCount + childCount * CHILD_MULTIPLIER + infantCount * INFANT_MULTIPLIER;
  const seatPassengers = adultCount + childCount;

  const flight = round2((offer.price.base + offer.price.taxes + offer.price.fees) * paxMultiplierSum);
  const seatTotal = round2(seats.reduce((sum, seat) => sum + seat.price, 0));
  const baggage = round2(addons.extraBaggageKg * EXTRA_BAGGAGE_PRICE_PER_KG * seatPassengers);
  let addonTotal = 0;
  if (addons.priorityBoarding) addonTotal += PRIORITY_BOARDING_PRICE * seatPassengers;
  if (addons.travelInsurance) addonTotal += TRAVEL_INSURANCE_PRICE * passengers.length;
  if (addons.meal !== 'none') addonTotal += MEAL_PRICE * seatPassengers;
  const addonsTotal = round2(addonTotal);

  return {
    base: round2(offer.price.base * paxMultiplierSum),
    taxes: round2(offer.price.taxes * paxMultiplierSum),
    fees: round2(offer.price.fees * paxMultiplierSum),
    seats: seatTotal,
    baggage,
    addons: addonsTotal,
    total: round2(flight + seatTotal + baggage + addonsTotal),
    currency: offer.price.currency,
  };
}

function orderedSeats(offer: FlightOffer, seats: SelectedSeat[]): SelectedSeat[] {
  const order = new Map<string, number>();
  offer.legs.forEach((leg) => {
    leg.segments.forEach((segment, index) => order.set(segment.id, index));
  });
  return [...seats].sort((a, b) => (order.get(a.segmentId) ?? 0) - (order.get(b.segmentId) ?? 0));
}

function findSegment(offer: FlightOffer, segmentId: string): FlightSegment | undefined {
  for (const leg of offer.legs) {
    const segment = leg.segments.find((candidate) => candidate.id === segmentId);
    if (segment) return segment;
  }
  return undefined;
}

function passengerTypeCounts(passengers: PassengerInput[]): { adult: number; child: number; infant: number } {
  return {
    adult: passengers.filter((passenger) => passenger.type === 'adult').length,
    child: passengers.filter((passenger) => passenger.type === 'child').length,
    infant: passengers.filter((passenger) => passenger.type === 'infant').length,
  };
}

export function createQuote(user: UserRecord, body: QuoteRequest): QuoteResponse {
  store.releaseHoldsForUser(user.id);
  const search = getSearch(body.searchId);
  const offer = search.offers.find((candidate) => candidate.id === body.offerId);
  if (!offer) {
    throw notFound('offer_not_found', 'This fare is no longer available. Please run a new search.');
  }

  const expected = search.query.passengers;
  const actual = passengerTypeCounts(body.passengers);
  const expectedTotal = expected.adult + expected.child + expected.infant;
  if (
    body.passengers.length !== expectedTotal ||
    actual.adult !== expected.adult ||
    actual.child !== expected.child ||
    actual.infant !== expected.infant
  ) {
    throw unprocessable(
      'passenger_count_mismatch',
      'Passenger details must match the passenger counts from your search.',
    );
  }

  const perSegment = new Map<string, Set<string>>();
  const passengerPerSegment = new Map<string, Set<number>>();
  const seenSeats = new Set<string>();

  for (const selection of body.seats) {
    const segment = findSegment(offer, selection.segmentId);
    if (!segment) {
      throw unprocessable('unknown_segment', 'One of the selected seats belongs to a different flight.');
    }
    if (selection.passengerIndex >= expectedTotal) {
      throw unprocessable('invalid_passenger_index', 'A seat was assigned to a passenger that does not exist.');
    }
    const seatKey = `${selection.segmentId}:${selection.seatId}`;
    if (seenSeats.has(seatKey)) {
      throw unprocessable('duplicate_seat', `Seat ${selection.seatId} was selected more than once.`);
    }
    seenSeats.add(seatKey);

    const segmentSeats = perSegment.get(selection.segmentId) ?? new Set<string>();
    segmentSeats.add(selection.seatId);
    perSegment.set(selection.segmentId, segmentSeats);

    const segmentPassengers = passengerPerSegment.get(selection.segmentId) ?? new Set<number>();
    if (segmentPassengers.has(selection.passengerIndex)) {
      throw unprocessable('duplicate_seat', 'A passenger cannot hold two seats on the same flight segment.');
    }
    segmentPassengers.add(selection.passengerIndex);
    passengerPerSegment.set(selection.segmentId, segmentPassengers);

    if (segmentSeats.size > expectedTotal) {
      throw unprocessable('too_many_seats', 'More seats were selected than there are passengers.');
    }

    const seat = findSeat(segment, selection.seatId);
    if (!seat) {
      throw unprocessable('unknown_seat', `Seat ${selection.seatId} does not exist on this flight.`);
    }
    if (!isSeatSelectable(segment, selection.seatId)) {
      throw conflict(
        'seat_unavailable',
        `Seat ${seat.label} was just taken — please pick a different seat.`,
        { seatId: seat.id },
      );
    }
  }

  const seats: SelectedSeat[] = body.seats.map((selection) => {
    const segment = findSegment(offer, selection.segmentId);
    const seat = segment ? findSeat(segment, selection.seatId) : undefined;
    if (!segment || !seat) {
      throw unprocessable('unknown_seat', `Seat ${selection.seatId} does not exist on this flight.`);
    }
    return {
      segmentId: selection.segmentId,
      passengerIndex: selection.passengerIndex,
      seatId: selection.seatId,
      label: seat.label,
      price: seat.price,
      zone: seat.zone,
    };
  });

  const price = computeQuotePrice(offer, body.passengers, orderedSeats(offer, seats), body.addons);
  const quoteId = randomId('qte');
  const expiresAt = Date.now() + QUOTE_TTL_MS;

  for (const seat of seats) {
    store.setHold(seat.segmentId, seat.seatId, { quoteId, expiresAt });
  }

  const record: StoredQuote = {
    id: quoteId,
    userId: user.id,
    searchId: search.id,
    offerId: offer.id,
    offer,
    seats: orderedSeats(offer, seats),
    price,
    addons: body.addons,
    passengers: body.passengers,
    tripType: search.query.tripType,
    createdAt: nowIso(),
    expiresAt,
  };
  store.quotes.set(quoteId, record);

  return {
    quoteId,
    offer,
    price,
    seats: record.seats,
    expiresAt: new Date(expiresAt).toISOString(),
    source: 'mock',
  };
}

function assertHoldsIntact(quote: StoredQuote): void {
  if (quote.expiresAt <= Date.now()) {
    store.quotes.delete(quote.id);
    store.releaseHoldsForQuote(quote.id);
    throw conflict('quote_expired', 'Your quote expired — please search again to hold these seats.');
  }
  for (const seat of quote.seats) {
    const hold = store.holdForSeat(seat.segmentId, seat.seatId);
    if (!hold || hold.quoteId !== quote.id || hold.expiresAt <= Date.now()) {
      throw conflict(
        'seat_unavailable',
        `Seat ${seat.label} was just taken — please pick your seats again.`,
        { seatId: seat.seatId },
      );
    }
  }
}

function uniqueReference(): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const reference = randomReference();
    if (!store.bookings.has(reference)) return reference;
  }
  throw conflict('reference_unavailable', 'Could not allocate a booking reference — please retry.');
}

function assignDemoDetails(bookingId: string, terminals: string[]): { gate: string; terminal: string; counter: string } {
  const rng = new Rng(`booking:${bookingId}`);
  return {
    gate: rng.pick(GATE_POOL),
    counter: rng.pick(COUNTER_POOL),
    terminal: rng.pick(terminals),
  };
}

function seatLabelsForPassenger(offer: FlightOffer, seats: SelectedSeat[], passengerIndex: number): string[] {
  const labels: string[] = [];
  for (const leg of offer.legs) {
    for (const segment of leg.segments) {
      const seat = seats.find(
        (candidate) => candidate.segmentId === segment.id && candidate.passengerIndex === passengerIndex,
      );
      if (seat) labels.push(seat.label);
    }
  }
  return labels;
}

function zoneForPassenger(seats: SelectedSeat[], passengerIndex: number): SelectedSeat['zone'] {
  const seat = seats.find((candidate) => candidate.passengerIndex === passengerIndex);
  return seat ? seat.zone : 'economy';
}

function boardingGroupFor(zone: SelectedSeat['zone']): string {
  if (zone === 'first') return 'A';
  if (zone === 'business') return 'B';
  if (zone === 'premium') return 'C';
  return 'Z';
}

async function queueBookingEmails(user: UserRecord, booking: StoredBooking): Promise<void> {
  const email = getEmailProvider();
  const first = booking.booking.offer.legs[0].segments[0];
  await email.send({
    to: user.email,
    subject: `Booking confirmed — ${booking.booking.reference}`,
    body: [
      `Hi ${user.firstName},`,
      '',
      `Your SkyVoyage booking ${booking.booking.reference} is confirmed.`,
      `${first.flightNumber}: ${first.from.city} (${first.from.iata}) → ${first.to.city} (${first.to.iata}).`,
      `Total paid: Rs${Math.round(booking.booking.price.total)} (${booking.booking.price.currency}).`,
      '',
      'This is a demo booking — no real ticket was issued and no money moved.',
    ].join('\n'),
    kind: 'booking_confirmation',
  });
  await email.send({
    to: user.email,
    subject: `E-ticket — ${booking.booking.reference}`,
    body: [
      `Hi ${user.firstName},`,
      '',
      `E-ticket for booking ${booking.booking.reference}.`,
      ...booking.booking.passengers.map(
        (passenger) => `${passenger.firstName} ${passenger.lastName}: ${passenger.seatLabels.join(', ') || 'seat assigned at check-in'}`,
      ),
      '',
      'Demo data — this document is not valid for travel.',
    ].join('\n'),
    kind: 'e_ticket',
  });
}

export async function confirmPayment(
  user: UserRecord,
  quoteId: string,
  body: ConfirmPaymentRequest,
): Promise<ConfirmPaymentResult> {
  const quote = store.quotes.get(quoteId);
  if (!quote) {
    throw notFound('quote_not_found', 'This quote no longer exists — please search again and create a new quote.');
  }
  if (quote.userId !== user.id) {
    throw forbidden('forbidden', 'This quote belongs to another account.');
  }
  assertHoldsIntact(quote);

  const payment = await getPaymentProvider().capture(body);
  const reference = uniqueReference();
  const bookingId = randomId('bkg');
  const firstSegment = quote.offer.legs[0].segments[0];
  const originTerminals = AIRPORT_BY_IATA.get(firstSegment.from.iata)?.terminals ?? ['1'];
  const { gate, terminal, counter } = assignDemoDetails(bookingId, originTerminals);

  const passengers: BookingPassenger[] = quote.passengers.map((passenger, index) => ({
    id: randomId('bp'),
    type: passenger.type,
    firstName: passenger.firstName,
    lastName: passenger.lastName,
    seatLabels: seatLabelsForPassenger(quote.offer, quote.seats, index),
    boardingPassIssued: true,
  }));

  const booking: Booking = {
    id: bookingId,
    reference,
    status: 'confirmed',
    createdAt: nowIso(),
    tripType: quote.tripType,
    cabin: firstSegment.cabin,
    passengers,
    offer: quote.offer,
    seats: quote.seats,
    addons: quote.addons,
    price: quote.price,
    payment: {
      status: 'captured',
      method: body.method,
      transactionId: payment.transactionId,
      paidAt: nowIso(),
    },
    checkInOpensAt: addMinutesIso(firstSegment.departureAt, -24 * 60),
  };

  const record: StoredBooking = { booking, userId: user.id, gate, terminal, counter };
  store.commitHoldsForQuote(quote.id);
  store.quotes.delete(quote.id);
  store.bookings.set(reference, record);
  const owned = store.bookingsByUser.get(user.id) ?? new Set<string>();
  owned.add(reference);
  store.bookingsByUser.set(user.id, owned);

  await queueBookingEmails(user, record);
  return {
    booking,
    verification: {
      verified: true,
      verifiedBy: 'server',
      provider: 'mock-payment',
      note: 'Payment verified server-side against the mock gateway; frontend confirmation is never trusted.',
    },
  };
}

function ownBooking(user: UserRecord, reference: string): StoredBooking {
  const record = bookingByReference(reference);
  if (!record || record.userId !== user.id) {
    throw notFound('booking_not_found', 'We could not find that booking.');
  }
  return record;
}

export function listBookings(user: UserRecord): Booking[] {
  const references = store.bookingsByUser.get(user.id) ?? new Set<string>();
  const bookings = [...references]
    .map((reference) => store.bookings.get(reference))
    .filter((record): record is StoredBooking => !!record)
    .map((record) => record.booking);
  bookings.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return bookings;
}

export function getBooking(user: UserRecord, reference: string): Booking {
  return ownBooking(user, reference).booking;
}

export function getBoardingPasses(user: UserRecord, reference: string): BoardingPass[] {
  const record = ownBooking(user, reference);
  const booking = record.booking;
  if (booking.status !== 'confirmed') return [];
  const firstSegment = booking.offer.legs[0].segments[0];
  const boardingAt = addMinutesIso(firstSegment.departureAt, -40);
  const departureDate = firstSegment.departureAt.slice(0, 10);

  return booking.passengers.map((passenger, index) => {
    const seat = booking.seats.find(
      (candidate) =>
        candidate.segmentId === firstSegment.id && candidate.passengerIndex === index,
    );
    const seatLabel = seat?.label ?? passenger.seatLabels[0] ?? '—';
    const zone = seat?.zone ?? zoneForPassenger(booking.seats, index);
    const name = `${passenger.firstName} ${passenger.lastName}`.toUpperCase();
    return {
      id: `bp_${booking.id}_${index}`,
      bookingReference: booking.reference,
      passengerName: `${passenger.firstName} ${passenger.lastName}`,
      flightNumber: firstSegment.flightNumber,
      airlineName: firstSegment.airlineName,
      from: `${firstSegment.from.iata} ${firstSegment.from.city}`,
      to: `${firstSegment.to.iata} ${firstSegment.to.city}`,
      seat: seatLabel,
      gate: record.gate,
      terminal: record.terminal,
      boardingAt,
      departureAt: firstSegment.departureAt,
      group: boardingGroupFor(zone),
      qrPayload: `SKY|${booking.reference}|${name}|${firstSegment.flightNumber}|${seatLabel}|${departureDate}`,
    };
  });
}

export async function cancelBooking(user: UserRecord, reference: string): Promise<Booking> {
  const record = ownBooking(user, reference);
  const booking = record.booking;
  if (booking.status === 'cancelled') {
    throw conflict('already_cancelled', 'This booking has already been cancelled.');
  }
  booking.status = 'cancelled';
  booking.payment.status = 'refunded';
  store.releaseSeats(booking.seats);

  const email = getEmailProvider();
  await email.send({
    to: user.email,
    subject: `Booking cancelled — ${booking.reference}`,
    body: `Hi ${user.firstName}, your SkyVoyage booking ${booking.reference} has been cancelled and the payment status is refunded. Demo data — no money moved.`,
    kind: 'booking_cancelled',
  });
  return booking;
}

export async function emailTicket(user: UserRecord, reference: string): Promise<{ ok: true; message: string; queuedTo: string }> {
  const record = ownBooking(user, reference);
  const message = `E-ticket queued to ${user.email}. In this demo emails are stored in the dev outbox.`;
  await getEmailProvider().send({
    to: user.email,
    subject: `E-ticket — ${record.booking.reference}`,
    body: `E-ticket for booking ${record.booking.reference}. Demo data — not valid for travel.`,
    kind: 'e_ticket',
  });
  return { ok: true, message, queuedTo: user.email };
}

export function calendarEvents(
  user: UserRecord,
  reference: string,
): Array<{ title: string; start: string; end: string; location: string; description: string }> {
  const record = ownBooking(user, reference);
  return getCalendarProvider().buildEvents(record.booking);
}

export function flightSegmentForBooking(user: UserRecord, reference: string): FlightSegment | null {
  const record = bookingByReference(reference);
  if (!record || record.userId !== user.id) return null;
  if (record.booking.status === 'cancelled') return null;
  return record.booking.offer.legs[0].segments[0];
}

export function boardingClockLocal(segment: FlightSegment, boardingAtIso: string): string {
  return wallClockIso(Date.parse(boardingAtIso), segment.from.timezone).slice(11, 16);
}
