import { useState } from 'react';

interface LocalGameConfigProps {
  onStartGame: (playerCount: 2 | 3 | 4) => void;
  onBack: () => void;
}

export function LocalGameConfig({ onStartGame, onBack }: LocalGameConfigProps) {
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center">
      <div className="w-full max-w-sm bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <button
              onClick={onBack}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ←
            </button>
            <h2 className="text-xl font-bold text-gray-800">Jeu Local</h2>
            <div className="w-10"></div> {/* Spacer */}
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Nombre de joueurs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Nombre de joueurs
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    onClick={() => setPlayerCount(count as 2 | 3 | 4)}
                    className={`py-3 px-4 rounded-lg font-medium transition-colors min-h-[48px] ${
                      playerCount === count
                        ? 'bg-green-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                <span className="font-medium">Mode local :</span> Tous les joueurs utilisent le même appareil et jouent chacun leur tour.
              </p>
            </div>

            {/* Bouton de démarrage */}
            <button
              onClick={() => onStartGame(playerCount)}
              className="w-full py-4 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors text-lg min-h-[56px] flex items-center justify-center gap-2"
            >
              <span>🎮</span>
              <span>Commencer la partie</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
