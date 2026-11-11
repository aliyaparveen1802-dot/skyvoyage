import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { Plane, PlaneLanding, PlaneTakeoff } from 'lucide-react';
import { WORLD_PATHS, WORLD_VIEWBOX } from '@/assets/worldMapPaths';
import { cn } from '@/utils/cn';

/**
 * Decorative animated world-map background for the login page.
 * Sample route (New York → Milan) is for visual effect only — not live tracking.
 */

const P0 = { x: 294.4, y: 152.5 }; // New York (projected)
const P2 = { x: 525.5, y: 135.2 }; // Milan (projected)
const CP = { x: 410, y: 52 }; // arc control point (north of the route)
const MID = { x: (P0.x + P2.x) / 2, y: (P0.y + P2.y) / 2 };
const ROUTE_D = `M${P0.x} ${P0.y} Q${CP.x} ${CP.y} ${P2.x} ${P2.y}`;
const TOTAL_KM = 6470;
const PLANE_PX = 30;

const HIGHLIGHT = new Set(['US', 'IT']);

interface Frame {
  w: number;
  h: number;
}

function toPx(f: Frame, x: number, y: number) {
  const scale = Math.max(f.w / WORLD_VIEWBOX.w, f.h / WORLD_VIEWBOX.h);
  const ox = f.w / 2 - MID.x * scale;
  const oy = f.h / 2 - MID.y * scale;
  return { x: ox + x * scale, y: oy + y * scale };
}

function routePoint(v: number) {
  const u = 1 - v;
  const x = u * u * P0.x + 2 * u * v * CP.x + v * v * P2.x;
  const y = u * u * P0.y + 2 * u * v * CP.y + v * v * P2.y;
  const dx = 2 * u * (CP.x - P0.x) + 2 * v * (P2.x - CP.x);
  const dy = 2 * u * (CP.y - P0.y) + 2 * v * (P2.y - CP.y);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { x, y, angle };
}

function formatKm(n: number) {
  return n.toLocaleString('en-US').replace(/,/g, ' ');
}

