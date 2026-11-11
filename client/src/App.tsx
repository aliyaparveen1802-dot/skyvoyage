import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { IntroAnimation } from '@/components/intro/IntroAnimation';
import { ProtectedRoute, FullScreenLoader } from '@/routes/ProtectedRoute';
import { FlightDetailsGuard } from '@/routes/BookingGuards';

const Home = lazy(() => import('@/pages/Home'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const SearchPage = lazy(() => import('@/pages/Search'));
const SearchResults = lazy(() => import('@/pages/SearchResults'));
const SeatSelection = lazy(() => import('@/pages/booking/SeatSelection'));
const PassengerDetails = lazy(() => import('@/pages/booking/PassengerDetails'));
const Checkout = lazy(() => import('@/pages/booking/Checkout'));
const BookingConfirmation = lazy(() => import('@/pages/booking/BookingConfirmation'));
const Help = lazy(() => import('@/pages/Help'));

const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'));
const MyTrips = lazy(() => import('@/pages/dashboard/MyTrips'));
const TripDetail = lazy(() => import('@/pages/dashboard/TripDetail'));
const BoardingPass = lazy(() => import('@/pages/dashboard/BoardingPass'));
const FlightTracking = lazy(() => import('@/pages/tracking/FlightTracking'));
const AirportGuide = lazy(() => import('@/pages/airport/AirportGuide'));
const AirportExplorer = lazy(() => import('@/pages/airport/AirportExplorer'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const SavedFlights = lazy(() => import('@/pages/dashboard/SavedFlights'));
const Profile = lazy(() => import('@/pages/account/Profile'));
const Settings = lazy(() => import('@/pages/account/Settings'));

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'onboarding', element: <Onboarding /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'search/results', element: <SearchResults /> },
      { path: 'flight/:offerId', element: <FlightDetailsGuard /> },
      { path: 'seat-selection', element: <SeatSelection /> },
      { path: 'passenger-details', element: <PassengerDetails /> },
      { path: 'help', element: <Help /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'checkout', element: <Checkout /> },
          { path: 'booking-confirmation/:reference', element: <BookingConfirmation /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <DashboardShell />,
            children: [
              { path: 'dashboard', element: <Dashboard /> },
              { path: 'my-trips', element: <MyTrips /> },
              { path: 'my-trips/:reference', element: <TripDetail /> },
              { path: 'boarding-pass/:reference', element: <BoardingPass /> },
              { path: 'flight-tracking', element: <FlightTracking /> },
              { path: 'flight-tracking/:flightNumber', element: <FlightTracking /> },
              { path: 'airport-guide', element: <AirportGuide /> },
              { path: 'airport-explorer', element: <AirportExplorer /> },
              { path: 'notifications', element: <Notifications /> },
              { path: 'saved-flights', element: <SavedFlights /> },
              { path: 'profile', element: <Profile /> },
              { path: 'settings', element: <Settings /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl font-extrabold text-brand">404</p>
      <h1 className="mt-3 text-xl font-bold text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-muted">The page you are looking for does not exist or has moved.</p>
      <a href="/" className="btn-primary mt-6">
        Back to home
      </a>
    </div>
  );
}

export function App() {
  return (
    <>
      <IntroAnimation />
      <Suspense fallback={<FullScreenLoader />}>
        <RouterProvider router={router} />
      </Suspense>
    </>
  );
}
