import React, { useEffect, useRef } from 'react';
import { ThemeKey } from '../types';

type Kind = 'rain' | 'neon' | 'snow' | 'petals' | 'dust' | 'glitter';

const BY_THEME: Record<ThemeKey, Kind> = {
  gothic: 'rain',
  cyber: 'neon',
  opera: 'dust',
  casino: 'dust',
  express: 'snow',
  hacienda: 'petals',
  studio: 'dust',
  arctic: 'snow',
  carnival: 'glitter',
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  phase: number;
}

const COUNT: Record<Kind, number> = { rain: 140, neon: 110, snow: 110, petals: 40, dust: 60, glitter: 70 };

/** Light, per-setting weather drawn over the board. Purely decorative and never blocks the pointer. */
export const WeatherLayer: React.FC<{ theme: ThemeKey; storm?: boolean }> = ({ theme, storm }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const kind: Kind = storm ? 'rain' : BY_THEME[theme];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const spawn = (anywhere: boolean): Particle => {
      const base: Particle = { x: Math.random() * w, y: anywhere ? Math.random() * h : -20, vx: 0, vy: 0, size: 1, spin: 0, phase: Math.random() * Math.PI * 2 };
      switch (kind) {
        case 'rain':
        case 'neon':
          if (storm) return { ...base, vx: -4, vy: 16 + Math.random() * 8, size: 16 + Math.random() * 16 };
          return { ...base, vx: -1.2, vy: 11 + Math.random() * 6, size: 10 + Math.random() * 12 };
        case 'snow':
          return { ...base, vx: -0.3 + Math.random() * 0.6, vy: 0.6 + Math.random() * 1.1, size: 1.2 + Math.random() * 2.4 };
        case 'petals':
          return { ...base, vx: -0.4 + Math.random() * 0.8, vy: 0.7 + Math.random() * 0.9, size: 4 + Math.random() * 4, spin: Math.random() * 6 };
        case 'dust':
        case 'glitter':
          return { ...base, y: anywhere ? Math.random() * h : h + 10, vx: -0.15 + Math.random() * 0.3, vy: -(0.1 + Math.random() * 0.3), size: 0.8 + Math.random() * 1.8 };
      }
    };
    let parts = Array.from({ length: storm ? 300 : COUNT[kind] }, () => spawn(true));
    // Storm lightning: a soft, slow flash now and then, never for reduced-motion players.
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let flash = 0;
    let nextFlash = 240 + Math.random() * 480;

    let raf = 0;
    let t = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      t += 1;
      ctx.clearRect(0, 0, w, h);
      if (storm && !calm) {
        if (--nextFlash <= 0) {
          flash = 1;
          nextFlash = 360 + Math.random() * 600;
        }
        if (flash > 0.01) {
          ctx.fillStyle = `rgba(210,220,255,${flash * 0.16})`;
          ctx.fillRect(0, 0, w, h);
          flash *= 0.93;
        }
      }
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.x += p.vx + (kind === 'snow' || kind === 'petals' ? Math.sin((t + p.phase * 60) / 50) * 0.4 : 0);
        p.y += p.vy;
        p.spin += 0.02;
        const out = p.y > h + 30 || p.y < -40 || p.x < -40 || p.x > w + 40;
        if (out) {
          parts[i] = spawn(false);
          continue;
        }
        switch (kind) {
          case 'rain':
          case 'neon':
            ctx.strokeStyle = kind === 'neon' ? (i % 3 ? 'rgba(80,220,255,0.35)' : 'rgba(255,80,200,0.3)') : storm ? 'rgba(180,200,230,0.3)' : 'rgba(180,200,230,0.22)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.vx * 1.4, p.y - p.size);
            ctx.stroke();
            break;
          case 'snow':
            ctx.fillStyle = 'rgba(240,246,255,0.75)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'petals':
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.spin);
            ctx.fillStyle = i % 4 ? 'rgba(255,150,30,0.85)' : 'rgba(255,200,60,0.85)';
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            break;
          case 'dust':
          case 'glitter': {
            const twinkle = kind === 'glitter' ? 0.4 + 0.6 * Math.abs(Math.sin((t + p.phase * 80) / 18)) : 0.5;
            ctx.fillStyle = kind === 'glitter' ? `rgba(255,215,110,${twinkle})` : 'rgba(240,210,150,0.28)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
        }
      }
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      parts = [];
    };
  }, [kind, storm]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[5] h-full w-full" aria-hidden />;
};
