import { Room } from '../models/Room.js';
import { Player } from '../models/Player.js';

export interface TurnTimerOptions {
  timeoutMs?: number; // Default 60 seconds
  antiAbuseEnabled?: boolean; // Default false
  maxConsecutiveSkips?: number; // Default 3
}

export interface TimerState {
  roomId: string;
  playerId: string;
  startTime: number;
  timeoutMs: number;
  remainingMs: number;
  isActive: boolean;
}

export interface TimerEvent {
  type: 'timeout' | 'warning' | 'started' | 'stopped';
  roomId: string;
  playerId: string;
  remainingMs?: number;
}

/**
 * Service to manage turn timers for game rooms
 */
export class TurnTimer {
  private timers: Map<string, NodeJS.Timeout> = new Map(); // roomId -> timeout
  private timerStates: Map<string, TimerState> = new Map(); // roomId -> state
  private eventCallbacks: ((event: TimerEvent) => void)[] = [];

  private defaultOptions: Required<TurnTimerOptions> = {
    timeoutMs: 60 * 1000, // 60 seconds
    antiAbuseEnabled: false,
    maxConsecutiveSkips: 3
  };

  constructor(private options: TurnTimerOptions = {}) {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  /**
   * Start a timer for a player's turn
   */
  startTimer(room: Room, playerId: string, options?: TurnTimerOptions): boolean {
    if (room.getStatus() !== 'playing') {
      return false;
    }

    const player = room.getPlayer(playerId);
    if (!player) {
      return false;
    }
    
    // Check if player is eliminated or disconnected
    if (player.isEliminated || !player.connected) {
      return false;
    }

    // Stop any existing timer for this room
    this.stopTimer(room.id);

    const timerOptions = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    // Create timer state
    const timerState: TimerState = {
      roomId: room.id,
      playerId,
      startTime,
      timeoutMs: timerOptions.timeoutMs,
      remainingMs: timerOptions.timeoutMs,
      isActive: true
    };

    this.timerStates.set(room.id, timerState);

    // Set up timeout
    const timeout = setTimeout(() => {
      this.handleTimeout(room, playerId, timerOptions);
    }, timerOptions.timeoutMs);

    this.timers.set(room.id, timeout);

    // Emit started event
    this.emitEvent({
      type: 'started',
      roomId: room.id,
      playerId,
      remainingMs: timerOptions.timeoutMs
    });

    // Set up warning at 10 seconds remaining
    if (timerOptions.timeoutMs > 10000) {
      setTimeout(() => {
        const state = this.timerStates.get(room.id);
        if (state && state.isActive && state.playerId === playerId) {
          this.emitEvent({
            type: 'warning',
            roomId: room.id,
            playerId,
            remainingMs: 10000
          });
        }
      }, timerOptions.timeoutMs - 10000);
    }

    return true;
  }

  /**
   * Stop the timer for a room
   */
  stopTimer(roomId: string): boolean {
    const timeout = this.timers.get(roomId);
    const state = this.timerStates.get(roomId);

    if (timeout) {
      clearTimeout(timeout);
      this.timers.delete(roomId);
    }

    if (state && state.isActive) {
      state.isActive = false;
      this.emitEvent({
        type: 'stopped',
        roomId,
        playerId: state.playerId
      });
      this.timerStates.delete(roomId);
      return true;
    }

    return false;
  }

  /**
   * Get current timer state for a room
   */
  getTimerState(roomId: string): TimerState | null {
    const state = this.timerStates.get(roomId);
    if (!state || !state.isActive) {
      return null;
    }

    // Update remaining time
    const elapsed = Date.now() - state.startTime;
    state.remainingMs = Math.max(0, state.timeoutMs - elapsed);

    return { ...state };
  }

  /**
   * Get remaining time for a room's timer
   */
  getRemainingTime(roomId: string): number {
    const state = this.getTimerState(roomId);
    return state ? state.remainingMs : 0;
  }

  /**
   * Check if a room has an active timer
   */
  hasActiveTimer(roomId: string): boolean {
    const state = this.timerStates.get(roomId);
    return state ? state.isActive : false;
  }

  /**
   * Handle timer timeout
   */
  private handleTimeout(room: Room, playerId: string, options: Required<TurnTimerOptions>): void {
    const state = this.timerStates.get(room.id);
    if (!state || !state.isActive || state.playerId !== playerId) {
      return; // Timer was already stopped or player changed
    }

    const player = room.getPlayer(playerId);
    if (!player) {
      this.stopTimer(room.id);
      return;
    }

    // Emit timeout event
    this.emitEvent({
      type: 'timeout',
      roomId: room.id,
      playerId,
      remainingMs: 0
    });

    // Stop the timer
    this.stopTimer(room.id);

    // Skip the player's turn
    this.skipPlayerTurn(room, player, options);
  }

  /**
   * Skip a player's turn due to timeout
   */
  private skipPlayerTurn(room: Room, player: Player, options: Required<TurnTimerOptions>): void {
    if (room.getStatus() !== 'playing' || !room.game) {
      return;
    }

    // Increment skip counter
    player.incrementSkips();

    // Check for anti-abuse elimination
    if (options.antiAbuseEnabled && player.skipsInARow >= options.maxConsecutiveSkips) {
      player.eliminate();
    }

    // Skip current player's turn using game logic
    room.game.skipCurrentPlayer();
    
    // Start timer for the new current player if game is still playing
    if (room.getStatus() === 'playing') {
      const newCurrentPlayer = room.game.getCurrentPlayer();
      if (newCurrentPlayer) {
        this.startTimer(room, newCurrentPlayer.id, options);
      }
    }
  }

  /**
   * Handle player making a move (resets skip counter)
   */
  onPlayerMove(room: Room, playerId: string): void {
    const player = room.getPlayer(playerId);
    if (player) {
      player.resetSkips();
    }
    
    // Stop current timer
    this.stopTimer(room.id);
  }

  /**
   * Handle game state changes
   */
  onGameStateChange(room: Room): void {
    if (room.getStatus() !== 'playing') {
      // Game ended, stop any active timers
      this.stopTimer(room.id);
    } else if (room.game) {
      // Game is active, ensure timer is running for current player
      const currentPlayer = room.game.getCurrentPlayer();
      if (currentPlayer && !this.hasActiveTimer(room.id)) {
        this.startTimer(room, currentPlayer.id);
      }
    }
  }

  /**
   * Handle player disconnection
   */
  onPlayerDisconnected(room: Room, playerId: string): void {
    const state = this.timerStates.get(room.id);
    if (state && state.playerId === playerId) {
      // Current player disconnected, their timer continues to run
      // This allows for reconnection before timeout
    }
  }

  /**
   * Handle player reconnection
   */
  onPlayerReconnected(room: Room, playerId: string): void {
    const state = this.timerStates.get(room.id);
    if (state && state.playerId === playerId && state.isActive) {
      // Player reconnected, timer continues from where it left off
      // No action needed as timer is still running
    }
  }

  /**
   * Subscribe to timer events
   */
  onTimerEvent(callback: (event: TimerEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Unsubscribe from timer events
   */
  offTimerEvent(callback: (event: TimerEvent) => void): void {
    const index = this.eventCallbacks.indexOf(callback);
    if (index > -1) {
      this.eventCallbacks.splice(index, 1);
    }
  }

  /**
   * Emit a timer event
   */
  private emitEvent(event: TimerEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in timer event callback:', error);
      }
    });
  }

