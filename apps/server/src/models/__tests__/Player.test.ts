import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../Player.js';

describe('Player', () => {
  describe('constructor', () => {
    it('should create a player with valid options', () => {
      const player = new Player({
        nickname: 'TestPlayer',
        color: 'red',
      });

      expect(player.id).toBeDefined();
      expect(player.nickname).toBe('TestPlayer');
      expect(player.color).toBe('red');
      expect(player.inventory).toEqual({ P: 3, M: 3, G: 3 });
      expect(player.connected).toBe(true);
      expect(player.skipsInARow).toBe(0);
      expect(player.isEliminated).toBe(false);
      expect(player.isHost).toBe(false);
    });

    it('should initialize with correct inventory', () => {
      const player = new Player({
        nickname: 'TestPlayer',
        color: 'red',
      });
      expect(player.inventory).toEqual({ P: 3, M: 3, G: 3 });
    });

    it('should create a player with custom id', () => {
      const customId = 'custom-id-123';
      const player = new Player({
        id: customId,
        nickname: 'TestPlayer',
        color: 'blue',
      });

      expect(player.id).toBe(customId);
    });

    it('should create a player with host status', () => {
      const player = new Player({
        nickname: 'HostPlayer',
        color: 'green',
        isHost: true,
      });

      expect(player.isHost).toBe(true);
    });

    it('should trim nickname whitespace', () => {
      const player = new Player({
        nickname: '  TestPlayer  ',
        color: 'yellow',
      });

      expect(player.nickname).toBe('TestPlayer');
    });

    it('should throw error for empty nickname', () => {
      expect(() => {
        new Player({
          nickname: '',
          color: 'red',
        });
      }).toThrow('Player nickname cannot be empty');
    });

    it('should throw error for whitespace-only nickname', () => {
      expect(() => {
        new Player({
          nickname: '   ',
          color: 'red',
        });
      }).toThrow('Player nickname cannot be empty');
    });

    it('should throw error for nickname too long', () => {
      const longNickname = 'a'.repeat(21);
      expect(() => {
        new Player({
          nickname: longNickname,
          color: 'red',
        });
      }).toThrow('Player nickname cannot exceed 20 characters');
    });
  });

  describe('piece management', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player({
        nickname: 'TestPlayer',
        color: 'red',
      });
    });

    it('should have pieces available initially', () => {
      expect(player.hasPiece('P')).toBe(true);
      expect(player.hasPiece('M')).toBe(true);
      expect(player.hasPiece('G')).toBe(true);
    });

    it('should use pieces correctly', () => {
      player.usePiece('P');
      expect(player.inventory.P).toBe(2);
      expect(player.hasPiece('P')).toBe(true);

      player.usePiece('P');
      player.usePiece('P');
      expect(player.inventory.P).toBe(0);
      expect(player.hasPiece('P')).toBe(false);
    });

    it('should throw error when using unavailable piece', () => {
      player.inventory.P = 0;
      expect(() => {
        player.usePiece('P');
      }).toThrow('Player TestPlayer has no P pieces left');
    });

    it('should check if player has any pieces', () => {
      expect(player.hasAnyPieces()).toBe(true);

      player.inventory = { P: 0, M: 0, G: 0 };
      expect(player.hasAnyPieces()).toBe(false);
    });

    it('should get total pieces count', () => {
      expect(player.getTotalPieces()).toBe(9);

      player.usePiece('P');
      player.usePiece('M');
      expect(player.getTotalPieces()).toBe(7);
    });
  });

  describe('skip management', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player({
        nickname: 'TestPlayer',
        color: 'red',
      });
    });

    it('should start with zero skips', () => {
      expect(player.skipsInARow).toBe(0);
    });

    it('should increment skips', () => {
      player.incrementSkips();
      expect(player.skipsInARow).toBe(1);

      player.incrementSkips();
      expect(player.skipsInARow).toBe(2);
    });

    it('should reset skips', () => {
      player.incrementSkips();
      player.incrementSkips();
      expect(player.skipsInARow).toBe(2);

      player.resetSkips();
      expect(player.skipsInARow).toBe(0);
    });
  });

  describe('status management', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player({
        nickname: 'TestPlayer',
        color: 'red',
      });
    });

    it('should eliminate player', () => {
      expect(player.isEliminated).toBe(false);
      player.eliminate();
      expect(player.isEliminated).toBe(true);
    });

    it('should set connection status', () => {
      expect(player.connected).toBe(true);
      player.setConnected(false);
      expect(player.connected).toBe(false);
    });

    it('should set host status', () => {
      expect(player.isHost).toBe(false);
      player.setHost(true);
      expect(player.isHost).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const player = new Player({
        id: 'test-id',
        nickname: 'TestPlayer',
        color: 'red',
        isHost: true,
      });

      player.usePiece('P');
      player.incrementSkips();

      const json = player.toJSON();

      expect(json).toEqual({
        id: 'test-id',
        nickname: 'TestPlayer',
        color: 'red',
        inventory: { P: 2, M: 3, G: 3 },
        connected: true,
        skipsInARow: 1,
        isEliminated: false,
        isHost: true,
      });
    });
  });
});
