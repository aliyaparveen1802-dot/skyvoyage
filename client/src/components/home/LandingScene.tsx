import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* Timeline: 1 unit ≈ 5 m. Runway 620 u along X. Approach → flare →
   touchdown → rollout → runway exit turn → taxi into fog → loop. */

const DUR = 26;
const T_DOWN = 0.6;
const APPROACH_SPEED = 230 / (T_DOWN * DUR);
const CONTACT_Y = 2.45;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

type PlaneState = {
  x: number;
  y: number;
  z: number;
  pitch: number;
  yaw: number;
  gear: number;
  speed: number;
  fade: number;
};

function planeState(t: number): PlaneState {
  const fade =
    t < 0.04 ? smooth(t / 0.04) : t > 0.92 ? smooth((1 - t) / 0.08) : 1;

  if (t < T_DOWN) {
    const u = t / T_DOWN;
    const FLARE = 0.84;
    let y: number;
    if (u < FLARE) {
      y = lerp(19, 3.5, u / FLARE);
    } else {
      const f = (u - FLARE) / (1 - FLARE);
      y = lerp(3.5, CONTACT_Y, 1 - (1 - f) * (1 - f));
    }
    const pitch =
      u < FLARE
        ? lerp(0.03, 0.05, u / FLARE)
        : lerp(0.05, 0.115, (u - FLARE) / (1 - FLARE));
    const gear = clamp01((t - 0.03) / 0.1);
    const align = smooth(u);
    return {
      x: lerp(-430, -200, u),
      y,
      z: lerp(-1.8, 0, align),
      pitch,
      yaw: lerp(0.045, 0, align),
      gear,
      speed: APPROACH_SPEED,
      fade,
    };
  }

  return {
    x: -200,
    y: CONTACT_Y,
    z: 0,
    pitch: 0.115,
    yaw: 0,
    gear: 1,
    speed: APPROACH_SPEED,
    fade,
  };
}

/* Canvas texture helpers */

function makeCanvas(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function radialTexture(inner: string, outer: string): THREE.CanvasTexture {
  return makeCanvas(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}

function runwayTexture(): THREE.CanvasTexture {
  return makeCanvas(1024, 96, (ctx) => {
    ctx.fillStyle = '#171b1e';
    ctx.fillRect(0, 0, 1024, 96);
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 96;
      ctx.fillStyle =
        Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.25)';
      ctx.fillRect(x, y, 1.5, 1.5);
    }
    ctx.fillStyle = 'rgba(232,232,224,0.85)';
    ctx.fillRect(0, 3, 1024, 3);
    ctx.fillRect(0, 90, 1024, 3);
    ctx.fillStyle = 'rgba(232,232,224,0.8)';
    for (let x = 20; x < 1024; x += 102) ctx.fillRect(x, 46, 61, 4);
  });
}

function groundTexture(): THREE.CanvasTexture {
  return makeCanvas(256, 256, (ctx) => {
    ctx.fillStyle = '#0c1211';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3200; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle =
        Math.random() > 0.5 ? 'rgba(30,44,34,0.5)' : 'rgba(0,0,0,0.4)';
      ctx.fillRect(x, y, 2, 2);
    }
  });
}

function windowTexture(cols: number, rows: number): THREE.CanvasTexture {
  return makeCanvas(512, 64, (ctx) => {
    ctx.fillStyle = '#0a0f13';
    ctx.fillRect(0, 0, 512, 64);
    const cw = 512 / cols;
    const ch = 64 / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = Math.random() < 0.55;
        ctx.fillStyle = lit
          ? `rgba(255,217,138,${0.55 + Math.random() * 0.45})`
          : 'rgba(16,22,28,0.9)';
        ctx.fillRect(c * cw + 1.5, r * ch + 1.5, cw - 3, ch - 3);
      }
    }
  });
}

function numberTexture(): THREE.CanvasTexture {
  return makeCanvas(256, 384, (ctx) => {
    ctx.clearRect(0, 0, 256, 384);
    ctx.fillStyle = 'rgba(236,236,228,0.92)';
    ctx.font = 'bold 230px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('27', 128, 196);
  });
}

function cloudTexture(): THREE.CanvasTexture {
  return makeCanvas(256, 256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    for (let i = 0; i < 7; i++) {
      const x = 60 + Math.random() * 136;
      const y = 90 + Math.random() * 76;
      const r = 40 + Math.random() * 55;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(74,86,96,0.55)');
      g.addColorStop(1, 'rgba(74,86,96,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
    }
  });
}

