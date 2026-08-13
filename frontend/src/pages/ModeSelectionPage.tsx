import { useState } from 'react';
import { motion } from 'motion/react';

export type GameMode = 'timer' | 'clicks';

export interface GameConfig {
  mode: GameMode;
  value: number;
}

interface ModeSelectionPageProps {
  onStartGame: (config: GameConfig) => void;
  onReturnToDashboard: () => void;
}

export function ModeSelectionPage({ onStartGame, onReturnToDashboard }: ModeSelectionPageProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);

  const timerOptions = [30, 20, 10];
  const clicksOptions = [50, 25, 10];

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
    setSelectedValue(null); // Reset value when mode changes
  };

  const isReady = selectedMode !== null && selectedValue !== null;

  return (
    <div
      className="min-h-[100dvh] relative nbr-dot-grid flex flex-col items-center"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div className="relative z-10 w-full max-w-[480px] px-6 sm:px-12 flex flex-col min-h-[100dvh]">
        {/* Top Bar with Back Button in document flow */}
        <div className="pt-12 pb-6">
          <button
            onClick={onReturnToDashboard}
            className="text-sm font-700 uppercase tracking-widest nbr-link"
            style={{ letterSpacing: '0.12em', color: 'var(--text-muted)' }}
          >
            &larr; Back
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center pb-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex flex-col gap-12"
          >
            {/* Header */}
            <div className="text-center">
              <h1 className="nbr-display-heavy text-4xl sm:text-5xl uppercase" style={{ color: 'var(--text-primary)' }}>
                Select Mode
              </h1>
            </div>

            {/* Mode Cards */}
            <div className="grid grid-cols-2 gap-4">
              <button
                className={`nbr-mode-card flex flex-col items-center justify-center p-6 ${
                  selectedMode === 'timer' ? 'nbr-mode-card-active' : ''
                }`}
                onClick={() => handleModeSelect('timer')}
              >
                <span className="nbr-display-heavy text-2xl sm:text-3xl">TIMER</span>
              </button>
              <button
                className={`nbr-mode-card flex flex-col items-center justify-center p-6 ${
                  selectedMode === 'clicks' ? 'nbr-mode-card-active' : ''
                }`}
                onClick={() => handleModeSelect('clicks')}
              >
                <span className="nbr-display-heavy text-2xl sm:text-3xl">CLICKS</span>
              </button>
            </div>

            {/* Value Pills */}
            <div className="flex flex-col items-center gap-4 min-h-[5rem]">
              {selectedMode === 'timer' && (
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

              {selectedMode === 'clicks' && (
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

            {/* Start Button */}
            <button
              className="nbr-btn w-full flex items-center justify-center"
              style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem', fontSize: '1.25rem' }}
              disabled={!isReady}
              onClick={() => {
                if (isReady) {
                  onStartGame({ mode: selectedMode, value: selectedValue });
                }
              }}
            >
              START
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
