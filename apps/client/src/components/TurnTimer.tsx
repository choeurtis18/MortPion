import { useEffect, useState } from 'react';

interface TurnTimerProps {
  timeLeft: number; // seconds remaining
  isMyTurn: boolean;
  playerName: string;
}

export function TurnTimer({ timeLeft, isMyTurn, playerName }: TurnTimerProps) {
  const [displayTime, setDisplayTime] = useState(timeLeft);

  useEffect(() => {
    setDisplayTime(timeLeft);
  }, [timeLeft]);

  // Don't show timer if no time limit or game not active
  if (timeLeft <= 0 && displayTime <= 0) return null;

  const minutes = Math.floor(displayTime / 60);
  const seconds = displayTime % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Color coding based on time remaining
  const getTimerColor = () => {
    if (displayTime <= 10) return 'text-red-500 bg-red-50 border-red-200';
    if (displayTime <= 30) return 'text-orange-500 bg-orange-50 border-orange-200';
    return 'text-blue-500 bg-blue-50 border-blue-200';
  };

  const getTimerIcon = () => {
    if (displayTime <= 10) return '🚨';
    if (displayTime <= 30) return '⚠️';
    return '⏰';
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getTimerColor()}`}>
      <span className="text-lg">{getTimerIcon()}</span>
      <div className="flex flex-col">
        <div className="font-mono font-bold text-lg">
          {timeString}
        </div>
        <div className="text-xs opacity-75">
          {isMyTurn ? 'Votre tour' : `Tour de ${playerName}`}
        </div>
      </div>
      {displayTime <= 10 && (
        <div className="animate-pulse">
          <span className="text-red-500 font-bold">!</span>
        </div>
      )}
    </div>
  );
}
