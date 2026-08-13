import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { useGameStore } from '../store/game-store';

export type GameMode = 'timer' | 'clicks';
export interface GameConfig {
  mode: GameMode;
  value: number;
}

export function HomeHub() {
  const { user } = useAuthStore();
  const { actions: { startGame } } = useGameStore();
  const navigate = useNavigate();

  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Stub: 
    setActiveSessionId(null); 
  }, []);

  if (!user) return null;

  // --- MOCK DATA ---
  const personalBest = 142; 
  const hasHeldNumberOneRank = true;
  // -----------------

  const timerOptions = [30, 20, 10];
  const clicksOptions = [50, 25, 10];

  const handleModeSelect = (mode: GameMode) => {
    if (activeSessionId || isLoading) return; 
    setSelectedMode(mode);
    setSelectedValue(null);
  };

  const isReady = selectedMode !== null && selectedValue !== null;

  async function handleAction() {
    if (activeSessionId) {
      navigate(`/game/${activeSessionId}`);
    } else if (isReady) {
      setIsLoading(true);
      try {
        const sessionId = await startGame(selectedMode, selectedValue);
        navigate(`/game/${sessionId}`);
      } catch (err) {
        console.error('Failed to start game:', err);
        setIsLoading(false);
      }
    }
  }

  return (
    <div className="flex-1 relative nbr-dot-grid" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="relative z-10 flex flex-col items-center justify-start min-h-full px-6 sm:px-12 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[480px] flex flex-col gap-12"
        >
          {/* Top Card - Greeting & Personal Best */}
          <div className="nbr-card flex flex-col gap-4 p-6">
            <h1 className="nbr-display-heavy text-4xl sm:text-5xl uppercase truncate max-w-full">
              {user.username}
            </h1>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-700 uppercase tracking-widest text-[var(--text-muted)]">
                Personal Best
              </p>
              <div className="flex items-center gap-4">
                <span className="nbr-mono text-4xl text-[var(--text-primary)]">
                  {personalBest}
                </span>
                {hasHeldNumberOneRank && (
                  <div
                    title="#1 Rank Achieved"
                    className="flex items-center justify-center bg-[var(--accent-teal)] border-[2.5px] border-[var(--border)] rounded-full rotate-[15deg] shadow-[2px_2px_0_var(--shadow)]"
                    style={{ width: '2.5rem', height: '2.5rem' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)' }}>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="flex flex-col gap-8">
            <div className="text-center">
              <h2 className="nbr-display-heavy text-3xl uppercase text-[var(--text-primary)]">
                Play Game
              </h2>
            </div>

            {/* Mode Cards */}
            <div className="grid grid-cols-2 gap-4">
              <button
                className={`nbr-mode-card flex flex-col items-center justify-center p-6 ${
                  selectedMode === 'timer' ? 'nbr-mode-card-active' : ''
                } ${activeSessionId ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleModeSelect('timer')}
                disabled={!!activeSessionId}
              >
                <span className="nbr-display-heavy text-2xl sm:text-3xl">TIMER</span>
              </button>
              <button
                className={`nbr-mode-card flex flex-col items-center justify-center p-6 ${
                  selectedMode === 'clicks' ? 'nbr-mode-card-active' : ''
                } ${activeSessionId ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleModeSelect('clicks')}
                disabled={!!activeSessionId}
              >
                <span className="nbr-display-heavy text-2xl sm:text-3xl">CLICKS</span>
              </button>
            </div>

            {/* Value Pills */}
            <div className="flex flex-col items-center justify-center min-h-[4rem]">
              {!activeSessionId && selectedMode === 'timer' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-4"
                >
                  {timerOptions.map((val) => (
                    <button
                      key={val}
                      className={`nbr-pill px-6 py-3 text-lg ${
                        selectedValue === val ? 'nbr-pill-active' : ''
                      }`}
                      onClick={() => setSelectedValue(val)}
                    >
                      {val}s
                    </button>
                  ))}
                </motion.div>
              )}

              {!activeSessionId && selectedMode === 'clicks' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-4"
                >
                  {clicksOptions.map((val) => (
                    <button
                      key={val}
                      className={`nbr-pill px-6 py-3 text-lg ${
                        selectedValue === val ? 'nbr-pill-active' : ''
                      }`}
                      onClick={() => setSelectedValue(val)}
                    >
                      {val}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
            
            {/* Action Area */}
            <div className="flex flex-col gap-4 mt-4">
              {activeSessionId && (
                <div className="text-center mb-2">
                  <p className="text-sm font-700 uppercase tracking-widest text-[var(--text-muted)] bg-[var(--accent-yellow)] inline-block px-4 py-2 border-[2.5px] border-[var(--border)] rounded-full">
                    You have a game in progress
                  </p>
                </div>
              )}
              <button
                className="nbr-btn w-full flex items-center justify-center py-4 text-xl"
                disabled={!activeSessionId && !isReady}
                onClick={handleAction}
              >
                {activeSessionId ? 'RESUME GAME' : 'START'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
