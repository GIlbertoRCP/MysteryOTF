import React, { useMemo } from 'react';
import { ConfrontEntry, Suspect } from '../types';

// Procedural noir portraits. Faces are seeded by name, so a character looks the same in
// every case; the coat and any habit match what the case file says about them.

export type Mood = 'calm' | 'nervous';

/** Suspects look nervous once a confrontation has rattled them. */
export function moodFor(suspectId: string, confrontations: ConfrontEntry[], tagged = false): Mood {
  if (tagged) return 'nervous';
  return confrontations.some(c => c.suspectId === suspectId && c.cracked && c.kind !== 'cleared') ? 'nervous' : 'calm';
}

function rng(seedText: string) {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length)];

const SKIN = ['#f2d3b8', '#e6b994', '#cf946b', '#ad7048', '#82502f', '#5d3822'];
const HAIR = ['#17110d', '#2f1f14', '#5a3a20', '#8c5f34', '#c4a273', '#8d8a86', '#5a1d14', '#d9d4cc'];
const COAT: Record<string, string> = {
  black: '#1f2024',
  grey: '#5f646c',
  green: '#3d5a3a',
  burgundy: '#6b1f2c',
  camel: '#a67c4e',
};

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + amount * 255)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => f(c).toString(16).padStart(2, '0')).join('')}`;
}

export function portraitSvg(s: Pick<Suspect, 'name' | 'color' | 'look' | 'traitKeys'>, mood: Mood): string {
  const r = rng(s.name);
  const fem = s.look === 'f';
  const skin = pick(r, SKIN);
  const skinShade = shade(skin, -0.12);
  const age = r();
  const hairColor = age > 0.82 ? pick(r, ['#8d8a86', '#d9d4cc']) : pick(r, HAIR.slice(0, 7));
  const coat = COAT[s.traitKeys?.coat] ?? '#2a2c31';
  const nervous = mood === 'nervous';

  const headRx = 19 + r() * 4;
  const headRy = 24 + r() * 4;
  const square = r() < 0.4;
  const hairStyle = fem
    ? pick(r, ['bob', 'long', 'bun', 'waves', 'pixie', 'curly'] as const)
    : pick(r, ['short', 'side', 'bald', 'slick', 'curly', 'longm'] as const);
  const hat = r() < 0.28 ? (fem ? pick(r, ['cloche', 'beret', 'fedora'] as const) : pick(r, ['fedora', 'fedora', 'beret'] as const)) : null;
  const glasses = r() < 0.22;
  const facial = fem ? null : r() < 0.42 ? pick(r, ['mustache', 'beard', 'stubble', 'pencil'] as const) : null;
  const lipstick = fem && r() < 0.45;
  const neckwear = fem ? pick(r, ['pearls', 'scarf', 'none'] as const) : pick(r, ['tie', 'bow', 'none'] as const);
  const habit = s.traitKeys?.habit;

  const cx = 60;
  const cy = 60;
  const eyeY = cy - 2;
  const pupilDx = nervous ? 2.2 : 0;
  const parts: string[] = [];

  // Backdrop: dark, with a glow in the suspect's colour.
  parts.push(`<defs>
    <radialGradient id="g" cx="0.3" cy="0.25" r="0.9"><stop offset="0" stop-color="${s.color}" stop-opacity="0.55"/><stop offset="0.6" stop-color="#151a24" stop-opacity="1"/><stop offset="1" stop-color="#0b0d12"/></radialGradient>
    <linearGradient id="l" x1="0" x2="1"><stop offset="0.35" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.38"/></linearGradient>
  </defs>
  <rect width="120" height="140" fill="url(#g)"/>`);

  // Hair that falls behind the shoulders
  if (hairStyle === 'long' || hairStyle === 'curly') {
    parts.push(`<path d="M${cx - 27} ${cy - 10} C ${cx - 34} ${cy + 30}, ${cx - 30} ${cy + 52}, ${cx - 22} ${cy + 58} L ${cx + 22} ${cy + 58} C ${cx + 30} ${cy + 52}, ${cx + 34} ${cy + 30}, ${cx + 27} ${cy - 10} Z" fill="${hairColor}"/>`);
  }

  // Shoulders, coat, lapels and shirt
  parts.push(`<path d="M6 140 C 8 110, 28 97, 60 95 C 92 97, 112 110, 114 140 Z" fill="${coat}"/>`);
  parts.push(`<path d="M44 97 L 60 132 L 52 140 L 34 140 C 34 120, 38 104, 44 97 Z" fill="${shade(coat, -0.08)}"/>`);
  parts.push(`<path d="M76 97 L 60 132 L 68 140 L 86 140 C 86 120, 82 104, 76 97 Z" fill="${shade(coat, -0.08)}"/>`);
  parts.push(`<path d="M48 96 L 60 124 L 72 96 Z" fill="#ece6da"/>`);
  if (neckwear === 'tie') parts.push(`<path d="M57 100 L 63 100 L 64 118 L 60 124 L 56 118 Z" fill="${shade(s.color, -0.25)}"/>`);
  if (neckwear === 'bow') parts.push(`<path d="M52 99 L 60 102 L 68 99 L 68 106 L 60 103 L 52 106 Z" fill="#1a1a1a"/>`);
  if (neckwear === 'scarf') parts.push(`<path d="M46 95 C 52 104, 68 104, 74 95 L 72 101 C 66 108, 54 108, 48 101 Z" fill="${shade(s.color, -0.1)}"/>`);
  if (neckwear === 'pearls') parts.push(Array.from({ length: 9 }, (_, i) => `<circle cx="${50 + i * 2.5}" cy="${101 + Math.sin((i / 8) * Math.PI) * 4}" r="1.3" fill="#f4efe6"/>`).join(''));

  // Habit details, matching the case file
  if (habit === 'lavender') parts.push(`<path d="M84 106 l 4 -10" stroke="#5b7a3a" stroke-width="1.2"/>${[0, 1, 2, 3].map(i => `<circle cx="${85.5 + i * 0.9}" cy="${103 - i * 2.4}" r="1.4" fill="#a98bd8"/>`).join('')}`);
  if (habit === 'ink') parts.push(`<rect x="82" y="103" width="2.4" height="10" rx="1" fill="#1d3f7a"/><rect x="82" y="102" width="2.4" height="2" fill="#c9a24a"/>`);
  if (habit === 'cat') parts.push([0, 1, 2, 3, 4].map(i => `<path d="M${30 + i * 13} ${112 + (i % 2) * 9} q 3 -2 6 0" stroke="#f1f1f1" stroke-width="0.6" fill="none" opacity="0.8"/>`).join(''));
  if (habit === 'mint') parts.push(`<circle cx="84" cy="108" r="2.6" fill="#fff"/><path d="M82 108 a 2.6 2.6 0 0 1 4 -2" stroke="#d33" stroke-width="1" fill="none"/>`);

  // Neck and head
  parts.push(`<rect x="${cx - 8}" y="${cy + 16}" width="16" height="20" rx="4" fill="${skinShade}"/>`);
  parts.push(`<ellipse cx="${cx - headRx + 1}" cy="${cy + 2}" rx="3.2" ry="5" fill="${skinShade}"/><ellipse cx="${cx + headRx - 1}" cy="${cy + 2}" rx="3.2" ry="5" fill="${skinShade}"/>`);
  parts.push(
    square
      ? `<path d="M${cx - headRx} ${cy - 6} C ${cx - headRx} ${cy - headRy - 2}, ${cx + headRx} ${cy - headRy - 2}, ${cx + headRx} ${cy - 6} L ${cx + headRx - 2} ${cy + 12} C ${cx + headRx - 6} ${cy + headRy - 2}, ${cx - headRx + 6} ${cy + headRy - 2}, ${cx - headRx + 2} ${cy + 12} Z" fill="${skin}"/>`
      : `<ellipse cx="${cx}" cy="${cy}" rx="${headRx}" ry="${headRy}" fill="${skin}"/>`
  );
  if (nervous) parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${headRx}" ry="${headRy}" fill="#ffffff" opacity="0.07"/>`);
  if (facial === 'stubble' || facial === 'beard') {
    parts.push(`<path d="M${cx - headRx + 3} ${cy + 6} C ${cx - headRx + 6} ${cy + headRy + (facial === 'beard' ? 6 : 0)}, ${cx + headRx - 6} ${cy + headRy + (facial === 'beard' ? 6 : 0)}, ${cx + headRx - 3} ${cy + 6} C ${cx + 8} ${cy + 14}, ${cx - 8} ${cy + 14}, ${cx - headRx + 3} ${cy + 6} Z" fill="${hairColor}" opacity="${facial === 'beard' ? 0.95 : 0.35}"/>`);
  }

  // Hair on top
  const top = cy - headRy;
  switch (hairStyle) {
    case 'short':
      parts.push(`<path d="M${cx - headRx - 1} ${cy - 4} C ${cx - headRx - 2} ${top - 6}, ${cx + headRx + 2} ${top - 6}, ${cx + headRx + 1} ${cy - 4} C ${cx + 10} ${top + 6}, ${cx - 10} ${top + 6}, ${cx - headRx - 1} ${cy - 4} Z" fill="${hairColor}"/>`);
      break;
    case 'side':
      parts.push(`<path d="M${cx - headRx - 1} ${cy - 2} C ${cx - headRx - 4} ${top - 8}, ${cx + headRx + 4} ${top - 10}, ${cx + headRx + 1} ${cy - 6} C ${cx + 6} ${top + 2}, ${cx - 6} ${top + 10}, ${cx - headRx - 1} ${cy - 2} Z" fill="${hairColor}"/><path d="M${cx - 6} ${top - 1} q 10 -2 20 6" stroke="${shade(hairColor, 0.15)}" stroke-width="1" fill="none"/>`);
      break;
    case 'bald':
      parts.push(`<path d="M${cx - headRx} ${cy - 2} C ${cx - headRx - 1} ${cy - 12}, ${cx - headRx + 4} ${cy - 16}, ${cx - headRx + 6} ${cy - 14} L ${cx - headRx + 4} ${cy + 2} Z M${cx + headRx} ${cy - 2} C ${cx + headRx + 1} ${cy - 12}, ${cx + headRx - 4} ${cy - 16}, ${cx + headRx - 6} ${cy - 14} L ${cx + headRx - 4} ${cy + 2} Z" fill="${hairColor}"/>`);
      break;
    case 'slick':
      parts.push(`<path d="M${cx - headRx} ${cy - 6} C ${cx - headRx} ${top - 6}, ${cx + headRx} ${top - 6}, ${cx + headRx} ${cy - 6} C ${cx + 12} ${top + 4}, ${cx - 12} ${top + 4}, ${cx - headRx} ${cy - 6} Z" fill="${hairColor}"/><path d="M${cx - 12} ${top} q 12 -3 24 0" stroke="${shade(hairColor, 0.25)}" stroke-width="1.2" fill="none"/>`);
      break;
    case 'curly':
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        parts.push(`<circle cx="${cx + Math.cos(a) * (headRx + 1)}" cy="${cy - 6 + Math.sin(a) * (headRy - 2)}" r="${7 + (i % 2)}" fill="${hairColor}"/>`);
      }
      break;
    case 'longm':
      parts.push(`<path d="M${cx - headRx - 2} ${cy + 14} C ${cx - headRx - 6} ${top - 4}, ${cx + headRx + 6} ${top - 4}, ${cx + headRx + 2} ${cy + 14} L ${cx + headRx - 3} ${cy - 4} C ${cx + 8} ${top + 6}, ${cx - 8} ${top + 6}, ${cx - headRx + 3} ${cy - 4} Z" fill="${hairColor}"/>`);
      break;
    case 'bob':
      parts.push(`<path d="M${cx - headRx - 3} ${cy + 14} C ${cx - headRx - 6} ${top - 6}, ${cx + headRx + 6} ${top - 6}, ${cx + headRx + 3} ${cy + 14} L ${cx + headRx - 2} ${cy + 12} C ${cx + headRx - 4} ${cy - 10}, ${cx - 6} ${top + 4}, ${cx - headRx + 2} ${cy + 12} Z" fill="${hairColor}"/>`);
      break;
    case 'long':
      parts.push(`<path d="M${cx - headRx - 2} ${cy + 4} C ${cx - headRx - 4} ${top - 6}, ${cx + headRx + 4} ${top - 6}, ${cx + headRx + 2} ${cy + 4} C ${cx + 8} ${top + 4}, ${cx - 14} ${top + 8}, ${cx - headRx - 2} ${cy + 4} Z" fill="${hairColor}"/>`);
      break;
    case 'bun':
      parts.push(`<circle cx="${cx}" cy="${top - 4}" r="8" fill="${hairColor}"/><path d="M${cx - headRx - 1} ${cy - 2} C ${cx - headRx - 2} ${top - 4}, ${cx + headRx + 2} ${top - 4}, ${cx + headRx + 1} ${cy - 2} C ${cx + 8} ${top + 6}, ${cx - 8} ${top + 6}, ${cx - headRx - 1} ${cy - 2} Z" fill="${hairColor}"/>`);
      break;
    case 'waves':
      parts.push(`<path d="M${cx - headRx - 2} ${cy + 6} C ${cx - headRx - 4} ${top - 6}, ${cx + headRx + 4} ${top - 6}, ${cx + headRx + 2} ${cy + 6} C ${cx + headRx - 4} ${cy - 4}, ${cx + 4} ${top + 8}, ${cx - 2} ${top + 4} C ${cx - 10} ${top + 10}, ${cx - headRx + 2} ${cy - 2}, ${cx - headRx - 2} ${cy + 6} Z" fill="${hairColor}"/><path d="M${cx - 14} ${top + 2} q 4 4 8 0 q 4 -4 8 0 q 4 4 8 0" stroke="${shade(hairColor, 0.2)}" stroke-width="1" fill="none"/>`);
      break;
    case 'pixie':
      parts.push(`<path d="M${cx - headRx - 1} ${cy - 2} C ${cx - headRx - 3} ${top - 6}, ${cx + headRx + 3} ${top - 6}, ${cx + headRx + 1} ${cy - 4} L ${cx + 6} ${top + 7} L ${cx - 2} ${top + 10} L ${cx - 10} ${top + 7} Z" fill="${hairColor}"/>`);
      break;
  }

  // Hats
  if (hat === 'fedora') {
    parts.push(`<ellipse cx="${cx}" cy="${top + 6}" rx="${headRx + 14}" ry="5" fill="#16171b"/><path d="M${cx - headRx + 1} ${top + 6} C ${cx - headRx + 2} ${top - 14}, ${cx + headRx - 2} ${top - 14}, ${cx + headRx - 1} ${top + 6} Z" fill="#1d1f24"/><rect x="${cx - headRx + 1}" y="${top}" width="${headRx * 2 - 2}" height="4" fill="${shade(s.color, -0.2)}"/>`);
  } else if (hat === 'cloche') {
    parts.push(`<path d="M${cx - headRx - 4} ${cy - 2} C ${cx - headRx - 4} ${top - 12}, ${cx + headRx + 4} ${top - 12}, ${cx + headRx + 4} ${cy - 2} C ${cx + 8} ${cy - 8}, ${cx - 8} ${cy - 8}, ${cx - headRx - 4} ${cy - 2} Z" fill="${shade(s.color, -0.3)}"/><path d="M${cx - headRx} ${cy - 9} q ${headRx} -6 ${headRx * 2} 0" stroke="${shade(s.color, 0.1)}" stroke-width="2" fill="none"/>`);
  } else if (hat === 'beret') {
    parts.push(`<ellipse cx="${cx + 4}" cy="${top + 2}" rx="${headRx + 4}" ry="8" fill="${shade(s.color, -0.35)}"/>`);
  }

  // Brows, eyes, nose, mouth
  const browY = eyeY - 7;
  const browTilt = nervous ? 3 : 0;
  parts.push(`<path d="M${cx - 14} ${browY + browTilt} L ${cx - 5} ${browY - (nervous ? 2 : 0)}" stroke="${shade(hairColor, -0.1)}" stroke-width="2" stroke-linecap="round"/><path d="M${cx + 5} ${browY - (nervous ? 2 : 0)} L ${cx + 14} ${browY + browTilt}" stroke="${shade(hairColor, -0.1)}" stroke-width="2" stroke-linecap="round"/>`);
  for (const ex of [cx - 9, cx + 9]) {
    parts.push(`<ellipse cx="${ex}" cy="${eyeY}" rx="4.2" ry="${nervous ? 3 : 2.4}" fill="#f4efe6"/><circle cx="${ex + pupilDx}" cy="${eyeY}" r="1.7" fill="#1a1410"/>`);
    if (!nervous) parts.push(`<path d="M${ex - 4.4} ${eyeY - 1} q 4.4 -2.6 8.8 0" stroke="${skinShade}" stroke-width="1.4" fill="none"/>`);
  }
  if (glasses) parts.push(`<circle cx="${cx - 9}" cy="${eyeY}" r="6" fill="none" stroke="#c9a24a" stroke-width="1"/><circle cx="${cx + 9}" cy="${eyeY}" r="6" fill="none" stroke="#c9a24a" stroke-width="1"/><path d="M${cx - 3} ${eyeY} h 6" stroke="#c9a24a" stroke-width="1"/>`);
  parts.push(`<path d="M${cx} ${eyeY + 3} L ${cx - 2.5} ${eyeY + 11} Q ${cx} ${eyeY + 12.5} ${cx + 2} ${eyeY + 11.5}" stroke="${skinShade}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`);
  const mouthY = eyeY + 18;
  const mouthColor = lipstick ? '#9e2a2f' : shade(skin, -0.3);
  parts.push(
    nervous
      ? `<path d="M${cx - 7} ${mouthY} q 2 -2 3.5 0 t 3.5 0 t 3.5 0 t 3.5 0" stroke="${mouthColor}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
      : `<path d="M${cx - 7} ${mouthY} q 7 ${lipstick ? 2.4 : 1.4} 14 0" stroke="${mouthColor}" stroke-width="${lipstick ? 2.6 : 1.8}" fill="none" stroke-linecap="round"/>`
  );
  if (facial === 'mustache') parts.push(`<path d="M${cx - 9} ${mouthY - 3} C ${cx - 5} ${mouthY - 7}, ${cx - 1} ${mouthY - 5}, ${cx} ${mouthY - 4} C ${cx + 1} ${mouthY - 5}, ${cx + 5} ${mouthY - 7}, ${cx + 9} ${mouthY - 3} C ${cx + 4} ${mouthY - 3.5}, ${cx - 4} ${mouthY - 3.5}, ${cx - 9} ${mouthY - 3} Z" fill="${hairColor}"/>`);
  if (facial === 'pencil') parts.push(`<path d="M${cx - 7} ${mouthY - 3.2} q 7 -1.6 14 0" stroke="${hairColor}" stroke-width="1.3" fill="none"/>`);
  if (habit === 'cigar') {
    parts.push(`<rect x="${cx + 5}" y="${mouthY - 1.5}" width="15" height="3.4" rx="1.4" fill="#6b4226" transform="rotate(12 ${cx + 5} ${mouthY})"/><circle cx="${cx + 19.5}" cy="${mouthY + 3}" r="1.6" fill="#ff7a3a"/><path d="M${cx + 21} ${mouthY} c 3 -5 -2 -8 2 -14 c 3 -4 -1 -7 2 -11" stroke="#cfd6df" stroke-width="1" fill="none" opacity="0.45"/>`);
  }
  if (nervous) parts.push(`<path d="M${cx + headRx - 4} ${eyeY - 9} q 2.4 4 0 6.4 q -2.4 -2.4 0 -6.4 Z" fill="#bfe3ff" opacity="0.9"/>`);

  // Light from the left, shadow to the right, like a desk lamp in an interview room.
  parts.push(`<rect width="120" height="140" fill="url(#l)"/>`);

  // An explicit pixel size so canvas drawing (the board) decodes it predictably.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="280" viewBox="0 0 120 140">${parts.join('')}</svg>`;
}

