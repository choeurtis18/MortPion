import type { Board, Cell, Color, Size } from '@mortpion/shared';
import { createEmptyBoard, isLegalMove, applyMove, checkWinConditions, isDraw, hasLegalMoves, getNextPlayer } from '@mortpion/shared';
import { Player } from './Player.js';

export type GameStatus = 'waiting' | 'playing' | 'finished';

export class Game {
  public board: Board;
  public players: Player[];
  public currentPlayerId: string | null;
  public status: GameStatus;
  public winnerId: string | null;
  public isDraw: boolean;
  public startedAt: number | null;
  public finishedAt: number | null;
  public turnStartTime: number | null;
  public turnTimeLimit: number; // seconds

  constructor() {
    this.board = createEmptyBoard();
    this.players = [];
    this.currentPlayerId = null;
    this.status = 'waiting';
    this.winnerId = null;
    this.isDraw = false;
    this.startedAt = null;
    this.finishedAt = null;
    this.turnStartTime = null;
    this.turnTimeLimit = 60; // 1 minute per turn
  }

  /**
   * Initialize the game with players
   */
  initialize(players: Player[]): void {
    if (players.length < 2 || players.length > 4) {
      throw new Error('Game requires 2-4 players');
    }

    // Assign colors automatically to ensure uniqueness
    const availableColors: Color[] = ['red', 'blue', 'green', 'yellow'];
    
    // Create new player instances with assigned colors and reset inventories
    this.players = players.map((player, index) => {
      if (index >= availableColors.length) {
        throw new Error('Not enough colors available for all players');
      }
      
      // Create a new player with the assigned color
      return new Player({
        id: player.id,
        nickname: player.nickname,
        color: availableColors[index],
        connected: player.connected,
        isHost: player.isHost,
      });
    });

    this.board = createEmptyBoard();
    
    // Select random first player
    const randomIndex = Math.floor(Math.random() * this.players.length);
    this.currentPlayerId = this.players[randomIndex].id;
    
    this.status = 'playing';
    this.startedAt = Date.now();
    this.winnerId = null;
    this.isDraw = false;
    this.finishedAt = null;
    this.startTurn();
  }

  /**
   * Get current player
   */
  getCurrentPlayer(): Player | null {
    if (!this.currentPlayerId) return null;
    return this.players.find(p => p.id === this.currentPlayerId) || null;
  }

  /**
   * Check if a move is valid
   */
  isValidMove(playerId: string, cellIndex: number, size: Size): boolean {
    // Game must be in playing state
    if (this.status !== 'playing') return false;

    // Must be player's turn
    if (this.currentPlayerId !== playerId) return false;

    // Player must exist and not be eliminated
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.isEliminated) return false;

    // Player must have the piece available
    if (!player.hasPiece(size)) return false;

