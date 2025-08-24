import { useState } from 'react';

interface MobileNavbarProps {
  onBackClick: () => void;
  onRulesClick: () => void;
  onPlayersClick?: () => void;
  showPlayersButton?: boolean;
}

export function MobileNavbar({ onBackClick, onRulesClick, onPlayersClick, showPlayersButton }: MobileNavbarProps) {
  const [showConfirmBack, setShowConfirmBack] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleBackClick = () => {
    setShowConfirmBack(true);
  };

  const confirmBack = () => {
    setShowConfirmBack(false);
    onBackClick();
  };

  return (
    <>
      {/* Navbar */}
      <nav className="sticky top-0 bg-white shadow-sm border-b px-4 py-3 flex justify-between items-center z-40">
        <button
          onClick={handleBackClick}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px]"
        >
          <span className="text-lg">←</span>
          <span className="font-medium">Menu</span>
        </button>
        
        <h1 className="text-xl font-bold text-gray-800">MortPion</h1>
        
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <span className="text-xl">⋮</span>
        </button>
      </nav>

      {/* Menu dropdown */}
      {showMenu && (
        <div className="absolute top-16 right-4 bg-white shadow-lg rounded-lg border z-50 min-w-[200px]">
          <button
            onClick={() => {
              setShowMenu(false);
              onRulesClick();
            }}
            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
          >
            <span>📖</span>
            <span>Règles du jeu</span>
          </button>
          {showPlayersButton && onPlayersClick && (
            <button
              onClick={() => {
                setShowMenu(false);
                onPlayersClick();
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-t"
            >
              <span>👥</span>
              <span>Voir les joueurs</span>
            </button>
          )}
        </div>
      )}

      {/* Overlay pour fermer le menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Modal de confirmation retour menu */}
      {showConfirmBack && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Retour au menu</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir retourner au menu ? La partie en cours sera perdue.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmBack(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmBack}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
