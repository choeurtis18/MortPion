import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReplayManager, ReplayVoteEvent } from '../ReplayManager.js';
import { Room } from '../../models/Room.js';
import { Player } from '../../models/Player.js';
import { Game } from '../../models/Game.js';

describe('ReplayManager', () => {
  let replayManager: ReplayManager;
  let room: Room;
  let player1: Player;
  let player2: Player;
  let player3: Player;
  let voteEvents: ReplayVoteEvent[];

  beforeEach(() => {
    replayManager = new ReplayManager({ voteTimeoutMs: 1000 }); // 1 second for tests
    voteEvents = [];
    
    replayManager.onReplayVoteEvent((event) => voteEvents.push(event));

    // Create test room with finished game
    room = new Room({
      name: 'Test Room',
      capacity: 3,
      isPrivate: false,
      hostId: 'player1'
    });

    // Create test players
    player1 = new Player({
      id: 'player1',
      nickname: 'Player 1',
      color: 'red',
      connected: true,
      isHost: true
    });

    player2 = new Player({
      id: 'player2',
      nickname: 'Player 2',
      color: 'blue',
      connected: true
    });

    player3 = new Player({
      id: 'player3',
      nickname: 'Player 3',
      color: 'green',
      connected: true
    });

    // Add players to room
    room.addPlayer(player1);
    room.addPlayer(player2);
    room.addPlayer(player3);

    // Start and finish game
    room.startGame();
    room.game!.status = 'finished'; // Simulate finished game
  });

  afterEach(() => {
    replayManager.clearAll();
  });

  describe('Vote Management', () => {
    it('should start replay vote for finished game', () => {
      const success = replayManager.startReplayVote(room);
      expect(success).toBe(true);

      const status = replayManager.getVoteStatus(room.id);
      expect(status).toBeTruthy();
      expect(status!.isActive).toBe(true);
      expect(status!.votes).toHaveLength(3);
      expect(status!.remainingMs).toBeGreaterThan(0);

      expect(voteEvents).toHaveLength(1);
      expect(voteEvents[0].type).toBe('vote_started');
      expect(voteEvents[0].roomId).toBe(room.id);
    });

    it('should not start vote for non-finished game', () => {
      room.game!.status = 'playing';
      
      const success = replayManager.startReplayVote(room);
      expect(success).toBe(false);
      
      const status = replayManager.getVoteStatus(room.id);
      expect(status).toBeNull();
    });

    it('should not start vote with no connected players', () => {
      // Disconnect all players
      room.players.forEach((p: Player) => p.setConnected(false));
      
      const success = replayManager.startReplayVote(room);
      expect(success).toBe(false);
    });

    it('should stop existing vote when starting new one', () => {
      replayManager.startReplayVote(room);
      expect(replayManager.getVoteStatus(room.id)!.isActive).toBe(true);

      replayManager.startReplayVote(room);
      expect(replayManager.getVoteStatus(room.id)!.isActive).toBe(true);
      
      // Should have 2 vote_started events
      expect(voteEvents.filter(e => e.type === 'vote_started')).toHaveLength(2);
    });

    it('should stop replay vote manually', () => {
      replayManager.startReplayVote(room);
      expect(replayManager.getVoteStatus(room.id)!.isActive).toBe(true);

      const stopped = replayManager.stopReplayVote(room.id);
      expect(stopped).toBe(true);
      expect(replayManager.getVoteStatus(room.id)).toBeNull();
    });
  });

  describe('Vote Casting', () => {
    beforeEach(() => {
      replayManager.startReplayVote(room);
      voteEvents.length = 0; // Clear start event
    });

    it('should cast vote successfully', () => {
      const success = replayManager.castVote(room.id, 'player1', true);
      expect(success).toBe(true);

      expect(voteEvents).toHaveLength(1);
      expect(voteEvents[0].type).toBe('vote_cast');
      expect(voteEvents[0].playerId).toBe('player1');
      expect(voteEvents[0].vote).toBe(true);

      const status = replayManager.getVoteStatus(room.id);
      expect(status!.votes.find(v => v.playerId === 'player1')!.vote).toBe(true);
    });

    it('should not cast vote for non-existent room', () => {
      const success = replayManager.castVote('nonexistent', 'player1', true);
      expect(success).toBe(false);
    });

    it('should not cast vote for non-participating player', () => {
      const success = replayManager.castVote(room.id, 'nonexistent', true);
      expect(success).toBe(false);
    });

    it('should allow vote change', () => {
      replayManager.castVote(room.id, 'player1', false);
      replayManager.castVote(room.id, 'player1', true);

      const status = replayManager.getVoteStatus(room.id);
      expect(status!.votes.find(v => v.playerId === 'player1')!.vote).toBe(true);
      expect(voteEvents.filter(e => e.type === 'vote_cast')).toHaveLength(2);
    });
  });

  describe('Vote Completion', () => {
    beforeEach(() => {
      replayManager.startReplayVote(room);
      voteEvents.length = 0; // Clear start event
    });

    it('should approve replay with unanimous yes votes', () => {
      replayManager.castVote(room.id, 'player1', true);
      replayManager.castVote(room.id, 'player2', true);
      replayManager.castVote(room.id, 'player3', true);

      expect(voteEvents).toHaveLength(4); // 3 cast + 1 completed
      const completedEvent = voteEvents.find(e => e.type === 'vote_completed');
      expect(completedEvent).toBeTruthy();
      expect(completedEvent!.result).toBe('approved');

      expect(replayManager.getVoteStatus(room.id)).toBeNull();
    });

    it('should reject replay with any no vote', () => {
      replayManager.castVote(room.id, 'player1', true);
      replayManager.castVote(room.id, 'player2', false);
      replayManager.castVote(room.id, 'player3', true);

      const completedEvent = voteEvents.find(e => e.type === 'vote_completed');
      expect(completedEvent!.result).toBe('rejected');
    });

    it('should reject replay with mixed votes', () => {
      replayManager.castVote(room.id, 'player1', false);
      replayManager.castVote(room.id, 'player2', false);
      replayManager.castVote(room.id, 'player3', false);

      const completedEvent = voteEvents.find(e => e.type === 'vote_completed');
      expect(completedEvent!.result).toBe('rejected');
    });
  });

  describe('Vote Timeout', () => {
    it('should expire vote after timeout', async () => {
      replayManager.startReplayVote(room);
      
      // Cast partial votes
      replayManager.castVote(room.id, 'player1', true);
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      const expiredEvent = voteEvents.find(e => e.type === 'vote_expired');
      expect(expiredEvent).toBeTruthy();
      expect(expiredEvent!.result).toBe('expired');

      expect(replayManager.getVoteStatus(room.id)).toBeNull();
    });

    it('should not expire if vote completed before timeout', async () => {
      replayManager.startReplayVote(room);
      
      // Complete vote quickly
      replayManager.castVote(room.id, 'player1', true);
      replayManager.castVote(room.id, 'player2', true);
      replayManager.castVote(room.id, 'player3', true);

      // Wait past timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      const expiredEvents = voteEvents.filter(e => e.type === 'vote_expired');
      expect(expiredEvents).toHaveLength(0);
    });
  });

  describe('Connected Players Only', () => {
    it('should only include connected players in vote', () => {
      // Disconnect player3
      room.getPlayer('player3')!.setConnected(false);
      
      replayManager.startReplayVote(room);
      
      const status = replayManager.getVoteStatus(room.id);
      expect(status!.votes).toHaveLength(2);
      expect(status!.votes.map(v => v.playerId)).toEqual(['player1', 'player2']);
    });

    it('should approve with unanimous votes from connected players only', () => {
      // Disconnect player3
      room.getPlayer('player3')!.setConnected(false);
      
      replayManager.startReplayVote(room);
      voteEvents.length = 0;
      
      replayManager.castVote(room.id, 'player1', true);
      replayManager.castVote(room.id, 'player2', true);

      const completedEvent = voteEvents.find(e => e.type === 'vote_completed');
      expect(completedEvent!.result).toBe('approved');
    });
  });

  describe('Vote Status', () => {
    it('should return null for non-existent vote', () => {
      const status = replayManager.getVoteStatus('nonexistent');
      expect(status).toBeNull();
    });

    it('should return correct vote status', () => {
      replayManager.startReplayVote(room);
      replayManager.castVote(room.id, 'player1', true);
      replayManager.castVote(room.id, 'player2', false);

      const status = replayManager.getVoteStatus(room.id);
      expect(status!.isActive).toBe(true);
      expect(status!.votes).toHaveLength(3);
      expect(status!.votes.find(v => v.playerId === 'player1')!.vote).toBe(true);
      expect(status!.votes.find(v => v.playerId === 'player2')!.vote).toBe(false);
      expect(status!.votes.find(v => v.playerId === 'player3')!.vote).toBeNull();
      expect(status!.remainingMs).toBeGreaterThan(0);
    });

    it('should calculate remaining time correctly', async () => {
      replayManager.startReplayVote(room);
      
      const status1 = replayManager.getVoteStatus(room.id);
      expect(status1!.remainingMs).toBeGreaterThan(500);
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const status2 = replayManager.getVoteStatus(room.id);
      expect(status2!.remainingMs).toBeLessThan(500);
    });
  });

  describe('Event Subscription', () => {
    it('should subscribe and unsubscribe to events', () => {
      const events: ReplayVoteEvent[] = [];
      const callback = (event: ReplayVoteEvent) => events.push(event);
      
      replayManager.onReplayVoteEvent(callback);
      replayManager.startReplayVote(room);
      expect(events).toHaveLength(1);
      
      replayManager.offReplayVoteEvent(callback);
      replayManager.stopReplayVote(room.id);
      replayManager.startReplayVote(room);
      expect(events).toHaveLength(1); // No new events after unsubscribe
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = () => { throw new Error('Test error'); };
      const normalCallback = vi.fn();
      
      replayManager.onReplayVoteEvent(errorCallback);
      replayManager.onReplayVoteEvent(normalCallback);
      
      // Should not throw
      expect(() => replayManager.startReplayVote(room)).not.toThrow();
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('Statistics and Management', () => {
    it('should get statistics', () => {
      const stats = replayManager.getStatistics();
      expect(stats.activeVotes).toBe(0);
      
      replayManager.startReplayVote(room);
      const statsAfter = replayManager.getStatistics();
      expect(statsAfter.activeVotes).toBe(1);
    });

    it('should clear all votes', () => {
      replayManager.startReplayVote(room);
      expect(replayManager.getStatistics().activeVotes).toBe(1);
      
      replayManager.clearAll();
      expect(replayManager.getStatistics().activeVotes).toBe(0);
      expect(replayManager.getVoteStatus(room.id)).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle vote on inactive vote', () => {
      replayManager.startReplayVote(room);
      replayManager.stopReplayVote(room.id);
      
      const success = replayManager.castVote(room.id, 'player1', true);
      expect(success).toBe(false);
    });

    it('should handle timeout after vote stopped', async () => {
      replayManager.startReplayVote(room);
      replayManager.stopReplayVote(room.id);
      
      // Wait past timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should not have expired event since vote was stopped
      const expiredEvents = voteEvents.filter(e => e.type === 'vote_expired');
      expect(expiredEvents).toHaveLength(0);
    });

    it('should handle multiple rapid start/stop operations', () => {
      for (let i = 0; i < 5; i++) {
        replayManager.startReplayVote(room);
        replayManager.stopReplayVote(room.id);
      }
      
      expect(replayManager.getStatistics().activeVotes).toBe(0);
    });
  });
});
