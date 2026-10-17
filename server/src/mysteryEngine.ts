import { MysteryCase, Suspect, EvidenceItem } from './types.js';

// ─── Seeded Pseudo-Random Number Generator (LCG) ─────────────────────────────
class SeededRandom {
  private seed: number;

  constructor(seedStr: string) {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash << 5) - hash + seedStr.charCodeAt(i);
      hash |= 0;
    }
    this.seed = Math.abs(hash) || 123456789;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  getRandom<T>(arr: T[]): T {
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
}

// ─── Per-Theme Narrative Templates ───────────────────────────────────────────
interface ThemeNarrative {
  suspectBioSuffixes: string[];
  killerFakeAlibiLocation: string;
  killerFakeAlibiTimeframe: string;
  killerCctvTitle: string;
  killerCctvDetail: (killerName: string) => string;
  innocentAlibiDetail: (innocentName: string) => string;
  motiveDocTitle: (killerName: string) => string;
  motiveDocLocation: string;
  motiveDocDetail: (killerName: string, motiveText: string) => string;
  weaponDiscoveryLocation: string;
  autopsyTitle: (victimName: string) => string;
  autopsyDetail: (victimName: string, weaponName: string) => string;
  synopsis: (victimName: string, occupation: string, location: string, numSuspects: number) => string;
}