const cache = new Map<string, string>();

export function portraitUrl(s: Pick<Suspect, 'name' | 'color' | 'look' | 'traitKeys'>, mood: Mood): string {
  const key = `${s.name}|${s.traitKeys?.coat}|${s.traitKeys?.habit}|${s.color}|${mood}`;
  let url = cache.get(key);
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(portraitSvg(s, mood))}`;
    cache.set(key, url);
  }
  return url;
}

export const Portrait: React.FC<{ suspect: Suspect; mood?: Mood; size?: number; rounded?: boolean; className?: string }> = ({
  suspect, mood = 'calm', size = 48, rounded, className = '',
}) => {
  const src = useMemo(() => portraitUrl(suspect, mood), [suspect, mood]);
  return (
    <img
      src={src}
      // Decorative: the suspect's name is always shown right beside the portrait.
      alt=""
      aria-hidden
      width={size}
      height={rounded ? size : Math.round(size * (140 / 120))}
      className={`shrink-0 object-cover ${rounded ? 'rounded-full object-[50%_30%]' : 'rounded-sm'} ${className}`}
      style={{ width: size, height: rounded ? size : Math.round(size * (140 / 120)), border: rounded ? `1.5px solid ${suspect.color}88` : undefined }}
      draggable={false}
    />
  );
};
