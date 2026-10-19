import { ConfrontEntry, Evidence } from './types';

export type AlibiStatus = 'confirmed' | 'broken' | 'disputed' | null;

/**
 * What the board currently says about each suspect's alibi, from clues the team has pinned
 * and how suspects reacted when confronted. Only uses what players have already seen.
 */
export function alibiStatuses(pinned: Evidence[], confrontations: ConfrontEntry[]): Record<string, AlibiStatus> {
  const out: Record<string, AlibiStatus> = {};
  const set = (id: string | undefined, s: AlibiStatus) => {
    if (!id) return;
    // A broken alibi outranks everything; a confirmation outranks a dispute.
    const cur = out[id];
    if (cur === 'broken') return;
    if (cur === 'confirmed' && s === 'disputed') return;
    out[id] = s;
  };
  for (const e of pinned) {
    if (e.kind === 'claim') set(e.event?.suspectId, 'disputed');
  }
  for (const e of pinned) {
    if (e.kind === 'record') e.confirms?.forEach(id => set(id, 'confirmed'));
    if (e.kind === 'sighting') set(e.event?.suspectId, 'confirmed');
  }
  for (const c of confrontations) {
    if (c.kind === 'cleared') set(c.suspectId, 'confirmed');
  }
  for (const e of pinned) {
    if (e.kind === 'receipt') set(e.event?.suspectId, 'broken');
  }
  for (const c of confrontations) {
    if (c.kind === 'confess') set(c.suspectId, 'broken');
  }
  return out;
}

/** 0–100: rises with every clue thrown at a suspect, and spikes when one hits. */
export function stressFor(suspectId: string, confrontations: ConfrontEntry[]): number {
  let s = 12;
  for (const c of confrontations) {
    if (c.suspectId !== suspectId) continue;
    s += c.cracked ? (c.kind === 'cleared' ? -20 : 45) : 14;
  }
  return Math.max(5, Math.min(100, s));
}