const THEME_NARRATIVES: Record<string, ThemeNarrative> = {
  gothic: {
    suspectBioSuffixes: [
      'was a frequent visitor to the estate and was seen arguing with the victim three days prior to the incident',
      'resided in the east guest wing on the night of the murder with unrestricted access to all manor rooms',
      'held a long-standing grievance over the contested inheritance terms of the Thorne estate will',
    ],
    killerFakeAlibiLocation: 'the Grand Hotel dining room',
    killerFakeAlibiTimeframe: '9:30 PM to 11:00 PM',
    killerCctvTitle: 'CCTV Log: Grand Hotel Gate Camera',
    killerCctvDetail: (name) =>
      `${name}'s vehicle departed the Grand Hotel at 9:50 PM and returned at 10:55 PM — a 65-minute absence that directly contradicts the stated dining alibi. The concierge confirms no reservation was recorded for that evening.`,
    innocentAlibiDetail: (name) =>
      `Cross-referenced cell tower pings and a signed restaurant voucher confirm ${name} was 15 miles from the manor during the 10:00 PM to 10:30 PM murder window. Alibi VERIFIED.`,
    motiveDocTitle: (name) => `Document: ${name}'s Hidden Financial Ledger`,
    motiveDocLocation: "concealed behind a false panel in the victim's private study bookshelf",
    motiveDocDetail: (name, motive) =>
      `Handwritten ledger recording a secret debt of 450,000 pounds owed to unnamed creditors. A margin annotation reads: "Settlement by any means." Motive confirmed: ${motive}.`,
    weaponDiscoveryLocation:
      'Recovered from the manor wine cellar waste bin, wrapped in a monogrammed handkerchief',
    autopsyTitle: (victim) => `Coroner's Report: ${victim}`,
    autopsyDetail: (_victim, weapon) =>
      `Time of Death estimated between 10:10 PM and 10:30 PM. Cause: lethal exposure via ${weapon.toLowerCase()}. No defensive wounds present — victim was unaware of the approach.`,
    synopsis: (victim, occupation, location, count) =>
      `On a fog-laden evening, ${victim} (${occupation}) was discovered lifeless in the ${location}. The manor's iron gates were locked from within. ${count} individuals with access to the estate grounds are under suspicion. Cross-examine testimonies, analyze forensic specimens, and unmask the killer before dawn breaks.`,
  },

  cyber: {
    suspectBioSuffixes: [
      'held active Level-5 security clearance to all restricted server vaults and was flagged by the AI for unauthorized corridor movement at 10:05 PM',
      'recently filed a formal complaint against the victim over disputed neural-interface patent ownership',
      'was the last authenticated user to access the victim\'s encrypted research drive before the incident',
    ],
    killerFakeAlibiLocation: 'the Sub-Level 2 Biometric Lounge',
    killerFakeAlibiTimeframe: '9:15 PM to 11:30 PM',
    killerCctvTitle: 'Access Log: Sector 7 Biometric Door Scanner',
    killerCctvDetail: (name) =>
      `${name}'s retinal scan was authenticated at the Sector 7 bulkhead door at 10:02 PM, eight minutes before the estimated time of death, placing them at the scene rather than in the Biometric Lounge. A secondary badge-spoof attempt was simultaneously logged and flagged by the building AI.`,
    innocentAlibiDetail: (name) =>
      `Network session logs, AI corridor surveillance, and lounge biometric check-ins corroborate that ${name} remained inside the Biometric Lounge from 9:15 PM to 11:10 PM without interruption. Alibi CORROBORATED by three independent data sources.`,
    motiveDocTitle: (name) => `Encrypted Drive: ${name}'s Stolen IP Archive`,
    motiveDocLocation:
      "recovered from a hidden data partition on a wiped terminal in the server vault anteroom",
    motiveDocDetail: (name, motive) =>
      `Decrypted files reveal unauthorized copies of classified neural synthesis formulas and a concealed transaction history. Root access logs trace back to ${name}'s authenticated terminal session. Motive confirmed: ${motive}.`,
    weaponDiscoveryLocation:
      "Extracted from a shielded emergency compartment beneath the victim's desk console, still in an active state",
    autopsyTitle: (victim) => `Bio-Forensic Analysis Report: ${victim}`,
    autopsyDetail: (_victim, weapon) =>
      `Neural flatline confirmed at approximately 10:18 PM. Cause: targeted application of ${weapon.toLowerCase()}. No physical resistance detected — victim appears to have been remotely immobilized before final contact was made.`,
    synopsis: (victim, occupation, location, count) =>
      `At 10:22 PM, automated vital-sign monitors registered flatline for ${victim} (${occupation}), found unresponsive in the ${location}. The building AI flagged an unauthorized access event 4 minutes prior. ${count} personnel with Level-5 clearance are under active investigation. Decrypt the evidence chain and expose the operative before all logs are permanently wiped.`,
  },

  opera: {
    suspectBioSuffixes: [
      'held exclusive backstage access and was overheard threatening the victim in the dressing room corridor after the final rehearsal',
      'was spotted near the victim\'s private dressing room at approximately 10:00 PM by two separate stagehands',
      'carried a decade-long rivalry with the victim over lead performance credits, royalty shares, and the upcoming world tour contract',
    ],
    killerFakeAlibiLocation: "the Maestro's private rehearsal parlour",
    killerFakeAlibiTimeframe: '9:45 PM to 11:15 PM',
    killerCctvTitle: 'Stage Log: Backstage Movement Register',
    killerCctvDetail: (name) =>
      `The head stagehand's movement register places ${name} near Stage Door B at 10:08 PM, not in the rehearsal parlour as claimed. A second witness heard raised voices in the backstage corridor at that precise time, consistent with a confrontation.`,
    innocentAlibiDetail: (name) =>
      `Box office staff and two attending music critics confirm ${name} remained at the post-performance press gathering in the Grand Foyer from 9:50 PM through 10:50 PM. Alibi CONFIRMED by multiple independent witnesses.`,
    motiveDocTitle: (name) => `Confidential Contract: ${name}'s Disputed Royalty Amendment`,
    motiveDocLocation:
      "discovered folded inside the victim's personal score folio, left on the conductor's podium",
    motiveDocDetail: (name, motive) =>
      `A backstage contract amendment stripping ${name} of all future royalty entitlements, signed the morning of the incident. Margin notes in red ink read: "This will not stand." Motive confirmed: ${motive}.`,
    weaponDiscoveryLocation:
      'Discovered wedged beneath the orchestral pit staircase, partially concealed by a fallen velvet curtain',
    autopsyTitle: (victim) => `Medical Examiner's Report: ${victim}`,
    autopsyDetail: (_victim, weapon) =>
      `Time of Death placed between 10:05 PM and 10:25 PM. Lethal use of ${weapon.toLowerCase()} confirmed by trace analysis. The body was deliberately arranged post-mortem, a staged scene designed to delay discovery by the stage crew.`,
    synopsis: (victim, occupation, location, count) =>
      `During the standing ovation of the final act, ${victim} (${occupation}) was found unresponsive in the ${location}. The opera house was sealed immediately on police orders. ${count} individuals with unrestricted backstage access have been detained for questioning. Lift the curtain of deceit and deliver justice before the press arrives at dawn.`,
  },

  casino: {
    suspectBioSuffixes: [
      'controlled all access credentials to the high-limit gaming floor and the private elevator used by the victim on the night of the incident',
      'was observed in a heated, whispered exchange with the victim on the main casino floor at 9:55 PM',
      'had recently lost a significant stake in an off-book private arrangement with the victim and carried a documented grievance on file',
    ],
    killerFakeAlibiLocation: 'the Casino Noir Sky Lounge Bar',
    killerFakeAlibiTimeframe: '9:30 PM to 11:00 PM',
    killerCctvTitle: 'Surveillance Reel: Casino Floor Cameras 7 and 11',
    killerCctvDetail: (name) =>
      `Casino floor surveillance cameras 7 and 11 capture ${name} exiting via the private elevator at 10:01 PM, not seated at the Sky Lounge as claimed. Elevator access logs document a 22-minute gap in their verified whereabouts with no corroborating witnesses.`,
    innocentAlibiDetail: (name) =>
      `Dealer testimony, chip-tracking records, and two croupier witnesses confirm ${name} was actively at Table 14 from 9:30 PM through 10:55 PM without interruption. Alibi VERIFIED by casino surveillance.`,
    motiveDocTitle: (name) => `Encrypted USB: ${name}'s Offshore Transaction Archive`,
    motiveDocLocation:
      "retrieved from a concealed magnetic slot inside a hollow casino chip found in the victim's jacket pocket",
    motiveDocDetail: (name, motive) =>
      `Decrypted files contain a ledger of undisclosed offshore wire transfers totaling over 2.3 million dollars, traced to ${name}'s shell accounts. The final entry is dated the morning of the murder. Motive confirmed: ${motive}.`,
    weaponDiscoveryLocation:
      'Located inside a sealed champagne cooler in the VIP High-Limit Suite, reported anonymously to housekeeping',
    autopsyTitle: (victim) => `Forensic Pathology Report: ${victim}`,
    autopsyDetail: (_victim, weapon) =>
      `Time of Death bracketed between 10:08 PM and 10:25 PM. ${weapon} confirmed as the lethal instrument. Toxicology flagged a secondary incapacitating compound in the victim's glass, administered prior to the fatal event.`,
    synopsis: (victim, occupation, location, count) =>
      `Security personnel discovered ${victim} (${occupation}) unresponsive in the ${location} at 10:45 PM. The private wing had been locked from inside using a stolen master keycard. ${count} guests and staff members with unrestricted access are under immediate suspicion. Follow the money, break the alibis, and make the arrest before the evidence vanishes into the vault.`,
  },

  express: {
    suspectBioSuffixes: [
      'occupied the directly adjoining compartment and was reportedly the last person seen in conversation with the victim before 10:00 PM',
      'possessed the master passkey for all sleeping cars and was logged moving through multiple carriages between 9:50 PM and 10:30 PM',
      'was carrying sealed diplomatic correspondence that the victim had reportedly threatened to intercept and expose to foreign authorities',
    ],
    killerFakeAlibiLocation: 'the Rear Dining Car',
    killerFakeAlibiTimeframe: '9:40 PM to 11:10 PM',
    killerCctvTitle: "Conductor's Log: Sealed Passenger Movement Record",
    killerCctvDetail: (name) =>
      `The conductor's sealed log places ${name} passing through Compartment Car 3 at 10:06 PM, the carriage directly adjacent to the victim's berth, rather than in the Rear Dining Car as stated. A passenger in Compartment 5-A reports hearing a muffled altercation at that precise hour.`,
    innocentAlibiDetail: (name) =>
      `Dining car steward records, a signed dinner chit, and two fellow diners confirm ${name} remained seated in the dining carriage from 9:40 PM to 10:55 PM. Alibi SUBSTANTIATED by physical receipts and witness testimony.`,
    motiveDocTitle: (name) => `Sealed Dossier: ${name}'s Intercepted Diplomatic Dispatch`,
    motiveDocLocation:
      "discovered inside the victim's locked leather attache case in Compartment 3-B",
    motiveDocDetail: (name, motive) =>
      `An intercepted dispatch bearing a foreign embassy seal, addressed to ${name}, containing covert instructions and a classified payment schedule. Recovery of this document by the victim gave ${name} an acute motive to silence them permanently. Motive confirmed: ${motive}.`,
    weaponDiscoveryLocation:
      'Found wrapped in a silk handkerchief, concealed beneath a loose teak floor panel in Compartment 4-A',
    autopsyTitle: (victim) => `Train Physician's Examination: ${victim}`,
    autopsyDetail: (_victim, weapon) =>
      `Death occurred between 10:00 PM and 10:20 PM, confirmed by body temperature and rigor progression. ${weapon} identified as the primary cause. The compartment showed deliberate staging, personal effects rearranged to suggest a natural death and delay the alarm.`,
    synopsis: (victim, occupation, location, count) =>
      `Snowbound in an Alpine pass, the Orient Express came to an unscheduled halt as ${victim} (${occupation}) was found deceased in the ${location}. With no exits and no communications, the killer is still on board. ${count} passengers with documented access to the victim's compartment are under investigation. Question every witness, dissect every alibi, and name the killer before the train reaches the next station.`,
  },
};

