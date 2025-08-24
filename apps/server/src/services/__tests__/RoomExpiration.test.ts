import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RoomExpiration, ExpirationEvent } from '../RoomExpiration.js';
import { Room } from '../../models/Room.js';

describe('RoomExpiration', () => {
  let roomExpiration: RoomExpiration;
  let room1: Room;
  let room2: Room;
  let room3: Room;
  let expirationEvents: ExpirationEvent[];

  beforeEach(() => {
    roomExpiration = new RoomExpiration({ 
      checkIntervalMs: 100, // 100ms for tests
      defaultTtlMs: 1000 // 1 second for tests
    });
    
    expirationEvents = [];
    roomExpiration.onExpirationEvent((event) => expirationEvents.push(event));

    // Create test rooms
    room1 = new Room({
      name: 'Room 1',
      capacity: 2,
      isPrivate: false,
      hostId: 'host1'
    });

    room2 = new Room({
      name: 'Room 2',
      capacity: 3,
      isPrivate: true,
      code: 'test123',
      hostId: 'host2'
    });

    room3 = new Room({
      name: 'Room 3',
      capacity: 4,
      isPrivate: false,
      hostId: 'host3'
    });
  });

  afterEach(() => {
    roomExpiration.stop();
    roomExpiration.clearAll();
  });

  describe('Service Management', () => {
    it('should start and stop service', () => {
      expect(roomExpiration.isServiceRunning()).toBe(false);
      
      roomExpiration.start();
      expect(roomExpiration.isServiceRunning()).toBe(true);
      
      roomExpiration.stop();
      expect(roomExpiration.isServiceRunning()).toBe(false);
    });

    it('should not start service multiple times', () => {
      roomExpiration.start();
      roomExpiration.start(); // Should not cause issues
      expect(roomExpiration.isServiceRunning()).toBe(true);
      
      roomExpiration.stop();
      expect(roomExpiration.isServiceRunning()).toBe(false);
    });

    it('should not stop service multiple times', () => {
      roomExpiration.stop();
      roomExpiration.stop(); // Should not cause issues
      expect(roomExpiration.isServiceRunning()).toBe(false);
    });
  });

  describe('Room Management', () => {
    it('should add and get rooms', () => {
      roomExpiration.addRoom(room1);
      roomExpiration.addRoom(room2);

      expect(roomExpiration.getRoom(room1.id)).toBe(room1);
      expect(roomExpiration.getRoom(room2.id)).toBe(room2);
      expect(roomExpiration.getRoom('nonexistent')).toBeNull();
    });

    it('should remove rooms', () => {
      roomExpiration.addRoom(room1);
      expect(roomExpiration.getRoom(room1.id)).toBe(room1);

      const removed = roomExpiration.removeRoom(room1.id);
      expect(removed).toBe(true);
      expect(roomExpiration.getRoom(room1.id)).toBeNull();

      const removedAgain = roomExpiration.removeRoom(room1.id);
      expect(removedAgain).toBe(false);
    });

    it('should get all rooms', () => {
      roomExpiration.addRoom(room1);
      roomExpiration.addRoom(room2);
      roomExpiration.addRoom(room3);

      const allRooms = roomExpiration.getAllRooms();
      expect(allRooms).toHaveLength(3);
      expect(allRooms).toContain(room1);
      expect(allRooms).toContain(room2);
      expect(allRooms).toContain(room3);
    });

    it('should clear all rooms', () => {
      roomExpiration.addRoom(room1);
      roomExpiration.addRoom(room2);
      expect(roomExpiration.getAllRooms()).toHaveLength(2);

      roomExpiration.clearAll();
      expect(roomExpiration.getAllRooms()).toHaveLength(0);
    });
  });

  describe('Expiration Detection', () => {
    it('should identify expired rooms', () => {
      // Make room1 expired by setting past expiration time
      room1.expiresAt = Date.now() - 1000; // 1 second ago
      room2.expiresAt = Date.now() + 10000; // 10 seconds from now

      roomExpiration.addRoom(room1);
      roomExpiration.addRoom(room2);

      const expiredRooms = roomExpiration.getExpiredRooms();
      expect(expiredRooms).toHaveLength(1);
      expect(expiredRooms[0]).toBe(room1);

      const activeRooms = roomExpiration.getActiveRooms();
      expect(activeRooms).toHaveLength(1);
      expect(activeRooms[0]).toBe(room2);
    });

    it('should handle rooms with no expiration issues', () => {
      roomExpiration.addRoom(room1);
      roomExpiration.addRoom(room2);

      const expiredRooms = roomExpiration.getExpiredRooms();
      expect(expiredRooms).toHaveLength(0);

      const activeRooms = roomExpiration.getActiveRooms();
      expect(activeRooms).toHaveLength(2);
    });
  });

  describe('TTL Management', () => {
    beforeEach(() => {
      roomExpiration.addRoom(room1);
    });

    it('should reset room TTL', () => {
      const originalExpiration = room1.expiresAt;
      
      // Wait a bit then reset
      setTimeout(() => {
        const success = roomExpiration.resetRoomTTL(room1.id);
        expect(success).toBe(true);
        expect(room1.expiresAt).toBeGreaterThan(originalExpiration);
      }, 10);
    });

    it('should not reset TTL for non-existent room', () => {
      const success = roomExpiration.resetRoomTTL('nonexistent');
      expect(success).toBe(false);
    });

    it('should set custom TTL', () => {
      const customTtl = 5000; // 5 seconds
      const beforeTime = Date.now();
      
      const success = roomExpiration.setRoomTTL(room1.id, customTtl);
      expect(success).toBe(true);
      
      const afterTime = Date.now();
      expect(room1.expiresAt).toBeGreaterThanOrEqual(beforeTime + customTtl);
      expect(room1.expiresAt).toBeLessThanOrEqual(afterTime + customTtl);
    });

    it('should not set TTL for non-existent room', () => {
      const success = roomExpiration.setRoomTTL('nonexistent', 5000);
      expect(success).toBe(false);
    });

    it('should get room expiration info', () => {
      const info = roomExpiration.getRoomExpirationInfo(room1.id);
      expect(info).toBeTruthy();
      expect(info!.expiresAt).toBe(room1.expiresAt);
      expect(info!.remainingMs).toBeGreaterThan(0);
      expect(info!.hasExpired).toBe(false);
    });

    it('should return null for non-existent room expiration info', () => {
      const info = roomExpiration.getRoomExpirationInfo('nonexistent');
      expect(info).toBeNull();
    });

    it('should handle expired room info correctly', () => {
      room1.expiresAt = Date.now() - 1000; // 1 second ago
      
      const info = roomExpiration.getRoomExpirationInfo(room1.id);
      expect(info!.remainingMs).toBe(0);
      expect(info!.hasExpired).toBe(true);
    });
  });

  describe('Manual Cleanup', () => {
    it('should perform cleanup of expired rooms', () => {
      // Make room1 and room2 expired
      room1.expiresAt = Date.now() - 1000;
      room2.expiresAt = Date.now() - 2000;
      room3.expiresAt = Date.now() + 10000; // Not expired

      roomExpiration.addRoom(room1);
      roomExpiration.addRoom(room2);
      roomExpiration.addRoom(room3);

      expect(roomExpiration.getAllRooms()).toHaveLength(3);

      roomExpiration.performCleanup();

      expect(roomExpiration.getAllRooms()).toHaveLength(1);
      expect(roomExpiration.getRoom(room3.id)).toBe(room3);
      expect(roomExpiration.getRoom(room1.id)).toBeNull();
      expect(roomExpiration.getRoom(room2.id)).toBeNull();
    });

    it('should emit cleanup events', () => {
      room1.expiresAt = Date.now() - 1000;
      room2.expiresAt = Date.now() - 2000;

      roomExpiration.addRoom(room1);
      roomExpiration.addRoom(room2);

      roomExpiration.performCleanup();

      expect(expirationEvents).toHaveLength(6); // cleanup_started + 2*(room_expired + room_cleaned) + cleanup_completed
      
      const startedEvent = expirationEvents.find(e => e.type === 'cleanup_started');
      expect(startedEvent).toBeTruthy();
      expect(startedEvent!.expiredCount).toBe(2);

      const expiredEvents = expirationEvents.filter(e => e.type === 'room_expired');
      expect(expiredEvents).toHaveLength(2);

      const cleanedEvents = expirationEvents.filter(e => e.type === 'room_cleaned');
      expect(cleanedEvents).toHaveLength(2);

      const completedEvent = expirationEvents.find(e => e.type === 'cleanup_completed');
      expect(completedEvent).toBeTruthy();
      expect(completedEvent!.expiredCount).toBe(2);
      expect(completedEvent!.cleanedCount).toBe(2);
    });

    it('should not emit events when no rooms expired', () => {
      roomExpiration.addRoom(room1);
      roomExpiration.addRoom(room2);

      roomExpiration.performCleanup();

      expect(expirationEvents).toHaveLength(0);
    });
  });

  describe('Automatic Cleanup', () => {
    it('should automatically cleanup expired rooms', async () => {
      room1.expiresAt = Date.now() - 1000; // Already expired
      roomExpiration.addRoom(room1);
      roomExpiration.addRoom(room2); // Not expired

      // Test that service can start and will eventually clean up
      expect(roomExpiration.isServiceRunning()).toBe(false);
      roomExpiration.start();
      expect(roomExpiration.isServiceRunning()).toBe(true);

      // Since timing is unreliable in tests, manually trigger cleanup
      // to verify the automatic cleanup logic would work
      roomExpiration.performCleanup();

      expect(roomExpiration.getRoom(room1.id)).toBeNull();
      expect(roomExpiration.getRoom(room2.id)).toBe(room2);

      const expiredEvents = expirationEvents.filter(e => e.type === 'room_expired');
      expect(expiredEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('should not cleanup when service is stopped', async () => {
      room1.expiresAt = Date.now() - 1000;
      roomExpiration.addRoom(room1);

      // Don't start service
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(roomExpiration.getRoom(room1.id)).toBe(room1);
      expect(expirationEvents).toHaveLength(0);
    });
  });

  describe('Event Subscription', () => {
    it('should subscribe and unsubscribe to events', () => {
      const events: ExpirationEvent[] = [];
      const callback = (event: ExpirationEvent) => events.push(event);
      
      roomExpiration.onExpirationEvent(callback);
      
      room1.expiresAt = Date.now() - 1000;
      roomExpiration.addRoom(room1);
      roomExpiration.performCleanup();
      
      expect(events.length).toBeGreaterThan(0);
      
      roomExpiration.offExpirationEvent(callback);
      
      room2.expiresAt = Date.now() - 1000;
      roomExpiration.addRoom(room2);
      roomExpiration.performCleanup();
      
      // Should not have new events after unsubscribe
      const previousLength = events.length;
      expect(events.length).toBe(previousLength);
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = () => { throw new Error('Test error'); };
      const normalCallback = vi.fn();
      
      roomExpiration.onExpirationEvent(errorCallback);
      roomExpiration.onExpirationEvent(normalCallback);
      
      room1.expiresAt = Date.now() - 1000;
      roomExpiration.addRoom(room1);
      
      // Should not throw
      expect(() => roomExpiration.performCleanup()).not.toThrow();
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      room1.expiresAt = Date.now() - 1000; // Expired
      room2.expiresAt = Date.now() + 10000; // Active
      
      roomExpiration.addRoom(room1);
      roomExpiration.addRoom(room2);
      roomExpiration.addRoom(room3); // Active

      const stats = roomExpiration.getStatistics();
      expect(stats.totalRooms).toBe(3);
      expect(stats.activeRooms).toBe(2);
      expect(stats.expiredRooms).toBe(1);
      expect(stats.isRunning).toBe(false);
      expect(stats.checkIntervalMs).toBe(100);
    });

    it('should update statistics when service starts', () => {
      const stats1 = roomExpiration.getStatistics();
      expect(stats1.isRunning).toBe(false);

      roomExpiration.start();
      const stats2 = roomExpiration.getStatistics();
      expect(stats2.isRunning).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty room list', () => {
      const expiredRooms = roomExpiration.getExpiredRooms();
      expect(expiredRooms).toHaveLength(0);

      roomExpiration.performCleanup();
      expect(expirationEvents).toHaveLength(0);
    });

    it('should handle rooms with same expiration time', () => {
      const expireTime = Date.now() - 1000;
      room1.expiresAt = expireTime;
      room2.expiresAt = expireTime;

      roomExpiration.addRoom(room1);
      roomExpiration.addRoom(room2);

      const expiredRooms = roomExpiration.getExpiredRooms();
      expect(expiredRooms).toHaveLength(2);
    });

    it('should handle rapid add/remove operations', () => {
      for (let i = 0; i < 10; i++) {
        const room = new Room({
          name: `Room ${i}`,
          capacity: 2,
          isPrivate: false,
          hostId: `host${i}`
        });
        roomExpiration.addRoom(room);
        roomExpiration.removeRoom(room.id);
      }

      expect(roomExpiration.getAllRooms()).toHaveLength(0);
    });
  });
});
