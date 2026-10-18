import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

type Shape = 'candlestick' | 'statuette' | 'bar' | 'axe' | 'blade' | 'pin' | 'shard' | 'bottle' | 'glass' | 'can' | 'vial' | 'rope' | 'block' | 'core';

interface Look {
  shape: Shape;
  color: string;
  metal?: number;
  rough?: number;
  glass?: boolean;
  liquid?: string;
  /** Shape tweaks */
  long?: boolean;
  flat?: boolean;
}

const LOOKS: Record<string, Look> = {
  candlestick: { shape: 'candlestick', color: '#c9a24a', metal: 0.9, rough: 0.3 },
  candelabra: { shape: 'candlestick', color: '#c9ccd2', metal: 0.9, rough: 0.25 },
  trophy: { shape: 'statuette', color: '#d9dde3', metal: 1, rough: 0.12 },
  bust: { shape: 'statuette', color: '#7b6a3e', metal: 0.8, rough: 0.5 },
  oscar: { shape: 'statuette', color: '#d8b04a', metal: 1, rough: 0.2 },
  poker: { shape: 'bar', color: '#3a3533', metal: 0.7, rough: 0.7 },
  rail: { shape: 'bar', color: '#9aa1a8', metal: 0.9, rough: 0.35 },
  slot_handle: { shape: 'bar', color: '#c9a24a', metal: 0.9, rough: 0.3 },
  cane: { shape: 'bar', color: '#1d1714', metal: 0.2, rough: 0.4, long: true },
  shovel: { shape: 'bar', color: '#2a2a2a', metal: 0.6, rough: 0.8, flat: true },
  branding_iron: { shape: 'bar', color: '#4a3a32', metal: 0.6, rough: 0.8, flat: true },
  wrench: { shape: 'bar', color: '#2f3134', metal: 0.8, rough: 0.6 },
  oar: { shape: 'bar', color: '#a27a4c', metal: 0, rough: 0.8, long: true, flat: true },
  core_drill: { shape: 'bar', color: '#b8bec6', metal: 0.9, rough: 0.3 },
  ice_axe: { shape: 'axe', color: '#7d858d', metal: 0.9, rough: 0.35 },
  letter_opener: { shape: 'blade', color: '#c9ccd2', metal: 1, rough: 0.2 },
  scalpel: { shape: 'blade', color: '#f1f1ee', metal: 0.1, rough: 0.3 },
  rapier: { shape: 'blade', color: '#d6dbe0', metal: 1, rough: 0.15, long: true },
  carving_knife: { shape: 'blade', color: '#c9ccd2', metal: 1, rough: 0.2 },
  machete: { shape: 'blade', color: '#8c9196', metal: 0.9, rough: 0.4, long: true },
  obsidian: { shape: 'blade', color: '#111114', metal: 0.3, rough: 0.05 },
  prop_knife: { shape: 'blade', color: '#d6dbe0', metal: 1, rough: 0.2 },
  stiletto: { shape: 'blade', color: '#c0c6cc', metal: 1, rough: 0.2 },
  hatpin: { shape: 'pin', color: '#d8b04a', metal: 1, rough: 0.2 },
  ice_pick: { shape: 'pin', color: '#c9ccd2', metal: 1, rough: 0.2 },
  glass_shard: { shape: 'shard', color: '#b3261e', glass: true },
  sherry: { shape: 'bottle', color: '#e8eef2', glass: true, liquid: '#8a4a12' },
  champagne: { shape: 'bottle', color: '#2c5a2a', glass: true, liquid: '#e8d48a' },
  methanol: { shape: 'vial', color: '#b8bec6', metal: 0.9, rough: 0.3 },
  throat_spray: { shape: 'vial', color: '#f4f1ea', rough: 0.4 },
  injector: { shape: 'vial', color: '#3fa8d8', rough: 0.4 },
  sleeping_draught: { shape: 'vial', color: '#6b3a1e', glass: true, liquid: '#c9b78a' },
  pills: { shape: 'vial', color: '#c87a2a', glass: true, liquid: '#f4f1ea' },
  martini: { shape: 'glass', color: '#e8eef2', glass: true, liquid: '#d9e3c5' },
  whisky: { shape: 'glass', color: '#e8eef2', glass: true, liquid: '#a8641c', flat: true },
  wine: { shape: 'glass', color: '#d8b04a', metal: 1, rough: 0.25, liquid: '#5a0d16' },
  tea: { shape: 'glass', color: '#f6f3ec', rough: 0.3, liquid: '#7a4a1e', flat: true },
  chocolate: { shape: 'glass', color: '#c46a3a', rough: 0.6, liquid: '#3b1f12', flat: true },
  energy_drink: { shape: 'can', color: '#18e0a0', metal: 0.8, rough: 0.3 },
  rat_poison: { shape: 'can', color: '#a33a2a', metal: 0.7, rough: 0.5, flat: true },
  cord: { shape: 'rope', color: '#8f1a24', rough: 0.9 },
  cable: { shape: 'rope', color: '#1b1d22', rough: 0.5 },
  scarf: { shape: 'rope', color: '#efe6d2', rough: 0.9, flat: true },
  piano_wire: { shape: 'rope', color: '#c9ccd2', metal: 1, rough: 0.2, long: true },
  strap: { shape: 'rope', color: '#6a4426', rough: 0.7, flat: true },
  lariat: { shape: 'rope', color: '#c8a76a', rough: 1 },
  film: { shape: 'rope', color: '#26201c', rough: 0.4, flat: true },
  tow_rope: { shape: 'rope', color: '#ff7a1a', rough: 0.8 },
  sash: { shape: 'rope', color: '#d8b04a', rough: 0.6, flat: true },
  ashtray: { shape: 'block', color: '#dfe9ef', glass: true },
  metate: { shape: 'block', color: '#4a4a4a', rough: 1 },
  sandbag: { shape: 'block', color: '#b29a6a', rough: 1 },
  counterweight: { shape: 'block', color: '#a8916a', rough: 1 },
  core_sample: { shape: 'core', color: '#cfe8ff', glass: true },
};

