import {
  Difficulty, EvidenceKind, Lang, PublicEvidence, PublicMystery, PublicSuspect, Role, Solution, ThemeKey, TraitDim,
} from './types.js';
import {
  ANALYST_DIMS, CAUSES, LEAD_DIMS, MOTIVES, T, TEXT, TRAITS, fill,
} from './content/common.js';
import { THEMES, THEME_KEYS } from './content/themes.js';

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
  suspects: BlueprintSuspect[];
  killerIdx: number;
  clueDims: TraitDim[];
  slip: boolean;
  weapons: { weaponIdx: number; optionId: string }[];
  trueWeaponIdx: number;
  evidence: BlueprintEvidence[];
  solution: Solution;
}

const DIFFICULTY = {
  Novice: { suspects: 4, verified: 1, places: 3, weapons: 3, extraMotiveDocs: 1, slip: true, frame: false, prefer: 'max' },
  Detective: { suspects: 5, verified: 2, places: 3, weapons: 3, extraMotiveDocs: 2, slip: true, frame: true, prefer: 'min+1' },
  Mastermind: { suspects: 6, verified: 2, places: 4, weapons: 4, extraMotiveDocs: 99, slip: false, frame: true, prefer: 'min' },
} as const;

function matching(suspects: BlueprintSuspect[], killer: BlueprintSuspect, dims: TraitDim[], useAlibi: boolean): number {
  return suspects.filter(s => {
    if (useAlibi && s.verified) return false;
    return dims.every(d => s.traits[d] === killer.traits[d]);
  }).length;
}

function chooseClueDims(rng: SeededRandom, suspects: BlueprintSuspect[], killer: BlueprintSuspect, prefer: string): TraitDim[] | null {
  const valid: TraitDim[][] = [];
  for (let mask = 1; mask < 1 << ALL_DIMS.length; mask++) {
    const dims = ALL_DIMS.filter((_, i) => mask & (1 << i));
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
    clueDims = chooseClueDims(rng, suspects, suspects[killerIdx], cfg.prefer);
  }
  if (!clueDims) clueDims = [...ALL_DIMS]; // practically unreachable

  // Ids are random so they never leak the answer.
  for (const s of suspects) {
    s.id = rng.id('s');
    s.age = rng.int(24, 70);
    s.motiveOptionId = rng.id('m');
  }
  const killer = suspects[killerIdx];

  // Interview flavour: one innocent may confirm the habit clue, the killer may frame someone.
  const innocentIdxs = suspects.map((_, i) => i).filter(i => i !== killerIdx);
  if (clueDims.includes('habit')) suspects[rng.pick(innocentIdxs)].noticed = 'true';
  if (cfg.frame) {
    killer.noticed = 'frame';
    killer.frameTargetIdx = rng.pick(innocentIdxs);
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
    suspects,
    killerIdx,
    clueDims,
    slip: cfg.slip,
    weapons,
    trueWeaponIdx,
    evidence: rng.shuffle(evidence),
    solution: {
      killerId: killer.id,
      motiveId: killer.motiveOptionId,
      weaponId: trueWeaponOption.optionId,
      alibiEvidenceId,
    },
  };
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
      alibiStatement: fill(TEXT.alibiStatement, lang, { ...base, place: place.name }),
      traits,
      traitKeys,
      interview: [
        { q: fill(TEXT.qWhere, lang, base), a: fill(TEXT.aWhere, lang, { ...base, place: place.name }) },
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
    const out = (title: string, summary: string, details: string): PublicEvidence => ({
      id: e.id, role: e.role, kind: e.kind, title, summary, details,
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
          fill(TEXT.autopsyDetails, lang, { ...base, cause })
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
        const confirmed = bp.suspects.filter(s => s.verified && s.placeIdx === e.ref).map(nameOf);
        const params = { ...base, place: place.name, names: joinNames(confirmed, lang) };
        return out(
          fill(TEXT.recordTitle, lang, { place: place.label }),
          fill(TEXT.recordSummary, lang, params),
          fill(confirmed.length ? TEXT.recordWithNames : TEXT.recordEmpty, lang, params)
        );
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
        return out(fill(TEXT.weaponTitle, lang, params), fill(TEXT.weaponSummary, lang, params), fill(TEXT.weaponDetails, lang, params));
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
    },
    synopsis: fill(th.synopsis, lang, { ...base, occupation: victim.occupation, count: String(bp.suspects.length) }),
    suspects,
    evidence,
    options: { motives: motiveOptions, weapons: weaponOptions },
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

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function explainSolution(bp: Blueprint, lang: Lang): string {
  const th = THEMES[bp.theme];
  const killer = bp.suspects[bp.killerIdx];
  return fill(TEXT.explanation, lang, {
    killer: th.suspects[killer.seedIdx].name,
    victim: th.victims[bp.victimIdx].name,
    weapon: th.weapons[bp.trueWeaponIdx].name,
    motive: lowerFirst(MOTIVES[killer.motiveIdx].label[lang]),
    place: th.alibiPlaces[killer.placeIdx].name,
  });
}

export function randomSeed(): string {
  const words = ['RAVEN', 'ASH', 'MOTH', 'IVORY', 'EMBER', 'FOG', 'VELVET', 'COBALT', 'THORN', 'SILK', 'MARIGOLD', 'NEON'];
  return `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export { THEME_KEYS };
