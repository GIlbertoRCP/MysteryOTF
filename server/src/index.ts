import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { roomManager } from './roomManager.js';
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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const asLang = (l: unknown): Lang => (l === 'es' ? 'es' : 'en');
const asRole = (r: unknown): Role => (r === 'analyst' ? 'analyst' : 'lead');

function currentRoom(socket: Socket) {
  const code = socket.data.roomCode as string | undefined;
  return code ? roomManager.getRoom(code) : undefined;
}

type RoomT = NonNullable<ReturnType<typeof roomManager.getRoom>>;

function botSay(room: RoomT, key: Parameters<typeof roomManager.botSay>[1], ref?: string, index?: number) {
  io.to(room.code).emit('chat:message', roomManager.botSay(room, key, ref, index));
}

function sendHints(room: RoomT) {
  for (const p of Object.values(room.players)) {
    io.to(p.socketId).emit('case:hints', { hints: roomManager.hintsFor(room, p.lang), hintsUsed: room.hintsUsed });
  }
}

function enterRoom(socket: Socket, code: string, name: string, role: Role, lang: Lang) {
  const room = roomManager.getRoom(code);
  if (!room) {
    socket.emit('room:error', { code: 'not_found' });
    return;
  }
  if (roomManager.isFull(room)) {
    socket.emit('room:error', { code: 'solo' });
    return;
  }
  const player = roomManager.addPlayer(room, socket.id, name, role, lang);
  socket.data.roomCode = room.code;
  socket.join(room.code);

  console.log(`[Room] ${player.name} joined ${room.code} as ${player.role} (${player.lang})`);

  socket.emit('room:joined', {
    room: roomManager.toPublic(room),
    mystery: roomManager.getMystery(room, player.lang),
    hints: roomManager.hintsFor(room, player.lang),
    you: player,
  });
  socket.to(room.code).emit('room:players', { players: Object.values(room.players), joined: player.name });
  if (room.assistant && room.chat.length === 0) setTimeout(() => botSay(room, 'bot_hello'), 1500);
}

io.on('connection', (socket) => {
  socket.on('room:create', ({ name, role, lang, theme, difficulty, seed, mode, assistant, tutorial, daily }) => {
    const room = roomManager.createRoom({ theme, difficulty, seed, mode, assistant, tutorial, daily });
    enterRoom(socket, room.code, name, asRole(role), asLang(lang));
  });

  socket.on('room:join', ({ code, name, role, lang }) => {
    enterRoom(socket, String(code || ''), name, asRole(role), asLang(lang));
  });

  socket.on('room:set_lang', ({ lang }) => {
    const room = currentRoom(socket);
    if (!room) return;
    roomManager.setLang(room, socket.id, asLang(lang));
    socket.emit('room:mystery', { mystery: roomManager.getMystery(room, asLang(lang)), hints: roomManager.hintsFor(room, asLang(lang)) });
    io.to(room.code).emit('room:players', { players: Object.values(room.players) });
  });

  socket.on('card:add', ({ card }) => {
    const room = currentRoom(socket);
    const player = room?.players[socket.id];
    if (!room || !player) return;
    const added = roomManager.addCard(room, card || {}, player.name);
    if (added) {
      roomManager.touch(room);
      io.to(room.code).emit('card:added', { card: added, by: player.name });
    }
  });

  socket.on('card:move', ({ cardId, x, y }) => {
    const room = currentRoom(socket);
    if (room && roomManager.moveCard(room, cardId, x, y)) {
      socket.to(room.code).emit('card:moved', { cardId, x, y });
    }
  });

  socket.on('card:tag', ({ cardId, tag }) => {
    const room = currentRoom(socket);
    const player = room?.players[socket.id];
    if (room && player && roomManager.tagCard(room, cardId, tag)) {
      io.to(room.code).emit('card:tagged', { cardId, tag: room.cards[cardId].statusTag ?? null, by: player.name });
    }
  });

  socket.on('card:remove', ({ cardId }) => {
    const room = currentRoom(socket);
    if (!room) return;
    const removedStrings = roomManager.removeCard(room, cardId);
    if (removedStrings) io.to(room.code).emit('card:removed', { cardId, removedStrings });
  });

  socket.on('string:create', ({ from, to, label }) => {
    const room = currentRoom(socket);
    const player = room?.players[socket.id];
    if (!room || !player) return;
    const str = roomManager.createString(room, from, to, label, player.name);
    if (str) {
      roomManager.touch(room);
      io.to(room.code).emit('string:created', { string: str, by: player.name });
    }
  });

  socket.on('string:delete', ({ stringId }) => {
    const room = currentRoom(socket);
    if (room && roomManager.deleteString(room, stringId)) {
      io.to(room.code).emit('string:deleted', { stringId });
    }
  });

  socket.on('presence:cursor', ({ x, y }) => {
    const room = currentRoom(socket);
    const player = room?.players[socket.id];
    if (!room || !player) return;
    socket.to(room.code).emit('presence:cursor', { socketId: socket.id, name: player.name, role: player.role, x, y });
  });

  socket.on('chat:send', ({ text, phrase }) => {
    const room = currentRoom(socket);
    const player = room?.players[socket.id];
    if (!room || !player) return;
    const msg = roomManager.addChat(room, player, text, phrase);
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

  socket.on('lab:request', ({ evidenceId }) => {
    const room = currentRoom(socket);
    if (!room) return;
    const started = roomManager.requestLab(room, String(evidenceId || ''), () => {
      io.to(room.code).emit('lab:update', { lab: room.lab });
      if (room.assistant) botSay(room, 'bot_lab_ready', room.lab!.unlocked[room.lab!.unlocked.length - 1]);
    });
    if (started) {
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
    const room = currentRoom(socket);
    const player = room?.players[socket.id];
    if (!room || !player || !submission) return;
    const outcome = roomManager.submitAccusation(room, submission);
    if (!outcome) return;
    // Each player gets the verdict in their own language.
    for (const p of Object.values(room.players)) {
      io.to(p.socketId).emit('case:result', roomManager.resultFor(room, player.name, outcome.correctCount, p.lang));
    }
    if (room.assistant && room.status === 'active') setTimeout(() => botSay(room, 'bot_wrong'), 2500);
  });

  socket.on('room:leave', () => {
    const room = roomManager.removePlayer(socket.id);
    if (room) {
      socket.leave(room.code);
      io.to(room.code).emit('room:players', { players: Object.values(room.players) });
    }
    socket.data.roomCode = undefined;
  });

  socket.on('disconnect', () => {
    const room = roomManager.removePlayer(socket.id);
    if (room) io.to(room.code).emit('room:players', { players: Object.values(room.players) });
  });
});

setInterval(() => roomManager.sweep(6 * 60 * 60 * 1000), 10 * 60 * 1000);

// The assistant nudges solo players who have gone quiet for a while.
setInterval(() => {
  for (const room of roomManager.idleAssistantRooms(150 * 1000)) {
    botSay(room, 'bot_tip', undefined, room.nudges);
    room.nudges += 1;
    roomManager.touch(room);
  }
}, 20 * 1000);

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(` detective-board-sync Backend Server running on http://localhost:${PORT}`);
});
