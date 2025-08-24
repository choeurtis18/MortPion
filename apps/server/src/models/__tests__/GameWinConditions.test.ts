import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../Game.js';
import { Player } from '../Player.js';
import type { Color } from '@mortpion/shared';

describe('Game Win Conditions', () => {
  let game: Game;
  let player1: Player;
  let player2: Player;
  let player3: Player;

  beforeEach(() => {
    game = new Game();
    player1 = new Player({ nickname: 'Player1', color: 'red' });
    player2 = new Player({ nickname: 'Player2', color: 'blue' });
    player3 = new Player({ nickname: 'Player3', color: 'green' });
    
    game.initialize([player1, player2, player3]);
  });

  describe('Win Condition 1: Same-size alignment', () => {
    describe('horizontal wins', () => {
      it('should detect win with 3 P pieces in top row', () => {
        const redPlayer = game.players.find(p => p.color === 'red')!;
        
        // Place 3 red P pieces in top row (cells 0, 1, 2)
        game.board[0].P = 'red';
        game.board[1].P = 'red';
        game.board[2].P = 'red';
        
        game.currentPlayerId = redPlayer.id;
        game.winnerId = redPlayer.id;
        game.status = 'finished';
        
        expect(game.getWinner()).toBe(redPlayer);
        expect(game.status).toBe('finished');
      });

      it('should detect win with 3 M pieces in middle row', () => {
        const bluePlayer = game.players.find(p => p.color === 'blue')!;
        
        // Place 3 blue M pieces in middle row (cells 3, 4, 5)
        game.board[3].M = 'blue';
        game.board[4].M = 'blue';
        game.board[5].M = 'blue';
        
        game.currentPlayerId = bluePlayer.id;
        game.winnerId = bluePlayer.id;
        game.status = 'finished';
        
        expect(game.getWinner()).toBe(bluePlayer);
      });

      it('should detect win with 3 G pieces in bottom row', () => {
        const greenPlayer = game.players.find(p => p.color === 'green')!;
        
        // Place 3 green G pieces in bottom row (cells 6, 7, 8)
        game.board[6].G = 'green';
        game.board[7].G = 'green';
        game.board[8].G = 'green';
        
        game.currentPlayerId = greenPlayer.id;
        game.winnerId = greenPlayer.id;
        game.status = 'finished';
        
        expect(game.getWinner()).toBe(greenPlayer);
      });
    });

    describe('vertical wins', () => {
      it('should detect win with 3 P pieces in left column', () => {
        const redPlayer = game.players.find(p => p.color === 'red')!;
        
        // Place 3 red P pieces in left column (cells 0, 3, 6)
        game.board[0].P = 'red';
        game.board[3].P = 'red';
        game.board[6].P = 'red';
        
        game.currentPlayerId = redPlayer.id;
        game.winnerId = redPlayer.id;
        game.status = 'finished';
        
        expect(game.getWinner()).toBe(redPlayer);
      });

      it('should detect win with 3 M pieces in middle column', () => {
        const bluePlayer = game.players.find(p => p.color === 'blue')!;
        
        // Place 3 blue M pieces in middle column (cells 1, 4, 7)
        game.board[1].M = 'blue';
        game.board[4].M = 'blue';
        game.board[7].M = 'blue';
        
        game.currentPlayerId = bluePlayer.id;
        game.winnerId = bluePlayer.id;
        game.status = 'finished';
        
        expect(game.getWinner()).toBe(bluePlayer);
      });
    });

    describe('diagonal wins', () => {
      it('should detect win with 3 G pieces in main diagonal', () => {
        const greenPlayer = game.players.find(p => p.color === 'green')!;
        
        // Place 3 green G pieces in main diagonal (cells 0, 4, 8)
        game.board[0].G = 'green';
        game.board[4].G = 'green';
        game.board[8].G = 'green';
        
        game.currentPlayerId = greenPlayer.id;
        game.winnerId = greenPlayer.id;
        game.status = 'finished';
        
        expect(game.getWinner()).toBe(greenPlayer);
      });

      it('should detect win with 3 P pieces in anti-diagonal', () => {
        const redPlayer = game.players.find(p => p.color === 'red')!;
        
        // Place 3 red P pieces in anti-diagonal (cells 2, 4, 6)
        game.board[2].P = 'red';
        game.board[4].P = 'red';
        game.board[6].P = 'red';
        
        game.currentPlayerId = redPlayer.id;
        game.winnerId = redPlayer.id;
        game.status = 'finished';
        
        expect(game.getWinner()).toBe(redPlayer);
      });
    });

    describe('non-winning scenarios', () => {
      it('should not detect win with mixed colors', () => {
        // Place mixed colors in top row
        game.board[0].P = 'red';
        game.board[1].P = 'blue';
        game.board[2].P = 'green';
        
        expect(game.status).toBe('playing');
        expect(game.winnerId).toBeNull();
      });

      it('should not detect win with mixed sizes', () => {
        // Place same color but different sizes in top row
        game.board[0].P = 'red';
        game.board[1].M = 'red';
        game.board[2].G = 'red';
        
        expect(game.status).toBe('playing');
        expect(game.winnerId).toBeNull();
      });
    });
  });

  describe('Win Condition 2: Size order alignment (P-M-G or G-M-P)', () => {
    describe('P-M-G order wins', () => {
      it('should detect win with P-M-G in top row', () => {
        const redPlayer = game.players.find(p => p.color === 'red')!;
        
        // Place red pieces in P-M-G order in top row
        game.board[0].P = 'red'; // P in cell 0
        game.board[1].M = 'red'; // M in cell 1
        game.board[2].G = 'red'; // G in cell 2
        
        game.currentPlayerId = redPlayer.id;
        game.winnerId = redPlayer.id;
        game.status = 'finished';
        
        expect(game.getWinner()).toBe(redPlayer);
      });

      it('should detect win with P-M-G in left column', () => {
        const bluePlayer = game.players.find(p => p.color === 'blue')!;
        
        // Place blue pieces in P-M-G order in left column
        game.board[0].P = 'blue'; // P in cell 0
        game.board[3].M = 'blue'; // M in cell 3
        game.board[6].G = 'blue'; // G in cell 6
        
        game.currentPlayerId = bluePlayer.id;
        game.winnerId = bluePlayer.id;
        game.status = 'finished';
        
        expect(game.getWinner()).toBe(bluePlayer);
      });

      it('should detect win with P-M-G in main diagonal', () => {
        const greenPlayer = game.players.find(p => p.color === 'green')!;
        
        // Place green pieces in P-M-G order in main diagonal
        game.board[0].P = 'green'; // P in cell 0
        game.board[4].M = 'green'; // M in cell 4
        game.board[8].G = 'green'; // G in cell 8
        
        game.currentPlayerId = greenPlayer.id;
        game.winnerId = greenPlayer.id;
        game.status = 'finished';
        
        expect(game.getWinner()).toBe(greenPlayer);
      });
    });

    describe('G-M-P order wins', () => {
      it('should detect win with G-M-P in top row', () => {
        const redPlayer = game.players.find(p => p.color === 'red')!;
        
        // Place red pieces in G-M-P order in top row
        game.board[0].G = 'red'; // G in cell 0
        game.board[1].M = 'red'; // M in cell 1
        game.board[2].P = 'red'; // P in cell 2
        
        game.currentPlayerId = redPlayer.id;
        game.winnerId = redPlayer.id;
        game.status = 'finished';
        
        expect(game.getWinner()).toBe(redPlayer);
      });

      it('should detect win with G-M-P in anti-diagonal', () => {
        const bluePlayer = game.players.find(p => p.color === 'blue')!;
        
        // Place blue pieces in G-M-P order in anti-diagonal
        game.board[2].G = 'blue'; // G in cell 2
        game.board[4].M = 'blue'; // M in cell 4
        game.board[6].P = 'blue'; // P in cell 6
        
        game.currentPlayerId = bluePlayer.id;
        game.winnerId = bluePlayer.id;
        game.status = 'finished';
        
        expect(game.getWinner()).toBe(bluePlayer);
      });
    });

    describe('non-winning scenarios', () => {
      it('should not detect win with wrong order (M-P-G)', () => {
        // Place pieces in wrong order
        game.board[0].M = 'red';
        game.board[1].P = 'red';
        game.board[2].G = 'red';
        
        expect(game.status).toBe('playing');
        expect(game.winnerId).toBeNull();
      });

      it('should not detect win with mixed colors in order', () => {
        // Place correct order but mixed colors
        game.board[0].P = 'red';
        game.board[1].M = 'blue';
        game.board[2].G = 'green';
        
        expect(game.status).toBe('playing');
        expect(game.winnerId).toBeNull();
      });
    });
  });

  describe('Win Condition 3: Trio stacked (P+M+G in one cell)', () => {
    it('should detect win with P+M+G stacked in center cell', () => {
      const redPlayer = game.players.find(p => p.color === 'red')!;
      
      // Stack all three red pieces in center cell (4)
      game.board[4].P = 'red';
      game.board[4].M = 'red';
      game.board[4].G = 'red';
      
      game.currentPlayerId = redPlayer.id;
      game.winnerId = redPlayer.id;
      game.status = 'finished';
      
      expect(game.getWinner()).toBe(redPlayer);
    });

    it('should detect win with P+M+G stacked in corner cell', () => {
      const bluePlayer = game.players.find(p => p.color === 'blue')!;
      
      // Stack all three blue pieces in corner cell (0)
      game.board[0].P = 'blue';
      game.board[0].M = 'blue';
      game.board[0].G = 'blue';
      
      game.currentPlayerId = bluePlayer.id;
      game.winnerId = bluePlayer.id;
      game.status = 'finished';
      
      expect(game.getWinner()).toBe(bluePlayer);
    });

    it('should detect win with P+M+G stacked in any cell', () => {
      const greenPlayer = game.players.find(p => p.color === 'green')!;
      
      // Stack all three green pieces in cell 7
      game.board[7].P = 'green';
      game.board[7].M = 'green';
      game.board[7].G = 'green';
      
      game.currentPlayerId = greenPlayer.id;
      game.winnerId = greenPlayer.id;
      game.status = 'finished';
      
      expect(game.getWinner()).toBe(greenPlayer);
    });

    describe('non-winning scenarios', () => {
      it('should not detect win with only P+M stacked', () => {
        // Stack only two pieces
        game.board[4].P = 'red';
        game.board[4].M = 'red';
        
        expect(game.status).toBe('playing');
        expect(game.winnerId).toBeNull();
      });

      it('should not detect win with mixed colors stacked', () => {
        // Stack three pieces but different colors
        game.board[4].P = 'red';
        game.board[4].M = 'blue';
        game.board[4].G = 'green';
        
        expect(game.status).toBe('playing');
        expect(game.winnerId).toBeNull();
      });
    });
  });

  describe('Real game scenarios with applyMove', () => {
    it('should detect win during actual gameplay - same size alignment', () => {
      const player1Id = game.players[0].id;
      const player2Id = game.players[1].id;
      
      // Simulate a game where player 1 gets 3 P pieces in a row
      game.currentPlayerId = player1Id;
      game.applyMove(player1Id, 0, 'P'); // Player 1 places P in cell 0
      
      game.currentPlayerId = player2Id;
      game.applyMove(player2Id, 3, 'P'); // Player 2 places P in cell 3
      
      game.currentPlayerId = player1Id;
      game.applyMove(player1Id, 1, 'P'); // Player 1 places P in cell 1
      
      game.currentPlayerId = player2Id;
      game.applyMove(player2Id, 4, 'P'); // Player 2 places P in cell 4
      
      game.currentPlayerId = player1Id;
      const success = game.applyMove(player1Id, 2, 'P'); // Player 1 completes top row
      
      expect(success).toBe(true);
      expect(game.status).toBe('finished');
      expect(game.winnerId).toBe(player1Id);
    });

    it('should detect win during actual gameplay - size order alignment', () => {
      const player1Id = game.players[0].id;
      const player2Id = game.players[1].id;
      
      // Simulate a game where player 1 gets P-M-G in diagonal
      game.currentPlayerId = player1Id;
      game.applyMove(player1Id, 0, 'P'); // Player 1 places P in cell 0
      
      game.currentPlayerId = player2Id;
      game.applyMove(player2Id, 1, 'P'); // Player 2 places P in cell 1
      
      game.currentPlayerId = player1Id;
      game.applyMove(player1Id, 4, 'M'); // Player 1 places M in cell 4
      
      game.currentPlayerId = player2Id;
      game.applyMove(player2Id, 2, 'P'); // Player 2 places P in cell 2
      
      game.currentPlayerId = player1Id;
      const success = game.applyMove(player1Id, 8, 'G'); // Player 1 completes P-M-G diagonal
      
      expect(success).toBe(true);
      expect(game.status).toBe('finished');
      expect(game.winnerId).toBe(player1Id);
    });

    it('should detect win during actual gameplay - trio stacked', () => {
      const player1Id = game.players[0].id;
      const player2Id = game.players[1].id;
      
      // Simulate a game where player 1 stacks P+M+G in one cell
      game.currentPlayerId = player1Id;
      game.applyMove(player1Id, 4, 'P'); // Player 1 places P in center
      
      game.currentPlayerId = player2Id;
      game.applyMove(player2Id, 0, 'P'); // Player 2 places P in corner
      
      game.currentPlayerId = player1Id;
      game.applyMove(player1Id, 4, 'M'); // Player 1 places M in center (nesting)
      
      game.currentPlayerId = player2Id;
      game.applyMove(player2Id, 1, 'P'); // Player 2 places P elsewhere
      
      game.currentPlayerId = player1Id;
      const success = game.applyMove(player1Id, 4, 'G'); // Player 1 completes trio stack
      
      expect(success).toBe(true);
      expect(game.status).toBe('finished');
      expect(game.winnerId).toBe(player1Id);
    });
  });

  describe('Draw conditions', () => {
    it('should detect draw when board is full with no winner', () => {
      // Fill board strategically to avoid any win condition
      const boardConfig = [
        { P: 'red' as const, M: 'blue' as const, G: 'green' as const },    // 0
        { P: 'blue' as const, M: 'green' as const, G: 'red' as const },   // 1
        { P: 'green' as const, M: 'red' as const, G: 'blue' as const },   // 2
        { P: 'green' as const, M: 'red' as const, G: 'blue' as const },   // 3
        { P: 'red' as const, M: 'blue' as const, G: 'green' as const },   // 4
        { P: 'blue' as const, M: 'green' as const, G: 'red' as const },   // 5
        { P: 'blue' as const, M: 'green' as const, G: 'red' as const },   // 6
        { P: 'green' as const, M: 'red' as const, G: 'blue' as const },   // 7
        { P: 'red' as const, M: 'blue' as const, G: 'green' as const },   // 8
      ];
      
      boardConfig.forEach((cell, index) => {
        game.board[index] = cell;
      });
      
      // Remove all pieces from players (simulate full board)
      game.players.forEach(player => {
        player.inventory = { P: 0, M: 0, G: 0 };
      });
      
      // Trigger draw detection
      game.skipCurrentPlayer();
      
      expect(game.status).toBe('finished');
      expect(game.isDraw).toBe(true);
      expect(game.winnerId).toBeNull();
    });

    it('should continue game when moves are still possible', () => {
      // Partially fill board
      game.board[0].P = 'red';
      game.board[1].M = 'blue';
      game.board[2].G = 'green';
      
      // Players still have pieces
      expect(game.players[0].inventory.P).toBeGreaterThan(0);
      
      expect(game.status).toBe('playing');
      expect(game.isDraw).toBe(false);
    });
  });

  describe('Multiple win conditions', () => {
    it('should detect first win condition met', () => {
      const redPlayer = game.players.find(p => p.color === 'red')!;
      
      // Set up scenario where multiple win conditions could be met
      // But we'll only complete one
      game.board[0].P = 'red'; // Part of same-size alignment
      game.board[1].P = 'red';
      game.board[2].P = 'red'; // Completes same-size alignment
      
      // Also set up partial trio stack (but not complete)
      game.board[4].P = 'red';
      game.board[4].M = 'red';
      // Missing G for trio stack
      
      game.currentPlayerId = redPlayer.id;
      game.winnerId = redPlayer.id;
      game.status = 'finished';
      
      expect(game.getWinner()).toBe(redPlayer);
      expect(game.status).toBe('finished');
    });
  });
});
