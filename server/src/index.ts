import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { roomManager, Room, LATE_LEAD_MS } from './roomManager.js';
import { AccusationSubmission, Lang, Role } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Serve static client files if production build exists
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', durable: roomManager.durable, timestamp: new Date().toISOString() });
});

const asLang = (l: unknown): Lang => (l === 'es' ? 'es' : 'en');
const asRole = (r: unknown): Role => (r === 'analyst' ? 'analyst' : 'lead');
const asPlayerId = (id: unknown, socket: Socket): string =>
  typeof id === 'string' && /^[\w-]{8,64}$/.test(id) ? id : `anon-${socket.id}`;

function currentRoom(socket: Socket) {
  const code = socket.data.roomCode as string | undefined;
  return code ? roomManager.getRoom(code) : undefined;
}

function currentPlayer(socket: Socket) {
  const room = currentRoom(socket);
  const player = room?.players[socket.data.playerId as string];
  return room && player ? { room, player } : null;
}

function broadcastPlayers(room: Room, extra: Record<string, unknown> = {}) {
  io.to(room.code).emit('room:players', { players: Object.values(room.players), ...extra });
}

function botSay(room: Room, key: Parameters<typeof roomManager.botSay>[1], ref?: string, index?: number) {
  io.to(room.code).emit('chat:message', roomManager.botSay(room, key, ref, index));
}

function sendHints(room: Room) {
  for (const p of Object.values(room.players)) {
    if (p.connected) io.to(p.socketId).emit('case:hints', { hints: roomManager.hintsFor(room, p.lang), hintsUsed: room.hintsUsed });
  }
}

roomManager.onLabDone = (room) => {
  io.to(room.code).emit('lab:update', { lab: room.lab });
  if (room.assistant) botSay(room, 'bot_lab_ready', room.lab!.unlocked[room.lab!.unlocked.length - 1]);
};

roomManager.onPlayerGone = (room, player) => {
  broadcastPlayers(room, { left: player.name });
};

async function enterRoom(socket: Socket, code: string, playerId: string, name: string, role: Role, lang: Lang) {
  const room = await roomManager.loadRoom(code);
  if (!room) {
    socket.emit('room:error', { code: 'not_found' });
    return;
  }
  if (roomManager.isFull(room, playerId)) {
    socket.emit('room:error', { code: 'solo' });
    return;
  }
  const { player, rejoined } = roomManager.addPlayer(room, playerId, socket.id, name, role, lang);
  socket.data.roomCode = room.code;
  socket.data.playerId = player.id;
  socket.join(room.code);

  console.log(`[Room] ${player.name} ${rejoined ? 'rejoined' : 'joined'} ${room.code} as ${player.role} (${player.lang})`);

  socket.emit('room:joined', {
    room: roomManager.toPublic(room),
    mystery: roomManager.getMystery(room, player.lang),
    hints: roomManager.hintsFor(room, player.lang),
    confrontations: roomManager.confrontationsFor(room, player.lang),
    searches: roomManager.searchesFor(room, player.lang),
    you: player,
  });
  socket.to(room.code).emit('room:players', {
    players: Object.values(room.players),
    ...(rejoined ? { returned: player.name } : { joined: player.name }),
  });
  if (room.assistant && room.chat.length === 0) setTimeout(() => botSay(room, 'bot_hello'), 1500);
}

