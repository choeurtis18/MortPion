import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3002';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private listeners: Map<string, Set<Function>> = new Map();

  connect() {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(SERVER_URL, {
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server:', this.socket?.id);
      this.isConnected = true;
      this.emit('connection-changed', true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
      this.emit('connection-changed', false);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      this.isConnected = false;
      this.emit('connection-changed', false);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      this.emit('connection-changed', false);
    }
  }

  getSocket() {
    if (!this.socket) {
      this.connect();
    }
    return this.socket;
  }

  getIsConnected() {
    return this.isConnected;
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  private emit(event: string, ...args: any[]) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => callback(...args));
    }
  }

  // Socket.io methods
  ping() {
    const socket = this.getSocket();
    if (socket) {
      socket.emit('ping');
    }
  }

  createRoom(playerName: string, roomName?: string, isPrivate?: boolean, capacity?: number) {
    const socket = this.getSocket();
    if (socket) {
      console.log('SocketService: Emitting create-room event', { 
        playerName, 
        roomName: roomName || `Salle de ${playerName}`,
        isPrivate: isPrivate || false,
        capacity: capacity || 2
      });
      socket.emit('create-room', { 
        playerName, 
        roomName: roomName || `Salle de ${playerName}`,
        isPrivate: isPrivate || false,
        capacity: capacity || 2
      });
    } else {
      console.error('SocketService: No socket available for create-room');
    }
  }

  joinRoom(roomId: string, playerName: string, accessCode?: string) {
    const socket = this.getSocket();
    if (socket) {
      console.log('SocketService: Socket connected?', socket.connected);
      console.log('SocketService: Socket ID:', socket.id);
      console.log('SocketService: Emitting join-room event', { roomId, playerName, accessCode });
      socket.emit('join-room', { roomId, playerName, accessCode });
      
      // Add a timeout to check if the event was received
      setTimeout(() => {
        console.log('SocketService: join-room event sent 1 second ago, checking server response...');
      }, 1000);
    } else {
      console.error('SocketService: No socket available for join-room');
    }
  }

  makeMove(roomId: string, cellIndex: number, size: 'P' | 'M' | 'G') {
    const socket = this.getSocket();
    if (socket) {
      socket.emit('make-move', { roomId, cellIndex, size });
    }
  }

  getGameState(roomId: string) {
    const socket = this.getSocket();
    if (socket) {
      socket.emit('get-game-state', { roomId });
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();
