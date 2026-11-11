import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Info, Mail, Search, X } from 'lucide-react';
import { PageHeader } from '@/components/common/Brand';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/States';
import { cn } from '@/utils/cn';

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSection {
  id: string;
  title: string;
  items: FaqItem[];
}

const FAQ_SECTIONS: FaqSection[] = [
  {
    id: 'booking',
    title: 'Booking & tickets',
    items: [
      {
        q: 'How do I book a flight on SkyVoyage?',
        a: 'Search for a route and date on the home page, pick an offer from the results, choose your seats and add-ons, then confirm traveller details and pay. Your booking reference appears on the confirmation screen and in My trips.',
      },
      {
        q: 'Can I change or cancel a booking?',
        a: 'Open the trip from My trips and use Cancel booking to cancel it after a confirmation step. Whether you receive a refund depends on the fare rules of the airline you booked with.',
      },
      {
        q: 'How will I receive my ticket?',
        a: 'A copy is stored in your account under the trip, and you can email a copy to yourself from the trip page with the Email ticket button. Calendar files can be downloaded the same way.',
      },
      {
        q: 'What does my booking reference mean?',
        a: 'The reference is the six-character code shown at the top of your trip, for example SKY482. Airlines and airport staff use it to look up your reservation.',
      },
      {
        q: 'Are the prices I see real?',
        a: 'No. SkyVoyage is a demo product: fares come from a mock flight provider and are indicative only. Nothing is charged and no real ticket is issued.',
      },
      {
        q: 'Can I book for several people at once?',
        a: 'Yes. Select the number of adults, children and infants while searching, then enter each traveller on the passenger step. Saved passengers in your profile speed this up.',
      },
    ],
  },
  {
    id: 'checkin',
    title: 'Check-in & boarding',
    items: [
      {
        q: 'When does online check-in open?',
        a: 'Most airlines open online check-in 24 to 48 hours before departure. When check-in opens for your trip, the boarding pass page will issue a pass for each traveller.',
      },
      {
        q: 'Where is my boarding pass?',
        a: 'Open My trips, select your booking and tap View boarding pass. If passes are not issued yet, the page explains that check-in has not opened rather than inventing gate or seat details.',
      },
      {
        q: 'What do I need at the gate?',
        a: 'Your boarding pass and a government-issued photo ID that matches the passenger name. Check the pass for the gate, terminal and boarding time once the airline assigns them.',
      },
      {
        q: 'How will I hear about gate changes?',
        a: 'Gate changes arrive as notifications in the app and, if you enabled them, by email. You can control these alerts in Notifications or Settings.',
      },
      {
        q: 'What happens if my flight is delayed or cancelled?',
        a: 'You will get a notification and the trip status updates in My trips. Track flight shows the live status for the flight number, including estimated times when the airline provides them.',
      },
    ],
  },
  {
    id: 'seats',
    title: 'Seats & baggage',
    items: [
      {
        q: 'How do I choose my seat?',
        a: 'Seat selection happens during booking, before payment. The seat map shows available seats, their price and their zone — window, middle or aisle is shown for every seat.',
      },
      {
        q: 'What is included in my fare?',
        a: 'Every fare shows a full breakdown: base fare, taxes, airport fees, plus anything you added for seats, baggage and other add-ons. Cabin and checked baggage allowances are listed per flight segment.',
      },
      {
        q: 'How much baggage can I bring?',
        a: 'Allowances differ by airline and cabin. Each flight segment lists its cabin and checked baggage in kilograms so you can compare offers accurately.',
      },
      {
        q: 'Can I add baggage after booking?',
        a: 'Extra baggage can be added as an add-on while booking. For changes after booking, contact your airline with your booking reference — this demo does not process post-booking extras.',
      },
      {
        q: 'I need special assistance — what should I do?',
        a: 'Select the assistance option (wheelchair, visual, hearing or medical) as an add-on during booking so the airline is informed, and arrive at the airport early.',
      },
    ],
  },
  {
    id: 'airport',
    title: 'Airport navigation',
    items: [
      {
        q: 'What does the airport guide do?',
        a: 'It walks you through each stage of your journey at the airport — terminal, check-in counter, security, immigration and boarding — with timing estimates and locations where the data exists.',
      },
      {
        q: 'Can it guide me to my gate in real time?',
        a: 'It shows gate and terminal details once they are assigned and known. Values come from the booking or airport data; anything unknown is clearly marked as not assigned yet.',
      },
      {
        q: 'Which airports are supported?',
        a: 'Guides are available for a handful of hub airports in this demo, including MAA, DEL, DXB, SIN and LHR. The airport explorer lists facilities for each supported airport.',
      },
      {
        q: 'How accurate are walking times?',
        a: 'Walking estimates use a fixed average pace and your terminal layout, so treat them as a guide and add your own buffer for busy periods and security queues.',
      },
      {
        q: 'What can I find in the airport explorer?',
        a: 'Lounges, dining, hotels, shops, prayer rooms, wellness and medical services — with location, opening hours and whether you can book them in advance.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    items: [
      {
        q: 'Which payment methods can I use?',
        a: 'The checkout demo accepts card and wallet payments. No real payment is processed in this product, so no card details are stored.',
      },
      {
        q: 'When is my card charged?',
        a: 'In a real product, payment is taken when the booking is confirmed. Here the payment step only simulates that confirmation and shows a payment status on your trip.',
      },
      {
        q: 'Do you store my card details?',
        a: 'No. Card fields are never persisted by this demo, and the trip page only shows the payment method and status returned by the mock service.',
      },
      {
        q: 'How do refunds work?',
        a: 'Refunds follow the airline fare rules and appear as a refunded payment status on the trip. In this demo no money ever moves, so refunds are simulated only.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account',
    items: [
      {
        q: 'Do I need an account to search for flights?',
        a: 'No — searching, price calendars and flight tracking work without an account. You need one to book, save flights and receive notifications.',
      },
      {
        q: 'How do I save my personal details?',
        a: 'Add them once under Profile. First and last name are required, and saved passengers can be reused at checkout with their date of birth and optional passport details.',
      },
      {
        q: 'How do I change my preferences?',
        a: 'Settings holds your display currency, language, default cabin, distance unit, notification choices, accessibility options and privacy toggles.',
      },
      {
        q: 'How do I sign out?',
        a: 'Use Sign out in Settings or the account menu in the header. Signing out clears your session token from this browser immediately.',
      },
      {
        q: 'Are passport numbers stored in full?',
        a: 'They are masked in the interface — only the first two and last two characters are shown, with a security note explaining the masking.',
      },
    ],
  },
];

function AccordionSection({
  section,
  open,
  onToggle,
}: {
  section: FaqSection;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = `faq-panel-${section.id}`;
  const buttonId = `faq-button-${section.id}`;

  return (
    <section className="card overflow-hidden">
      <h2>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-canvas sm:px-5"
        >
          <span className="text-sm font-bold uppercase tracking-wide text-ink">{section.title}</span>
          <span className="flex items-center gap-2 text-xs text-muted">
            {section.items.length} answers
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
              aria-hidden
            />
          </span>
        </button>
      </h2>
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open}>
        <dl className="divide-y divide-line border-t border-line">
          {section.items.map((item) => (
            <div key={item.q} className="px-4 py-4 sm:px-5">
              <dt className="text-sm font-semibold text-ink">{item.q}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export default function Help() {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>('booking');

  const trimmed = query.trim().toLowerCase();

  const visibleSections = useMemo(() => {
    if (!trimmed) return FAQ_SECTIONS;
    return FAQ_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.q.toLowerCase().includes(trimmed) || item.a.toLowerCase().includes(trimmed),
      ),
    })).filter((section) => section.items.length > 0);
  }, [trimmed]);

  const totalMatches = visibleSections.reduce((sum, section) => sum + section.items.length, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Help centre"
        subtitle="Answers about booking, check-in, baggage, airports and your account."
      />

      <div className="relative mt-5">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search help topics, e.g. baggage or refund"
          aria-label="Search help topics"
          className="input pl-10 pr-10"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {trimmed && totalMatches === 0 ? (
        <div className="card mt-5">
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title="No answers matched your search"
            description={`Nothing in the help centre matches “${query.trim()}”. Try a shorter word, or email our support team.`}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="secondary" onClick={() => setQuery('')}>
                  Clear search
                </Button>
                <a href="mailto:support@skyvoyage.example" className="btn-primary">
                  <Mail className="h-4 w-4" aria-hidden /> Email support
                </a>
              </div>
            }
          />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {trimmed && (
            <p className="text-sm text-muted" role="status">
              {totalMatches === 1 ? '1 answer matches' : `${totalMatches} answers match`} “
              {query.trim()}”
            </p>
          )}
          {visibleSections.map((section) => (
            <AccordionSection
              key={section.id}
              section={section}
              open={trimmed.length > 0 || openId === section.id}
              onToggle={() => setOpenId(openId === section.id ? null : section.id)}
            />
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="card p-5" aria-labelledby="contact-heading">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Mail className="h-5 w-5" aria-hidden />
          </span>
          <h2 id="contact-heading" className="mt-3 text-base font-bold text-ink">
            Contact support
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Still stuck? Email us and a human will get back to you — we usually reply within one
            business day, often sooner.
          </p>
          <a href="mailto:support@skyvoyage.example" className="btn-primary mt-4 w-full sm:w-auto">
            support@skyvoyage.example
          </a>
          <p className="mt-3 text-xs text-muted">Typical response time: under 24 hours on weekdays.</p>
        </section>

        <section className="card p-5" aria-labelledby="shortcuts-heading">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Info className="h-5 w-5" aria-hidden />
          </span>
          <h2 id="shortcuts-heading" className="mt-3 text-base font-bold text-ink">
            This is a demo product
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Flights, prices, airport data and notifications are sample data from a mock provider.
            No real booking is made, no payment is taken and no email is actually sent.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/search" className="btn-secondary">
              <Search className="h-4 w-4" aria-hidden /> Search flights
            </Link>
            <Link to="/login" className="btn-ghost">
              Sign in
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
