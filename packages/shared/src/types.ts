import { z } from 'zod';

// Game types
export type Size = 'P' | 'M' | 'G'; // Petit, Moyen, Grand
export type Color = 'red' | 'blue' | 'green' | 'yellow';

export const SizeSchema = z.enum(['P', 'M', 'G']);
export const ColorSchema = z.enum(['red', 'blue', 'green', 'yellow']);

// Cell can contain up to 3 pieces (one per size)
export const CellSchema = z.object({
  P: ColorSchema.nullable(),
  M: ColorSchema.nullable(),
  G: ColorSchema.nullable(),
});

export type Cell = z.infer<typeof CellSchema>;

// Board is 3x3 = 9 cells
export const BoardSchema = z.array(CellSchema).length(9);
export type Board = z.infer<typeof BoardSchema>;

// Player
export const PlayerSchema = z.object({
  id: z.string().uuid(),
  nickname: z.string().min(1).max(20),
  color: ColorSchema,
  inventory: z.object({
    P: z.number().int().min(0).max(3),
    M: z.number().int().min(0).max(3),
    G: z.number().int().min(0).max(3),
  }),
  connected: z.boolean(),
  skipsInARow: z.number().int().min(0),
  isEliminated: z.boolean(),
  isHost: z.boolean(),
});

// Player type is now implemented as a class in game-logic.ts
// Keep the schema for validation but don't export the type to avoid conflicts
type Player = z.infer<typeof PlayerSchema>;
export type PlayerInventory = Player['inventory'];

// Room
export const RoomStatusSchema = z.enum(['waiting', 'playing', 'finished']);
export type RoomStatus = z.infer<typeof RoomStatusSchema>;

export const RoomSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  isPrivate: z.boolean(),
  code: z.string().optional(),
  capacity: z.number().int().min(2).max(4),
  players: z.array(PlayerSchema),
  board: BoardSchema,
  currentPlayerId: z.string().uuid().nullable(),
  status: RoomStatusSchema,
  createdAt: z.number(),
  expiresAt: z.number(),
  winnerId: z.string().uuid().nullable(),
  isDraw: z.boolean(),
});

export type Room = z.infer<typeof RoomSchema>;

// Move
export const MoveSchema = z.object({
  roomId: z.string().uuid(),
  playerId: z.string().uuid(),
  cellIndex: z.number().int().min(0).max(8),
  size: SizeSchema,
});

export type Move = z.infer<typeof MoveSchema>;

// Socket events payloads
export const CreateRoomPayloadSchema = z.object({
  name: z.string().min(1).max(50),
  capacity: z.number().int().min(2).max(4),
  isPrivate: z.boolean(),
  code: z.string().optional(),
  playerNickname: z.string().min(1).max(20),
});

export type CreateRoomPayload = z.infer<typeof CreateRoomPayloadSchema>;

export const JoinRoomPayloadSchema = z.object({
  roomId: z.string().uuid(),
  playerNickname: z.string().min(1).max(20),
  code: z.string().optional(),
});

export type JoinRoomPayload = z.infer<typeof JoinRoomPayloadSchema>;

export const ReplayVotePayloadSchema = z.object({
  roomId: z.string().uuid(),
  playerId: z.string().uuid(),
  vote: z.boolean(),
});

export type ReplayVotePayload = z.infer<typeof ReplayVotePayloadSchema>;

// Position type for board positions (0-8 for 3x3 grid)
export type Position = number;

// Board state type
export type BoardState = Board;

// Game status enumeration
export const GameStatusSchema = z.enum(['waiting', 'playing', 'finished']);
export type GameStatus = z.infer<typeof GameStatusSchema>;

// Game result type
export const GameResultSchema = z.object({
  status: GameStatusSchema,
  winnerId: z.string().uuid().nullable(),
  isDraw: z.boolean(),
  endedAt: z.number().optional(),
});

export type GameResult = z.infer<typeof GameResultSchema>;
