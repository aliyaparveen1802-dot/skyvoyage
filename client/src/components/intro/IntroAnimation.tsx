import { useEffect, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion, type Transition } from 'framer-motion';
import { Plane } from 'lucide-react';

const DOOR_DELAY = 1.55;
const DOOR_DURATION = 1.55;
const UNMOUNT_MS = 3400;

const TAKEOFF_TRANSITION: Transition = {
  delay: 0.38,
  duration: 1.3,
  times: [0, 0.22, 0.58, 1],
  ease: ['easeIn', 'easeIn', 'easeIn'],
};

const DOOR_TRANSITION: Transition = {
  delay: DOOR_DELAY,
  duration: DOOR_DURATION,
  ease: [0.76, 0, 0.24, 1],
};

const SEAM_GLOW: CSSProperties = {
  background:
    'linear-gradient(180deg, rgba(230,255,25,0) 0%, rgba(230,255,25,0.85) 22%, rgba(230,255,25,0.95) 50%, rgba(230,255,25,0.85) 78%, rgba(230,255,25,0) 100%)',
  boxShadow: '0 0 24px 5px rgba(230,255,25,0.30), 0 0 64px 18px rgba(230,255,25,0.10)',
};

const LEFT_DOOR_BG =
  'radial-gradient(62% 44% at 100% 114%, rgba(3,8,12,0.98) 0%, rgba(3,8,12,0) 64%),' +
  ' radial-gradient(46% 30% at 100% 105%, rgba(230,255,25,0.12) 0%, rgba(230,255,25,0) 72%),' +
  ' radial-gradient(95% 62% at 100% -8%, rgba(247,248,242,0.07) 0%, rgba(247,248,242,0) 60%),' +
  ' linear-gradient(168deg, #0c1b25 0%, #07131c 55%, #050d13 100%)';

const RIGHT_DOOR_BG =
  'radial-gradient(62% 44% at 0% 114%, rgba(3,8,12,0.98) 0%, rgba(3,8,12,0) 64%),' +
  ' radial-gradient(46% 30% at 0% 105%, rgba(230,255,25,0.12) 0%, rgba(230,255,25,0) 72%),' +
  ' radial-gradient(95% 62% at 0% -8%, rgba(247,248,242,0.07) 0%, rgba(247,248,242,0) 60%),' +
  ' linear-gradient(192deg, #0c1b25 0%, #07131c 55%, #050d13 100%)';

const ENGINES: Array<[number, number]> = [
  [140, 250],
  [78, 324],
  [260, 250],
  [322, 324],
];

const WINDOWS = Array.from({ length: 21 }, (_, i) => 96 + i * 15);

const DOORS = [116, 296, 420];

function PlaneArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 560" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="iv-fuselage" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d7ddd6" />
          <stop offset="0.3" stopColor="#ffffff" />
          <stop offset="0.64" stopColor="#f3f5f0" />
          <stop offset="1" stopColor="#c6ccc5" />
        </linearGradient>
        <linearGradient id="iv-wing" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor="#edf0eb" />
          <stop offset="1" stopColor="#bfc6be" />
        </linearGradient>
        <linearGradient id="iv-nacelle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#dce1da" />
          <stop offset="0.42" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c4cac3" />
        </linearGradient>
        <linearGradient id="iv-fin" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1c2d38" />
          <stop offset="1" stopColor="#0a161e" />
        </linearGradient>
        <filter id="iv-soft-shadow" x="-40%" y="-30%" width="180%" height="160%">
          <feGaussianBlur stdDeviation="15" />
        </filter>
      </defs>

      {/* Soft aircraft shadow */}
      <g filter="url(#iv-soft-shadow)" opacity="0.45" transform="translate(13 26)">
        <path
          fill="#01060a"
          d="M200,26 C216,44 222,78 222,112 L222,248 L374,398 Q381,413 371,430 L222,344 L220,468 L284,514 Q289,527 275,536 L200,514 L125,536 Q111,527 116,514 L180,468 L178,344 L29,430 Q19,413 26,398 L178,248 L178,112 C178,78 184,44 200,26 Z"
        />
      </g>

      {/* Engines (tucked beneath the wings) */}
      {ENGINES.map(([cx, cy]) => (
        <g key={`engine-${cx}-${cy}`}>
          <rect x={cx - 3.5} y={cy + 46} width={7} height={30} rx={2} fill="#b4bbb3" />
          <rect x={cx - 13} y={cy} width={26} height={60} rx={13} fill="url(#iv-nacelle)" />
          <rect x={cx - 13} y={cy} width={26} height={16} rx={8} fill="#0b171f" />
          <rect x={cx - 8} y={cy + 3} width={16} height={11} rx={5} fill="#03080c" />
          <rect x={cx - 13} y={cy + 15} width={26} height={5} fill="#e6ff19" />
          <rect x={cx - 9} y={cy + 51} width={18} height={9} rx={4} fill="#27313a" />
        </g>
      ))}

      {/* Wings */}
      <path fill="url(#iv-wing)" d="M178,248 L26,398 Q19,413 29,430 L178,344 Z" />
      <path fill="url(#iv-wing)" d="M222,248 L374,398 Q381,413 371,430 L222,344 Z" />
      <path d="M180,326 L40,418" stroke="rgba(13,26,34,0.15)" strokeWidth="1.6" fill="none" />
      <path d="M220,326 L360,418" stroke="rgba(13,26,34,0.15)" strokeWidth="1.6" fill="none" />
      <path fill="#e6ff19" d="M366,390 L374,398 L371,430 L361,424 Z" />
      <path fill="#e6ff19" d="M34,390 L26,398 L29,430 L39,424 Z" />

      {/* Horizontal stabilizers */}
      <path fill="url(#iv-wing)" d="M181,470 L117,513 Q111,527 125,534 L187,517 Z" />
      <path fill="url(#iv-wing)" d="M219,470 L283,513 Q289,527 275,534 L213,517 Z" />

      {/* Fuselage */}
      <path
        fill="url(#iv-fuselage)"
        d="M200,24 C215,37 222,68 222,106 L223,300 L222,442 C222,474 218,500 211,518 L189,518 C182,500 178,474 178,442 L177,300 L178,106 C178,68 185,37 200,24 Z"
      />

      {/* Cockpit windows */}
      <path fill="#0b171f" d="M185,62 Q200,49 215,62 L212,77 Q200,66 188,77 Z" />

      {/* Cabin windows */}
      {WINDOWS.map((y) => (
        <g key={`window-${y}`}>
          <circle cx="187" cy={y} r="2.4" fill="#0e1a23" opacity="0.9" />
          <circle cx="213" cy={y} r="2.4" fill="#0e1a23" opacity="0.9" />
        </g>
      ))}

      {/* Doors */}
      {DOORS.map((y) => (
        <g key={`door-${y}`}>
          <rect x="177.5" y={y} width="8" height="18" rx="2.5" fill="#0b171f" opacity="0.35" />
          <rect x="214.5" y={y} width="8" height="18" rx="2.5" fill="#0b171f" opacity="0.35" />
        </g>
      ))}

      {/* Brand roundel */}
      <circle cx="200" cy="424" r="10" fill="#e6ff19" />
      <path fill="#07131c" d="M200,417.5 L205,429 L200,426 L195,429 Z" />

      {/* Vertical fin */}
      <path fill="url(#iv-fin)" d="M200,448 L192,536 L208,536 Z" />
      <path fill="#e6ff19" d="M194.5,514 L205.5,514 L207,534 L193,534 Z" />
    </svg>
  );
}

