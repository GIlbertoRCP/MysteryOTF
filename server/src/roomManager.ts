import { RoomState, Player, BoardCard, BoardString, AccusationSubmission, Role } from './types.js';
import { generateMysteryCase } from './mysteryEngine.js';

class RoomManager {
  private rooms: Record<string, RoomState> = {};

  getOrCreateRoom(
    roomCode: string, 
    playerName: string, 
    role: Role, 
    seed?: string, 
    difficulty?: 'Novice' | 'Detective' | 'Mastermind', 
    theme?: 'gothic' | 'cyber' | 'opera' | 'casino' | 'express'
  ): { roomState: RoomState; assignedRole: Role } {
    let room = this.rooms[roomCode];

    if (!room) {
      const mystery = generateMysteryCase(difficulty || 'Detective', theme || 'gothic', seed);
      room = {
        roomCode,
        mystery,
        players: {},
        cards: {},
        strings: {},
        createdAt: Date.now()
      };
      this.rooms[roomCode] = room;
    }

    // Determine role assignment
    const existingRoles = Object.values(room.players).map(p => p.role);
    let assignedRole: Role = role;

    if (existingRoles.includes(role)) {
      assignedRole = role === 'lead' ? 'analyst' : 'lead';
    }

    return { roomState: room, assignedRole };
  }

  addPlayer(roomCode: string, socketId: string, name: string, role: Role): RoomState | null {
    const room = this.rooms[roomCode];
    if (!room) return null;

    room.players[socketId] = {
      socketId,
      name,
      role
    };

    return room;
  }

  removePlayer(socketId: string): { roomCode: string; roomState: RoomState } | null {
    for (const roomCode in this.rooms) {
      const room = this.rooms[roomCode];
      if (room.players[socketId]) {
        delete room.players[socketId];
        return { roomCode, roomState: room };
      }
    }
    return null;
  }

  addCard(roomCode: string, card: BoardCard): RoomState | null {
    const room = this.rooms[roomCode];
    if (!room) return null;
    room.cards[card.id] = card;
    return room;
  }

  moveCard(roomCode: string, cardId: string, x: number, y: number): RoomState | null {
    const room = this.rooms[roomCode];
    if (!room || !room.cards[cardId]) return null;
    room.cards[cardId].x = x;
    room.cards[cardId].y = y;
    return room;
  }

  setCardStatusTag(roomCode: string, cardId: string, statusTag: BoardCard['statusTag']): RoomState | null {
    const room = this.rooms[roomCode];
    if (!room || !room.cards[cardId]) return null;
    room.cards[cardId].statusTag = statusTag;
    return room;
  }

  removeCard(roomCode: string, cardId: string): RoomState | null {
    const room = this.rooms[roomCode];
    if (!room) return null;
    delete room.cards[cardId];
    return room;
  }

  createString(roomCode: string, newString: BoardString): RoomState | null {
    const room = this.rooms[roomCode];
    if (!room) return null;
    room.strings[newString.id] = newString;
    return room;
  }

  deleteString(roomCode: string, stringId: string): RoomState | null {
    const room = this.rooms[roomCode];
    if (!room) return null;
    delete room.strings[stringId];
    return room;
  }

  evaluateAccusation(roomCode: string, submission: AccusationSubmission) {
    const room = this.rooms[roomCode];
    if (!room) return null;

    const sol = room.mystery.solutionGraph;
    const victim = room.mystery.victim;

    const isKillerCorrect = submission.suspectId === sol.killerId;
    const isMotiveCorrect = submission.motiveEvidenceId === sol.motiveEvidenceId;
    const isWeaponCorrect = submission.weaponEvidenceId === sol.weaponEvidenceId;
    const isAlibiCorrect  = submission.alibiEvidenceId === sol.alibiContradictionEvidenceId;

    const correctCount = [isKillerCorrect, isMotiveCorrect, isWeaponCorrect, isAlibiCorrect].filter(Boolean).length;
    const isWin = correctCount === 4;
    const score = Math.round((correctCount / 4) * 100); // percentage 0-100

    const feedback: string[] = [
      isKillerCorrect
        ? `Correct perpetrator identified: ${sol.killerName}`
        : `Wrong suspect — the true killer was ${sol.killerName}`,
      isMotiveCorrect
        ? `Key motive evidence correctly designated`
        : `Motive evidence was incorrect`,
      isWeaponCorrect
        ? `Murder weapon specimen correctly identified`
        : `Weapon evidence did not match the forensic record`,
      isAlibiCorrect
        ? `Alibi contradiction evidence correctly cited`
        : `The alibi contradiction evidence was not the decisive proof`,
    ].map((msg, i) => {
      const correct = [isKillerCorrect, isMotiveCorrect, isWeaponCorrect, isAlibiCorrect][i];
      return (correct ? '\u2713 ' : '\u2717 ') + msg;
    });

    const officialSummary = isWin
      ? `${sol.killerName} has been placed under arrest for the murder of ${victim.name}. Detectives successfully reconstructed the full logic chain: motive, weapon, and the fatal flaw in the alibi. Case closed and warrant issued.`
      : `The District Attorney has rejected the submission. ${correctCount} of 4 required proof elements were correctly identified. Review your corkboard evidence chain and resubmit with a stronger logical foundation.`;

    return {
      correct: isWin,
      score,
      feedback,
      officialSummary,
    };
  }

  getRoom(roomCode: string): RoomState | undefined {
    return this.rooms[roomCode];
  }
}

export const roomManager = new RoomManager();
