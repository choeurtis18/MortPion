import React from 'react';
import { RoomStatus } from '@mortpion/shared';

// Types pour l'interface
type GameStatus = RoomStatus;
type GameResult = {
  type: 'victory' | 'draw';
  winner?: string;
  condition?: string;
} | null;

interface GameStatusProps {
  status: GameStatus;
  result?: GameResult;
  currentPlayerName?: string;
  currentPlayerColor?: string;
}

export const GameStatus: React.FC<GameStatusProps> = ({
  status,
  result,
  currentPlayerName,
  currentPlayerColor
}) => {
  const getStatusDisplay = () => {
    switch (status) {
      case 'waiting':
        return {
          text: 'En attente de joueurs...',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          icon: '⏳'
        };
      case 'playing':
        return {
          text: `Tour de ${currentPlayerName || 'Joueur'}`,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          icon: '🎮'
        };
      case 'finished':
        if (result?.type === 'victory') {
          return {
            text: `🎉 ${result.winner} a gagné !`,
            bgColor: 'bg-green-100',
            textColor: 'text-green-800',
            icon: '👑'
          };
        } else if (result?.type === 'draw') {
          return {
            text: 'Match nul !',
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-800',
            icon: '🤝'
          };
        }
        return {
          text: 'Partie terminée',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          icon: '🏁'
        };
      default:
        return {
          text: 'État inconnu',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          icon: '❓'
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className={`
      ${statusDisplay.bgColor} ${statusDisplay.textColor}
      px-6 py-4 rounded-lg text-center font-medium shadow-sm border
    `}>
      <div className="flex items-center justify-center gap-2">
        <span className="text-lg">{statusDisplay.icon}</span>
        <span className="text-lg">{statusDisplay.text}</span>
        {currentPlayerColor && status === 'playing' && (
          <div className={`w-4 h-4 rounded-full bg-${currentPlayerColor}-500 ml-2`}></div>
        )}
      </div>
      
      {result?.type === 'victory' && result.condition && (
        <div className="mt-2 text-sm opacity-80">
          Condition: {getVictoryConditionText(result.condition)}
        </div>
      )}
    </div>
  );
};

const getVictoryConditionText = (condition: string): string => {
  switch (condition) {
    case 'same_size_line':
      return '3 pièces de même taille alignées';
    case 'different_size_line':
      return '3 tailles différentes alignées';
    case 'stack_complete':
      return 'Pile complète (P+M+G)';
    default:
      return condition;
  }
};
