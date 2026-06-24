const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join', ({ room }) => {
    if (!room) return;
    room = String(room);
    socket.join(room);
    socket.data.room = room;

    const roomSockets = io.sockets.adapter.rooms.get(room);
    const peerCount = roomSockets ? roomSockets.size : 0;

    socket.emit('joined', { peerCount });
    socket.to(room).emit('peer-joined', { peerCount });

    console.log(`Socket ${socket.id} joined room ${room} (${peerCount} peer(s))`);
  });

  socket.on('signal', ({ room, signal }) => {
    if (!room || !signal) return;
    console.log(`Signal from ${socket.id} for room ${room} — type: ${signal && signal.type}`);
    socket.to(room).emit('signal', { signal });
  });

  // Relay chat messages as a fallback when datachannel fails
  socket.on('chat-message', ({ room, payload }) => {
    if (!room || !payload) return;
    console.log(`Chat message from ${socket.id} for room ${room}:`, payload && payload.type);
    socket.to(room).emit('chat-message', payload);
  });

  socket.on('disconnect', () => {
    const room = socket.data.room;
    if (!room) return;

    const roomSockets = io.sockets.adapter.rooms.get(room);
    const peerCount = roomSockets ? roomSockets.size : 0;
    socket.to(room).emit('peer-left', { peerCount });

    console.log(`Socket disconnected: ${socket.id} from room ${room} (${peerCount} remaining)`);
  });
});

server.listen(PORT, () => {
  console.log(`StealthChat signaling server is running on http://localhost:${PORT}`);
});
