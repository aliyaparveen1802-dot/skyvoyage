import type { Booking, FlightSegment } from '../types.js';
import { isoWithOffset } from '../utils/time.js';

export interface CalendarEventDraft {
  title: string;
  start: string;
  end: string;
  location: string;
  description: string;
}

export interface CalendarProvider {
  buildEvents(booking: Booking): CalendarEventDraft[];
}

function firstSegment(booking: Booking): FlightSegment {
  return booking.offer.legs[0].segments[0];
}

function legRoute(leg: Booking['offer']['legs'][number]): string {
  const first = leg.segments[0];
  const last = leg.segments[leg.segments.length - 1];
  return `${first.from.iata} → ${last.to.iata}`;
}

export class MockCalendarProvider implements CalendarProvider {
  buildEvents(booking: Booking): CalendarEventDraft[] {
    const events: CalendarEventDraft[] = [];
    const originTz = firstSegment(booking).from.timezone;

    booking.offer.legs.forEach((leg, index) => {
      const first = leg.segments[0];
      const last = leg.segments[leg.segments.length - 1];
      const route = legRoute(leg);
      const flightNumber = first.flightNumber;
      const departure = Date.parse(first.departureAt);
      const arrival = Date.parse(last.arrivalAt);
      events.push({
        title: `SkyVoyage: ${route} (${flightNumber})`,
        start: isoWithOffset(departure, first.from.timezone),
        end: isoWithOffset(arrival, last.to.timezone),
        location: `${first.from.name} (${first.from.iata}) → ${last.to.name} (${last.to.iata})`,
        description: `Departure leg ${index + 1} of your SkyVoyage booking ${booking.reference}. Demo data — times are simulated.`,
      });
      events.push({
        title: `SkyVoyage: Arrive ${last.to.city} (${last.to.iata})`,
        start: isoWithOffset(arrival, last.to.timezone),
        end: isoWithOffset(arrival + 90 * 60_000, last.to.timezone),
        location: `${last.to.name} (${last.to.iata})`,
        description: `Arrival for ${flightNumber} on booking ${booking.reference}. Demo data.`,
      });
    });

    const outboundDeparture = Date.parse(firstSegment(booking).departureAt);
    events.push({
      title: `SkyVoyage: Check-in opens — ${booking.reference}`,
      start: isoWithOffset(outboundDeparture - 24 * 3_600_000, originTz),
      end: isoWithOffset(outboundDeparture - 24 * 3_600_000 + 30 * 60_000, originTz),
      location: firstSegment(booking).from.name,
      description: 'Online check-in reminder for your SkyVoyage booking. Demo data.',
    });
    events.push({
      title: `SkyVoyage: Boarding — ${firstSegment(booking).flightNumber}`,
      start: isoWithOffset(outboundDeparture - 40 * 60_000, originTz),
      end: isoWithOffset(outboundDeparture - 40 * 60_000 + 30 * 60_000, originTz),
      location: firstSegment(booking).from.name,
      description: 'Be at the gate 40 minutes before departure. Demo data.',
    });

    return events;
  }
}

export function getCalendarProvider(): CalendarProvider {
  return new MockCalendarProvider();
}
