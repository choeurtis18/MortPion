import { Color, Size } from '@mortpion/shared';

interface Player {
  id: string;
  nickname: string;
  color: Color;
  inventory: Record<Size, number>;
  connected: boolean;
}

interface PlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  currentPlayerId?: string;
}

const colorClasses = {
  red: 'bg-red-100 border-red-200',
  blue: 'bg-blue-100 border-blue-200', 
  green: 'bg-green-100 border-green-200',
  yellow: 'bg-yellow-100 border-yellow-200',
};

const colorDots = {
  red: '🔴',
  blue: '🔵',
  green: '🟢',
  yellow: '🟡',
};

const sizeEmojis = {
  P: '⚫', // Petit
  M: '⚪', // Moyen  
  G: '⭕', // Grand
};

const sizeNames = {
  P: 'Petit',
  M: 'Moyen',
  G: 'Grand',
};

export function PlayersModal({ isOpen, onClose, players, currentPlayerId }: PlayersModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Joueurs et Pièces</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Players List */}
        <div className="p-4 space-y-4">
          {players.map((player) => (
            <div
              key={player.id}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${colorClasses[player.color]}
                ${player.id === currentPlayerId ? 'ring-2 ring-blue-400' : ''}
                ${!player.connected ? 'opacity-60' : ''}
              `}
            >
              {/* Player Info */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{colorDots[player.color]}</span>
                  <span className="font-semibold text-gray-800">
                    {player.nickname}
                  </span>
                  {player.id === currentPlayerId && (
                    <span className="text-sm bg-blue-500 text-white px-2 py-1 rounded-full">
                      Tour actuel
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {player.connected ? '🟢 Connecté' : '🔴 Déconnecté'}
                </div>
              </div>

              {/* Inventory */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Pièces disponibles:
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['P', 'M', 'G'] as Size[]).map((size) => (
                    <div
                      key={size}
                      className="flex items-center justify-between bg-white bg-opacity-50 rounded p-2"
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-lg">{sizeEmojis[size]}</span>
                        <span className="text-sm font-medium">{sizeNames[size]}</span>
                      </div>
                      <span className="font-bold text-gray-800">
                        {player.inventory[size]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total pieces */}
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Total: {Object.values(player.inventory).reduce((a, b) => a + b, 0)} pièces
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