const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 61 + 13) % 100}%`,
  top: `${(i * 37 + 7) % 100}%`,
  delay: `${(i % 7) * 1.3}s`,
  dur: `${9 + (i % 5) * 2.5}s`,
  size: 2 + (i % 3),
}));

function MapChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'pointer-events-none flex items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-[#0a1520]/75 px-3.5 py-2 text-[12px] font-medium text-ink shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-md sm:text-[13px]',
        className,
      )}
    >
      {children}
    </div>
  );
}

function DistanceReadout({ t }: { t: MotionValue<number> }) {
  const [km, setKm] = useState(() => Math.round((t.get() * TOTAL_KM) / 10) * 10);
  useMotionValueEvent(t, 'change', (v) => {
    const next = Math.round((v * TOTAL_KM) / 10) * 10;
    setKm((prev) => (prev === next ? prev : next));
  });
  return (
    <span>
      {formatKm(km)} <span className="text-muted">/ {formatKm(TOTAL_KM)} km</span>
    </span>
  );
}

export function LoginMapBackground() {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  const frameMV = useMotionValue<Frame | null>(null);
  const t = useMotionValue(0);

  const parX = useMotionValue(0);
  const parY = useMotionValue(0);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const apply = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;
      const f = { w, h };
      frameMV.set(f);
      setFrame((prev) => (prev && prev.w === w && prev.h === h ? prev : f));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [frameMV]);

  useEffect(() => {
    if (reduced) {
      t.set(0.55);
      return;
    }
    const controls = animate(t, 1, {
      duration: 17,
      ease: 'linear',
      repeat: Infinity,
      repeatDelay: 3,
      repeatType: 'loop',
    });
    return () => controls.stop();
  }, [reduced, t]);

  const planeX = useTransform(() => {
    const f = frameMV.get();
    if (!f) return -80;
    return toPx(f, routePoint(t.get()).x, routePoint(t.get()).y).x - PLANE_PX / 2;
  });
  const planeY = useTransform(() => {
    const f = frameMV.get();
    if (!f) return -80;
    return toPx(f, routePoint(t.get()).x, routePoint(t.get()).y).y - PLANE_PX / 2;
  });
  const planeR = useTransform(() => routePoint(t.get()).angle + 45);
  const trailLength = useTransform(() => t.get());
  const progressWidth = useTransform(() => `${Math.min(100, Math.max(0, t.get() * 100))}%`);

  // Three fixed glowing dots travelling along the route.
  const dot0x = useTransform(() => {
    const f = frameMV.get();
    const p = routePoint((t.get() + 0.12) % 1);
    return f ? toPx(f, p.x, p.y).x : -80;
  });
  const dot0y = useTransform(() => {
    const f = frameMV.get();
    const p = routePoint((t.get() + 0.12) % 1);
    return f ? toPx(f, p.x, p.y).y : -80;
  });
  const dot1x = useTransform(() => {
    const f = frameMV.get();
    const p = routePoint((t.get() + 0.45) % 1);
    return f ? toPx(f, p.x, p.y).x : -80;
  });
  const dot1y = useTransform(() => {
    const f = frameMV.get();
    const p = routePoint((t.get() + 0.45) % 1);
    return f ? toPx(f, p.x, p.y).y : -80;
  });
  const dot2x = useTransform(() => {
    const f = frameMV.get();
    const p = routePoint((t.get() + 0.78) % 1);
    return f ? toPx(f, p.x, p.y).x : -80;
  });
  const dot2y = useTransform(() => {
    const f = frameMV.get();
    const p = routePoint((t.get() + 0.78) % 1);
    return f ? toPx(f, p.x, p.y).y : -80;
  });

  const graticule = useMemo(() => {
    const parts: string[] = [];
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = ((lon + 180) / 360) * WORLD_VIEWBOX.w;
      parts.push(`M${x.toFixed(1)} 0V${WORLD_VIEWBOX.h}`);
    }
    for (let lat = -40; lat <= 80; lat += 20) {
      const y = ((84 - lat) / 142) * WORLD_VIEWBOX.h;
      parts.push(`M0 ${y.toFixed(1)}H${WORLD_VIEWBOX.w}`);
    }
    return parts.join(' ');
  }, []);

  const basePaths = useMemo(
    () =>
      WORLD_PATHS.filter((p) => !HIGHLIGHT.has(p.c)).map((p, i) => (
        <path key={`b${i}`} d={p.d} fillRule="evenodd" />
      )),
    [],
  );
  const highlightPaths = useMemo(
    () =>
      WORLD_PATHS.filter((p) => HIGHLIGHT.has(p.c)).map((p, i) => (
        <path key={`h${i}`} d={p.d} fillRule="evenodd" />
      )),
    [],
  );

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    parX.set(nx * 16);
    parY.set(ny * 10);
  };
  const handleLeave = () => {
    parX.set(0);
    parY.set(0);
  };

  const dep = frame ? toPx(frame, P0.x, P0.y) : null;
  const dest = frame ? toPx(frame, P2.x, P2.y) : null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="absolute inset-0 z-0 overflow-hidden bg-[#03070d]"
    >
      <style>{`
        .lp-cloud { animation: lp-cloud-drift linear infinite alternate; }
        @keyframes lp-cloud-drift {
          from { transform: translate3d(-7%, 0, 0) scale(1); }
          to { transform: translate3d(7%, 0, 0) scale(1.06); }
        }
        .lp-particle { animation: lp-particle-rise linear infinite; }
        @keyframes lp-particle-rise {
          0% { transform: translate3d(0, 8px, 0); opacity: 0; }
          15% { opacity: 0.7; }
          85% { opacity: 0.5; }
          100% { transform: translate3d(0, -26px, 0); opacity: 0; }
        }
      `}</style>

      {/* Ocean / atmosphere base */}
      <div className="absolute inset-0 bg-[radial-gradient(130%_90%_at_50%_-10%,#0b1a28_0%,#071320_40%,#04090f_75%,#03070d_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_45%_at_30%_75%,rgba(230,255,25,0.04)_0%,transparent_60%)]" />

      {/* Atmospheric clouds */}
      <div className="pointer-events-none absolute inset-0">
        <div className="lp-cloud absolute -left-[12%] top-[8%] h-[38%] w-[55%] rounded-full bg-[radial-gradient(ellipse,rgba(148,178,204,0.07)_0%,transparent_70%)] blur-2xl" style={{ animationDuration: '38s' }} />
        <div className="lp-cloud absolute -right-[15%] top-[42%] h-[42%] w-[60%] rounded-full bg-[radial-gradient(ellipse,rgba(148,178,204,0.055)_0%,transparent_70%)] blur-2xl" style={{ animationDuration: '52s', animationDelay: '-14s' }} />
        <div className="lp-cloud absolute bottom-[-8%] left-[22%] h-[32%] w-[50%] rounded-full bg-[radial-gradient(ellipse,rgba(120,150,190,0.05)_0%,transparent_70%)] blur-3xl" style={{ animationDuration: '46s', animationDelay: '-26s' }} />
      </div>

      {/* Slow pan layer (depth) */}
      <motion.div
        className="absolute inset-0"
        animate={reduced ? undefined : { scale: [1, 1.05, 1], x: [0, 10, 0], y: [0, -8, 0] }}
        transition={reduced ? undefined : { duration: 44, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Mouse parallax layer (map + markers + chips) */}
        <motion.div style={{ x: parX, y: parY }} className="absolute inset-0">
          <svg
            viewBox={`0 0 ${WORLD_VIEWBOX.w} ${WORLD_VIEWBOX.h}`}
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 h-full w-full"
          >
            <defs>
              <filter id="lp-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="lp-soft" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="4" />
              </filter>
            </defs>

            {/* Ocean graticule */}
            <path d={graticule} fill="none" stroke="rgba(140,175,210,0.08)" strokeWidth={0.45} />

            {/* Continents — dark blue / charcoal */}
            <g fill="#16232f" stroke="#2c4152" strokeWidth={0.55} opacity={0.96}>
              {basePaths}
            </g>

            {/* Route countries — Neon Lime */}
            <g
              fill="#dff62e"
              stroke="#a8c415"
              strokeWidth={0.55}
              opacity={0.92}
              filter="url(#lp-glow)"
            >
              {highlightPaths}
            </g>

            {/* Dotted flight path */}
            <path
              d={ROUTE_D}
              fill="none"
              stroke="#e6ff19"
              strokeWidth={1.7}
              strokeDasharray="0.1 6.5"
              strokeLinecap="round"
              opacity={0.5}
            />
            {/* Glowing trail behind the plane */}
            <motion.path
              d={ROUTE_D}
              fill="none"
              stroke="#e6ff19"
              strokeWidth={1.5}
              strokeLinecap="round"
              filter="url(#lp-glow)"
              style={{ pathLength: trailLength, opacity: 0.95 }}
            />

            {/* Departure marker */}
            <circle cx={P0.x} cy={P0.y} r={9} fill="none" stroke="#e6ff19" strokeWidth={1} opacity={0.35} />
            <circle cx={P0.x} cy={P0.y} r={4} fill="#e6ff19" filter="url(#lp-glow)" />

            {/* Destination marker — pulsing */}
            <motion.circle
              cx={P2.x}
              cy={P2.y}
              r={6}
              fill="none"
              stroke="#e6ff19"
              strokeWidth={1.4}
              animate={reduced ? undefined : { r: [5, 17], opacity: [0.7, 0] }}
              transition={reduced ? undefined : { duration: 1.9, repeat: Infinity, ease: 'easeOut' }}
            />
            <circle cx={P2.x} cy={P2.y} r={5.5} fill="#e6ff19" filter="url(#lp-glow)" />
            <circle cx={P2.x} cy={P2.y} r={2.2} fill="#0a1410" />

            {/* Moving route dots */}
            <motion.circle r={2.4} fill="#e6ff19" opacity={0.9} style={{ cx: dot0x, cy: dot0y }} filter="url(#lp-glow)" />
            <motion.circle r={2} fill="#e6ff19" opacity={0.7} style={{ cx: dot1x, cy: dot1y }} />
            <motion.circle r={1.7} fill="#e6ff19" opacity={0.55} style={{ cx: dot2x, cy: dot2y }} />
          </svg>

          {/* Airplane */}
          <motion.div
            className="absolute left-0 top-0 drop-shadow-[0_0_12px_rgba(230,255,25,0.85)]"
            style={{ x: planeX, y: planeY, rotate: planeR, width: PLANE_PX, height: PLANE_PX }}
          >
            <Plane className="h-full w-full fill-brand text-brand" strokeWidth={1.5} aria-hidden />
          </motion.div>

          {/* Route information chips */}
          {dep && (
            <div
              className="absolute hidden sm:block"
              style={{ left: dep.x - 10, top: dep.y - 14, transform: 'translate(-100%, -100%)' }}
            >
              <MapChip>
                <PlaneTakeoff className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                <span className="font-semibold text-ink">New York</span>
                <span className="text-muted">·</span>
                <span className="text-muted">Departure</span>
                <span className="font-semibold text-brand">6:30 PM</span>
              </MapChip>
            </div>
          )}
          {dest && (
            <div
              className="absolute hidden sm:block"
              style={{ left: dest.x + 10, top: dest.y - 14, transform: 'translateY(-100%)' }}
            >
              <MapChip>
                <PlaneLanding className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                <span className="font-semibold text-ink">Milan</span>
                <span className="text-muted">·</span>
                <span className="text-muted">Arrival</span>
                <span className="font-semibold text-brand">08:15 AM</span>
              </MapChip>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Floating information — stable UI layer */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-end justify-between gap-3 p-4 sm:p-6">
        <div className="rounded-2xl border border-white/10 bg-[#0a1520]/70 px-4 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.4)] backdrop-blur-md">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
            Distance to arrival
          </p>
          <div className="mt-2 h-2 w-36 overflow-hidden rounded-full bg-white/10 sm:w-48">
            <motion.div
              className="h-full rounded-full bg-brand shadow-[0_0_14px_rgba(230,255,25,0.65)]"
              style={{ width: progressWidth }}
            />
          </div>
          <p className="mt-2 text-sm font-bold text-ink">
            <DistanceReadout t={t} />
          </p>
          <p className="mt-1 text-[10px] leading-tight text-muted/70">
            Sample route · decorative background only
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-brand/30 bg-[#0e1a10]/80 px-4 py-2.5 shadow-[0_16px_48px_rgba(0,0,0,0.4)] backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
          </span>
          <span className="text-[13px] font-semibold text-ink">Currently Flying</span>
          <Plane className="h-3.5 w-3.5 -rotate-45 text-brand" aria-hidden />
        </div>
      </div>

      {/* Glowing particles */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="lp-particle absolute rounded-full bg-brand/60"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.dur,
              boxShadow: '0 0 6px rgba(230,255,25,0.55)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