io.on('connection', (socket) => {
  socket.on('room:create', async ({ playerId, name, role, lang, theme, difficulty, seed, mode, assistant, tutorial, daily }) => {
    const room = await roomManager.createRoom({ theme, difficulty, seed, mode, assistant, tutorial, daily });
    await enterRoom(socket, room.code, asPlayerId(playerId, socket), name, asRole(role), asLang(lang));
  });

  socket.on('room:join', async ({ code, playerId, name, role, lang }) => {
    await enterRoom(socket, String(code || ''), asPlayerId(playerId, socket), name, asRole(role), asLang(lang));
  });

  socket.on('room:set_lang', ({ lang }) => {
    const cur = currentPlayer(socket);
    if (!cur) return;
    roomManager.setLang(cur.room, cur.player.id, asLang(lang));
    socket.emit('room:mystery', {
      mystery: roomManager.getMystery(cur.room, asLang(lang)),
      hints: roomManager.hintsFor(cur.room, asLang(lang)),
      confrontations: roomManager.confrontationsFor(cur.room, asLang(lang)),
      searches: roomManager.searchesFor(cur.room, asLang(lang)),
    });
    broadcastPlayers(cur.room);
  });

  socket.on('card:add', ({ card }) => {
    const cur = currentPlayer(socket);
    if (!cur) return;
    const added = roomManager.addCard(cur.room, card || {}, cur.player.name);
    if (added) {
      roomManager.touch(cur.room);
      io.to(cur.room.code).emit('card:added', { card: added, by: cur.player.name });
    }
  });

  socket.on('card:move', ({ cardId, x, y }) => {
    const room = currentRoom(socket);
    if (room && roomManager.moveCard(room, cardId, x, y)) {
      socket.to(room.code).emit('card:moved', { cardId, x, y });
    }
  });

  socket.on('card:tag', ({ cardId, tag }) => {
    const cur = currentPlayer(socket);
    if (cur && roomManager.tagCard(cur.room, cardId, tag)) {
      io.to(cur.room.code).emit('card:tagged', { cardId, tag: cur.room.cards[cardId].statusTag ?? null, by: cur.player.name });
    }
  });

  socket.on('card:remove', ({ cardId }) => {
    const room = currentRoom(socket);
    if (!room) return;
    const removedStrings = roomManager.removeCard(room, cardId);
    if (removedStrings) io.to(room.code).emit('card:removed', { cardId, removedStrings });
  });

  socket.on('string:create', ({ from, to, label }) => {
    const cur = currentPlayer(socket);
    if (!cur) return;
    const str = roomManager.createString(cur.room, from, to, label, cur.player.name);
    if (str) {
      roomManager.touch(cur.room);
      io.to(cur.room.code).emit('string:created', { string: str, by: cur.player.name });
    }
  });

  socket.on('string:delete', ({ stringId }) => {
    const room = currentRoom(socket);
    if (room && roomManager.deleteString(room, stringId)) {
      io.to(room.code).emit('string:deleted', { stringId });
    }
  });

  socket.on('presence:cursor', ({ x, y }) => {
    const cur = currentPlayer(socket);
    if (!cur) return;
    socket.to(cur.room.code).emit('presence:cursor', { playerId: cur.player.id, name: cur.player.name, role: cur.player.role, x, y });
  });

  socket.on('chat:send', ({ text, phrase }) => {
    const cur = currentPlayer(socket);
    if (!cur) return;
    const { room } = cur;
    const msg = roomManager.addChat(room, cur.player, text, phrase);
    if (!msg) return;
    roomManager.touch(room);
    io.to(room.code).emit('chat:message', msg);
    // The assistant answers anything said on the radio with a pointer to a useful file.
    if (room.assistant && room.status === 'active') {
      setTimeout(() => {
        const s = roomManager.botSuggestion(room);
        botSay(room, s.key, s.ref, s.index);
      }, 1200);
    }
  });

  socket.on('suspect:confront', ({ suspectId, evidenceId }) => {
    const cur = currentPlayer(socket);
    if (!cur) return;
    const result = roomManager.confront(cur.room, String(suspectId || ''), String(evidenceId || ''), cur.player.name);
    if (!result) return;
    if (result.repeat) {
      socket.emit('suspect:confronted', { entry: roomManager.localizeConfront(cur.room, result.entry, cur.player.lang), repeat: true });
      return;
    }
    roomManager.touch(cur.room);
    for (const p of Object.values(cur.room.players)) {
      if (!p.connected) continue;
      io.to(p.socketId).emit('suspect:confronted', {
        entry: roomManager.localizeConfront(cur.room, result.entry, p.lang),
        wastedConfronts: cur.room.wastedConfronts,
      });
    }
  });

  socket.on('room:search', ({ spotId }) => {
    const cur = currentPlayer(socket);
    if (!cur) return;
    const result = roomManager.search(cur.room, String(spotId || ''), cur.player.name);
    if (!result) return;
    if (result.repeat) return;
    roomManager.touch(cur.room);
    for (const p of Object.values(cur.room.players)) {
      if (p.connected) io.to(p.socketId).emit('room:searched', { entry: roomManager.localizeSearch(cur.room, result.entry, p.lang) });
    }
  });

  socket.on('lab:request', ({ evidenceId }) => {
    const room = currentRoom(socket);
    if (!room) return;
    if (roomManager.requestLab(room, String(evidenceId || ''))) {
      roomManager.touch(room);
      io.to(room.code).emit('lab:update', { lab: room.lab });
    }
  });

  socket.on('case:hint', () => {
    const room = currentRoom(socket);
    if (!room || !roomManager.revealHint(room)) return;
    roomManager.touch(room);
    sendHints(room);
  });

  socket.on('case:submit', ({ submission }: { submission: AccusationSubmission }) => {
    const cur = currentPlayer(socket);
    if (!cur || !submission) return;
    const { room, player } = cur;
    const outcome = roomManager.submitAccusation(room, submission);
    if (!outcome) return;
    // Each player gets the verdict in their own language.
    for (const p of Object.values(room.players)) {
      if (p.connected) io.to(p.socketId).emit('case:result', roomManager.resultFor(room, player.name, outcome.correctCount, p.lang, submission));
    }
    if (room.assistant && room.status === 'active') setTimeout(() => botSay(room, 'bot_wrong'), 2500);
  });

  socket.on('room:leave', () => {
    const room = roomManager.leave(socket.data.roomCode, socket.data.playerId);
    if (room) {
      socket.leave(room.code);
      broadcastPlayers(room);
    }
    socket.data.roomCode = undefined;
    socket.data.playerId = undefined;
  });

  socket.on('disconnect', () => {
    // Keep the seat for a moment; a refresh or a flaky connection shouldn't end the game.
    const room = roomManager.disconnect(socket.data.roomCode, socket.data.playerId, socket.id);
    if (room) broadcastPlayers(room);
  });
});

setInterval(() => roomManager.sweep(6 * 60 * 60 * 1000), 10 * 60 * 1000);

// A held-back clue arrives a few minutes into the case, as a new lead.
setInterval(() => {
  for (const room of roomManager.dueLateLeads()) {
    roomManager.releaseLateLead(room);
    for (const p of Object.values(room.players)) {
      if (!p.connected) continue;
      io.to(p.socketId).emit('room:mystery', {
        mystery: roomManager.getMystery(room, p.lang),
        hints: roomManager.hintsFor(room, p.lang),
        confrontations: roomManager.confrontationsFor(room, p.lang),
        lateLead: room.blueprint.lateEvidenceId,
      });
    }
  }
}, Math.min(5000, Math.max(1000, LATE_LEAD_MS / 4)));

// The assistant nudges solo players who have gone quiet for a while.
setInterval(() => {
  for (const room of roomManager.idleAssistantRooms(150 * 1000)) {
    botSay(room, 'bot_tip', undefined, room.nudges);
    roomManager.nudge(room);
  }
}, 20 * 1000);

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(` detective-board-sync Backend Server running on http://localhost:${PORT}`);
});
