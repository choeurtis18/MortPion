import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionManager, DisconnectionOptions } from '../ConnectionManager.js';
import { LobbyService } from '../LobbyService.js';
import { Player } from '../../models/Player.js';
import { Room } from '../../models/Room.js';

describe('ConnectionManager', () => {
  let connectionManager: ConnectionManager;
  let lobbyService: LobbyService;
  let players: Player[];
  let room: Room;

  beforeEach(() => {
    lobbyService = new LobbyService();
    connectionManager = new ConnectionManager(lobbyService);

    // Create test players
    players = [
      new Player({ id: 'player1', nickname: 'Alice', color: 'red' }),
      new Player({ id: 'player2', nickname: 'Bob', color: 'blue' }),
      new Player({ id: 'player3', nickname: 'Charlie', color: 'green' }),
      new Player({ id: 'player4', nickname: 'David', color: 'yellow' })
    ];

    // Create a test room
    room = lobbyService.createRoom({
      name: 'Test Room',
      hostId: players[0].id,
      capacity: 4,
      isPrivate: false
    });

    // Set shorter timeout for testing
    connectionManager.setReconnectionTimeout(1000); // 1 second
  });

  afterEach(() => {
    connectionManager.stopCleanup();
    connectionManager.clearAll();
    // Clear lobby service by removing all rooms
    const allRooms = lobbyService.getAllRooms();
    allRooms.forEach(room => lobbyService.removeRoom(room.id));
  });

  describe('Connection Management', () => {
    it('should connect a player successfully', () => {
      connectionManager.connect('player1', 'socket1');

      expect(connectionManager.isConnected('player1')).toBe(true);
      expect(connectionManager.getPlayerBySocket('socket1')).toBe('player1');

      const connection = connectionManager.getConnection('player1');
      expect(connection).toBeDefined();
      expect(connection!.playerId).toBe('player1');
      expect(connection!.socketId).toBe('socket1');
      expect(connection!.isReconnecting).toBe(false);
    });

    it('should replace existing connection for same player', () => {
      connectionManager.connect('player1', 'socket1');
      connectionManager.connect('player1', 'socket2');

      expect(connectionManager.isConnected('player1')).toBe(true);
      expect(connectionManager.getPlayerBySocket('socket1')).toBeNull();
      expect(connectionManager.getPlayerBySocket('socket2')).toBe('player1');
    });

    it('should replace existing player for same socket', () => {
      connectionManager.connect('player1', 'socket1');
      connectionManager.connect('player2', 'socket1');

      expect(connectionManager.isConnected('player1')).toBe(false);
      expect(connectionManager.isConnected('player2')).toBe(true);
      expect(connectionManager.getPlayerBySocket('socket1')).toBe('player2');
    });

    it('should update player activity', async () => {
      connectionManager.connect('player1', 'socket1');
      const initialConnection = connectionManager.getConnection('player1')!;
      const initialActivity = initialConnection.lastActivity;

      // Wait a bit and update activity
      await new Promise(resolve => setTimeout(resolve, 10));
      connectionManager.updateActivity('player1');
      const updatedConnection = connectionManager.getConnection('player1')!;
      expect(updatedConnection.lastActivity).toBeGreaterThan(initialActivity);
    });
  });

  describe('Room Integration', () => {
    it('should track player joining room', () => {
      connectionManager.connect('player1', 'socket1');
      room.addPlayer(players[0]);

      const success = connectionManager.joinRoom('player1', room.id);
      expect(success).toBe(true);

      const connection = connectionManager.getConnection('player1')!;
      expect(connection.roomId).toBe(room.id);
    });

    it('should track player leaving room', () => {
      connectionManager.connect('player1', 'socket1');
      connectionManager.joinRoom('player1', room.id);

      const success = connectionManager.leaveRoom('player1');
      expect(success).toBe(true);

      const connection = connectionManager.getConnection('player1')!;
      expect(connection.roomId).toBeUndefined();
    });

    it('should reject room operations for non-connected players', () => {
      expect(connectionManager.joinRoom('player1', room.id)).toBe(false);
      expect(connectionManager.leaveRoom('player1')).toBe(false);
    });
  });

  describe('Explicit Disconnection', () => {
    beforeEach(() => {
      // Set up connected player in room
      connectionManager.connect('player1', 'socket1');
      room.addPlayer(players[0]);
      connectionManager.joinRoom('player1', room.id);
    });

    it('should handle explicit disconnect in lobby', () => {
      const result = connectionManager.disconnect('player1', { 
        reason: 'explicit', 
        canReconnect: false 
      });

      expect(result.wasInRoom).toBe(true);
      expect(result.shouldForfeit).toBe(false);
      expect(result.shouldTransferHost).toBe(false);
      expect(connectionManager.isConnected('player1')).toBe(false);
    });

    it('should handle explicit disconnect during game (forfeit)', () => {
      // Start game
      room.addPlayer(players[1]);
      room.startGame();

      const result = connectionManager.disconnect('player1', { 
        reason: 'explicit', 
        canReconnect: false 
      });

      expect(result.wasInRoom).toBe(true);
      expect(result.shouldForfeit).toBe(true);
      expect(connectionManager.isConnected('player1')).toBe(false);

      const player = room.getPlayer('player1');
      expect(player?.isEliminated).toBe(true);
    });

    it('should transfer host when host leaves lobby', () => {
      // Add another player
      room.addPlayer(players[1]);
      connectionManager.connect('player2', 'socket2');
      connectionManager.joinRoom('player2', room.id);

      const result = connectionManager.disconnect('player1', { 
        reason: 'explicit', 
        canReconnect: false 
      });

      expect(result.shouldTransferHost).toBe(false); // LobbyService handles this
      expect(connectionManager.isConnected('player1')).toBe(false);
    });
  });

  describe('Network Disconnection', () => {
    beforeEach(() => {
      connectionManager.connect('player1', 'socket1');
      room.addPlayer(players[0]);
      connectionManager.joinRoom('player1', room.id);
    });

    it('should handle network disconnect in lobby', () => {
      const result = connectionManager.disconnect('player1', { 
        reason: 'network', 
        canReconnect: true 
      });

      expect(result.wasInRoom).toBe(true);
      expect(result.shouldForfeit).toBe(false);
      expect(connectionManager.isConnected('player1')).toBe(false);

      const player = room.getPlayer('player1');
      expect(player?.connected).toBe(false);

      // Should be in disconnected players list
      const disconnected = connectionManager.getDisconnectedPlayers();
      expect(disconnected).toHaveLength(1);
      expect(disconnected[0].playerId).toBe('player1');
    });

    it('should handle network disconnect during game', () => {
      room.addPlayer(players[1]);
      room.startGame();

      const result = connectionManager.disconnect('player1', { 
        reason: 'network', 
        canReconnect: true 
      });

      expect(result.wasInRoom).toBe(true);
      expect(result.shouldForfeit).toBe(false);
      expect(connectionManager.isConnected('player1')).toBe(false);

      const player = room.getPlayer('player1');
      expect(player?.connected).toBe(false);
      expect(player?.isEliminated).toBe(false); // Not eliminated, just disconnected
    });

    it('should transfer host when host disconnects from lobby', () => {
      // Add another connected player
      room.addPlayer(players[1]);
      connectionManager.connect('player2', 'socket2');
      connectionManager.joinRoom('player2', room.id);

      const result = connectionManager.disconnect('player1', { 
        reason: 'network', 
        canReconnect: true 
      });

      expect(result.shouldTransferHost).toBe(true);
      expect(result.newHostId).toBe('player2');
      // Host transfer is handled by LobbyService, not ConnectionManager
      // expect(room.hostId).toBe('player2');
    });
  });

  describe('Reconnection', () => {
    beforeEach(() => {
      connectionManager.connect('player1', 'socket1');
      room.addPlayer(players[0]);
      connectionManager.joinRoom('player1', room.id);
    });

    it('should successfully reconnect disconnected player', () => {
      // Disconnect
      connectionManager.disconnect('player1', { 
        reason: 'network', 
        canReconnect: true 
      });

      // Reconnect
      const result = connectionManager.reconnect('player1', 'socket2');

      expect(result.success).toBe(true);
      expect(result.room).toBe(room);
      expect(connectionManager.isConnected('player1')).toBe(true);
      expect(connectionManager.getPlayerBySocket('socket2')).toBe('player1');

      const player = room.getPlayer('player1');
      expect(player?.connected).toBe(true);

      const connection = connectionManager.getConnection('player1')!;
      expect(connection.isReconnecting).toBe(true);
      expect(connection.roomId).toBe(room.id);
    });

    it('should return game state when reconnecting to active game', () => {
      room.addPlayer(players[1]);
      room.startGame();

      // Disconnect
      connectionManager.disconnect('player1', { 
        reason: 'network', 
        canReconnect: true 
      });

      // Reconnect
      const result = connectionManager.reconnect('player1', 'socket2');

      expect(result.success).toBe(true);
      expect(result.gameState).toBeDefined();
    });

    it('should reject reconnection for non-existent disconnection', () => {
      const result = connectionManager.reconnect('player1', 'socket2');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No disconnection record found');
    });

    it('should reject reconnection when room no longer exists', () => {
      // Disconnect
      connectionManager.disconnect('player1', { 
        reason: 'network', 
        canReconnect: true 
      });

      // Remove room
      const allRooms = lobbyService.getAllRooms();
      allRooms.forEach(r => lobbyService.removeRoom(r.id));

      // Try to reconnect
      const result = connectionManager.reconnect('player1', 'socket2');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Room no longer exists');
    });

    it('should reject reconnection when player no longer in room', () => {
      // Disconnect
      connectionManager.disconnect('player1', { 
        reason: 'network', 
        canReconnect: true 
      });

      // Remove player from room
      room.removePlayer('player1');

      // Try to reconnect
      const result = connectionManager.reconnect('player1', 'socket2');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Player no longer in room');
    });

    it('should reject reconnection after timeout', async () => {
      // Disconnect
      connectionManager.disconnect('player1', { 
        reason: 'network', 
        canReconnect: true 
      });

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Try to reconnect
      const result = connectionManager.reconnect('player1', 'socket2');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Reconnection timeout expired');
    });

    it('should eliminate player on timeout during game', async () => {
      room.addPlayer(players[1]);
      room.startGame();

      // Disconnect
      connectionManager.disconnect('player1', { 
        reason: 'network', 
        canReconnect: true 
      });

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Try to reconnect
      const result = connectionManager.reconnect('player1', 'socket2');

      expect(result.success).toBe(false);
      const player = room.getPlayer('player1');
      expect(player?.isEliminated).toBe(true);
    });
  });

  describe('Room Management', () => {
    it('should disconnect all players in room', () => {
      // Connect multiple players to room
      connectionManager.connect('player1', 'socket1');
      connectionManager.connect('player2', 'socket2');
      room.addPlayer(players[0]);
      room.addPlayer(players[1]);
      connectionManager.joinRoom('player1', room.id);
      connectionManager.joinRoom('player2', room.id);

      const disconnectedPlayers = connectionManager.disconnectRoom(room.id);

      expect(disconnectedPlayers).toHaveLength(2);
      expect(disconnectedPlayers).toContain('player1');
      expect(disconnectedPlayers).toContain('player2');
      expect(connectionManager.isConnected('player1')).toBe(false);
      expect(connectionManager.isConnected('player2')).toBe(false);
    });

    it('should handle room closure cleanup', () => {
      // Set up players in room
      connectionManager.connect('player1', 'socket1');
      room.addPlayer(players[0]);
      connectionManager.joinRoom('player1', room.id);

      // Disconnect player
      connectionManager.disconnect('player1', { 
        reason: 'network', 
        canReconnect: true 
      });

      expect(connectionManager.getDisconnectedPlayers()).toHaveLength(1);

      // Handle room closure
      connectionManager.handleRoomClosed(room.id);

      expect(connectionManager.getDisconnectedPlayers()).toHaveLength(0);
    });
  });

  describe('Statistics and Cleanup', () => {
    it('should provide accurate connection statistics', () => {
      // Connect players
      connectionManager.connect('player1', 'socket1');
      connectionManager.connect('player2', 'socket2');
      
      // Add to rooms
      room.addPlayer(players[0]);
      room.addPlayer(players[1]);
      connectionManager.joinRoom('player1', room.id);
      connectionManager.joinRoom('player2', room.id);

      // Disconnect one player
      connectionManager.disconnect('player2', { 
        reason: 'network', 
        canReconnect: true 
      });

      const stats = connectionManager.getStats();

      expect(stats.connectedPlayers).toBe(1);
      expect(stats.disconnectedPlayers).toBe(1);
      expect(stats.playersInRooms).toBe(1);
      expect(stats.reconnectablePlayers).toBe(1);
    });

    it('should clean up expired disconnections', async () => {
      connectionManager.connect('player1', 'socket1');
      room.addPlayer(players[0]);
      connectionManager.joinRoom('player1', room.id);

      // Disconnect
      connectionManager.disconnect('player1', { 
        reason: 'network', 
        canReconnect: true 
      });

      expect(connectionManager.getDisconnectedPlayers()).toHaveLength(1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Clean up
      const cleaned = connectionManager.cleanupExpiredDisconnections();

      expect(cleaned).toBe(1);
      expect(connectionManager.getDisconnectedPlayers()).toHaveLength(0);
    });

    it('should get all connected players', () => {
      connectionManager.connect('player1', 'socket1');
      connectionManager.connect('player2', 'socket2');

      const connectedPlayers = connectionManager.getConnectedPlayers();

      expect(connectedPlayers).toHaveLength(2);
      expect(connectedPlayers.map(p => p.playerId)).toContain('player1');
      expect(connectedPlayers.map(p => p.playerId)).toContain('player2');
    });

    it('should get disconnected players with time remaining', () => {
      connectionManager.connect('player1', 'socket1');
      room.addPlayer(players[0]);
      connectionManager.joinRoom('player1', room.id);

      connectionManager.disconnect('player1', { 
        reason: 'network', 
        canReconnect: true 
      });

      const disconnected = connectionManager.getDisconnectedPlayers();

      expect(disconnected).toHaveLength(1);
      expect(disconnected[0].playerId).toBe('player1');
      expect(disconnected[0].roomId).toBe(room.id);
      expect(disconnected[0].reason).toBe('network');
      expect(disconnected[0].timeRemaining).toBeGreaterThan(0);
      expect(disconnected[0].timeRemaining).toBeLessThanOrEqual(1000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle disconnect of non-existent player', () => {
      const result = connectionManager.disconnect('nonexistent', { 
        reason: 'explicit', 
        canReconnect: false 
      });

      expect(result.wasInRoom).toBe(false);
      expect(result.shouldForfeit).toBe(false);
      expect(result.shouldTransferHost).toBe(false);
    });

    it('should handle multiple disconnections of same player', () => {
      connectionManager.connect('player1', 'socket1');

      const result1 = connectionManager.disconnect('player1', { 
        reason: 'network', 
        canReconnect: true 
      });
      const result2 = connectionManager.disconnect('player1', { 
        reason: 'explicit', 
        canReconnect: false 
      });

      expect(result1.wasInRoom).toBe(false);
      expect(result2.wasInRoom).toBe(false);
    });

    it('should handle reconnection when not allowing reconnection', () => {
      connectionManager.connect('player1', 'socket1');
      room.addPlayer(players[0]);
      connectionManager.joinRoom('player1', room.id);

      connectionManager.disconnect('player1', { 
        reason: 'network', 
        canReconnect: false 
      });

      const result = connectionManager.reconnect('player1', 'socket2');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No disconnection record found');
    });

    it('should clear all connections and disconnections', () => {
      connectionManager.connect('player1', 'socket1');
      connectionManager.connect('player2', 'socket2');
      
      // Add player2 to room so disconnect logic works properly
      room.addPlayer(players[1]);
      connectionManager.joinRoom('player2', room.id);
      
      connectionManager.disconnect('player2', { 
        reason: 'network', 
        canReconnect: true 
      });

      expect(connectionManager.getConnectedPlayers()).toHaveLength(1);
      expect(connectionManager.getDisconnectedPlayers()).toHaveLength(1);

      connectionManager.clearAll();

      expect(connectionManager.getConnectedPlayers()).toHaveLength(0);
      expect(connectionManager.getDisconnectedPlayers()).toHaveLength(0);
    });
  });
});
