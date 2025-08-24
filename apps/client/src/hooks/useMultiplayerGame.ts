import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import type { Cell, Color, Size } from '@mortpion/shared';

interface GameState {
  board: Cell[];
  players: Array<{
    id: string;
    nickname: string;
    color: Color;
    inventory: { P: number; M: number; G: number };
    connected: boolean;
    isHost: boolean;
  }>;
  currentPlayerId: string;
  status: 'waiting' | 'playing' | 'finished';
  winnerId?: string;
  isDraw?: boolean;
  turnTimeLeft?: number;
}

interface MultiplayerGameState {
  roomId: string | null;
  gameState: GameState | null;
  selectedPiece: { size: Size; color: Color } | null;
  error: string | null;
  isConnected: boolean;
  currentPlayer: GameState['players'][0] | null;
  myPlayerId: string | null;
  replayDeadline: number | null;
  replayVotes: Record<string, boolean>;
  showReturnToLobby: boolean;
}

export const useMultiplayerGame = () => {
  const { socket, isConnected, makeMove, getGameState } = useSocket();
  const [state, setState] = useState<MultiplayerGameState>({
    roomId: null,
    gameState: null,
    selectedPiece: null,
    error: null,
    isConnected: false,
    currentPlayer: null,
    myPlayerId: null,
    replayDeadline: null,
    replayVotes: {},
    showReturnToLobby: false,
  });

  // Update connection status
  useEffect(() => {
    setState(prev => ({ ...prev, isConnected }));
  }, [isConnected]);

  // Set player ID when socket connects
  useEffect(() => {
    setState(prev => ({ ...prev, myPlayerId: socket?.id || null }));
  }, [socket?.id]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleGameStarted = (data: { gameState: GameState }) => {
      setState(prev => ({
        ...prev,
        gameState: data.gameState,
        error: null
      }));
    };

    const handleGameUpdated = (data: { gameState: GameState }) => {
      setState(prev => ({
        ...prev,
        gameState: data.gameState,
        selectedPiece: null, // Clear selection after move
        error: null
      }));
    };

    const handleGameEnded = (data: { gameState: GameState }) => {
      setState(prev => ({
        ...prev,
        gameState: data.gameState,
        selectedPiece: null,
        error: null
      }));
    };

    const handleMoveError = (data: { message: string }) => {
      setState(prev => ({
        ...prev,
        error: data.message,
        selectedPiece: null
      }));
    };

    const handleGameState = (data: { gameState: GameState }) => {
      setState(prev => ({
        ...prev,
        gameState: data.gameState,
        error: null
      }));
    };

    const handlePlayerJoined = () => {
      // Refresh game state when a player joins
      if (state.roomId) {
        getGameState(state.roomId);
      }
    };

    const handlePlayerDisconnected = (data: { playerId: string; playerName: string }) => {
      setState(prev => ({
        ...prev,
        error: `${data.playerName} s'est déconnecté`
      }));
    };

    const handleTurnSkipped = (data: { skippedPlayerId: string; reason: string; gameState: GameState }) => {
      setState(prev => ({
        ...prev,
        gameState: data.gameState,
        selectedPiece: null,
        error: data.reason === 'timeout' ? 'Tour passé automatiquement (temps écoulé)' : 'Tour passé'
      }));
    };

    const handleReplayVotingStarted = (data: { replayDeadline: number; replayVotes: Record<string, boolean> }) => {
      setState(prev => ({
        ...prev,
        replayDeadline: data.replayDeadline,
        replayVotes: data.replayVotes
      }));
    };

    const handleReplayVoteUpdated = (data: { replayVotes: Record<string, boolean>; replayDeadline: number }) => {
      setState(prev => ({
        ...prev,
        replayVotes: data.replayVotes,
        replayDeadline: data.replayDeadline
      }));
    };

    const handleGameRestarted = (data: { gameState: GameState }) => {
      setState(prev => ({
        ...prev,
        gameState: data.gameState,
        replayDeadline: null,
        replayVotes: {},
        selectedPiece: null,
        error: null
      }));
    };

    const handleReplayRejected = () => {
      setState(prev => ({
        ...prev,
        replayDeadline: null,
        replayVotes: {},
        showReturnToLobby: true,
        error: 'Le vote pour rejouer a été rejeté'
      }));
    };

    const handleTimerUpdate = (data: { turnTimeLeft: number; currentPlayerId: string }) => {
      setState(prev => ({
        ...prev,
        gameState: prev.gameState ? {
          ...prev.gameState,
          turnTimeLeft: data.turnTimeLeft,
          currentPlayerId: data.currentPlayerId
        } : null
      }));
    };

    const handleReplayTimeout = () => {
      setState(prev => ({
        ...prev,
        replayDeadline: null,
        replayVotes: {},
        showReturnToLobby: true
      }));
    };

    socket.on('game-started', handleGameStarted);
    socket.on('game-updated', handleGameUpdated);
    socket.on('game-ended', handleGameEnded);
    socket.on('move-error', handleMoveError);
    socket.on('game-state', handleGameState);
    socket.on('player-joined', handlePlayerJoined);
    socket.on('player-disconnected', handlePlayerDisconnected);
    socket.on('turn-skipped', handleTurnSkipped);
    socket.on('replay-voting-started', handleReplayVotingStarted);
    socket.on('replay-vote-updated', handleReplayVoteUpdated);
    socket.on('game-restarted', handleGameRestarted);
    socket.on('replay-rejected', handleReplayRejected);
    socket.on('replay-timeout', handleReplayTimeout);
    socket.on('timer-update', handleTimerUpdate);

    return () => {
      socket.off('game-started', handleGameStarted);
      socket.off('game-updated', handleGameUpdated);
      socket.off('game-ended', handleGameEnded);
      socket.off('move-error', handleMoveError);
      socket.off('game-state', handleGameState);
      socket.off('player-joined', handlePlayerJoined);
      socket.off('player-disconnected', handlePlayerDisconnected);
      socket.off('turn-skipped', handleTurnSkipped);
      socket.off('replay-voting-started', handleReplayVotingStarted);
      socket.off('replay-vote-updated', handleReplayVoteUpdated);
      socket.off('game-restarted', handleGameRestarted);
      socket.off('replay-rejected', handleReplayRejected);
      socket.off('replay-timeout', handleReplayTimeout);
      socket.off('timer-update', handleTimerUpdate);
    };
  }, [socket, state.roomId, getGameState]);

  // Convert 1D board to 2D for display
  const getBoardAs2D = useCallback((): Cell[][] => {
    if (!state.gameState?.board) {
      // Return empty board
      return Array(3).fill(null).map(() => 
        Array(3).fill(null).map(() => ({ P: null, M: null, G: null }))
      );
    }

    const board2D: Cell[][] = [];
    for (let row = 0; row < 3; row++) {
      board2D[row] = [];
      for (let col = 0; col < 3; col++) {
        board2D[row][col] = state.gameState.board[row * 3 + col];
      }
    }
    return board2D;
  }, [state.gameState?.board]);

  // Get current player info
  const getCurrentPlayer = useCallback(() => {
    if (!state.gameState || !state.myPlayerId) return null;
    return state.gameState.players.find(p => p.id === state.myPlayerId) || null;
  }, [state.gameState, state.myPlayerId]);

  // Get active turn player
  const getActivePlayer = useCallback(() => {
    if (!state.gameState) return null;
    return state.gameState.players.find(p => p.id === state.gameState!.currentPlayerId) || null;
  }, [state.gameState]);

  // Join a room
  const joinRoom = useCallback((roomId: string) => {
    setState(prev => ({
      ...prev,
      roomId,
      gameState: null,
      selectedPiece: null,
      error: null
    }));
    
    // Request current game state
    getGameState(roomId);
  }, [getGameState]);

  // Leave room
  const leaveRoom = useCallback(() => {
    setState(prev => ({
      ...prev,
      roomId: null,
      gameState: null,
      selectedPiece: null,
      error: null,
      currentPlayer: null
    }));
  }, []);

  // Select a piece
  const selectPiece = useCallback((size: Size, color: Color) => {
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer || currentPlayer.color !== color) {
      setState(prev => ({ ...prev, error: 'Ce n\'est pas votre tour' }));
      return;
    }

    if (state.gameState?.currentPlayerId !== state.myPlayerId) {
      setState(prev => ({ ...prev, error: 'Ce n\'est pas votre tour' }));
      return;
    }

    if (currentPlayer.inventory[size] <= 0) {
      setState(prev => ({ ...prev, error: `Plus de pièces ${size} disponibles` }));
      return;
    }

    setState(prev => ({
      ...prev,
      selectedPiece: { size, color },
      error: null
    }));
  }, [getCurrentPlayer, state.gameState?.currentPlayerId, state.myPlayerId]);

  // Deselect piece
  const deselectPiece = useCallback(() => {
    setState(prev => ({ ...prev, selectedPiece: null, error: null }));
  }, []);

  // Make a move
  const placePiece = useCallback((position: { row: number; col: number }) => {
    if (!state.selectedPiece || !state.roomId) {
      setState(prev => ({ ...prev, error: 'Aucune pièce sélectionnée' }));
      return;
    }

    if (state.gameState?.currentPlayerId !== state.myPlayerId) {
      setState(prev => ({ ...prev, error: 'Ce n\'est pas votre tour' }));
      return;
    }

    const cellIndex = position.row * 3 + position.col;
    makeMove(state.roomId, cellIndex, state.selectedPiece.size);
  }, [state.selectedPiece, state.roomId, state.gameState?.currentPlayerId, state.myPlayerId, makeMove]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Cast replay vote
  const castReplayVote = useCallback((vote: boolean) => {
    if (!socket || !state.roomId) return;
    
    socket.emit('cast-replay-vote', {
      roomId: state.roomId,
      vote
    });
  }, [socket, state.roomId]);

  // Return to lobby
  const returnToLobby = useCallback(() => {
    setState(prev => ({
      ...prev,
      roomId: null,
      gameState: null,
      selectedPiece: null,
      error: null,
      currentPlayer: null,
      replayDeadline: null,
      replayVotes: {},
      showReturnToLobby: false
    }));
  }, []);

  return {
    // State
    roomId: state.roomId,
    board: getBoardAs2D(),
    gameState: state.gameState,
    selectedPiece: state.selectedPiece,
    error: state.error,
    isConnected: state.isConnected,
    currentPlayer: getCurrentPlayer(),
    activePlayer: getActivePlayer(),
    myPlayerId: state.myPlayerId,
    replayDeadline: state.replayDeadline,
    replayVotes: state.replayVotes,
    showReturnToLobby: state.showReturnToLobby,
    
    // Actions
    joinRoom,
    leaveRoom,
    selectPiece,
    deselectPiece,
    placePiece,
    clearError,
    castReplayVote,
    returnToLobby,
    
    // Derived state
    isMyTurn: state.gameState?.currentPlayerId === state.myPlayerId && state.myPlayerId !== null,
    isGameActive: state.gameState?.status === 'playing',
    isGameFinished: state.gameState?.status === 'finished',
    gameStatus: state.gameState?.status || 'waiting'
  };
};
