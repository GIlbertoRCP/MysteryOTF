import {
  BOT_PHRASES, GameMode, LabState, CHAT_PHRASES, AccusationResult, AccusationSubmission, BoardCard, BoardString, CaseStatus, ChatMessage, Difficulty, Lang,
  Player, PublicMystery, PublicRoom, Role, StatusTag, StringLabel, ThemeKey,
} from './types.js';
import { Blueprint, buildBlueprint, dailyCase, explainSolution, hintsFor, localize, randomSeed, THEME_KEYS } from './mysteryEngine.js';

const MAX_ATTEMPTS = 3;
const MAX_CHAT = 200;
const STATUS_TAGS: StatusTag[] = ['prime_suspect', 'cleared', 'key_clue'];
const STRING_LABELS: StringLabel[] = ['link', 'motive', 'weapon', 'contradiction', 'alibi'];
const MAX_HINTS = 4;
/** In solo games these lab results have to be requested and take time. */
export const LAB_KINDS = ['autopsy', 'weapon', 'smudge', 'shoeprint', 'trace', 'scrapings'];
const LAB_SECONDS: Record<Difficulty, number> = { Novice: 10, Detective: 18, Mastermind: 28 };

export function computeScore(elapsedMs: number, wrongAttempts: number, hintsUsed: number): number {
  const overtime = Math.max(0, elapsedMs / 1000 - 300); // the first five minutes are free
  const raw = 1000 - wrongAttempts * 200 - hintsUsed * 100 - Math.floor(overtime / 10) * 2;
  return Math.max(50, Math.round(raw));
}

interface Room {
  code: string;
  blueprint: Blueprint;
  mysteries: Partial<Record<Lang, PublicMystery>>;
  players: Record<string, Player>;
  cards: Record<string, BoardCard>;
  strings: Record<string, BoardString>;
  chat: ChatMessage[];
  createdAt: number;
  lastActiveAt: number;
  status: CaseStatus;
  attemptsUsed: number;
  mode: GameMode;
  assistant: boolean;
  tutorial: boolean;
  daily: string | null;
  lab: LabState | null;
  labTimer?: ReturnType<typeof setTimeout>;
  hintsUsed: number;
  score: number | null;
  finishedAt: number | null;
  nudges: number;
}

export interface CreateOptions {
  theme?: ThemeKey;
  difficulty?: Difficulty;
  seed?: string;
  mode?: GameMode;
  assistant?: boolean;
  tutorial?: boolean;
  /** YYYY-MM-DD in the player's own time zone */
  daily?: string;
}

const clampNum = (n: unknown, min: number, max: number) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : 0;
const cleanText = (s: unknown, max: number) => (typeof s === 'string' ? s.trim().slice(0, max) : '');

class RoomManager {
  private rooms: Record<string, Room> = {};

