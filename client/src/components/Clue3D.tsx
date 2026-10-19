import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Evidence } from '../types';

type Model = NonNullable<Evidence['model']>;

/** Paints onto a canvas and wraps it as a texture, so text needs no font downloads. */
function canvasTexture(w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  paint(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function watchFace(min: number) {
  return canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#f4eedf';
    ctx.beginPath();
    ctx.arc(256, 256, 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1c10';
    ctx.font = 'bold 54px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(String(i), 256 + Math.cos(a) * 190, 256 + Math.sin(a) * 190);
    }
    // The hands are stopped at the moment of death.
    const h = Math.floor(min / 60) % 12;
    const m = min % 60;
    const hand = (angle: number, len: number, width: number) => {
      ctx.save();
      ctx.translate(256, 256);
      ctx.rotate(angle);
      ctx.fillStyle = '#16100a';
      ctx.fillRect(-width / 2, -len, width, len + 18);
      ctx.restore();
    };
    hand(((h + m / 60) / 12) * Math.PI * 2, 120, 14);
    hand((m / 60) * Math.PI * 2, 175, 9);
    ctx.fillStyle = '#b3261e';
    ctx.beginPath();
    ctx.arc(256, 256, 12, 0, Math.PI * 2);
    ctx.fill();
    // A crack across the glass from the fall.
    ctx.strokeStyle = 'rgba(40,40,40,0.65)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(90, 120);
    ctx.lineTo(220, 240);
    ctx.lineTo(260, 230);
    ctx.lineTo(420, 400);
    ctx.moveTo(220, 240);
    ctx.lineTo(180, 330);
    ctx.stroke();
  });
}

function engraving(text: string, metal = '#c9a24a') {
  return canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = metal;
    ctx.fillRect(0, 0, 512, 512);
    const g = ctx.createRadialGradient(200, 180, 20, 256, 256, 320);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = 'rgba(40,25,5,0.75)';
    ctx.font = 'italic 64px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    text.split('\n').forEach((line, i, all) => ctx.fillText(line, 256, 256 + (i - (all.length - 1) / 2) * 76));
  });
}

function embroidered(initials: string, cloth: string, thread: string) {
  return canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = cloth;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    for (let i = 0; i < 512; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
    }
    ctx.fillStyle = thread;
    ctx.font = 'italic bold 96px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, 360, 380);
  });
}

function handwriting(seal: string) {
  return canvasTexture(512, 360, (ctx) => {
    ctx.fillStyle = '#efe3c6';
    ctx.fillRect(0, 0, 512, 360);
    ctx.strokeStyle = 'rgba(30,40,80,0.6)';
    ctx.lineWidth = 3;
    for (let row = 0; row < 7; row++) {
      ctx.beginPath();
      let x = 40;
      const y = 50 + row * 42;
      ctx.moveTo(x, y);
      while (x < 470 - (row === 6 ? 200 : 0)) {
        x += 8 + Math.random() * 10;
        ctx.lineTo(x, y + Math.sin(x * 0.4) * 5);
      }
      ctx.stroke();
    }
    ctx.fillStyle = seal;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(0, 340, 512, 20);
  });
}

function WatchModel({ model }: { model: Extract<Model, { type: 'watch' }> }) {
  const face = useMemo(() => watchFace(model.min), [model.min]);
  const back = useMemo(() => engraving(`For ${model.engraving}\n— always on time —`), [model.engraving]);
  return (
    <group rotation={[Math.PI / 2.2, 0, 0]} position={[0, 0.9, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.9, 0.9, 0.22, 64]} />
        <meshStandardMaterial color="#c9a24a" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.112, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 64]} />
        <meshStandardMaterial map={face} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.112, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.86, 64]} />
        <meshStandardMaterial map={back} metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 1.0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.25, 16]} />
        <meshStandardMaterial color="#c9a24a" metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  );
}

