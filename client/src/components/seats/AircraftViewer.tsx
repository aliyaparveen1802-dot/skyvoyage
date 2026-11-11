import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Box, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import * as THREE from 'three';
import type { SeatZone } from '@/types';
import { cn } from '@/utils/cn';

type ViewId = 'iso' | 'front' | 'rear' | 'left' | 'right' | 'top';

const VIEWS: Record<ViewId, { yaw: number; pitch: number }> = {
  iso: { yaw: -0.62, pitch: 0.34 },
  front: { yaw: 0, pitch: 0.08 },
  rear: { yaw: Math.PI, pitch: 0.08 },
  left: { yaw: -Math.PI / 2, pitch: 0.05 },
  right: { yaw: Math.PI / 2, pitch: 0.05 },
  top: { yaw: -Math.PI / 2, pitch: 1.32 },
};

const VIEW_BUTTONS: Array<{ id: ViewId; label: string }> = [
  { id: 'front', label: 'Front' },
  { id: 'rear', label: 'Rear' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
  { id: 'top', label: 'Top' },
];

/* Approximate cabin bands along the fuselage (nose at +X, tail at −X). */
const ZONE_BANDS: Record<SeatZone, { x: number; len: number }> = {
  first: { x: 10, len: 3.4 },
  business: { x: 6.2, len: 4.6 },
  premium: { x: 2.4, len: 3 },
  economy: { x: -5.4, len: 11.4 },
};

const DEFAULT_DIST = 34;
const MIN_DIST = 15;
const MAX_DIST = 60;
const PITCH_MIN = -0.25;
const PITCH_MAX = 1.35;

interface CamCtl {
  yaw: number;
  pitch: number;
  dist: number;
  tYaw: number;
  tPitch: number;
  tDist: number;
}

interface Props {
  windowRows: number;
  highlightZone: SeatZone | null;
  reduced: boolean;
  className?: string;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function shortestAngle(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/* --------------------------- procedural aircraft --------------------------- */

function fuselageGeometry(): THREE.LatheGeometry {
  const profile: Array<[number, number]> = [
    [0.08, -15.2],
    [0.5, -14.3],
    [0.95, -13.1],
    [1.28, -11.6],
    [1.42, -10],
    [1.45, -6],
    [1.45, 2],
    [1.45, 7],
    [1.42, 9.5],
    [1.3, 11],
    [1.05, 12.3],
    [0.72, 13.4],
    [0.36, 14.2],
    [0.06, 14.8],
  ];
  const points = profile.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(points, 44);
  geo.rotateZ(-Math.PI / 2);
  return geo;
}

function wingGeometry(span: number, rootChord: number, tipChord: number, sweep: number): THREE.ExtrudeGeometry {
  const leadRoot = rootChord * 0.42;
  const trailRoot = -rootChord * 0.58;
  const leadTip = leadRoot - sweep;
  const trailTip = leadTip - tipChord;
  const shape = new THREE.Shape();
  shape.moveTo(leadRoot, 0);
  shape.lineTo(leadTip, span);
  shape.lineTo(trailTip, span);
  shape.lineTo(trailRoot, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.08);
  return geo;
}

function finGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-9.8, 0);
  shape.lineTo(-12.7, 3.9);
  shape.lineTo(-14, 3.9);
  shape.lineTo(-14.5, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.08);
  return geo;
}

function radialShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.62)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.28)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Aircraft({ windowRows }: { windowRows: number }) {
  const bodyGeo = useMemo(() => fuselageGeometry(), []);
  const wingGeo = useMemo(() => wingGeometry(7.4, 5, 1.6, 2.6), []);
  const stabGeo = useMemo(() => wingGeometry(3, 2.2, 0.9, 1), []);
  const finGeo = useMemo(() => finGeometry(), []);
  const shadowTex = useMemo(() => radialShadowTexture(), []);
  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#dde3e8', metalness: 0.35, roughness: 0.38 }),
    [],
  );
  const trimMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#b9c2c9', metalness: 0.4, roughness: 0.45 }),
    [],
  );
  const darkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#141a20', metalness: 0.5, roughness: 0.55 }),
    [],
  );
  const limeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e6ff19',
        emissive: '#e6ff19',
        emissiveIntensity: 0.35,
        metalness: 0.2,
        roughness: 0.4,
      }),
    [],
  );
  const windowGeo = useMemo(() => new THREE.BoxGeometry(0.17, 0.3, 0.07), []);
  const windowMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0b1218', metalness: 0.7, roughness: 0.25 }),
    [],
  );

  const windows = useMemo(() => {
    const rows = clamp(Math.round(windowRows), 4, 34);
    const items: Array<{ x: number; side: 1 | -1 }> = [];
    const startX = -10.4;
    const endX = 10.4;
    const step = rows > 1 ? (endX - startX) / (rows - 1) : 0;
    for (let i = 0; i < rows; i++) {
      const x = startX + step * i;
      items.push({ x, side: 1 });
      items.push({ x, side: -1 });
    }
    return items;
  }, [windowRows]);

  useEffect(() => {
    return () => {
      bodyGeo.dispose();
      wingGeo.dispose();
      stabGeo.dispose();
      finGeo.dispose();
      windowGeo.dispose();
      bodyMat.dispose();
      trimMat.dispose();
      darkMat.dispose();
      limeMat.dispose();
      windowMat.dispose();
      shadowTex.dispose();
    };
  }, [bodyGeo, wingGeo, stabGeo, finGeo, windowGeo, bodyMat, trimMat, darkMat, limeMat, windowMat, shadowTex]);

  return (
    <group>
      {/* contact shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.06, 0]} scale={[1.6, 1, 1]}>
        <planeGeometry args={[22, 13]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.85} />
      </mesh>

      {/* fuselage */}
      <mesh geometry={bodyGeo} material={bodyMat} />

      {/* cockpit windows */}
      <mesh position={[11.9, 0.72, 0.62]} rotation={[0, -0.35, 0.1]} material={darkMat}>
        <boxGeometry args={[1, 0.42, 0.08]} />
      </mesh>
      <mesh position={[11.9, 0.72, -0.62]} rotation={[0, 0.35, 0.1]} material={darkMat}>
        <boxGeometry args={[1, 0.42, 0.08]} />
      </mesh>

      {/* cabin windows */}
      {windows.map((w, i) => (
        <mesh
          key={i}
          geometry={windowGeo}
          material={windowMat}
          position={[w.x, 0.38, 1.42 * w.side]}
        />
      ))}

      {/* lime livery stripe */}
      <mesh position={[0, -0.18, 1.43]} material={limeMat}>
        <boxGeometry args={[21, 0.13, 0.05]} />
      </mesh>
      <mesh position={[0, -0.18, -1.43]} material={limeMat}>
        <boxGeometry args={[21, 0.13, 0.05]} />
      </mesh>

      {/* wings */}
      <group position={[-0.4, -0.52, 0]}>
        <group rotation={[-0.06, 0, 0]}>
          <mesh geometry={wingGeo} rotation={[Math.PI / 2, 0, 0]} material={bodyMat} />
          <mesh position={[-0.9, 0.5, 7.25]} rotation={[0, 0, -0.2]} material={trimMat}>
            <boxGeometry args={[1.3, 1.35, 0.12]} />
          </mesh>
        </group>
        <group rotation={[0.06, 0, 0]}>
          <mesh geometry={wingGeo} rotation={[-Math.PI / 2, 0, 0]} material={bodyMat} />
          <mesh position={[-0.9, 0.5, -7.25]} rotation={[0, 0, 0.2]} material={trimMat}>
            <boxGeometry args={[1.3, 1.35, 0.12]} />
          </mesh>
        </group>
      </group>

      {/* engines */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0.7, -1.5, 4.3 * s]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={trimMat}>
            <cylinderGeometry args={[0.9, 0.76, 3.3, 24]} />
          </mesh>
          <mesh position={[1.66, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={darkMat}>
            <cylinderGeometry args={[0.78, 0.78, 0.14, 24]} />
          </mesh>
          <mesh position={[-0.4, 0.95, 0]} material={bodyMat}>
            <boxGeometry args={[1.9, 1.2, 0.22]} />
          </mesh>
        </group>
      ))}

      {/* horizontal stabilisers */}
      <group position={[-12.7, 0.4, 0]}>
        <mesh geometry={stabGeo} rotation={[Math.PI / 2, 0, 0]} material={bodyMat} />
        <mesh geometry={stabGeo} rotation={[-Math.PI / 2, 0, 0]} material={bodyMat} />
      </group>

      {/* vertical fin */}
      <mesh geometry={finGeo} position={[0, 0.7, 0]} material={trimMat} />
      <mesh position={[-13.3, 3.4, 0]} rotation={[0, 0, -0.12]} material={limeMat}>
        <boxGeometry args={[1.5, 0.5, 0.19]} />
      </mesh>

      {/* landing gear */}
      <group position={[9.3, -1.3, 0]}>
        <mesh position={[0, -0.55, 0]} material={darkMat}>
          <cylinderGeometry args={[0.07, 0.07, 1.1, 10]} />
        </mesh>
        <mesh position={[0, -1.15, 0]} rotation={[Math.PI / 2, 0, 0]} material={darkMat}>
          <cylinderGeometry args={[0.32, 0.32, 0.2, 18]} />
        </mesh>
      </group>
      {[-1, 1].map((s) => (
        <group key={s} position={[-0.6, -0.9, 2.4 * s]}>
          <mesh position={[0, -0.6, 0]} material={darkMat}>
            <cylinderGeometry args={[0.09, 0.09, 1.3, 10]} />
          </mesh>
          <mesh position={[0, -1.3, 0]} rotation={[Math.PI / 2, 0, 0]} material={darkMat}>
            <cylinderGeometry args={[0.44, 0.44, 0.26, 18]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function HighlightBand({ zone, reduced }: { zone: SeatZone | null; reduced: boolean }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const fadeRef = useRef(0);
  const band = zone ? ZONE_BANDS[zone] : null;

  useFrame(({ clock }) => {
    fadeRef.current += ((band ? 1 : 0) - fadeRef.current) * 0.09;
    const m = matRef.current;
    if (!m) return;
    const pulse = reduced ? 1 : 0.82 + 0.18 * Math.sin(clock.elapsedTime * 2.6);
    m.opacity = 0.34 * fadeRef.current * pulse;
  });

  if (!band || !zone) return null;

  return (
    <mesh key={zone} position={[band.x, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <cylinderGeometry args={[1.53, 1.53, band.len, 36, 1, true]} />
      <meshBasicMaterial
        ref={matRef}
        color="#e6ff19"
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function CameraRig({ ctl, reduced }: { ctl: { current: CamCtl }; reduced: boolean }) {
  const { camera } = useThree();

  useFrame(() => {
    const c = ctl.current;
    const k = reduced ? 1 : 0.13;
    c.yaw += shortestAngle(c.yaw, c.tYaw) * k;
    c.pitch += (c.tPitch - c.pitch) * k;
    c.dist += (c.tDist - c.dist) * k;
    const cp = Math.cos(c.pitch);
    camera.position.set(
      c.dist * cp * Math.cos(c.yaw),
      c.dist * Math.sin(c.pitch),
      c.dist * cp * Math.sin(c.yaw),
    );
    camera.lookAt(0, 0, 0);
  });

  return null;
}

/* -------------------------------- viewer UI -------------------------------- */

export function AircraftViewer({ windowRows, highlightZone, reduced, className }: Props) {
  const ctl = useRef<CamCtl>({
    yaw: VIEWS.iso.yaw,
    pitch: VIEWS.iso.pitch,
    dist: DEFAULT_DIST,
    tYaw: VIEWS.iso.yaw,
    tPitch: VIEWS.iso.pitch,
    tDist: DEFAULT_DIST,
  });
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; base: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ViewId | null>('iso');

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const c = ctl.current;
      c.tDist = clamp(c.tDist + e.deltaY * 0.022, MIN_DIST, MAX_DIST);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  function go(v: ViewId) {
    const c = ctl.current;
    c.tYaw = VIEWS[v].yaw;
    c.tPitch = VIEWS[v].pitch;
    setView(v);
  }

  function resetView() {
    const c = ctl.current;
    c.tYaw = VIEWS.iso.yaw;
    c.tPitch = VIEWS.iso.pitch;
    c.tDist = DEFAULT_DIST;
    setView('iso');
  }

  function zoom(delta: number) {
    const c = ctl.current;
    c.tDist = clamp(c.tDist + delta, MIN_DIST, MAX_DIST);
  }

  function pinchDistance(): number {
    const pts = [...pointers.current.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) setView(null);
    if (pointers.current.size === 2) {
      const d = pinchDistance();
      pinch.current = d > 0 ? { dist: d, base: ctl.current.tDist } : null;
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinch.current) {
      const d = pinchDistance();
      if (d > 0) {
        ctl.current.tDist = clamp((pinch.current.base * pinch.current.dist) / d, MIN_DIST, MAX_DIST);
      }
      return;
    }

    const c = ctl.current;
    c.tYaw += dx * 0.0055;
    c.tPitch = clamp(c.tPitch - dy * 0.0045, PITCH_MIN, PITCH_MAX);
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  return (
    <div
      ref={wrapRef}
      className={cn('relative select-none overflow-hidden', className)}
      style={{
        background:
          'radial-gradient(95% 75% at 50% 18%, #13232f 0%, #0b1720 55%, #071019 100%)',
        touchAction: 'none',
      }}
      aria-label="Interactive 3D aircraft viewer"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <Canvas
        dpr={[1, 1.75]}
        camera={{ fov: 40, near: 0.5, far: 400, position: [24, 12, -20] }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
          requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
        }}
      >
        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#cfe4ff', '#0a0f14', 0.45]} />
        <directionalLight position={[14, 20, 12]} intensity={1.7} />
        <directionalLight position={[-16, 8, -10]} intensity={0.55} color="#9fd0ff" />
        <Aircraft windowRows={windowRows} />
        <HighlightBand zone={highlightZone} reduced={reduced} />
        <CameraRig ctl={ctl} reduced={reduced} />
      </Canvas>

      {/* label */}
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-[#0a141c]/70 px-3.5 py-2 backdrop-blur-md sm:left-4 sm:top-4">
        <Box className="h-3.5 w-3.5 text-brand" aria-hidden />
        <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink">
          Explore Aircraft
        </span>
      </div>

      {/* camera tools */}
      <div className="absolute right-3 top-3 flex flex-col gap-1.5 sm:right-4 sm:top-4">
        <button
          type="button"
          onClick={resetView}
          aria-label="Reset camera view"
          title="Reset view"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#0a141c]/70 text-muted backdrop-blur-md transition hover:border-brand/50 hover:text-brand"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => zoom(-6)}
          aria-label="Zoom in"
          title="Zoom in"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#0a141c]/70 text-muted backdrop-blur-md transition hover:border-brand/50 hover:text-brand"
        >
          <ZoomIn className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => zoom(6)}
          aria-label="Zoom out"
          title="Zoom out"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#0a141c]/70 text-muted backdrop-blur-md transition hover:border-brand/50 hover:text-brand"
        >
          <ZoomOut className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* view presets */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-full border border-white/10 bg-[#0a141c]/70 p-1 backdrop-blur-md sm:bottom-4">
        {VIEW_BUTTONS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => go(v.id)}
            aria-pressed={view === v.id}
            className={cn(
              'rounded-full px-2.5 py-1.5 text-[11px] font-bold transition sm:px-3.5',
              view === v.id
                ? 'bg-brand text-navy shadow-[0_0_14px_rgba(230,255,25,0.35)]'
                : 'text-muted hover:text-ink',
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      <p className="pointer-events-none absolute bottom-4 left-4 hidden text-[10px] font-medium text-muted/80 lg:block">
        Drag to rotate · Scroll to zoom
      </p>

      {/* loading */}
      {!ready && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#0a141c]/85 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <span
              className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand"
              aria-hidden
            />
            <p className="text-xs font-semibold text-muted">Loading aircraft…</p>
          </div>
        </div>
      )}
    </div>
  );
}
