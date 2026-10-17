import { BoardCard, CardKind } from './types';

export const CARD_SIZE: Record<CardKind, { w: number; h: number }> = {
  suspect: { w: 180, h: 228 },
  evidence: { w: 196, h: 150 },
  note: { w: 160, h: 120 },
};

export const QUESTION_IDS = ['q-killer', 'q-motive', 'q-weapon', 'q-alibi'] as const;
export type QuestionId = (typeof QUESTION_IDS)[number];
export const QUESTION_SIZE = { w: 220, h: 70 };

export function questionPos(id: QuestionId) {
  const i = QUESTION_IDS.indexOf(id);
  return { x: 40 + i * 260, y: 34 };
}

/** Where a string attaches to a card (the push pin). */
export function pinPoint(card: BoardCard | undefined, id: string) {
  if (!card) {
    const q = questionPos(id as QuestionId);
    return { x: q.x + QUESTION_SIZE.w / 2, y: q.y + 10 };
  }
  const { w } = CARD_SIZE[card.kind];
  return { x: card.x + w / 2, y: card.y + 12 };
}

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Finds a spot near `near` where a card of `kind` doesn't cover another card. */
export function findFreeSpot(cards: BoardCard[], kind: CardKind, near: { x: number; y: number }) {
  const size = CARD_SIZE[kind];
  const boxes = [
    ...cards.map(c => ({ x: c.x - 12, y: c.y - 12, w: CARD_SIZE[c.kind].w + 24, h: CARD_SIZE[c.kind].h + 24 })),
    ...QUESTION_IDS.map(q => ({ ...questionPos(q), ...QUESTION_SIZE })),
  ];
  const start = { x: near.x - size.w / 2, y: near.y - size.h / 2 };
  for (let ring = 0; ring < 30; ring++) {
    const steps = Math.max(1, ring * 8);
    for (let s = 0; s < steps; s++) {
      const angle = (s / steps) * Math.PI * 2;
      const candidate = {
        x: Math.round(start.x + Math.cos(angle) * ring * 70),
        y: Math.round(start.y + Math.sin(angle) * ring * 60),
        ...size,
      };
      if (!boxes.some(b => overlaps(candidate, b))) return { x: candidate.x, y: candidate.y };
    }
  }
  return start;
}

/** Arranges the board: questions on top, suspects below, then each player's files, then notes. */
export function tidyPositions(cards: BoardCard[], roleOf: (card: BoardCard) => string | undefined) {
  const out: Record<string, { x: number; y: number }> = {};
  let y = 150;
  const row = (list: BoardCard[], step: number, perRow: number) => {
    if (!list.length) return;
    list.forEach((c, i) => {
      out[c.id] = { x: 40 + (i % perRow) * step, y: y + Math.floor(i / perRow) * (CARD_SIZE[c.kind].h + 40) };
    });
    y += Math.ceil(list.length / perRow) * (CARD_SIZE[list[0].kind].h + 40) + 20;
  };
  row(cards.filter(c => c.kind === 'suspect'), 205, 6);
  row(cards.filter(c => c.kind === 'evidence' && roleOf(c) === 'lead'), 220, 5);
  row(cards.filter(c => c.kind === 'evidence' && roleOf(c) === 'analyst'), 220, 5);
  row(cards.filter(c => c.kind === 'note'), 185, 6);
  return out;
}
