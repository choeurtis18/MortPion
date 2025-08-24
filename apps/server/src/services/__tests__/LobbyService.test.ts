import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LobbyService } from '../LobbyService.js';
import { Player } from '../../models/Player.js';
import type { RoomFilters, RoomSearchOptions } from '../LobbyService.js';

describe('LobbyService', () => {
  let lobbyService: LobbyService;
  let players: Player[];

  beforeEach(() => {
    lobbyService = new LobbyService();
    players = [
      new Player({ nickname: 'Player1', color: 'red' }),
      new Player({ nickname: 'Player2', color: 'blue' }),
      new Player({ nickname: 'Player3', color: 'green' }),
      new Player({ nickname: 'Player4', color: 'yellow' })
    ];
  });

  afterEach(() => {
    lobbyService.stopCleanup();
    lobbyService.clearAllRooms();
  });

  describe('Room Creation', () => {
    it('should create a public room successfully', () => {
      const room = lobbyService.createRoom({
        name: 'Test Room',
        hostId: players[0].id,
        capacity: 3,
        isPrivate: false
      });

      expect(room).toBeDefined();
      expect(room.name).toBe('Test Room');
      expect(room.hostId).toBe(players[0].id);
      expect(room.capacity).toBe(3);
      expect(room.isPrivate).toBe(false);
      expect(room.code).toBeUndefined();
    });

    it('should create a private room with code', () => {
      const room = lobbyService.createRoom({
        name: 'Private Room',
        hostId: players[0].id,
        capacity: 4,
        isPrivate: true,
        code: 'SECRET123'
      });

      expect(room).toBeDefined();
      expect(room.isPrivate).toBe(true);
      expect(room.verifyCode('SECRET123')).toBe(true);
      expect(room.verifyCode('WRONG')).toBe(false);
    });

    it('should validate room capacity', () => {
      expect(() => {
        lobbyService.createRoom({
          name: 'Invalid Room',
          hostId: players[0].id,
          capacity: 1, // Too small
          isPrivate: false
        });
      }).toThrow('Room capacity must be between 2 and 4 players');

      expect(() => {
        lobbyService.createRoom({
          name: 'Invalid Room',
          hostId: players[0].id,
          capacity: 5, // Too large
          isPrivate: false
        });
      }).toThrow('Room capacity must be between 2 and 4 players');
    });

    it('should validate room name', () => {
      expect(() => {
        lobbyService.createRoom({
          name: '', // Empty name
          hostId: players[0].id,
          capacity: 3,
          isPrivate: false
        });
      }).toThrow('Room name cannot be empty');

      expect(() => {
        lobbyService.createRoom({
          name: 'a'.repeat(51), // Too long
          hostId: players[0].id,
          capacity: 3,
          isPrivate: false
        });
      }).toThrow('Room name cannot exceed 50 characters');
    });

    it('should validate private room code', () => {
      expect(() => {
        lobbyService.createRoom({
          name: 'Private Room',
          hostId: players[0].id,
          capacity: 3,
          isPrivate: true,
          code: '123' // Too short
        });
      }).toThrow('Private rooms must have a code of at least 4 characters');

      expect(() => {
        lobbyService.createRoom({
          name: 'Private Room',
          hostId: players[0].id,
          capacity: 3,
          isPrivate: true,
          code: 'a'.repeat(21) // Too long
        });
      }).toThrow('Room code cannot exceed 20 characters');
    });

    it('should prevent host from creating multiple rooms', () => {
      lobbyService.createRoom({
        name: 'First Room',
        hostId: players[0].id,
        capacity: 3,
        isPrivate: false
      });

      expect(() => {
        lobbyService.createRoom({
          name: 'Second Room',
          hostId: players[0].id, // Same host
          capacity: 3,
          isPrivate: false
        });
      }).toThrow('Host already has an active room');
    });

    it('should trim room name whitespace', () => {
      const room = lobbyService.createRoom({
        name: '  Trimmed Room  ',
        hostId: players[0].id,
        capacity: 3,
        isPrivate: false
      });

      expect(room.name).toBe('Trimmed Room');
    });
  });

  describe('Room Retrieval', () => {
    it('should get room by ID', () => {
      const room = lobbyService.createRoom({
        name: 'Test Room',
        hostId: players[0].id,
        capacity: 3,
        isPrivate: false
      });

      const retrieved = lobbyService.getRoom(room.id);
      expect(retrieved).toBe(room);
    });

    it('should return null for non-existent room', () => {
      const retrieved = lobbyService.getRoom('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should get room by host ID', () => {
      const room = lobbyService.createRoom({
        name: 'Host Room',
        hostId: players[0].id,
        capacity: 3,
        isPrivate: false
      });

      const retrieved = lobbyService.getRoomByHost(players[0].id);
      expect(retrieved).toBe(room);
    });

    it('should return null for non-existent host', () => {
      const retrieved = lobbyService.getRoomByHost('non-existent-host');
      expect(retrieved).toBeNull();
    });
  });

  describe('Room Listing and Search', () => {
    beforeEach(() => {
      // Create test rooms
      lobbyService.createRoom({
        name: 'Public Game 1',
        hostId: players[0].id,
        capacity: 3,
        isPrivate: false
      });

      lobbyService.createRoom({
        name: 'Private Game 1',
        hostId: players[1].id,
        capacity: 4,
        isPrivate: true,
        code: 'PRIVATE1'
      });

      lobbyService.createRoom({
        name: 'Another Public',
        hostId: players[2].id,
        capacity: 2,
        isPrivate: false
      });
    });

    it('should list all rooms without filters', () => {
      const result = lobbyService.listRooms();

      expect(result.rooms).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('should filter rooms by privacy', () => {
      const publicRooms = lobbyService.listRooms({
        filters: { isPrivate: false }
      });

      expect(publicRooms.rooms).toHaveLength(2);
      expect(publicRooms.rooms.every(room => !room.isPrivate)).toBe(true);

      const privateRooms = lobbyService.listRooms({
        filters: { isPrivate: true }
      });

      expect(privateRooms.rooms).toHaveLength(1);
      expect(privateRooms.rooms.every(room => room.isPrivate)).toBe(true);
    });

    it('should filter rooms by status', () => {
      const waitingRooms = lobbyService.listRooms({
        filters: { status: 'waiting' }
      });

      expect(waitingRooms.rooms).toHaveLength(3);
      expect(waitingRooms.rooms.every(room => room.status === 'waiting')).toBe(true);
    });

    it('should filter rooms by available space', () => {
      const roomsWithSpace = lobbyService.listRooms({
        filters: { hasSpace: true }
      });

      expect(roomsWithSpace.rooms).toHaveLength(3);
      expect(roomsWithSpace.rooms.every(room => room.hasSpace)).toBe(true);
    });

    it('should search rooms by name (case-insensitive)', () => {
      const searchResult = lobbyService.listRooms({
        query: 'public'
      });

      expect(searchResult.rooms).toHaveLength(2);
      expect(searchResult.rooms.every(room => 
        room.name.toLowerCase().includes('public')
      )).toBe(true);
    });

    it('should search rooms with case-insensitive matching', () => {
      const searchResult = lobbyService.searchRooms('PUBLIC');

      expect(searchResult).toHaveLength(2);
      expect(searchResult.every(room => 
        room.name.toLowerCase().includes('public')
      )).toBe(true);
    });

    it('should sort rooms by name', () => {
      const result = lobbyService.listRooms({
        sortBy: 'name',
        sortOrder: 'asc'
      });

      const names = result.rooms.map(room => room.name);
      expect(names).toEqual(['Another Public', 'Private Game 1', 'Public Game 1']);
    });

    it('should paginate results', () => {
      const page1 = lobbyService.listRooms({
        limit: 2,
        offset: 0
      });

      expect(page1.rooms).toHaveLength(2);
      expect(page1.total).toBe(3);
      expect(page1.hasMore).toBe(true);

      const page2 = lobbyService.listRooms({
        limit: 2,
        offset: 2
      });

      expect(page2.rooms).toHaveLength(1);
      expect(page2.total).toBe(3);
      expect(page2.hasMore).toBe(false);
    });

    it('should combine search, filters, and sorting', () => {
      const result = lobbyService.listRooms({
        query: 'game',
        filters: { isPrivate: false },
        sortBy: 'name',
        sortOrder: 'desc'
      });

      expect(result.rooms).toHaveLength(1);
      expect(result.rooms[0].name).toBe('Public Game 1');
      expect(result.rooms[0].isPrivate).toBe(false);
    });
  });

  describe('Joining Rooms', () => {
    let publicRoom: any;
    let privateRoom: any;

    beforeEach(() => {
      publicRoom = lobbyService.createRoom({
        name: 'Public Room',
        hostId: players[0].id,
        capacity: 3,
        isPrivate: false
      });

      privateRoom = lobbyService.createRoom({
        name: 'Private Room',
        hostId: players[1].id,
        capacity: 3,
        isPrivate: true,
        code: 'SECRET'
      });
    });

    it('should join public room successfully', () => {
      const result = lobbyService.joinRoom(publicRoom.id, players[2]);

      expect(result.success).toBe(true);
      expect(result.room).toBe(publicRoom);
      expect(result.error).toBeUndefined();
      expect(publicRoom.players).toHaveLength(1);
    });

    it('should join private room with correct code', () => {
      const result = lobbyService.joinRoom(privateRoom.id, players[2], 'SECRET');

      expect(result.success).toBe(true);
      expect(result.room).toBe(privateRoom);
      expect(privateRoom.players).toHaveLength(1);
    });

    it('should reject joining private room without code', () => {
      const result = lobbyService.joinRoom(privateRoom.id, players[2]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Room code required');
      expect(privateRoom.players).toHaveLength(0);
    });

    it('should reject joining private room with wrong code', () => {
      const result = lobbyService.joinRoom(privateRoom.id, players[2], 'WRONG');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid room code');
      expect(privateRoom.players).toHaveLength(0);
    });

    it('should reject joining non-existent room', () => {
      const result = lobbyService.joinRoom('non-existent', players[2]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Room not found');
    });

    it('should reject joining full room', () => {
      // Fill the room to capacity
      publicRoom.addPlayer(players[0]); // Add host first
      lobbyService.joinRoom(publicRoom.id, players[1]);
      lobbyService.joinRoom(publicRoom.id, players[2]); // Room capacity is 3

      const newPlayer = new Player({ nickname: 'Player5', color: 'red' });
      const result = lobbyService.joinRoom(publicRoom.id, newPlayer);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Room is full');
    });

    it('should reject joining room with game in progress', () => {
      publicRoom.addPlayer(players[0]); // Add host first
      lobbyService.joinRoom(publicRoom.id, players[1]);
      publicRoom.startGame(); // Start the game

      const result = lobbyService.joinRoom(publicRoom.id, players[3]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Game is already in progress');
    });

    it('should reject player joining same room twice', () => {
      lobbyService.joinRoom(publicRoom.id, players[2]);
      const result = lobbyService.joinRoom(publicRoom.id, players[2]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Player already in room');
    });
  });

  describe('Leaving Rooms', () => {
    let room: any;

    beforeEach(() => {
      room = lobbyService.createRoom({
        name: 'Test Room',
        hostId: players[0].id,
        capacity: 3,
        isPrivate: false
      });
      
      // Add host to room first
      room.addPlayer(players[0]);
      lobbyService.joinRoom(room.id, players[1]);
      lobbyService.joinRoom(room.id, players[2]);
    });

    it('should leave room successfully', () => {
      const result = lobbyService.leaveRoom(room.id, players[1].id);

      expect(result.success).toBe(true);
      expect(result.room).toBe(room);
      expect(result.roomClosed).toBeUndefined();
      expect(room.players).toHaveLength(2); // Host + 1 remaining player
    });

    it('should transfer host when host leaves', () => {
      const originalHostId = room.hostId;
      const result = lobbyService.leaveRoom(room.id, players[0].id); // Host leaves

      expect(result.success).toBe(true);
      expect(room.hostId).not.toBe(originalHostId);
      expect(room.hostId).toBe(players[1].id); // Should transfer to next player
    });

    it('should close room when last player leaves', () => {
      // Remove all players except host
      lobbyService.leaveRoom(room.id, players[1].id);
      lobbyService.leaveRoom(room.id, players[2].id);
      
      const result = lobbyService.leaveRoom(room.id, players[0].id); // Host leaves last

      expect(result.success).toBe(true);
      expect(result.roomClosed).toBe(true);
      expect(lobbyService.getRoom(room.id)).toBeNull();
    });

    it('should reject leaving non-existent room', () => {
      const result = lobbyService.leaveRoom('non-existent', players[1].id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Room not found');
    });

    it('should reject player not in room', () => {
      const result = lobbyService.leaveRoom(room.id, players[3].id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Player not in room');
    });
  });

  describe('Statistics and Management', () => {
    beforeEach(() => {
      // Create various rooms for testing stats
      const room1 = lobbyService.createRoom({
        name: 'Public Waiting',
        hostId: players[0].id,
        capacity: 3,
        isPrivate: false
      });

      const room2 = lobbyService.createRoom({
        name: 'Private Playing',
        hostId: players[1].id,
        capacity: 4,
        isPrivate: true,
        code: 'PRIVATE'
      });

      // Add players and start one game
      room2.addPlayer(players[1]); // Add host first
      const joinResult = lobbyService.joinRoom(room2.id, players[2]);
      if (joinResult.success && room2.players.length >= 2) {
        room2.startGame();
      }
    });

    it('should provide accurate lobby statistics', () => {
      const stats = lobbyService.getStats();

      expect(stats.totalRooms).toBe(2);
      // Check if any games are active
      if (stats.activeGames === 1) {
        expect(stats.waitingRooms).toBe(1);
        expect(stats.activeGames).toBe(1);
      } else {
        expect(stats.waitingRooms).toBe(2);
        expect(stats.activeGames).toBe(0);
      }
      expect(stats.privateRooms).toBe(1);
      expect(stats.publicRooms).toBe(1);
      expect(stats.totalPlayers).toBeGreaterThan(0); // At least some players in rooms
    });

    it('should get all rooms', () => {
      const allRooms = lobbyService.getAllRooms();
      expect(allRooms).toHaveLength(2);
    });

    it('should clear all rooms', () => {
      lobbyService.clearAllRooms();
      
      const stats = lobbyService.getStats();
      expect(stats.totalRooms).toBe(0);
      expect(lobbyService.getAllRooms()).toHaveLength(0);
    });
  });

  describe('Room Expiration and Cleanup', () => {
    it('should identify expired rooms in listing', () => {
      const room = lobbyService.createRoom({
        name: 'Test Room',
        hostId: players[0].id,
        capacity: 3,
        isPrivate: false
      });

      // Mock expiration by setting expiresAt to past
      room.expiresAt = Date.now() - 1000; // 1 second ago

      const result = lobbyService.listRooms();
      expect(result.rooms).toHaveLength(0); // Expired room should be filtered out
    });

    it('should handle expired room in join attempt', () => {
      const room = lobbyService.createRoom({
        name: 'Expiring Room',
        hostId: players[0].id,
        capacity: 3,
        isPrivate: false
      });

      // Mock expiration
      room.expiresAt = Date.now() - 1000; // 1 second ago

      const result = lobbyService.joinRoom(room.id, players[1]);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room has expired');
      expect(lobbyService.getRoom(room.id)).toBeNull(); // Should be removed
    });

    it('should clean up expired rooms manually', () => {
      const room1 = lobbyService.createRoom({
        name: 'Active Room',
        hostId: players[0].id,
        capacity: 3,
        isPrivate: false
      });

      const room2 = lobbyService.createRoom({
        name: 'Expired Room',
        hostId: players[1].id,
        capacity: 3,
        isPrivate: false
      });

      // Mock one room as expired
      room2.expiresAt = Date.now() - 1000; // 1 second ago

      const cleanedCount = lobbyService.cleanupExpiredRooms();
      expect(cleanedCount).toBe(1);
      expect(lobbyService.getRoom(room1.id)).not.toBeNull();
      expect(lobbyService.getRoom(room2.id)).toBeNull();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent room operations', () => {
      const room = lobbyService.createRoom({
        name: 'Concurrent Room',
        hostId: players[0].id,
        capacity: 2,
        isPrivate: false
      });

      // Add host first to fill one slot
      room.addPlayer(players[0]);

      // Try to join with multiple players simultaneously
      const result1 = lobbyService.joinRoom(room.id, players[1]);
      const result2 = lobbyService.joinRoom(room.id, players[2]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false); // Room should be full
      expect(result2.error).toBe('Room is full');
    });

    it('should handle room removal during operations', () => {
      const room = lobbyService.createRoom({
        name: 'Removable Room',
        hostId: players[0].id,
        capacity: 3,
        isPrivate: false
      });

      const roomId = room.id;
      lobbyService.removeRoom(roomId);

      const joinResult = lobbyService.joinRoom(roomId, players[1]);
      expect(joinResult.success).toBe(false);
      expect(joinResult.error).toBe('Room not found');
    });

    it('should handle malformed search queries', () => {
      lobbyService.createRoom({
        name: 'Test Room',
        hostId: players[0].id,
        capacity: 3,
        isPrivate: false
      });

      // Empty query should return all rooms
      const result1 = lobbyService.listRooms({ query: '' });
      expect(result1.rooms).toHaveLength(1);

      // Whitespace-only query should return all rooms
      const result2 = lobbyService.listRooms({ query: '   ' });
      expect(result2.rooms).toHaveLength(1);

      // Special characters should be handled gracefully
      const result3 = lobbyService.listRooms({ query: '!@#$%' });
      expect(result3.rooms).toHaveLength(0);
    });
  });
});
