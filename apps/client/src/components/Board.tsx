import React from 'react';
import { Cell as CellType } from '@mortpion/shared';
import { Cell } from './Cell';

// Types pour l'interface
type Position = { row: number; col: number };
type BoardState = CellType[][];

interface BoardProps {
  board: BoardState;
  onCellClick?: (position: Position) => void;
  selectedPiece?: { size: 'P' | 'M' | 'G'; color: string } | null;
}

export const Board: React.FC<BoardProps> = ({ 
  board, 
  onCellClick, 
  selectedPiece 
}) => {
  const handleCellClick = (row: number, col: number) => {
    if (onCellClick) {
      onCellClick({ row, col });
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="grid grid-cols-3 gap-2 w-80 h-80 mx-auto">
        {Array.from({ length: 3 }, (_, row) =>
          Array.from({ length: 3 }, (_, col) => (
            <Cell
              key={`${row}-${col}`}
              pieces={board[row][col]}
              onClick={() => handleCellClick(row, col)}
              isHighlighted={selectedPiece !== null}
              position={{ row, col }}
            />
          ))
        )}
      </div>
    </div>
  );
};