/* Shared rig mutated by Aircraft / Director */

type Rig = {
  plane?: THREE.Group;
  gearNose?: THREE.Object3D;
  gearL?: THREE.Object3D;
  gearR?: THREE.Object3D;
  wheels: THREE.Mesh[];
  materials: THREE.Material[];
  strobe?: THREE.Mesh;
  beacon?: THREE.Mesh;
  clouds: THREE.Sprite[];
  look: THREE.Vector3;
  t: number;
  prev: number;
  sim: { x: number; z: number; yaw: number; speed: number; started: boolean };
};

function createRig(): Rig {
  return {
    wheels: [],
    materials: [],
    clouds: [],
    look: new THREE.Vector3(-260, 3.2, 0),
    t: 0,
    prev: 0,
    sim: { x: -200, z: 0, yaw: 0, speed: APPROACH_SPEED, started: false },
  };
}

/* Environment */

function Ground() {
  const tex = useMemo(() => {
    const t = groundTexture();
    t.repeat.set(60, 24);
    return t;
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2000, 800]} />
      <meshStandardMaterial map={tex} color="#4a5450" roughness={1} />
    </mesh>
  );
}

function Runway() {
  const tex = useMemo(() => {
    const t = runwayTexture();
    t.repeat.set(6.2, 1);
    return t;
  }, []);
  const numTex = useMemo(() => numberTexture(), []);
  const piano = useMemo(() => {
    const bars: { z: number }[] = [];
    for (let i = 0; i < 8; i++) bars.push({ z: -3.85 + i * 1.1 });
    return bars;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[620, 9]} />
        <meshStandardMaterial map={tex} color="#9aa0a4" roughness={0.95} />
      </mesh>

      {/* foreground taxiway + connectors */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 24]}>
        <planeGeometry args={[620, 8]} />
        <meshStandardMaterial color="#14181b" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-160, 0.015, 14]}>
        <planeGeometry args={[7, 20]} />
        <meshStandardMaterial color="#14181b" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[60, 0.015, 14]}>
        <planeGeometry args={[7, 20]} />
        <meshStandardMaterial color="#14181b" roughness={1} />
      </mesh>

      {/* threshold piano keys */}
      {piano.map((b, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-306, 0.03, b.z]}>
          <planeGeometry args={[6, 0.5]} />
          <meshBasicMaterial color="#e6e6de" />
        </mesh>
      ))}

      {/* runway designation "27" */}
      <mesh position={[-292, 0.032, 0]} rotation={[-Math.PI / 2, Math.PI / 2, 0]}>
        <planeGeometry args={[4, 6]} />
        <meshBasicMaterial map={numTex} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

type LightDef = { x: number; y: number; z: number; c: string };