// ─── Static Data Pools ────────────────────────────────────────────────────────
const THEMES = {
  gothic: {
    titles: ["The Poisoned Decanter at Blackwood Manor", "The Alchemist's Sealed Laboratory", "The Crimson Thread at Thorne Hall"],
    victimNames: ["Arthur Pendelton", "Eleanor Vance", "Baron Hector Thorne"],
    occupations: ["Antiques Collector & Wealthy Philanthropist", "High-Society Art Dealer", "Industrial Shipping Tycoon"],
    locations: ["Private Library, 2nd Floor Study", "Underground Wine Cellar", "Conservatory Glasshouse"]
  },
  cyber: {
    titles: ["Cybertech Syndicate Homicide", "The Glitch in Sector 7", "Decommissioned AI Protocol Murder"],
    victimNames: ["Dr. Kaelen Voss", "Seraphina Lin", "Director Marcus Kane"],
    occupations: ["Chief Neural Engineer", "Quantum Data Broker", "Synthetic Bio-Tech CEO"],
    locations: ["Sub-Level 4 Server Vault", "Penthouse Hologram Suite", "Neo-Tokyo Research Deck"]
  },
  opera: {
    titles: ["The Silent Maestro's Final Encore", "Betrayal at the Velvet Opera", "The Midnight Aria Stabbing"],
    victimNames: ["Maestro Julian Mercer", "Vivian Montgomery", "Clara Bellini"],
    occupations: ["Philharmonic Conductor", "Prima Donna Soprano", "Opera House Benefactor"],
    locations: ["VIP Backstage Dressing Room", "Grand Balcony Suite 1", "Understage Orchestra Pit"]
  },
  casino: {
    titles: ["The High-Roller's Poisoned Martini", "Roulette Room Homicide at Casino Noir", "The Vault Keycard Betrayal"],
    victimNames: ["Vincent Lucky Sterling", "Lady Cassandra Dupont", "Dominic Vance"],
    occupations: ["Casino Syndicate Franchisee", "High-Stakes Baccarat Dealer", "Offshore Casino Managing Partner"],
    locations: ["VIP High-Limit Suite 777", "Underground Vault Security Office", "Private Rooftop Lounge"]
  },
  express: {
    titles: ["First-Class Coupe Murder on the Orient Express", "The Snowbound Engine Stabbing", "Diplomatic Pouch Secret Homicide"],
    victimNames: ["Ambassador Montgomery Bell", "Duchess Helene Vane", "Captain Sterling Thorne"],
    occupations: ["Special Envoy Diplomat", "European Royal Beneficiary", "Retired Imperial Guard Captain"],
    locations: ["Compartment 3-B, Orient Express", "Rear Dining Car Kitchen", "Observation Deck Salon"]
  }
};

