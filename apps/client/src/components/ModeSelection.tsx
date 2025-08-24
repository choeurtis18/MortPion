interface ModeSelectionProps {
  onSelectLocal: () => void;
  onSelectOnline: () => void;
  onBack: () => void;
  onStartLocalGame: (playerCount: 2 | 3 | 4) => void;
}

export function ModeSelection({ onSelectLocal, onSelectOnline, onBack }: ModeSelectionProps) {
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
            <h2 className="text-xl font-bold text-gray-800">Mode de Jeu</h2>
            <div className="w-10"></div> {/* Spacer */}
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Local Mode */}
            <button
              onClick={onSelectLocal}
              className="w-full p-6 bg-green-50 hover:bg-green-100 border-2 border-green-200 hover:border-green-300 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">🎮</div>
                <div>
                  <h3 className="text-lg font-semibold text-green-800">Jeu Local</h3>
                  <p className="text-sm text-green-600">
                    Jouez à plusieurs sur le même appareil
                  </p>
                </div>
              </div>
            </button>

            {/* Online Mode */}
            <button
              onClick={onSelectOnline}
              className="w-full p-6 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-300 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">🌐</div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-800">Multijoueur</h3>
                  <p className="text-sm text-blue-600">
                    Jouez en ligne avec d'autres joueurs
                  </p>
                </div>
              </div>
            </button>

            {/* Info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 text-center">
                Choisissez votre mode de jeu préféré
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
