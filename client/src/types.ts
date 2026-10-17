// Mirrors server/src/types.ts (the public parts only).

export type Role = 'lead' | 'analyst';
export type Lang = 'en' | 'es';
export type Difficulty = 'Novice' | 'Detective' | 'Mastermind';
export type ThemeKey = 'gothic' | 'cyber' | 'opera' | 'casino' | 'express' | 'hacienda';
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
  | 'weapon';

export interface Suspect {
  id: string;
  name: string;
  role: string;
  age: number;
  color: string;
  bio: string;
  alibiPlace: string;
  alibiStatement: string;
  traits: Record<TraitDim, string>;
  traitKeys: Record<TraitDim, string>;
  interview: { q: string; a: string }[];
}

export interface Evidence {
  id: string;
  role: Role;
  kind: EvidenceKind;
  title: string;
  summary: string;
  details: string;
}

export interface Mystery {
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
  };
  synopsis: string;
  suspects: Suspect[];
  evidence: Evidence[];
  options: {
    motives: { id: string; label: string }[];
    weapons: { id: string; label: string }[];
  };
}

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
  socketId: string;
  name: string;
  role: Role;
  lang: Lang;
}

export type ChatPhraseKey =
  | 'need_info'
  | 'found_something'
  | 'ready'
  | 'agree'
  | 'disagree'
  | 'look_at'
  | 'suspicious'
  | 'innocent'
  | 'quote';

export type BotPhraseKey = 'bot_hello' | 'bot_lab_ready' | 'bot_look' | 'bot_tip' | 'bot_wrong' | 'bot_lab_idle';

export interface ChatMessage {
  id: string;
  sender: string;
  role: Role;
  text?: string;
  phrase?: { key: ChatPhraseKey | BotPhraseKey; ref?: string; index?: number };
  bot?: boolean;
  at: number;
}

export type CaseStatus = 'active' | 'solved' | 'failed';
export type GameMode = 'duo' | 'solo';

export interface LabState {
  unlocked: string[];
  running: { id: string; readyAt: number } | null;
}

export interface Room {
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
}

export interface AccusationSubmission {
  suspectId: string;
  motiveId: string;
  weaponId: string;
  alibiEvidenceId: string;
}

export interface AccusationResult {
  by: string;
  correctCount: number;
  status: CaseStatus;
  attemptsUsed: number;
  maxAttempts: number;
  solution?: {
    killerId: string;
    motiveId: string;
    weaponId: string;
    alibiEvidenceId: string;
  };
  explanation?: string;
  score?: number;
  elapsedMs?: number;
  hintsUsed: number;
}

export type BoardStyle = 'mindplace' | 'corkboard' | 'blackboard' | 'blueprint';