const SUSPECT_POOL = [
  { name: "Dr. Evelyn Reed",  role: "Personal Physician",   color: "#e74c3c" },
  { name: "Julian Thorne",    role: "Disinherited Nephew",  color: "#3498db" },
  { name: "Clara Bell",       role: "Private Secretary",    color: "#2ecc71" },
  { name: "Marcus Vance",     role: "Business Rival",       color: "#f39c12" },
  { name: "Genevieve Noir",   role: "Art Companion",        color: "#9b59b6" },
  { name: "Garrison Ford",    role: "Head Security",        color: "#34495e" }
];

const WEAPONS = [
  { name: "Cyanide-Laced Vintage Port Decanter", type: "toxicology" },
  { name: "Engraved Brass Stiletto Dagger",       type: "ballistics" },
  { name: "Heavy Obsidian Desk Paperweight",      type: "fingerprint" },
  { name: "Modified Syringe containing Digitalis", type: "autopsy" }
];

const MOTIVES = [
  "Forged Will changing the estate beneficiary to 100% of holdings",
  "Blackmail documents regarding embezzlement of millions in offshore funds",
  "Secret romantic affair revealed in stolen private letters",
  "Patent theft regarding a revolutionary synthetic formula"
];

const VICTIM_AGES = [49, 52, 54, 57, 61, 63];

