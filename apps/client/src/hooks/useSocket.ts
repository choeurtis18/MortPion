import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../services/socketService';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastPong, setLastPong] = useState<any>(null);

  useEffect(() => {
    // Get singleton socket instance
    const socketInstance = socketService.getSocket();
    setSocket(socketInstance);
    setIsConnected(socketService.getIsConnected());

    // Listen for connection changes
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };

    socketService.on('connection-changed', handleConnectionChange);

    // Test ping-pong
    const handlePong = (data: any) => {
      console.log('Received pong:', data);
      setLastPong(data);
    };

    if (socketInstance) {
      socketInstance.on('pong', handlePong);
    }

    // Cleanup on unmount
    return () => {
      socketService.off('connection-changed', handleConnectionChange);
      if (socketInstance) {
        socketInstance.off('pong', handlePong);
      }
    };
  }, []);

  // Helper functions using socketService
  const ping = () => {
    socketService.ping();
  };

  const createRoom = (playerName: string, roomName?: string, isPrivate?: boolean, capacity?: number) => {
    socketService.createRoom(playerName, roomName, isPrivate, capacity);
  };

  const joinRoom = (roomId: string, playerName: string, accessCode?: string) => {
    socketService.joinRoom(roomId, playerName, accessCode);
  };

  const makeMove = (roomId: string, cellIndex: number, size: 'P' | 'M' | 'G') => {
    socketService.makeMove(roomId, cellIndex, size);
  };

  const getGameState = (roomId: string) => {
    socketService.getGameState(roomId);
  };

  const connect = () => {
    socketService.connect();
  };

  const disconnect = () => {
    socketService.disconnect();
  };

  return {
    socket,
    isConnected,
    lastPong,
    connect,
    disconnect,
    ping,
    createRoom,
    joinRoom,
    makeMove,
    getGameState
  };
}
