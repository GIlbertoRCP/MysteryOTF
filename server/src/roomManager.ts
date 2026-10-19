import {
  BOT_PHRASES, GameMode, LabState, CHAT_PHRASES, AccusationResult, AccusationSubmission, BoardCard, BoardString, CaseStatus, ChatMessage, Difficulty, Lang,
  ConfrontEntry, Player, PublicMystery, PublicRoom, Role, SearchEntry, StatusTag, StringLabel, ThemeKey,
} from './types.js';
import { Blueprint, buildBlueprint, confront, dailyCase, explainSolution, hintsFor, localize, randomSeed, searchSpot, storyFor, THEME_KEYS } from './mysteryEngine.js';
import { createStore, RoomStore } from './store.js';

/** How long a disconnected player's seat is held before they count as gone. */
export const GRACE_MS = 30 * 1000;

const MAX_ATTEMPTS = 3;
const MAX_CHAT = 200;
const STATUS_TAGS: StatusTag[] = ['prime_suspect', 'cleared', 'key_clue'];
const STRING_LABELS: StringLabel[] = ['link', 'motive', 'weapon', 'contradiction', 'alibi'];
const MAX_HINTS = 4;
/** In solo games these lab results have to be requested and take time. */
export const LAB_KINDS = ['autopsy', 'weapon', 'smudge', 'shoeprint', 'trace', 'scrapings'];
const LAB_SECONDS: Record<Difficulty, number> = { Novice: 10, Detective: 18, Mastermind: 28 };

/** A held-back clue arrives this long after the case opens (tests shorten it with LATE_LEAD_SECONDS). */
export const LATE_LEAD_MS = Number(process.env.LATE_LEAD_SECONDS ?? 300) * 1000;
const CONFRONT_PENALTY = 50;

export function computeScore(elapsedMs: number, wrongAttempts: number, hintsUsed: number, wastedConfronts = 0): number {
  const overtime = Math.max(0, elapsedMs / 1000 - 300); // the first five minutes are free
  const raw = 1000 - wrongAttempts * 200 - hintsUsed * 100 - wastedConfronts * CONFRONT_PENALTY - Math.floor(overtime / 10) * 2;
  return Math.max(50, Math.round(raw));
}

export interface Room {
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
  saveTimer?: ReturnType<typeof setTimeout>;
  hintsUsed: number;
  score: number | null;
  finishedAt: number | null;
  nudges: number;
  confrontations: Omit<ConfrontEntry, 'line' | 'followUp'>[];
  wastedConfronts: number;
  lateReleased: boolean;
  searches: Omit<SearchEntry, 'text' | 'found'>[];
  foundItems: string[];
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

// Fields that only make sense in this process and are never saved.
const TRANSIENT = new Set(['mysteries', 'labTimer', 'saveTimer']);

class RoomManager {
  private rooms: Record<string, Room> = {};
  private store: RoomStore = createStore();
  private graceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /** Called when a lab test finishes, including one that finishes after a restart. */
  onLabDone: (room: Room) => void = () => {};
  /** Called when a disconnected player's seat is finally given up. */
  onPlayerGone: (room: Room, player: Player) => void = () => {};

  get durable() {
    return this.store.durable;
  }

  private async newCode(): Promise<string> {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (;;) {
      const code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
      if (!this.rooms[code] && !(await this.store.exists(code))) return code;
    }
  }

  // ─── Saving and loading ───

  /** Saves the room shortly after it changes; bursts of changes become one write. */
  persist(room: Room) {
    if (!this.store.durable || room.saveTimer) return;
    room.saveTimer = setTimeout(() => {
      room.saveTimer = undefined;
      void this.store.save(room.code, this.serialize(room));
    }, 400);
  }

  private serialize(room: Room): string {
    return JSON.stringify(room, (k, v) => (TRANSIENT.has(k) ? undefined : v));
  }

  /** Finds a room in memory, or brings a saved one back after a restart. */
  async loadRoom(code: string): Promise<Room | undefined> {
    const upper = (code || '').toUpperCase();
    if (this.rooms[upper]) return this.rooms[upper];
    const json = await this.store.load(upper);
    if (!json || this.rooms[upper]) return this.rooms[upper];
    const room = JSON.parse(json) as Room;
    room.mysteries = {};
    // Cases saved before these features existed
    room.confrontations ??= [];
    room.wastedConfronts ??= 0;
    room.lateReleased ??= !room.blueprint.lateEvidenceId;
    room.searches ??= [];
    room.foundItems ??= [];
    // Everyone was disconnected by the restart. Hold their seats so they can come straight back.
    for (const p of Object.values(room.players)) {
      p.connected = false;
      this.holdSeat(room, p);
    }
    this.rooms[upper] = room;
    this.resumeLab(room);
    console.log(`[Room] Restored ${upper} from storage`);
    return room;
  }

