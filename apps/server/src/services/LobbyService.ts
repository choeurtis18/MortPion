import { Room } from '../models/Room.js';
import { Player } from '../models/Player.js';
import type { Color } from '@mortpion/shared';

export interface RoomFilters {
  isPrivate?: boolean;
  status?: 'waiting' | 'playing' | 'finished';
  hasSpace?: boolean;
}

export interface RoomSearchOptions {
  query?: string;
  filters?: RoomFilters;
  sortBy?: 'name' | 'created' | 'activity';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CreateRoomOptions {
  name: string;
  hostId: string;
  capacity: number;
  isPrivate: boolean;
  code?: string;
}

export interface RoomListItem {
  id: string;
  name: string;
  status: 'waiting' | 'playing' | 'finished';
  playerCount: number;
  capacity: number;
  isPrivate: boolean;
  hasSpace: boolean;
  createdAt: number;
  lastActivity: number;
}

/**
 * Service to manage the game lobby and rooms
 */
export class LobbyService {
  private rooms: Map<string, Room> = new Map();
  private roomsByHost: Map<string, string> = new Map(); // hostId -> roomId
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval for expired rooms
    this.startCleanupInterval();
  }

  /**
   * Create a new room
   */
  createRoom(options: CreateRoomOptions): Room {
    // Validate capacity
    if (options.capacity < 2 || options.capacity > 4) {
      throw new Error('Room capacity must be between 2 and 4 players');
    }

    // Validate room name
    if (!options.name.trim()) {
      throw new Error('Room name cannot be empty');
    }

    if (options.name.length > 50) {
      throw new Error('Room name cannot exceed 50 characters');
    }

    // Check if host already has a room
    if (this.roomsByHost.has(options.hostId)) {
      throw new Error('Host already has an active room');
    }

    // Validate private room code
    if (options.isPrivate) {
      if (!options.code || options.code.length < 4) {
        throw new Error('Private rooms must have a code of at least 4 characters');
      }
      if (options.code.length > 20) {
        throw new Error('Room code cannot exceed 20 characters');
      }
    }

    // Create room
    const room = new Room({
      name: options.name.trim(),
      hostId: options.hostId,
      capacity: options.capacity,
      isPrivate: options.isPrivate,
      code: options.code
    });

    // Store room
    this.rooms.set(room.id, room);
    this.roomsByHost.set(options.hostId, room.id);

    return room;
  }

  /**
   * Get a room by ID
   */
  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Get room by host ID
   */
  getRoomByHost(hostId: string): Room | null {
    const roomId = this.roomsByHost.get(hostId);
    return roomId ? this.getRoom(roomId) : null;
  }

  /**
   * List rooms with search and filtering
   */
  listRooms(options: RoomSearchOptions = {}): {
    rooms: RoomListItem[];
    total: number;
    hasMore: boolean;
  } {
    let filteredRooms = Array.from(this.rooms.values());

    // Remove expired rooms first
    filteredRooms = filteredRooms.filter(room => !room.hasExpired());

    // Apply filters
    if (options.filters) {
      const { isPrivate, status, hasSpace } = options.filters;

      if (typeof isPrivate === 'boolean') {
        filteredRooms = filteredRooms.filter(room => room.isPrivate === isPrivate);
      }

      if (status) {
        filteredRooms = filteredRooms.filter(room => room.getStatus() === status);
      }

      if (typeof hasSpace === 'boolean') {
        if (hasSpace) {
          filteredRooms = filteredRooms.filter(room => !room.isFull());
        } else {
          filteredRooms = filteredRooms.filter(room => room.isFull());
        }
      }
    }

    // Apply search query (case-insensitive)
    if (options.query) {
      const query = options.query.toLowerCase().trim();
      filteredRooms = filteredRooms.filter(room =>
        room.name.toLowerCase().includes(query)
      );
    }

    // Sort rooms
    const sortBy = options.sortBy || 'activity';
    const sortOrder = options.sortOrder || 'desc';

    filteredRooms.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'activity':
        default:
          // Use game start time as activity, fallback to creation time
          const aActivity = a.game.startedAt || a.createdAt;
          const bActivity = b.game.startedAt || b.createdAt;
          comparison = aActivity - bActivity;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const total = filteredRooms.length;
    const offset = options.offset || 0;
    const limit = options.limit || 20;

    const paginatedRooms = filteredRooms.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    // Convert to list items
    const rooms: RoomListItem[] = paginatedRooms.map(room => ({
      id: room.id,
      name: room.name,
      status: room.getStatus(),
      playerCount: room.players.length,
      capacity: room.capacity,
      isPrivate: room.isPrivate,
      hasSpace: !room.isFull(),
      createdAt: room.createdAt,
      lastActivity: room.game.startedAt || room.createdAt
    }));

    return {
      rooms,
      total,
      hasMore
    };
  }

