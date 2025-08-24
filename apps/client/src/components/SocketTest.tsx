import { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';

export function SocketTest() {
  const { socket, isConnected, ping, createRoom, joinRoom } = useSocket();
  const [playerName, setPlayerName] = useState('TestPlayer');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [roomCreated, setRoomCreated] = useState<any>(null);
  const [roomJoined, setRoomJoined] = useState<any>(null);
  const [playerJoined, setPlayerJoined] = useState<any>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [gameStarted, setGameStarted] = useState<any>(null);

  useEffect(() => {
    if (!socket) return;

    // Listen for room events
    socket.on('room-created', (data) => {
      console.log('Room created:', data);
      setRoomCreated(data);
    });

    socket.on('room-joined', (data) => {
      console.log('Room joined:', data);
      setRoomJoined(data);
    });

    socket.on('player-joined', (data) => {
      console.log('Player joined:', data);
      setPlayerJoined(data);
    });

    socket.on('join-error', (data) => {
      console.error('Join error:', data);
      alert(`Erreur: ${data.message}`);
    });

    // Game events
    socket.on('game-started', (data) => {
      console.log('Game started:', data);
      setGameStarted(data);
      setGameState(data.gameState);
    });

    socket.on('game-updated', (data) => {
      console.log('Game updated:', data);
      setGameState(data.gameState);
    });

    socket.on('game-ended', (data) => {
      console.log('Game ended:', data);
      setGameState(data.gameState);
      alert(`Partie terminée! ${data.isDraw ? 'Match nul' : `Gagnant: ${data.winnerId}`}`);
    });

    socket.on('move-error', (data) => {
      console.error('Move error:', data);
      alert(`Erreur de coup: ${data.message}`);
    });

    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('player-joined');
      socket.off('join-error');
      socket.off('game-started');
      socket.off('game-updated');
      socket.off('game-ended');
      socket.off('move-error');
    };
  }, [socket]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">🔌 Socket.io Test</h2>
      
      {/* Connection Status */}
      <div className="mb-4">
        <div className={`flex items-center gap-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="font-medium">
            {isConnected ? 'Connecté' : 'Déconnecté'}
          </span>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="space-y-3">
        <button
          onClick={ping}
          disabled={!isConnected}
          className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
        >
          🏓 Test Ping
        </button>

        {/* Create Room */}
        <div className="flex gap-2">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Nom du joueur"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => createRoom(playerName)}
            disabled={!isConnected || !playerName.trim()}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
          >
            🏠 Créer Salle
          </button>
        </div>

        {/* Join Room */}
        <div className="flex gap-2">
          <input
            type="text"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
            placeholder="ID de la salle"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => joinRoom(joinRoomId, playerName)}
            disabled={!isConnected || !joinRoomId.trim() || !playerName.trim()}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
          >
            🚪 Rejoindre
          </button>
        </div>
      </div>

      {/* Room Created Info */}
      {roomCreated && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-medium text-green-800 mb-2">✅ Salle créée !</h3>
          <div className="text-sm text-green-700">
            <div><strong>ID:</strong> {roomCreated.roomId}</div>
            <div><strong>Joueur:</strong> {roomCreated.playerName}</div>
            <div><strong>Message:</strong> {roomCreated.message}</div>
          </div>
        </div>
      )}

      {/* Room Joined Info */}
      {roomJoined && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">🚪 Salle rejointe !</h3>
          <div className="text-sm text-blue-700">
            <div><strong>ID:</strong> {roomJoined.roomId}</div>
            <div><strong>Joueur:</strong> {roomJoined.playerName}</div>
            <div><strong>Message:</strong> {roomJoined.message}</div>
          </div>
        </div>
      )}

      {/* Player Joined Info */}
      {playerJoined && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-800 mb-2">👤 Nouveau joueur !</h3>
          <div className="text-sm text-yellow-700">
            <div><strong>Joueur:</strong> {playerJoined.playerName}</div>
            <div><strong>ID:</strong> {playerJoined.playerId}</div>
          </div>
        </div>
      )}

      {/* Game Started Info */}
      {gameStarted && (
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-medium text-purple-800 mb-2">🎮 Partie démarrée !</h3>
          <div className="text-sm text-purple-700">
            <div><strong>Message:</strong> {gameStarted.message}</div>
            <div><strong>Joueurs:</strong> {gameStarted.gameState?.players?.length || 0}</div>
          </div>
        </div>
      )}

      {/* Game State Display */}
      {gameState && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-2">🎯 État du Jeu</h3>
          <div className="text-sm text-gray-700 space-y-1">
            <div><strong>Statut:</strong> {gameState.status}</div>
            <div><strong>Tour de:</strong> {gameState.currentPlayerId || 'N/A'}</div>
            <div><strong>Joueurs:</strong> {gameState.players?.length || 0}</div>
            {gameState.winnerId && (
              <div><strong>🏆 Gagnant:</strong> {gameState.winnerId}</div>
            )}
            {gameState.isDraw && (
              <div><strong>🤝 Match nul</strong></div>
            )}
          </div>
          
          {/* Simple Move Test */}
          {gameState.status === 'playing' && gameState.currentPlayerId === socket?.id && (
            <div className="mt-3 pt-3 border-t border-gray-300">
              <h4 className="font-medium text-gray-800 mb-2">🎲 Test de Coup</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (socket && roomCreated?.roomId) {
                      socket.emit('make-move', {
                        roomId: roomCreated.roomId,
                        cellIndex: 0,
                        size: 'P'
                      });
                    }
                  }}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs"
                >
                  P en (0,0)
                </button>
                <button
                  onClick={() => {
                    if (socket && roomCreated?.roomId) {
                      socket.emit('make-move', {
                        roomId: roomCreated.roomId,
                        cellIndex: 4,
                        size: 'M'
                      });
                    }
                  }}
                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs"
                >
                  M en (1,1)
                </button>
                <button
                  onClick={() => {
                    if (socket && roomCreated?.roomId) {
                      socket.emit('make-move', {
                        roomId: roomCreated.roomId,
                        cellIndex: 8,
                        size: 'G'
                      });
                    }
                  }}
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                >
                  G en (2,2)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
