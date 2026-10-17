export type Role = 'lead' | 'analyst';

export interface Suspect {
  id: string;
  name: string;
  role: string;
  bio: string;
  statedAlibi: string;
  isKiller: boolean;
  avatarColor: string;
  photoStyle: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  type: 'witness_statement' | 'autopsy' | 'toxicology' | 'cctv_report' | 'fingerprint' | 'phone_log';
  assignedRole: Role;
  summary: string;
  details: string;
  relatedSuspectId?: string;
  isKeyEvidence: boolean;
  tag: 'Motive' | 'Contradiction' | 'Murder Weapon' | 'Fake Alibi' | 'Timeline';
  iconType?: string;
}

export interface MysteryCase {
  id: string;
  title: string;
  difficulty: 'Novice' | 'Detective' | 'Mastermind';
  victim: {
    name: string;
    age: number;
    occupation: string;
    timeOfDeath: string;
    location: string;
  };
  synopsis: string;
  suspects: Suspect[];
  evidenceList: EvidenceItem[];
  solutionGraph: {
    killerId: string;
    killerName: string;
    motiveEvidenceId: string;
    weaponEvidenceId: string;
    alibiContradictionEvidenceId: string;
    explanation: string;
  };
}

export interface BoardCard {
  id: string;
  evidenceId: string;
  title: string;
  type: EvidenceItem['type'];
  role: Role;
  x: number;
  y: number;
  rotation: number;
  placedBy: string;
  placedAt: number;
  details?: string;
  iconType?: string;
  statusTag?: 'prime_suspect' | 'verified_innocent' | 'key_clue' | 'unverified';
}

export interface BoardString {
  id: string;
  fromCardId: string;
  toCardId: string;
  label: 'Motive' | 'Contradiction' | 'Murder Weapon' | 'Accomplice' | 'Alibi' | 'Timeline' | 'Fake Alibi' | 'Suspicious Link';
  color: string;
  createdBy: string;
}

export interface Player {
  socketId: string;
  name: string;
  role: Role;
}

export interface RoomState {
  roomCode: string;
  mystery: MysteryCase;
  players: Record<string, Player>;
  cards: Record<string, BoardCard>;
  strings: Record<string, BoardString>;
  createdAt: number;
}

export interface AccusationSubmission {
  suspectId: string;
  motiveEvidenceId: string;
  weaponEvidenceId: string;
  alibiEvidenceId: string;
}
