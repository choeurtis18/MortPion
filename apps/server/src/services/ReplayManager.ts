import { Room } from '../models/Room.js';
import { Player } from '../models/Player.js';

export interface ReplayVoteOptions {
  voteTimeoutMs?: number; // Default 30 seconds
}

export interface ReplayVoteEvent {
  type: 'vote_started' | 'vote_cast' | 'vote_completed' | 'vote_expired';
  roomId: string;
  playerId?: string;
  vote?: boolean;
  result?: 'approved' | 'rejected' | 'expired';
  remainingMs?: number;
}

interface ReplayVoteState {
  roomId: string;
  votes: Map<string, boolean>; // playerId -> vote (true = yes, false = no)
  requiredVoters: string[]; // playerIds who need to vote
  startTime: number;
  timeoutMs: number;
  isActive: boolean;
}

export class ReplayManager {
  private voteStates = new Map<string, ReplayVoteState>();
  private voteTimeouts = new Map<string, NodeJS.Timeout>();
  private eventCallbacks: ((event: ReplayVoteEvent) => void)[] = [];
  private defaultOptions: Required<ReplayVoteOptions>;

  constructor(options: ReplayVoteOptions = {}) {
    this.defaultOptions = {
      voteTimeoutMs: options.voteTimeoutMs ?? 30000, // 30 seconds
    };
  }

  /**
   * Start a replay vote for a room
   */
  startReplayVote(room: Room, options?: ReplayVoteOptions): boolean {
    if (room.getStatus() !== 'finished') {
      return false; // Can only vote after game is finished
    }

    // Stop any existing vote
    this.stopReplayVote(room.id);

    const voteOptions = { ...this.defaultOptions, ...options };
    
    // Get all connected players (present players)
    const presentPlayers = room.players.filter(p => p.connected);
    if (presentPlayers.length === 0) {
      return false; // No players to vote
    }

    const requiredVoters = presentPlayers.map(p => p.id);
    
    // Create vote state
    const voteState: ReplayVoteState = {
      roomId: room.id,
      votes: new Map(),
      requiredVoters,
      startTime: Date.now(),
      timeoutMs: voteOptions.voteTimeoutMs,
      isActive: true,
    };

    this.voteStates.set(room.id, voteState);

    // Set up timeout
    const timeout = setTimeout(() => {
      this.handleVoteTimeout(room.id);
    }, voteOptions.voteTimeoutMs);

    this.voteTimeouts.set(room.id, timeout);

    // Emit vote started event
    this.emitEvent({
      type: 'vote_started',
      roomId: room.id,
      remainingMs: voteOptions.voteTimeoutMs,
    });

    return true;
  }

  /**
   * Cast a vote for replay
   */
  castVote(roomId: string, playerId: string, vote: boolean): boolean {
    const voteState = this.voteStates.get(roomId);
    if (!voteState || !voteState.isActive) {
      return false;
    }

    // Check if player is allowed to vote
    if (!voteState.requiredVoters.includes(playerId)) {
      return false;
    }

    // Cast the vote
    voteState.votes.set(playerId, vote);

    // Emit vote cast event
    this.emitEvent({
      type: 'vote_cast',
      roomId,
      playerId,
      vote,
    });

    // Check if all votes are in
    if (voteState.votes.size === voteState.requiredVoters.length) {
      this.completeVote(roomId);
    }

    return true;
  }

  /**
   * Get current vote status for a room
   */
  getVoteStatus(roomId: string): {
    isActive: boolean;
    votes: { playerId: string; vote: boolean | null }[];
    remainingMs: number;
  } | null {
    const voteState = this.voteStates.get(roomId);
    if (!voteState) {
      return null;
    }

    const now = Date.now();
    const elapsed = now - voteState.startTime;
    const remainingMs = Math.max(0, voteState.timeoutMs - elapsed);

    const votes = voteState.requiredVoters.map(playerId => ({
      playerId,
      vote: voteState.votes.get(playerId) ?? null,
    }));

    return {
      isActive: voteState.isActive,
      votes,
      remainingMs,
    };
  }

  /**
   * Stop replay vote for a room
   */
  stopReplayVote(roomId: string): boolean {
    const timeout = this.voteTimeouts.get(roomId);
    const voteState = this.voteStates.get(roomId);

    if (timeout) {
      clearTimeout(timeout);
      this.voteTimeouts.delete(roomId);
    }

    if (voteState && voteState.isActive) {
      voteState.isActive = false;
      this.voteStates.delete(roomId);
      return true;
    }

    return false;
  }

  /**
   * Handle vote timeout
   */
  private handleVoteTimeout(roomId: string): void {
    const voteState = this.voteStates.get(roomId);
    if (!voteState || !voteState.isActive) {
      return;
    }

    voteState.isActive = false;
    this.voteTimeouts.delete(roomId);

    // Emit vote expired event
    this.emitEvent({
      type: 'vote_expired',
      roomId,
      result: 'expired',
    });

    this.voteStates.delete(roomId);
  }

  /**
   * Complete the vote and determine result
   */
  private completeVote(roomId: string): void {
    const voteState = this.voteStates.get(roomId);
    if (!voteState || !voteState.isActive) {
      return;
    }

    // Stop timeout
    const timeout = this.voteTimeouts.get(roomId);
    if (timeout) {
      clearTimeout(timeout);
      this.voteTimeouts.delete(roomId);
    }

    voteState.isActive = false;

    // Check if all votes are "yes" (unanimous approval)
    const allVotes = Array.from(voteState.votes.values());
    const isUnanimous = allVotes.length === voteState.requiredVoters.length && 
                       allVotes.every(vote => vote === true);

    const result = isUnanimous ? 'approved' : 'rejected';

    // Emit vote completed event
    this.emitEvent({
      type: 'vote_completed',
      roomId,
      result,
    });

    this.voteStates.delete(roomId);
  }

  /**
   * Subscribe to replay vote events
   */
  onReplayVoteEvent(callback: (event: ReplayVoteEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Unsubscribe from replay vote events
   */
  offReplayVoteEvent(callback: (event: ReplayVoteEvent) => void): void {
    const index = this.eventCallbacks.indexOf(callback);
    if (index > -1) {
      this.eventCallbacks.splice(index, 1);
    }
  }

  /**
   * Emit a replay vote event
   */
  private emitEvent(event: ReplayVoteEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in replay vote event callback:', error);
      }
    });
  }

  /**
   * Get statistics about active votes
   */
  getStatistics(): {
    activeVotes: number;
    totalVotesStarted: number;
  } {
    return {
      activeVotes: this.voteStates.size,
      totalVotesStarted: 0, // Could be tracked if needed
    };
  }

  /**
   * Clear all active votes (for cleanup)
   */
  clearAll(): void {
    // Clear all timeouts
    this.voteTimeouts.forEach(timeout => clearTimeout(timeout));
    this.voteTimeouts.clear();

    // Clear all states
    this.voteStates.clear();
  }
}
