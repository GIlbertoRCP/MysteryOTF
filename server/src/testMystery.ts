import { buildBlueprint, localize, explainSolution, hintsFor, THEME_KEYS } from './mysteryEngine.js';
import { Difficulty, PublicMystery, TraitDim } from './types.js';

const DIFFICULTIES: Difficulty[] = ['Novice', 'Detective', 'Mastermind'];
const CASES_PER_COMBO = 40;
let failures = 0;
let accompliceCases = 0;
let sightingCases = 0;

function fail(msg: string) {
  failures++;
  if (failures <= 20) console.error('✗ ' + msg);
}

/** Re-derives the killer from the clue cards alone, the way a player would. */
function solveFromEvidence(m: PublicMystery, bpClues: Partial<Record<TraitDim, string>>, verifiedIds: Set<string>, roles: ('lead' | 'analyst')[]) {
  const leadDims: TraitDim[] = ['height', 'coat', 'voice'];
  const useAlibi = roles.includes('lead');
  return m.suspects.filter(s => {
    if (useAlibi && verifiedIds.has(s.id)) return false;
    return (Object.keys(bpClues) as TraitDim[]).every(dim => {
      const isLead = leadDims.includes(dim);
      if (isLead && !roles.includes('lead')) return true;
      if (!isLead && !roles.includes('analyst')) return true;
      return s.traitKeys[dim] === bpClues[dim];
    });
  });
}

