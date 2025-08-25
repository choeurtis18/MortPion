import { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';

interface Room {
  id: string;
  name: string;
  playerCount: number;
  capacity: number;
  isPrivate: boolean;
  status: string;
}

interface OnlineMenuProps {
  onBack: () => void;
  onJoinGame: (roomId: string) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
}

export function OnlineMenu({ onBack, onJoinGame, playerName, setPlayerName }: OnlineMenuProps) {
  const { socket, isConnected, createRoom, joinRoom } = useSocket();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [accessCode, setAccessCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [capacity, setCapacity] = useState<2 | 3 | 4>(2);
  const [loading, setLoading] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [showRoomCreated, setShowRoomCreated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private'>('all');

  // Fetch rooms from server
  const fetchRooms = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_SERVER_URL + '/rooms');
      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (data: any) => {
      setLoading(false);
      setShowCreateRoom(false);
      
      // If it's a private room, show the access code first
      if (data.isPrivate && data.accessCode) {
        setCreatedRoomCode(data.accessCode);
        setCreatedRoomId(data.roomId);
        setShowRoomCreated(true);
      } else {
        onJoinGame(data.roomId);
      }
    };

    const handleRoomError = (data: any) => {
      setLoading(false);
      alert(`Erreur: ${data.message}`);
    };

    const handleJoinSuccess = (data: any) => {
      console.log('Join success received:', data);
      setLoading(false);
      setShowJoinRoom(false);
      onJoinGame(data.roomId || selectedRoom?.id || '');
    };

    const handleJoinError = (data: any) => {
      console.log('Join error received:', data);
      setLoading(false);
      alert(`Erreur: ${data.message}`);
    };

    socket.on('room-created', handleRoomCreated);
    socket.on('room-error', handleRoomError);
    socket.on('room-joined', handleJoinSuccess);
    socket.on('join-error', handleJoinError);

    return () => {
      socket.off('room-created', handleRoomCreated);
      socket.off('room-error', handleRoomError);
      socket.off('room-joined', handleJoinSuccess);
      socket.off('join-error', handleJoinError);
    };
  }, [socket, selectedRoom, onJoinGame]);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      alert('Veuillez entrer votre pseudo');
      return;
    }
    setLoading(true);
    createRoom(playerName, roomName || undefined, isPrivate, capacity);
  };

  const handleJoinRoom = (room: Room) => {
    if (!playerName.trim()) {
      alert('Veuillez entrer votre pseudo');
      return;
    }
    
    console.log('Attempting to join room:', room.id, 'with player:', playerName);
    console.log('Room isPrivate:', room.isPrivate);
    
    if (room.isPrivate) {
      console.log('Room is private, showing access code modal');
      setSelectedRoom(room);
      setShowJoinRoom(true);
    } else {
      console.log('Room is public, joining directly');
      setLoading(true);
      joinRoom(room.id, playerName);
    }
  };

  const handleJoinWithCode = () => {
    if (!selectedRoom) return;
    setLoading(true);
    joinRoom(selectedRoom.id, playerName, accessCode);
  };

  // Filter and search rooms
  const filteredRooms = rooms.filter(room => {
    // Apply search filter
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply type filter
    const matchesType = filterType === 'all' || 
                       (filterType === 'public' && !room.isPrivate) ||
                       (filterType === 'private' && room.isPrivate);
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center">
      <div className="w-full max-w-sm bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col min-h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm border-b px-4 py-3 flex justify-between items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span>←</span>
            <span>Retour</span>
          </button>
          <h1 className="text-xl font-bold text-gray-800">Multijoueur</h1>
          <div className="w-20"></div>
        </div>

        {/* Connection Status */}
        <div className={`px-4 py-2 text-center text-sm ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {isConnected ? '🟢 Connecté au serveur' : '🔴 Connexion au serveur...'}
        </div>

        {/* Player Name Input */}
        <div className="px-4 py-2 bg-white border-b">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Votre pseudo
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Entrez votre pseudo"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={20}
          />
          <p className="text-sm text-gray-500 mt-2">
            Entrez un pseudo pour jouer
          </p>
        </div>

        {/* Action Buttons */}
        <div className="px-4 py-2 bg-white border-b space-y-3">
          <button
            onClick={() => setShowCreateRoom(true)}
            disabled={!isConnected || !playerName.trim() || loading}
            className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <span>🏠</span>
            <span>Créer une Salle</span>
          </button>
          
          <button
            onClick={fetchRooms}
            disabled={!isConnected}
            className="w-full py-2 px-4 bg-blue-100 hover:bg-blue-200 disabled:bg-gray-100 text-blue-700 rounded-lg font-medium transition-colors"
          >
            🔄 Actualiser
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-4 bg-white border-b space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher une salle
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nom de la salle..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'all', label: 'Toutes', icon: '🏠' },
              { value: 'public', label: 'Publiques', icon: '🌐' },
              { value: 'private', label: 'Privées', icon: '🔒' }
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterType(filter.value as 'all' | 'public' | 'private')}
                className={`py-2 px-2 rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-1 ${
                  filterType === filter.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-xs">{filter.icon}</span>
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Rooms List */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex-shrink-0">
            Salles disponibles ({filteredRooms.length}{filteredRooms.length !== rooms.length ? ` sur ${rooms.length}` : ''})
          </h3>
          
          {filteredRooms.length === 0 ? (
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">🏠</div>
              {rooms.length === 0 ? (
                <>
                  <p>Aucune salle disponible</p>
                  <p className="text-sm">Créez la première !</p>
                </>
              ) : (
                <>
                  <p>Aucune salle trouvée</p>
                  <p className="text-sm">Modifiez vos critères de recherche</p>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3">
              {filteredRooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-white p-4 rounded-lg shadow-sm border flex-shrink-0"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        {room.isPrivate && <span>🔒</span>}
                        {room.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {room.playerCount}/{room.capacity} joueurs
                      </p>
                    </div>
                    <button
                      onClick={() => handleJoinRoom(room)}
                      disabled={!playerName.trim() || loading}
                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm rounded-lg transition-colors"
                    >
                      Rejoindre
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Room Modal */}
        {showCreateRoom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-sm">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Créer une Salle</h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de la salle
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder={`Salle de ${playerName}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de joueurs
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[2, 3, 4].map((num) => (
                      <button
                        key={num}
                        onClick={() => setCapacity(num as 2 | 3 | 4)}
                        className={`py-2 px-3 rounded-lg font-medium transition-colors ${
                          capacity === num
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="private"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="private" className="text-sm text-gray-700">
                    Salle privée (code requis)
                  </label>
                </div>
              </div>
              <div className="p-4 border-t flex gap-3">
                <button
                  onClick={() => setShowCreateRoom(false)}
                  className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 transition-colors"
                >
                  {loading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join Private Room Modal */}
        {showJoinRoom && selectedRoom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-sm">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Rejoindre Salle Privée</h3>
                <p className="text-sm text-gray-600">{selectedRoom.name}</p>
              </div>
              <div className="p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code d'accès
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="Entrez le code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={6}
                />
              </div>
              <div className="p-4 border-t flex gap-3">
                <button
                  onClick={() => {
                    setShowJoinRoom(false);
                    setAccessCode('');
                    setSelectedRoom(null);
                  }}
                  className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleJoinWithCode}
                  disabled={!accessCode.trim() || loading}
                  className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
                >
                  {loading ? 'Connexion...' : 'Rejoindre'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Room Created Success Modal */}
        {showRoomCreated && createdRoomCode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-sm">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold text-green-600">🎉 Salle créée !</h3>
                <p className="text-sm text-gray-600">Votre salle privée est prête</p>
              </div>
              <div className="p-4 space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-700 mb-2">Code d'accès :</p>
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600 tracking-widest">
                      {createdRoomCode}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Partagez ce code avec vos amis pour qu'ils puissent rejoindre votre salle
                  </p>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <span className="text-yellow-600">💡</span>
                  <p className="text-sm text-yellow-700">
                    Notez bien ce code, il ne sera plus affiché
                  </p>
                </div>
              </div>
              <div className="p-4 border-t">
                <button
                  onClick={() => {
                    setShowRoomCreated(false);
                    setCreatedRoomCode(null);
                    if (createdRoomId) {
                      onJoinGame(createdRoomId);
                      setCreatedRoomId(null);
                    }
                  }}
                  className="w-full py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                >
                  Entrer dans la salle
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
