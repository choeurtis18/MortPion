import { useState, useCallback } from 'react';
import { 
  Game,
  Position, 
  BoardState, 
  GameStatus, 
  GameResult,
  PlayerInventory,
  Color
} from '@mortpion/shared';
import { Player } from '../../../../packages/shared/dist/game-logic';

interface LocalGameState {
  game: Game | null;
  players: Player[];
  selectedPiece: { size: 'P' | 'M' | 'G'; color: Color } | null;
  error: string | null;
}

export const useLocalGame = () => {
  const [state, setState] = useState<LocalGameState>({
    game: null,
    players: [],
    selectedPiece: null,
    error: null
  });

  // Initialiser une nouvelle partie locale
  const startLocalGame = useCallback((playerCount: 2 | 3 | 4 = 2) => {
    try {
      const colors: Color[] = ['red', 'blue', 'green', 'yellow'];
      const players = Array.from({ length: playerCount }, (_, i) => 
        new Player(`Joueur ${i + 1}`, colors[i])
      );
      
      const game = new Game(players);
      
      setState({
        game,
        players,
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

  // Sélectionner une pièce dans l'inventaire
  const selectPiece = useCallback((size: 'P' | 'M' | 'G', color: Color) => {
    if (!state.game) return;
    
    const currentPlayer = state.game.getCurrentPlayer();
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
  }, [state.game]);

  // Placer une pièce sur le plateau
  const placePiece = useCallback((position: Position) => {
    if (!state.game || !state.selectedPiece) {
      setState(prev => ({ ...prev, error: 'Aucune pièce sélectionnée' }));
      return;
    }

    try {
      const move = {
        position,
        piece: {
          size: state.selectedPiece.size,
          color: state.selectedPiece.color
        }
      };

      state.game.applyMove(move);
      
      setState(prev => ({
        ...prev,
        selectedPiece: null,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Coup invalide'
      }));
    }
  }, [state.game, state.selectedPiece]);

  // Désélectionner la pièce
  const deselectPiece = useCallback(() => {
    setState(prev => ({ ...prev, selectedPiece: null, error: null }));
  }, []);

  // Réinitialiser la partie
  const resetGame = useCallback(() => {
    setState({
      game: null,
      players: [],
      selectedPiece: null,
      error: null
    });
  }, []);

  // Getters pour l'état du jeu
  const getBoard = (): BoardState => {
    return state.game?.getBoard() || Array(9).fill({ P: null, M: null, G: null });
  };

  const getCurrentPlayer = (): Player | null => {
    return state.game?.getCurrentPlayer() || null;
  };

  const getGameStatus = (): GameStatus => {
    return state.game?.getStatus() || 'waiting';
  };

  const getGameResult = (): GameResult | null => {
    return state.game?.getResult() || null;
  };

  const getPlayerInventories = (): Record<string, PlayerInventory> => {
    const inventories: Record<string, PlayerInventory> = {};
    state.players.forEach(player => {
      inventories[player.color] = player.inventory;
    });
    return inventories;
  };

  return {
    // État
    game: state.game,
    players: state.players,
    selectedPiece: state.selectedPiece,
    error: state.error,
    
    // Actions
    startLocalGame,
    selectPiece,
    placePiece,
    deselectPiece,
    resetGame,
    
    // Getters
    board: getBoard(),
    currentPlayer: getCurrentPlayer(),
    gameStatus: getGameStatus(),
    gameResult: getGameResult(),
    playerInventories: getPlayerInventories(),
    
    // État dérivé
    isGameActive: state.game?.getStatus() === 'playing',
    isGameFinished: state.game?.getStatus() === 'finished'
  };
};
