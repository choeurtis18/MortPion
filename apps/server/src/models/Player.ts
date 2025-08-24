import { v4 as uuidv4 } from 'uuid';
import type { Color, Size } from '@mortpion/shared';

export interface PlayerInventory {
  P: number;
  M: number;
  G: number;
}

export interface PlayerOptions {
  id?: string;
  nickname: string;
  color: Color;
  connected?: boolean;
  isHost?: boolean;
}

export class Player {
  public readonly id: string;
  public readonly nickname: string;
  public readonly color: Color;
  public inventory: PlayerInventory;
  public connected: boolean;
  public skipsInARow: number;
  public isEliminated: boolean;
  public isHost: boolean;

  constructor(options: PlayerOptions) {
    if (!options.nickname || options.nickname.trim().length === 0) {
      throw new Error('Player nickname cannot be empty');
    }
    if (options.nickname.length > 20) {
      throw new Error('Player nickname cannot exceed 20 characters');
    }

    this.id = options.id || uuidv4();
    this.nickname = options.nickname.trim();
    this.color = options.color;
    this.inventory = { P: 3, M: 3, G: 3 }; // Each player starts with 3 pieces of each size
    this.connected = options.connected ?? true;
    this.skipsInARow = 0;
    this.isEliminated = false;
    this.isHost = options.isHost ?? false;
  }

  /**
   * Check if player has pieces of a specific size available
   */
  hasPiece(size: Size): boolean {
    return this.inventory[size] > 0;
  }

  /**
   * Use a piece of specific size (decrement inventory)
   */
  usePiece(size: Size): void {
    if (!this.hasPiece(size)) {
      throw new Error(`Player ${this.nickname} has no ${size} pieces left`);
    }
    this.inventory[size]--;
  }

  /**
   * Check if player has any pieces left
   */
  hasAnyPieces(): boolean {
    return this.inventory.P > 0 || this.inventory.M > 0 || this.inventory.G > 0;
  }

  /**
   * Get total number of pieces remaining
   */
  getTotalPieces(): number {
    return this.inventory.P + this.inventory.M + this.inventory.G;
  }

  /**
   * Reset skip counter
   */
  resetSkips(): void {
    this.skipsInARow = 0;
  }

  /**
   * Increment skip counter
   */
  incrementSkips(): void {
    this.skipsInARow++;
  }

  /**
   * Mark player as eliminated
   */
  eliminate(): void {
    this.isEliminated = true;
  }

  /**
   * Set connection status
   */
  setConnected(connected: boolean): void {
    this.connected = connected;
  }

  /**
   * Set host status
   */
  setHost(isHost: boolean): void {
    this.isHost = isHost;
  }

  /**
   * Get player state for serialization
   */
  toJSON() {
    return {
      id: this.id,
      nickname: this.nickname,
      color: this.color,
      inventory: { ...this.inventory },
      connected: this.connected,
      skipsInARow: this.skipsInARow,
      isEliminated: this.isEliminated,
      isHost: this.isHost,
    };
  }
}
