import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  lastPong: number | null;
  connect: () => void;
  disconnect: () => void;
  pingServer: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  lastPong: null,

  connect: () => {
    const socket = io(import.meta.env.VITE_SERVER_URL);
    
    socket.on('connect', () => {
      console.log('Connected to server');
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      set({ isConnected: false });
    });

    socket.on('pong', (data) => {
      console.log('Pong received:', data);
      set({ lastPong: data.timestamp });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  pingServer: () => {
    const { socket } = get();
    if (socket) {
      console.log('Sending ping...');
      socket.emit('ping');
    }
  },
}));
