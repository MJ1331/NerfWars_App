'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, set, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';

interface Player {
  name: string;
  score: number;
}

interface TimerState {
  endTime: number | null;
  paused: boolean;
}

interface ScoreboardState {
  players: {
    teamA: Player[];
    teamB: Player[];
  };
  timer: TimerState;
  pointsToWin: number;
  numPlayersPerTeam: number;
}

const initialState: ScoreboardState = {
  players: {
    teamA: [
      { name: 'Player 1 Name', score: 0 },
      { name: 'Player 2 Name', score: 0 },
    ],
    teamB: [
      { name: 'Player 1 Name', score: 0 },
      { name: 'Player 2 Name', score: 0 },
    ],
  },
  timer: { endTime: null, paused: true },
  pointsToWin: 50,
  numPlayersPerTeam: 2,
};

const INITIAL_TIMER_SECONDS = 450; 

export default function Scoreboard() {
  const [state, setState] = useState<ScoreboardState>(initialState);
  const [localTime, setLocalTime] = useState(0);

  useEffect(() => {
    const scoreboardRef = ref(db, 'scoreboard');
    const unsubscribe = onValue(scoreboardRef, (snapshot) => {
      const data = snapshot.val() || initialState;
    
      ['teamA', 'teamB'].forEach((team) => {
        while (data.players[team].length < 3) {
          data.players[team].push({ name: `Player ${data.players[team].length + 1} Name`, score: 0 });
        }
      });
      setState(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const updateState = (newState: Partial<ScoreboardState>) => {
    set(ref(db, 'scoreboard'), { ...state, ...newState });
  };

  const updatePlayer = (team: 'teamA' | 'teamB', index: number, updates: Partial<Player>) => {
    const newPlayers = { ...state.players };
    newPlayers[team][index] = { ...newPlayers[team][index], ...updates };
    updateState({ players: newPlayers });
  };

  const getTeamTotal = (team: 'teamA' | 'teamB') => 
    state.players[team].slice(0, state.numPlayersPerTeam).reduce((sum, p) => sum + p.score, 0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingSeconds = state.timer.endTime
    ? Math.max(0, Math.floor((state.timer.endTime - localTime) / 1000))
    : INITIAL_TIMER_SECONDS;

  const isPaused = state.timer.paused || !state.timer.endTime;

  const handleResume = () => {
    if (isPaused) {
      const now = Date.now();
      updateState({
        timer: { endTime: now + remainingSeconds * 1000, paused: false },
      });
    } else {
      updateState({ timer: { ...state.timer, paused: true } });
    }
  };

  const handleResetTimer = () => {
    updateState({ timer: { endTime: null, paused: true } });
  };

  const handleResetScores = () => {
    const newPlayers = { ...state.players };
    ['teamA', 'teamB'].forEach((team) => {
      newPlayers[team] = newPlayers[team].map((p) => ({ ...p, score: 0 }));
    });
    updateState({ players: newPlayers });
  };

  const handleMode = (num: 2 | 3) => {
    const newPlayers = { ...state.players };
    ['teamA', 'teamB'].forEach((team) => {
      while (newPlayers[team].length < num) {
        newPlayers[team].push({ name: `Player ${newPlayers[team].length + 1} Name`, score: 0 });
      }
    });
    updateState({ numPlayersPerTeam: num, players: newPlayers });
  };

  const TeamPanel = ({ team, color }: { team: 'teamA' | 'teamB'; color: string }) => (
    <div className={`p-4 rounded-lg ${color === 'blue' ? 'bg-blue-900/50' : 'bg-red-900/50'}`}>
      <h3 className={`text-xl font-bold ${color === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>TEAM {team.toUpperCase()}</h3>
      {state.players[team].slice(0, state.numPlayersPerTeam).map((player, i) => (
        <div key={i} className="flex items-center my-2">
          <input
            type="text"
            value={player.name}
            onChange={(e) => updatePlayer(team, i, { name: e.target.value })}
            className="bg-gray-800 text-white px-2 py-1 rounded mr-2 flex-grow"
            placeholder={`Player ${i + 1} Name`}
          />
          <button 
            onClick={() => updatePlayer(team, i, { score: Math.max(0, player.score - 1) })} 
            className="bg-red-600 w-6 h-6 flex items-center justify-center text-white mr-1"
          >
            -
          </button>
          <button 
            onClick={() => updatePlayer(team, i, { score: 0 })} 
            className="bg-gray-600 w-6 h-6 rounded-full flex items-center justify-center text-white mr-1"
          >
            0
          </button>
          <button 
            onClick={() => updatePlayer(team, i, { score: player.score + 1 })} 
            className="bg-green-600 w-6 h-6 flex items-center justify-center text-white"
          >
            +
          </button>
          <span className="ml-2 text-white">{player.score}</span>
        </div>
      ))}
      <div className="mt-4 text-lg font-bold text-white">TEAM TOTAL: {getTeamTotal(team)}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-4 text-blue-300">NERF WARS: TEAM DUEL</h1>
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span>Points to Win: {state.pointsToWin}</span>
            <span className={`px-2 py-1 rounded ${isPaused ? 'bg-orange-600' : 'bg-green-600'}`}>
              {isPaused ? 'Paused' : 'Running'}
            </span>
          </div>
          <div className="flex justify-center space-x-2">
            <button 
              onClick={() => handleMode(2)} 
              className={`px-4 py-1 rounded ${state.numPlayersPerTeam === 2 ? 'bg-blue-600' : 'bg-gray-600'}`}
            >
              2v2
            </button>
            <button 
              onClick={() => handleMode(3)} 
              className={`px-4 py-1 rounded ${state.numPlayersPerTeam === 3 ? 'bg-blue-600' : 'bg-gray-600'}`}
            >
              3v3
            </button>
          </div>
        </div>

        <div className="flex justify-center items-end mb-6 space-x-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-400">TEAM A</div>
            <div className="w-12 h-12 mx-auto mt-2 rounded-full bg-blue-900 flex items-center justify-center text-blue-400 text-2xl font-bold">
              {getTeamTotal('teamA')}
            </div>
          </div>
          <span className="text-2xl self-center mx-4">VS</span>
          <div className="text-center">
            <div className="text-4xl font-bold text-red-400">TEAM B</div>
            <div className="w-12 h-12 mx-auto mt-2 rounded-full bg-red-900 flex items-center justify-center text-red-400 text-2xl font-bold">
              {getTeamTotal('teamB')}
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl mb-2">TIME REMAINING</h2>
          <div className="text-4xl font-bold text-yellow-400">{formatTime(remainingSeconds)}</div>
        </div>

        <div className="flex justify-center space-x-4 mb-6">
          <button
            onClick={handleResume}
            className={`px-6 py-2 rounded font-bold ${isPaused ? 'bg-green-600' : 'bg-orange-600'}`}
          >
            {isPaused ? 'Resume Match' : 'Pause Match'}
          </button>
          <button onClick={handleResetTimer} className="px-6 py-2 bg-yellow-600 rounded font-bold">Reset Timer</button>
          <button onClick={handleResetScores} className="px-6 py-2 bg-red-600 rounded font-bold">Reset Scores</button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <TeamPanel team="teamA" color="blue" />
          <TeamPanel team="teamB" color="red" />
        </div>
      </div>
    </div>
  );
}