import { lazy, Suspense, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { SearchWidget } from '@/components/flight/SearchWidget';

const LandingScene = lazy(() => import('@/components/home/LandingScene'));

const LOGO_BASE = 'https://commons.wikimedia.org/wiki/Special:FilePath/';

const AIRLINES: { name: string; file: string; note?: string }[] = [
  { name: 'Emirates', file: 'Emirates_logo.svg' },
  { name: 'IndiGo', file: 'IndiGo_Airlines_logo.svg' },
  { name: 'Qatar Airways', file: 'Qatar_Airways_logo.svg' },
  { name: 'Air India', file: 'Air_India_2023.svg' },
  { name: 'Etihad Airways', file: 'Etihad-airways-logo.svg' },
  { name: 'Lufthansa', file: 'Lufthansa_Logo_2018.svg' },
  { name: 'Singapore Airlines', file: 'Singapore_Airlines_Logo.svg' },
  { name: 'Turkish Airlines', file: 'Turkish_Airlines_logo_2019.svg' },
  { name: 'British Airways', file: 'BRITISH_AIRWAYS_logo.svg' },
  { name: 'AirAsia', file: 'AirAsia_New_Logo_(2020).svg' },
  { name: 'Vistara', file: 'Vistara_Logo.svg', note: 'Vistara — now part of Air India' },
];

const PHOTO = (id: string, width: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;

type GalleryTileProps = {
  src: string;
  alt: string;
  className: string;
  delay: number;
  reduced: boolean;
};

function GalleryTile({ src, alt, className, delay, reduced }: GalleryTileProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);

  return (
    <motion.div
      ref={ref}
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.65, delay, ease: 'easeOut' }}
      className={`group relative overflow-hidden rounded-2xl ${className}`}
    >
      <motion.div style={reduced ? undefined : { y }} className="absolute -inset-[12%]">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
        />
      </motion.div>
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/55 via-transparent to-transparent"
        aria-hidden="true"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-4 right-4 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-brand text-navy opacity-0 shadow-glow transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M7 17 17 7M9 7h8v8" />
        </svg>
      </span>
    </motion.div>
  );
}

export default function Home() {
  const reduced = useReducedMotion();

  return (
    <>
      <div className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden">
        {/* Cinematic 3D landing background */}
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <Suspense fallback={null}>
            <LandingScene />
          </Suspense>
        </div>
        {/* Readability overlays */}
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(7,19,28,0.78)_0%,rgba(7,19,28,0.35)_45%,rgba(7,19,28,0.88)_100%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_8%_18%,rgba(7,19,28,0.85),transparent_58%)]"
          aria-hidden="true"
        />

        <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
          <motion.h1
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="mx-auto max-w-3xl text-center text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl"
          >
            Your Journey Starts Here.
          </motion.h1>

          <motion.p
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: 'easeOut' }}
            className="mx-auto mt-5 max-w-xl text-center text-base text-muted sm:text-lg"
          >
            Discover flights. Explore destinations. Travel smarter.
          </motion.p>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease: 'easeOut' }}
            className="mx-auto mt-10 w-full"
          >
            <SearchWidget variant="hero" layout="inline" />
          </motion.div>
        </section>
      </div>

      {/* Airline partners: infinite logo marquee */}
      <section aria-labelledby="airlines-title" className="border-t border-line/60 bg-navy py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            id="airlines-title"
            className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Trusted by Travelers.{' '}
            <span className="text-brand">Powered by Leading Airlines.</span>
          </h2>

          <div className="group mt-10 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
            <div className="sv-marquee flex w-max group-hover:[animation-play-state:paused]">
              {[false, true].map((duplicate) => (
                <div
                  key={duplicate ? 'copy-b' : 'copy-a'}
                  className="flex shrink-0"
                  aria-hidden={duplicate ? 'true' : undefined}
                >
                  {AIRLINES.map((airline) => (
                    <div
                      key={airline.name}
                      className="mr-5 flex h-16 w-[170px] shrink-0 items-center justify-center rounded-xl border border-black/5 bg-ink px-5 shadow-card transition duration-200 hover:-translate-y-0.5"
                    >
                      <img
                        src={`${LOGO_BASE}${airline.file}?width=320`}
                        alt={airline.name}
                        title={airline.note ?? airline.name}
                        loading="lazy"
                        decoding="async"
                        className="max-h-8 w-auto max-w-[118px] object-contain"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Editorial gallery */}
      <section aria-labelledby="priority-title" className="bg-navy-soft py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2
              id="priority-title"
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Your Journey, <span className="text-brand">Our Priority.</span>
            </h2>
            <p className="mt-4 text-base text-muted sm:text-lg">
              From takeoff to touchdown, experience smarter, smoother and more comfortable
              travel with SkyVoyage.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
            <GalleryTile
              src={PHOTO('35220411', 1200)}
              alt="Passengers seated in a bright modern aircraft cabin"
              className="h-[300px] md:h-[320px] lg:h-[500px] lg:row-span-2"
              delay={0}
              reduced={Boolean(reduced)}
            />
            <GalleryTile
              src={PHOTO('3646733', 700)}
              alt="View of an airplane wing above the clouds through a cabin window"
              className="h-[300px] md:h-[320px] lg:h-[500px] lg:row-span-2"
              delay={0.1}
              reduced={Boolean(reduced)}
            />
            <GalleryTile
              src={PHOTO('11757933', 700)}
              alt="Premium business class seat with plush bedding"
              className="h-[240px]"
              delay={0.2}
              reduced={Boolean(reduced)}
            />
            <GalleryTile
              src={PHOTO('5778660', 700)}
              alt="Passengers relaxing and enjoying the flight"
              className="h-[240px]"
              delay={0.3}
              reduced={Boolean(reduced)}
            />
          </div>
        </div>
      </section>
    </>
  );
}