  private newCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    } while (this.rooms[code]);
    return code;
  }

  createRoom(opts: CreateOptions): Room {
    let theme = opts.theme && THEME_KEYS.includes(opts.theme) ? opts.theme : 'gothic';
    let difficulty: Difficulty = opts.difficulty && ['Novice', 'Detective', 'Mastermind'].includes(opts.difficulty) ? opts.difficulty : 'Detective';
    let seed = cleanText(opts.seed, 40).toUpperCase() || randomSeed();
    const daily = typeof opts.daily === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(opts.daily) ? opts.daily : null;
    const tutorial = opts.tutorial === true;
    if (daily) ({ seed, theme, difficulty } = dailyCase(daily));
    if (tutorial) {
      seed = 'TUTORIAL-1';
      theme = 'gothic';
      difficulty = 'Novice';
    }
    const mode: GameMode = tutorial || opts.mode === 'solo' ? 'solo' : 'duo';
    const blueprint = buildBlueprint(difficulty, theme, seed);

    const room: Room = {
      code: this.newCode(),
      blueprint,
      mysteries: {},
      players: {},
      cards: {},
      strings: {},
      chat: [],
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      status: 'active',
      attemptsUsed: 0,
      mode,
      assistant: mode === 'solo' && !tutorial && opts.assistant === true,
      tutorial,
      daily,
      lab: mode === 'solo' ? { unlocked: [], running: null } : null,
      hintsUsed: 0,
      score: null,
      finishedAt: null,
      nudges: 0,
    };

    // Suspects start pinned in a row under the four case questions.
    blueprint.suspects.forEach((s, i) => {
      const id = `card-${s.id}`;
      room.cards[id] = {
        id,
        kind: 'suspect',
        refId: s.id,
        x: 40 + i * 205,
        y: 150,
        rotation: (Math.random() - 0.5) * 6,
        placedBy: 'system',
      };
    });

    this.rooms[room.code] = room;
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms[(code || '').toUpperCase()];
  }

  getMystery(room: Room, lang: Lang): PublicMystery {
    if (!room.mysteries[lang]) room.mysteries[lang] = localize(room.blueprint, lang);
    return room.mysteries[lang]!;
  }

  /** Solo cases have room for exactly one detective. */
  isFull(room: Room): boolean {
    return room.mode === 'solo' && Object.keys(room.players).length >= 1;
  }

  addPlayer(room: Room, socketId: string, name: string, wantedRole: Role, lang: Lang): Player {
    if (room.mode === 'solo') wantedRole = 'lead';
    const taken = Object.values(room.players).map(p => p.role);
    let role: Role = wantedRole === 'analyst' ? 'analyst' : 'lead';
    if (taken.includes(role)) {
      const other: Role = role === 'lead' ? 'analyst' : 'lead';
      if (!taken.includes(other)) role = other;
    }
    const player: Player = {
      socketId,
      name: cleanText(name, 24) || (role === 'lead' ? 'Detective' : 'Analyst'),
      role,
      lang: lang === 'es' ? 'es' : 'en',
    };
    room.players[socketId] = player;
    room.lastActiveAt = Date.now();
    return player;
  }

  setLang(room: Room, socketId: string, lang: Lang) {
    const p = room.players[socketId];
    if (p) p.lang = lang === 'es' ? 'es' : 'en';
  }

  removePlayer(socketId: string): Room | null {
    for (const room of Object.values(this.rooms)) {
      if (room.players[socketId]) {
        delete room.players[socketId];
        room.lastActiveAt = Date.now();
        return room;
      }
    }
    return null;
  }

  toPublic(room: Room): PublicRoom {
    return {
      roomCode: room.code,
      players: Object.values(room.players),
      cards: room.cards,
      strings: room.strings,
      chat: room.chat,
      createdAt: room.createdAt,
      status: room.status,
      attemptsUsed: room.attemptsUsed,
      maxAttempts: MAX_ATTEMPTS,
      mode: room.mode,
      assistant: room.assistant,
      tutorial: room.tutorial,
      daily: room.daily,
      lab: room.lab,
      hintsUsed: room.hintsUsed,
      maxHints: MAX_HINTS,
      score: room.score,
      finishedAt: room.finishedAt,
    };
  }

  // ─── Solo lab work ───

  isLabLocked(room: Room, evidenceId: string): boolean {
    if (!room.lab) return false;
    const ev = room.blueprint.evidence.find(e => e.id === evidenceId);
    return !!ev && ev.role === 'analyst' && LAB_KINDS.includes(ev.kind) && !room.lab.unlocked.includes(evidenceId);
  }

  /** Starts a lab test. Calls onDone when the result is ready. */
  requestLab(room: Room, evidenceId: string, onDone: () => void): boolean {
    if (!room.lab || room.lab.running || room.status !== 'active') return false;
    if (!this.isLabLocked(room, evidenceId)) return false;
    const seconds = room.tutorial ? 6 : LAB_SECONDS[room.blueprint.difficulty];
    room.lab.running = { id: evidenceId, readyAt: Date.now() + seconds * 1000 };
    room.labTimer = setTimeout(() => {
      if (!room.lab?.running) return;
      room.lab.unlocked.push(room.lab.running.id);
      room.lab.running = null;
      onDone();
    }, seconds * 1000);
    return true;
  }

  // ─── Hints ───

  revealHint(room: Room): boolean {
    if (room.hintsUsed >= MAX_HINTS || room.status !== 'active') return false;
    room.hintsUsed += 1;
    return true;
  }

  hintsFor(room: Room, lang: Lang): string[] {
    return room.hintsUsed ? hintsFor(room.blueprint, lang).slice(0, room.hintsUsed) : [];
  }

  // ─── Scripted assistant (solo, opt-in) ───

  botSay(room: Room, key: (typeof BOT_PHRASES)[number], ref?: string, index?: number): ChatMessage {
    const msg: ChatMessage = {
      id: `msg-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
      sender: 'assistant',
      role: 'analyst',
      phrase: { key, ref, index },
      bot: true,
      at: Date.now(),
    };
    room.chat.push(msg);
    return msg;
  }

  /** Points at a useful file the player hasn't put on the board yet. */
  botSuggestion(room: Room): { key: 'bot_look' | 'bot_lab_idle' | 'bot_tip'; ref?: string; index?: number } {
    const pinned = new Set(Object.values(room.cards).map(c => c.refId));
    const order = ['autopsy', 'record', 'receipt', 'sighting', 'witness', 'camera', 'phone', 'smudge', 'shoeprint', 'trace', 'scrapings', 'weapon', 'document'];
    const candidates = room.blueprint.evidence
      .filter(e => !pinned.has(e.id) && !this.isLabLocked(room, e.id))
      .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
    if (candidates.length) return { key: 'bot_look', ref: candidates[0].id };
    const locked = room.blueprint.evidence.find(e => this.isLabLocked(room, e.id));
    if (locked && !room.lab?.running) return { key: 'bot_lab_idle' };
    return { key: 'bot_tip', index: 3 };
  }

  /** Rooms where a solo player with the assistant on has gone quiet. */
  idleAssistantRooms(idleMs: number): Room[] {
    const now = Date.now();
    return Object.values(this.rooms).filter(r =>
      r.assistant && r.status === 'active' && Object.keys(r.players).length > 0 && r.nudges < 4 && now - r.lastActiveAt > idleMs);
  }

  touch(room: Room) {
    room.lastActiveAt = Date.now();
  }

  // ─── Board ───

  addCard(room: Room, raw: Partial<BoardCard>, placedBy: string): BoardCard | null {
    const kind = raw.kind;
    if (kind !== 'evidence' && kind !== 'note' && kind !== 'suspect') return null;
    const refId = cleanText(raw.refId, 40);
    if (kind === 'evidence' && !room.blueprint.evidence.some(e => e.id === refId)) return null;
    if (kind === 'evidence' && this.isLabLocked(room, refId)) return null;
    if (kind === 'suspect' && !room.blueprint.suspects.some(s => s.id === refId)) return null;
    const id = kind === 'note' ? `note-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}` : `card-${refId}`;
    if (room.cards[id]) return null;

    const card: BoardCard = {
      id,
      kind,
      refId: kind === 'note' ? id : refId,
      text: kind === 'note' ? cleanText(raw.text, 160) : undefined,
      x: clampNum(raw.x, -4000, 6000),
      y: clampNum(raw.y, -4000, 6000),
      rotation: clampNum(raw.rotation, -8, 8),
      placedBy: cleanText(placedBy, 24),
    };
    if (kind === 'note' && !card.text) return null;
    room.cards[id] = card;
    room.lastActiveAt = Date.now();
    return card;
  }

  moveCard(room: Room, cardId: string, x: number, y: number): boolean {
    const card = room.cards[cardId];
    if (!card) return false;
    card.x = clampNum(x, -4000, 6000);
    card.y = clampNum(y, -4000, 6000);
    return true;
  }

  tagCard(room: Room, cardId: string, tag: StatusTag | null): boolean {
    const card = room.cards[cardId];
    if (!card) return false;
    card.statusTag = tag && STATUS_TAGS.includes(tag) ? tag : undefined;
    return true;
  }

  removeCard(room: Room, cardId: string): string[] | null {
    if (!room.cards[cardId]) return null;
    delete room.cards[cardId];
    const removedStrings = Object.values(room.strings)
      .filter(s => s.fromCardId === cardId || s.toCardId === cardId)
      .map(s => s.id);
    removedStrings.forEach(id => delete room.strings[id]);
    return removedStrings;
  }

  createString(room: Room, from: string, to: string, label: StringLabel, createdBy: string): BoardString | null {
    const isQuestion = (id: string) => id.startsWith('q-');
    if (from === to) return null;
    if (!(room.cards[from] || isQuestion(from)) || !(room.cards[to] || isQuestion(to))) return null;
    const [a, b] = [from, to].sort();
    const id = `str-${a}-${b}`;
    const str: BoardString = {
      id,
      fromCardId: from,
      toCardId: to,
      label: STRING_LABELS.includes(label) ? label : 'link',
      createdBy,
    };
    room.strings[id] = str;
    return str;
  }

  deleteString(room: Room, id: string): boolean {
    if (!room.strings[id]) return false;
    delete room.strings[id];
    return true;
  }

  addChat(room: Room, player: Player, text: unknown, phrase?: { key?: unknown; ref?: unknown; index?: unknown }): ChatMessage | null {
    const clean = cleanText(text, 400);
    const key = CHAT_PHRASES.find(k => k === phrase?.key);
    if (!clean && !key) return null;
    const msg: ChatMessage = {
      id: `msg-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
      sender: player.name,
      role: player.role,
      text: key ? undefined : clean,
      phrase: key
        ? { key, ref: cleanText(phrase?.ref, 40) || undefined, index: typeof phrase?.index === 'number' ? clampNum(phrase.index, 0, 10) : undefined }
        : undefined,
      at: Date.now(),
    };
    room.chat.push(msg);
    if (room.chat.length > MAX_CHAT) room.chat.splice(0, room.chat.length - MAX_CHAT);
    return msg;
  }

  // ─── Accusation ───

  submitAccusation(room: Room, submission: AccusationSubmission): { correctCount: number } | null {
    if (room.status !== 'active') return null;
    const sol = room.blueprint.solution;
    const checks = [
      submission.suspectId === sol.killerId,
      submission.motiveId === sol.motiveId,
      submission.weaponId === sol.weaponId,
      submission.alibiEvidenceId === sol.alibiEvidenceId,
    ];
    if (sol.accompliceId) checks.push(submission.accompliceId === sol.accompliceId);
    const correctCount = checks.filter(Boolean).length;
    room.attemptsUsed += 1;
    if (correctCount === checks.length) {
      room.status = 'solved';
      room.finishedAt = Date.now();
      room.score = computeScore(room.finishedAt - room.createdAt, room.attemptsUsed - 1, room.hintsUsed);
    } else if (room.attemptsUsed >= MAX_ATTEMPTS) {
      room.status = 'failed';
      room.finishedAt = Date.now();
      room.score = 0;
    }
    if (room.status !== 'active' && room.labTimer) clearTimeout(room.labTimer);
    return { correctCount };
  }

  resultFor(room: Room, by: string, correctCount: number, lang: Lang): AccusationResult {
    const done = room.status !== 'active';
    return {
      by,
      correctCount,
      total: room.blueprint.solution.accompliceId ? 5 : 4,
      status: room.status,
      attemptsUsed: room.attemptsUsed,
      maxAttempts: MAX_ATTEMPTS,
      solution: done ? room.blueprint.solution : undefined,
      explanation: done ? explainSolution(room.blueprint, lang) : undefined,
      score: room.score ?? undefined,
      elapsedMs: room.finishedAt ? room.finishedAt - room.createdAt : undefined,
      hintsUsed: room.hintsUsed,
    };
  }

  /** Drop rooms nobody has touched for a while. */
  sweep(maxIdleMs: number) {
    const now = Date.now();
    for (const [code, room] of Object.entries(this.rooms)) {
      if (Object.keys(room.players).length === 0 && now - room.lastActiveAt > maxIdleMs) {
        if (room.labTimer) clearTimeout(room.labTimer);
        delete this.rooms[code];
      }
    }
  }
}

export const roomManager = new RoomManager();
