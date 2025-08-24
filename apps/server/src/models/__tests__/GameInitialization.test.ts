import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../Game.js';
import { Player } from '../Player.js';

describe('Game Initialization', () => {
  let game: Game;

  beforeEach(() => {
    game = new Game();
  });

  describe('constructor', () => {
    it('should initialize with correct default values', () => {
      expect(game.board).toHaveLength(9);
      expect(game.board.every(cell => cell.P === null && cell.M === null && cell.G === null)).toBe(true);
      expect(game.players).toHaveLength(0);
      expect(game.currentPlayerId).toBeNull();
      expect(game.status).toBe('waiting');
      expect(game.winnerId).toBeNull();
      expect(game.isDraw).toBe(false);
      expect(game.startedAt).toBeNull();
      expect(game.finishedAt).toBeNull();
    });
  });

  describe('initialize with 2 players', () => {
    let player1: Player;
    let player2: Player;

    beforeEach(() => {
      player1 = new Player({ nickname: 'Player1', color: 'red' });
      player2 = new Player({ nickname: 'Player2', color: 'blue' });
    });

    it('should initialize game correctly with 2 players', () => {
      game.initialize([player1, player2]);

      expect(game.players).toHaveLength(2);
      expect(game.players[0].id).toBe(player1.id);
      expect(game.players[1].id).toBe(player2.id);
      expect(game.status).toBe('playing');
      expect(game.startedAt).toBeGreaterThan(0);
      expect(game.currentPlayerId).toBeDefined();
      expect([player1.id, player2.id]).toContain(game.currentPlayerId);
    });

    it('should ensure players have correct inventories', () => {
      game.initialize([player1, player2]);

      game.players.forEach(player => {
        expect(player.inventory.P).toBe(3);
        expect(player.inventory.M).toBe(3);
        expect(player.inventory.G).toBe(3);
      });
    });

    it('should ensure players have different colors', () => {
      game.initialize([player1, player2]);

      const colors = game.players.map(p => p.color);
      expect(new Set(colors).size).toBe(2); // All colors should be unique
    });

    it('should initialize empty board', () => {
      game.initialize([player1, player2]);

      expect(game.board).toHaveLength(9);
      game.board.forEach(cell => {
        expect(cell.P).toBeNull();
        expect(cell.M).toBeNull();
        expect(cell.G).toBeNull();
      });
    });
  });

  describe('initialize with 3 players', () => {
    let player1: Player;
    let player2: Player;
    let player3: Player;

    beforeEach(() => {
      player1 = new Player({ nickname: 'Player1', color: 'red' });
      player2 = new Player({ nickname: 'Player2', color: 'blue' });
      player3 = new Player({ nickname: 'Player3', color: 'green' });
    });

    it('should initialize game correctly with 3 players', () => {
      game.initialize([player1, player2, player3]);

      expect(game.players).toHaveLength(3);
      expect(game.status).toBe('playing');
      expect(game.startedAt).toBeGreaterThan(0);
      expect(game.currentPlayerId).toBeDefined();
      expect([player1.id, player2.id, player3.id]).toContain(game.currentPlayerId);
    });

    it('should ensure all 3 players have different colors', () => {
      game.initialize([player1, player2, player3]);

      const colors = game.players.map(p => p.color);
      expect(new Set(colors).size).toBe(3); // All colors should be unique
      expect(colors).toContain('red');
      expect(colors).toContain('blue');
      expect(colors).toContain('green');
    });

    it('should ensure all players have correct inventories', () => {
      game.initialize([player1, player2, player3]);

      game.players.forEach(player => {
        expect(player.inventory.P).toBe(3);
        expect(player.inventory.M).toBe(3);
        expect(player.inventory.G).toBe(3);
      });
    });
  });

  describe('initialize with 4 players', () => {
    let player1: Player;
    let player2: Player;
    let player3: Player;
    let player4: Player;

    beforeEach(() => {
      player1 = new Player({ nickname: 'Player1', color: 'red' });
      player2 = new Player({ nickname: 'Player2', color: 'blue' });
      player3 = new Player({ nickname: 'Player3', color: 'green' });
      player4 = new Player({ nickname: 'Player4', color: 'yellow' });
    });

    it('should initialize game correctly with 4 players', () => {
      game.initialize([player1, player2, player3, player4]);

      expect(game.players).toHaveLength(4);
      expect(game.status).toBe('playing');
      expect(game.startedAt).toBeGreaterThan(0);
      expect(game.currentPlayerId).toBeDefined();
      expect([player1.id, player2.id, player3.id, player4.id]).toContain(game.currentPlayerId);
    });

    it('should ensure all 4 players have different colors', () => {
      game.initialize([player1, player2, player3, player4]);

      const colors = game.players.map(p => p.color);
      expect(new Set(colors).size).toBe(4); // All colors should be unique
      expect(colors).toContain('red');
      expect(colors).toContain('blue');
      expect(colors).toContain('green');
      expect(colors).toContain('yellow');
    });

    it('should ensure all players have correct inventories', () => {
      game.initialize([player1, player2, player3, player4]);

      game.players.forEach(player => {
        expect(player.inventory.P).toBe(3);
        expect(player.inventory.M).toBe(3);
        expect(player.inventory.G).toBe(3);
      });
    });

    it('should use all available colors', () => {
      game.initialize([player1, player2, player3, player4]);

      const colors = game.players.map(p => p.color).sort();
      expect(colors).toEqual(['blue', 'green', 'red', 'yellow']);
    });
  });

  describe('error cases', () => {
    it('should throw error with less than 2 players', () => {
      const player1 = new Player({ nickname: 'Player1', color: 'red' });
      
      expect(() => game.initialize([player1])).toThrow('Game requires 2-4 players');
      expect(() => game.initialize([])).toThrow('Game requires 2-4 players');
    });

    it('should throw error with more than 4 players', () => {
      const players = [
        new Player({ nickname: 'Player1', color: 'red' }),
        new Player({ nickname: 'Player2', color: 'blue' }),
        new Player({ nickname: 'Player3', color: 'green' }),
        new Player({ nickname: 'Player4', color: 'yellow' }),
        new Player({ nickname: 'Player5', color: 'red' }), // This should cause error
      ];
      
      expect(() => game.initialize(players)).toThrow('Game requires 2-4 players');
    });
  });

  describe('state consistency after initialization', () => {
    it('should reset all game state properly', () => {
      const player1 = new Player({ nickname: 'Player1', color: 'red' });
      const player2 = new Player({ nickname: 'Player2', color: 'blue' });

      // Simulate a previous game state
      game.status = 'finished';
      game.winnerId = 'some-id';
      game.isDraw = true;
      game.finishedAt = Date.now();

      game.initialize([player1, player2]);

      expect(game.status).toBe('playing');
      expect(game.winnerId).toBeNull();
      expect(game.isDraw).toBe(false);
      expect(game.finishedAt).toBeNull();
      expect(game.startedAt).toBeGreaterThan(0);
    });

    it('should handle re-initialization correctly', () => {
      const player1 = new Player({ nickname: 'Player1', color: 'red' });
      const player2 = new Player({ nickname: 'Player2', color: 'blue' });
      const player3 = new Player({ nickname: 'Player3', color: 'green' });

      // First initialization
      game.initialize([player1, player2]);
      expect(game.players).toHaveLength(2);

      // Re-initialization with different players
      game.initialize([player1, player2, player3]);
      expect(game.players).toHaveLength(3);
      expect(game.status).toBe('playing');
    });
  });

  describe('random first player selection', () => {
    it('should select a valid first player', () => {
      const player1 = new Player({ nickname: 'Player1', color: 'red' });
      const player2 = new Player({ nickname: 'Player2', color: 'blue' });
      const player3 = new Player({ nickname: 'Player3', color: 'green' });

      game.initialize([player1, player2, player3]);

      const currentPlayer = game.getCurrentPlayer();
      expect(currentPlayer).toBeDefined();
      expect([player1.id, player2.id, player3.id]).toContain(currentPlayer!.id);
    });

    it('should distribute first player selection over multiple initializations', () => {
      const player1 = new Player({ nickname: 'Player1', color: 'red' });
      const player2 = new Player({ nickname: 'Player2', color: 'blue' });

      const firstPlayers = new Set<string>();

      // Run multiple initializations to test randomness
      for (let i = 0; i < 20; i++) {
        const newGame = new Game();
        newGame.initialize([player1, player2]);
        firstPlayers.add(newGame.currentPlayerId!);
      }

      // Should have selected both players as first player at least once
      // (with very high probability over 20 runs)
      expect(firstPlayers.size).toBeGreaterThan(1);
    });
  });
});