function MonogramModel({ model }: { model: Extract<Model, { type: 'monogram' }> }) {
  const cloth = useMemo(() => embroidered(model.initials, '#f4f1ea', '#7a1f2b'), [model.initials]);
  const leather = useMemo(() => embroidered(model.initials, '#3a2418', '#c9a24a'), [model.initials]);
  const metal = useMemo(() => engraving(model.initials, '#c9ccd2'), [model.initials]);
  const gold = useMemo(() => engraving(model.initials), [model.initials]);
  switch (model.item) {
    case 'handkerchief':
      return (
        <mesh rotation={[-Math.PI / 2.4, 0, 0.3]} position={[0, 0.5, 0]} castShadow receiveShadow>
          <planeGeometry args={[2, 2, 16, 16]} />
          <meshStandardMaterial map={cloth} side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
      );
    case 'glove':
      return (
        <group position={[0, 0.4, 0]} rotation={[-0.3, 0.4, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.0, 1.2, 0.25]} />
            <meshStandardMaterial map={leather} roughness={0.7} />
          </mesh>
          {[-0.36, -0.12, 0.12, 0.36].map(x => (
            <mesh key={x} position={[x, 0.85, 0]} castShadow>
              <capsuleGeometry args={[0.1, 0.45, 4, 12]} />
              <meshStandardMaterial color="#3a2418" roughness={0.7} />
            </mesh>
          ))}
          <mesh position={[-0.62, 0.2, 0]} rotation={[0, 0, 0.8]} castShadow>
            <capsuleGeometry args={[0.11, 0.35, 4, 12]} />
            <meshStandardMaterial color="#3a2418" roughness={0.7} />
          </mesh>
        </group>
      );
    case 'cufflink':
      return (
        <group position={[0, 0.6, 0]} rotation={[Math.PI / 2.4, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.7, 0.7, 0.12, 48]} />
            <meshStandardMaterial color="#c9ccd2" metalness={1} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.062, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.62, 48]} />
            <meshStandardMaterial map={metal} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.3, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.5, 12]} />
            <meshStandardMaterial color="#9aa1a8" metalness={1} roughness={0.3} />
          </mesh>
        </group>
      );
    default:
      return (
        <group position={[0, 0.3, 0]} rotation={[-0.5, 0.3, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.6, 0.18, 1.1]} />
            <meshStandardMaterial color="#c9a24a" metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.092, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.4, 0.95]} />
            <meshStandardMaterial map={gold} metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      );
  }
}

function LetterModel({ model }: { model: Extract<Model, { type: 'letter' }> }) {
  const paper = useMemo(() => handwriting(model.seal), [model.seal]);
  return (
    <group position={[0, 0.5, 0]} rotation={[-0.9, 0.25, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.0, 1.4, 0.03]} />
        <meshStandardMaterial attach="material-0" color="#e2d2ab" />
        <meshStandardMaterial attach="material-1" color="#e2d2ab" />
        <meshStandardMaterial attach="material-2" color="#e2d2ab" />
        <meshStandardMaterial attach="material-3" color="#e2d2ab" />
        <meshStandardMaterial attach="material-4" color="#e8dbb8" />
        <meshStandardMaterial attach="material-5" map={paper} />
      </mesh>
      <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.28, 0.06, 32]} />
        <meshStandardMaterial color={model.seal} roughness={0.5} />
      </mesh>
    </group>
  );
}

const Clue3D: React.FC<{ model: Model; lamp: boolean }> = ({ model, lamp }) => (
  <Canvas shadows dpr={[1, 2]} camera={{ position: [2.4, 2.6, 3.4], fov: 36 }} style={{ position: 'absolute', inset: 0, touchAction: 'none' }}>
    <color attach="background" args={[lamp ? '#0d0618' : '#1c1612']} />
    <ambientLight intensity={lamp ? 0.08 : 0.6} />
    <directionalLight position={[3, 5, 2]} intensity={lamp ? 0.1 : 1.4} castShadow />
    <pointLight position={[-3, 2, -2]} intensity={lamp ? 0 : 0.4} color="#ffcf8a" />
    {lamp && <spotLight position={[1.5, 4, 2.5]} angle={0.6} penumbra={0.6} intensity={30} color="#7b4dff" />}
    {model.type === 'watch' && <WatchModel model={model} />}
    {model.type === 'monogram' && <MonogramModel model={model} />}
    {model.type === 'letter' && <LetterModel model={model} />}
    <ContactShadows position={[0, 0, 0]} opacity={0.55} scale={6} blur={2.4} far={3} />
    <OrbitControls enablePan={false} minDistance={1.8} maxDistance={7} target={[0, 0.6, 0]} autoRotate autoRotateSpeed={1.1} />
  </Canvas>
);

export default Clue3D;