  private resumeLab(room: Room) {
    const running = room.lab?.running;
    if (!running || room.status !== 'active') return;
    room.labTimer = setTimeout(() => this.finishLab(room), Math.max(0, running.readyAt - Date.now()));
  }

  private finishLab(room: Room) {
    if (!room.lab?.running) return;
    room.lab.unlocked.push(room.lab.running.id);
    room.lab.running = null;
    this.persist(room);
    this.onLabDone(room);
  }

  async createRoom(opts: CreateOptions): Promise<Room> {
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
      code: await this.newCode(),
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
      confrontations: [],
      wastedConfronts: 0,
      lateReleased: false,
      searches: [],
      foundItems: [],
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
    this.persist(room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms[(code || '').toUpperCase()];
  }

  /** Assistant nudge counter, saved like everything else. */
  nudge(room: Room) {
    room.nudges += 1;
    room.lastActiveAt = Date.now();
    this.persist(room);
  }

  /** The case as this player may see it right now (a held-back clue stays hidden until it arrives). */
  getMystery(room: Room, lang: Lang): PublicMystery {
    if (!room.mysteries[lang]) room.mysteries[lang] = localize(room.blueprint, lang);
    const full = room.mysteries[lang]!;
    const late = room.blueprint.lateEvidenceId;
    if (!late || room.lateReleased) return full;
    return { ...full, evidence: full.evidence.filter(e => e.id !== late) };
  }

  /** Rooms whose held-back clue is due. */
  dueLateLeads(): Room[] {
    const now = Date.now();
    return Object.values(this.rooms).filter(r =>
      r.blueprint.lateEvidenceId && !r.lateReleased && r.status === 'active' &&
      Object.values(r.players).some(p => p.connected) && now - r.createdAt > LATE_LEAD_MS);
  }

  releaseLateLead(room: Room) {
    room.lateReleased = true;
    this.persist(room);
  }

  // ─── Confrontations ───

  /** Presents a pinned clue to a suspect. Returns null if it isn't allowed. */
  confront(room: Room, suspectId: string, evidenceId: string, by: string): { entry: Omit<ConfrontEntry, 'line' | 'followUp'>; repeat: boolean } | null {
    if (room.status !== 'active') return null;
    if (!room.cards[`card-${evidenceId}`]) return null; // only clues on the shared board
    const previous = room.confrontations.find(c => c.suspectId === suspectId && c.evidenceId === evidenceId);
    if (previous) return { entry: previous, repeat: true };
    const outcome = confront(room.blueprint, suspectId, evidenceId, 'en');
    if (!outcome) return null;
    const entry = { suspectId, evidenceId, by: cleanText(by, 24), kind: outcome.kind, cracked: outcome.cracked, at: Date.now() };
    room.confrontations.push(entry);
    if (!outcome.cracked) room.wastedConfronts += 1;
    room.lastActiveAt = Date.now();
    this.persist(room);
    return { entry, repeat: false };
  }

  /** The confrontation log with each reaction in the reader's language. */
  confrontationsFor(room: Room, lang: Lang): ConfrontEntry[] {
    return room.confrontations.map(c => this.localizeConfront(room, c, lang));
  }

  localizeConfront(room: Room, entry: Omit<ConfrontEntry, 'line' | 'followUp'>, lang: Lang): ConfrontEntry {
    const outcome = confront(room.blueprint, entry.suspectId, entry.evidenceId, lang)!;
    return { ...entry, line: outcome.line, followUp: outcome.followUp };
  }

  // ─── Searching the scene ───

  /** Recovered items stay hidden until someone searches the spot they were left in. */
  isHidden(room: Room, evidenceId: string): boolean {
    const ev = room.blueprint.evidence.find(e => e.id === evidenceId);
    return !!ev && ev.kind === 'weapon' && !room.foundItems.includes(evidenceId);
  }

  search(room: Room, spotId: string, by: string): { entry: Omit<SearchEntry, 'text' | 'found'>; repeat: boolean } | null {
    if (room.status !== 'active') return null;
    const previous = room.searches.find(s => s.spotId === spotId);
    if (previous) return { entry: previous, repeat: true };
    const result = searchSpot(room.blueprint, spotId, 'en');
    if (!result) return null;
    const entry = { spotId, by: cleanText(by, 24), at: Date.now() };
    room.searches.push(entry);
    for (const id of result.found) if (!room.foundItems.includes(id)) room.foundItems.push(id);
    room.lastActiveAt = Date.now();
    this.persist(room);
    return { entry, repeat: false };
  }

  localizeSearch(room: Room, entry: Omit<SearchEntry, 'text' | 'found'>, lang: Lang): SearchEntry {
    const result = searchSpot(room.blueprint, entry.spotId, lang)!;
    return { ...entry, text: result.text, found: result.found };
  }

  searchesFor(room: Room, lang: Lang): SearchEntry[] {
    return room.searches.map(s => this.localizeSearch(room, s, lang));
  }

  /** Solo cases have room for exactly one detective (who may be coming back). */
  isFull(room: Room, playerId: string): boolean {
    return room.mode === 'solo' && Object.keys(room.players).some(id => id !== playerId);
  }

  /** Adds a player, or gives a returning player their seat back. */
  addPlayer(room: Room, playerId: string, socketId: string, name: string, wantedRole: Role, lang: Lang): { player: Player; rejoined: boolean } {
    const existing = room.players[playerId];
    if (existing) {
      this.clearGrace(room, playerId);
      existing.socketId = socketId;
      existing.connected = true;
      existing.lang = lang === 'es' ? 'es' : 'en';
      room.lastActiveAt = Date.now();
      this.persist(room);
      return { player: existing, rejoined: true };
    }
    if (room.mode === 'solo') wantedRole = 'lead';
    const taken = Object.values(room.players).map(p => p.role);
    let role: Role = wantedRole === 'analyst' ? 'analyst' : 'lead';
    if (taken.includes(role)) {
      const other: Role = role === 'lead' ? 'analyst' : 'lead';
      if (!taken.includes(other)) role = other;
    }
    const player: Player = {
      id: playerId,
      socketId,
      name: cleanText(name, 24) || (role === 'lead' ? 'Detective' : 'Analyst'),
      role,
      lang: lang === 'es' ? 'es' : 'en',
      connected: true,
    };
    room.players[playerId] = player;
    room.lastActiveAt = Date.now();
    this.persist(room);
    return { player, rejoined: false };
  }

  setLang(room: Room, playerId: string, lang: Lang) {
    const p = room.players[playerId];
    if (p) p.lang = lang === 'es' ? 'es' : 'en';
    this.persist(room);
  }

  private graceKey(room: Room, playerId: string) {
    return `${room.code}:${playerId}`;
  }

  private clearGrace(room: Room, playerId: string) {
    const k = this.graceKey(room, playerId);
    const timer = this.graceTimers.get(k);
    if (timer) clearTimeout(timer);
    this.graceTimers.delete(k);
  }

  private holdSeat(room: Room, player: Player) {
    this.clearGrace(room, player.id);
    this.graceTimers.set(
      this.graceKey(room, player.id),
      setTimeout(() => {
        this.graceTimers.delete(this.graceKey(room, player.id));
        if (room.players[player.id]?.connected) return;
        delete room.players[player.id];
        room.lastActiveAt = Date.now();
        this.persist(room);
        this.onPlayerGone(room, player);
      }, GRACE_MS)
    );
  }

  /** A connection dropped: keep the seat for a while in case they come right back. */
  disconnect(roomCode: string | undefined, playerId: string | undefined, socketId: string): Room | null {
    const room = roomCode ? this.rooms[roomCode] : undefined;
    const player = room && playerId ? room.players[playerId] : undefined;
    if (!room || !player || player.socketId !== socketId) return null;
    player.connected = false;
    room.lastActiveAt = Date.now();
    this.persist(room);
    this.holdSeat(room, player);
    return room;
  }

  /** The player chose to leave: give the seat up straight away. */
  leave(roomCode: string | undefined, playerId: string | undefined): Room | null {
    const room = roomCode ? this.rooms[roomCode] : undefined;
    if (!room || !playerId || !room.players[playerId]) return null;
    this.clearGrace(room, playerId);
    delete room.players[playerId];
    room.lastActiveAt = Date.now();
    this.persist(room);
    return room;
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
      wastedConfronts: room.wastedConfronts,
    };
  }

