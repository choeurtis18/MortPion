import React from 'react';

interface PieceProps {
  size: 'P' | 'M' | 'G';
  color: string;
  className?: string;
  onClick?: () => void;
  isSelected?: boolean;
  count?: number;
}

const colorClasses = {
  red: 'bg-red-500 border-red-600 text-white',
  blue: 'bg-blue-500 border-blue-600 text-white',
  green: 'bg-green-500 border-green-600 text-white',
  yellow: 'bg-yellow-500 border-yellow-600 text-white',
};

const sizeClasses = {
  P: 'w-8 h-8 text-xs', // Petit
  M: 'w-12 h-12 text-sm', // Moyen  
  G: 'w-16 h-16 text-base', // Grand
};

export const Piece: React.FC<PieceProps> = ({ 
  size, 
  color, 
  className = '', 
  onClick,
  isSelected = false,
  count
}) => {
  const colorClass = colorClasses[color as keyof typeof colorClasses] || 'bg-gray-500 border-gray-600';
  const sizeClass = sizeClasses[size];
  
  return (
    <div
      onClick={onClick}
      className={`
        ${sizeClass} ${colorClass}
        border-2 rounded-lg flex items-center justify-center font-bold
        transition-all duration-200 cursor-pointer relative
        ${isSelected ? 'ring-2 ring-offset-2 ring-blue-400 scale-110' : ''}
        ${onClick ? 'hover:scale-105 hover:shadow-md' : ''}
        ${className}
      `}
      title={`Pièce ${size} ${color}${count !== undefined ? ` (${count} restantes)` : ''}`}
    >
      <span className="select-none">
        {size}
      </span>
      
      {/* Compteur pour l'inventaire */}
      {count !== undefined && count > 0 && (
        <div className="absolute -top-2 -right-2 bg-white text-gray-800 text-xs rounded-full w-5 h-5 flex items-center justify-center border border-gray-300 font-bold">
          {count}
        </div>
      )}
    </div>
  );
};
