import React from 'react';
import { PlayerInventory as Inventory } from '@mortpion/shared';
import { Piece } from './Piece';

interface PlayerInventoryProps {
  inventory: Inventory;
  color: string;
  playerName: string;
  isCurrentPlayer?: boolean;
  onPieceSelect?: (size: 'P' | 'M' | 'G') => void;
  selectedPiece?: { size: 'P' | 'M' | 'G'; color: string } | null;
}

export const PlayerInventory: React.FC<PlayerInventoryProps> = ({
  inventory,
  color,
  playerName,
  isCurrentPlayer = false,
  onPieceSelect,
  selectedPiece
}) => {
  const handlePieceClick = (size: 'P' | 'M' | 'G') => {
    if (inventory[size] > 0 && onPieceSelect) {
      onPieceSelect(size);
    }
  };

  return (
    <div className={`
      bg-white p-4 rounded-lg shadow-md border-2 transition-all duration-200
      ${isCurrentPlayer ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}
    `}>
      {/* En-tête du joueur */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full bg-${color}-500`}></div>
          <h3 className={`font-semibold ${isCurrentPlayer ? 'text-blue-800' : 'text-gray-800'}`}>
            {playerName}
          </h3>
        </div>
        {isCurrentPlayer && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
            À ton tour
          </span>
        )}
      </div>

      {/* Inventaire des pièces */}
      <div className="flex gap-3 justify-center">
        {(['P', 'M', 'G'] as const).map((size) => (
          <div key={size} className="flex flex-col items-center gap-1">
            <Piece
              size={size}
              color={color}
              count={inventory[size]}
              onClick={() => handlePieceClick(size)}
              isSelected={
                selectedPiece?.size === size && selectedPiece?.color === color
              }
              className={`
                ${inventory[size] === 0 ? 'opacity-30 cursor-not-allowed' : ''}
                ${isCurrentPlayer && inventory[size] > 0 ? 'hover:scale-110' : ''}
              `}
            />
            <span className="text-xs text-gray-600 font-medium">
              {inventory[size]}
            </span>
          </div>
        ))}
      </div>

      {/* Total des pièces restantes */}
      <div className="mt-2 text-center">
        <span className="text-xs text-gray-500">
          Total: {inventory.P + inventory.M + inventory.G} pièces
        </span>
      </div>
    </div>
  );
};
