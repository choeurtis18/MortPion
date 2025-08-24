import { useState, useCallback } from 'react';
import { 
  PlayerClass,
  Color,
  Size,
  RoomStatus,
  Board, 
  Cell, 
  createEmptyBoard,
  isLegalMove,
  applyMove,
  hasLegalMoves,
  checkWinConditions
} from '@mortpion/shared';

// Types simplifiés pour l'interface
type Position = { row: number; col: number };
type GameResult = {
  type: 'victory' | 'draw';
  winner?: string;
  condition?: string;
} | null;

interface LocalGameState {
  board: Board;
  players: PlayerClass[];
  currentPlayerIndex: number;
  status: RoomStatus;
  result: GameResult;
  selectedPiece: { size: Size; color: Color } | null;
  error: string | null;
}

export const useSimpleLocalGame = () => {
  const [state, setState] = useState<LocalGameState>({
    board: createEmptyBoard(),
    players: [],
    currentPlayerIndex: 0,
    status: 'waiting',
    result: null,
    selectedPiece: null,
    error: null
  });

  // Convertir board 1D en 2D pour l'affichage
  const getBoardAs2D = (): Cell[][] => {
    const board2D: Cell[][] = [];
    for (let row = 0; row < 3; row++) {
      board2D[row] = [];
      for (let col = 0; col < 3; col++) {
        board2D[row][col] = state.board[row * 3 + col];
      }
    }
    return board2D;
  };

  // Convertir position 2D en index 1D
  const positionToIndex = (position: Position): number => {
    return position.row * 3 + position.col;
  };

  // Créer des joueurs simples
  const createPlayers = (count: 2 | 3 | 4): PlayerClass[] => {
    const colors: Color[] = ['red', 'blue', 'green', 'yellow'];
    return Array.from({ length: count }, (_, i) => ({
      id: `player-${i}`,
      nickname: `Joueur ${i + 1}`,
      color: colors[i],
      inventory: { P: 3, M: 3, G: 3 },
      connected: true,
      skipsInARow: 0,
      isEliminated: false,
      isHost: i === 0
    }));
  };

  // Démarrer une nouvelle partie
  const startLocalGame = useCallback((playerCount: 2 | 3 | 4 = 2) => {
    try {
      const players = createPlayers(playerCount);
      setState({
        board: createEmptyBoard(),
        players,
        currentPlayerIndex: 0,
        status: 'playing',
        result: null,
        selectedPiece: null,
        error: null
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }));
    }
  }, []);

  // Sélectionner une pièce
  const selectPiece = useCallback((size: Size, color: Color) => {
    if (state.status !== 'playing') return;
    
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.color !== color) {
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
  }, [state.status, state.players, state.currentPlayerIndex]);

  // Placer une pièce
  const placePiece = useCallback((position: Position) => {
    if (!state.selectedPiece || state.status !== 'playing') {
      setState(prev => ({ ...prev, error: 'Aucune pièce sélectionnée' }));
      return;
    }

    const cellIndex = positionToIndex(position);
    const currentPlayer = state.players[state.currentPlayerIndex];

    try {
      // Vérifier si le coup est légal (avec couleur)
      if (!isLegalMove(state.board, cellIndex, state.selectedPiece.size, state.selectedPiece.color)) {
        setState(prev => ({ ...prev, error: 'Coup invalide - Vérifiez les règles d\'imbrication' }));
        return;
      }

      // Appliquer le coup
      const newBoard = applyMove(state.board, cellIndex, state.selectedPiece.size, state.selectedPiece.color);
      
      // Mettre à jour l'inventaire du joueur
      const newPlayers = [...state.players];
      newPlayers[state.currentPlayerIndex] = {
        ...currentPlayer,
        inventory: {
          ...currentPlayer.inventory,
          [state.selectedPiece.size]: currentPlayer.inventory[state.selectedPiece.size] - 1
        }
      };

      // Vérifier les conditions de victoire
      const hasWon = checkWinConditions(newBoard, state.selectedPiece.color);
      const isDraw = !hasWon && checkDrawCondition(newBoard, newPlayers);

      let newStatus: RoomStatus = 'playing';
      let newResult: GameResult = null;

      if (hasWon) {
        newStatus = 'finished';
        newResult = {
          type: 'victory',
          winner: currentPlayer.nickname,
          condition: 'alignment'
        };
      } else if (isDraw) {
        newStatus = 'finished';
        newResult = { type: 'draw' };
      }

      // Passer au joueur suivant si la partie continue
      let nextPlayerIndex = state.currentPlayerIndex;
      if (newStatus === 'playing') {
        nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
      }

      setState(prev => ({
        ...prev,
        board: newBoard,
        players: newPlayers,
        currentPlayerIndex: nextPlayerIndex,
        status: newStatus,
        result: newResult,
        selectedPiece: null,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erreur lors du placement'
      }));
    }
  }, [state.board, state.selectedPiece, state.status, state.players, state.currentPlayerIndex]);

  // Vérification simplifiée des conditions de victoire
  /*
  const checkWinCondition = (board: Board, color: Color): boolean => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    // Vérifier alignement de 3 pièces de même taille
    for (const line of lines) {
      for (const size of ['P', 'M', 'G'] as const) {
        if (line.every(i => board[i][size] === color)) {
          return true;
        }
      }
    }

    // Vérifier pile complète (P+M+G dans une cellule)
    for (let i = 0; i < 9; i++) {
      const cell = board[i];
      if (cell.P === color && cell.M === color && cell.G === color) {
        return true;
      }
    }

    return false;
  };
  */

  // Vérification simplifiée du match nul
  const checkDrawCondition = (board: Board, players: PlayerClass[]): boolean => {
    // Match nul si aucun joueur n'a de coups légaux
    return players.every(player => !hasLegalMoves(board, player));
  };

  // Désélectionner la pièce
  const deselectPiece = useCallback(() => {
    setState(prev => ({ ...prev, selectedPiece: null, error: null }));
  }, []);

  // Réinitialiser la partie
  const resetGame = useCallback(() => {
    setState({
      board: createEmptyBoard(),
      players: [],
      currentPlayerIndex: 0,
      status: 'waiting',
      result: null,
      selectedPiece: null,
      error: null
    });
  }, []);

  return {
    // État
    board: getBoardAs2D(),
    players: state.players,
    currentPlayer: state.players[state.currentPlayerIndex] || null,
    selectedPiece: state.selectedPiece,
    error: state.error,
    gameStatus: state.status,
    gameResult: state.result,
    
    // Actions
    startLocalGame,
    selectPiece,
    placePiece,
    deselectPiece,
    resetGame,
    
    // État dérivé
    isGameActive: state.status === 'playing',
    isGameFinished: state.status === 'finished'
  };
};
