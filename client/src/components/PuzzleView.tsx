import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlipHorizontal2, Check, RotateCcw, Droplet } from 'lucide-react';
import { Puzzle } from '../types';
import { useI18n, TKey } from '../i18n';
import { soundFx } from '../utils/audio';

interface Props {
  puzzle: Puzzle;
  seed: string;
  onSolved: () => void;
}

/** A short shake when an answer is wrong. */
function useShake(): [boolean, () => void] {
  const [shaking, setShaking] = useState(false);
  return [
    shaking,
    () => {
      soundFx.wrong();
      setShaking(true);
      setTimeout(() => setShaking(false), 450);
    },
  ];
}

const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

export const PuzzleView: React.FC<Props> = ({ puzzle, seed, onSolved }) => {
  const solve = () => {
    soundFx.solved();
    onSolved();
  };
  switch (puzzle.type) {
    case 'hand':
      return <HandPuzzle answer={puzzle.answer} onSolved={solve} />;
    case 'sole':
      return <SolePuzzle answer={puzzle.answer} onSolved={solve} />;
    case 'uv':
      return <UvPuzzle habit={puzzle.key} seed={seed} onSolved={solve} />;
    case 'blood':
      return <BloodPuzzle answer={puzzle.answer} onSolved={solve} />;
    case 'torn':
      return <TornPuzzle pieces={puzzle.pieces} seed={seed} onSolved={solve} />;
    case 'cipher':
      return null; // rendered by CipherPuzzle, which needs the text
  }
};

