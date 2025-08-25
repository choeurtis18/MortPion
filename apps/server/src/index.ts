import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import pino from 'pino';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Room } from './models/Room.js';
import { Player } from './models/Player.js';
import { emailService } from './services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://mortpion-choeurtis.up.railway.app",
      ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [])
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Mock Redis for validation (will be replaced with real Redis later)
const mockRedis = {
  isReady: true,
  setEx: async (key: string, ttl: number, value: string) => {
    logger.info(`Mock Redis: SET ${key} EX ${ttl} "${value}"`);
    return 'OK';
  },
  get: async (key: string) => {
    logger.info(`Mock Redis: GET ${key}`);
    return null;
  },
  del: async (key: string) => {
    logger.info(`Mock Redis: DEL ${key}`);
    return 1;
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    redis: mockRedis.isReady ? 'connected (mock)' : 'disconnected'
  });
});

// Admin panel route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Admin routes for email notifications
app.get('/admin/email/status', (req, res) => {
  res.json(emailService.getStatus());
});

app.post('/admin/email/toggle', (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean' });
  }
  
  emailService.toggleNotifications(enabled);
  res.json({ 
    message: `Email notifications ${enabled ? 'enabled' : 'disabled'}`,
    status: emailService.getStatus()
  });
});

// Test email endpoint
app.post('/admin/email/test', async (req, res) => {
  try {
    await emailService.sendGameStartNotification({
      roomName: 'Test Room',
      playerCount: 2,
      players: ['TestPlayer1', 'TestPlayer2'],
      isPrivate: false,
      timestamp: new Date()
    });
    
    res.json({ 
      success: true,
      message: 'Email de test envoyé avec succès!' 
    });
  } catch (error) {
    logger.error('Test email failed:', error);
    res.status(500).json({ 
      success: false,
      error: 'Échec de l\'envoi de l\'email de test',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List available rooms endpoint
app.get('/rooms', (req, res) => {
  const availableRooms = Array.from(rooms.values())
    .filter(room => room.players.length < room.capacity && room.game.status === 'waiting')
    .map(room => ({
      id: room.id,
      name: room.name,
      playerCount: room.players.length,
      capacity: room.capacity,
      isPrivate: room.isPrivate,
      status: room.game.status
    }));
  
  res.json({ 
    rooms: availableRooms,
    total: availableRooms.length,
    timestamp: new Date().toISOString()
  });
});

// TODO: Import game logic when ready
// import { Room } from './models/Room';
// import { Player } from './models/Player';
// import { Color } from '@mortpion/shared';

// Global rooms storage (FIXED: moved outside connection handler)
const rooms = new Map<string, Room>();

// Room cleanup system - Remove inactive rooms every 5 minutes
setInterval(() => {
  const now = Date.now();
  const ROOM_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
  
  for (const [roomId, room] of rooms.entries()) {
    const roomAge = now - room.createdAt; // FIXED: createdAt is already a number
    const isEmpty = room.players.length === 0;
    const isExpired = roomAge > ROOM_TTL;
    
    if (isEmpty || isExpired) {
      rooms.delete(roomId);
      logger.info(`Room ${roomId} cleaned up (${isEmpty ? 'empty' : 'expired'})`);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

// Turn timer system - Check for timeouts and broadcast timer updates every second
setInterval(() => {
  for (const [roomId, room] of rooms.entries()) {
    if (room.game.status === 'playing') {
      // Check for timeout
      if (room.game.isTurnTimedOut()) {
        const currentPlayer = room.game.getCurrentPlayer();
        if (currentPlayer) {
          logger.info(`Turn timeout for player ${currentPlayer.nickname} in room ${roomId}`);
          
          // Check if player will be eliminated before skipping
          const willBeEliminated = currentPlayer.skipsInARow >= 1; // Will be 2 after increment
          
          // Skip the turn
          room.game.skipTurn();
          
          // Get updated game state after skip
          const updatedGameState = room.game.getGameState();
          
          // Broadcast turn skipped and updated game state
          io.to(roomId).emit('turn-skipped', {
            skippedPlayerId: currentPlayer.id,
            reason: 'timeout',
            gameState: updatedGameState
          });
          
          // Broadcast elimination if player was eliminated
          if (willBeEliminated && currentPlayer.isEliminated) {
            io.to(roomId).emit('player-eliminated', {
              playerId: currentPlayer.id,
              playerName: currentPlayer.nickname,
              reason: 'consecutive_skips',
              gameState: updatedGameState
            });
          }
          
          // Check if game ended due to skip
          if (updatedGameState.status === 'finished') {
            io.to(roomId).emit('game-ended', {
              winnerId: room.game.winnerId,
              isDraw: room.game.isDraw,
              gameState: room.game.getGameState()
            });
            
            // Start replay voting process
            room.startReplayVoting();
            io.to(roomId).emit('replay-voting-started', {
              replayDeadline: room.replayDeadline,
              replayVotes: Object.fromEntries(room.replayVotes)
            });
          }
        }
      } else {
        // Broadcast timer update to keep clients synchronized
        const gameState = room.game.getGameState();
        io.to(roomId).emit('timer-update', {
          turnTimeLeft: gameState.turnTimeLeft,
          currentPlayerId: gameState.currentPlayerId
        });
      }
    }
    
    // Check for replay voting timeout
    if (room.replayDeadline && Date.now() > room.replayDeadline) {
      const voteResult = room.checkReplayVotes();
      
      if (voteResult === 'accepted') {
        // All voted yes - restart game
        room.replay();
        io.to(roomId).emit('game-restarted', {
          gameState: room.game.getGameState()
        });
        logger.info(`Replay started in room ${roomId}`);
      } else {
        // Timeout or rejected - close voting and show lobby option
        room.replayDeadline = null;
        room.replayVotes.clear();
        io.to(roomId).emit('replay-timeout', {
          message: 'Vote de replay expiré ou rejeté'
        });
        logger.info(`Replay voting timeout in room ${roomId}`);
      }
    }
  }
}, 1000); // Check every second

// Simple Socket.io connection handling for Phase 2 testing
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Test ping-pong for validation
  socket.on('ping', () => {
    logger.info(`Ping received from ${socket.id}`);
    socket.emit('pong', { message: 'Server is alive!', timestamp: Date.now() });
  });

  // Room management with real game logic
  socket.on('create-room', (data) => {
    try {
      const { playerName, roomName, isPrivate, capacity } = data;
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Create new room with real Room class
      const room = new Room({
        id: roomId,
        name: roomName || `Salle de ${playerName}`,
        capacity: capacity || 2,
        isPrivate: isPrivate || false,
        code: isPrivate ? Math.random().toString(36).substring(2, 6).toUpperCase() : undefined,
        hostId: socket.id
      });
      
      // Create player and add to room
      const player = new Player({
        id: socket.id,
        nickname: playerName || 'Player',
        color: 'red' // Will be reassigned by Room.addPlayer
      });
      room.addPlayer(player);
      
      // Store room
      rooms.set(roomId, room);
      
      // Join socket to room
      socket.join(roomId);
      
      logger.info(`Room created: ${roomId} by ${playerName} (${room.players.length}/${room.capacity})`);
      
      // Send room created confirmation
      socket.emit('room-created', {
        roomId,
        roomName: room.name,
        playerName,
        capacity: room.capacity,
        isPrivate: room.isPrivate,
        accessCode: room.code,
        message: 'Room created successfully',
        roomState: room.getStatus()
      });
      
    } catch (error) {
      logger.error('Error creating room:', error);
      socket.emit('room-error', { message: 'Failed to create room' });
    }
  });

  socket.on('join-room', (data) => {
    try {
      const { roomId, playerName, accessCode } = data;
      
      if (!roomId || !playerName) {
        socket.emit('join-error', { message: 'Room ID and player name are required' });
        return;
      }
      
      logger.info(`Join attempt: roomId=${roomId}, playerName=${playerName}, totalRooms=${rooms.size}`);
      logger.info(`Available rooms: ${Array.from(rooms.keys()).join(', ')}`);
      
      const room = rooms.get(roomId);
      if (!room) {
        logger.error(`Room ${roomId} not found. Available rooms: ${Array.from(rooms.keys()).join(', ')}`);
        socket.emit('join-error', { message: 'Room not found' });
        return;
      }
      
      // Check access code for private rooms
      if (room.isPrivate && room.code !== accessCode) {
        socket.emit('join-error', { message: 'Invalid access code' });
        return;
      }
      
      // Check room capacity
      if (room.players.length >= room.capacity) {
        socket.emit('join-error', { message: 'Room is full' });
        return;
      }
      
      // Create player and add to room
      const player = new Player({
        id: socket.id,
        nickname: playerName || 'Player',
        color: 'red' // Will be reassigned by Room.addPlayer
      });
      room.addPlayer(player);
      
      // Join socket to room
      socket.join(roomId);
      
      logger.info(`Player ${playerName} joined room ${roomId} (${room.players.length}/${room.capacity})`);
      
      // Notify all players in the room about new player
      socket.to(roomId).emit('player-joined', {
        playerId: socket.id,
        playerName,
        roomState: room.getStatus()
      });
      
      // Confirm join to the joining player
      socket.emit('room-joined', {
        roomId,
        roomName: room.name,
        playerName,
        message: 'Successfully joined room',
        roomState: room.getStatus()
      });
      
      // Auto-start game if room is full
      if (room.players.length === room.capacity) {
        room.startGame();
        
        // Send email notification for new game
        emailService.sendGameStartNotification({
          roomName: room.name,
          playerCount: room.players.length,
          players: room.players.map(p => p.nickname),
          isPrivate: room.isPrivate,
          timestamp: new Date()
        }).catch(error => {
          logger.error('Failed to send game start notification:', error);
        });
        
        const gameState = room.game.getGameState();
        io.to(roomId).emit('game-started', {
          message: 'Game started!',
          gameState: gameState
        });
        logger.info(`Game started in room ${roomId}. Current player: ${gameState.currentPlayerId}`);
        logger.info(`Players in room: ${room.players.map(p => `${p.nickname}(${p.id})`).join(', ')}`);
      }
      
    } catch (error) {
      logger.error('Error joining room:', error);
      socket.emit('join-error', { message: 'Failed to join room' });
    }
  });

  // Game move handling
  socket.on('make-move', (data) => {
    try {
      const { roomId, cellIndex, size } = data;
      
      if (!roomId || cellIndex === undefined || !size) {
        socket.emit('move-error', { message: 'Missing move data' });
        return;
      }
      
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('move-error', { message: 'Room not found' });
        return;
      }
      
      if (!room.game || room.game.status !== 'playing') {
        socket.emit('move-error', { message: 'Game is not active' });
        return;
      }
      
      // Apply the move
      const success = room.game.applyMove(socket.id, cellIndex, size);
      if (!success) {
        socket.emit('move-error', { message: 'Invalid move' });
        return;
      }
      
      // Broadcast updated game state to all players in the room
      const gameState = room.game.getGameState();
      
      io.to(roomId).emit('game-updated', {
        gameState,
        lastMove: {
          playerId: socket.id,
          cellIndex,
          size
        }
      });
      
      // Check if game ended
      const isGameFinished = (g: typeof room.game) => g?.status === 'finished';
      if (isGameFinished(room.game)) {
        io.to(roomId).emit('game-ended', {
          winnerId: room.game.winnerId,
          isDraw: room.game.isDraw,
          gameState
        });
        
        // Start replay voting process
        room.startReplayVoting();
        io.to(roomId).emit('replay-voting-started', {
          replayDeadline: room.replayDeadline,
          replayVotes: Object.fromEntries(room.replayVotes)
        });
        
        logger.info(`Game ended in room ${roomId}. Winner: ${room.game.winnerId || 'Draw'}`);
      }
      
      logger.info(`Move applied in room ${roomId}: Player ${socket.id} placed ${size} at cell ${cellIndex}`);
      
    } catch (error) {
      logger.error('Error applying move:', error);
      socket.emit('move-error', { message: 'Failed to apply move' });
    }
  });

  // Get current game state
  socket.on('get-game-state', (data) => {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        socket.emit('game-state-error', { message: 'Room ID is required' });
        return;
      }
      
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('game-state-error', { message: 'Room not found' });
        return;
      }
      
      const gameState = room.game.getGameState();
      
      socket.emit('game-state', { gameState });
      
    } catch (error) {
      logger.error('Error getting game state:', error);
      socket.emit('game-state-error', { message: 'Failed to get game state' });
    }
  });

  // Replay vote handling
  socket.on('cast-replay-vote', (data) => {
    try {
      const { roomId, vote } = data;
      
      if (!roomId || typeof vote !== 'boolean') {
        socket.emit('replay-vote-error', { message: 'Invalid vote data' });
        return;
      }
      
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('replay-vote-error', { message: 'Room not found' });
        return;
      }
      
      const success = room.castReplayVote(socket.id, vote);
      if (!success) {
        socket.emit('replay-vote-error', { message: 'Vote failed or expired' });
        return;
      }
      
      // Broadcast updated vote status
      io.to(roomId).emit('replay-vote-updated', {
        replayVotes: Object.fromEntries(room.replayVotes),
        replayDeadline: room.replayDeadline
      });
      
      // Check if voting is complete
      const voteResult = room.checkReplayVotes();
      if (voteResult === 'accepted') {
        room.replay();
        io.to(roomId).emit('game-restarted', {
          gameState: room.game.getGameState()
        });
        logger.info(`Replay started in room ${roomId}`);
      } else if (voteResult === 'rejected') {
        io.to(roomId).emit('replay-rejected');
        logger.info(`Replay rejected in room ${roomId}`);
      }
      
    } catch (error) {
      logger.error('Error casting replay vote:', error);
      socket.emit('replay-vote-error', { message: 'Failed to cast vote' });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
    
    // Handle player disconnection from rooms
    for (const [roomId, room] of rooms.entries()) {
      const player = room.getPlayer(socket.id);
      if (player) {
        player.setConnected(false);
        
        // Notify other players about disconnection
        socket.to(roomId).emit('player-disconnected', {
          playerId: socket.id,
          playerName: player.nickname,
          gameState: room.game.getGameState()
        });
        
        logger.info(`Player ${player.nickname} disconnected from room ${roomId}`);
        
        // Handle disconnection based on game state
        if (room.game.status === 'waiting') {
          // In lobby: clean up empty rooms or transfer host
          if (room.players.every(p => !p.connected)) {
            rooms.delete(roomId);
            logger.info(`Empty room ${roomId} cleaned up`);
          } else if (player.isHost) {
            // Transfer host to first connected player
            const newHost = room.players.find(p => p.connected && p.id !== socket.id);
            if (newHost) {
              room.transferHostTo(newHost.id);
              socket.to(roomId).emit('host-transferred', {
                newHostId: newHost.id,
                newHostName: newHost.nickname
              });
              logger.info(`Host transferred from ${player.nickname} to ${newHost.nickname} in room ${roomId}`);
            }
          }
        } else if (room.game.status === 'playing') {
          // In-game: handle current player disconnection
          if (room.game.currentPlayerId === socket.id) {
            // Current player disconnected - skip their turn
            logger.info(`Current player ${player.nickname} disconnected, skipping turn in room ${roomId}`);
            room.game.skipTurn();
            
            socket.to(roomId).emit('turn-skipped', {
              skippedPlayerId: socket.id,
              reason: 'disconnection',
              gameState: room.game.getGameState()
            });
            
            // Get updated game state and check if game ended due to skip
            const updatedGameState = room.game.getGameState();
            if (updatedGameState.status === 'finished') {
              socket.to(roomId).emit('game-ended', {
                winnerId: room.game.winnerId,
                isDraw: room.game.isDraw,
                gameState: room.game.getGameState()
              });
              
              // Start replay voting process
              room.startReplayVoting();
              socket.to(roomId).emit('replay-voting-started', {
                replayDeadline: room.replayDeadline,
                replayVotes: Object.fromEntries(room.replayVotes)
              });
            }
          }
          
          // Check if all players disconnected
          if (room.players.every(p => !p.connected)) {
            rooms.delete(roomId);
            logger.info(`All players disconnected, room ${roomId} cleaned up`);
          }
        }
      }
    }
  });
});

// Start server
const PORT = process.env.PORT;

async function startServer() {
  try {
    // Test mock Redis with TTL
    await mockRedis.setEx('test:startup', 10, JSON.stringify({ 
      message: 'Server started successfully', 
      timestamp: Date.now() 
    }));
    logger.info('Mock Redis test key set with 10s TTL');

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info('✅ Validation ready: Server started with mock Redis');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