  // ─── Solo lab work ───

  isLabLocked(room: Room, evidenceId: string): boolean {
    if (!room.lab) return false;
    const ev = room.blueprint.evidence.find(e => e.id === evidenceId);
    return !!ev && ev.role === 'analyst' && LAB_KINDS.includes(ev.kind) && !room.lab.unlocked.includes(evidenceId);
  }

  /** Starts a lab test; onLabDone fires when the result is ready. */
  requestLab(room: Room, evidenceId: string): boolean {
    if (!room.lab || room.lab.running || room.status !== 'active') return false;
    if (!this.isLabLocked(room, evidenceId)) return false;
    const seconds = room.tutorial ? 6 : LAB_SECONDS[room.blueprint.difficulty];
    room.lab.running = { id: evidenceId, readyAt: Date.now() + seconds * 1000 };
    room.labTimer = setTimeout(() => this.finishLab(room), seconds * 1000);
    this.persist(room);
    return true;
  }

  // ─── Hints ───

  revealHint(room: Room): boolean {
    if (room.hintsUsed >= MAX_HINTS || room.status !== 'active') return false;
    room.hintsUsed += 1;
    this.persist(room);
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
    this.persist(room);
    return msg;
  }

  /** Points at a useful file the player hasn't put on the board yet. */
  botSuggestion(room: Room): { key: 'bot_look' | 'bot_lab_idle' | 'bot_tip'; ref?: string; index?: number } {
    const pinned = new Set(Object.values(room.cards).map(c => c.refId));
    const order = ['autopsy', 'record', 'receipt', 'sighting', 'claim', 'planted', 'witness', 'camera', 'phone', 'smudge', 'shoeprint', 'trace', 'scrapings', 'weapon', 'document'];
    const candidates = room.blueprint.evidence
      .filter(e => !pinned.has(e.id) && !this.isLabLocked(room, e.id) && !this.isHidden(room, e.id))
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
      r.assistant && r.status === 'active' && Object.values(r.players).some(p => p.connected) && r.nudges < 4 && now - r.lastActiveAt > idleMs);
  }