  /**
   * Search rooms by name (case-insensitive)
   */
  searchRooms(query: string, filters?: RoomFilters): RoomListItem[] {
    return this.listRooms({
      query,
      filters,
      sortBy: 'activity',
      sortOrder: 'desc'
    }).rooms;
  }

  /**
   * Join a room
   */
  joinRoom(roomId: string, player: Player, code?: string): {
    success: boolean;
    error?: string;
    room?: Room;
  } {
    const room = this.getRoom(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.hasExpired()) {
      this.removeRoom(roomId);
      return { success: false, error: 'Room has expired' };
    }

    if (room.isFull()) {
      return { success: false, error: 'Room is full' };
    }

    if (room.getStatus() !== 'waiting') {
      return { success: false, error: 'Game is already in progress' };
    }

    // Verify private room code
    if (room.isPrivate) {
      if (!code) {
        return { success: false, error: 'Room code required' };
      }
      if (!room.verifyCode(code)) {
        return { success: false, error: 'Invalid room code' };
      }
    }

    // Check if player is already in the room
    if (room.getPlayer(player.id)) {
      return { success: false, error: 'Player already in room' };
    }

    // Add player to room
    const added = room.addPlayer(player);
    if (!added) {
      return { success: false, error: 'Failed to join room' };
    }

    return { success: true, room };
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string, playerId: string): {
    success: boolean;
    error?: string;
    room?: Room;
    roomClosed?: boolean;
  } {
    const room = this.getRoom(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    const player = room.getPlayer(playerId);
    if (!player) {
      return { success: false, error: 'Player not in room' };
    }

    const wasHost = room.hostId === playerId;
    const removed = room.removePlayer(playerId);

    if (!removed) {
      return { success: false, error: 'Failed to leave room' };
    }

    // Update host mapping
    if (wasHost) {
      this.roomsByHost.delete(playerId);
      
      // If new host was assigned, update mapping
      if (room.hostId && room.hostId !== playerId) {
        this.roomsByHost.set(room.hostId, roomId);
      }
    }

    // Check if room should be closed
    if (room.players.length === 0) {
      this.removeRoom(roomId);
      return { success: true, roomClosed: true };
    }

    return { success: true, room };
  }

  /**
   * Remove a room
   */
  removeRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    // Clean up host mapping
    this.roomsByHost.delete(room.hostId);

    // Remove room
    this.rooms.delete(roomId);
    return true;
  }

  /**
   * Get lobby statistics
   */
  getStats(): {
    totalRooms: number;
    waitingRooms: number;
    activeGames: number;
    totalPlayers: number;
    privateRooms: number;
    publicRooms: number;
  } {
    const rooms = Array.from(this.rooms.values());
    const activeRooms = rooms.filter(room => !room.hasExpired());

    return {
      totalRooms: activeRooms.length,
      waitingRooms: activeRooms.filter(room => room.getStatus() === 'waiting').length,
      activeGames: activeRooms.filter(room => room.getStatus() === 'playing').length,
      totalPlayers: activeRooms.reduce((sum, room) => sum + room.players.length, 0),
      privateRooms: activeRooms.filter(room => room.isPrivate).length,
      publicRooms: activeRooms.filter(room => !room.isPrivate).length,
    };
  }

  /**
   * Clean up expired rooms
   */
  cleanupExpiredRooms(): number {
    const expiredRooms: string[] = [];

    for (const [roomId, room] of this.rooms) {
      if (room.hasExpired()) {
        expiredRooms.push(roomId);
      }
    }

    expiredRooms.forEach(roomId => this.removeRoom(roomId));
    return expiredRooms.length;
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanupInterval(): void {
    // Clean up expired rooms every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRooms();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get all rooms (for testing/admin purposes)
   */
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Clear all rooms (for testing purposes)
   */
  clearAllRooms(): void {
    this.rooms.clear();
    this.roomsByHost.clear();
  }
}
