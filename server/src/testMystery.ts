import { generateMysteryCase } from './mysteryEngine.js';

console.log("=== Testing Procedural Mystery Generator Engine ===");
const mystery = generateMysteryCase('Detective');
console.log(`Generated Case Title: "${mystery.title}"`);
console.log(`Victim: ${mystery.victim.name} (${mystery.victim.occupation})`);
console.log(`Suspects Count: ${mystery.suspects.length}`);
console.log(`Evidence Items Count: ${mystery.evidenceList.length}`);

const p1Items = mystery.evidenceList.filter(e => e.assignedRole === 'lead');
const p2Items = mystery.evidenceList.filter(e => e.assignedRole === 'analyst');

console.log(`P1 (Lead Detective) Clues: ${p1Items.length}`);
console.log(`P2 (Forensic Analyst) Clues: ${p2Items.length}`);

console.log(`Solution Graph:
  - Killer: ${mystery.solutionGraph.killerName} (${mystery.solutionGraph.killerId})
  - Motive Evidence ID: ${mystery.solutionGraph.motiveEvidenceId}
  - Weapon Evidence ID: ${mystery.solutionGraph.weaponEvidenceId}
  - Alibi Contradiction Evidence ID: ${mystery.solutionGraph.alibiContradictionEvidenceId}
`);

if (p1Items.length > 0 && p2Items.length > 0 && mystery.solutionGraph.killerId) {
  console.log("✓ Procedural Mystery Engine Validation PASSED!");
} else {
  console.error("✗ Validation FAILED!");
  process.exit(1);
}
