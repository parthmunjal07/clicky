import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { useGameStore } from '../store/game-store';
import { showToast } from '../store/toast-store';

export type GameMode = 'timer' | 'clicks';
export interface GameConfig {
  mode: GameMode;
  value: number;
}

export function HomeHub() {
  const { user } = useAuthStore();
  const store = useGameStore();
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

  const timerOptions = [60, 30, 10];
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
        const sessionId = await store.actions.startGame(selectedMode!, selectedValue!);
        navigate(`/game/${sessionId}`);
      } catch (err) {
        console.error('Failed to start game:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to start game. Please try again.';
        showToast(errorMessage);
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
          {/* Top Header - Greeting & Personal Best */}
          <div className="flex flex-col gap-2 px-2">
            <h1 className="nbr-display-heavy text-4xl sm:text-5xl uppercase truncate max-w-full text-[var(--text-primary)]">
              {user.username}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-xs font-700 uppercase tracking-widest text-[var(--text-muted)]">
                Max CPS:
              </span>
              <span className="nbr-mono text-xl text-[var(--text-primary)]">
                {(user.stats?.highestCps ?? 0).toFixed(2)}
              </span>
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

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-black/20"
          >
            <div
              className="flex flex-col items-center justify-center gap-6 p-8"
              style={{
                background: 'var(--surface)',
                border: '3px solid var(--border)',
                borderRadius: '20px',
                boxShadow: '6px 6px 0 var(--shadow)',
              }}
            >
              <div className="nbr-spinner-dark" style={{ width: '3rem', height: '3rem', borderWidth: '5px' }} />
              <p className="text-sm font-700 uppercase tracking-widest text-[var(--text-muted)]">
                Starting Game...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
