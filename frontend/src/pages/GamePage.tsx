import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { GameConfig } from './ModeSelectionPage';

interface GamePageProps {
  config: GameConfig;
  onReturnToDashboard: () => void;
}

export function GamePage({ config, onReturnToDashboard }: GamePageProps) {
  // If timer mode: time is counting down, value is seconds.
  // If clicks mode: time is counting up, value is target clicks.
  const isTimerMode = config.mode === 'timer';

  const [time, setTime] = useState(isTimerMode ? config.value : 0);
  const [clicks, setClicks] = useState(0);
  const [isRoundOver, setIsRoundOver] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);

  // Game loop timer
  useEffect(() => {
    if (isRoundOver) return;

    if (isTimerMode) {
      if (time <= 0) {
        setIsRoundOver(true);
        // Mock "NEW BEST" logic
        if (clicks > 140) setIsNewBest(true);
        return;
      }
    } else {
      if (clicks >= config.value) {
        setIsRoundOver(true);
        // Mock "NEW BEST" logic (lower time is better, mock true for < 5s)
        if (time < 5) setIsNewBest(true);
        return;
      }
    }

    // We use a basic 100ms interval to allow decimal time tracking for 'clicks' mode, 
    // but for simplicity in UI, we'll just show seconds. Actually, let's keep it simple with 1s intervals.
    // Wait, for 'clicks' mode, tracking tenths of a second is important for speedruns.
    // Let's use 100ms ticks.
    const tickMs = 100;
    const timer = setInterval(() => {
      setTime((prev) => isTimerMode ? prev - (tickMs / 1000) : prev + (tickMs / 1000));
    }, tickMs);

    return () => clearInterval(timer);
  }, [time, clicks, isRoundOver, isTimerMode, config.value]);

  function handleOrbClick() {
    if (!isRoundOver) {
      setClicks((c) => c + 1);
    }
  }

  function handlePlayAgain() {
    setTime(isTimerMode ? config.value : 0);
    setClicks(0);
    setIsRoundOver(false);
    setIsNewBest(false);
  }

  // Formatting time display
  const displayTime = Math.max(0, time);
  let timeString = '';
  if (isTimerMode) {
    timeString = `0:${Math.ceil(displayTime).toString().padStart(2, '0')}`;
  } else {
    // Show 1 decimal place for clicks mode speedrun
    timeString = displayTime.toFixed(1) + 's';
  }

  // Urgency cue: in timer mode, under 10 seconds. In clicks mode, no real urgency cue based on time, 
  // but we can turn it coral if they are close to the target? 
  // The brief says: "switching to a coral-filled badge once under 10 seconds remain - color change is urgency cue"
  // This explicitly applies to timer mode.
  const isUrgent = isTimerMode && displayTime <= 10 && displayTime > 0;

  return (
    <div
      className="min-h-[100dvh] relative"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-6 sm:px-12 overflow-hidden w-full mx-auto">
        
        {/* Top: Timer Badge */}
        <div
          className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center justify-center px-4 py-2"
          style={{
            background: isUrgent ? 'var(--accent-coral)' : 'var(--surface)',
            border: '3px solid var(--border)',
            borderRadius: '999px',
            color: isUrgent ? '#ffffff' : 'var(--text-primary)',
            boxShadow: '4px 4px 0 var(--shadow)',
            transition: 'background-color 0.2s, color 0.2s',
          }}
        >
          <span className="nbr-mono text-2xl" style={{ lineHeight: 1 }}>
            {timeString}
          </span>
        </div>

        {/* Center: Giant Coral Orb */}
        <button
          className="nbr-game-btn flex items-center justify-center"
          style={{
            width: '240px',
            height: '240px',
            touchAction: 'manipulation',
          }}
          onClick={handleOrbClick}
          disabled={isRoundOver}
          aria-label="Click Orb"
        />

        {/* Bottom: Live Click Count Badge */}
        <div
          className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center justify-center px-6 py-2"
          style={{
            background: 'var(--surface)',
            border: '3px solid var(--border)',
            borderRadius: '999px',
            boxShadow: '4px 4px 0 var(--shadow)',
          }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{ border: '3px solid var(--accent-teal)', margin: '-3px' }}
          />
          <span className="nbr-mono text-3xl z-10" style={{ color: 'var(--text-primary)', lineHeight: 1 }}>
            {clicks} {isTimerMode ? '' : `/ ${config.value}`}
          </span>
        </div>

        {/* Results Modal */}
        <AnimatePresence>
          {isRoundOver && (
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none px-6 sm:px-12"
            >
              <div
                className="w-full max-w-[480px] p-6 pointer-events-auto"
                style={{
                  background: 'var(--surface)',
                  border: '3px solid var(--border)',
                  borderRadius: '20px',
                  boxShadow: '6px 6px 0 var(--shadow)',
                }}
              >
                <div className="flex flex-col items-center text-center">
                  <p className="text-sm font-700 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    {isTimerMode ? 'Final Score' : 'Final Time'}
                  </p>
                  
                  <div className="relative mt-2 mb-8">
                    <h2 className="nbr-display-heavy text-7xl sm:text-8xl">
                      {isTimerMode ? clicks : timeString}
                    </h2>
                    
                    {isNewBest && (
                      <div
                        className="absolute -top-4 -right-12 px-3 py-1"
                        style={{
                          background: 'var(--accent-teal)',
                          border: '2px solid var(--border)',
                          borderRadius: '999px',
                          transform: 'rotate(12deg)',
                          boxShadow: '2px 2px 0 var(--shadow)',
                        }}
                      >
                        <span className="text-xs font-700 uppercase" style={{ color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                          New Best!
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col w-full gap-3">
                    <button
                      className="nbr-btn w-full flex items-center justify-center"
                      style={{ paddingTop: '1rem', paddingBottom: '1rem' }}
                      onClick={onReturnToDashboard}
                    >
                      View Leaderboard
                    </button>
                    <button
                      className="nbr-btn-ghost w-full flex items-center justify-center"
                      style={{ paddingTop: '1rem', paddingBottom: '1rem' }}
                      onClick={handlePlayAgain}
                    >
                      Play Again
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