const Frame: React.FC<{ title: TKey; body: TKey; children: React.ReactNode; shaking?: boolean }> = ({ title, body, children, shaking }) => {
  const { t } = useI18n();
  return (
    <div className={shaking ? 'puzzle-shake' : ''}>
      <h3 className="font-typewriter text-[19px] text-[var(--ink)]">{t(title)}</h3>
      <p className="mt-1 text-[14px] text-[var(--ink-soft)] max-w-[56ch]">{t(body)}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
};

// ─── Which hand? ─────────────────────────────────────────────────────────────

const HandPuzzle: React.FC<{ answer: 'left' | 'right'; onSolved: () => void }> = ({ answer, onSolved }) => {
  const { t } = useI18n();
  const [hand, setHand] = useState<'left' | 'right'>(answer === 'left' ? 'right' : 'left');
  const [shaking, shake] = useShake();
  // For a right hand the thumb sits on the left of the lapel, fingers on the right.
  const thumbX = (h: 'left' | 'right') => (h === 'right' ? 90 : 230);
  const fingerX = (h: 'left' | 'right') => (h === 'right' ? 230 : 90);

  return (
    <Frame title="pz.hand.title" body="pz.hand.body" shaking={shaking}>
      <svg viewBox="0 0 320 220" className="w-full max-w-md rounded-md bg-[#2b2f36]">
        <path d="M 120 0 L 200 0 L 250 220 L 70 220 Z" fill="#3a3f48" />
        <path d="M 160 0 L 160 220" stroke="#22262c" strokeWidth="2" />
        {/* The smudges */}
        <ellipse cx={thumbX(answer)} cy={120} rx={15} ry={22} fill="#7c8592" opacity={0.75} />
        {[60, 95, 130, 162].map(y => (
          <ellipse key={y} cx={fingerX(answer)} cy={y} rx={13} ry={11} fill="#7c8592" opacity={0.75} />
        ))}
        {/* The hand outline the player flips */}
        <g opacity={0.55} style={{ transition: 'all 0.3s' }}>
          <rect x={115} y={70} width={90} height={100} rx={30} fill="none" stroke="#ffd27a" strokeWidth={3} strokeDasharray="6 4" />
          <rect x={thumbX(hand) - 16} y={95} width={32} height={52} rx={16} fill="none" stroke="#ffd27a" strokeWidth={3} />
          {[60, 95, 130, 162].map(y => (
            <rect key={y} x={fingerX(hand) - 16} y={y - 12} width={32} height={24} rx={12} fill="none" stroke="#ffd27a" strokeWidth={3} />
          ))}
        </g>
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="btn btn-ink" onClick={() => setHand(h => (h === 'left' ? 'right' : 'left'))}>
          <FlipHorizontal2 size={15} /> {t('pz.hand.flip')}
        </button>
        <span className="text-[14px] font-semibold text-[var(--ink)] min-w-[90px]">{t(hand === 'left' ? 'pz.hand.left' : 'pz.hand.right')}</span>
        <button className="btn btn-primary" onClick={() => (hand === answer ? onSolved() : shake())}>
          <Check size={15} /> {t('pz.hand.fits')}
        </button>
      </div>
    </Frame>
  );
};

// ─── Match the sole ──────────────────────────────────────────────────────────

const SOLE_PATH = 'M 30 12 C 52 2, 70 14, 72 42 C 74 70, 66 92, 62 112 L 60 150 C 58 168, 22 168, 20 150 L 18 112 C 12 86, 8 60, 12 38 C 15 20, 22 14, 30 12 Z';
const SOLES = ['boots', 'heels', 'oxfords', 'rubber'] as const;

const SolePattern: React.FC<{ kind: string; id: string; tone: string }> = ({ kind, id, tone }) => (
  <>
    <defs>
      <clipPath id={id}>
        <path d={SOLE_PATH} />
      </clipPath>
    </defs>
    <path d={SOLE_PATH} fill="none" stroke={tone} strokeWidth={2.5} />
    <g clipPath={`url(#${id})`} stroke={tone} fill={tone}>
      {kind === 'boots' &&
        [20, 40, 60, 80, 100].flatMap(y => [14, 34, 54].map(x => <rect key={`${x}-${y}`} x={x} y={y} width={14} height={12} rx={2} />)).concat(
          [130, 148].map(y => <rect key={`h${y}`} x={22} y={y} width={36} height={10} rx={2} />)
        )}
      {kind === 'heels' && (
        <>
          {[30, 48, 66].map(y => (
            <circle key={y} cx={42} cy={y} r={3} />
          ))}
          <circle cx={40} cy={150} r={7} />
        </>
      )}
      {kind === 'oxfords' && (
        <>
          <path d={SOLE_PATH} fill="none" strokeDasharray="4 3" strokeWidth={1.5} transform="translate(40 85) scale(0.86) translate(-40 -85)" />
          <rect x={20} y={128} width={40} height={30} fill="none" strokeWidth={2} />
          {[30, 50].map(x => [138, 150].map(y => <circle key={`${x}${y}`} cx={x} cy={y} r={2} />))}
        </>
      )}
      {kind === 'rubber' &&
        [24, 42, 60, 78, 96, 114, 132, 150].map(y => (
          <path key={y} d={`M 0 ${y} l 10 -7 l 10 7 l 10 -7 l 10 7 l 10 -7 l 10 7 l 10 -7 l 10 7`} fill="none" strokeWidth={3} />
        ))}
    </g>
  </>
);

const SolePuzzle: React.FC<{ answer: string; onSolved: () => void }> = ({ answer, onSolved }) => {
  const { t } = useI18n();
  const [shaking, shake] = useShake();
  const [wrong, setWrong] = useState<string | null>(null);

  return (
    <Frame title="pz.sole.title" body="pz.sole.body" shaking={shaking}>
      <div className="flex flex-wrap items-end gap-5">
        <figure className="text-center">
          <svg viewBox="0 0 84 176" className="h-44 rounded-md bg-[#8a7a62] p-1" style={{ transform: 'rotate(-8deg)' }}>
            <SolePattern kind={answer} id="cast" tone="#efe6d2" />
          </svg>
          <figcaption className="mt-2 text-[12px] font-semibold text-[var(--ink-soft)]">{t('pz.sole.cast')}</figcaption>
        </figure>
        <div className="grid grid-cols-4 gap-2 flex-1 min-w-[260px]">
          {SOLES.map(kind => (
            <button
              key={kind}
              onClick={() => {
                if (kind === answer) onSolved();
                else {
                  setWrong(kind);
                  shake();
                }
              }}
              className={`rounded-md border-2 p-1.5 text-center transition-colors ${wrong === kind ? 'border-[var(--blood)]' : 'border-ink/15 hover:border-ink/40'} bg-white/40`}
            >
              <svg viewBox="0 0 84 176" className="mx-auto h-28">
                <SolePattern kind={kind} id={`ref-${kind}`} tone="#2a1c10" />
              </svg>
              <span className="mt-1 block text-[11.5px] font-semibold leading-tight text-[var(--ink)]">{t(`foot.${kind}` as TKey)}</span>
            </button>
          ))}
        </div>
      </div>
      {wrong && <p className="mt-2 text-[13px] text-[var(--blood)]">{t('pz.sole.nomatch')}</p>}
    </Frame>
  );
};

// ─── UV lamp ─────────────────────────────────────────────────────────────────

const UV_COLORS: Record<string, string> = {
  cigar: '#d9d2c3',
  lavender: '#c9a2ff',
  ink: '#5fb2ff',
  cat: '#f4f7ff',
  mint: '#7dffb8',
};

const UvPuzzle: React.FC<{ habit: string; seed: string; onSolved: () => void }> = ({ habit, seed, onSolved }) => {
  const { t } = useI18n();
  const box = useRef<HTMLDivElement | null>(null);
  const [lamp, setLamp] = useState<{ x: number; y: number } | null>(null);
  const [found, setFound] = useState(0);
  const done = found >= 1;
  const spot = useMemo(() => {
    const h = hash(seed);
    return { x: 0.2 + (h % 60) / 100, y: 0.25 + ((h >> 6) % 50) / 100 };
  }, [seed]);
  const specks = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ dx: Math.sin(i * 7.1) * 34, dy: Math.cos(i * 3.3) * 22, r: 1.5 + (i % 4) })), []);
  const dwell = useRef(0);

  useEffect(() => {
    if (done) {
      const id = setTimeout(onSolved, 900);
      return () => clearTimeout(id);
    }
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = (e: React.PointerEvent) => {
    const rect = box.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLamp({ x, y });
    const dist = Math.hypot(x - spot.x * rect.width, y - spot.y * rect.height);
    if (dist < 55 && !done) {
      dwell.current += 1;
      if (dwell.current > 18) setFound(1);
    }
  };

  const color = UV_COLORS[habit] ?? '#c9a2ff';
  return (
    <Frame title="pz.uv.title" body="pz.uv.body">
      <div
        ref={box}
        onPointerMove={move}
        onPointerDown={move}
        className="relative h-56 w-full max-w-lg overflow-hidden rounded-md cursor-none select-none"
        style={{ background: 'repeating-linear-gradient(45deg, #1a1d24 0 6px, #1e222a 6px 12px)', touchAction: 'none' }}
      >
        {/* What the UV light reveals */}
        <svg
          viewBox="-50 -35 100 70"
          className="absolute h-[70px] w-[100px] -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%`, filter: `drop-shadow(0 0 6px ${color})` }}
        >
          {specks.map((sp, i) =>
            habit === 'cat' ? (
              <path key={i} d={`M ${sp.dx} ${sp.dy} q 8 -6 16 2`} stroke={color} strokeWidth={1.2} fill="none" />
            ) : (
              <circle key={i} cx={sp.dx} cy={sp.dy} r={sp.r} fill={color} />
            )
          )}
        </svg>
        {/* Darkness everywhere except under the lamp (or everywhere once found) */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-700"
          style={{
            background: '#08060e',
            opacity: done ? 0 : 1,
            WebkitMaskImage: lamp ? `radial-gradient(circle 70px at ${lamp.x}px ${lamp.y}px, transparent 55%, black 100%)` : undefined,
            maskImage: lamp ? `radial-gradient(circle 70px at ${lamp.x}px ${lamp.y}px, transparent 55%, black 100%)` : undefined,
          }}
        />
        {lamp && !done && (
          <div
            className="pointer-events-none absolute h-[140px] w-[140px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: lamp.x, top: lamp.y, boxShadow: '0 0 40px 8px rgba(150,90,255,0.35) inset' }}
          />
        )}
        {!lamp && (
          <span className="absolute inset-0 flex items-center justify-center text-[13px] text-[#b9a7ff]">{t('pz.uv.start')}</span>
        )}
      </div>
    </Frame>
  );
};

// ─── Blood typing ────────────────────────────────────────────────────────────

const BloodPuzzle: React.FC<{ answer: string; onSolved: () => void }> = ({ answer, onSolved }) => {
  const { t } = useI18n();
  const [added, setAdded] = useState({ A: false, B: false });
  const [shaking, shake] = useShake();
  const clumps = (serum: 'A' | 'B') => answer.includes(serum);

  return (
    <Frame title="pz.blood.title" body="pz.blood.body" shaking={shaking}>
      <div className="flex flex-wrap gap-4">
        {(['A', 'B'] as const).map(serum => (
          <div key={serum} className="text-center">
            <div className={`relative h-28 w-28 rounded-full border-4 ${serum === 'A' ? 'border-[#3f7fd8]' : 'border-[#d8b23f]'} bg-white/70 overflow-hidden`}>
              {added[serum] &&
                (clumps(serum) ? (
                  <svg viewBox="0 0 100 100" className="absolute inset-0">
                    {Array.from({ length: 14 }, (_, i) => (
                      <circle key={i} cx={20 + ((i * 37) % 60)} cy={20 + ((i * 53) % 60)} r={4 + (i % 3) * 2} fill="#8f1a14" />
                    ))}
                  </svg>
                ) : (
                  <div className="absolute inset-2 rounded-full bg-[#b3261e]/70" />
                ))}
            </div>
            <div className="mt-1.5 text-[13px] font-semibold text-[var(--ink)]">{t(serum === 'A' ? 'pz.blood.antiA' : 'pz.blood.antiB')}</div>
            {added[serum] ? (
              <div className="text-[12px] text-[var(--ink-soft)]">{t(clumps(serum) ? 'pz.blood.clumped' : 'pz.blood.smooth')}</div>
            ) : (
              <button className="mt-1 btn btn-ink py-1 text-[12px]" onClick={() => setAdded(a => ({ ...a, [serum]: true }))}>
                <Droplet size={13} /> {t('pz.blood.add')}
              </button>
            )}
          </div>
        ))}
      </div>
      {added.A && added.B && (
        <div className="mt-4">
          <div className="text-[14px] font-semibold text-[var(--ink)]">{t('pz.blood.which')}</div>
          <div className="mt-2 flex gap-2">
            {['A', 'B', 'AB', 'O'].map(type => (
              <button key={type} className="btn btn-ink min-w-[52px]" onClick={() => (type === answer ? onSolved() : shake())}>
                {type}
              </button>
            ))}
          </div>
        </div>
      )}
    </Frame>
  );
};

// ─── Torn letter ─────────────────────────────────────────────────────────────

const TornPuzzle: React.FC<{ pieces: string[]; seed: string; onSolved: () => void }> = ({ pieces, seed, onSolved }) => {
  const { t } = useI18n();
  const shuffled = useMemo(() => {
    const order = pieces.map((_, i) => i);
    const h = hash(seed);
    for (let i = order.length - 1; i > 0; i--) {
      const j = (h >> i) % (i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (order.every((v, i) => v === i)) order.reverse();
    return order;
  }, [pieces, seed]);
  const [placed, setPlaced] = useState<number[]>([]);
  const [shaking, shake] = useShake();

  useEffect(() => {
    if (placed.length !== pieces.length) return;
    if (placed.every((v, i) => v === i)) onSolved();
    else {
      shake();
      setTimeout(() => setPlaced([]), 500);
    }
  }, [placed]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrap = (i: number, onClick: () => void, dim = false, where = 'pool') => (
    <button
      key={`${where}-${i}`}
      onClick={onClick}
      className={`torn-scrap text-left font-typed text-[14px] leading-snug text-[#2f2216] px-3 py-2.5 ${dim ? 'opacity-30' : 'hover:-translate-y-0.5'} transition-all`}
      style={{ transform: `rotate(${((i * 37) % 7) - 3}deg)` }}
      disabled={dim}
    >
      {pieces[i]}
    </button>
  );

  return (
    <Frame title="pz.torn.title" body="pz.torn.body" shaking={shaking}>
      <div className="min-h-[60px] rounded-md border-2 border-dashed border-ink/20 p-2 space-y-1.5">
        {placed.map(i => scrap(i, () => setPlaced(p => p.filter(x => x !== i)), false, 'placed'))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">{shuffled.map(i => scrap(i, () => setPlaced(p => [...p, i]), placed.includes(i)))}</div>
      {placed.length > 0 && (
        <button className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)]" onClick={() => setPlaced([])}>
          <RotateCcw size={13} /> {t('pz.torn.reset')}
        </button>
      )}
    </Frame>
  );
};

// ─── Cipher dial ─────────────────────────────────────────────────────────────

const shiftText = (text: string, by: number) =>
  text.replace(/[a-z]/gi, ch => {
    const base = ch <= 'Z' ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + by + 26 * 4) % 26) + base);
  });

export const CipherPuzzle: React.FC<{ text: string; shift: number; onSolved: () => void }> = ({ text, shift, onSolved }) => {
  const { t } = useI18n();
  const encoded = useMemo(() => shiftText(text, shift), [text, shift]);
  const [dial, setDial] = useState(0);
  const decoded = shiftText(encoded, -dial);
  const right = dial === shift;

  useEffect(() => {
    if (!right) return;
    const id = setTimeout(() => {
      soundFx.solved();
      onSolved();
    }, 700);
    return () => clearTimeout(id);
  }, [right]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Frame title="pz.cipher.title" body="pz.cipher.body">
      <p className={`font-typed text-[16px] leading-[1.65] max-w-[62ch] transition-colors ${right ? 'text-[#2e7d4f]' : 'text-[#2f2216]'}`}>{decoded}</p>
      <div className="mt-4 flex items-center gap-3 max-w-md">
        <span className="text-[13px] font-semibold text-[var(--ink-soft)]">{t('pz.cipher.dial')}</span>
        <input
          type="range"
          min={0}
          max={25}
          value={dial}
          onChange={(e) => {
            setDial(Number(e.target.value));
            soundFx.tick();
          }}
          className="flex-1 accent-[#b3261e]"
          aria-label={t('pz.cipher.dial')}
        />
        <span className="w-10 text-right font-typed text-[16px] text-[var(--ink)] tabular">{dial}</span>
      </div>
    </Frame>
  );
};