// ─── Generator ───────────────────────────────────────────────────────────────
export function generateMysteryCase(
  difficulty: 'Novice' | 'Detective' | 'Mastermind' = 'Detective',
  themeKey: 'gothic' | 'cyber' | 'opera' | 'casino' | 'express' = 'gothic',
  customSeed?: string
): MysteryCase {
  const seedStr = customSeed || `seed-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const rng = new SeededRandom(seedStr);
  const theme = THEMES[themeKey] || THEMES.gothic;
  const narrative = THEME_NARRATIVES[themeKey] || THEME_NARRATIVES.gothic;

  const caseId = `case-${seedStr}`;
  const title            = rng.getRandom(theme.titles);
  const victimName       = rng.getRandom(theme.victimNames);
  const victimOccupation = rng.getRandom(theme.occupations);
  const victimLocation   = rng.getRandom(theme.locations);
  const victimAge        = rng.getRandom(VICTIM_AGES);

  const numSuspects = difficulty === 'Mastermind' ? 5 : 4;
  const chosenSuspectsRaw = rng.shuffle(SUSPECT_POOL).slice(0, numSuspects);
  const killerIndex = Math.floor(rng.next() * numSuspects);

  const suspects: Suspect[] = chosenSuspectsRaw.map((s, idx) => ({
    id: `suspect-${idx + 1}`,
    name: s.name,
    role: s.role,
    bio: `${s.name} served as ${victimName}'s ${s.role}. ${rng.getRandom(narrative.suspectBioSuffixes)}.`,
    statedAlibi: idx === killerIndex
      ? `Claims to have been in ${narrative.killerFakeAlibiLocation} from ${narrative.killerFakeAlibiTimeframe}, with no witnesses who can corroborate the account.`
      : `States they were attending the public lecture at Town Hall until 10:45 PM, supported by several attendees.`,
    isKiller: idx === killerIndex,
    avatarColor: s.color,
    photoStyle: `polaroid-${idx + 1}`
  }));

  const killer         = suspects[killerIndex];
  const innocentSuspects = suspects.filter(s => !s.isKiller);
  const weaponObj      = rng.getRandom(WEAPONS);
  const motiveText     = rng.getRandom(MOTIVES);

  const evidenceList: EvidenceItem[] = [];

  // Key Motive Clue -> Lead Detective (P1)
  const motiveEvId = `ev-motive-${killer.id}`;
  evidenceList.push({
    id: motiveEvId,
    title: narrative.motiveDocTitle(killer.name),
    type: 'witness_statement',
    assignedRole: 'lead',
    summary: `Found ${narrative.motiveDocLocation}.`,
    details: narrative.motiveDocDetail(killer.name, motiveText),
    relatedSuspectId: killer.id,
    isKeyEvidence: true,
    tag: 'Motive',
    iconType: 'file-text'
  });

  // Key Weapon Clue -> Forensic Analyst (P2)
  const weaponEvId = `ev-weapon-${killer.id}`;
  evidenceList.push({
    id: weaponEvId,
    title: `Forensic Specimen: ${weaponObj.name}`,
    type: weaponObj.type as any,
    assignedRole: 'analyst',
    summary: `${narrative.weaponDiscoveryLocation}.`,
    details: `Physical analysis confirms trace residue matching victim's blood and tissue. A partial fingerprint ridge pattern on the instrument's handle is consistent with ${killer.name}'s on-file biometric profile.`,
    relatedSuspectId: killer.id,
    isKeyEvidence: true,
    tag: 'Murder Weapon',
    iconType: 'flask-conical'
  });

  // Key Alibi Contradiction -> Lead Detective (P1)
  const contradictionEvId = `ev-alibi-${killer.id}`;
  evidenceList.push({
    id: contradictionEvId,
    title: narrative.killerCctvTitle,
    type: 'cctv_report',
    assignedRole: 'lead',
    summary: `Time-stamped movement record — direct alibi contradiction.`,
    details: narrative.killerCctvDetail(killer.name),
    relatedSuspectId: killer.id,
    isKeyEvidence: true,
    tag: 'Contradiction',
    iconType: 'video'
  });

  // Coroner Autopsy -> Forensic Analyst (P2)
  evidenceList.push({
    id: `ev-autopsy-victim`,
    title: narrative.autopsyTitle(victimName),
    type: 'autopsy',
    assignedRole: 'analyst',
    summary: `Official forensic examination of the deceased.`,
    details: narrative.autopsyDetail(victimName, weaponObj.name),
    isKeyEvidence: false,
    tag: 'Timeline',
    iconType: 'stethoscope'
  });

  // Innocent Suspect Alibis & Lab Scans
  innocentSuspects.forEach((innocent, idx) => {
    evidenceList.push({
      id: `ev-innocent-${idx}-1`,
      title: `Statement: Alibi Verification — ${innocent.name}`,
      type: idx % 2 === 0 ? 'witness_statement' : 'phone_log',
      assignedRole: 'lead',
      summary: `Verified alibi — cross-referenced location data.`,
      details: narrative.innocentAlibiDetail(innocent.name),
      relatedSuspectId: innocent.id,
      isKeyEvidence: false,
      tag: 'Fake Alibi',
      iconType: 'user-check'
    });

    evidenceList.push({
      id: `ev-innocent-${idx}-2`,
      title: `Lab Print Scan: ${innocent.name}`,
      type: 'fingerprint',
      assignedRole: 'analyst',
      summary: `Surface swab analysis from the crime scene vicinity.`,
      details: `Fingerprint ridges belonging to ${innocent.name} were recovered from the door handle. Chemical reagent dating confirms the prints were deposited over 48 hours before the incident during routine access, ruling out presence at time of death.`,
      relatedSuspectId: innocent.id,
      isKeyEvidence: false,
      tag: 'Timeline',
      iconType: 'fingerprint'
    });
  });

  const solutionGraph = {
    killerId: killer.id,
    killerName: killer.name,
    motiveEvidenceId: motiveEvId,
    weaponEvidenceId: weaponEvId,
    alibiContradictionEvidenceId: contradictionEvId,
    explanation: `${killer.name} murdered ${victimName} using ${weaponObj.name}. Motive: ${motiveText}. Their stated alibi at ${narrative.killerFakeAlibiLocation} was disproved by ${narrative.killerCctvTitle}.`
  };

  return {
    id: caseId,
    title: `${title} [SEED: ${seedStr}]`,
    difficulty,
    victim: {
      name: victimName,
      age: victimAge,
      occupation: victimOccupation,
      timeOfDeath: "10:10 PM to 10:30 PM",
      location: victimLocation
    },
    synopsis: narrative.synopsis(victimName, victimOccupation, victimLocation, numSuspects),
    suspects,
    evidenceList,
    solutionGraph
  };
}
