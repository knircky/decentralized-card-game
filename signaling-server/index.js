const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const games = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // WebRTC signaling (existing)
  socket.on('signal', (data) => {
    console.log('Routing WebRTC signal from', data.from, 'to', data.to);
    socket.broadcast.emit('signal', data);
  });
  
  // Simple P2P game messages (new)
  socket.on('join-game', (data) => {
    console.log('Player joined game:', data);
    socket.join(`game-${data.gameId}`);
  });
  
  socket.on('game-message', (data) => {
  console.log('Server: Routing game message');
  console.log('  Type:', data.type);
  console.log('  From:', data.from);
  console.log('  To:', data.to);
  console.log('  Game ID:', data.gameId);
  
  // Broadcast to all clients in the game room
  socket.to(`game-${data.gameId}`).emit('game-message', data);
  console.log('  Message sent to room: game-' + data.gameId);
});
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(3001, () => {
  console.log('Signaling server running on port 3001');
});