const fallback: Look = { shape: 'block', color: '#888888' };

function Material({ look, color }: { look: Look; color?: string }) {
  if (look.glass) {
    return <meshPhysicalMaterial color={color ?? look.color} transmission={0.85} roughness={0.08} thickness={0.4} transparent opacity={0.85} />;
  }
  return <meshStandardMaterial color={color ?? look.color} metalness={look.metal ?? 0.1} roughness={look.rough ?? 0.6} />;
}

const lathe = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 48);

/** The object itself, plus where any residue sits. Models stand on y = 0 and are about 2 units tall. */
function Model({ look }: { look: Look }): { node: React.ReactNode; residue: [number, number, number]; height?: number } {
  switch (look.shape) {
    case 'candlestick': {
      const g = lathe([[0, 0], [0.55, 0], [0.55, 0.1], [0.2, 0.25], [0.12, 0.4], [0.14, 1.2], [0.1, 1.5], [0.3, 1.65], [0.3, 1.75], [0.12, 1.75], [0, 1.8]]);
      return {
        node: (
          <group>
            <mesh geometry={g} castShadow><Material look={look} /></mesh>
            <mesh position={[0, 2.05, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.08, 0.5, 16]} />
              <meshStandardMaterial color="#f4ecd8" />
            </mesh>
          </group>
        ),
        residue: [0.5, 0.06, 0.1],
        height: 2.3,
      };
    }
    case 'statuette': {
      const base = lathe([[0, 0], [0.6, 0], [0.6, 0.35], [0.45, 0.4], [0, 0.4]]);
      return {
        node: (
          <group>
            <mesh geometry={base} castShadow><Material look={look} color="#2a2420" /></mesh>
            <mesh position={[0, 1.0, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.32, 1.2, 24]} />
              <Material look={look} />
            </mesh>
            <mesh position={[0, 1.85, 0]} castShadow>
              <sphereGeometry args={[0.3, 32, 24]} />
              <Material look={look} />
            </mesh>
          </group>
        ),
        residue: [0.5, 0.2, 0.25],
        height: 2.2,
      };
    }
    case 'bar':
    case 'axe': {
      const len = look.long ? 2.6 : 2.1;
      return {
        node: (
          <group rotation={[0, 0, Math.PI / 2.3]} position={[0.2, 0.25, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.07, 0.07, len, 16]} />
              <Material look={look} />
            </mesh>
            <mesh position={[0, -len / 2 + 0.25, 0]} castShadow>
              <cylinderGeometry args={[0.11, 0.11, 0.5, 16]} />
              <meshStandardMaterial color="#2a1c10" roughness={0.9} />
            </mesh>
            {look.flat && (
              <mesh position={[0, len / 2, 0]} castShadow>
                <boxGeometry args={[0.45, 0.5, 0.06]} />
                <Material look={look} />
              </mesh>
            )}
            {look.shape === 'axe' && (
              <mesh position={[0.25, len / 2 - 0.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <coneGeometry args={[0.08, 0.7, 12]} />
                <Material look={look} />
              </mesh>
            )}
          </group>
        ),
        residue: [-0.75, 1.0, 0.08],
      };
    }
    case 'blade':
    case 'pin': {
      const len = look.long ? 2.4 : 1.5;
      const shape = new THREE.Shape();
      const w = look.shape === 'pin' ? 0.03 : 0.16;
      shape.moveTo(-w, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w * 0.6, len * 0.85);
      shape.lineTo(0, len);
      shape.lineTo(-w * 0.6, len * 0.85);
      shape.closePath();
      const blade = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1 });
      return {
        node: (
          <group rotation={[0, 0, -Math.PI / 2.6]} position={[-0.5, 0.25, 0]}>
            <mesh position={[0, -0.35, 0]} castShadow>
              <cylinderGeometry args={[0.09, 0.08, 0.7, 16]} />
              <meshStandardMaterial color={look.shape === 'pin' ? look.color : '#2a1c10'} metalness={look.shape === 'pin' ? 1 : 0} roughness={0.6} />
            </mesh>
            {look.shape === 'pin' && (
              <mesh position={[0, -0.75, 0]} castShadow>
                <sphereGeometry args={[0.16, 24, 16]} />
                <meshStandardMaterial color="#b3261e" metalness={0.3} roughness={0.2} />
              </mesh>
            )}
            {look.shape === 'blade' && (
              <mesh position={[0, 0.02, 0.015]} castShadow>
                <boxGeometry args={[0.45, 0.06, 0.08]} />
                <meshStandardMaterial color="#8a7a5a" metalness={0.8} roughness={0.4} />
              </mesh>
            )}
            <mesh geometry={blade} position={[0, 0.04, 0]} castShadow>
              <Material look={look} />
            </mesh>
          </group>
        ),
        residue: [0.45, 0.85, 0.06],
      };
    }
    case 'shard': {
      const g = new THREE.TetrahedronGeometry(0.9, 0);
      return {
        node: (
          <mesh geometry={g} position={[0, 0.7, 0]} rotation={[0.4, 0.3, 0.2]} scale={[0.6, 1.4, 0.2]} castShadow>
            <Material look={look} />
          </mesh>
        ),
        residue: [0.15, 1.2, 0.18],
      };
    }
    case 'bottle': {
      const g = lathe([[0, 0], [0.45, 0], [0.5, 0.1], [0.5, 1.1], [0.3, 1.4], [0.13, 1.55], [0.13, 2.0], [0.16, 2.05], [0, 2.05]]);
      const liquid = lathe([[0, 0.05], [0.42, 0.05], [0.44, 0.1], [0.44, 0.7], [0, 0.7]]);
      return {
        node: (
          <group>
            <mesh geometry={liquid}><meshStandardMaterial color={look.liquid} roughness={0.2} /></mesh>
            <mesh geometry={g} castShadow><Material look={look} /></mesh>
          </group>
        ),
        residue: [0.12, 1.98, 0.08],
        height: 2.1,
      };
    }
    case 'glass': {
      const stem = !look.flat;
      const g = stem
        ? lathe([[0, 0], [0.45, 0], [0.45, 0.04], [0.06, 0.1], [0.05, 0.8], [0.12, 0.9], [0.55, 1.5], [0.53, 1.52], [0.1, 0.95], [0, 0.95]])
        : lathe([[0, 0], [0.5, 0], [0.55, 0.9], [0.5, 0.9], [0.45, 0.08], [0, 0.08]]);
      const liquid = stem ? lathe([[0, 1.0], [0.22, 1.05], [0.4, 1.3], [0, 1.3]]) : lathe([[0, 0.1], [0.46, 0.1], [0.5, 0.5], [0, 0.5]]);
      return {
        node: (
          <group>
            <mesh geometry={liquid}><meshStandardMaterial color={look.liquid} roughness={0.2} /></mesh>
            <mesh geometry={g} castShadow><Material look={look} /></mesh>
          </group>
        ),
        residue: stem ? [0.45, 1.45, 0.15] : [0.5, 0.8, 0.15],
        height: stem ? 1.55 : 0.95,
      };
    }
    case 'can':
      return {
        node: (
          <mesh position={[0, look.flat ? 0.4 : 0.75, 0]} castShadow>
            <cylinderGeometry args={[look.flat ? 0.65 : 0.38, look.flat ? 0.65 : 0.38, look.flat ? 0.8 : 1.5, 32]} />
            <Material look={look} />
          </mesh>
        ),
        residue: look.flat ? [0.3, 0.82, 0.3] : [0.2, 1.52, 0.2],
      };
    case 'vial':
      return {
        node: (
          <group>
            <mesh position={[0, 0.6, 0]} castShadow>
              <cylinderGeometry args={[0.28, 0.28, 1.2, 24]} />
              <Material look={look} />
            </mesh>
            <mesh position={[0, 1.3, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.2, 0.25, 16]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.6} />
            </mesh>
          </group>
        ),
        residue: [0.28, 0.9, 0.05],
        height: 1.45,
      };
    case 'rope': {
      const pts = Array.from({ length: 60 }, (_, i) => {
        const a = (i / 59) * Math.PI * 4.2;
        const r = 0.7 + Math.sin(i * 0.7) * 0.05;
        return new THREE.Vector3(Math.cos(a) * r, 0.15 + i * 0.006, Math.sin(a) * r * 0.8);
      });
      const curve = new THREE.CatmullRomCurve3(pts);
      const g = new THREE.TubeGeometry(curve, 240, look.long ? 0.025 : look.flat ? 0.09 : 0.07, 8, false);
      return {
        node: (
          <mesh geometry={g} scale={look.flat ? [1, 0.4, 1] : [1, 1, 1]} castShadow>
            <Material look={look} />
          </mesh>
        ),
        residue: [0.7, 0.3, 0.05],
      };
    }
    case 'core':
      return {
        node: (
          <mesh position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.32, 0.32, 2.2, 32]} />
            <Material look={look} />
          </mesh>
        ),
        residue: [1.0, 0.55, 0.15],
      };
    case 'block':
    default:
      return {
        node: (
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.8, 0.9, 0.7, 40]} />
            <Material look={look} />
          </mesh>
        ),
        residue: [0.6, 0.6, 0.4],
      };
  }
}

