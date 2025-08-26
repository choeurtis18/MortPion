import { useState } from 'react';
import { ReplayVoting } from './components/ReplayVoting';
import { PlayersModal } from './components/PlayersModal';
import { useSimpleLocalGame } from './hooks/useSimpleLocalGame';
import { useMultiplayerGame } from './hooks/useMultiplayerGame';
import { Board, MobileNavbar, PlayerTurnInfo, RulesModal, MobilePlayerInventory, ModeSelection, OnlineMenu, LocalGameConfig } from './components';

function App() {
  const [gameMode, setGameMode] = useState<'menu' | 'mode-selection' | 'local-config' | 'local' | 'online-menu' | 'online-game'>('menu');
  const [playerCount] = useState<2 | 3 | 4>(2);
  const [showRules, setShowRules] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [playerName, setPlayerName] = useState('');
  
  // Local game hook
  const localGame = useSimpleLocalGame();

  // Multiplayer game hook
  const multiGame = useMultiplayerGame();

  // Determine current game context
  const isLocalMode = gameMode === 'local';
  
  // Helper function to get multiplayer game result
  const getMultiplayerGameResult = () => {
    if (!multiGame.gameState || multiGame.gameState.status !== 'finished') {
      return null;
    }
    
    if (multiGame.gameState.isDraw) {
      return {
        type: 'draw' as const,
        winner: undefined,
        condition: 'Match nul'
      };
    }
    
    if (multiGame.gameState.winnerId) {
      const winner = multiGame.gameState.players?.find(p => p.id === multiGame.gameState!.winnerId);
      return {
        type: 'victory' as const,
        winner: winner?.nickname || 'Joueur inconnu',
        condition: 'Victoire'
      };
    }
    
    return null;
  };
  
  // Get current game state based on mode
  const selectedPiece = isLocalMode ? localGame.selectedPiece : multiGame.selectedPiece;
  const board = isLocalMode ? localGame.board : multiGame.board;
  const currentPlayer = isLocalMode ? localGame.currentPlayer : multiGame.currentPlayer;
  const gameStatus = isLocalMode ? localGame.gameStatus : multiGame.gameStatus;
  const gameResult = isLocalMode ? localGame.gameResult : getMultiplayerGameResult();
  // const error = isLocalMode ? localGame.error : multiGame.error;
  const isGameActive = isLocalMode ? localGame.isGameActive : multiGame.isGameActive;


  const handleBackToMenu = () => {
    if (gameMode === 'local') {
      localGame.resetGame();
    } else if (gameMode === 'online-game' && multiGame.roomId) {
      multiGame.leaveRoom();
    }
    setGameMode('menu');
  };

  const handleJoinRoom = (roomId: string) => {
    multiGame.joinRoom(roomId);
    setGameMode('online-game');
  };

  const handleCellClick = (position: { row: number; col: number }) => {
    if (selectedPiece && isGameActive) {
      if (isLocalMode) {
        localGame.placePiece(position);
      } else {
        multiGame.placePiece(position);
      }
    }
  };

  const handlePieceSelect = (size: 'P' | 'M' | 'G', color: 'red' | 'blue' | 'green' | 'yellow') => {
    if (selectedPiece?.size === size && selectedPiece?.color === color) {
      if (isLocalMode) {
        localGame.deselectPiece();
      } else {
        multiGame.deselectPiece();
      }
    } else {
      if (isLocalMode) {
        localGame.selectPiece(size, color);
      } else {
        multiGame.selectPiece(size, color);
      }
    }
  };

  // Menu principal - Mobile-only design (même sur desktop)
  if (gameMode === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center">
        <div className="w-full max-w-sm bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full">
          {/* Header */}
          <div className="text-center p-6 pb-4">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              🎯 MortPion
            </h1>
            <p className="text-sm text-gray-600">
              Jeu de stratégie 3x3
            </p>
          </div>
          
          {/* Content */}
          <div className="p-6 pt-2 space-y-6">
            {/* Boutons d'action */}
            <div className="space-y-3">
              <button
                onClick={() => setGameMode('mode-selection')}
                className="w-full py-4 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors text-lg min-h-[56px] flex items-center justify-center gap-2"
              >
                <span>🎮</span>
                <span>Jouer</span>
              </button>

              {/* Règles */}
              <button
                onClick={() => setShowRules(true)}
                className="w-full py-3 px-4 bg-blue-50 text-blue-600 rounded-lg font-medium transition-colors hover:bg-blue-100 min-h-[48px] flex items-center justify-center gap-2"
              >
                <span>📖</span>
                <span>Voir les règles</span>
              </button>
            </div>
          </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 p-4 border-t">
              Version de développement
            </div>
          </div>
          
          {/* Rules Modal */}
          <RulesModal 
            isOpen={showRules} 
            onClose={() => setShowRules(false)} 
          />
        </div>
      </div>
    );
  }

  // Mode Selection Screen
  if (gameMode === 'mode-selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center">
        <div className="w-full max-w-sm bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center p-4">
          <ModeSelection
            onSelectLocal={() => setGameMode('local-config')}
            onSelectOnline={() => setGameMode('online-menu')}
            onBack={() => setGameMode('menu')}
            onStartLocalGame={(playerCount) => {
              localGame.startLocalGame(playerCount);
              setGameMode('local');
            }}
          />
        </div>
      </div>
    );
  }

  // Local Game Configuration Screen
  if (gameMode === 'local-config') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center">
        <div className="w-full max-w-sm bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center p-4">
          <LocalGameConfig
            onStartGame={(playerCount) => {
              localGame.startLocalGame(playerCount);
              setGameMode('local');
            }}
            onBack={() => setGameMode('mode-selection')}
          />
        </div>
      </div>
    );
  }

  // Online Menu Screen
  if (gameMode === 'online-menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center">
        <div className="w-full max-w-sm bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col min-h-screen">
          <OnlineMenu
            onJoinGame={handleJoinRoom}
            onBack={() => setGameMode('mode-selection')}
            playerName={playerName}
            setPlayerName={setPlayerName}
          />
        </div>
      </div>
    );
  }

  // Interface de jeu (local et multijoueur) - Mobile-only design (même sur desktop)
  if (gameMode === 'local' || gameMode === 'online-game') {
    // Pour le mode local, ne pas afficher l'interface si aucun joueur n'est configuré
    if (isLocalMode && localGame.players.length === 0) {
      return null; // Cela ne devrait pas arriver avec la nouvelle navigation
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center">
        <div className="w-full max-w-sm bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col min-h-screen">
        {/* Mobile Navbar */}
        <MobileNavbar
          onBackClick={handleBackToMenu}
          onRulesClick={() => setShowRules(true)}
          onPlayersClick={() => setShowPlayers(true)}
          showPlayersButton={gameMode === 'online-game'}
        />

        {/* Player Turn Info - Mobile-only design */}
        {(gameMode === 'local' || gameMode === 'online-game') && (
          <PlayerTurnInfo 
            currentPlayerName={isLocalMode ? currentPlayer?.nickname : multiGame.activePlayer?.nickname}
            currentPlayerColor={isLocalMode ? currentPlayer?.color : multiGame.activePlayer?.color}
            gameStatus={gameStatus}
            gameResult={gameResult}
            isMyTurn={isLocalMode ? true : multiGame.isMyTurn}
            isLocalMode={isLocalMode}
            timeLeft={gameMode === 'online-game' ? multiGame.gameState?.turnTimeLeft : undefined}
          />
        )}



        {/* Game Board - Prend l'espace disponible */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 gap-4">
        {/* Restart Button - Visible only when game is finished */}
        {gameStatus === 'finished' && isLocalMode && (
          <button
            onClick={() => localGame.startLocalGame(playerCount)}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors text-lg shadow-lg flex items-center gap-2"
          >
            <span>🔄</span>
            <span>Recommencer</span>
          </button>
        )}
        
        <Board
          board={board}
          onCellClick={handleCellClick}
          selectedPiece={selectedPiece}
        />
      </div>

      {/* Mobile Player Inventory - Sticky bottom */}
      {currentPlayer && gameStatus === 'playing' && (
        <MobilePlayerInventory
          inventory={currentPlayer.inventory}
          color={currentPlayer.color}
          playerName={currentPlayer.nickname}
          isCurrentPlayer={isLocalMode || multiGame.isMyTurn}
          onPieceSelect={(size) => handlePieceSelect(size, currentPlayer.color)}
          selectedPiece={selectedPiece}
        />
      )}

        {/* Rules Modal */}
        <RulesModal 
          isOpen={showRules} 
          onClose={() => setShowRules(false)} 
        />

        {/* Replay Voting Modal */}
        {!isLocalMode && (multiGame.replayDeadline || multiGame.showReturnToLobby) && (
          <ReplayVoting
            replayDeadline={multiGame.replayDeadline}
            replayVotes={multiGame.replayVotes}
            players={multiGame.gameState?.players || []}
            currentPlayerId={multiGame.myPlayerId || ''}
            onVote={multiGame.castReplayVote}
            onReturnToLobby={multiGame.returnToLobby}
            showReturnToLobby={multiGame.showReturnToLobby}
            winnerId={multiGame.gameState?.winnerId}
            isDraw={multiGame.gameState?.isDraw}
          />
        )}

        {/* Players Modal */}
        {gameMode === 'online-game' && (
          <PlayersModal
            isOpen={showPlayers}
            onClose={() => setShowPlayers(false)}
            players={multiGame.gameState?.players || []}
            currentPlayerId={multiGame.gameState?.currentPlayerId}
          />
        )}
        </div>
      </div>
    );
  }

  // Fallback - should not reach here
  return null;
}

export default App;
