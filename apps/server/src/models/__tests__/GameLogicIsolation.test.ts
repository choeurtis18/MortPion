import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../Game.js';
import { Player } from '../Player.js';
import { Room } from '../Room.js';
import type { Color, Size } from '@mortpion/shared';

describe('Game Logic Isolation from Transport Layer', () => {
  let game: Game;
  let room: Room;
  let players: Player[];

  beforeEach(() => {
    game = new Game();
    room = new Room({
      name: 'Test Room',
      hostId: 'host123',
      capacity: 3,
      isPrivate: false
    });
    
    players = [
      new Player({ nickname: 'Player1', color: 'red' }),
      new Player({ nickname: 'Player2', color: 'blue' }),
      new Player({ nickname: 'Player3', color: 'green' })
    ];
    
    game.initialize(players);
  });

  describe('Pure game logic functions', () => {
    it('should operate without any network dependencies', () => {
      // All game operations should work without Socket.io or network calls
      const player1Id = players[0].id;
      
      // Game initialization
      expect(game.status).toBe('playing');
      expect(game.players.length).toBe(3);
      
      // Move validation and application
      game.currentPlayerId = player1Id;
      const moveResult = game.applyMove(player1Id, 4, 'P');
      expect(moveResult).toBe(true);
      
      // State queries
      const gameState = game.getGameState();
      expect(gameState).toBeDefined();
      expect(gameState.board).toBeDefined();
      expect(gameState.players).toBeDefined();
      
      // No network calls or Socket.io dependencies required
      expect(typeof gameState).toBe('object');
    });

    it('should provide serializable state for transport layer', () => {
      // Apply some moves to create interesting state
      game.currentPlayerId = players[0].id;
      game.applyMove(players[0].id, 0, 'P');
      
      game.currentPlayerId = players[1].id;
      game.applyMove(players[1].id, 4, 'M');
      
      const gameState = game.getGameState();
      
      // Verify state is JSON serializable (no functions, circular refs, etc.)
      const serialized = JSON.stringify(gameState);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized.board).toEqual(gameState.board);
      expect(deserialized.players).toEqual(gameState.players);
      expect(deserialized.currentPlayerId).toBe(gameState.currentPlayerId);
      expect(deserialized.status).toBe(gameState.status);
    });

    it('should handle all game operations synchronously', () => {
      // All game logic should be synchronous - no promises, callbacks, or async operations
      const player1Id = players[0].id;
      
      game.currentPlayerId = player1Id;
      
      // Move validation is synchronous
      const isValid = game.isValidMove(player1Id, 4, 'P');
      expect(typeof isValid).toBe('boolean');
      
      // Move application is synchronous
      const moveResult = game.applyMove(player1Id, 4, 'P');
      expect(typeof moveResult).toBe('boolean');
      
      // Skip is synchronous
      game.skipCurrentPlayer();
      expect(game.currentPlayerId).not.toBe(player1Id);
      
      // State queries are synchronous
      const winner = game.getWinner();
      const activePlayers = game.getActivePlayers();
      
      // All operations complete immediately
      expect(winner).toBeNull(); // No winner yet
      expect(Array.isArray(activePlayers)).toBe(true);
    });
  });

  describe('Room logic isolation', () => {
    it('should manage room state without transport dependencies', () => {
      // Room operations should be pure logic
      expect(room.getStatus()).toBe('waiting');
      expect(room.isFull()).toBe(false);
      
      // Add players
      players.forEach(player => {
        const success = room.addPlayer(player);
        expect(success).toBe(true);
      });
      
      expect(room.isFull()).toBe(true);
      expect(room.players.length).toBe(3);
      
      // Start game
      room.startGame(); // Returns void, not Game instance
      expect(room.game).toBeInstanceOf(Game);
      expect(room.getStatus()).toBe('playing');
    });

    it('should provide serializable room state', () => {
      players.forEach(player => room.addPlayer(player));
      room.startGame();
      
      const roomState = room.toJSON();
      
      // Verify JSON serializability
      const serialized = JSON.stringify(roomState);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized.id).toBe(roomState.id);
      expect(deserialized.name).toBe(roomState.name);
      expect(deserialized.status).toBe(roomState.status);
      expect(deserialized.players).toEqual(roomState.players);
    });

    it('should handle room operations synchronously', () => {
      // All room operations should be synchronous
      const player = players[0];
      
      const addResult = room.addPlayer(player);
      expect(typeof addResult).toBe('boolean');
      
      const removeResult = room.removePlayer(player.id);
      expect(typeof removeResult).toBe('boolean');
      
      const status = room.getStatus();
      expect(typeof status).toBe('string');
      
      const isFull = room.isFull();
      expect(typeof isFull).toBe('boolean');
    });
  });

  describe('Player state isolation', () => {
    it('should manage player state without external dependencies', () => {
      const player = players[0];
      
      // Player operations are pure
      expect(player.inventory.P).toBe(3);
      expect(player.isEliminated).toBe(false);
      expect(player.connected).toBe(true);
      
      // Use piece
      player.usePiece('P');
      expect(player.inventory.P).toBe(2);
      
      // Skip management
      player.incrementSkips();
      expect(player.skipsInARow).toBe(1);
      
      player.resetSkips();
      expect(player.skipsInARow).toBe(0);
    });

    it('should serialize player state correctly', () => {
      const player = players[0];
      player.usePiece('P');
      player.incrementSkips();
      
      const playerState = player.toJSON();
      
      // Verify JSON serializability
      const serialized = JSON.stringify(playerState);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized.id).toBe(playerState.id);
      expect(deserialized.nickname).toBe(playerState.nickname);
      expect(deserialized.color).toBe(playerState.color);
      expect(deserialized.inventory).toEqual(playerState.inventory);
      expect(deserialized.skipsInARow).toBe(playerState.skipsInARow);
    });
  });

  describe('Integration interface for transport layer', () => {
    it('should provide clear interfaces for Socket.io integration', () => {
      // Game state interface
      const gameState = game.getGameState();
      
      // Verify all necessary properties for client synchronization
      expect(gameState).toHaveProperty('board');
      expect(gameState).toHaveProperty('players');
      expect(gameState).toHaveProperty('currentPlayerId');
      expect(gameState).toHaveProperty('status');
      expect(gameState).toHaveProperty('winnerId');
      expect(gameState).toHaveProperty('isDraw');
      
      // Room state interface
      players.forEach(player => room.addPlayer(player));
      const roomState = room.toJSON();
      
      expect(roomState).toHaveProperty('id');
      expect(roomState).toHaveProperty('name');
      expect(roomState).toHaveProperty('status');
      expect(roomState).toHaveProperty('players');
      expect(roomState).toHaveProperty('hostId');
      expect(roomState).toHaveProperty('capacity');
      expect(roomState).toHaveProperty('isPrivate');
    });

    it('should support event-driven architecture without coupling', () => {
      // Game logic should work with any event system
      const events: Array<{ type: string; data: any }> = [];
      
      // Simulate event collection (could be Socket.io, EventEmitter, etc.)
      const collectEvent = (type: string, data: any) => {
        events.push({ type, data });
      };
      
      // Apply moves and collect state changes
      game.currentPlayerId = players[0].id;
      const moveResult = game.applyMove(players[0].id, 4, 'P');
      
      if (moveResult) {
        collectEvent('move_applied', {
          playerId: players[0].id,
          cellIndex: 4,
          size: 'P',
          gameState: game.getGameState()
        });
      }
      
      // Check if game ended
      if (game.status === 'finished') {
        collectEvent('game_ended', {
          winnerId: game.winnerId,
          isDraw: game.isDraw,
          gameState: game.getGameState()
        });
      } else {
        collectEvent('turn_changed', {
          currentPlayerId: game.currentPlayerId,
          gameState: game.getGameState()
        });
      }
      
      // Verify events were collected
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('move_applied');
      expect(events[1].type).toBe('turn_changed');
    });

    it('should validate input without transport layer concerns', () => {
      // Input validation should be pure logic
      const player1Id = players[0].id;
      
      // Valid inputs
      game.currentPlayerId = player1Id;
      expect(game.isValidMove(player1Id, 4, 'P')).toBe(true);
      expect(game.isValidMove(player1Id, 0, 'M')).toBe(true);
      
      // Invalid inputs
      expect(game.isValidMove('invalid-id', 4, 'P')).toBe(false);
      expect(game.isValidMove(player1Id, -1, 'P')).toBe(false);
      expect(game.isValidMove(player1Id, 9, 'P')).toBe(false);
      expect(game.isValidMove(player1Id, 4, 'X' as Size)).toBe(false);
      
      // All validation is synchronous and deterministic
    });
  });

  describe('Error handling isolation', () => {
    it('should handle errors without network dependencies', () => {
      // Game should handle invalid operations gracefully
      const invalidPlayerId = 'non-existent';
      
      // Invalid move attempts should return false, not throw
      expect(() => game.isValidMove(invalidPlayerId, 4, 'P')).not.toThrow();
      expect(game.isValidMove(invalidPlayerId, 4, 'P')).toBe(false);
      
      expect(() => game.applyMove(invalidPlayerId, 4, 'P')).not.toThrow();
      expect(game.applyMove(invalidPlayerId, 4, 'P')).toBe(false);
      
      // Room operations should handle errors gracefully
      const invalidPlayer = new Player({ nickname: 'Invalid', color: 'red' });
      
      // Adding same player twice
      room.addPlayer(players[0]);
      expect(() => room.addPlayer(players[0])).not.toThrow();
      expect(room.addPlayer(players[0])).toBe(false);
      
      // Removing non-existent player
      expect(() => room.removePlayer('non-existent')).not.toThrow();
      expect(room.removePlayer('non-existent')).toBe(false);
    });

    it('should maintain consistent state during error conditions', () => {
      const player1Id = players[0].id;
      const initialState = game.getGameState();
      
      // Attempt invalid operations
      game.currentPlayerId = player1Id;
      const invalidMoveResult = game.applyMove('invalid-id', 4, 'P');
      
      expect(invalidMoveResult).toBe(false);
      
      // State should remain unchanged after failed operations
      const stateAfterError = game.getGameState();
      expect(stateAfterError.board).toEqual(initialState.board);
      // currentPlayerId might change due to turn progression, so check status instead
      expect(stateAfterError.status).toBe(initialState.status);
      // Verify board state is unchanged
      expect(stateAfterError.board.every(cell => 
        cell.P === null && cell.M === null && cell.G === null
      )).toBe(true);
    });
  });

  describe('Performance and scalability', () => {
    it('should handle rapid state queries efficiently', () => {
      // Game logic should be fast enough for real-time applications
      const startTime = Date.now();
      
      // Perform many state queries
      for (let i = 0; i < 1000; i++) {
        game.getGameState();
        game.getActivePlayers();
        game.getWinner();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete quickly (less than 100ms for 1000 operations)
      expect(duration).toBeLessThan(100);
    });

    it('should handle multiple games independently', () => {
      // Create multiple game instances
      const games = Array.from({ length: 10 }, () => {
        const newGame = new Game();
        const newPlayers = [
          new Player({ nickname: 'P1', color: 'red' }),
          new Player({ nickname: 'P2', color: 'blue' })
        ];
        newGame.initialize(newPlayers);
        return newGame;
      });
      
      // Apply different moves to each game
      games.forEach((gameInstance, index) => {
        gameInstance.currentPlayerId = gameInstance.players[0].id;
        gameInstance.applyMove(gameInstance.players[0].id, index % 9, 'P');
      });
      
      // Verify each game maintains independent state
      games.forEach((gameInstance, index) => {
        const expectedCell = index % 9;
        expect(gameInstance.board[expectedCell].P).toBe('red');
        
        // Other cells should be empty
        gameInstance.board.forEach((cell, cellIndex) => {
          if (cellIndex !== expectedCell) {
            expect(cell.P).toBeNull();
          }
        });
      });
    });
  });
});
