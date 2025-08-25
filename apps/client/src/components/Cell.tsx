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
      <div className="absolute inset-1 flex items-center justify-center">
        {/* Affichage d'une seule pièce - la plus grande présente */}
        <div className="relative flex items-center justify-center">
          {/* Affiche la pièce la plus grande présente (G > M > P) */}
          {pieces.G ? (
            <Piece 
              size="G" 
              color={pieces.G} 
            />
          ) : pieces.M ? (
            <Piece 
              size="M" 
              color={pieces.M} 
            />
          ) : pieces.P ? (
            <Piece 
              size="P" 
              color={pieces.P} 
            />
          ) : null}
        </div>
      </div>
      
      {/* Indicateur de position pour debug */}
      <div className="absolute top-0.5 left-0.5 text-[10px] text-gray-400 font-mono">
        {position.row},{position.col}
      </div>
    </div>
  );
};
