import { LobbyService } from './LobbyService.js';
import { Player } from '../models/Player.js';
import { Room } from '../models/Room.js';

export interface PlayerConnection {
  playerId: string;
  socketId: string;
  roomId?: string;
  connectedAt: number;
  lastActivity: number;
  isReconnecting: boolean;
}

export interface DisconnectionOptions {
  reason: 'explicit' | 'network' | 'timeout';
  canReconnect?: boolean;
  timeoutMs?: number;
}

export interface ReconnectionResult {
  success: boolean;
  error?: string;
  room?: Room | null;
  gameState?: any;
}

/**
 * Service to manage player connections, disconnections, and reconnections
 */
export class ConnectionManager {
  private connections: Map<string, PlayerConnection> = new Map(); // playerId -> connection
  private socketToPlayer: Map<string, string> = new Map(); // socketId -> playerId
  private disconnectedPlayers: Map<string, {
    player: Player;
    roomId: string;
    disconnectedAt: number;
    reason: string;
    canReconnect: boolean;
  }> = new Map();

  private reconnectionTimeout = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private lobbyService: LobbyService) {
    this.startCleanupInterval();
  }

  /**
   * Register a new player connection
   */
  connect(playerId: string, socketId: string): void {
    // Remove any existing connection for this player
    this.disconnect(playerId, { reason: 'explicit', canReconnect: false });

    // Remove any existing socket mapping
    const existingPlayerId = this.socketToPlayer.get(socketId);
    if (existingPlayerId) {
      this.connections.delete(existingPlayerId);
    }

    const connection: PlayerConnection = {
      playerId,
      socketId,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      isReconnecting: false
    };

    this.connections.set(playerId, connection);
    this.socketToPlayer.set(socketId, playerId);

    // Remove from disconnected players if reconnecting
    this.disconnectedPlayers.delete(playerId);
  }

  /**
   * Disconnect a player
   */
  disconnect(playerId: string, options: DisconnectionOptions): {
    wasInRoom: boolean;
    room?: Room | null;
    shouldForfeit: boolean;
    shouldTransferHost: boolean;
    newHostId?: string;
  } {
    const connection = this.connections.get(playerId);
    if (!connection) {
      return { wasInRoom: false, shouldForfeit: false, shouldTransferHost: false };
    }

    const room = connection.roomId ? this.lobbyService.getRoom(connection.roomId) : null;
    const player = room?.getPlayer(playerId);

    let shouldForfeit = false;
    let shouldTransferHost = false;
    let newHostId: string | undefined;

    if (room && player) {
      const isHost = room.hostId === playerId;
      const gameInProgress = room.getStatus() === 'playing';

      if (options.reason === 'explicit') {
        // Explicit leave = forfeit if game in progress
        if (gameInProgress) {
          shouldForfeit = true;
          player.eliminate();
          // Don't remove eliminated player from room during game
          // They stay as eliminated until game ends
        } else {
          // Remove player from room only if not in game
          this.lobbyService.leaveRoom(room.id, playerId);
        }
      } else {
        // Network disconnect or timeout - keep seat but mark as disconnected
        player.setConnected(false);

        if (options.canReconnect !== false) {
          // Store disconnected player for potential reconnection
          this.disconnectedPlayers.set(playerId, {
            player,
            roomId: room.id,
            disconnectedAt: Date.now(),
            reason: options.reason,
            canReconnect: true
          });
        }

        // If host disconnected, transfer host to next active player
        if (isHost && !gameInProgress) {
          const activePlayers = room.players.filter(p => p.connected && !p.isEliminated);
          if (activePlayers.length > 0) {
            shouldTransferHost = true;
            newHostId = activePlayers[0].id;
            // Host transfer will be handled by LobbyService when player leaves
          }
        }
      }
    }

    // Clean up connection
    this.socketToPlayer.delete(connection.socketId);
    this.connections.delete(playerId);

    return {
      wasInRoom: !!room,
      room,
      shouldForfeit,
      shouldTransferHost,
      newHostId
    };
  }

  /**
   * Attempt to reconnect a player
   */
  reconnect(playerId: string, socketId: string): ReconnectionResult {
    const disconnectedInfo = this.disconnectedPlayers.get(playerId);
    if (!disconnectedInfo) {
      return { success: false, error: 'No disconnection record found' };
    }

    if (!disconnectedInfo.canReconnect) {
      return { success: false, error: 'Reconnection not allowed' };
    }

    const room = this.lobbyService.getRoom(disconnectedInfo.roomId);
    if (!room) {
      this.disconnectedPlayers.delete(playerId);
      return { success: false, error: 'Room no longer exists' };
    }

    const player = room.getPlayer(playerId);
    if (!player) {
      this.disconnectedPlayers.delete(playerId);
      return { success: false, error: 'Player no longer in room' };
    }

    // Check if reconnection timeout has expired
    const timeoutMs = this.reconnectionTimeout;
    if (Date.now() - disconnectedInfo.disconnectedAt > timeoutMs) {
      // Timeout expired - eliminate player if game in progress
      if (room.getStatus() === 'playing') {
        player.eliminate();
      } else {
        // Remove from lobby
        this.lobbyService.leaveRoom(room.id, playerId);
      }
      this.disconnectedPlayers.delete(playerId);
      return { success: false, error: 'Reconnection timeout expired' };
    }

    // Successful reconnection
    player.setConnected(true);
    this.connect(playerId, socketId);

    // Update connection with room info
    const connection = this.connections.get(playerId)!;
    connection.roomId = room.id;
    connection.isReconnecting = true;

    this.disconnectedPlayers.delete(playerId);

    return {
      success: true,
      room,
      gameState: room.getStatus() === 'playing' ? room.game.getGameState() : undefined
    };
  }

  /**
   * Handle player joining a room
   */
  joinRoom(playerId: string, roomId: string): boolean {
    const connection = this.connections.get(playerId);
    if (!connection) {
      return false;
    }

    connection.roomId = roomId;
    return true;
  }

  /**
   * Handle player leaving a room
   */
  leaveRoom(playerId: string): boolean {
    const connection = this.connections.get(playerId);
    if (!connection) {
      return false;
    }

    connection.roomId = undefined;
    return true;
  }

  /**
   * Update player activity timestamp
   */
  updateActivity(playerId: string): void {
    const connection = this.connections.get(playerId);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }

  /**
   * Get player connection by socket ID
   */
  getPlayerBySocket(socketId: string): string | null {
    return this.socketToPlayer.get(socketId) || null;
  }

  /**
   * Get connection info for a player
   */
  getConnection(playerId: string): PlayerConnection | null {
    return this.connections.get(playerId) || null;
  }

  /**
   * Check if player is connected
   */
  isConnected(playerId: string): boolean {
    return this.connections.has(playerId);
  }

  /**
   * Get all connected players
   */
  getConnectedPlayers(): PlayerConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get disconnected players that can reconnect
   */
  getDisconnectedPlayers(): Array<{
    playerId: string;
    roomId: string;
    disconnectedAt: number;
    reason: string;
    timeRemaining: number;
  }> {
    const now = Date.now();
    return Array.from(this.disconnectedPlayers.entries()).map(([playerId, info]) => ({
      playerId,
      roomId: info.roomId,
      disconnectedAt: info.disconnectedAt,
      reason: info.reason,
      timeRemaining: Math.max(0, this.reconnectionTimeout - (now - info.disconnectedAt))
    }));
  }

  /**
   * Force disconnect all players in a room
   */
  disconnectRoom(roomId: string): string[] {
    const disconnectedPlayers: string[] = [];

    for (const [playerId, connection] of this.connections) {
      if (connection.roomId === roomId) {
        this.disconnect(playerId, { reason: 'explicit', canReconnect: false });
        disconnectedPlayers.push(playerId);
      }
    }

    return disconnectedPlayers;
  }

  /**
   * Handle room closure - clean up all related connections
   */
  handleRoomClosed(roomId: string): void {
    // Remove all disconnected players from this room
    for (const [playerId, info] of this.disconnectedPlayers) {
      if (info.roomId === roomId) {
        this.disconnectedPlayers.delete(playerId);
      }
    }

    // Disconnect all connected players from this room
    this.disconnectRoom(roomId);
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    connectedPlayers: number;
    disconnectedPlayers: number;
    playersInRooms: number;
    reconnectablePlayers: number;
  } {
    const connectedInRooms = Array.from(this.connections.values())
      .filter(conn => conn.roomId).length;

    return {
      connectedPlayers: this.connections.size,
      disconnectedPlayers: this.disconnectedPlayers.size,
      playersInRooms: connectedInRooms,
      reconnectablePlayers: Array.from(this.disconnectedPlayers.values())
        .filter(info => info.canReconnect).length
    };
  }

  /**
   * Clean up expired disconnections
   */
  cleanupExpiredDisconnections(): number {
    const now = Date.now();
    const expired: string[] = [];

    for (const [playerId, info] of this.disconnectedPlayers) {
      if (now - info.disconnectedAt > this.reconnectionTimeout) {
        expired.push(playerId);

        // Handle expired disconnection
        const room = this.lobbyService.getRoom(info.roomId);
        if (room) {
          const player = room.getPlayer(playerId);
          if (player) {
            if (room.getStatus() === 'playing') {
              player.eliminate();
            } else {
              this.lobbyService.leaveRoom(room.id, playerId);
            }
          }
        }
      }
    }

    expired.forEach(playerId => this.disconnectedPlayers.delete(playerId));
    return expired.length;
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanupInterval(): void {
    // Clean up expired disconnections every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredDisconnections();
    }, 60 * 1000);
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
   * Clear all connections (for testing)
   */
  clearAll(): void {
    this.connections.clear();
    this.socketToPlayer.clear();
    this.disconnectedPlayers.clear();
  }

  /**
   * Set reconnection timeout (for testing)
   */
  setReconnectionTimeout(timeoutMs: number): void {
    this.reconnectionTimeout = timeoutMs;
  }
}
