import React from 'react';
import { Cell as CellType } from '@mortpion/shared';
import { Piece } from './Piece';

// Types pour l'interface
type Position = { row: number; col: number };
type PieceStack = CellType;

interface CellProps {
  pieces: PieceStack;
  onClick: () => void;
  isHighlighted?: boolean;
  position: Position;
}

export const Cell: React.FC<CellProps> = ({ 
  pieces, 
  onClick, 
  isHighlighted = false,
  position 
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative w-full h-full border-2 border-gray-300 rounded-lg
        cursor-pointer transition-all duration-200 hover:border-gray-400
        ${isHighlighted ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'}
        ${pieces.P || pieces.M || pieces.G ? '' : 'hover:bg-gray-100'}
      `}
      title={`Position ${position.row + 1},${position.col + 1}`}
    >
      <div className="absolute inset-2 flex items-center justify-center">
        {/* Affichage de l'imbrication complète P/M/G */}
        <div className="relative w-full h-full flex items-center justify-center">
          {/* G (Grand) - Pièce extérieure */}
          {pieces.G && (
            <Piece 
              size="G" 
              color={pieces.G} 
              className="absolute z-10" 
            />
          )}
          
          {/* M (Moyen) - Pièce intermédiaire */}
          {pieces.M && (
            <Piece 
              size="M" 
              color={pieces.M} 
              className={`absolute z-20 ${pieces.G ? 'opacity-90' : ''}`}
            />
          )}
          
          {/* P (Petit) - Pièce intérieure */}
          {pieces.P && (
            <Piece 
              size="P" 
              color={pieces.P} 
              className={`absolute z-30 ${pieces.M || pieces.G ? 'opacity-95' : ''}`}
            />
          )}
        </div>
      </div>
      
      {/* Indicateur de position pour debug */}
      <div className="absolute top-1 left-1 text-xs text-gray-400 font-mono">
        {position.row},{position.col}
      </div>
    </div>
  );
};
