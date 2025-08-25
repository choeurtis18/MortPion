import React from 'react';
import { PlayerInventory as Inventory } from '@mortpion/shared';
import { Piece } from './Piece';

interface MobilePlayerInventoryProps {
  inventory: Inventory;
  color: string;
  playerName: string;
  isCurrentPlayer?: boolean;
  onPieceSelect?: (size: 'P' | 'M' | 'G') => void;
  selectedPiece?: { size: 'P' | 'M' | 'G'; color: string } | null;
}

const colorClasses = {
  red: 'bg-red-50 border-red-200',
  blue: 'bg-blue-50 border-blue-200', 
  green: 'bg-green-50 border-green-200',
  yellow: 'bg-yellow-50 border-yellow-200',
};

const colorDots = {
  red: '🔴',
  blue: '🔵',
  green: '🟢',
  yellow: '🟡',
};

export const MobilePlayerInventory: React.FC<MobilePlayerInventoryProps> = ({
  inventory,
  color,
  playerName,
  isCurrentPlayer = false,
  onPieceSelect,
  selectedPiece
}) => {
  const handlePieceClick = (size: 'P' | 'M' | 'G') => {
    if (inventory[size] > 0 && onPieceSelect && isCurrentPlayer) {
      onPieceSelect(size);
    }
  };

  const colorKey = color as keyof typeof colorClasses;

  return (
    <div className={`
      sticky bottom-0 bg-white border-t-2 p-4 transition-all duration-200 z-10
      ${isCurrentPlayer ? `${colorClasses[colorKey]} border-t-4` : 'border-gray-200'}
       flex flex-col justify-center
    `}>
      {/* En-tête du joueur actif */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{colorDots[colorKey]}</span>
          <div>
            <h3 className={`font-semibold text-lg ${isCurrentPlayer ? 'text-gray-800' : 'text-gray-600'}`}>
              {playerName}
            </h3>
            {/* Message d'aide pour le joueur actif */}
            {isCurrentPlayer && (
              <div>
                {selectedPiece ? (
                  <div className="text-sm text-green-600 font-medium">
                    ✓ {selectedPiece.size} sélectionné - Cliquez sur le plateau
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    Touchez une pièce pour la sélectionner
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inventaire des pièces - Layout horizontal optimisé mobile */}
      <div className="flex gap-4 justify-center">
        {(['P', 'M', 'G'] as const).map((size) => (
          <div key={size} className="flex flex-col items-center gap-2">
            <div className="relative">
              <Piece
                size={size}
                color={color}
                count={inventory[size]}
                onClick={() => handlePieceClick(size)}
                isSelected={
                  selectedPiece?.size === size && selectedPiece?.color === color
                }
                className={`
                  transition-all duration-200 !w-12 !h-12 !text-xs
                  ${inventory[size] === 0 ? 'opacity-30 cursor-not-allowed' : ''}
                  ${isCurrentPlayer && inventory[size] > 0 ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}
                  ${!isCurrentPlayer ? 'opacity-60' : ''}
                `}
              />
              {/* Badge de compteur */}
              <div className={`
                absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center
                ${inventory[size] > 0 ? 'bg-gray-800 text-white' : 'bg-gray-300 text-gray-600'}
              `}>
                {inventory[size]}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