function RunwayLights() {
  const defs = useMemo(() => {
    const list: LightDef[] = [];
    const warm = '#ffe6b8';
    const white = '#fff4d6';
    for (let x = -305; x <= 305; x += 15) {
      list.push({ x, y: 0.14, z: -4.7, c: warm });
      list.push({ x, y: 0.14, z: 4.7, c: warm });
    }
    for (let z = -4; z <= 4; z += 1) list.push({ x: -309.5, y: 0.13, z, c: '#2fe07a' });
    for (let x = -430; x <= -320; x += 11) list.push({ x, y: 0.12, z: 0, c: white });
    for (let z = -6; z <= 6; z += 1.5) list.push({ x: -405, y: 0.12, z, c: white });
    for (let z = -4; z <= 4; z += 1) list.push({ x: 308, y: 0.13, z, c: '#ff5a4a' });
    ['#fff4d6', '#fff4d6', '#ff5a4a', '#ff5a4a'].forEach((c, i) =>
      list.push({ x: -250, y: 0.2, z: -7.5 - i * 0.9, c }),
    );
    return list;
  }, []);

  const glow = useMemo(
    () => radialTexture('rgba(255,236,190,0.9)', 'rgba(255,236,190,0)'),
    [],
  );
  const bulbRef = useRef<THREE.InstancedMesh>(null);
  const poolRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    defs.forEach((d, i) => {
      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      bulbRef.current?.setMatrixAt(i, dummy.matrix);
      bulbRef.current?.setColorAt(i, color.set(d.c));
      dummy.position.set(d.x, 0.05, d.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      poolRef.current?.setMatrixAt(i, dummy.matrix);
      poolRef.current?.setColorAt(i, color.set(d.c));
    });
    if (bulbRef.current) {
      bulbRef.current.instanceMatrix.needsUpdate = true;
      if (bulbRef.current.instanceColor) bulbRef.current.instanceColor.needsUpdate = true;
    }
    if (poolRef.current) {
      poolRef.current.instanceMatrix.needsUpdate = true;
      if (poolRef.current.instanceColor) poolRef.current.instanceColor.needsUpdate = true;
    }
  }, [defs]);

  return (
    <group>
      <instancedMesh ref={bulbRef} args={[undefined, undefined, defs.length]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={poolRef} args={[undefined, undefined, defs.length]}>
        <circleGeometry args={[1.2, 14]} />
        <meshBasicMaterial
          map={glow}
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}

function Terminal() {
  const winTex = useMemo(() => windowTexture(72, 8), []);
  const glow = useMemo(
    () => radialTexture('rgba(255,226,170,0.85)', 'rgba(255,226,170,0)'),
    [],
  );
  const masts = useMemo(() => [-160, -40, 90], []);

  return (
    <group>
      <mesh position={[-40, 11, -150]}>
        <boxGeometry args={[360, 22, 40]} />
        <meshStandardMaterial color="#0e141a" roughness={1} />
      </mesh>
      <mesh position={[-40, 12, -129.7]}>
        <planeGeometry args={[350, 6]} />
        <meshBasicMaterial map={winTex} toneMapped={false} />
      </mesh>
      {[-170, -90, -10, 70].map((x) => (
        <mesh key={x} position={[x, 8, -120]}>
          <boxGeometry args={[3, 3, 20]} />
          <meshStandardMaterial color="#12181d" roughness={1} />
        </mesh>
      ))}
      <mesh position={[210, 7, -140]}>
        <boxGeometry args={[70, 14, 30]} />
        <meshStandardMaterial color="#0d1318" roughness={1} />
      </mesh>
      <mesh position={[-255, 5, -145]}>
        <boxGeometry args={[60, 10, 26]} />
        <meshStandardMaterial color="#0d1318" roughness={1} />
      </mesh>
      {/* control tower */}
      <group position={[70, 0, -138]}>
        <mesh position={[0, 18, 0]}>
          <cylinderGeometry args={[2.4, 3, 36, 10]} />
          <meshStandardMaterial color="#141a20" roughness={1} />
        </mesh>
        <mesh position={[0, 38, 0]}>
          <cylinderGeometry args={[5, 4.2, 5, 10]} />
          <meshStandardMaterial color="#171e24" roughness={0.9} />
        </mesh>
        <mesh position={[0, 41.4, 0]}>
          <sphereGeometry args={[0.6, 8, 8]} />
          <meshBasicMaterial color="#ff4a44" toneMapped={false} />
        </mesh>
        <mesh position={[0, 42.6, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 2, 6]} />
          <meshStandardMaterial color="#222a30" />
        </mesh>
      </group>
      {/* floodlight masts */}
      {masts.map((x) => (
        <group key={x} position={[x, 0, -100]}>
          <mesh position={[0, 15, 0]}>
            <cylinderGeometry args={[0.25, 0.35, 30, 6]} />
            <meshStandardMaterial color="#1a2126" roughness={1} />
          </mesh>
          <mesh position={[0, 30.5, 0]}>
            <boxGeometry args={[3, 1, 1]} />
            <meshBasicMaterial color="#ffe2ad" toneMapped={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 6]}>
            <circleGeometry args={[16, 20]} />
            <meshBasicMaterial
              map={glow}
              transparent
              opacity={0.22}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

type CloudDef = { x: number; y: number; z: number; sx: number; sy: number; o: number };

function CloudField({ rig }: { rig: Rig }) {
  const tex = useMemo(() => cloudTexture(), []);
  const defs = useMemo<CloudDef[]>(() => {
    const arr: CloudDef[] = [];
    for (let i = 0; i < 11; i++) {
      arr.push({
        x: -520 + Math.random() * 1040,
        y: 42 + Math.random() * 48,
        z: -300 + Math.random() * 210,
        sx: 150 + Math.random() * 130,
        sy: 46 + Math.random() * 44,
        o: 0.32 + Math.random() * 0.28,
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {defs.map((d, i) => (
        <CloudSprite
          key={i}
          def={d}
          tex={tex}
          register={(s) => {
            if (s) rig.clouds[i] = s;
          }}
        />
      ))}
    </group>
  );
}

function CloudSprite({
  def,
  tex,
  register,
}: {
  def: CloudDef;
  tex: THREE.Texture;
  register: (s: THREE.Sprite | null) => void;
}) {
  const ref = useRef<THREE.Sprite>(null);
  useLayoutEffect(() => {
    register(ref.current);
    return () => register(null);
  }, [register]);

  return (
    <sprite ref={ref} position={[def.x, def.y, def.z]} scale={[def.sx, def.sy, 1]}>
      <spriteMaterial map={tex} transparent opacity={def.o} depthWrite={false} />
    </sprite>
  );
}

function Stars() {
  const positions = useMemo(() => {
    const arr = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i++) {
      const az = Math.random() * Math.PI * 2;
      const el = 0.12 + Math.random() * 1.25;
      const r = 900;
      arr[i * 3] = Math.cos(az) * Math.cos(el) * r;
      arr[i * 3 + 1] = Math.sin(el) * r;
      arr[i * 3 + 2] = Math.sin(az) * Math.cos(el) * r;
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={1.7}
        sizeAttenuation={false}
        color="#d7dcd4"
        transparent
        opacity={0.7}
        fog={false}
        depthWrite={false}
      />
    </points>
  );
}

/* Airliner */

function wingGeometry(
  rootLE: number,
  rootTE: number,
  span: number,
  tipLE: number,
  tipTE: number,
  thick: number,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(rootLE, 0);
  shape.lineTo(rootTE, 0);
  shape.lineTo(tipTE, span);
  shape.lineTo(tipLE, span);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
  geo.translate(0, 0, -thick / 2);
  return geo;
}

function Aircraft({ rig }: { rig: Rig }) {
  const group = useRef<THREE.Group>(null);
  const gearNose = useRef<THREE.Group>(null);
  const gearL = useRef<THREE.Group>(null);
  const gearR = useRef<THREE.Group>(null);
  const strobe = useRef<THREE.Mesh>(null);
  const beacon = useRef<THREE.Mesh>(null);

  const rightWing = useMemo(() => {
    const g = wingGeometry(1.7, -1.7, 5.9, -0.92, -2.42, 0.16);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  const leftWing = useMemo(() => {
    const g = wingGeometry(1.7, -1.7, 5.9, -0.92, -2.42, 0.16);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const rightStab = useMemo(() => {
    const g = wingGeometry(0.65, -0.65, 2.3, -0.57, -1.27, 0.11);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  const leftStab = useMemo(() => {
    const g = wingGeometry(0.65, -0.65, 2.3, -0.57, -1.27, 0.11);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const finGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-4.9, 0);
    shape.lineTo(-7.3, 0);
    shape.lineTo(-7.85, 2.6);
    shape.lineTo(-6.85, 2.6);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false });
    g.translate(0, 0, -0.075);
    return g;
  }, []);

  const wheelsRef = useRef<THREE.Mesh[]>([]);
  wheelsRef.current = [];
  const registerWheel = (m: THREE.Mesh | null) => {
    if (m && !wheelsRef.current.includes(m)) wheelsRef.current.push(m);
  };

  useLayoutEffect(() => {
    rig.plane = group.current ?? undefined;
    rig.gearNose = gearNose.current ?? undefined;
    rig.gearL = gearL.current ?? undefined;
    rig.gearR = gearR.current ?? undefined;
    rig.strobe = strobe.current ?? undefined;
    rig.beacon = beacon.current ?? undefined;
    rig.wheels = wheelsRef.current;

    const mats = new Set<THREE.Material>();
    group.current?.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.material) {
        const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of list) {
          m.userData.baseOpacity = m.opacity;
          m.transparent = true;
          mats.add(m);
        }
      }
    });
    rig.materials = [...mats];
    return () => {
      rig.plane = undefined;
      rig.gearNose = undefined;
      rig.gearL = undefined;
      rig.gearR = undefined;
      rig.strobe = undefined;
      rig.beacon = undefined;
      rig.wheels = [];
      rig.materials = [];
    };
  }, [rig]);

  const white = <meshStandardMaterial color="#f2f4ef" roughness={0.38} metalness={0.18} />;
  const lime = <meshStandardMaterial color="#e6ff19" roughness={0.45} metalness={0.1} />;

  return (
    <group ref={group} position={[-430, 19, 0]}>
      {/* fuselage */}
      <mesh rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.58, 0.58, 9.6, 20]} />
        {white}
      </mesh>
      <mesh position={[5.0, 0, 0]} scale={[1.45, 1, 1]}>
        <sphereGeometry args={[0.58, 18, 14]} />
        {white}
      </mesh>
      <mesh position={[-6.1, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.58, 0.14, 2.6, 18]} />
        {white}
      </mesh>
      <mesh position={[5.05, 0.3, 0]} rotation={[0, 0, 0.38]}>
        <boxGeometry args={[0.72, 0.2, 0.52]} />
        <meshStandardMaterial color="#0d1418" roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[-0.3, -0.42, 0]}>
        <boxGeometry args={[3.6, 0.7, 2.1]} />
        {white}
      </mesh>
      {/* livery */}
      {[0.57, -0.57].map((z) => (
        <mesh key={z} position={[0.1, 0.02, z]}>
          <boxGeometry args={[9.4, 0.11, 0.03]} />
          <meshStandardMaterial color="#e6ff19" roughness={0.5} />
        </mesh>
      ))}
      {[0.56, -0.56].map((z) => (
        <mesh key={z} position={[0.3, 0.2, z]}>
          <boxGeometry args={[8.6, 0.09, 0.02]} />
          <meshBasicMaterial color="#ffe9a0" toneMapped={false} />
        </mesh>
      ))}
      {/* wings */}
      <mesh geometry={rightWing} position={[-0.3, -0.35, 0]} rotation={[-0.07, 0, 0]}>
        {white}
      </mesh>
      <mesh geometry={leftWing} position={[-0.3, -0.35, 0]} rotation={[0.07, 0, 0]}>
        {white}
      </mesh>
      {/* engines */}
      {[2.7, -2.7].map((z) => (
        <group key={z}>
          <mesh position={[0.75, -0.8, z]} rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.42, 0.4, 1.7, 14]} />
            <meshStandardMaterial color="#e4e8ea" roughness={0.4} metalness={0.25} />
          </mesh>
          <mesh position={[1.62, -0.8, z]} rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.4, 0.36, 0.12, 14]} />
            <meshStandardMaterial color="#0f1317" roughness={0.6} />
          </mesh>
          <mesh position={[0.45, -0.48, z]}>
            <boxGeometry args={[0.9, 0.55, 0.16]} />
            {white}
          </mesh>
        </group>
      ))}
      {/* tail */}
      <mesh geometry={rightStab} position={[-5.6, 0.18, 0]} rotation={[-0.09, 0, 0]}>
        {white}
      </mesh>
      <mesh geometry={leftStab} position={[-5.6, 0.18, 0]} rotation={[0.09, 0, 0]}>
        {white}
      </mesh>
      <mesh geometry={finGeo} position={[0, 0.45, 0]}>
        {lime}
      </mesh>
      {/* nav / strobe / beacon */}
      <mesh position={[-1.3, 0.12, -5.9]}>
        <sphereGeometry args={[0.09, 6, 6]} />
        <meshBasicMaterial color="#ff3b30" toneMapped={false} />
      </mesh>
      <mesh position={[-1.3, 0.12, 5.9]}>
        <sphereGeometry args={[0.09, 6, 6]} />
        <meshBasicMaterial color="#2fd45a" toneMapped={false} />
      </mesh>
      <mesh ref={strobe} position={[-7.7, 1.1, 0]}>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh ref={beacon} position={[0, 0.66, 0]}>
        <sphereGeometry args={[0.09, 6, 6]} />
        <meshBasicMaterial color="#ff4a44" toneMapped={false} />
      </mesh>
      {/* landing lights + beams */}
      {[1.5, -1.5].map((z) => (
        <group key={z}>
          <mesh position={[1.3, -0.5, z]}>
            <sphereGeometry args={[0.12, 6, 6]} />
            <meshBasicMaterial color="#fff6d8" toneMapped={false} />
          </mesh>
          <mesh position={[24, -1.4, z]} rotation={[0, 0, Math.PI / 2 - 0.055]}>
            <coneGeometry args={[1.3, 44, 10, 1, true]} />
            <meshBasicMaterial
              color="#ffe9b0"
              transparent
              opacity={0.035}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
      {/* landing gear */}
      <group ref={gearNose} position={[4.3, -0.45, 0]}>
        <mesh position={[0, -0.37, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.75, 6]} />
          <meshStandardMaterial color="#8d959b" roughness={0.5} metalness={0.6} />
        </mesh>
        <mesh ref={registerWheel} position={[0, -0.78, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.11, 10]} />
          <meshStandardMaterial color="#1a1e21" roughness={0.9} />
        </mesh>
      </group>
      {[
        { ref: gearL, z: -1.15, stow: -1.4 },
        { ref: gearR, z: 1.15, stow: 1.4 },
      ].map(({ ref, z, stow }) => (
        <group key={z} ref={ref} position={[-0.5, -0.5, z]} rotation={[stow, 0, 0]}>
          <mesh position={[0, -0.45, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.9, 6]} />
            <meshStandardMaterial color="#8d959b" roughness={0.5} metalness={0.6} />
          </mesh>
          {[-0.13, 0.13].map((wz) => (
            <mesh
              key={wz}
              ref={registerWheel}
              position={[0, -0.95, wz]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.22, 0.22, 0.12, 12]} />
              <meshStandardMaterial color="#1a1e21" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* Director: one clock for camera, plane, puffs, blinks */

type Puff = { sprite: THREE.Sprite; life: number; active: boolean; base: THREE.Vector3 };

function Director({ rig }: { rig: Rig }) {
  const { camera } = useThree();

  const puffs = useMemo(() => {
    const tex = radialTexture('rgba(214,220,214,0.85)', 'rgba(214,220,214,0)');
    const group = new THREE.Group();
    const list: Puff[] = [];
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const s = new THREE.Sprite(mat);
      s.visible = false;
      group.add(s);
      list.push({ sprite: s, life: 0, active: false, base: new THREE.Vector3() });
    }
    return { group, list };
  }, []);

  const trigger = (p: Puff, x: number, y: number, z: number, size: number) => {
    p.active = true;
    p.life = 0;
    p.base.set(x, y, z);
    p.sprite.position.copy(p.base);
    p.sprite.scale.setScalar(size);
    p.sprite.visible = true;
    (p.sprite.material as THREE.SpriteMaterial).opacity = 0.5;
  };

  const clearPuffs = () => {
    for (const p of puffs.list) {
      p.active = false;
      p.life = 0;
      p.sprite.visible = false;
    }
  };

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    rig.prev = rig.t;
    rig.t = (rig.t + dt) % DUR;
    const t = rig.t;
    if (t < rig.prev) {
      rig.sim.started = false;
      clearPuffs();
    }

    const p = planeState(t);
    const plane = rig.plane;
    if (!plane) return;

    let x = p.x;
    let z = p.z;
    let yaw = p.yaw;
    let speed = p.speed;

    if (t >= T_DOWN) {
      const sim = rig.sim;
      if (!sim.started) {
        sim.started = true;
        sim.x = p.x;
        sim.z = 0;
        sim.yaw = 0;
        sim.speed = APPROACH_SPEED;
      }
      const target = sim.yaw > 0.05 ? 2.6 : 4.2;
      const rate = sim.yaw > 0.05 ? 0.8 : 0.5;
      sim.speed += (target - sim.speed) * (1 - Math.exp(-dt * rate));
      if (sim.x >= -130 && sim.yaw < Math.PI / 2) {
        sim.yaw = Math.min(Math.PI / 2, sim.yaw + 0.55 * dt);
      }
      sim.x += Math.cos(sim.yaw) * sim.speed * dt;
      sim.z += -Math.sin(sim.yaw) * sim.speed * dt;
      x = sim.x;
      z = sim.z;
      yaw = sim.yaw;
      speed = sim.speed;
    }

    plane.position.set(x, p.y, z);
    plane.rotation.z = p.pitch;
    plane.rotation.y = yaw;

    const stow = 1 - p.gear;
    if (rig.gearNose) rig.gearNose.rotation.z = 1.45 * stow;
    if (rig.gearL) rig.gearL.rotation.x = -1.4 * stow;
    if (rig.gearR) rig.gearR.rotation.x = 1.4 * stow;

    if (t >= T_DOWN) {
      const w = (speed / 0.22) * dt;
      for (const wheel of rig.wheels) wheel.rotation.z -= w;
    }

    for (const m of rig.materials) {
      m.opacity = (m.userData.baseOpacity ?? 1) * p.fade;
    }

    const tt = state.clock.elapsedTime;
    if (rig.strobe) {
      const ph = tt % 1.4;
      rig.strobe.visible = ph < 0.05 || (ph > 0.13 && ph < 0.18);
    }
    if (rig.beacon) rig.beacon.visible = tt % 0.9 < 0.4;

    if (rig.prev < T_DOWN && t >= T_DOWN) {
      trigger(puffs.list[0], x - 0.5, 0.55, z + 1.15, 1.1);
      trigger(puffs.list[1], x - 0.5, 0.55, z - 1.15, 1.1);
      trigger(puffs.list[2], x - 1.6, 0.5, z, 1.4);
    }
    if (rig.prev < T_DOWN + 0.05 && t >= T_DOWN + 0.05) {
      trigger(puffs.list[3], x + 4.3, 0.4, z, 0.8);
    }
    for (const puff of puffs.list) {
      if (!puff.active) continue;
      puff.life += dt;
      const k = puff.life / 1.5;
      if (k >= 1) {
        puff.active = false;
        puff.sprite.visible = false;
        continue;
      }
      const mat = puff.sprite.material as THREE.SpriteMaterial;
      mat.opacity = 0.5 * (1 - k) * (1 - k) * p.fade;
      puff.sprite.position.set(
        puff.base.x - k * 2.2,
        puff.base.y + k * 1.4,
        puff.base.z + k * 0.3,
      );
      puff.sprite.scale.setScalar(puff.sprite.scale.x + dt * 2.2);
    }

    for (const c of rig.clouds) {
      c.position.x += dt * 0.7;
      if (c.position.x > 620) c.position.x = -620;
    }

    const wantX = THREE.MathUtils.clamp(x + 30, -300, 30);
    rig.look.x += (wantX - rig.look.x) * (1 - Math.pow(0.0015, dt));
    rig.look.y += (3.3 - rig.look.y) * (1 - Math.pow(0.01, dt));
    camera.position.set(
      -120 + Math.sin(tt * 0.13) * 1.2,
      5.2 + Math.sin(tt * 0.09) * 0.35,
      45,
    );
    camera.lookAt(rig.look);
  });

  return <primitive object={puffs.group} />;
}

/* Reduced-motion static pose: frozen just before touchdown */

function StaticPose({ rig }: { rig: Rig }) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const plane = rig.plane;
    if (!plane) return;
    const p = planeState(0.585);
    plane.position.set(p.x, p.y, p.z);
    plane.rotation.z = p.pitch;
    plane.rotation.y = p.yaw;
    if (rig.gearNose) rig.gearNose.rotation.z = 0;
    if (rig.gearL) rig.gearL.rotation.x = 0;
    if (rig.gearR) rig.gearR.rotation.x = 0;
    if (rig.strobe) rig.strobe.visible = true;
    if (rig.beacon) rig.beacon.visible = true;
    camera.position.set(-120, 5.2, 45);
    camera.lookAt(rig.look.set(-190, 3.4, 0));
    for (const m of rig.materials) m.opacity = m.userData.baseOpacity ?? 1;
  }, [rig, camera]);
  return null;
}

/* World */

function World({ rig, reduced }: { rig: Rig; reduced: boolean }) {
  return (
    <>
      <color attach="background" args={['#071019']} />
      <fogExp2 attach="fog" args={['#0a141c', 0.0034]} />
      <ambientLight intensity={0.5} color="#9aa4ab" />
      <directionalLight position={[-200, 160, -120]} intensity={0.5} color="#dfe4e8" />
      <Stars />
      <Ground />
      <Runway />
      <RunwayLights />
      <Terminal />
      <CloudField rig={rig} />
      <Aircraft rig={rig} />
      {reduced ? <StaticPose rig={rig} /> : <Director rig={rig} />}
    </>
  );
}

export default function LandingScene() {
  const rig = useMemo(() => createRig(), []);
  const reduced = usePrefersReducedMotion();
  const visible = usePageVisible();

  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(120% 80% at 50% 30%, #0d1a24 0%, #071019 70%)',
      }}
    >
      <Canvas
        dpr={[1, 1.75]}
        frameloop={reduced || !visible ? 'demand' : 'always'}
        camera={{ position: [-120, 5.2, 45], fov: 42, near: 0.5, far: 1600 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <World rig={rig} reduced={reduced} />
      </Canvas>
    </div>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}
