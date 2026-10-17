import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { roomManager } from './roomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static client files if production build exists
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('room:join', ({ roomCode, playerName, role, seed, difficulty, theme }) => {
    const { roomState, assignedRole } = roomManager.getOrCreateRoom(
      roomCode, 
      playerName, 
      role, 
      seed, 
      difficulty, 
      theme
    );

    const updatedRoom = roomManager.addPlayer(roomCode, socket.id, playerName, assignedRole);
    socket.join(roomCode);

    console.log(`[Room] ${socket.id} (${playerName}) joined ${roomCode} as ${assignedRole}`);

    socket.emit('room:joined', {
      roomState: updatedRoom || roomState,
      assignedRole,
      socketId: socket.id
    });

    if (updatedRoom) {
      io.to(roomCode).emit('room:players_updated', Object.values(updatedRoom.players));
    }
  });

  socket.on('card:move', ({ roomCode, cardId, x, y }) => {
    const updated = roomManager.moveCard(roomCode, cardId, x, y);
    if (updated) {
      socket.to(roomCode).emit('card:moved', { cardId, x, y });
    }
  });

  socket.on('card:add', ({ roomCode, card }) => {
    const updated = roomManager.addCard(roomCode, card);
    if (updated) {
      io.to(roomCode).emit('card:added', card);
    }
  });

  socket.on('card:status_tag', ({ roomCode, cardId, statusTag }) => {
    const updated = roomManager.setCardStatusTag(roomCode, cardId, statusTag);
    if (updated) {
      io.to(roomCode).emit('card:status_tagged', { cardId, statusTag });
    }
  });

  socket.on('card:remove', ({ roomCode, cardId }) => {
    const updated = roomManager.removeCard(roomCode, cardId);
    if (updated) {
      io.to(roomCode).emit('card:removed', cardId);
    }
  });

  socket.on('string:create', ({ roomCode, string }) => {
    const updated = roomManager.createString(roomCode, string);
    if (updated) {
      io.to(roomCode).emit('string:created', string);
    }
  });

  socket.on('string:delete', ({ roomCode, stringId }) => {
    const updated = roomManager.deleteString(roomCode, stringId);
    if (updated) {
      io.to(roomCode).emit('string:deleted', stringId);
    }
  });

  socket.on('presence:cursor', ({ roomCode, x, y }) => {
    socket.to(roomCode).emit('presence:cursor_moved', {
      socketId: socket.id,
      x,
      y
    });
  });

  socket.on('chat:message', ({ roomCode, text, sender, role }) => {
    const msg = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender,
      role,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    io.to(roomCode).emit('chat:received', msg);
  });

  socket.on('case:submit', ({ roomCode, submission }) => {
    const evalResult = roomManager.evaluateAccusation(roomCode, submission);
    if (evalResult) {
      io.to(roomCode).emit('case:result', evalResult);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    const res = roomManager.removePlayer(socket.id);
    if (res) {
      io.to(res.roomCode).emit('room:players_updated', Object.values(res.roomState.players));
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(` detective-board-sync Backend Server running on http://localhost:${PORT}`);
});