  touch(room: Room) {
    room.lastActiveAt = Date.now();
    this.persist(room);
  }

  // ─── Board ───

  addCard(room: Room, raw: Partial<BoardCard>, placedBy: string): BoardCard | null {
    const kind = raw.kind;
    if (kind !== 'evidence' && kind !== 'note' && kind !== 'suspect') return null;
    const refId = cleanText(raw.refId, 40);
    if (kind === 'evidence' && !room.blueprint.evidence.some(e => e.id === refId)) return null;
    if (kind === 'evidence' && (this.isLabLocked(room, refId) || this.isHidden(room, refId))) return null;
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
    this.persist(room);
    return card;
  }

  moveCard(room: Room, cardId: string, x: number, y: number): boolean {
    const card = room.cards[cardId];
    if (!card) return false;
    card.x = clampNum(x, -4000, 6000);
    card.y = clampNum(y, -4000, 6000);
    this.persist(room);
    return true;
  }

  tagCard(room: Room, cardId: string, tag: StatusTag | null): boolean {
    const card = room.cards[cardId];
    if (!card) return false;
    card.statusTag = tag && STATUS_TAGS.includes(tag) ? tag : undefined;
    this.persist(room);
    return true;
  }

  removeCard(room: Room, cardId: string): string[] | null {
    if (!room.cards[cardId]) return null;
    delete room.cards[cardId];
    const removedStrings = Object.values(room.strings)
      .filter(s => s.fromCardId === cardId || s.toCardId === cardId)
      .map(s => s.id);
    removedStrings.forEach(id => delete room.strings[id]);
    this.persist(room);
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
    this.persist(room);
    return str;
  }

  deleteString(room: Room, id: string): boolean {
    if (!room.strings[id]) return false;
    delete room.strings[id];
    this.persist(room);
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
    this.persist(room);
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
      room.score = computeScore(room.finishedAt - room.createdAt, room.attemptsUsed - 1, room.hintsUsed, room.wastedConfronts);
    } else if (room.attemptsUsed >= MAX_ATTEMPTS) {
      room.status = 'failed';
      room.finishedAt = Date.now();
      room.score = 0;
    }
    if (room.status !== 'active' && room.labTimer) clearTimeout(room.labTimer);
    this.persist(room);
    return { correctCount };
  }

  resultFor(room: Room, by: string, correctCount: number, lang: Lang, submission?: AccusationSubmission): AccusationResult {
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
      story: done ? storyFor(room.blueprint, lang) : undefined,
      wastedConfronts: room.wastedConfronts,
      spotsSearched: room.searches.length,
      submission,
      framedIds: done ? this.framedIds(room.blueprint) : undefined,
    };
  }

  private framedIds(bp: Blueprint): string[] {
    const idx = new Set<number>();
    if (bp.planted) idx.add(bp.planted.suspectIdx);
    const f = bp.suspects[bp.killerIdx].frameTargetIdx;
    if (f !== undefined) idx.add(f);
    return [...idx].map(i => bp.suspects[i].id);
  }

  /** Drops idle rooms from memory. Saved rooms stay in storage until they expire. */
  sweep(maxIdleMs: number) {
    const now = Date.now();
    for (const [code, room] of Object.entries(this.rooms)) {
      if (!Object.values(room.players).some(p => p.connected) && now - room.lastActiveAt > maxIdleMs) {
        if (room.labTimer) clearTimeout(room.labTimer);
        delete this.rooms[code];
      }
    }
  }
}

export const roomManager = new RoomManager();