  /**
   * Get all active timers
   */
  getActiveTimers(): TimerState[] {
    const activeTimers: TimerState[] = [];
    
    for (const [roomId, state] of this.timerStates) {
      if (state.isActive) {
        // Update remaining time
        const elapsed = Date.now() - state.startTime;
        state.remainingMs = Math.max(0, state.timeoutMs - elapsed);
        activeTimers.push({ ...state });
      }
    }
    
    return activeTimers;
  }

  /**
   * Get timer statistics
   */
  getStats(): {
    activeTimers: number;
    totalTimeouts: number;
    averageResponseTime: number;
  } {
    // This would be enhanced with persistent statistics in a real implementation
    return {
      activeTimers: this.timerStates.size,
      totalTimeouts: 0, // Would track this over time
      averageResponseTime: 0 // Would calculate from historical data
    };
  }

  /**
   * Clear all timers (for testing/cleanup)
   */
  clearAll(): void {
    // Clear all timeouts
    for (const timeout of this.timers.values()) {
      clearTimeout(timeout);
    }
    
    this.timers.clear();
    this.timerStates.clear();
  }

  /**
   * Update default options
   */
  updateOptions(options: TurnTimerOptions): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  /**
   * Get current options
   */
  getOptions(): Required<TurnTimerOptions> {
    return { ...this.defaultOptions };
  }
}
