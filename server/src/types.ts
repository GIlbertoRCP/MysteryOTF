export type Role = 'lead' | 'analyst';
export type Lang = 'en' | 'es';
export type Difficulty = 'Novice' | 'Detective' | 'Mastermind';
export type ThemeKey = 'gothic' | 'cyber' | 'opera' | 'casino' | 'express' | 'hacienda' | 'studio' | 'arctic' | 'carnival';

export type TraitDim = 'height' | 'coat' | 'voice' | 'hand' | 'footwear' | 'habit' | 'blood';

export type EvidenceKind =
  | 'witness'
  | 'camera'
  | 'record'
  | 'document'
  | 'diary'
  | 'autopsy'
  | 'smudge'
  | 'shoeprint'
  | 'trace'
  | 'phone'
  | 'scrapings'
  | 'receipt'
  | 'sighting'
  | 'planted'
  | 'claim'
  | 'weapon';

// ─── What clients receive (already localized, never contains the solution) ───

export interface PublicSuspect {
  id: string;
  name: string;
  role: string;
  age: number;
  color: string;
  bio: string;
  alibiPlace: string;
  alibiRoomId: string;
  /** Styling hint for the drawn portrait */
  look: 'f' | 'm';
  alibiStatement: string;
  traits: Record<TraitDim, string>;
  traitKeys: Record<TraitDim, string>;
  interview: { q: string; a: string }[];
}

export interface PublicEvidence {
  id: string;
  role: Role;
  kind: EvidenceKind;
  title: string;
  summary: string;
  details: string;
  /** When and where this clue happened, for the floor plan and timeline */
  event?: { min: number; roomId?: string; suspectId?: string };
  /** A small hands-on puzzle that reveals this clue */
  puzzle?: Puzzle;
  /** For recovered items: which object it is, and whether it was wiped after use */
  weapon?: { key: string; residue: boolean };
  /** Recovered items have to be found first, by searching this spot on the floor plan */
  spotId?: string;
  /** Alibi checks: the suspects this record vouches for */
  confirms?: string[];
  /** A 3D object to turn over in the inspector */
  model?: { type: 'watch'; min: number; engraving: string } | { type: 'monogram'; item: string; initials: string } | { type: 'letter'; seal: string };
}

export type Puzzle =
  | { type: 'hand'; answer: 'left' | 'right' }
  | { type: 'sole'; answer: string }
  | { type: 'uv'; key: string }
  | { type: 'blood'; answer: string }
  | { type: 'torn'; pieces: string[] }
  | { type: 'cipher'; shift: number };

export interface PlanRoomPublic {
  id: string;
  label: string;
  kind: 'scene' | 'room';
  x: number;
  y: number;
  w: number;
  h: number;
  door: { x: number; y: number };
  /** Minutes on foot to the crime scene */
  walk: number;
  /** Places worth searching in this room */
  spots: { id: string; label: string }[];
}

export interface PublicPlan {
  layout: 'corridor' | 'linear';
  width: number;
  height: number;
  rooms: PlanRoomPublic[];
  corridor: { x: number; y: number; w: number; h: number } | null;
}

export interface PublicMystery {
  caseId: string;
  seed: string;
  theme: ThemeKey;
  difficulty: Difficulty;
  lang: Lang;
  title: string;
  victim: {
    name: string;
    age: number;
    occupation: string;
    scene: string;
    timeWindow: string;
    windowStart: number;
    windowEnd: number;
  };
  plan: PublicPlan;
  /** A complication on this case, explained in the briefing */
  modifier: { key: 'blackout' | 'storm' | 'tampered'; label: string; note: string } | null;
  synopsis: string;
  suspects: PublicSuspect[];
  evidence: PublicEvidence[];
  options: {
    motives: { id: string; label: string }[];
    weapons: { id: string; label: string }[];
    /** Someone lied to cover for the killer and must be named too */
    accomplice: boolean;
  };
}

export interface Solution {
  killerId: string;
  motiveId: string;
  weaponId: string;
  alibiEvidenceId: string;
  accompliceId?: string;
}

