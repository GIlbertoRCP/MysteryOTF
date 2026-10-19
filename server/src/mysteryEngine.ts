import {
  Puzzle, Difficulty, EvidenceKind, Lang, PublicEvidence, PublicMystery, PublicSuspect, Role, Solution, ThemeKey, TraitDim,
} from './types.js';
import {
  ANALYST_DIMS, CAUSES, FAKE_BLOOD, FOLLOW_UP, LEAD_DIMS, MODIFIERS, ModifierKey, MOTIVES, PLANTED_ITEMS, SPOTS, SPOT_FOUND,
  SPOT_NOTHING, SPOT_SCENE, STORY, T, TAMPERED_NOTE, TEXT, TRAITS, fill,
} from './content/common.js';
import { THEMES, THEME_KEYS, portraitLook } from './content/themes.js';
import { generatePlan, Plan } from './floorPlan.js';

// ─── Seeded RNG (xmur3 hash + mulberry32) ────────────────────────────────────
class SeededRandom {
  private state: number;

  constructor(seedStr: string) {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    this.state = (h ^ (h >>> 16)) >>> 0;
  }

  next(): number {
    let a = (this.state += 0x6d2b79f5);
    a = Math.imul(a ^ (a >>> 15), a | 1);
    a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  id(prefix: string): string {
    return `${prefix}-${Math.floor(this.next() * 0xffffff).toString(16).padStart(6, '0')}`;
  }
}

// ─── Blueprint: the case with no language attached ───────────────────────────

/** Clue kinds that can be held back and arrive later as a new lead. */
const LATE_KINDS: EvidenceKind[] = ['witness', 'camera', 'phone', 'smudge', 'shoeprint', 'trace', 'scrapings'];

const ALL_DIMS: TraitDim[] = ['height', 'coat', 'voice', 'hand', 'footwear', 'habit', 'blood'];
const SUSPECT_COLORS = ['#e17055', '#74b9ff', '#55efc4', '#fdcb6e', '#a29bfe', '#fd79a8', '#81ecec', '#fab1a0'];

interface BlueprintSuspect {
  id: string;
  seedIdx: number;
  age: number;
  color: string;
  bioIdx: number;
  placeIdx: number;
  traits: Record<TraitDim, number>;
  motiveIdx: number;
  motiveOptionId: string;
  verified: boolean;
  noticed: 'nothing' | 'true' | 'frame';
  frameTargetIdx?: number;
}

interface BlueprintEvidence {
  id: string;
  role: Role;
  kind: EvidenceKind;
  /** suspect index (documents), place index (records), weapon index (weapons) */
  ref?: number;
  foundPlaceIdx?: number;
}

export interface Blueprint {
  seed: string;
  theme: ThemeKey;
  difficulty: Difficulty;
  titleIdx: number;
  victimIdx: number;
  victimAge: number;
  sceneIdx: number;
  startMin: number;
  witnessIdx: number;
  witnessMin: number;
  cameraIdx: number;
  cameraMin: number;
  phoneMin: number;
  todMin: number;
  plan: Plan;
  /** An innocent cleared by distance: seen far from the scene just before the death */
  sighting: { suspectIdx: number; witnessIdx: number } | null;
  suspects: BlueprintSuspect[];
  killerIdx: number;
  clueDims: TraitDim[];
  slip: boolean;
  /** Mastermind twist: an innocent who lies to cover for the killer */
  accompliceIdx: number | null;
  /** Twist: an item placed by the body to frame an innocent */
  planted: { suspectIdx: number; itemIdx: number } | null;
  /** Twist: a witness falsely accuses an innocent whom a staff record clears */
  claim: { suspectIdx: number; witnessIdx: number; min: number } | null;
  /** Twist: a clue held back that arrives a few minutes into the case */
  lateEvidenceId: string | null;
  /** A complication: blackout (no cameras), storm (no footprints), or tampered evidence */
  modifier: ModifierKey | null;
  powerCutMin: number;
  /** Tampered evidence: a decoy weapon smeared to look used */
  tampered: { weaponIdx: number; fakeIdx: number } | null;
  /** Searchable spots, two per room. Room 0 is the crime scene. */
  spots: { room: number; spotIdx: number; noteIdx: number; holdsItems: boolean }[];
  receiptPlaceIdx: number;
  receiptMin: number;
  weapons: { weaponIdx: number; optionId: string }[];
  trueWeaponIdx: number;
  evidence: BlueprintEvidence[];
  solution: Solution;
}

const DIFFICULTY = {
  Novice: { suspects: 4, verified: 1, places: 3, weapons: 3, extraMotiveDocs: 1, slip: true, frame: false, prefer: 'max', accomplice: 0, planted: 0, claim: 0, late: 0, modifier: 0 },
  Detective: { suspects: 5, verified: 2, places: 3, weapons: 3, extraMotiveDocs: 2, slip: true, frame: true, prefer: 'min+1', accomplice: 0, planted: 0.4, claim: 0.35, late: 0.6, modifier: 0.35 },
  Mastermind: { suspects: 6, verified: 2, places: 4, weapons: 4, extraMotiveDocs: 99, slip: false, frame: true, prefer: 'min', accomplice: 0.5, planted: 0.5, claim: 0.5, late: 0.8, modifier: 0.5 },
} as const;

function matching(suspects: BlueprintSuspect[], killer: BlueprintSuspect, dims: TraitDim[], useAlibi: boolean): number {
  return suspects.filter(s => {
    if (useAlibi && s.verified) return false;
    return dims.every(d => s.traits[d] === killer.traits[d]);
  }).length;
}

function chooseClueDims(rng: SeededRandom, suspects: BlueprintSuspect[], killer: BlueprintSuspect, prefer: string, allowed: TraitDim[]): TraitDim[] | null {
  const valid: TraitDim[][] = [];
  for (let mask = 1; mask < 1 << allowed.length; mask++) {
    const dims = allowed.filter((_, i) => mask & (1 << i));
    const leadDims = dims.filter(d => LEAD_DIMS.includes(d));
    const analystDims = dims.filter(d => ANALYST_DIMS.includes(d));
    if (leadDims.length === 0 || analystDims.length === 0) continue;
    // Together the clues must point to exactly one person...
    if (matching(suspects, killer, dims, true) !== 1) continue;
    // ...but neither player can get there alone.
    if (matching(suspects, killer, leadDims, true) < 2) continue;
    if (matching(suspects, killer, analystDims, false) < 2) continue;
    // Every clue has to rule somebody out, or it is just noise.
    if (dims.some(d => matching(suspects, killer, [d], false) === suspects.length)) continue;
    valid.push(dims);
  }
  if (valid.length === 0) return null;

  const sizes = valid.map(v => v.length);
  const min = Math.min(...sizes);
  const max = Math.max(...sizes);
  const target = prefer === 'max' ? max : prefer === 'min+1' ? Math.min(min + 1, max) : min;
  return rng.pick(valid.filter(v => v.length === target));
}

export function buildBlueprint(difficulty: Difficulty, themeKey: ThemeKey, seedStr: string): Blueprint {
  const theme = THEMES[themeKey] ? themeKey : 'gothic';
  const th = THEMES[theme];
  const cfg = DIFFICULTY[difficulty] || DIFFICULTY.Detective;
  const rng = new SeededRandom(`${seedStr}|${theme}|${difficulty}`);

  const titleIdx = rng.int(0, th.titles.length - 1);
  const victimIdx = rng.int(0, th.victims.length - 1);
  const sceneIdx = rng.int(0, th.scenes.length - 1);
  const victimAge = rng.int(46, 74);
  const startMin = rng.pick([21 * 60, 21 * 60 + 30, 22 * 60, 22 * 60 + 30]);
  const witnessIdx = rng.int(0, th.witnesses.length - 1);
  const cameraIdx = rng.int(0, th.cameras.length - 1);
  const witnessMin = startMin + rng.int(6, 24);
  const cameraMin = startMin + rng.int(3, 26);
  const phoneMin = startMin + rng.int(4, 24);

  const seedIdxs = rng.shuffle(th.suspects.map((_, i) => i)).slice(0, cfg.suspects);
  const placeIdxs = rng.shuffle(th.alibiPlaces.map((_, i) => i)).slice(0, cfg.places);
  const motiveIdxs = rng.shuffle(MOTIVES.map((_, i) => i));
  const bioIdxs = rng.shuffle(th.bioLines.map((_, i) => i));
  const colors = rng.shuffle(SUSPECT_COLORS);

  // A complication for the case. Blackouts kill the cameras; storms wash out footprints.
  const modifier: ModifierKey | null = rng.next() < cfg.modifier ? rng.pick(['blackout', 'storm', 'tampered'] as ModifierKey[]) : null;
  const powerCutMin = startMin + rng.int(1, 6);
  const allowedDims = ALL_DIMS.filter(d => !(modifier === 'blackout' && d === 'coat') && !(modifier === 'storm' && d === 'footwear'));

  // Roll traits until the deduction puzzle is uniquely solvable and truly co-op.
  let suspects: BlueprintSuspect[] = [];
  let killerIdx = 0;
  let clueDims: TraitDim[] | null = null;
  for (let attempt = 0; attempt < 500 && !clueDims; attempt++) {
    killerIdx = rng.int(0, cfg.suspects - 1);
    const innocents = rng.shuffle(seedIdxs.map((_, i) => i).filter(i => i !== killerIdx));
    const verifiedSet = new Set(innocents.slice(0, cfg.verified));
    suspects = seedIdxs.map((seedIdx, i) => ({
      id: '',
      seedIdx,
      age: 0,
      color: colors[i % colors.length],
      bioIdx: bioIdxs[i % bioIdxs.length],
      placeIdx: rng.pick(placeIdxs),
      traits: {
        height: rng.int(0, TRAITS.height.length - 1),
        coat: rng.int(0, TRAITS.coat.length - 1),
        hand: rng.next() < 0.3 ? 0 : 1, // left-handers are rarer
        footwear: rng.int(0, TRAITS.footwear.length - 1),
        habit: rng.int(0, TRAITS.habit.length - 1),
        voice: rng.int(0, TRAITS.voice.length - 1),
        blood: rng.pick([0, 0, 1, 2, 3, 3, 3]), // A and O are the common types
      },
      motiveIdx: motiveIdxs[i % motiveIdxs.length],
      motiveOptionId: '',
      verified: verifiedSet.has(i),
      noticed: 'nothing',
    }));
    clueDims = chooseClueDims(rng, suspects, suspects[killerIdx], cfg.prefer, allowedDims);
  }
  if (!clueDims) clueDims = [...allowedDims]; // practically unreachable

  // Ids are random so they never leak the answer.
  for (const s of suspects) {
    s.id = rng.id('s');
    s.age = rng.int(24, 70);
    s.motiveOptionId = rng.id('m');
  }
  const killer = suspects[killerIdx];

  const innocentIdxs = suspects.map((_, i) => i).filter(i => i !== killerIdx);

  // Mastermind twist: an unverified innocent swears they were with the killer.
  // Their own receipt puts them somewhere else, so both alibis collapse together.
  let accompliceIdx: number | null = null;
  const unverifiedInnocents = innocentIdxs.filter(i => !suspects[i].verified);
  if (rng.next() < cfg.accomplice && unverifiedInnocents.length) {
    accompliceIdx = rng.pick(unverifiedInnocents);
    suspects[accompliceIdx].placeIdx = killer.placeIdx;
  }
  // The receipt comes from a place nobody claims, so no alibi check contradicts it.
  const receiptPlaceIdx = rng.pick(th.alibiPlaces.map((_, i) => i).filter(i => !placeIdxs.includes(i)));
  const receiptMin = startMin + rng.int(6, 24);

  // Floor plan and an exact time of death (the victim's broken watch).
  const plan = generatePlan(rng, th.alibiPlaces.length + 1, theme === 'express' ? 'linear' : 'corridor');
  const todMin = startMin + rng.int(9, 21);

  // Above Novice, one cleared innocent is cleared by distance instead of by staff:
  // seen in their room a minute before the death, too far away to reach the scene.
  let sighting: Blueprint['sighting'] = null;
  const verifiedIdxs = suspects.map((s, i) => (s.verified ? i : -1)).filter(i => i >= 0);
  if (difficulty !== 'Novice' && verifiedIdxs.length) {
    const witnessChoices = th.witnesses.map((_, i) => i).filter(i => i !== witnessIdx);
    sighting = { suspectIdx: rng.pick(verifiedIdxs), witnessIdx: rng.pick(witnessChoices) };
  }

  // Twist: an item planted by the body to frame an innocent. The lab shows it was placed after the death.
  let planted: Blueprint['planted'] = null;
  const plantable = innocentIdxs.filter(i => i !== accompliceIdx);
  if (rng.next() < cfg.planted && plantable.length) {
    planted = { suspectIdx: rng.pick(plantable), itemIdx: rng.int(0, PLANTED_ITEMS.length - 1) };
  }

  // Twist: a lone witness accuses an innocent whom a staff record places elsewhere.
  let claim: Blueprint['claim'] = null;
  const recordCleared = verifiedIdxs.filter(i => i !== sighting?.suspectIdx);
  if (rng.next() < cfg.claim && recordCleared.length) {
    const usedWitnesses = [witnessIdx, sighting?.witnessIdx];
    const free = th.witnesses.map((_, i) => i).filter(i => !usedWitnesses.includes(i));
    claim = {
      suspectIdx: rng.pick(recordCleared),
      witnessIdx: free.length ? rng.pick(free) : rng.int(0, th.witnesses.length - 1),
      min: startMin + rng.int(8, 22),
    };
  }

  // Interview flavour: one innocent may confirm the habit clue, the killer may frame someone.
  if (clueDims.includes('habit')) suspects[rng.pick(innocentIdxs)].noticed = 'true';
  if (cfg.frame) {
    killer.noticed = 'frame';
    killer.frameTargetIdx = rng.pick(innocentIdxs.filter(i => i !== accompliceIdx));
  }

  // Weapons: the real one, a same-cause decoy when possible, then others.
  const trueWeaponIdx = rng.int(0, th.weapons.length - 1);
  const trueCause = th.weapons[trueWeaponIdx].cause;
  const others = rng.shuffle(th.weapons.map((_, i) => i).filter(i => i !== trueWeaponIdx));
  const sameCause = others.filter(i => th.weapons[i].cause === trueCause);
  const decoys = [...sameCause.slice(0, 1), ...others.filter(i => !sameCause.slice(0, 1).includes(i))].slice(0, cfg.weapons - 1);
  const weapons = rng.shuffle([trueWeaponIdx, ...decoys]).map(weaponIdx => ({ weaponIdx, optionId: rng.id('w') }));

  // ─── Evidence ───
  const evidence: BlueprintEvidence[] = [];
  const ev = (role: Role, kind: EvidenceKind, extra: Partial<BlueprintEvidence> = {}) => {
    const item = { id: rng.id('ev'), role, kind, ...extra };
    evidence.push(item);
    return item;
  };

  ev('lead', 'diary');
  ev('analyst', 'autopsy');
  if (clueDims.includes('height')) ev('lead', 'witness');
  if (clueDims.includes('coat')) ev('lead', 'camera');
  if (clueDims.includes('hand')) ev('analyst', 'smudge');
  if (clueDims.includes('footwear')) ev('analyst', 'shoeprint');
  if (clueDims.includes('habit')) ev('analyst', 'trace');
  if (clueDims.includes('voice')) ev('lead', 'phone');
  if (clueDims.includes('blood')) ev('analyst', 'scrapings');

  let alibiEvidenceId = '';
  const usedPlaces = [...new Set(suspects.map(s => s.placeIdx))];
  for (const placeIdx of usedPlaces) {
    const record = ev('lead', 'record', { ref: placeIdx });
    if (placeIdx === killer.placeIdx) alibiEvidenceId = record.id;
  }
  if (sighting) ev('lead', 'sighting', { ref: sighting.suspectIdx });
  if (planted) ev('analyst', 'planted', { ref: planted.suspectIdx });
  if (claim) ev('lead', 'claim', { ref: claim.suspectIdx });

  // With an accomplice, the receipt is what actually breaks the alibi.
  if (accompliceIdx !== null) alibiEvidenceId = ev('lead', 'receipt', { ref: accompliceIdx }).id;

  const motiveDocSuspects = [killerIdx, ...rng.shuffle(innocentIdxs).slice(0, cfg.extraMotiveDocs)];
  let motiveRole: Role = rng.next() < 0.5 ? 'lead' : 'analyst';
  for (const idx of rng.shuffle(motiveDocSuspects)) {
    ev(motiveRole, 'document', { ref: idx });
    motiveRole = motiveRole === 'lead' ? 'analyst' : 'lead';
  }

  const foundPlaces = [...placeIdxs];
  let weaponRole: Role = rng.next() < 0.5 ? 'lead' : 'analyst';
  for (const w of weapons) {
    ev(weaponRole, 'weapon', { ref: w.weaponIdx, foundPlaceIdx: rng.pick(foundPlaces) });
    weaponRole = weaponRole === 'lead' ? 'analyst' : 'lead';
  }

  const trueWeaponOption = weapons.find(w => w.weaponIdx === trueWeaponIdx)!;

  // Tampered evidence: one decoy is smeared to look like the murder weapon.
  const tampered = modifier === 'tampered'
    ? { weaponIdx: rng.pick(weapons.filter(w => w.weaponIdx !== trueWeaponIdx)).weaponIdx, fakeIdx: rng.int(0, FAKE_BLOOD.length - 1) }
    : null;

  // Two searchable spots per room. Recovered items sit in the first spot of the room they were found in.
  const itemRooms = new Set(evidence.filter(e => e.kind === 'weapon').map(e => e.foundPlaceIdx! + 1));
  const spots: Blueprint['spots'] = [];
  for (let room = 0; room <= th.alibiPlaces.length; room++) {
    const picks = rng.shuffle(SPOTS.map((_, i) => i)).slice(0, 2);
    picks.forEach((spotIdx, k) => {
      spots.push({
        room,
        spotIdx,
        noteIdx: room === 0 ? rng.int(0, SPOT_SCENE.length - 1) : rng.int(0, SPOT_NOTHING.length - 1),
        holdsItems: k === 0 && itemRooms.has(room),
      });
    });
  }

  // Twist: one physical clue arrives late, as a new lead a few minutes in.
  let lateEvidenceId: string | null = null;
  const lateCandidates = evidence.filter(e => LATE_KINDS.includes(e.kind));
  if (rng.next() < cfg.late && lateCandidates.length) lateEvidenceId = rng.pick(lateCandidates).id;

  return {
    seed: seedStr,
    theme,
    difficulty,
    titleIdx,
    victimIdx,
    victimAge,
    sceneIdx,
    startMin,
    witnessIdx,
    witnessMin,
    cameraIdx,
    cameraMin,
    phoneMin,
    todMin,
    plan,
    sighting,
    planted,
    claim,
    lateEvidenceId,
    modifier,
    powerCutMin,
    tampered,
    spots,
    suspects,
    killerIdx,
    clueDims,
    slip: cfg.slip,
    accompliceIdx,
    receiptPlaceIdx,
    receiptMin,
    weapons,
    trueWeaponIdx,
    evidence: rng.shuffle(evidence),
    solution: {
      killerId: killer.id,
      motiveId: killer.motiveOptionId,
      weaponId: trueWeaponOption.optionId,
      alibiEvidenceId,
      accompliceId: accompliceIdx !== null ? suspects[accompliceIdx].id : undefined,
    },
  };
}

// ─── Hands-on puzzles ───────────────────────────────────────────────────────

function hashId(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Splits text into roughly equal pieces at word boundaries. */
function tear(text: string, count: number): string[] {
  const words = text.split(' ');
  const per = Math.ceil(words.length / count);
  const pieces: string[] = [];
  for (let i = 0; i < words.length; i += per) pieces.push(words.slice(i, i + per).join(' '));
  return pieces;
}

function makePuzzle(bp: Blueprint, e: BlueprintEvidence, details: string): Puzzle | undefined {
  const killer = bp.suspects[bp.killerIdx];
  switch (e.kind) {
    case 'smudge':
      return { type: 'hand', answer: TRAITS.hand[killer.traits.hand].key as 'left' | 'right' };
    case 'shoeprint':
      return { type: 'sole', answer: TRAITS.footwear[killer.traits.footwear].key };
    case 'trace':
      return { type: 'uv', key: TRAITS.habit[killer.traits.habit].key };
    case 'planted':
      return { type: 'uv', key: 'planted' };
    case 'scrapings':
      return { type: 'blood', answer: TRAITS.blood[killer.traits.blood].key };
    case 'diary':
      return { type: 'cipher', shift: 3 + (hashId(e.id) % 20) };
    case 'document':
      // About half the documents arrive torn up.
      return hashId(e.id) % 2 === 0 ? { type: 'torn', pieces: tear(details, 3) } : undefined;
    default:
      return undefined;
  }
}

// ─── Localization ────────────────────────────────────────────────────────────

function formatTime(min: number, lang: Lang): string {
  const h = Math.floor(min / 60) % 24;
  const m = (min % 60).toString().padStart(2, '0');
  if (lang === 'es') return `${h}:${m}`;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

function formatWindow(startMin: number, lang: Lang): string {
  const a = formatTime(startMin, lang);
  const b = formatTime(startMin + 30, lang);
  return lang === 'es' ? `las ${a} y las ${b}` : `${a} and ${b}`;
}

function joinNames(names: string[], lang: Lang): string {
  if (names.length <= 1) return names.join('');
  const and = lang === 'es' ? ' y ' : ' and ';
  return names.slice(0, -1).join(', ') + and + names[names.length - 1];
}

export function localize(bp: Blueprint, lang: Lang): PublicMystery {
  const puzzleFor = (e: BlueprintEvidence, details: string) => makePuzzle(bp, e, details);
  const th = THEMES[bp.theme];
  const victim = th.victims[bp.victimIdx];
  const scene = th.scenes[bp.sceneIdx];
  const killer = bp.suspects[bp.killerIdx];
  const window = formatWindow(bp.startMin, lang);
  const trueWeapon = th.weapons[bp.trueWeaponIdx];
  const nameOf = (s: BlueprintSuspect) => th.suspects[s.seedIdx].name;
  const L = (text: T) => text[lang];

  const base = { victim: victim.name, scene: scene.name, window };

  const suspects: PublicSuspect[] = bp.suspects.map(s => {
    const seed = th.suspects[s.seedIdx];
    const place = th.alibiPlaces[s.placeIdx];
    const motive = MOTIVES[s.motiveIdx];
    const isKiller = s === killer;
    const accomplice = bp.accompliceIdx !== null ? bp.suspects[bp.accompliceIdx] : null;
    const partner = accomplice && (isKiller ? accomplice : s === accomplice ? killer : null);

    let noticed = fill(TEXT.aNoticedNothing, lang);
    if (s.noticed === 'true') {
      noticed = fill(TEXT.aNoticedTrue, lang, { ...base, value: TRAITS.habit[killer.traits.habit].clue });
    } else if (s.noticed === 'frame' && s.frameTargetIdx !== undefined) {
      noticed = fill(TEXT.aNoticedFrame, lang, { ...base, other: nameOf(bp.suspects[s.frameTargetIdx]) });
    }

    const traits = {} as Record<TraitDim, string>;
    const traitKeys = {} as Record<TraitDim, string>;
    for (const dim of ALL_DIMS) {
      const v = TRAITS[dim][s.traits[dim]];
      traits[dim] = L(v.label);
      traitKeys[dim] = v.key;
    }

    return {
      id: s.id,
      name: seed.name,
      role: L(seed.role),
      age: s.age,
      color: s.color,
      bio: fill(TEXT.bio, lang, { role: seed.role, line: fill(th.bioLines[s.bioIdx], lang, base) }),
      alibiPlace: L(place.label),
      alibiRoomId: `room-${s.placeIdx + 1}`,
      look: portraitLook(seed.name),
      alibiStatement: fill(TEXT.alibiStatement, lang, { ...base, place: place.name }),
      traits,
      traitKeys,
      interview: [
        {
          q: fill(TEXT.qWhere, lang, base),
          a: partner
            ? fill(TEXT.aWhereTogether, lang, { ...base, place: place.name, other: nameOf(partner) })
            : fill(TEXT.aWhere, lang, { ...base, place: place.name }),
        },
        { q: fill(TEXT.qRelation, lang, base), a: fill(motive.deflect, lang, base) },
        {
          q: fill(TEXT.qHeard, lang, base),
          a: isKiller && bp.slip
            ? fill(TEXT.aHeardSlip, lang, { ...base, cause: CAUSES[trueWeapon.cause].slipNoun })
            : fill(TEXT.aHeardInnocent, lang, base),
        },
        { q: fill(TEXT.qNoticed, lang, base), a: noticed },
      ],
    };
  });

  const evidence: PublicEvidence[] = bp.evidence.map(e => {
    const scene0 = 'room-0';
    const event: PublicEvidence['event'] =
      e.kind === 'witness' ? { min: bp.witnessMin, roomId: scene0 }
      : e.kind === 'camera' ? { min: bp.cameraMin, roomId: scene0 }
      : e.kind === 'phone' ? { min: bp.phoneMin, roomId: scene0 }
      : e.kind === 'autopsy' ? { min: bp.todMin, roomId: scene0 }
      : e.kind === 'diary' ? { min: bp.startMin, roomId: scene0 }
      : e.kind === 'receipt' ? { min: bp.receiptMin, roomId: `room-${bp.receiptPlaceIdx + 1}`, suspectId: bp.suspects[e.ref!].id }
      : e.kind === 'sighting' ? { min: bp.todMin - 1, roomId: `room-${bp.suspects[e.ref!].placeIdx + 1}`, suspectId: bp.suspects[e.ref!].id }
      : e.kind === 'weapon' ? { min: -1, roomId: `room-${e.foundPlaceIdx! + 1}` }
      : e.kind === 'claim' ? { min: bp.claim!.min, roomId: scene0, suspectId: bp.suspects[e.ref!].id }
      : undefined;
    const out = (title: string, summary: string, details: string): PublicEvidence => ({
      id: e.id, role: e.role, kind: e.kind, title, summary, details, event, puzzle: puzzleFor(e, details),
      weapon: e.kind === 'weapon' ? { key: th.weapons[e.ref!].key, residue: e.ref === bp.trueWeaponIdx || e.ref === bp.tampered?.weaponIdx } : undefined,
      spotId: e.kind === 'weapon' ? spotIdFor(bp, e.foundPlaceIdx! + 1) : undefined,
      model:
        e.kind === 'autopsy' ? { type: 'watch', min: bp.todMin, engraving: initialsOf(victim.name) }
        : e.kind === 'planted' ? { type: 'monogram', item: ['handkerchief', 'glove', 'cufflink', 'case'][bp.planted!.itemIdx], initials: initialsOf(nameOf(bp.suspects[e.ref!])) }
        : e.kind === 'document' ? { type: 'letter', seal: bp.suspects[e.ref!].color }
        : undefined,
      confirms: e.kind === 'record'
        ? bp.suspects.filter((s, i) => s.verified && s.placeIdx === e.ref && i !== bp.sighting?.suspectIdx).map(s => s.id)
        : undefined,
    });

    switch (e.kind) {
      case 'diary':
        return out(
          fill(TEXT.diaryTitle, lang, base),
          fill(TEXT.diarySummary, lang, base),
          fill(TEXT.diaryDetails, lang, { ...base, start: formatTime(bp.startMin, lang) })
        );
      case 'autopsy': {
        const cause = fill(CAUSES[trueWeapon.cause].autopsy, lang, { trace: trueWeapon.trace });
        return out(
          fill(TEXT.autopsyTitle, lang, base),
          fill(TEXT.autopsySummary, lang, base),
          fill(TEXT.autopsyDetails, lang, { ...base, cause, tod: formatTime(bp.todMin, lang) })
        );
      }
      case 'witness': {
        const w = th.witnesses[bp.witnessIdx];
        const params = { ...base, witness: w.name, value: TRAITS.height[killer.traits.height].clue, time: formatTime(bp.witnessMin, lang) };
        return out(fill(TEXT.witnessTitle, lang, { witness: w.label }), fill(TEXT.witnessSummary, lang, params), fill(TEXT.witnessDetails, lang, params));
      }
      case 'camera': {
        const source = th.cameras[bp.cameraIdx];
        const params = { ...base, source, value: TRAITS.coat[killer.traits.coat].clue, time: formatTime(bp.cameraMin, lang) };
        return out(L(source), fill(TEXT.cameraSummary, lang, params), fill(TEXT.cameraDetails, lang, params));
      }
      case 'smudge': {
        const params = { ...base, value: TRAITS.hand[killer.traits.hand].clue };
        return out(fill(TEXT.smudgeTitle, lang), fill(TEXT.smudgeSummary, lang), fill(TEXT.smudgeDetails, lang, params));
      }
      case 'shoeprint': {
        const params = { ...base, floor: th.floor, value: TRAITS.footwear[killer.traits.footwear].clue };
        return out(fill(TEXT.shoeprintTitle, lang), fill(TEXT.shoeprintSummary, lang), fill(TEXT.shoeprintDetails, lang, params));
      }
      case 'phone': {
        const params = { ...base, source: th.phone, value: TRAITS.voice[killer.traits.voice].clue, time: formatTime(bp.phoneMin, lang) };
        return out(L(th.phone), fill(TEXT.phoneSummary, lang, params), fill(TEXT.phoneDetails, lang, params));
      }
      case 'scrapings': {
        const params = { ...base, value: TRAITS.blood[killer.traits.blood].clue };
        return out(fill(TEXT.scrapingsTitle, lang), fill(TEXT.scrapingsSummary, lang), fill(TEXT.scrapingsDetails, lang, params));
      }
      case 'trace': {
        const params = { ...base, value: TRAITS.habit[killer.traits.habit].clue };
        return out(fill(TEXT.traceTitle, lang), fill(TEXT.traceSummary, lang), fill(TEXT.traceDetails, lang, params));
      }
      case 'record': {
        const place = th.alibiPlaces[e.ref!];
        const confirmed = bp.suspects.filter((s, i) => s.verified && s.placeIdx === e.ref && i !== bp.sighting?.suspectIdx).map(nameOf);
        const params = { ...base, place: place.name, names: joinNames(confirmed, lang) };
        return out(
          fill(TEXT.recordTitle, lang, { place: place.label }),
          fill(TEXT.recordSummary, lang, params),
          fill(confirmed.length ? TEXT.recordWithNames : TEXT.recordEmpty, lang, params) +
            (bp.accompliceIdx !== null && e.ref === killer.placeIdx
              ? fill(TEXT.recordVouch, lang, { accomplice: nameOf(bp.suspects[bp.accompliceIdx]), killer: nameOf(killer) })
              : '')
        );
      }
      case 'sighting': {
        const s = bp.suspects[e.ref!];
        const w = th.witnesses[bp.sighting!.witnessIdx];
        const params = { ...base, witness: w.name, name: nameOf(s), place: th.alibiPlaces[s.placeIdx].name, time: formatTime(bp.todMin - 1, lang) };
        return out(
          fill(TEXT.sightingTitle, lang, { witness: w.label, name: nameOf(s) }),
          fill(TEXT.sightingSummary, lang, params),
          fill(TEXT.sightingDetails, lang, params)
        );
      }
      case 'planted': {
        const s = bp.suspects[e.ref!];
        const item = PLANTED_ITEMS[bp.planted!.itemIdx];
        const params = { ...base, item: item.name, itemCap: item.cap, itemFull: item.full, initials: initialsOf(nameOf(s)) };
        return out(fill(TEXT.plantedTitle, lang, params), fill(TEXT.plantedSummary, lang, params), fill(TEXT.plantedDetails, lang, params));
      }
      case 'claim': {
        const s = bp.suspects[e.ref!];
        const w = th.witnesses[bp.claim!.witnessIdx];
        const params = { ...base, witness: w.name, name: nameOf(s), time: formatTime(bp.claim!.min, lang) };
        return out(
          fill(TEXT.claimTitle, lang, { witness: w.label, name: nameOf(s) }),
          fill(TEXT.claimSummary, lang, params),
          fill(TEXT.claimDetails, lang, params)
        );
      }
      case 'receipt': {
        const place = th.alibiPlaces[bp.receiptPlaceIdx];
        const params = { ...base, place: place.name, name: nameOf(bp.suspects[e.ref!]), time: formatTime(bp.receiptMin, lang) };
        return out(fill(TEXT.receiptTitle, lang, { place: place.label }), fill(TEXT.receiptSummary, lang, params), fill(TEXT.receiptDetails, lang, params));
      }
      case 'document': {
        const s = bp.suspects[e.ref!];
        const motive = MOTIVES[s.motiveIdx];
        const params = { ...base, name: nameOf(s) };
        return out(fill(motive.docTitle, lang, params), fill(motive.docSummary, lang, params), fill(motive.doc, lang, params));
      }
      case 'weapon': {
        const w = th.weapons[e.ref!];
        const params = { ...base, weapon: w.label, place: th.alibiPlaces[e.foundPlaceIdx!].name, desc: w.desc };
        const smeared = bp.tampered?.weaponIdx === e.ref ? ' ' + fill(TAMPERED_NOTE, lang, { fake: FAKE_BLOOD[bp.tampered!.fakeIdx] }) : '';
        return out(fill(TEXT.weaponTitle, lang, params), fill(TEXT.weaponSummary, lang, params), fill(TEXT.weaponDetails, lang, params) + smeared);
      }
    }
  });

  const motiveOptions = bp.suspects
    .map(s => ({ id: s.motiveOptionId, label: L(MOTIVES[s.motiveIdx].label) }))
    .sort((a, b) => a.label.localeCompare(b.label, lang));
  const weaponOptions = bp.weapons.map(w => ({ id: w.optionId, label: L(th.weapons[w.weaponIdx].label) }));

  return {
    caseId: `case-${bp.seed}`,
    seed: bp.seed,
    theme: bp.theme,
    difficulty: bp.difficulty,
    lang,
    title: L(th.titles[bp.titleIdx]),
    victim: {
      name: victim.name,
      age: bp.victimAge,
      occupation: L(victim.occupation),
      scene: L(scene.label),
      timeWindow: `${formatTime(bp.startMin, lang)} – ${formatTime(bp.startMin + 30, lang)}`,
      windowStart: bp.startMin,
      windowEnd: bp.startMin + 30,
    },
    plan: {
      layout: bp.plan.layout,
      width: bp.plan.width,
      height: bp.plan.height,
      corridor: bp.plan.corridor,
      rooms: bp.plan.rooms.map(r => ({
        id: `room-${r.idx}`,
        label: r.idx === 0 ? L(scene.label) : L(th.alibiPlaces[r.idx - 1].label),
        kind: r.idx === 0 ? 'scene' : 'room',
        x: r.x, y: r.y, w: r.w, h: r.h, door: r.door, walk: r.walk,
        spots: bp.spots.filter(sp => sp.room === r.idx).map((sp, k) => ({ id: `spot-${r.idx}-${k}`, label: L(SPOTS[sp.spotIdx].label) })),
      })),
    },
    modifier: bp.modifier
      ? { key: bp.modifier, label: L(MODIFIERS[bp.modifier].label), note: fill(MODIFIERS[bp.modifier].note, lang, { time: formatTime(bp.powerCutMin, lang) }) }
      : null,
    synopsis: fill(th.synopsis, lang, { ...base, occupation: victim.occupation, count: String(bp.suspects.length) }),
    suspects,
    evidence,
    options: { motives: motiveOptions, weapons: weaponOptions, accomplice: bp.accompliceIdx !== null },
  };
}

const CLUE_KIND: Record<TraitDim, EvidenceKind> = {
  height: 'witness',
  coat: 'camera',
  voice: 'phone',
  hand: 'smudge',
  footwear: 'shoeprint',
  habit: 'trace',
  blood: 'scrapings',
};

/** Four hints, each narrowing things further, none naming the killer outright. */
export function hintsFor(bp: Blueprint, lang: Lang): string[] {
  const th = THEMES[bp.theme];
  const m = localize(bp, lang);
  const killer = bp.suspects[bp.killerIdx];
  const nameOf = (s: BlueprintSuspect) => th.suspects[s.seedIdx].name;
  const hints: string[] = [];

  const verified = bp.suspects.filter(s => s.verified);
  hints.push(verified.length
    ? fill(TEXT.hintAlibi, lang, { names: joinNames(verified.map(nameOf), lang) })
    : fill(TEXT.hintAlibiNone, lang));

  const decoys = bp.weapons.filter(w => w.weaponIdx !== bp.trueWeaponIdx).map(w => th.weapons[w.weaponIdx].name[lang]);
  const or = lang === 'es' ? ' ni ' : ' or ';
  hints.push(fill(TEXT.hintWeapon, lang, { names: decoys.length > 1 ? decoys.slice(0, -1).join(', ') + or + decoys[decoys.length - 1] : decoys.join('') }));

  // Then the physical clues, strongest first, each against who is still in play.
  let remaining = bp.suspects.filter(s => !s.verified);
  const dims = [...bp.clueDims];
  while (hints.length < 4 && dims.length) {
    dims.sort((a, b) =>
      remaining.filter(s => s.traits[b] !== killer.traits[b]).length - remaining.filter(s => s.traits[a] !== killer.traits[a]).length);
    const dim = dims.shift()!;
    const out = remaining.filter(s => s.traits[dim] !== killer.traits[dim]);
    if (!out.length) continue;
    const card = m.evidence.find(e => e.kind === CLUE_KIND[dim]);
    hints.push(fill(TEXT.hintClue, lang, { title: card?.title ?? '', names: joinNames(out.map(nameOf), lang) }));
    remaining = remaining.filter(s => s.traits[dim] === killer.traits[dim]);
  }
  if (hints.length < 4) hints.push(fill(bp.slip ? TEXT.hintSlip : TEXT.hintMotive, lang));
  return hints.slice(0, 4);
}

/** Everyone gets the same case on the same day. */
export function dailyCase(date: string): { seed: string; theme: ThemeKey; difficulty: Difficulty } {
  let h = 0;
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { seed: `DAILY-${date}`, theme: THEME_KEYS[h % THEME_KEYS.length], difficulty: 'Detective' };
}

const TITLE_WORDS = /^(dr\.|don|doña|padre|fra|sister|count|colonel|professor|general|maestro|lord|lady|baron|duchess|captain|ambassador|signor|signora|madame|contessa|commander)$/i;
function initialsOf(name: string): string {
  const parts = name.replace(/["“”]/g, '').split(/\s+/).filter(p => !TITLE_WORDS.test(p));
  return `${parts[0]?.[0] ?? ''}.${parts.length > 1 ? ` ${parts[parts.length - 1][0]}.` : ''}`;
}

export interface ConfrontOutcome {
  cracked: boolean;
  /** A new question that cracking them unlocks */
  followUp?: { q: string; a: string };
  /** cleared: proves them innocent of the lie; admit: confirms a motive; confess/slip: points somewhere new */
  kind: 'admit' | 'cleared' | 'confess' | 'slip' | 'deflect';
  line: string;
}

/**
 * Presenting a clue to a suspect. Most clues get a brush-off; the right one makes them crack.
 * Runs on the server only, so which clue cracks whom never reaches the browser.
 */
export function confront(bp: Blueprint, suspectId: string, evidenceId: string, lang: Lang): ConfrontOutcome | null {
  const th = THEMES[bp.theme];
  const sIdx = bp.suspects.findIndex(s => s.id === suspectId);
  const e = bp.evidence.find(x => x.id === evidenceId);
  if (sIdx < 0 || !e) return null;
  const s = bp.suspects[sIdx];
  const killer = bp.suspects[bp.killerIdx];
  const nameOf = (x: BlueprintSuspect) => th.suspects[x.seedIdx].name;
  const base = { victim: th.victims[bp.victimIdx].name, scene: th.scenes[bp.sceneIdx].name };

  // What an innocent remembers once they open up: a true detail about the killer.
  const seenDims = bp.clueDims.filter(d => d !== 'blood');
  const seen = () => {
    const dim = seenDims[sIdx % Math.max(1, seenDims.length)];
    if (!dim) return fill(FOLLOW_UP.aHeard, lang, base);
    return fill(FOLLOW_UP.seen[dim as keyof typeof FOLLOW_UP.seen], lang, { ...base, value: TRAITS[dim][killer.traits[dim]].clue });
  };
  const frame = () => {
    const target = bp.suspects[killer.frameTargetIdx ?? (bp.killerIdx === 0 ? 1 : 0)];
    return fill(FOLLOW_UP.aFrame, lang, { ...base, other: nameOf(target) });
  };

  if (e.kind === 'document' && e.ref === sIdx) {
    return {
      cracked: true,
      kind: 'admit',
      line: fill(MOTIVES[s.motiveIdx].admit, lang, base),
      followUp: { q: fill(FOLLOW_UP.qMore, lang, base), a: sIdx === bp.killerIdx ? frame() : seen() },
    };
  }
  if (e.kind === 'receipt' && e.ref === sIdx && bp.accompliceIdx === sIdx) {
    return {
      cracked: true,
      kind: 'confess',
      line: fill(TEXT.confrontAccomplice, lang, { ...base, killer: nameOf(killer), receiptPlace: th.alibiPlaces[bp.receiptPlaceIdx].name }),
      followUp: { q: fill(FOLLOW_UP.qWhy, lang, base), a: fill(FOLLOW_UP.aWhy, lang, { ...base, killer: nameOf(killer) }) },
    };
  }
  if (e.kind === 'sighting' && e.ref === sIdx && bp.sighting) {
    return {
      cracked: true,
      kind: 'cleared',
      line: fill(TEXT.confrontSighting, lang, { ...base, place: th.alibiPlaces[s.placeIdx].name, witness: th.witnesses[bp.sighting.witnessIdx].name }),
      followUp: { q: fill(FOLLOW_UP.qWho, lang, base), a: seen() },
    };
  }
  if (e.kind === 'planted' && e.ref === sIdx) {
    return { cracked: true, kind: 'cleared', line: fill(TEXT.confrontPlanted, lang, base), followUp: { q: fill(FOLLOW_UP.qWho, lang, base), a: seen() } };
  }
  if (e.kind === 'claim' && e.ref === sIdx) {
    return {
      cracked: true,
      kind: 'cleared',
      line: fill(TEXT.confrontClaim, lang, { ...base, place: th.alibiPlaces[s.placeIdx].name }),
      followUp: { q: fill(FOLLOW_UP.qWho, lang, base), a: seen() },
    };
  }
  if (e.kind === 'autopsy' && sIdx === bp.killerIdx && bp.slip) {
    return { cracked: true, kind: 'slip', line: fill(TEXT.confrontSlip, lang, base), followUp: { q: fill(FOLLOW_UP.qHeard, lang, base), a: fill(FOLLOW_UP.aHeard, lang, base) } };
  }
  const variants = [TEXT.deflect0, TEXT.deflect1, TEXT.deflect2];
  return { cracked: false, kind: 'deflect', line: fill(variants[(sIdx + evidenceId.length) % variants.length], lang, base) };
}

function spotIdFor(bp: Blueprint, room: number): string | undefined {
  const k = bp.spots.filter(sp => sp.room === room).findIndex(sp => sp.holdsItems);
  return k >= 0 ? `spot-${room}-${k}` : undefined;
}

/** Searching a spot on the floor plan: what you find, and which item cards it unlocks. */
export function searchSpot(bp: Blueprint, spotId: string, lang: Lang): { text: string; found: string[] } | null {
  const m = /^spot-(\d+)-(\d+)$/.exec(spotId);
  if (!m) return null;
  const room = Number(m[1]);
  const spot = bp.spots.filter(sp => sp.room === room)[Number(m[2])];
  if (!spot) return null;
  const th = THEMES[bp.theme];
  if (spot.holdsItems) {
    const items = bp.evidence.filter(e => e.kind === 'weapon' && e.foundPlaceIdx! + 1 === room);
    const names = items.map(e => th.weapons[e.ref!].name);
    const list = names.length === 1 ? names[0][lang] : names.map(n => n[lang]).join(lang === 'es' ? ' y ' : ' and ');
    return { text: fill(SPOT_FOUND, lang, { spot: SPOTS[spot.spotIdx].name, weapon: list }), found: items.map(e => e.id) };
  }
  return { text: fill((room === 0 ? SPOT_SCENE : SPOT_NOTHING)[spot.noteIdx], lang), found: [] };
}

/** The true sequence of events, revealed once the case is closed. */
export function storyFor(bp: Blueprint, lang: Lang): { min: number; text: string }[] {
  const th = THEMES[bp.theme];
  const killer = bp.suspects[bp.killerIdx];
  const name = (x: BlueprintSuspect) => th.suspects[x.seedIdx].name;
  const base = {
    victim: th.victims[bp.victimIdx].name,
    scene: th.scenes[bp.sceneIdx].name,
    killer: name(killer),
    claimed: th.alibiPlaces[killer.placeIdx].name,
    weapon: th.weapons[bp.trueWeaponIdx].name,
  };
  const ev: { min: number; text: T; params?: Record<string, string | T> }[] = [];
  const has = (k: EvidenceKind) => bp.evidence.some(e => e.kind === k);
  ev.push({ min: bp.startMin, text: STORY.meeting });
  if (bp.modifier === 'blackout') ev.push({ min: bp.powerCutMin, text: STORY.powerCut });
  ev.push({ min: bp.todMin - 6, text: STORY.leaves });
  if (has('witness')) ev.push({ min: bp.witnessMin, text: STORY.witness, params: { witness: th.witnesses[bp.witnessIdx].name } });
  if (has('camera')) ev.push({ min: bp.cameraMin, text: STORY.camera, params: { source: th.cameras[bp.cameraIdx] } });
  if (has('phone')) ev.push({ min: bp.phoneMin, text: STORY.phone });
  if (bp.sighting) {
    const s = bp.suspects[bp.sighting.suspectIdx];
    ev.push({ min: bp.todMin - 1, text: STORY.sighting, params: { innocent: name(s), place: th.alibiPlaces[s.placeIdx].name, witness: th.witnesses[bp.sighting.witnessIdx].name } });
  }
  ev.push({ min: bp.todMin, text: STORY.murder });
  const trueItem = bp.evidence.find(e => e.kind === 'weapon' && e.ref === bp.trueWeaponIdx);
  if (trueItem) ev.push({ min: bp.todMin + 3, text: STORY.hides, params: { place: th.alibiPlaces[trueItem.foundPlaceIdx!].name } });
  if (bp.tampered) ev.push({ min: bp.todMin + 4, text: STORY.tampers, params: { fake: FAKE_BLOOD[bp.tampered.fakeIdx], decoy: th.weapons[bp.tampered.weaponIdx].name } });
  if (bp.planted) {
    const s = bp.suspects[bp.planted.suspectIdx];
    ev.push({ min: bp.todMin + 5, text: STORY.plants, params: { innocent: name(s), item: PLANTED_ITEMS[bp.planted.itemIdx].name } });
  }
  if (bp.accompliceIdx !== null) {
    const a = bp.suspects[bp.accompliceIdx];
    ev.push({ min: bp.receiptMin, text: STORY.receipt, params: { accomplice: name(a), place: th.alibiPlaces[bp.receiptPlaceIdx].name } });
    ev.push({ min: bp.todMin + 9, text: STORY.accomplice, params: { accomplice: name(a) } });
  }
  ev.push({ min: bp.todMin + 8, text: STORY.returns });
  if (bp.claim) {
    const s = bp.suspects[bp.claim.suspectIdx];
    ev.push({ min: bp.startMin + 45, text: STORY.claim, params: { innocent: name(s), witness: th.witnesses[bp.claim.witnessIdx].name } });
  }
  return ev
    .sort((a, b) => a.min - b.min)
    .map(e => ({ min: e.min, text: fill(e.text, lang, { ...base, ...(e.params ?? {}) }) }));
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function explainSolution(bp: Blueprint, lang: Lang): string {
  const th = THEMES[bp.theme];
  const killer = bp.suspects[bp.killerIdx];
  const text = fill(TEXT.explanation, lang, {
    killer: th.suspects[killer.seedIdx].name,
    victim: th.victims[bp.victimIdx].name,
    weapon: th.weapons[bp.trueWeaponIdx].name,
    motive: lowerFirst(MOTIVES[killer.motiveIdx].label[lang]),
    place: th.alibiPlaces[killer.placeIdx].name,
  });
  if (bp.accompliceIdx === null) return text;
  return text + fill(TEXT.explanationAccomplice, lang, {
    accomplice: th.suspects[bp.suspects[bp.accompliceIdx].seedIdx].name,
    receiptPlace: th.alibiPlaces[bp.receiptPlaceIdx].name,
  });
}

export function randomSeed(): string {
  const words = ['RAVEN', 'ASH', 'MOTH', 'IVORY', 'EMBER', 'FOG', 'VELVET', 'COBALT', 'THORN', 'SILK', 'MARIGOLD', 'NEON'];
  return `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export { THEME_KEYS };