    // Move must be legal on the board
    return isLegalMove(this.board, cellIndex, size);
  }

  /**
   * Apply a move to the game
   */
  applyMove(playerId: string, cellIndex: number, size: Size): boolean {
    if (!this.isValidMove(playerId, cellIndex, size)) {
      return false;
    }

    const player = this.players.find(p => p.id === playerId)!;
    
    // Apply the move
    this.board[cellIndex][size] = player.color;
    player.usePiece(size);
    
    // Reset skip counter for successful move
    player.resetSkips();

    // Check for victory
    if (checkWinConditions(this.board, player.color)) {
      this.status = 'finished';
      this.winnerId = player.id;
      this.finishedAt = Date.now();
      return true;
    }

    // Check for draw
    if (isDraw(this.board, this.players)) {
      this.status = 'finished';
      this.isDraw = true;
      this.finishedAt = Date.now();
      return true;
    }

    // Move to next player
    this.moveToNextPlayer();
    return true;
  }

  /**
   * Move to next player, handling skips for players with no legal moves
   */
  private moveToNextPlayer(): void {
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length === 0) {
      // No active players left
      this.status = 'finished';
      this.finishedAt = Date.now();
      return;
    }

    // Check if any active player has legal moves
    const playersWithMoves = activePlayers.filter(player => hasLegalMoves(this.board, player));
    if (playersWithMoves.length === 0) {
      // No player has legal moves - game is a draw
      this.isDraw = true;
      this.status = 'finished';
      this.finishedAt = Date.now();
      return;
    }

    const nextPlayer = getNextPlayer(this.players, this.currentPlayerId!);
    if (!nextPlayer) {
      // Fallback - should not happen with active players check above
      this.status = 'finished';
      this.finishedAt = Date.now();
      return;
    }

    this.currentPlayerId = nextPlayer.id;

    // Check if current player has legal moves
    if (!hasLegalMoves(this.board, nextPlayer)) {
      nextPlayer.skipsInARow++;
      
      // Auto-skip and move to next player (safe now with draw detection above)
      this.moveToNextPlayer();
      return; // Important: return here to avoid starting timer for skipped player
    }
    
    // Start timer for the new current player
    this.startTurn();
  }

  /**
   * Skip current player's turn (timeout or manual skip)
   */
  skipCurrentPlayer(): void {
    if (this.status !== 'playing' || !this.currentPlayerId) return;

    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer) {
      currentPlayer.incrementSkips();
      
      // Check for elimination after consecutive skips (N=2 as per RULES.md)
      if (currentPlayer.skipsInARow >= 2) {
        currentPlayer.eliminate();
      }
    }

    this.moveToNextPlayer();
  }

  /**
   * Get active (non-eliminated, connected) players
   */
  getActivePlayers(): Player[] {
    return this.players.filter(p => !p.isEliminated && p.connected);
  }

  /**
   * Check if game should end due to insufficient players
   */
  checkGameEnd(): void {
    const activePlayers = this.getActivePlayers();
    
    if (activePlayers.length < 2) {
      this.status = 'finished';
      this.finishedAt = Date.now();
      
      // If exactly one player left, they win
      if (activePlayers.length === 1) {
        this.winnerId = activePlayers[0].id;
      }
    }
  }

  /**
   * Get game state for serialization
   */
  getGameState() {
    return {
      board: this.board,
      players: this.players.map(p => p.toJSON()),
      currentPlayerId: this.currentPlayerId,
      status: this.status,
      winnerId: this.winnerId,
      isDraw: this.isDraw,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      turnTimeLeft: this.getTurnTimeLeft(),
    };
  }

  /**
   * Get winner player
   */
  getWinner(): Player | null {
    if (!this.winnerId) return null;
    return this.players.find(p => p.id === this.winnerId) || null;
  }

  /**
   * Start a new turn timer
   */
  startTurn(): void {
    this.turnStartTime = Date.now();
  }

  /**
   * Get remaining time for current turn (in seconds)
   */
  getTurnTimeLeft(): number {
    if (!this.turnStartTime || this.status !== 'playing') return 0;
    
    const elapsed = (Date.now() - this.turnStartTime) / 1000;
    const remaining = Math.max(0, this.turnTimeLimit - elapsed);
    return Math.floor(remaining);
  }

  /**
   * Check if current turn has timed out
   */
  isTurnTimedOut(): boolean {
    return this.getTurnTimeLeft() <= 0 && this.status === 'playing';
  }

  /**
   * Skip current player's turn (due to timeout or manual skip)
   */
  skipTurn(): boolean {
    if (this.status !== 'playing' || !this.currentPlayerId) return false;

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) return false;

    // Increment skip counter
    currentPlayer.incrementSkips();
    
    // Check for elimination after consecutive skips (N=2 as per RULES.md)
    if (currentPlayer.skipsInARow >= 2) {
      currentPlayer.eliminate();
    }

    // Move to next player (this will handle starting the timer)
    this.moveToNextPlayer();

    // Check if game should end
    this.checkGameEnd();

    return true;
  }

  /**
   * Reset game to initial state
   */
  reset(): void {
    this.board = createEmptyBoard();
    this.currentPlayerId = null;
    this.status = 'waiting';
    this.winnerId = null;
    this.isDraw = false;
    this.startedAt = null;
    this.finishedAt = null;
    this.turnStartTime = null;

    // Reset all players
    this.players.forEach(player => {
      player.inventory = { P: 3, M: 3, G: 3 };
      player.skipsInARow = 0;
      player.isEliminated = false;
    });
  }
}
