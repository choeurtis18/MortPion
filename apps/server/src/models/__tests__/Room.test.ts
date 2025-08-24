import { describe, it, expect, beforeEach } from 'vitest';
import { Room } from '../Room';
import { Player } from '../Player';

describe('Room', () => {
  let room: Room;
  let host: Player;

  beforeEach(() => {
    host = new Player({ nickname: 'Host', color: 'red' });
    room = new Room({
      name: 'Test Room',
      capacity: 4,
      isPrivate: false,
      hostId: host.id,
    });
  });

  describe('constructor', () => {
    it('should initialize with correct default values', () => {
      expect(room.name).toBe('Test Room');
      expect(room.capacity).toBe(4);
      expect(room.isPrivate).toBe(false);
      expect(room.code).toBeUndefined();
      expect(room.players).toHaveLength(0);
      expect(room.getStatus()).toBe('waiting');
      expect(room.game).toBeDefined();
      expect(room.hostId).toBe(host.id);
      expect(room.createdAt).toBeDefined();
      expect(room.expiresAt).toBeDefined();
    });

    it('should create private room with access code', () => {
      const privateRoom = new Room({
        name: 'Private Room',
        capacity: 2,
        isPrivate: true,
        code: 'SECRET123',
        hostId: host.id,
      });

      expect(privateRoom.isPrivate).toBe(true);
      expect(privateRoom.code).toBe('SECRET123');
    });

    it('should throw error for invalid room name', () => {
      expect(() => new Room({
        name: '',
        capacity: 2,
        hostId: host.id,
      })).toThrow('Room name cannot be empty');
    });

    it('should throw error for invalid capacity', () => {
      expect(() => new Room({
        name: 'Test',
        capacity: 1,
        hostId: host.id,
      })).toThrow('Room capacity must be between 2 and 4 players');
    });
  });

  describe('player management', () => {
    it('should add player successfully', () => {
      const player = new Player({ nickname: 'Player2', color: 'blue' });
      const success = room.addPlayer(player);

      expect(success).toBe(true);
      expect(room.players).toHaveLength(1);
      expect(room.players[0].nickname).toBe('Player2');
      expect(room.players[0].color).toBe('red'); // Color assigned by room
    });

    it('should reject duplicate player', () => {
      room.addPlayer(host);
      const success = room.addPlayer(host);

      expect(success).toBe(false);
    });

    it('should reject when room is full', () => {
      // Fill room to capacity (but don't auto-start game)
      const smallRoom = new Room({
        name: 'Small Room',
        capacity: 3, // Use 3 to avoid auto-start with 4 players
        hostId: host.id,
      });
      
      smallRoom.addPlayer(new Player({ nickname: 'P1', color: 'red' }));
      smallRoom.addPlayer(new Player({ nickname: 'P2', color: 'blue' }));
      smallRoom.addPlayer(new Player({ nickname: 'P3', color: 'green' }));

      const extraPlayer = new Player({ nickname: 'P4', color: 'yellow' });
      const success = smallRoom.addPlayer(extraPlayer);

      expect(success).toBe(false);
    });

    it('should auto-start game when room reaches capacity', () => {
      const smallRoom = new Room({
        name: 'Small Room',
        capacity: 2,
        hostId: host.id,
      });
      
      smallRoom.addPlayer(new Player({ nickname: 'P1', color: 'red' }));
      smallRoom.addPlayer(new Player({ nickname: 'P2', color: 'blue' }));

      expect(smallRoom.getStatus()).toBe('playing');
    });

    it('should remove player successfully', () => {
      const player = new Player({ nickname: 'Player2', color: 'blue' });
      room.addPlayer(player);
      
      const success = room.removePlayer(player.id);

      expect(success).toBe(true);
      expect(room.players).toHaveLength(0);
    });

    it('should handle host transfer when host leaves', () => {
      // Add the host to the room first
      room.addPlayer(host);
      
      const player1 = new Player({ nickname: 'Player1', color: 'red' });
      const player2 = new Player({ nickname: 'Player2', color: 'blue' });
      
      room.addPlayer(player1);
      room.addPlayer(player2);
      
      // Host should be the first player (host) we added
      expect(room.players[0].isHost).toBe(true);
      
      // Remove current host
      room.removePlayer(room.hostId);
      
      // Host should be transferred to next player (player1)
      expect(room.hostId).toBe(room.players[0].id);
      expect(room.players[0].isHost).toBe(true);
    });

    it('should reject removing non-existent player', () => {
      const success = room.removePlayer('non-existent-id');
      expect(success).toBe(false);
    });
  });

  describe('game management', () => {
    it('should start game successfully', () => {
      room.addPlayer(new Player({ nickname: 'Player1', color: 'red' }));
      room.addPlayer(new Player({ nickname: 'Player2', color: 'blue' }));
      
      room.startGame();

      expect(room.getStatus()).toBe('playing');
      expect(room.game.status).toBe('playing');
    });

    it('should throw error when starting game with insufficient players', () => {
      expect(() => room.startGame()).toThrow('Cannot start game with less than 2 players');
    });
  });

  describe('room utilities', () => {
    it('should check if room is full', () => {
      expect(room.isFull()).toBe(false);
      
      // Fill room but avoid auto-start by using capacity 3
      const smallRoom = new Room({
        name: 'Test Room',
        capacity: 3,
        hostId: host.id,
      });
      
      expect(smallRoom.isFull()).toBe(false);
      
      smallRoom.addPlayer(new Player({ nickname: 'P1', color: 'red' }));
      smallRoom.addPlayer(new Player({ nickname: 'P2', color: 'blue' }));
      smallRoom.addPlayer(new Player({ nickname: 'P3', color: 'green' }));
      
      expect(smallRoom.isFull()).toBe(true);
    });

    it('should check if room has expired', () => {
      expect(room.hasExpired()).toBe(false);
      
      // Set expiration to past
      room.expiresAt = Date.now() - 1000;
      expect(room.hasExpired()).toBe(true);
    });

    it('should reset TTL', async () => {
      const originalExpiration = room.expiresAt;
      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));
      room.resetTTL();
      expect(room.expiresAt).toBeGreaterThan(originalExpiration);
    });

    it('should get player by ID', () => {
      const player = new Player({ nickname: 'Test', color: 'red' });
      room.addPlayer(player);
      
      const foundPlayer = room.getPlayer(room.players[0].id);
      expect(foundPlayer).toBeDefined();
      expect(foundPlayer!.nickname).toBe('Test');
    });

    it('should get host player', () => {
      // Add the host player to the room
      room.addPlayer(host);
      
      const hostPlayer = room.getHost();
      expect(hostPlayer).toBeDefined();
      expect(hostPlayer!.isHost).toBe(true);
      expect(hostPlayer!.id).toBe(room.hostId);
    });
  });

  describe('access control', () => {
    it('should verify room code correctly', () => {
      const privateRoom = new Room({
        name: 'Private Room',
        capacity: 2,
        isPrivate: true,
        code: 'SECRET123',
        hostId: host.id,
      });

      expect(privateRoom.verifyCode('SECRET123')).toBe(true);
      expect(privateRoom.verifyCode('WRONG')).toBe(false);
    });

    it('should always allow access to public rooms', () => {
      expect(room.verifyCode('')).toBe(true);
      expect(room.verifyCode('anything')).toBe(true);
    });
  });

  describe('replay voting', () => {
    beforeEach(() => {
      room.addPlayer(new Player({ nickname: 'Player1', color: 'red' }));
      room.addPlayer(new Player({ nickname: 'Player2', color: 'blue' }));
      room.startGame();
    });

    it('should start replay voting', () => {
      room.startReplayVoting();
      
      expect(room.replayDeadline).toBeDefined();
      expect(room.replayVotes.size).toBe(0);
    });

    it('should cast replay vote', () => {
      room.startReplayVoting();
      const playerId = room.players[0].id;
      
      const success = room.castReplayVote(playerId, true);
      
      expect(success).toBe(true);
      expect(room.replayVotes.get(playerId)).toBe(true);
    });

    it('should check replay votes status', () => {
      room.startReplayVoting();
      
      expect(room.checkReplayVotes()).toBe('pending');
      
      // Cast all votes as positive
      room.players.forEach(player => {
        room.castReplayVote(player.id, true);
      });
      
      expect(room.checkReplayVotes()).toBe('accepted');
    });

    it('should handle replay', () => {
      room.replay();
      
      expect(room.game.status).toBe('playing');
      expect(room.replayVotes.size).toBe(0);
      expect(room.replayDeadline).toBeNull();
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const json = room.toJSON();

      expect(json).toEqual({
        id: room.id,
        name: 'Test Room',
        capacity: 4,
        isPrivate: false,
        createdAt: room.createdAt,
        expiresAt: room.expiresAt,
        hostId: host.id,
        players: [],
        game: room.game.getGameState(),
        status: 'waiting',
        isFull: false,
        replayDeadline: null,
        replayVotes: {},
      });
    });

    it('should serialize with players', () => {
      const player = new Player({ nickname: 'Test', color: 'red' });
      room.addPlayer(player);
      
      const json = room.toJSON();
      expect(json.players).toHaveLength(1);
      expect(json.players[0].nickname).toBe('Test');
    });
  });
});