const Weapon3D: React.FC<{ weaponKey: string; residue: boolean; lamp: boolean }> = ({ weaponKey, residue, lamp }) => {
  const look = LOOKS[weaponKey] ?? fallback;
  const { node, residue: spot, height = 0.9 } = useMemo(() => Model({ look }), [look]);
  // Frame the camera to the object's height so tall and flat items both fill the view.
  const cam: [number, number, number] = [1.6 + height * 0.9, 0.9 + height * 0.85, 2.0 + height * 1.25];

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: cam, fov: 38 }} style={{ position: 'absolute', inset: 0, touchAction: 'none' }}>
      <color attach="background" args={[lamp ? '#0d0618' : '#1c1612']} />
      <ambientLight intensity={lamp ? 0.08 : 0.6} />
      <directionalLight position={[3, 5, 2]} intensity={lamp ? 0.1 : 1.4} castShadow />
      <pointLight position={[-3, 2, -2]} intensity={lamp ? 0 : 0.4} color="#ffcf8a" />
      {lamp && <spotLight position={[1.5, 4, 2.5]} angle={0.6} penumbra={0.6} intensity={30} color="#7b4dff" />}

      <group position={[0, 0, 0]}>
        {node}
        {residue && (
          <mesh position={spot} scale={[1, 0.6, 1]}>
            <sphereGeometry args={[0.13, 16, 12]} />
            <meshStandardMaterial
              color={lamp ? '#ffe46b' : '#5a2a22'}
              emissive={lamp ? '#d6ff4a' : '#000000'}
              emissiveIntensity={lamp ? 2.2 : 0}
              transparent
              opacity={lamp ? 0.95 : 0.12}
            />
          </mesh>
        )}
      </group>

      <ContactShadows position={[0, 0, 0]} opacity={0.55} scale={6} blur={2.4} far={3} />
      <OrbitControls enablePan={false} minDistance={1.8} maxDistance={7} target={[0, height / 2, 0]} autoRotate autoRotateSpeed={1.2} />
    </Canvas>
  );
};

export default Weapon3D;
