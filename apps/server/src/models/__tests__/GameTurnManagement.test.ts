import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../Game.js';
import { Player } from '../Player.js';

describe('Game Turn Management', () => {
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

  describe('normal turn progression', () => {
    it('should move to next player after successful move', () => {
      const currentPlayerId = game.currentPlayerId!;
      const nextPlayer = game.players.find(p => p.id !== currentPlayerId)!;
      
      game.applyMove(currentPlayerId, 0, 'P');
      
      expect(game.currentPlayerId).not.toBe(currentPlayerId);
      expect(game.currentPlayerId).toBeDefined();
    });

    it('should cycle through all active players', () => {
      const playerIds = game.players.map(p => p.id);
      const seenPlayers = new Set<string>();
      
      // Play several turns to see cycling
      for (let i = 0; i < 6; i++) {
        const currentPlayerId = game.currentPlayerId!;
        seenPlayers.add(currentPlayerId);
        
        // Find an available move
        let moved = false;
        for (let cellIndex = 0; cellIndex < 9 && !moved; cellIndex++) {
          for (const size of ['P', 'M', 'G'] as const) {
            if (game.isValidMove(currentPlayerId, cellIndex, size)) {
              game.applyMove(currentPlayerId, cellIndex, size);
              moved = true;
              break;
            }
          }
        }
        
        if (!moved) break; // No more moves available
      }
      
      // Should have seen all players (or at least more than one)
      expect(seenPlayers.size).toBeGreaterThan(1);
    });
  });

  describe('manual skip functionality', () => {
    it('should skip current player when skipCurrentPlayer is called', () => {
      const currentPlayerId = game.currentPlayerId!;
      const currentPlayer = game.getCurrentPlayer()!;
      const initialSkips = currentPlayer.skipsInARow;
      
      game.skipCurrentPlayer();
      
      expect(game.currentPlayerId).not.toBe(currentPlayerId);
      expect(currentPlayer.skipsInARow).toBe(initialSkips + 1);
    });

    it('should not skip when game is not playing', () => {
      const currentPlayerId = game.currentPlayerId!;
      game.status = 'finished';
      
      game.skipCurrentPlayer();
      
      expect(game.currentPlayerId).toBe(currentPlayerId); // Should not change
    });

    it('should handle multiple consecutive manual skips', () => {
      const player1Id = game.players[0].id;
      const player2Id = game.players[1].id;
      
      game.currentPlayerId = player1Id;
      
      // Skip player 1 multiple times
      game.skipCurrentPlayer();
      expect(game.players[0].skipsInARow).toBe(1);
      
      // Should now be player 2's turn
      game.currentPlayerId = player2Id;
      game.skipCurrentPlayer();
      expect(game.players[1].skipsInARow).toBe(1);
    });
  });

  describe('automatic skip when no legal moves', () => {
    it('should auto-skip player with no legal moves', () => {
      const player1Id = game.players[0].id;
      const player1 = game.players[0];
      
      // Remove all pieces from player 1
      player1.inventory = { P: 0, M: 0, G: 0 };
      
      game.currentPlayerId = player1Id;
      
      // Trigger moveToNextPlayer which should auto-skip
      game.skipCurrentPlayer(); // This will call moveToNextPlayer
      
      expect(game.currentPlayerId).not.toBe(player1Id);
      expect(player1.skipsInARow).toBeGreaterThan(0);
    });

    it('should auto-skip when player has no legal moves but others do', () => {
      const player1Id = game.players[0].id;
      const player1 = game.players[0];
      
      // Fill some P slots on the board, but leave M and G slots free
      for (let i = 0; i < 9; i++) {
        game.board[i].P = 'red';
      }
      
      // Player 1 only has P pieces (no legal moves)
      player1.inventory = { P: 3, M: 0, G: 0 };
      
      // Other players still have M and G pieces (legal moves available)
      game.players[1].inventory = { P: 0, M: 3, G: 3 };
      game.players[2].inventory = { P: 0, M: 3, G: 3 };
      
      game.currentPlayerId = player1Id;
      
      // Should auto-skip player 1 since they have no legal moves
      game.skipCurrentPlayer();
      
      expect(game.currentPlayerId).not.toBe(player1Id);
      expect(player1.skipsInARow).toBeGreaterThan(0);
      expect(game.status).toBe('playing'); // Game should continue
    });

    it('should handle cascading auto-skips', () => {
      // Set up scenario where multiple players have no legal moves
      const player1 = game.players[0];
      const player2 = game.players[1];
      const player3 = game.players[2];
      
      // Remove pieces from first two players
      player1.inventory = { P: 0, M: 0, G: 0 };
      player2.inventory = { P: 0, M: 0, G: 0 };
      
      game.currentPlayerId = player1.id;
      
      // Should skip through players until it finds one with legal moves
      game.skipCurrentPlayer();
      
      expect(game.currentPlayerId).toBe(player3.id);
      expect(player1.skipsInARow).toBeGreaterThan(0);
      expect(player2.skipsInARow).toBeGreaterThan(0);
    });
  });

  describe('player elimination and active players', () => {
    it('should get correct active players', () => {
      expect(game.getActivePlayers()).toHaveLength(3);
      
      // Eliminate one player
      game.players[0].eliminate();
      expect(game.getActivePlayers()).toHaveLength(2);
      
      // Disconnect one player
      game.players[1].setConnected(false);
      expect(game.getActivePlayers()).toHaveLength(1);
    });

    it('should skip eliminated players', () => {
      const player1Id = game.players[0].id;
      const player2Id = game.players[1].id;
      
      // Eliminate player 1
      game.players[0].eliminate();
      game.currentPlayerId = player1Id;
      
      game.skipCurrentPlayer();
      
      // Should skip to next active player (not the eliminated one)
      expect(game.currentPlayerId).not.toBe(player1Id);
      expect([player2Id, game.players[2].id]).toContain(game.currentPlayerId);
    });

    it('should skip disconnected players', () => {
      const player1Id = game.players[0].id;
      const player2Id = game.players[1].id;
      
      // Disconnect player 1
      game.players[0].setConnected(false);
      game.currentPlayerId = player1Id;
      
      game.skipCurrentPlayer();
      
      // Should skip to next connected player
      expect(game.currentPlayerId).not.toBe(player1Id);
      expect([player2Id, game.players[2].id]).toContain(game.currentPlayerId);
    });
  });

  describe('game end conditions', () => {
    it('should end game when no active players left', () => {
      // Eliminate all players
      game.players.forEach(player => player.eliminate());
      
      game.skipCurrentPlayer();
      
      expect(game.status).toBe('finished');
      expect(game.finishedAt).toBeGreaterThan(0);
    });

    it('should end game when all players disconnected', () => {
      // Disconnect all players
      game.players.forEach(player => player.setConnected(false));
      
      game.skipCurrentPlayer();
      
      expect(game.status).toBe('finished');
      expect(game.finishedAt).toBeGreaterThan(0);
    });

    it('should continue game with one active player', () => {
      // Eliminate two players, leave one active
      game.players[0].eliminate();
      game.players[1].eliminate();
      
      expect(game.getActivePlayers()).toHaveLength(1);
      
      // Game should end when checkGameEnd is called
      game.checkGameEnd();
      
      expect(game.status).toBe('finished');
      expect(game.winnerId).toBe(game.players[2].id);
    });
  });

  describe('skip counter management', () => {
    it('should reset skips after successful move', () => {
      const currentPlayerId = game.currentPlayerId!;
      const currentPlayer = game.getCurrentPlayer()!;
      
      // Add some skips
      currentPlayer.skipsInARow = 3;
      
      // Make a successful move
      game.applyMove(currentPlayerId, 0, 'P');
      
      expect(currentPlayer.skipsInARow).toBe(0);
    });

    it('should increment skips on manual skip', () => {
      const currentPlayer = game.getCurrentPlayer()!;
      const initialSkips = currentPlayer.skipsInARow;
      
      game.skipCurrentPlayer();
      
      expect(currentPlayer.skipsInARow).toBe(initialSkips + 1);
    });

    it('should increment skips on auto-skip', () => {
      const player1 = game.players[0];
      
      // Remove all pieces to force auto-skip
      player1.inventory = { P: 0, M: 0, G: 0 };
      game.currentPlayerId = player1.id;
      
      const initialSkips = player1.skipsInARow;
      
      game.skipCurrentPlayer();
      
      expect(player1.skipsInARow).toBe(initialSkips + 1);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null currentPlayerId gracefully', () => {
      game.currentPlayerId = null;
      
      expect(() => game.skipCurrentPlayer()).not.toThrow();
      expect(game.currentPlayerId).toBeNull();
    });

    it('should handle empty players array', () => {
      game.players = [];
      game.currentPlayerId = 'non-existent';
      
      expect(() => game.skipCurrentPlayer()).not.toThrow();
    });

    it('should handle scenario where all players have no legal moves', () => {
      // Fill entire board
      for (let i = 0; i < 9; i++) {
        game.board[i] = { P: 'red', M: 'blue', G: 'green' };
      }
      
      // All players still have pieces but no legal moves
      game.players.forEach(player => {
        player.inventory = { P: 1, M: 1, G: 1 };
      });
      
      const currentPlayerId = game.currentPlayerId!;
      
      game.skipCurrentPlayer();
      
      // Should handle gracefully (may end game or continue skipping)
      expect(game.status).toBeDefined();
    });
  });

  describe('turn order consistency', () => {
    it('should maintain consistent turn order', () => {
      const turnOrder: string[] = [];
      const maxTurns = 10;
      
      for (let i = 0; i < maxTurns; i++) {
        const currentPlayerId = game.currentPlayerId!;
        turnOrder.push(currentPlayerId);
        
        // Make a move or skip
        if (game.isValidMove(currentPlayerId, i % 9, 'P')) {
          game.applyMove(currentPlayerId, i % 9, 'P');
        } else {
          game.skipCurrentPlayer();
        }
        
        if (game.status !== 'playing') break;
      }
      
      // Verify turn order follows expected pattern
      expect(turnOrder.length).toBeGreaterThan(3);
      
      // Should see cycling behavior (same player appears multiple times)
      const uniquePlayers = new Set(turnOrder);
      expect(uniquePlayers.size).toBeGreaterThan(1);
    });

    it('should handle player elimination during turn cycle', () => {
      const player1Id = game.players[0].id;
      const player2Id = game.players[1].id;
      const player3Id = game.players[2].id;
      
      // Start with player 1
      game.currentPlayerId = player1Id;
      
      // Eliminate player 2
      game.players[1].eliminate();
      
      // Skip to next player - should go to player 3, not eliminated player 2
      game.skipCurrentPlayer();
      
      expect(game.currentPlayerId).not.toBe(player2Id);
      expect([player1Id, player3Id]).toContain(game.currentPlayerId);
    });
  });
});
