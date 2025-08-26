import { v4 as uuidv4 } from 'uuid';
import { Player } from './Player.js';
import { Game } from './Game.js';
import type { Color } from '@mortpion/shared';

export interface RoomOptions {
  id?: string;
  name: string;
  capacity: number;
  isPrivate?: boolean;
  code?: string;
  hostId: string;
}

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export class Room {
  public readonly id: string;
  public readonly name: string;
  public readonly capacity: number;
  public readonly isPrivate: boolean;
  public readonly code?: string;
  public readonly createdAt: number;
  public expiresAt: number;
  public hostId: string;
  public players: Player[];
  public game: Game;
  public replayVotes: Map<string, boolean>;
  public replayDeadline: number | null;
  public disconnectionTime: number | null;

  constructor(options: RoomOptions) {
    if (!options.name || options.name.trim().length === 0) {
      throw new Error('Room name cannot be empty');
    }
    if (options.name.length > 50) {
      throw new Error('Room name cannot exceed 50 characters');
    }
    if (options.capacity < 2 || options.capacity > 4) {
      throw new Error('Room capacity must be between 2 and 4 players');
    }
    if (options.isPrivate && (!options.code || options.code.length < 4)) {
      throw new Error('Private room must have a code of at least 4 characters');
    }

    this.id = options.id || uuidv4();
    this.name = options.name.trim();
    this.capacity = options.capacity;
    this.isPrivate = options.isPrivate ?? false;
    this.code = options.code;
    this.createdAt = Date.now();
    this.expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour TTL
    this.hostId = options.hostId;
    this.players = [];
    this.game = new Game();
    this.replayVotes = new Map();
    this.replayDeadline = null;
    this.disconnectionTime = null;
  }

  /**
   * Add a player to the room
   */
  addPlayer(player: Player): boolean {
    if (this.players.length >= this.capacity) {
      return false; // Room is full
    }

    if (this.players.some(p => p.id === player.id)) {
      return false; // Player already in room
    }

    // Assign color
    const availableColors: Color[] = ['red', 'blue', 'green', 'yellow'];
    const usedColors = new Set(this.players.map(p => p.color));
    const availableColor = availableColors.find(color => !usedColors.has(color));
    
    if (!availableColor) {
      return false; // No colors available
    }

    // Create new player with assigned color
    const roomPlayer = new Player({
      id: player.id,
      nickname: player.nickname,
      color: availableColor,
      connected: player.connected,
      isHost: player.id === this.hostId,
    });

    this.players.push(roomPlayer);

    // Start game if room is full
    if (this.players.length === this.capacity) {
      this.startGame();
    }

    return true;
  }

  /**
   * Remove a player from the room
   */
  removePlayer(playerId: string): boolean {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return false; // Player not in room
    }

    const removedPlayer = this.players[playerIndex];
    this.players.splice(playerIndex, 1);

    // Handle host transfer if needed
    if (removedPlayer.isHost && this.players.length > 0) {
      this.transferHost();
    }

    // Check if game should end
    if (this.game.status === 'playing') {
      this.game.checkGameEnd();
    }

    return true;
  }

  /**
   * Transfer host to the earliest joined player
   */
  private transferHost(): void {
    if (this.players.length === 0) return;

    // Find the earliest joined player (first in array)
    const newHost = this.players[0];
    newHost.setHost(true);
    this.hostId = newHost.id;

    // Remove host status from others
    this.players.slice(1).forEach(p => p.setHost(false));
  }

  /**
   * Transfer host to a specific player
   */
  transferHostTo(playerId: string): boolean {
    const newHost = this.players.find(p => p.id === playerId);
    if (!newHost) return false;

    // Remove host status from all players
    this.players.forEach(p => p.setHost(false));
    
    // Set new host
    newHost.setHost(true);
    this.hostId = newHost.id;
    
    return true;
  }

  /**
   * Start the game
   */
  startGame(): void {
    if (this.players.length < 2) {
      throw new Error('Cannot start game with less than 2 players');
    }

    this.game.initialize(this.players);
    this.resetTTL(); // Reset room expiration when game starts
  }

  /**
   * Get room status based on game status
   */
  getStatus(): RoomStatus {
    return this.game.status;
  }

  /**
   * Check if room is full
   */
  isFull(): boolean {
    return this.players.length >= this.capacity;
  }

  /**
   * Check if room has expired
   */
  hasExpired(): boolean {
    return Date.now() > this.expiresAt;
  }

  /**
   * Reset room TTL (Time To Live)
   */
  resetTTL(): void {
    this.expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour from now
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId: string): Player | null {
    return this.players.find(p => p.id === playerId) || null;
  }

  /**
   * Get host player
   */
  getHost(): Player | null {
    return this.players.find(p => p.isHost) || null;
  }

  /**
   * Verify room code for private rooms
   */
  verifyCode(code: string): boolean {
    if (!this.isPrivate) return true; // Public room, no code needed
    return this.code === code;
  }

  /**
   * Start replay voting process
   */
  startReplayVoting(): void {
    this.replayVotes.clear();
    this.replayDeadline = Date.now() + (30 * 1000); // 30 seconds
  }

  /**
   * Cast a replay vote
   */
  castReplayVote(playerId: string, vote: boolean): boolean {
    if (!this.replayDeadline || Date.now() > this.replayDeadline) {
      return false; // Voting period expired
    }

    if (!this.players.some(p => p.id === playerId && p.connected)) {
      return false; // Player not in room or not connected
    }

    this.replayVotes.set(playerId, vote);
    return true;
  }

  /**
   * Check if replay voting is complete and unanimous
   */
  checkReplayVotes(): 'pending' | 'accepted' | 'rejected' {
    if (!this.replayDeadline) return 'rejected';

    const connectedPlayers = this.players.filter(p => p.connected);
    
    // Check if voting period expired
    if (Date.now() > this.replayDeadline) {
      return 'rejected';
    }

    // Check if all connected players have voted
    const allVoted = connectedPlayers.every(p => this.replayVotes.has(p.id));
    
    if (!allVoted) {
      return 'pending';
    }

    // Check if all votes are positive
    const allPositive = connectedPlayers.every(p => this.replayVotes.get(p.id) === true);
    
    return allPositive ? 'accepted' : 'rejected';
  }

  /**
   * Start a new game (replay)
   */
  replay(): void {
    this.game.reset();
    this.game.initialize(this.players);
    this.replayVotes.clear();
    this.replayDeadline = null;
    this.resetTTL();
  }

  /**
   * Get room state for serialization
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      capacity: this.capacity,
      isPrivate: this.isPrivate,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      hostId: this.hostId,
      players: this.players.map(p => p.toJSON()),
      game: this.game.getGameState(),
      status: this.getStatus(),
      isFull: this.isFull(),
      replayDeadline: this.replayDeadline,
      replayVotes: Object.fromEntries(this.replayVotes),
    };
  }
}
