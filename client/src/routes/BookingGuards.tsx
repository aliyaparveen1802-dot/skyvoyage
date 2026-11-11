import { Navigate, useParams } from 'react-router-dom';
import { useBooking } from '@/context/BookingContext';
import FlightDetails from '@/pages/FlightDetails';

/** The details page is only reachable from an active search session. */
export function FlightDetailsGuard() {
  const { offerId } = useParams();
  const { searchId } = useBooking();

  if (!searchId || !offerId) {
    return <Navigate to="/search" replace />;
  }
  return <FlightDetails offerId={offerId} />;
}