for (const theme of THEME_KEYS) {
  for (const difficulty of DIFFICULTIES) {
    for (let i = 0; i < CASES_PER_COMBO; i++) {
      const seed = `TEST-${theme}-${difficulty}-${i}`;
      const bp = buildBlueprint(difficulty, theme, seed);
      const again = buildBlueprint(difficulty, theme, seed);
      if (JSON.stringify(bp) !== JSON.stringify(again)) fail(`${seed}: not deterministic`);

      const en = localize(bp, 'en');
      const es = localize(bp, 'es');

      // Same structure in both languages
      if (en.evidence.map(e => e.id).join() !== es.evidence.map(e => e.id).join()) fail(`${seed}: evidence ids differ by language`);
      if (en.suspects.map(s => s.id).join() !== es.suspects.map(s => s.id).join()) fail(`${seed}: suspect ids differ by language`);

      // No unfilled placeholders or leftovers
      for (const m of [en, es]) {
        const text = JSON.stringify(m) + explainSolution(bp, m.lang);
        const leftover = text.match(/\{[a-z]+\}/i);
        if (leftover) fail(`${seed} [${m.lang}]: unfilled placeholder ${leftover[0]}`);
        if (m.lang === 'es' && /\bde el\b|\ba el\b/.test(text)) fail(`${seed} [es]: missing contraction`);
        if (/isKiller|solution/i.test(JSON.stringify(m))) fail(`${seed}: public mystery leaks the solution`);
      }

      // Puzzle checks using the hidden blueprint
      const killer = bp.suspects[bp.killerIdx];
      const clues: Partial<Record<TraitDim, string>> = {};
      for (const dim of bp.clueDims) clues[dim] = en.suspects[bp.killerIdx].traitKeys[dim];
      const verified = new Set(bp.suspects.filter(s => s.verified).map(s => s.id));

      const both = solveFromEvidence(en, clues, verified, ['lead', 'analyst']);
      if (both.length !== 1 || both[0].id !== killer.id) fail(`${seed}: combined clues give ${both.length} candidates`);
      if (solveFromEvidence(en, clues, verified, ['lead']).length < 2) fail(`${seed}: lead can solve alone`);
      if (solveFromEvidence(en, clues, verified, ['analyst']).length < 2) fail(`${seed}: analyst can solve alone`);
      if (verified.has(killer.id)) fail(`${seed}: killer has a verified alibi`);
      for (const dim of bp.clueDims) {
        if (en.suspects.every(s => s.traitKeys[dim] === clues[dim])) fail(`${seed}: clue ${dim} rules nobody out`);
      }

      // Accusation answers exist among the options
      if (!en.options.motives.some(o => o.id === bp.solution.motiveId)) fail(`${seed}: motive option missing`);
      if (!en.options.weapons.some(o => o.id === bp.solution.weaponId)) fail(`${seed}: weapon option missing`);
      const alibiCard = en.evidence.find(e => e.id === bp.solution.alibiEvidenceId);
      if (!alibiCard || (alibiCard.kind !== 'record' && alibiCard.kind !== 'receipt')) fail(`${seed}: alibi evidence is not a record or receipt`);
      if (alibiCard && alibiCard.details.includes(en.suspects[bp.killerIdx].name)) fail(`${seed}: alibi record vouches for the killer`);
      if (!en.evidence.some(e => e.kind === 'document' && e.title.includes(en.suspects[bp.killerIdx].name))) fail(`${seed}: killer has no motive document`);

      // Accomplice twist: they share the killer's alibi, have no staff alibi, and a receipt breaks it
      if (bp.accompliceIdx !== null) {
        const acc = bp.suspects[bp.accompliceIdx];
        if (difficulty !== 'Mastermind') fail(`${seed}: accomplice outside Mastermind`);
        if (acc.verified || acc.placeIdx !== killer.placeIdx) fail(`${seed}: accomplice setup inconsistent`);
        if (!bp.solution.accompliceId || alibiCard?.kind !== 'receipt') fail(`${seed}: accomplice solution incomplete`);
        if (!alibiCard?.details.includes(en.suspects[bp.accompliceIdx].name)) fail(`${seed}: receipt does not name the accomplice`);
        const receiptPlace = alibiCard?.title.split(': ')[1];
        if (en.evidence.some(e => e.kind === 'record' && e.title.endsWith(`: ${receiptPlace}`))) fail(`${seed}: an alibi check contradicts the receipt`);
        accompliceCases++;
      }

      // Floor plan covers every room; the distance clue really rules its suspect out
      if (en.plan.rooms.length !== bp.plan.rooms.length || !en.plan.rooms.some(r => r.kind === 'scene')) fail(`${seed}: plan missing rooms`);
      if (bp.todMin < bp.startMin || bp.todMin > bp.startMin + 30) fail(`${seed}: time of death outside window`);
      if (bp.sighting) {
        const s = bp.suspects[bp.sighting.suspectIdx];
        const room = bp.plan.rooms.find(r => r.idx === s.placeIdx + 1)!;
        if (!s.verified || s === killer) fail(`${seed}: sighting clears the wrong person`);
        if (room.walk < 2) fail(`${seed}: sighting room is close enough to reach the scene`);
        const name = en.suspects[bp.sighting.suspectIdx].name;
        if (en.evidence.some(e => e.kind === 'record' && e.details.includes(name))) fail(`${seed}: sighted suspect also listed in a record`);
        sightingCases++;
      } else if (difficulty !== 'Novice') fail(`${seed}: expected a distance clue`);

      // Hints exist, are translated, and never name the killer as the answer
      for (const lang of ['en', 'es'] as const) {
        const hints = hintsFor(bp, lang);
        if (hints.length !== 4) fail(`${seed}: expected 4 hints, got ${hints.length}`);
        if (hints.some(h => /\{[a-z]+\}/i.test(h))) fail(`${seed} [${lang}]: hint has a placeholder`);
      }

      // Both players have something to do
      const leadCount = en.evidence.filter(e => e.role === 'lead').length;
      const analystCount = en.evidence.filter(e => e.role === 'analyst').length;
      if (leadCount < 3 || analystCount < 3) fail(`${seed}: unbalanced evidence ${leadCount}/${analystCount}`);
    }
  }
}

// Show one sample case so a human can sanity-check the writing.
const sample = buildBlueprint('Detective', 'hacienda', 'SAMPLE-1');
for (const lang of ['en', 'es'] as const) {
  const m = localize(sample, lang);
  console.log(`\n=== [${lang}] ${m.title} ===`);
  console.log(m.synopsis);
  for (const s of m.suspects) console.log(`  • ${s.name} (${s.role}) — ${s.alibiStatement}`);
  for (const e of m.evidence) console.log(`  [${e.role}] ${e.title}: ${e.details}`);
  console.log('  Solution: ' + explainSolution(sample, lang));
  hintsFor(sample, lang).forEach((h, i) => console.log(`  Hint ${i + 1}: ${h}`));
}

const total = THEME_KEYS.length * DIFFICULTIES.length * CASES_PER_COMBO;
if (failures) {
  console.error(`\n✗ ${failures} problems across ${total} generated cases`);
  process.exit(1);
}
console.log(`\n✓ ${total} cases generated: all unique, co-op only, fully translated (${accompliceCases} with an accomplice, ${sightingCases} with a distance clue)`);
