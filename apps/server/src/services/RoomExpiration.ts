import { Room } from '../models/Room.js';

export interface RoomExpirationOptions {
  checkIntervalMs?: number; // How often to check for expired rooms (default 5 minutes)
  defaultTtlMs?: number; // Default TTL for new rooms (default 1 hour)
}

export interface ExpirationEvent {
  type: 'room_expired' | 'room_cleaned' | 'cleanup_started' | 'cleanup_completed';
  roomId?: string;
  expiredCount?: number;
  cleanedCount?: number;
}

export class RoomExpiration {
  private rooms = new Map<string, Room>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private eventCallbacks: ((event: ExpirationEvent) => void)[] = [];
  private options: Required<RoomExpirationOptions>;
  private isRunning = false;

  constructor(options: RoomExpirationOptions = {}) {
    this.options = {
      checkIntervalMs: options.checkIntervalMs ?? 5 * 60 * 1000, // 5 minutes
      defaultTtlMs: options.defaultTtlMs ?? 60 * 60 * 1000, // 1 hour
    };
  }

  /**
   * Start the expiration service
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.options.checkIntervalMs);
  }

  /**
   * Stop the expiration service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Add a room to be monitored for expiration
   */
  addRoom(room: Room): void {
    this.rooms.set(room.id, room);
  }

  /**
   * Remove a room from monitoring
   */
  removeRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  /**
   * Get a room by ID
   */
  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Get all rooms
   */
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Get expired rooms
   */
  getExpiredRooms(): Room[] {
    return this.getAllRooms().filter(room => room.hasExpired());
  }

  /**
   * Get active (non-expired) rooms
   */
  getActiveRooms(): Room[] {
    return this.getAllRooms().filter(room => !room.hasExpired());
  }

  /**
   * Manually trigger cleanup of expired rooms
   */
  performCleanup(): void {
    const expiredRooms = this.getExpiredRooms();
    
    if (expiredRooms.length === 0) {
      return;
    }

    this.emitEvent({
      type: 'cleanup_started',
      expiredCount: expiredRooms.length,
    });

    let cleanedCount = 0;

    expiredRooms.forEach(room => {
      // Emit room expired event
      this.emitEvent({
        type: 'room_expired',
        roomId: room.id,
      });

      // Remove from monitoring
      if (this.removeRoom(room.id)) {
        cleanedCount++;
        
        // Emit room cleaned event
        this.emitEvent({
          type: 'room_cleaned',
          roomId: room.id,
        });
      }
    });

    this.emitEvent({
      type: 'cleanup_completed',
      expiredCount: expiredRooms.length,
      cleanedCount,
    });
  }

  /**
   * Reset TTL for a room (when game starts or replay begins)
   */
  resetRoomTTL(roomId: string): boolean {
    const room = this.getRoom(roomId);
    if (!room) {
      return false;
    }

    room.resetTTL();
    return true;
  }

  /**
   * Set custom TTL for a room
   */
  setRoomTTL(roomId: string, ttlMs: number): boolean {
    const room = this.getRoom(roomId);
    if (!room) {
      return false;
    }

    room.expiresAt = Date.now() + ttlMs;
    return true;
  }

  /**
   * Get room expiration info
   */
  getRoomExpirationInfo(roomId: string): {
    expiresAt: number;
    remainingMs: number;
    hasExpired: boolean;
  } | null {
    const room = this.getRoom(roomId);
    if (!room) {
      return null;
    }

    const now = Date.now();
    const remainingMs = Math.max(0, room.expiresAt - now);

    return {
      expiresAt: room.expiresAt,
      remainingMs,
      hasExpired: room.hasExpired(),
    };
  }

  /**
   * Subscribe to expiration events
   */
  onExpirationEvent(callback: (event: ExpirationEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Unsubscribe from expiration events
   */
  offExpirationEvent(callback: (event: ExpirationEvent) => void): void {
    const index = this.eventCallbacks.indexOf(callback);
    if (index > -1) {
      this.eventCallbacks.splice(index, 1);
    }
  }

  /**
   * Emit an expiration event
   */
  private emitEvent(event: ExpirationEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in expiration event callback:', error);
      }
    });
  }

  /**
   * Get statistics about room expiration
   */
  getStatistics(): {
    totalRooms: number;
    activeRooms: number;
    expiredRooms: number;
    isRunning: boolean;
    checkIntervalMs: number;
  } {
    const expiredRooms = this.getExpiredRooms();
    
    return {
      totalRooms: this.rooms.size,
      activeRooms: this.rooms.size - expiredRooms.length,
      expiredRooms: expiredRooms.length,
      isRunning: this.isRunning,
      checkIntervalMs: this.options.checkIntervalMs,
    };
  }

  /**
   * Clear all rooms (for cleanup/testing)
   */
  clearAll(): void {
    this.rooms.clear();
  }

  /**
   * Get service status
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }
}
