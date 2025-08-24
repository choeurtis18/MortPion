import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../Game';
import { Player } from '../Player';

describe('Game', () => {
  let game: Game;
  let players: Player[];

  beforeEach(() => {
    players = [
      new Player({ nickname: 'Player1', color: 'red' }),
      new Player({ nickname: 'Player2', color: 'blue' }),
    ];
    game = new Game();
  });

  describe('constructor', () => {
    it('should initialize with correct default values', () => {
      expect(game.players).toEqual([]);
      expect(game.currentPlayerId).toBeNull();
      expect(game.status).toBe('waiting');
      expect(game.winnerId).toBeNull();
      expect(game.isDraw).toBe(false);
      expect(game.board).toHaveLength(9);
      expect(game.board.every(cell => cell.P === null && cell.M === null && cell.G === null)).toBe(true);
    });
  });

  describe('initialize', () => {
    it('should initialize game with players', () => {
      game.initialize(players);
      
      expect(game.players).toEqual(players);
      expect(game.status).toBe('playing');
      expect(game.currentPlayerId).toBeDefined();
      expect(game.startedAt).toBeDefined();
    });

    it('should throw error with less than 2 players', () => {
      expect(() => game.initialize([players[0]])).toThrow('Game requires 2-4 players');
    });

    it('should throw error with more than 4 players', () => {
      const manyPlayers = [
        new Player({ nickname: 'P1', color: 'red' }),
        new Player({ nickname: 'P2', color: 'blue' }),
        new Player({ nickname: 'P3', color: 'green' }),
        new Player({ nickname: 'P4', color: 'yellow' }),
        new Player({ nickname: 'P5', color: 'red' }),
      ];
      expect(() => game.initialize(manyPlayers)).toThrow('Game requires 2-4 players');
    });
  });

  describe('getCurrentPlayer', () => {
    beforeEach(() => {
      game.initialize(players);
    });

    it('should return current player', () => {
      const currentPlayer = game.getCurrentPlayer();
      expect(currentPlayer).toBeDefined();
      // Check that current player ID matches one of the original player IDs
      const playerIds = players.map(p => p.id);
      expect(playerIds).toContain(currentPlayer!.id);
    });

    it('should return null when no current player', () => {
      const emptyGame = new Game();
      expect(emptyGame.getCurrentPlayer()).toBeNull();
    });
  });

  describe('move validation and application', () => {
    beforeEach(() => {
      game.initialize(players);
    });

    it('should validate moves correctly', () => {
      const currentPlayer = game.getCurrentPlayer()!;
      
      // Valid move
      expect(game.isValidMove(currentPlayer.id, 0, 'P')).toBe(true);
      
      // Invalid: wrong player
      const otherPlayer = players.find(p => p.id !== currentPlayer.id)!;
      expect(game.isValidMove(otherPlayer.id, 0, 'P')).toBe(false);
      
      // Invalid: out of bounds
      expect(game.isValidMove(currentPlayer.id, 10, 'P')).toBe(false);
    });

    it('should apply moves correctly', () => {
      const currentPlayer = game.getCurrentPlayer()!;
      const initialInventory = currentPlayer.inventory.P;
      
      const success = game.applyMove(currentPlayer.id, 0, 'P');
      
      expect(success).toBe(true);
      expect(game.board[0].P).toBe(currentPlayer.color);
      expect(currentPlayer.inventory.P).toBe(initialInventory - 1);
    });

    it('should reject invalid moves', () => {
      const currentPlayer = game.getCurrentPlayer()!;
      
      // Occupy the cell first
      game.board[0].P = 'blue';
      
      const success = game.applyMove(currentPlayer.id, 0, 'P');
      expect(success).toBe(false);
    });
  });

  describe('game state management', () => {
    beforeEach(() => {
      game.initialize(players);
    });

    it('should handle player skipping', () => {
      const currentPlayer = game.getCurrentPlayer()!;
      const initialSkips = currentPlayer.skipsInARow;
      
      game.skipCurrentPlayer();
      
      expect(currentPlayer.skipsInARow).toBe(initialSkips + 1);
    });

    it('should get active players', () => {
      const activePlayers = game.getActivePlayers();
      expect(activePlayers).toHaveLength(2);
      expect(activePlayers.every(p => !p.isEliminated && p.connected)).toBe(true);
    });

    it('should check game end conditions', () => {
      // Eliminate one player to trigger game end
      game.players[1].eliminate();
      game.players[1].setConnected(false);
      
      game.checkGameEnd();
      
      expect(game.status).toBe('finished');
      expect(game.winnerId).toBe(game.players[0].id);
    });
  });

  describe('serialization', () => {
    beforeEach(() => {
      game.initialize(players);
    });

    it('should serialize game state correctly', () => {
      const gameState = game.getGameState();
      
      expect(gameState).toEqual({
        board: game.board,
        players: players.map(p => p.toJSON()),
        currentPlayerId: game.currentPlayerId,
        status: game.status,
        winnerId: game.winnerId,
        isDraw: game.isDraw,
        startedAt: game.startedAt,
        finishedAt: game.finishedAt,
      });
    });

    it('should get winner correctly', () => {
      expect(game.getWinner()).toBeNull();
      
      game.winnerId = game.players[0].id;
      expect(game.getWinner()).toBe(game.players[0]);
    });
  });

  describe('game reset', () => {
    beforeEach(() => {
      game.initialize(players);
    });

    it('should reset game to initial state', () => {
      // Make some changes
      game.applyMove(players[0].id, 0, 'P');
      game.status = 'finished';
      game.winnerId = players[0].id;
      
      game.reset();
      
      expect(game.status).toBe('waiting');
      expect(game.winnerId).toBeNull();
      expect(game.currentPlayerId).toBeNull();
      expect(game.board.every(cell => cell.P === null && cell.M === null && cell.G === null)).toBe(true);
      expect(players.every(p => p.inventory.P === 3 && p.inventory.M === 3 && p.inventory.G === 3)).toBe(true);
    });
  });
});
