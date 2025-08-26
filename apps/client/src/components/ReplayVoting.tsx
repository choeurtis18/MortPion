import { useEffect, useState } from 'react';

interface ReplayVotingProps {
  replayDeadline: number | null;
  replayVotes: Record<string, boolean>;
  players: Array<{ id: string; nickname: string; connected: boolean; color?: string }>;
  currentPlayerId: string;
  onVote: (vote: boolean) => void;
  onReturnToLobby: () => void;
  showReturnToLobby: boolean;
  winnerId?: string | null;
  isDraw?: boolean;
}

export function ReplayVoting({
  replayDeadline,
  replayVotes,
  players,
  currentPlayerId,
  onVote,
  onReturnToLobby,
  showReturnToLobby,
  winnerId,
  isDraw
}: ReplayVotingProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    if (!replayDeadline) return;

    const updateTimer = () => {
      const remaining = Math.max(0, replayDeadline - Date.now());
      setTimeLeft(Math.ceil(remaining / 1000));
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [replayDeadline]);

  useEffect(() => {
    setHasVoted(currentPlayerId in replayVotes);
  }, [replayVotes, currentPlayerId]);

  if (!replayDeadline) return null;

  const connectedPlayers = players.filter(p => p.connected);
  const votedCount = Object.keys(replayVotes).length;
  const yesVotes = Object.values(replayVotes).filter(v => v).length;
  const noVotes = Object.values(replayVotes).filter(v => !v).length;

  // Get winner information
  const winner = winnerId ? players.find(p => p.id === winnerId) : null;

  // Color emoji mapping
  const colorEmojis: Record<string, string> = {
    red: '🔴',
    blue: '🔵', 
    green: '🟢',
    yellow: '🟡'
  };

  const handleVote = (vote: boolean) => {
    if (!hasVoted && timeLeft > 0) {
      onVote(vote);
      setHasVoted(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
        {/* Game Result */}
        <div className="text-center mb-6">
          {isDraw ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="text-2xl mb-2">🤝</div>
              <h3 className="text-xl font-bold text-gray-700 mb-1">Match nul !</h3>
              <p className="text-sm text-gray-600">Aucun joueur n'a gagné cette partie</p>
            </div>
          ) : winner ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="text-xl font-bold text-green-700 mb-1">
                {winner.color && colorEmojis[winner.color]} {winner.nickname} a gagné !
              </h3>
              <p className="text-sm text-green-600">Félicitations pour cette victoire !</p>
            </div>
          ) : null}
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Rejouer ?
          </h2>
          <p className="text-gray-600">
            Tous les joueurs doivent accepter pour recommencer
          </p>
        </div>

        {/* Timer */}
        <div className="text-center mb-6">
          <div className={`text-3xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-blue-500'}`}>
            {timeLeft}s
          </div>
          <div className="text-sm text-gray-500">
            Temps restant
          </div>
        </div>

        {/* Vote Status */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Votes: {votedCount}/{connectedPlayers.length}</span>
            <span>Oui: {yesVotes} | Non: {noVotes}</span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(votedCount / connectedPlayers.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Player votes status */}
        <div className="mb-6 space-y-2">
          {connectedPlayers.map(player => {
            const vote = replayVotes[player.id];
            const isCurrentPlayer = player.id === currentPlayerId;
            
            return (
              <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className={`font-medium ${isCurrentPlayer ? 'text-blue-600' : 'text-gray-700'}`}>
                  {player.nickname} {isCurrentPlayer && '(vous)'}
                </span>
                <span className="text-sm">
                  {vote === true && 'Oui'}
                  {vote === false && 'Non'}
                  {vote === undefined && '⏳ En attente...'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Vote buttons */}
        {!hasVoted && timeLeft > 0 ? (
          <div className="flex gap-3">
            <button
              onClick={() => handleVote(true)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              ✅ Oui, rejouer !
            </button>
            <button
              onClick={() => handleVote(false)}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              ❌ Non, quitter
            </button>
          </div>
        ) : showReturnToLobby ? (
          <div className="text-center">
            <div className="text-gray-600 font-medium mb-4">
              Vote de replay expiré ou rejeté
            </div>
            <button
              onClick={onReturnToLobby}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              🏠 Retour au lobby
            </button>
          </div>
        ) : (
          <div className="text-center">
            {hasVoted ? (
              <div className="text-green-600 font-medium">
                ✅ Vote enregistré ! En attente des autres joueurs...
              </div>
            ) : (
              <div className="text-red-600 font-medium">
                ⏰ Temps écoulé !
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
