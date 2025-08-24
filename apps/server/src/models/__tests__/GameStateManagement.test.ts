import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../Game.js';
import { Player } from '../Player.js';
import type { Color, Size } from '@mortpion/shared';

describe('Game State Management', () => {
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

  describe('State synchronization after moves', () => {
    it('should correctly update board, inventory, and turn after valid move', () => {
      const player1Id = game.players[0].id;
      const player1Color = game.players[0].color;
      const initialInventory = { ...game.players[0].inventory };
      
      // Set current player and apply move
      game.currentPlayerId = player1Id;
      const success = game.applyMove(player1Id, 4, 'P');
      
      expect(success).toBe(true);
      
      // Verify board state
      expect(game.board[4].P).toBe(player1Color);
      expect(game.board[4].M).toBeNull();
      expect(game.board[4].G).toBeNull();
      
      // Verify inventory update
      expect(game.players[0].inventory.P).toBe(initialInventory.P - 1);
      expect(game.players[0].inventory.M).toBe(initialInventory.M);
      expect(game.players[0].inventory.G).toBe(initialInventory.G);
      
      // Verify turn progression
      expect(game.currentPlayerId).not.toBe(player1Id);
      
      // Verify skip counter reset
      expect(game.players[0].skipsInARow).toBe(0);
      
      // Verify game status
      expect(game.status).toBe('playing');
      expect(game.winnerId).toBeNull();
      expect(game.isDraw).toBe(false);
    });

    it('should handle nesting moves correctly', () => {
      const player1Id = game.players[0].id;
      const player2Id = game.players[1].id;
      const player1Color = game.players[0].color;
      const player2Color = game.players[1].color;
      
      // Player 1 places P piece
      game.currentPlayerId = player1Id;
      game.applyMove(player1Id, 4, 'P');
      
      // Player 2 places M piece on top (nesting)
      game.currentPlayerId = player2Id;
      const success = game.applyMove(player2Id, 4, 'M');
      
      expect(success).toBe(true);
      
      // Verify board state shows both pieces
      expect(game.board[4].P).toBe(player1Color);
      expect(game.board[4].M).toBe(player2Color);
      expect(game.board[4].G).toBeNull();
      
      // Verify both players' inventories updated
      expect(game.players[0].inventory.P).toBe(2); // Used 1 P piece
      expect(game.players[1].inventory.M).toBe(2); // Used 1 M piece
    });

    it('should maintain consistent state through multiple moves', () => {
      const moves = [
        { playerId: game.players[0].id, cell: 0, size: 'P' as Size },
        { playerId: game.players[1].id, cell: 1, size: 'M' as Size },
        { playerId: game.players[2].id, cell: 2, size: 'G' as Size },
        { playerId: game.players[0].id, cell: 3, size: 'M' as Size },
        { playerId: game.players[1].id, cell: 4, size: 'P' as Size },
      ];
      
      const initialState = {
        board: JSON.parse(JSON.stringify(game.board)),
        inventories: game.players.map(p => ({ ...p.inventory })),
        status: game.status,
      };
      
      // Apply all moves
      moves.forEach((move, index) => {
        game.currentPlayerId = move.playerId;
        const success = game.applyMove(move.playerId, move.cell, move.size);
        expect(success).toBe(true);
        
        // Verify state consistency after each move
        expect(game.status).toBe('playing'); // Should still be playing
        expect(game.winnerId).toBeNull(); // No winner yet
        
        // Verify board has the expected piece
        const player = game.players.find(p => p.id === move.playerId)!;
        expect(game.board[move.cell][move.size]).toBe(player.color);
        
        // Verify inventory decreased
        const expectedCount = move.size === 'P' ? 2 : move.size === 'M' ? 2 : 2;
        if (index === 0 || index === 4) { // Player 0's moves
          expect(game.players[0].inventory[move.size]).toBe(expectedCount);
        }
      });
      
      // Verify final state is consistent
      expect(game.board[0].P).toBe(game.players[0].color);
      expect(game.board[1].M).toBe(game.players[1].color);
      expect(game.board[2].G).toBe(game.players[2].color);
      expect(game.board[3].M).toBe(game.players[0].color);
      expect(game.board[4].P).toBe(game.players[1].color);
    });
  });

  describe('State transitions during game flow', () => {
    it('should transition from playing to finished when win condition met', () => {
      const player1Id = game.players[0].id;
      
      // Set up near-win scenario
      game.currentPlayerId = player1Id;
      game.applyMove(player1Id, 0, 'P'); // First P piece
      
      game.currentPlayerId = game.players[1].id;
      game.applyMove(game.players[1].id, 3, 'P'); // Other player's move
      
      game.currentPlayerId = player1Id;
      game.applyMove(player1Id, 1, 'P'); // Second P piece
      
      game.currentPlayerId = game.players[1].id;
      game.applyMove(game.players[1].id, 4, 'P'); // Other player's move
      
      // Verify still playing
      expect(game.status).toBe('playing');
      expect(game.winnerId).toBeNull();
      expect(game.finishedAt).toBeNull();
      
      // Winning move
      game.currentPlayerId = player1Id;
      const success = game.applyMove(player1Id, 2, 'P'); // Complete top row
      
      expect(success).toBe(true);
      expect(game.status).toBe('finished');
      expect(game.winnerId).toBe(player1Id);
      expect(game.finishedAt).toBeGreaterThan(0);
      expect(game.isDraw).toBe(false);
    });

    it('should transition to draw when no legal moves remain', () => {
      // Fill board strategically to create draw
      const boardConfig = [
        { P: 'red' as const, M: 'blue' as const, G: 'green' as const },
        { P: 'blue' as const, M: 'green' as const, G: 'red' as const },
        { P: 'green' as const, M: 'red' as const, G: 'blue' as const },
        { P: 'green' as const, M: 'red' as const, G: 'blue' as const },
        { P: 'red' as const, M: 'blue' as const, G: 'green' as const },
        { P: 'blue' as const, M: 'green' as const, G: 'red' as const },
        { P: 'blue' as const, M: 'green' as const, G: 'red' as const },
        { P: 'green' as const, M: 'red' as const, G: 'blue' as const },
        { P: 'red' as const, M: 'blue' as const, G: 'green' as const },
      ];
      
      boardConfig.forEach((cell, index) => {
        game.board[index] = cell;
      });
      
      // Empty all inventories
      game.players.forEach(player => {
        player.inventory = { P: 0, M: 0, G: 0 };
      });
      
      // Trigger state check
      game.skipCurrentPlayer();
      
      expect(game.status).toBe('finished');
      expect(game.isDraw).toBe(true);
      expect(game.winnerId).toBeNull();
      expect(game.finishedAt).toBeGreaterThan(0);
    });

    it('should handle player elimination correctly', () => {
      const player1Id = game.players[0].id;
      
      // Eliminate player 1
      game.players[0].eliminate();
      
      expect(game.players[0].isEliminated).toBe(true);
      
      // If it was player 1's turn, should move to next active player
      if (game.currentPlayerId === player1Id) {
        game.skipCurrentPlayer();
        expect(game.currentPlayerId).not.toBe(player1Id);
      }
      
      // Game should continue with remaining players
      expect(game.status).toBe('playing');
      expect(game.getActivePlayers().length).toBe(2);
    });
  });

  describe('Inventory management', () => {
    it('should correctly track piece usage across all players', () => {
      const initialTotalPieces = game.players.reduce((total, player) => 
        total + player.inventory.P + player.inventory.M + player.inventory.G, 0
      );
      
      // Apply several moves
      const moves = [
        { playerId: game.players[0].id, cell: 0, size: 'P' as Size },
        { playerId: game.players[1].id, cell: 1, size: 'M' as Size },
        { playerId: game.players[2].id, cell: 2, size: 'G' as Size },
        { playerId: game.players[0].id, cell: 3, size: 'P' as Size },
      ];
      
      moves.forEach(move => {
        game.currentPlayerId = move.playerId;
        game.applyMove(move.playerId, move.cell, move.size);
      });
      
      const finalTotalPieces = game.players.reduce((total, player) => 
        total + player.inventory.P + player.inventory.M + player.inventory.G, 0
      );
      
      expect(finalTotalPieces).toBe(initialTotalPieces - moves.length);
      
      // Verify specific inventory changes
      expect(game.players[0].inventory.P).toBe(1); // Used 2 P pieces
      expect(game.players[1].inventory.M).toBe(2); // Used 1 M piece
      expect(game.players[2].inventory.G).toBe(2); // Used 1 G piece
    });

    it('should prevent moves when inventory is empty', () => {
      const player1Id = game.players[0].id;
      
      // Empty P inventory
      game.players[0].inventory.P = 0;
      
      game.currentPlayerId = player1Id;
      const success = game.applyMove(player1Id, 0, 'P');
      
      expect(success).toBe(false);
      expect(game.board[0].P).toBeNull(); // Board should not change
    });

    it('should handle inventory depletion gracefully', () => {
      const player1Id = game.players[0].id;
      
      // Use all P pieces (avoid creating win condition by using non-aligned positions)
      game.currentPlayerId = player1Id;
      game.applyMove(player1Id, 0, 'P'); // Top-left
      
      game.currentPlayerId = game.players[1].id;
      game.applyMove(game.players[1].id, 1, 'M');
      
      game.currentPlayerId = player1Id;
      game.applyMove(player1Id, 3, 'P'); // Middle-left (not aligned)
      
      game.currentPlayerId = game.players[1].id;
      game.applyMove(game.players[1].id, 2, 'M');
      
      game.currentPlayerId = player1Id;
      game.applyMove(player1Id, 7, 'P'); // Bottom-middle (not aligned with others)
      
      expect(game.players[0].inventory.P).toBe(0);
      
      // Should still be able to use M and G pieces
      expect(game.players[0].inventory.M).toBe(3);
      expect(game.players[0].inventory.G).toBe(3);
      
      // Game should continue (no win condition created)
      expect(game.status).toBe('playing');
    });
  });

  describe('Skip counter management', () => {
    it('should reset skip counters after successful moves', () => {
      const player1Id = game.players[0].id;
      
      // Set some skips
      game.players[0].skipsInARow = 2;
      
      game.currentPlayerId = player1Id;
      game.applyMove(player1Id, 0, 'P');
      
      expect(game.players[0].skipsInARow).toBe(0);
    });

    it('should increment skip counters correctly', () => {
      const player1Id = game.players[0].id;
      const initialSkips = game.players[0].skipsInARow;
      
      game.currentPlayerId = player1Id;
      game.skipCurrentPlayer();
      
      expect(game.players[0].skipsInARow).toBe(initialSkips + 1);
    });

    it('should maintain skip counters across multiple players', () => {
      // Set different skip counts for each player
      game.players[0].skipsInARow = 1;
      game.players[1].skipsInARow = 2;
      game.players[2].skipsInARow = 0;
      
      // Player 0 makes a move - should reset their skips
      game.currentPlayerId = game.players[0].id;
      game.applyMove(game.players[0].id, 0, 'P');
      
      expect(game.players[0].skipsInARow).toBe(0);
      expect(game.players[1].skipsInARow).toBe(2); // Unchanged
      expect(game.players[2].skipsInARow).toBe(0); // Unchanged
    });
  });

  describe('Game serialization and state consistency', () => {
    it('should serialize complete game state correctly', () => {
      // Apply some moves to create interesting state
      game.currentPlayerId = game.players[0].id;
      game.applyMove(game.players[0].id, 0, 'P');
      
      game.currentPlayerId = game.players[1].id;
      game.applyMove(game.players[1].id, 4, 'M');
      
      const serialized = game.getGameState();
      
      expect(serialized).toHaveProperty('board');
      expect(serialized).toHaveProperty('players');
      expect(serialized).toHaveProperty('currentPlayerId');
      expect(serialized).toHaveProperty('status');
      expect(serialized).toHaveProperty('winnerId');
      expect(serialized).toHaveProperty('isDraw');
      expect(serialized).toHaveProperty('startedAt');
      expect(serialized).toHaveProperty('finishedAt');
      
      // Verify board state is preserved
      expect(serialized.board[0].P).toBe(game.players[0].color);
      expect(serialized.board[4].M).toBe(game.players[1].color);
      
      // Verify player inventories are preserved
      expect(serialized.players[0].inventory.P).toBe(2);
      expect(serialized.players[1].inventory.M).toBe(2);
    });

    it('should maintain state consistency after reset', () => {
      // Apply some moves
      game.applyMove(game.players[0].id, 0, 'P');
      game.applyMove(game.players[1].id, 4, 'M');
      
      // Reset game
      game.reset();
      
      // Verify clean state
      expect(game.status).toBe('waiting');
      expect(game.winnerId).toBeNull();
      expect(game.isDraw).toBe(false);
      expect(game.currentPlayerId).toBeNull();
      expect(game.startedAt).toBeNull();
      expect(game.finishedAt).toBeNull();
      
      // Verify board is clean
      game.board.forEach(cell => {
        expect(cell.P).toBeNull();
        expect(cell.M).toBeNull();
        expect(cell.G).toBeNull();
      });
      
      // Verify players are reset but preserved
      expect(game.players.length).toBeGreaterThan(0);
      game.players.forEach(player => {
        expect(player.inventory).toEqual({ P: 3, M: 3, G: 3 });
        expect(player.skipsInARow).toBe(0);
        expect(player.isEliminated).toBe(false);
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle concurrent state changes gracefully', () => {
      const player1Id = game.players[0].id;
      
      // Simulate rapid state changes
      game.currentPlayerId = player1Id;
      const success1 = game.applyMove(player1Id, 0, 'P');
      const success2 = game.applyMove(player1Id, 1, 'P'); // Should fail - not their turn
      
      expect(success1).toBe(true);
      expect(success2).toBe(false);
      
      // Verify state is consistent
      expect(game.board[0].P).toBe(game.players[0].color);
      expect(game.board[1].P).toBeNull();
    });

    it('should handle invalid state transitions', () => {
      // Try to apply move when game is not playing
      game.status = 'finished';
      
      const success = game.applyMove(game.players[0].id, 0, 'P');
      
      expect(success).toBe(false);
      expect(game.board[0].P).toBeNull();
    });

    it('should maintain referential integrity', () => {
      const originalPlayer = game.players[0];
      const player1Id = originalPlayer.id;
      
      // Apply move
      game.currentPlayerId = player1Id;
      game.applyMove(player1Id, 0, 'P');
      
      // Verify same player object is maintained
      expect(game.players[0]).toBe(originalPlayer);
      expect(game.players[0].id).toBe(player1Id);
    });
  });
});
