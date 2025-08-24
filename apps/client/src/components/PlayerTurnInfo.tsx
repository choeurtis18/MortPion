interface PlayerTurnInfoProps {
  currentPlayerName?: string;
  currentPlayerColor?: 'red' | 'blue' | 'green' | 'yellow';
  gameStatus: 'waiting' | 'playing' | 'finished';
  gameResult?: {
    type: 'victory' | 'draw';
    winner?: string;
    condition?: string;
  } | null;
  isMyTurn?: boolean;
  isLocalMode?: boolean;
}

const colorClasses = {
  red: 'bg-red-100 text-red-800 border-red-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const colorDots = {
  red: '🔴',
  blue: '🔵',
  green: '🟢',
  yellow: '🟡',
};

export function PlayerTurnInfo({ 
  currentPlayerName, 
  currentPlayerColor, 
  gameStatus, 
  gameResult,
  isMyTurn,
  isLocalMode
}: PlayerTurnInfoProps) {
  if (gameStatus === 'waiting') {
    return (
      <div className="px-4 py-3 bg-gray-50 border-b">
        <div className="text-center text-gray-600">
          En attente du début de la partie...
        </div>
      </div>
    );
  }

  if (gameStatus === 'finished' && gameResult) {
    if (gameResult.type === 'draw') {
      return (
        <div className="px-4 py-3 bg-gray-100 border-b">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700">🤝 Match nul</div>
            <div className="text-sm text-gray-600">Aucun joueur n'a gagné</div>
          </div>
        </div>
      );
    }

    if (gameResult.type === 'victory' && gameResult.winner && currentPlayerColor) {
      return (
        <div className={`px-4 py-3 border-b ${colorClasses[currentPlayerColor]}`}>
          <div className="text-center">
            <div className="text-lg font-semibold flex items-center justify-center gap-2">
              <span>🎉</span>
              <span>{gameResult.winner} a gagné !</span>
              <span>{colorDots[currentPlayerColor]}</span>
            </div>
            <div className="text-sm opacity-80">Félicitations !</div>
          </div>
        </div>
      );
    }
  }

  if (gameStatus === 'playing' && currentPlayerName && currentPlayerColor) {
    // Check if it's the current user's turn or someone else's
    const isCurrentPlayerMyTurn = isMyTurn === true;
    
    return (
      <div className={`px-4 py-3 border-b ${colorClasses[currentPlayerColor]}`}>
        <div className="text-center">
          <div className="text-lg font-semibold flex items-center justify-center gap-2">
            <span>{colorDots[currentPlayerColor]}</span>
            {isLocalMode ? (
              <span>Tour de {currentPlayerName}</span>
            ) : isCurrentPlayerMyTurn ? (
              <span>Tour de {currentPlayerName}</span>
            ) : (
              <span>En attente de {currentPlayerName}...</span>
            )}
          </div>
          {(isLocalMode || isCurrentPlayerMyTurn) && (
            <div className="text-sm opacity-80">
              À vous de jouer
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
