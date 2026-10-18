import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { Mystery, PlanRoom } from '../types';
import { useI18n } from '../i18n';
import type { PlanMarkers } from './FloorPlanModal';

interface Props {
  mystery: Mystery;
  markers: PlanMarkers;
  activeId: string;
  onSelect: (id: string) => void;
}

const WALL_H = 1.3;
const WALL_T = 0.12;
const DOOR_W = 1.1;

type Seg = { x: number; z: number; len: number; vertical: boolean };

/** Splits a wall in two around a door. */
function wallWithDoor(start: number, end: number, fixed: number, vertical: boolean, door: number | null): Seg[] {
  const segs: [number, number][] = door === null ? [[start, end]] : [[start, door - DOOR_W / 2], [door + DOOR_W / 2, end]];
  return segs
    .filter(([a, b]) => b - a > 0.05)
    .map(([a, b]) => (vertical ? { x: fixed, z: (a + b) / 2, len: b - a, vertical } : { x: (a + b) / 2, z: fixed, len: b - a, vertical }));
}

function roomWalls(r: PlanRoom, layout: Mystery['plan']['layout']): Seg[] {
  const top = r.y;
  const bottom = r.y + r.h;
  const left = r.x;
  const right = r.x + r.w;
  if (layout === 'linear') {
    // Train cars: doors at both ends, on the centre line.
    return [
      ...wallWithDoor(left, right, top, false, null),
      ...wallWithDoor(left, right, bottom, false, null),
      ...wallWithDoor(top, bottom, left, true, r.y + r.h / 2),
      ...wallWithDoor(top, bottom, right, true, r.y + r.h / 2),
    ];
  }
  const doorOnBottom = Math.abs(r.door.y - bottom) < 0.01;
  return [
    ...wallWithDoor(left, right, top, false, doorOnBottom ? null : r.door.x),
    ...wallWithDoor(left, right, bottom, false, doorOnBottom ? r.door.x : null),
    ...wallWithDoor(top, bottom, left, true, null),
    ...wallWithDoor(top, bottom, right, true, null),
  ];
}

const Room: React.FC<{ room: PlanRoom; layout: Mystery['plan']['layout']; active: boolean; markers: PlanMarkers; onSelect: () => void }> = ({ room, layout, active, markers, onSelect }) => {
  const { t } = useI18n();
  const walls = useMemo(() => roomWalls(room, layout), [room, layout]);
  const isScene = room.kind === 'scene';
  const claims = markers.claims[room.id] ?? [];
  const items = markers.items[room.id] ?? [];
  const cx = room.x + room.w / 2;
  const cz = room.y + room.h / 2;

  return (
    <group>
      <mesh
        position={[cx, 0.01, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <planeGeometry args={[room.w - 0.05, room.h - 0.05]} />
        <meshStandardMaterial color={isScene ? '#7a2a22' : active ? '#3b5f8c' : '#24456d'} emissive={isScene ? '#3a0d08' : '#000000'} />
      </mesh>

      {walls.map((s, i) => (
        <mesh key={i} position={[s.x, WALL_H / 2, s.z]} castShadow receiveShadow>
          <boxGeometry args={s.vertical ? [WALL_T, WALL_H, s.len] : [s.len, WALL_H, WALL_T]} />
          <meshStandardMaterial color={active ? '#f3e6c9' : '#d8e6f7'} />
        </mesh>
      ))}

      {isScene && (
        <mesh position={[cx, 0.04, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.7, 32]} />
          <meshBasicMaterial color="#ff7a66" />
        </mesh>
      )}

      {claims.map((c, i) => (
        <mesh key={c.id} position={[room.x + 0.6 + i * 0.7, 0.35, room.y + room.h - 0.7]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, 0.7, 16]} />
          <meshStandardMaterial color={c.color} />
        </mesh>
      ))}

      {items.map((label, i) => (
        <mesh key={label} position={[room.x + 0.6 + i * 0.6, 0.2, room.y + 0.9]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color="#ffd27a" emissive="#5a3d00" />
        </mesh>
      ))}

      <Html position={[cx, WALL_H + 0.35, cz]} center distanceFactor={14} zIndexRange={[10, 0]}>
        <div
          className="pointer-events-none select-none whitespace-nowrap rounded px-2 py-0.5 text-center font-typewriter text-[13px]"
          style={{ background: isScene ? 'rgba(122,42,34,0.9)' : 'rgba(12,37,71,0.85)', color: '#f3e6c9' }}
        >
          {room.label}
          <div className="font-typed text-[11px] opacity-80">{isScene ? t('plan.body') : t('plan.min', { n: room.walk })}</div>
        </div>
      </Html>
    </group>
  );
};

const FloorPlan3D: React.FC<Props> = ({ mystery, markers, activeId, onSelect }) => {
  const { plan } = mystery;
  const center: [number, number, number] = [plan.width / 2, 0, plan.height / 2];
  const span = Math.max(plan.width, plan.height * 1.6);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [center[0] - span * 0.15, span * 0.75, center[2] + span * 0.75], fov: 40 }}
      style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
    >
      <color attach="background" args={['#0c2547']} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[center[0] + 6, 14, center[2] - 4]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
      />

      <mesh position={[center[0], -0.02, center[2]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[plan.width + 6, plan.height + 6]} />
        <meshStandardMaterial color="#0f2d55" />
      </mesh>
      <gridHelper args={[Math.ceil(span + 6), Math.ceil(span + 6), '#2c5a92', '#1d4472']} position={[center[0], -0.01, center[2]]} />

      {plan.corridor && (
        <mesh position={[plan.corridor.x + plan.corridor.w / 2, 0, plan.corridor.y + plan.corridor.h / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[plan.corridor.w, plan.corridor.h]} />
          <meshStandardMaterial color="#1a3a63" />
        </mesh>
      )}

      {plan.rooms.map(r => (
        <Room key={r.id} room={r} layout={plan.layout} active={r.id === activeId} markers={markers} onSelect={() => onSelect(r.id)} />
      ))}

      <OrbitControls target={center} enableDamping maxPolarAngle={Math.PI / 2.2} minDistance={4} maxDistance={span * 2} autoRotate autoRotateSpeed={0.4} />
    </Canvas>
  );
};

export default FloorPlan3D;
