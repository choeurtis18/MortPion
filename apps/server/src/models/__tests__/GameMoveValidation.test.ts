import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../Game.js';
import { Player } from '../Player.js';
import type { Size } from '@mortpion/shared';

describe('Game Move Validation', () => {
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

  describe('isValidMove', () => {
    describe('basic validation', () => {
      it('should reject move when game is not playing', () => {
        game.status = 'finished';
        const currentPlayerId = game.currentPlayerId!;
        
        expect(game.isValidMove(currentPlayerId, 0, 'P')).toBe(false);
      });

      it('should reject move when not player turn', () => {
        const currentPlayerId = game.currentPlayerId!;
        const otherPlayer = game.players.find(p => p.id !== currentPlayerId)!;
        
        expect(game.isValidMove(otherPlayer.id, 0, 'P')).toBe(false);
      });

      it('should reject move from non-existent player', () => {
        expect(game.isValidMove('non-existent-id', 0, 'P')).toBe(false);
      });

      it('should reject move from eliminated player', () => {
        const currentPlayerId = game.currentPlayerId!;
        const currentPlayer = game.getCurrentPlayer()!;
        currentPlayer.eliminate();
        
        expect(game.isValidMove(currentPlayerId, 0, 'P')).toBe(false);
      });
    });

    describe('cell index validation', () => {
      it('should accept valid cell indices (0-8)', () => {
        const currentPlayerId = game.currentPlayerId!;
        
        for (let i = 0; i < 9; i++) {
          expect(game.isValidMove(currentPlayerId, i, 'P')).toBe(true);
        }
      });

      it('should reject invalid cell indices', () => {
        const currentPlayerId = game.currentPlayerId!;
        
        expect(game.isValidMove(currentPlayerId, -1, 'P')).toBe(false);
        expect(game.isValidMove(currentPlayerId, 9, 'P')).toBe(false);
        expect(game.isValidMove(currentPlayerId, 100, 'P')).toBe(false);
      });
    });

    describe('inventory validation', () => {
      it('should accept move when player has piece available', () => {
        const currentPlayerId = game.currentPlayerId!;
        const currentPlayer = game.getCurrentPlayer()!;
        
        expect(currentPlayer.inventory.P).toBe(3);
        expect(game.isValidMove(currentPlayerId, 0, 'P')).toBe(true);
      });

      it('should reject move when player has no pieces of that size', () => {
        const currentPlayerId = game.currentPlayerId!;
        const currentPlayer = game.getCurrentPlayer()!;
        
        // Use all P pieces
        currentPlayer.inventory.P = 0;
        
        expect(game.isValidMove(currentPlayerId, 0, 'P')).toBe(false);
        expect(game.isValidMove(currentPlayerId, 0, 'M')).toBe(true); // M still available
        expect(game.isValidMove(currentPlayerId, 0, 'G')).toBe(true); // G still available
      });
    });

    describe('board state validation', () => {
      it('should accept move to empty cell', () => {
        const currentPlayerId = game.currentPlayerId!;
        
        // All cells should be empty initially
        expect(game.isValidMove(currentPlayerId, 4, 'P')).toBe(true);
        expect(game.isValidMove(currentPlayerId, 4, 'M')).toBe(true);
        expect(game.isValidMove(currentPlayerId, 4, 'G')).toBe(true);
      });

      it('should reject move to occupied size slot', () => {
        const currentPlayerId = game.currentPlayerId!;
        
        // Place a P piece in cell 0
        game.board[0].P = 'red';
        
        expect(game.isValidMove(currentPlayerId, 0, 'P')).toBe(false); // P slot occupied
        expect(game.isValidMove(currentPlayerId, 0, 'M')).toBe(true);  // M slot free
        expect(game.isValidMove(currentPlayerId, 0, 'G')).toBe(true);  // G slot free
      });

      it('should allow nesting different sizes in same cell', () => {
        const currentPlayerId = game.currentPlayerId!;
        
        // Place pieces of different sizes in same cell
        game.board[0].P = 'red';
        game.board[0].M = 'blue';
        
        expect(game.isValidMove(currentPlayerId, 0, 'P')).toBe(false); // P occupied
        expect(game.isValidMove(currentPlayerId, 0, 'M')).toBe(false); // M occupied
        expect(game.isValidMove(currentPlayerId, 0, 'G')).toBe(true);  // G still free
      });

      it('should allow different colors in same cell with different sizes', () => {
        const currentPlayerId = game.currentPlayerId!;
        
        // Place different colors in same cell (different sizes)
        game.board[1].P = 'red';
        game.board[1].M = 'blue';
        game.board[1].G = 'green';
        
        // All size slots are now occupied
        expect(game.isValidMove(currentPlayerId, 1, 'P')).toBe(false);
        expect(game.isValidMove(currentPlayerId, 1, 'M')).toBe(false);
        expect(game.isValidMove(currentPlayerId, 1, 'G')).toBe(false);
      });
    });
  });

  describe('applyMove', () => {
    describe('successful moves', () => {
      it('should apply valid move and update board', () => {
        const currentPlayerId = game.currentPlayerId!;
        const currentPlayer = game.getCurrentPlayer()!;
        const initialInventory = { ...currentPlayer.inventory };
        
        const success = game.applyMove(currentPlayerId, 0, 'P');
        
        expect(success).toBe(true);
        expect(game.board[0].P).toBe(currentPlayer.color);
        expect(currentPlayer.inventory.P).toBe(initialInventory.P - 1);
      });

      it('should reset player skips after successful move', () => {
        const currentPlayerId = game.currentPlayerId!;
        const currentPlayer = game.getCurrentPlayer()!;
        
        // Set some skips
        currentPlayer.skipsInARow = 2;
        
        game.applyMove(currentPlayerId, 0, 'P');
        
        expect(currentPlayer.skipsInARow).toBe(0);
      });

      it('should move to next player after successful move', () => {
        const currentPlayerId = game.currentPlayerId!;
        
        game.applyMove(currentPlayerId, 0, 'P');
        
        expect(game.currentPlayerId).not.toBe(currentPlayerId);
        expect(game.currentPlayerId).toBeDefined();
      });

      it('should handle nesting moves correctly', () => {
        const player1Id = game.players[0].id;
        const player2Id = game.players[1].id;
        
        // Ensure player1 goes first
        game.currentPlayerId = player1Id;
        
        // Player 1 places P
        game.applyMove(player1Id, 0, 'P');
        expect(game.board[0].P).toBe(game.players[0].color);
        
        // Player 2 places M in same cell
        game.currentPlayerId = player2Id;
        game.applyMove(player2Id, 0, 'M');
        expect(game.board[0].M).toBe(game.players[1].color);
        
        // Both pieces should coexist
        expect(game.board[0].P).toBe(game.players[0].color);
        expect(game.board[0].M).toBe(game.players[1].color);
        expect(game.board[0].G).toBeNull();
      });
    });

    describe('failed moves', () => {
      it('should reject invalid moves and not change state', () => {
        const currentPlayerId = game.currentPlayerId!;
        const currentPlayer = game.getCurrentPlayer()!;
        const initialInventory = { ...currentPlayer.inventory };
        const initialBoard = JSON.parse(JSON.stringify(game.board));
        
        // Try invalid move (out of bounds)
        const success = game.applyMove(currentPlayerId, 10, 'P');
        
        expect(success).toBe(false);
        expect(game.board).toEqual(initialBoard);
        expect(currentPlayer.inventory).toEqual(initialInventory);
        expect(game.currentPlayerId).toBe(currentPlayerId); // Turn shouldn't change
      });

      it('should reject move when player has no pieces', () => {
        const currentPlayerId = game.currentPlayerId!;
        const currentPlayer = game.getCurrentPlayer()!;
        
        // Remove all P pieces
        currentPlayer.inventory.P = 0;
        
        const success = game.applyMove(currentPlayerId, 0, 'P');
        
        expect(success).toBe(false);
      });

      it('should reject move to occupied size slot', () => {
        const currentPlayerId = game.currentPlayerId!;
        
        // Occupy the P slot
        game.board[0].P = 'red';
        
        const success = game.applyMove(currentPlayerId, 0, 'P');
        
        expect(success).toBe(false);
      });
    });

    describe('win condition detection', () => {
      it('should detect win and end game', () => {
        const player1Id = game.players[0].id;
        const player1Color = game.players[0].color;
        
        // Set up a winning scenario (3 P pieces in a row)
        game.currentPlayerId = player1Id;
        
        // Place first two pieces manually
        game.board[0].P = player1Color;
        game.board[1].P = player1Color;
        
        // Apply winning move
        const success = game.applyMove(player1Id, 2, 'P');
        
        expect(success).toBe(true);
        expect(game.status).toBe('finished');
        expect(game.winnerId).toBe(player1Id);
        expect(game.finishedAt).toBeGreaterThan(0);
      });

      it('should continue game when no win condition is met', () => {
        const currentPlayerId = game.currentPlayerId!;
        
        const success = game.applyMove(currentPlayerId, 4, 'P'); // Center cell
        
        expect(success).toBe(true);
        expect(game.status).toBe('playing');
        expect(game.winnerId).toBeNull();
        expect(game.finishedAt).toBeNull();
      });
    });

    describe('inventory management', () => {
      it('should correctly decrement piece inventory', () => {
        const currentPlayerId = game.currentPlayerId!;
        const currentPlayer = game.getCurrentPlayer()!;
        
        expect(currentPlayer.inventory.P).toBe(3);
        expect(currentPlayer.inventory.M).toBe(3);
        expect(currentPlayer.inventory.G).toBe(3);
        
        game.applyMove(currentPlayerId, 0, 'P');
        expect(currentPlayer.inventory.P).toBe(2);
        expect(currentPlayer.inventory.M).toBe(3);
        expect(currentPlayer.inventory.G).toBe(3);
      });

      it('should handle multiple moves with different sizes', () => {
        const player1Id = game.players[0].id;
        const player2Id = game.players[1].id;
        const player3Id = game.players[2].id;
        
        // Player 1: P piece
        game.currentPlayerId = player1Id;
        game.applyMove(player1Id, 0, 'P');
        expect(game.players[0].inventory.P).toBe(2);
        
        // Player 2: M piece
        game.currentPlayerId = player2Id;
        game.applyMove(player2Id, 1, 'M');
        expect(game.players[1].inventory.M).toBe(2);
        
        // Player 3: G piece
        game.currentPlayerId = player3Id;
        game.applyMove(player3Id, 2, 'G');
        expect(game.players[2].inventory.G).toBe(2);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle full board scenario', () => {
      // Fill all size slots in all cells
      for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
        game.board[cellIndex] = { P: 'red', M: 'blue', G: 'green' };
      }
      
      const currentPlayerId = game.currentPlayerId!;
      
      // No moves should be valid
      expect(game.isValidMove(currentPlayerId, 0, 'P')).toBe(false);
      expect(game.isValidMove(currentPlayerId, 4, 'M')).toBe(false);
      expect(game.isValidMove(currentPlayerId, 8, 'G')).toBe(false);
    });

    it('should handle player with no pieces left', () => {
      const currentPlayerId = game.currentPlayerId!;
      const currentPlayer = game.getCurrentPlayer()!;
      
      // Remove all pieces
      currentPlayer.inventory = { P: 0, M: 0, G: 0 };
      
      // No moves should be valid
      expect(game.isValidMove(currentPlayerId, 0, 'P')).toBe(false);
      expect(game.isValidMove(currentPlayerId, 0, 'M')).toBe(false);
      expect(game.isValidMove(currentPlayerId, 0, 'G')).toBe(false);
    });
  });
});
