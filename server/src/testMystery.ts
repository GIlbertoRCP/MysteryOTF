import { buildBlueprint, localize, explainSolution, hintsFor, confront, searchSpot, storyFor, THEME_KEYS } from './mysteryEngine.js';
import { Difficulty, PublicMystery, TraitDim } from './types.js';

const DIFFICULTIES: Difficulty[] = ['Novice', 'Detective', 'Mastermind'];
const CASES_PER_COMBO = 40;
let failures = 0;
let accompliceCases = 0;
let sightingCases = 0;
let plantedCases = 0;
let claimCases = 0;
let lateCases = 0;
const modifierCases = { blackout: 0, storm: 0, tampered: 0 };

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

      // Twists stay fair
      if (bp.planted) {
        if (bp.planted.suspectIdx === bp.killerIdx || bp.planted.suspectIdx === bp.accompliceIdx) fail(`${seed}: planted item frames the wrong person`);
        plantedCases++;
      }
      if (bp.claim) {
        const accused = bp.suspects[bp.claim.suspectIdx];
        const name = en.suspects[bp.claim.suspectIdx].name;
        if (!accused.verified || bp.claim.suspectIdx === bp.killerIdx) fail(`${seed}: false witness accuses someone uncleared`);
        if (!en.evidence.some(e => e.kind === 'record' && e.details.includes(name))) fail(`${seed}: no record clears the falsely accused`);
        claimCases++;
      }
      if (bp.lateEvidenceId) {
        const late = bp.evidence.find(e => e.id === bp.lateEvidenceId);
        if (!late || !['witness', 'camera', 'phone', 'smudge', 'shoeprint', 'trace', 'scrapings'].includes(late.kind)) fail(`${seed}: bad late lead`);
        lateCases++;
      }

      // Confrontations: no clue makes the killer confess outright, and each crack is the right one
      for (const e of bp.evidence) {
        const onKiller = confront(bp, killer.id, e.id, 'en')!;
        if (onKiller.kind === 'confess' || onKiller.kind === 'cleared') fail(`${seed}: killer cracks as innocent on ${e.kind}`);
        for (const lang of ['en', 'es'] as const) {
          for (const sus of bp.suspects) {
            const o = confront(bp, sus.id, e.id, lang)!;
            if (/\{[a-z]+\}/i.test(o.line)) fail(`${seed} [${lang}]: confrontation line has a placeholder`);
            if (o.kind === 'confess' && (bp.accompliceIdx === null || bp.suspects[bp.accompliceIdx].id !== sus.id)) fail(`${seed}: someone other than the accomplice confesses`);
          }
        }
      }
      if (bp.accompliceIdx !== null) {
        const receipt = bp.evidence.find(e => e.kind === 'receipt')!;
        if (confront(bp, bp.suspects[bp.accompliceIdx].id, receipt.id, 'en')!.kind !== 'confess') fail(`${seed}: accomplice doesn't crack on the receipt`);
      }

      // Modifiers really change the case
      if (bp.modifier) modifierCases[bp.modifier]++;
      if (bp.modifier === 'blackout' && bp.evidence.some(e => e.kind === 'camera')) fail(`${seed}: camera clue during a blackout`);
      if (bp.modifier === 'storm' && bp.evidence.some(e => e.kind === 'shoeprint')) fail(`${seed}: shoeprint during a storm`);
      if (bp.tampered) {
        if (bp.tampered.weaponIdx === bp.trueWeaponIdx) fail(`${seed}: the tampered decoy is the real weapon`);
        const decoy = en.evidence.find(e => e.kind === 'weapon' && e.weapon?.key && e.details.includes('Someone wanted this to look used'));
        if (!decoy) fail(`${seed}: tampered decoy doesn't explain itself`);
      }
      if (en.modifier && /\{[a-z]+\}/i.test(en.modifier.note + es.modifier!.note)) fail(`${seed}: modifier note has a placeholder`);

      // Every recovered item can be found by searching the floor plan
      for (const item of en.evidence.filter(e => e.kind === 'weapon')) {
        if (!item.spotId) { fail(`${seed}: item without a hiding spot`); continue; }
        const result = searchSpot(bp, item.spotId, 'es');
        if (!result || !result.found.includes(item.id)) fail(`${seed}: searching ${item.spotId} doesn't find the item`);
      }
      for (const room of en.plan.rooms) if (room.spots.length !== 2) fail(`${seed}: room without two spots`);

      // Follow-ups and the true story are complete in both languages
      for (const lang of ['en', 'es'] as const) {
        const story = storyFor(bp, lang);
        if (story.some(e => /\{[a-z]+\}/i.test(e.text))) fail(`${seed} [${lang}]: story has a placeholder`);
        if (!story.some(e => e.min === bp.todMin)) fail(`${seed}: story misses the murder`);
        for (const e of bp.evidence) for (const sus of bp.suspects) {
          const o = confront(bp, sus.id, e.id, lang)!;
          if (o.followUp && /\{[a-z]+\}/i.test(o.followUp.q + o.followUp.a)) fail(`${seed} [${lang}]: follow-up has a placeholder`);
        }
      }
      const killerDoc = bp.evidence.find(e => e.kind === 'document' && e.ref === bp.killerIdx);
      if (killerDoc) {
        const o = confront(bp, killer.id, killerDoc.id, 'en')!;
        if (!o.followUp || !o.followUp.a.includes('closer look')) fail(`${seed}: the killer's follow-up should deflect, not help`);
      }

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
console.log(`\n✓ ${total} cases generated: all unique, co-op only, fully translated (${accompliceCases} with an accomplice, ${sightingCases} with a distance clue, ${plantedCases} planted items, ${claimCases} false witnesses, ${lateCases} late leads; modifiers: ${JSON.stringify(modifierCases)})`);
