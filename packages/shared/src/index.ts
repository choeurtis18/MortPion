// Export all types except Player type (to avoid conflict with Player class)
export type {
  Size,
  Color,
  Cell,
  Board,
  PlayerInventory,
  RoomStatus,
  GameStatus,
  GameResult,
  Position,
  BoardState,
  Room,
  Move,
  CreateRoomPayload,
  JoinRoomPayload,
  ReplayVotePayload
} from './types.js';

// Export schemas
export {
  SizeSchema,
  ColorSchema,
  CellSchema,
  BoardSchema,
  PlayerSchema,
  RoomStatusSchema,
  GameStatusSchema,
  GameResultSchema,
  RoomSchema,
  MoveSchema,
  CreateRoomPayloadSchema,
  JoinRoomPayloadSchema,
  ReplayVotePayloadSchema
} from './types.js';

// Export game logic functions and classes
export {
  createEmptyBoard,
  isLegalMove,
  applyMove,
  hasLegalMoves,
  checkWinConditions,
  isDraw,
  getNextPlayer,
  Player as PlayerClass,
  Game
} from './game-logic.js';
