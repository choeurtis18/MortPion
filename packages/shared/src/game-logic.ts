import type { Board, Cell, Color, Size, GameStatus, GameResult, Position, PlayerInventory } from './types.js';

// Define PlayerType interface locally since we removed it from types.ts to avoid conflicts
interface PlayerType {
  id: string;
  nickname: string;
  color: Color;
  inventory: PlayerInventory;
  connected: boolean;
  skipsInARow: number;
  isEliminated: boolean;
  isHost: boolean;
}

// Export Player type for external use
export type PlayerInstance = Player;

// Initialize empty board
export function createEmptyBoard(): Board {
  return Array.from({ length: 9 }, () => ({ P: null, M: null, G: null }));
}

// Check if a move is legal (with proper Otrio nesting rules: P < M < G)
export function isLegalMove(board: Board, cellIndex: number, size: Size, color?: Color): boolean {
  if (cellIndex < 0 || cellIndex > 8) return false;
  const cell = board[cellIndex];
  
  // The size slot must be empty
  if (cell[size] !== null) return false;
  
  // Otrio nesting rules: P < M < G (smaller pieces go inside larger ones)
  // Colors can be different - only size matters for nesting!
  
  if (size === 'G') {
    // G can be placed on:
    // - Empty cell [null, null, null] ✅
    // - Cell with only M [null, M, null] ✅  
    // - Cell with only P [null, null, P] ✅
    // - Cell with M+P [null, M, P] ✅
    // G cannot be placed if G already exists
    return cell.G === null;
  } else if (size === 'M') {
    // M can be placed on:
    // - Empty cell [null, null, null] ✅
    // - Cell with only P [null, null, P] ✅
    // M cannot be placed if M exists OR if G exists
    return cell.M === null && cell.G === null;
  } else { // size === 'P'
    // P can be placed on:
    // - Empty cell [null, null, null] ✅
    // P cannot be placed if P exists OR if M exists OR if G exists
    return cell.P === null && cell.M === null && cell.G === null;
  }
}

// Apply a move to the board
export function applyMove(board: Board, cellIndex: number, size: Size, color: Color): Board {
  if (!isLegalMove(board, cellIndex, size, color)) {
    throw new Error('Illegal move');
  }
  
  const newBoard = [...board];
  newBoard[cellIndex] = { ...newBoard[cellIndex], [size]: color };
  return newBoard;
}

// Check if player has any legal moves
export function hasLegalMoves(board: Board, player: PlayerType): boolean {
  for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
    for (const size of ['P', 'M', 'G'] as const) {
      if (player.inventory[size] > 0 && isLegalMove(board, cellIndex, size, player.color)) {
        return true;
      }
    }
  }
  return false;
}

// Get the visible piece in a cell (largest piece = G > M > P)
function getVisiblePiece(cell: Cell): Color | null {
  if (cell.G !== null) return cell.G;
  if (cell.M !== null) return cell.M;
  if (cell.P !== null) return cell.P;
  return null;
}

// Win condition: 3 pieces of same color aligned (based on visible pieces only)
function checkSameColorAlignment(board: Board, color: Color): boolean {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6] // diagonals
  ];

  for (const line of lines) {
    if (line.every(cellIndex => {
      const cell = board[cellIndex];
      const visiblePiece = getVisiblePiece(cell);
      return visiblePiece === color;
    })) {
      return true;
    }
  }
  return false;
}

// Check all win conditions for a color
export function checkWinConditions(board: Board, color: Color): boolean {
  return checkSameColorAlignment(board, color);
}

// Check if game is draw (no legal moves for any player)
export function isDraw(board: Board, players: PlayerType[]): boolean {
  return players.every(player => !hasLegalMoves(board, player));
}

// Get next player in turn order
export function getNextPlayer(players: PlayerType[], currentPlayerId: string): PlayerType | null {
  const activePlayers = players.filter(p => !p.isEliminated && p.connected);
  if (activePlayers.length === 0) return null;
  
  const currentIndex = activePlayers.findIndex(p => p.id === currentPlayerId);
  if (currentIndex === -1) return activePlayers[0];
  
  return activePlayers[(currentIndex + 1) % activePlayers.length];
}

// Player class for creating player instances
export class Player implements PlayerType {
  public id: string;
  public nickname: string;
  public color: Color;
  public inventory: { P: number; M: number; G: number };
  public connected: boolean;
  public skipsInARow: number;
  public isEliminated: boolean;
  public isHost: boolean;

  constructor(nickname: string, color: Color) {
    this.id = crypto.randomUUID();
    this.nickname = nickname;
    this.color = color;
    this.inventory = { P: 3, M: 3, G: 3 }; // Each player starts with 3 pieces of each size
    this.connected = true;
    this.skipsInARow = 0;
    this.isEliminated = false;
    this.isHost = false;
  }
}

// Game class for managing game state and logic
export class Game {
  private board: Board;
  private players: PlayerType[];
  private currentPlayerId: string;
  private status: GameStatus;
  private winnerId: string | null;
  private isDraw: boolean;

  constructor(players: PlayerType[]) {
    if (players.length < 2 || players.length > 4) {
      throw new Error('Game requires 2-4 players');
    }

    this.board = createEmptyBoard();
    this.players = [...players];
    this.currentPlayerId = players[0].id;
    this.status = 'playing';
    this.winnerId = null;
    this.isDraw = false;
  }

  getCurrentPlayer(): PlayerType | null {
    return this.players.find(p => p.id === this.currentPlayerId) || null;
  }

  getBoard(): Board {
    return [...this.board];
  }

  getPlayers(): PlayerType[] {
    return [...this.players];
  }

  getStatus(): GameStatus {
    return this.status;
  }

  getResult(): GameResult {
    return {
      status: this.status,
      winnerId: this.winnerId,
      isDraw: this.isDraw,
      endedAt: this.status === 'finished' ? Date.now() : undefined,
    };
  }

  applyMove(move: { position: Position; piece: { size: Size; color: Color } }): void {
    if (this.status !== 'playing') {
      throw new Error('Game is not in playing state');
    }

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) {
      throw new Error('No current player');
    }

    if (currentPlayer.color !== move.piece.color) {
      throw new Error('Not your turn');
    }

    if (currentPlayer.inventory[move.piece.size] <= 0) {
      throw new Error(`No ${move.piece.size} pieces available`);
    }

    // Validate and apply the move
    if (!isLegalMove(this.board, move.position, move.piece.size, move.piece.color)) {
      throw new Error('Illegal move');
    }

    this.board = applyMove(this.board, move.position, move.piece.size, move.piece.color);
    
    // Update player inventory
    const playerIndex = this.players.findIndex(p => p.id === currentPlayer.id);
    if (playerIndex !== -1) {
      this.players[playerIndex] = {
        ...this.players[playerIndex],
        inventory: {
          ...this.players[playerIndex].inventory,
          [move.piece.size]: this.players[playerIndex].inventory[move.piece.size] - 1
        }
      };
    }

    // Check for win conditions
    if (checkWinConditions(this.board, move.piece.color)) {
      this.status = 'finished';
      this.winnerId = currentPlayer.id;
      return;
    }

    // Check for draw
    if (isDraw(this.board, this.players)) {
      this.status = 'finished';
      this.isDraw = true;
      return;
    }

    // Move to next player
    const nextPlayer = getNextPlayer(this.players, this.currentPlayerId);
    if (nextPlayer) {
      this.currentPlayerId = nextPlayer.id;
    }
  }
}
