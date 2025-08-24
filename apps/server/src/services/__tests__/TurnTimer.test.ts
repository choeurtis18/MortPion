import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TurnTimer, TurnTimerOptions, TimerEvent } from '../TurnTimer.js';
import { Room } from '../../models/Room.js';
import { Player } from '../../models/Player.js';
import { Game } from '../../models/Game.js';

describe('TurnTimer', () => {
  let turnTimer: TurnTimer;
  let room: Room;
  let players: Player[];
  let timerEvents: TimerEvent[];

  beforeEach(() => {
    // Create turn timer with short timeout for testing
    turnTimer = new TurnTimer({ timeoutMs: 1000 }); // 1 second for testing
    
    // Create test players
    players = [
      new Player({ id: 'player1', nickname: 'Alice', color: 'red' }),
      new Player({ id: 'player2', nickname: 'Bob', color: 'blue' }),
      new Player({ id: 'player3', nickname: 'Charlie', color: 'green' }),
      new Player({ id: 'player4', nickname: 'David', color: 'yellow' })
    ];

    // Create test room with game
    room = new Room({
      name: 'Test Room',
      hostId: players[0].id,
      capacity: 4,
      isPrivate: false
    });

    // Add players to room
    players.forEach(player => room.addPlayer(player));

    // Start game
    room.startGame();

    // Set up event listener
    timerEvents = [];
    turnTimer.onTimerEvent((event) => {
      timerEvents.push(event);
    });
  });

  afterEach(() => {
    turnTimer.clearAll();
  });

  describe('Timer Management', () => {
    it('should start timer for current player', () => {
      const currentPlayer = room.game!.getCurrentPlayer()!;
      const success = turnTimer.startTimer(room, currentPlayer.id);

      expect(success).toBe(true);
      expect(turnTimer.hasActiveTimer(room.id)).toBe(true);
      
      const state = turnTimer.getTimerState(room.id);
      expect(state).toBeDefined();
      expect(state!.playerId).toBe(currentPlayer.id);
      expect(state!.roomId).toBe(room.id);
      expect(state!.isActive).toBe(true);
      expect(state!.remainingMs).toBeGreaterThan(0);
    });

    it('should not start timer for non-playing room', () => {
      // Create room without starting game
      const waitingRoom = new Room({
        name: 'Waiting Room',
        hostId: players[0].id,
        capacity: 4,
        isPrivate: false
      });

      const success = turnTimer.startTimer(waitingRoom, players[0].id);
      expect(success).toBe(false);
      expect(turnTimer.hasActiveTimer(waitingRoom.id)).toBe(false);
    });

    it('should not start timer for eliminated player', () => {
      const currentPlayer = room.game!.getCurrentPlayer()!;
      // Get the actual player instance stored in the room
      const roomPlayer = room.getPlayer(currentPlayer.id)!;
      roomPlayer.eliminate();

      const success = turnTimer.startTimer(room, currentPlayer.id);
      expect(success).toBe(false);
      expect(turnTimer.hasActiveTimer(room.id)).toBe(false);
    });

    it('should not start timer for disconnected player', () => {
      const currentPlayer = room.game!.getCurrentPlayer()!;
      // Get the actual player instance stored in the room
      const roomPlayer = room.getPlayer(currentPlayer.id)!;
      roomPlayer.setConnected(false);

      const success = turnTimer.startTimer(room, currentPlayer.id);
      expect(success).toBe(false);
      expect(turnTimer.hasActiveTimer(room.id)).toBe(false);
    });

    it('should stop existing timer when starting new one', () => {
      const currentPlayer = room.game!.getCurrentPlayer()!;
      
      // Start first timer
      turnTimer.startTimer(room, currentPlayer.id);
      expect(turnTimer.hasActiveTimer(room.id)).toBe(true);

      // Start second timer (should stop first)
      turnTimer.startTimer(room, currentPlayer.id);
      expect(turnTimer.hasActiveTimer(room.id)).toBe(true);
      
      // Should have received stopped and started events
      expect(timerEvents.filter(e => e.type === 'stopped')).toHaveLength(1);
      expect(timerEvents.filter(e => e.type === 'started')).toHaveLength(2);
    });

    it('should stop timer manually', () => {
      const currentPlayer = room.game!.getCurrentPlayer()!;
      turnTimer.startTimer(room, currentPlayer.id);

      const stopped = turnTimer.stopTimer(room.id);
      expect(stopped).toBe(true);
      expect(turnTimer.hasActiveTimer(room.id)).toBe(false);
      
      const stoppedEvents = timerEvents.filter(e => e.type === 'stopped');
      expect(stoppedEvents).toHaveLength(1);
    });

    it('should get remaining time', () => {
      const currentPlayer = room.game!.getCurrentPlayer()!;
      turnTimer.startTimer(room, currentPlayer.id);

      const remaining = turnTimer.getRemainingTime(room.id);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(1000);
    });
  });

  describe('Timer Events', () => {
    it('should emit started event when timer starts', () => {
      const currentPlayer = room.game!.getCurrentPlayer()!;
      turnTimer.startTimer(room, currentPlayer.id);

      const startedEvents = timerEvents.filter(e => e.type === 'started');
      expect(startedEvents).toHaveLength(1);
      expect(startedEvents[0].playerId).toBe(currentPlayer.id);
      expect(startedEvents[0].roomId).toBe(room.id);
      expect(startedEvents[0].remainingMs).toBe(1000);
    });

    it('should emit timeout event when timer expires', async () => {
      const currentPlayer = room.game!.getCurrentPlayer()!;
      const initialSkips = currentPlayer.skipsInARow;
      
      turnTimer.startTimer(room, currentPlayer.id);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      const timeoutEvents = timerEvents.filter(e => e.type === 'timeout');
      expect(timeoutEvents).toHaveLength(1);
      expect(timeoutEvents[0].playerId).toBe(currentPlayer.id);
      expect(timeoutEvents[0].remainingMs).toBe(0);

      // Player should have been skipped
      expect(currentPlayer.skipsInARow).toBe(initialSkips + 1);
    });

    it('should emit warning event before timeout', async () => {
      // Use longer timeout to test warning
      const longTimer = new TurnTimer({ timeoutMs: 15000 }); // 15 seconds
      const events: TimerEvent[] = [];
      longTimer.onTimerEvent((event) => events.push(event));

      const currentPlayer = room.game!.getCurrentPlayer()!;
      longTimer.startTimer(room, currentPlayer.id);

      // Wait for warning (should come at 5 seconds)
      await new Promise(resolve => setTimeout(resolve, 5100));

      const warningEvents = events.filter(e => e.type === 'warning');
      expect(warningEvents).toHaveLength(1);
      expect(warningEvents[0].remainingMs).toBe(10000);

      longTimer.clearAll();
    }, 10000); // Increase test timeout to 10 seconds
  });

  describe('Game Integration', () => {
    it('should handle player move and reset skip counter', () => {
      const currentPlayer = room.game!.getCurrentPlayer()!;
      // Get the actual player instance stored in the room
      const roomPlayer = room.getPlayer(currentPlayer.id)!;
      
      // Give player some skips
      roomPlayer.incrementSkips();
      roomPlayer.incrementSkips();
      expect(roomPlayer.skipsInARow).toBe(2);

      turnTimer.startTimer(room, currentPlayer.id);
      turnTimer.onPlayerMove(room, currentPlayer.id);

      // Skip counter should be reset
      expect(roomPlayer.skipsInARow).toBe(0);
      expect(turnTimer.hasActiveTimer(room.id)).toBe(false);
    });

    it('should handle game state changes', () => {
      const currentPlayer = room.game!.getCurrentPlayer()!;
      turnTimer.startTimer(room, currentPlayer.id);

      // Simulate game ending by changing status
      room.game!.status = 'finished';
      turnTimer.onGameStateChange(room);

      // Timer should be stopped
      expect(turnTimer.hasActiveTimer(room.id)).toBe(false);
    });

    it('should move to next player after timeout', async () => {
      const currentPlayer = room.game!.getCurrentPlayer()!;
      const initialCurrentPlayerId = currentPlayer.id;
      
      turnTimer.startTimer(room, currentPlayer.id);

      // Wait for timeout and next player timer to start
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Should have moved to next player
      const newCurrentPlayer = room.game!.getCurrentPlayer();
      expect(newCurrentPlayer?.id).not.toBe(initialCurrentPlayerId);
      
      // New timer should be active for new player
      expect(turnTimer.hasActiveTimer(room.id)).toBe(true);
      const state = turnTimer.getTimerState(room.id);
      expect(state?.playerId).toBe(newCurrentPlayer?.id);
    });
  });

  describe('Anti-Abuse System', () => {
    it('should eliminate player after max consecutive skips', async () => {
      const antiAbuseTimer = new TurnTimer({ 
        timeoutMs: 500, 
        antiAbuseEnabled: true, 
        maxConsecutiveSkips: 2 
      });

      const currentPlayer = room.game!.getCurrentPlayer()!;
      // Get the actual player instance stored in the room
      const roomPlayer = room.getPlayer(currentPlayer.id)!;
      
      // Give player one skip already
      roomPlayer.incrementSkips();
      expect(roomPlayer.skipsInARow).toBe(1);
      expect(roomPlayer.isEliminated).toBe(false);

      // Start timer and let it timeout twice
      antiAbuseTimer.startTimer(room, currentPlayer.id);
      await new Promise(resolve => setTimeout(resolve, 600));

      // Player should be eliminated after second timeout
      expect(roomPlayer.skipsInARow).toBe(2);
      expect(roomPlayer.isEliminated).toBe(true);

      antiAbuseTimer.clearAll();
    });

    it('should not eliminate player when anti-abuse is disabled', async () => {
      const normalTimer = new TurnTimer({ 
        timeoutMs: 500, 
        antiAbuseEnabled: false 
      });

      const currentPlayer = room.game!.getCurrentPlayer()!;
      
      // Give player many skips
      for (let i = 0; i < 5; i++) {
        currentPlayer.incrementSkips();
      }
      expect(currentPlayer.skipsInARow).toBe(5);

      normalTimer.startTimer(room, currentPlayer.id);
      await new Promise(resolve => setTimeout(resolve, 600));

      // Player should not be eliminated
      expect(currentPlayer.isEliminated).toBe(false);
      expect(currentPlayer.skipsInARow).toBe(6); // One more skip from timeout

      normalTimer.clearAll();
    });
  });

  describe('Connection Handling', () => {
    it('should continue timer when player disconnects', () => {
      const currentPlayer = room.game!.getCurrentPlayer()!;
      turnTimer.startTimer(room, currentPlayer.id);

      // Player disconnects
      currentPlayer.setConnected(false);
      turnTimer.onPlayerDisconnected(room, currentPlayer.id);

      // Timer should still be active
      expect(turnTimer.hasActiveTimer(room.id)).toBe(true);
      const state = turnTimer.getTimerState(room.id);
      expect(state?.playerId).toBe(currentPlayer.id);
    });

    it('should handle player reconnection', () => {
      const currentPlayer = room.game!.getCurrentPlayer()!;
      turnTimer.startTimer(room, currentPlayer.id);

      // Player disconnects then reconnects
      currentPlayer.setConnected(false);
      turnTimer.onPlayerDisconnected(room, currentPlayer.id);
      
      currentPlayer.setConnected(true);
      turnTimer.onPlayerReconnected(room, currentPlayer.id);

      // Timer should still be active for same player
      expect(turnTimer.hasActiveTimer(room.id)).toBe(true);
      const state = turnTimer.getTimerState(room.id);
      expect(state?.playerId).toBe(currentPlayer.id);
    });
  });

  describe('Statistics and Management', () => {
    it('should get active timers', () => {
      const currentPlayer = room.game!.getCurrentPlayer()!;
      turnTimer.startTimer(room, currentPlayer.id);

      const activeTimers = turnTimer.getActiveTimers();
      expect(activeTimers).toHaveLength(1);
      expect(activeTimers[0].roomId).toBe(room.id);
      expect(activeTimers[0].playerId).toBe(currentPlayer.id);
      expect(activeTimers[0].isActive).toBe(true);
    });

    it('should get timer statistics', () => {
      const stats = turnTimer.getStats();
      expect(stats).toHaveProperty('activeTimers');
      expect(stats).toHaveProperty('totalTimeouts');
      expect(stats).toHaveProperty('averageResponseTime');
      expect(typeof stats.activeTimers).toBe('number');
    });

    it('should update and get options', () => {
      const newOptions: TurnTimerOptions = {
        timeoutMs: 30000,
        antiAbuseEnabled: true,
        maxConsecutiveSkips: 5
      };

      turnTimer.updateOptions(newOptions);
      const currentOptions = turnTimer.getOptions();

      expect(currentOptions.timeoutMs).toBe(30000);
      expect(currentOptions.antiAbuseEnabled).toBe(true);
      expect(currentOptions.maxConsecutiveSkips).toBe(5);
    });

    it('should clear all timers', () => {
      const currentPlayer = room.game!.getCurrentPlayer()!;
      turnTimer.startTimer(room, currentPlayer.id);

      expect(turnTimer.hasActiveTimer(room.id)).toBe(true);

      turnTimer.clearAll();

      expect(turnTimer.hasActiveTimer(room.id)).toBe(false);
      expect(turnTimer.getActiveTimers()).toHaveLength(0);
    });
  });

  describe('Event Subscription', () => {
    it('should subscribe and unsubscribe to events', () => {
      const events1: TimerEvent[] = [];
      const events2: TimerEvent[] = [];

      const callback1 = (event: TimerEvent) => events1.push(event);
      const callback2 = (event: TimerEvent) => events2.push(event);

      // Subscribe both callbacks
      turnTimer.onTimerEvent(callback1);
      turnTimer.onTimerEvent(callback2);

      const currentPlayer = room.game!.getCurrentPlayer()!;
      turnTimer.startTimer(room, currentPlayer.id);

      // Both should receive events
      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);

      // Unsubscribe first callback
      turnTimer.offTimerEvent(callback1);
      turnTimer.stopTimer(room.id);

      // Only second callback should receive new events
      expect(events1).toHaveLength(1); // No new events
      expect(events2).toHaveLength(2); // New stopped event
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = () => {
        throw new Error('Test error');
      };
      const normalCallback = vi.fn();

      turnTimer.onTimerEvent(errorCallback);
      turnTimer.onTimerEvent(normalCallback);

      const currentPlayer = room.game!.getCurrentPlayer()!;
      
      // Should not throw despite error in callback
      expect(() => {
        turnTimer.startTimer(room, currentPlayer.id);
      }).not.toThrow();

      // Normal callback should still be called
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle timer for non-existent player', () => {
      const success = turnTimer.startTimer(room, 'non-existent-player');
      expect(success).toBe(false);
      expect(turnTimer.hasActiveTimer(room.id)).toBe(false);
    });

    it('should handle stopping non-existent timer', () => {
      const stopped = turnTimer.stopTimer('non-existent-room');
      expect(stopped).toBe(false);
    });

    it('should handle getting state for non-existent timer', () => {
      const state = turnTimer.getTimerState('non-existent-room');
      expect(state).toBeNull();
    });

    it('should handle timeout after timer was stopped', async () => {
      const currentPlayer = room.game!.getCurrentPlayer()!;
      turnTimer.startTimer(room, currentPlayer.id);
      
      // Stop timer immediately
      turnTimer.stopTimer(room.id);

      // Wait for what would have been timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should not have timeout events after stopping
      const timeoutEvents = timerEvents.filter(e => e.type === 'timeout');
      expect(timeoutEvents).toHaveLength(0);
    });

    it('should handle multiple rapid start/stop operations', () => {
      const currentPlayer = room.game!.getCurrentPlayer()!;

      // Rapidly start and stop timer multiple times
      for (let i = 0; i < 10; i++) {
        turnTimer.startTimer(room, currentPlayer.id);
        turnTimer.stopTimer(room.id);
      }

      // Should end up with no active timer
      expect(turnTimer.hasActiveTimer(room.id)).toBe(false);
      
      // Should have equal number of started and stopped events
      const startedEvents = timerEvents.filter(e => e.type === 'started');
      const stoppedEvents = timerEvents.filter(e => e.type === 'stopped');
      expect(startedEvents).toHaveLength(10);
      expect(stoppedEvents).toHaveLength(10);
    });
  });
});