// ─── Shared board state ───

export type CardKind = 'suspect' | 'evidence' | 'note';
export type StatusTag = 'prime_suspect' | 'cleared' | 'key_clue';
export type StringLabel = 'link' | 'motive' | 'weapon' | 'contradiction' | 'alibi';

export interface BoardCard {
  id: string;
  kind: CardKind;
  refId: string;
  text?: string;
  x: number;
  y: number;
  rotation: number;
  placedBy: string;
  statusTag?: StatusTag;
}

export interface BoardString {
  id: string;
  fromCardId: string;
  toCardId: string;
  label: StringLabel;
  createdBy: string;
}

export interface Player {
  /** Stable per browser, so a reconnect gets the same seat back */
  id: string;
  socketId: string;
  name: string;
  role: Role;
  lang: Lang;
  /** False while the player is briefly disconnected and their seat is being held */
  connected: boolean;
}

export const CHAT_PHRASES = [
  'need_info', 'found_something', 'ready', 'agree', 'disagree', 'look_at', 'suspicious', 'innocent', 'quote',
] as const;
/** Lines only the scripted assistant sends */
export const BOT_PHRASES = ['bot_hello', 'bot_lab_ready', 'bot_look', 'bot_tip', 'bot_wrong', 'bot_lab_idle'] as const;
export type ChatPhraseKey = (typeof CHAT_PHRASES)[number];

export interface ChatMessage {
  id: string;
  sender: string;
  role: Role;
  /** Free text, shown as typed */
  text?: string;
  /** A canned phrase each client renders in its own language */
  phrase?: { key: ChatPhraseKey | (typeof BOT_PHRASES)[number]; ref?: string; index?: number };
  bot?: boolean;
  at: number;
}

export type CaseStatus = 'active' | 'solved' | 'failed';
export type GameMode = 'duo' | 'solo';

export interface LabState {
  unlocked: string[];
  running: { id: string; readyAt: number } | null;
}

export interface PublicRoom {
  roomCode: string;
  players: Player[];
  cards: Record<string, BoardCard>;
  strings: Record<string, BoardString>;
  chat: ChatMessage[];
  createdAt: number;
  status: CaseStatus;
  attemptsUsed: number;
  maxAttempts: number;
  mode: GameMode;
  assistant: boolean;
  tutorial: boolean;
  daily: string | null;
  lab: LabState | null;
  hintsUsed: number;
  maxHints: number;
  score: number | null;
  finishedAt: number | null;
  /** Confrontations that went nowhere; each costs points */
  wastedConfronts: number;
}

/** A clue presented to a suspect, and how they reacted (in the reader's language). */
export interface ConfrontEntry {
  suspectId: string;
  evidenceId: string;
  by: string;
  kind: 'admit' | 'cleared' | 'confess' | 'slip' | 'deflect';
  cracked: boolean;
  line: string;
  /** A question unlocked by cracking them, with its answer */
  followUp?: { q: string; a: string };
  at: number;
}

/** A spot searched on the floor plan, shared by both players. */
export interface SearchEntry {
  spotId: string;
  by: string;
  text: string;
  found: string[];
  at: number;
}

export interface AccusationSubmission {
  suspectId: string;
  motiveId: string;
  weaponId: string;
  alibiEvidenceId: string;
  accompliceId?: string;
}

export interface AccusationResult {
  by: string;
  correctCount: number;
  total: number;
  status: CaseStatus;
  attemptsUsed: number;
  maxAttempts: number;
  solution?: Solution;
  explanation?: string;
  score?: number;
  elapsedMs?: number;
  hintsUsed: number;
  /** Once the case is closed: what really happened, in order */
  story?: { min: number; text: string }[];
  wastedConfronts?: number;
  spotsSearched?: number;
  /** What was accused, so both players can watch it play out */
  submission?: AccusationSubmission;
  /** Innocents the killer tried to pin it on (planted item or a pointed finger) */
  framedIds?: string[];
}