export function IntroAnimation() {
  const reduced = useReducedMotion();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (reduced || done) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => setDone(true), UNMOUNT_MS);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [reduced, done]);

  if (reduced || done) return null;

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden" aria-hidden="true">
      {/* Split-door panels */}
      <div className="absolute inset-0" style={{ perspective: '1500px' }}>
        <motion.div
          className="absolute inset-y-0 left-0 w-1/2 overflow-hidden"
          style={{
            background: LEFT_DOOR_BG,
            boxShadow: 'inset -60px 0 80px -45px rgba(0,0,0,0.9)',
            willChange: 'transform',
          }}
          initial={{ x: '0%', rotateY: 0 }}
          animate={{ x: '-100%', rotateY: -5 }}
          transition={{ ...DOOR_TRANSITION }}
        >
          <motion.div
            className="absolute left-[6%] top-[8%] h-[42%] w-[88%] rounded-full opacity-60 blur-[64px]"
            style={{ background: '#152631' }}
            animate={{ x: [0, 20, 0], y: [0, -16, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[3px]" style={SEAM_GLOW} />
        </motion.div>

        <motion.div
          className="absolute inset-y-0 right-0 w-1/2 overflow-hidden"
          style={{
            background: RIGHT_DOOR_BG,
            boxShadow: 'inset 60px 0 80px -45px rgba(0,0,0,0.9)',
            willChange: 'transform',
          }}
          initial={{ x: '0%', rotateY: 0 }}
          animate={{ x: '100%', rotateY: 5 }}
          transition={{ ...DOOR_TRANSITION }}
        >
          <motion.div
            className="absolute bottom-[14%] right-[6%] h-[45%] w-[80%] rounded-full opacity-55 blur-[64px]"
            style={{ background: '#13222d' }}
            animate={{ x: [0, -18, 0], y: [0, 14, 0] }}
            transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px]" style={SEAM_GLOW} />
        </motion.div>
      </div>

      {/* Stage: aircraft, trail and branding */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6">
        <motion.div
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.06 }}
        >
          <motion.div
            className="relative"
            style={{ perspective: '1000px' }}
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <motion.div
              className="relative"
              initial={{ y: '0vh', scale: 1, rotateX: 0, opacity: 1 }}
              animate={{
                y: ['0vh', '-4vh', '-30vh', '-58vh'],
                scale: [1, 0.94, 0.55, 0.16],
                rotateX: [0, 2, 7, 14],
                opacity: [1, 1, 1, 0],
              }}
              transition={{ ...TAKEOFF_TRANSITION }}
            >
              <div
                className="pointer-events-none absolute inset-0 -z-10 rounded-full"
                style={{ background: 'radial-gradient(closest-side, rgba(230,255,25,0.10), rgba(230,255,25,0))' }}
              />
              <PlaneArt className="block h-[46vh] max-h-[620px] w-auto sm:h-[52vh] lg:h-[56vh]" />
            </motion.div>

            {/* Flight trail, anchored at the take-off point */}
            <div className="absolute left-1/2 top-full -translate-x-1/2">
              <motion.div
                className="origin-top"
                style={{
                  width: 3,
                  height: '58vh',
                  borderRadius: 999,
                  background:
                    'linear-gradient(180deg, rgba(247,248,242,0.95) 0%, rgba(230,255,25,0.5) 42%, rgba(230,255,25,0) 100%)',
                  filter: 'blur(3px)',
                  boxShadow: '0 0 16px rgba(230,255,25,0.5)',
                }}
                initial={{ y: '0vh', scaleY: 0, opacity: 0 }}
                animate={{
                  y: ['0vh', '-4vh', '-30vh', '-58vh'],
                  scaleY: [0, 0.07, 0.52, 1],
                  opacity: [0, 0.9, 0.7, 0],
                }}
                transition={{ ...TAKEOFF_TRANSITION }}
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Branding */}
        <motion.div
          className="relative mt-5 flex flex-col items-center gap-4 sm:mt-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: [0, 1, 1, 0], y: [12, 0, 0, -18] }}
          transition={{ duration: 2, times: [0, 0.15, 0.55, 0.9], ease: 'easeInOut' }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-navy shadow-[0_0_22px_rgba(230,255,25,0.45)]">
              <Plane className="h-6 w-6 -rotate-45" />
            </span>
            <span className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Sky<span className="text-brand">Voyage</span>
            </span>
          </div>
          <div className="h-[3px] w-36 overflow-hidden rounded-full bg-white/10 sm:w-44">
            <motion.div
              className="h-full w-full origin-left rounded-full"
              style={{ background: 'linear-gradient(90deg, #e6ff19, #c9e600)' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.5, delay: 0.3, ease: [0.65, 0, 0.35, 1] }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
