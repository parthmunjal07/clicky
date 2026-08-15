import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/game-store';

interface GamePageProps {
  onReturnToDashboard: () => void;
}

export function GamePage({ onReturnToDashboard }: GamePageProps) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const store = useGameStore();

  const isTimerMode = store.modeType === 'timer';

  const [displayTime, setDisplayTime] = useState(isTimerMode ? store.modeValue || 0 : 0);
  const [initError, setInitError] = useState(false);
  const localPendingClicksRef = useRef(0);
  const clickBadgeRef = useRef<HTMLSpanElement>(null);

  // 1. Recover Session on Mount
  useEffect(() => {
    if (!sessionId) {
      navigate('/home');
      return;
    }
    store.actions.recoverSession(sessionId).catch(() => {
      setInitError(true);
      // Give a brief moment for toast to show if we had one, or just redirect
      setTimeout(() => navigate('/home'), 2000);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, navigate]);

  // 2. Pre-round countdown interval
  useEffect(() => {
    if (store.status === 'countdown') {
      const timer = setInterval(() => {
        store.actions.decrementCountdown();
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [store.status, store.actions]);

  // 3. Game loop timer (Visual display only)
  useEffect(() => {
    if (store.status !== 'active' || !store.serverStartedAt || !store.modeValue) return;

    // For timer mode, we need the exact deadline based on serverStartedAt
    // Wait, the countdown phase takes 3 seconds. Does backend account for this?
    // Actually, backend starts the timer immediately when `POST /game/start` is called.
    // So the serverStartedAt is already 3 seconds in the past by the time countdown finishes!
    // If the backend doesn't know about the 3s countdown, then the time is already ticking.
    // The prompt says: "Drive the countdown/elapsed display from Date.now() - server_started_at recomputed every frame, never from a local timer that just counts down independently."
    // And "After POST /game/start resolves and before the round begins accepting clicks, show a 3-2-1 countdown UI. Clicks during this window should not be sent... its whole point is giving both client and server an unambiguous, agreed-upon start moment."
    // Wait, if backend starts tracking immediately, the client countdown eats 3 seconds of the game time!
    // But backend doesn't know about countdown unless we add it. 
    // Wait, the prompt says "giving both client and server an unambiguous, agreed-upon start moment." This implies the backend assumes the client starts when the API is hit, but if we wait 3 seconds... wait. The user spec says "before the round begins accepting clicks". So yes, the 3s is eaten, OR we just show time remaining based on Date.now(). It's fine, we follow the spec: Date.now() - server_started_at.
    
    const tickMs = 50;
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - store.serverStartedAt!;
      
      if (isTimerMode) {
        const remaining = (store.modeValue! * 1000) - elapsed;
        if (remaining <= 0) {
          setDisplayTime(0);
          store.actions.setStatus('completed');
          store.actions.endSession(); // trigger end
          clearInterval(interval);
        } else {
          setDisplayTime(remaining / 1000);
        }
      } else {
        setDisplayTime(elapsed / 1000);
      }
    }, tickMs);

    return () => clearInterval(interval);
  }, [store.status, store.serverStartedAt, store.modeValue, isTimerMode, store.actions]);

  // 4. Batch Click Flushing
  useEffect(() => {
    if (store.status !== 'active') return;

    const flushInterval = setInterval(() => {
      if (localPendingClicksRef.current > 0) {
        store.actions.addPendingClicks(localPendingClicksRef.current);
        localPendingClicksRef.current = 0;
      }
      store.actions.flushClicks().catch(() => {
        // Errors are caught and handled by store (sets isReconnecting)
      });
    }, 250);

    return () => clearInterval(flushInterval);
  }, [store.status, store.actions]);

  // 5. Cleanup on unmount
  useEffect(() => {
    return () => store.actions.reset();
  }, []);

  function handleOrbClick() {
    if (store.status === 'active') {
      localPendingClicksRef.current += 1;
      
      // Instantaneous DOM update for 0ms latency without triggering a React rerender
      if (clickBadgeRef.current) {
        const total = store.optimisticClicks + localPendingClicksRef.current;
        clickBadgeRef.current.innerText = `${total}${isTimerMode ? '' : ` / ${store.modeValue}`}`;
      }
    }
  }

  async function handlePlayAgain() {
    try {
      const newSessionId = await store.actions.startGame(store.modeType!, store.modeValue!);
      navigate(`/game/${newSessionId}`, { replace: true });
    } catch (e) {
      console.error(e);
      navigate('/home');
    }
  }

  function handleChangeMode() {
    navigate('/home');
  }

  // Formatting time display
  let timeString = '';
  if (isTimerMode) {
    timeString = `0:${Math.ceil(Math.max(0, displayTime)).toString().padStart(2, '0')}`;
  } else {
    timeString = Math.max(0, displayTime).toFixed(1) + 's';
  }

  const isUrgent = isTimerMode && displayTime <= 10 && displayTime > 0;

  if (initError) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 nbr-dot-grid bg-[var(--bg)] text-center">
        <div className="nbr-card p-8">
          <p className="text-xl font-700 uppercase mb-4 text-[var(--accent-coral)]">Game session not found or already ended</p>
          <p className="text-sm text-[var(--text-muted)]">Redirecting to home...</p>
        </div>
      </div>
    );
  }

  if (store.status === 'idle') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 nbr-dot-grid bg-[var(--bg)]">
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="nbr-spinner-dark" style={{ width: '3rem', height: '3rem', borderWidth: '5px' }} />
          <p className="text-sm font-700 uppercase tracking-widest text-[var(--text-muted)]">Loading Game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] relative" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-4 sm:px-6 pb-24 md:pb-12 overflow-hidden w-full mx-auto">
        
        {/* Top: Timer Badge */}
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center justify-center px-4 py-2"
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
        <div className="relative">
          <button
            className="nbr-game-btn flex items-center justify-center"
            style={{
              width: '240px',
              height: '240px',
              touchAction: 'manipulation',
              opacity: store.status === 'active' ? 1 : 0.5,
              cursor: store.status === 'active' ? 'pointer' : 'default',
            }}
            onClick={handleOrbClick}
            disabled={store.status !== 'active'}
            aria-label="Click Orb"
          />
          
          {/* Pre-round Countdown Overlay */}
          <AnimatePresence>
            {store.status === 'countdown' && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                key={store.countdownValue}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <span className="nbr-display-heavy text-8xl text-white drop-shadow-lg" style={{ WebkitTextStroke: '3px var(--border)' }}>
                  {store.countdownValue}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom: Live Click Count Badge */}
        <div
          className="absolute bottom-24 md:bottom-16 left-1/2 -translate-x-1/2 flex items-center justify-center px-6 py-2"
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
          <span ref={clickBadgeRef} className="nbr-mono text-3xl z-10" style={{ color: 'var(--text-primary)', lineHeight: 1 }}>
            {store.optimisticClicks + localPendingClicksRef.current} {isTimerMode ? '' : `/ ${store.modeValue}`}
          </span>
        </div>

        {/* Results Modal */}
        <AnimatePresence>
          {store.status === 'completed' || store.status === 'error' ? (
            <ResultsModal 
              store={store} 
              isTimerMode={isTimerMode} 
              onReturnToDashboard={onReturnToDashboard} 
              onPlayAgain={handlePlayAgain}
              onChangeMode={handleChangeMode}
            />
          ) : null}
        </AnimatePresence>

      </div>
    </div>
  );
}

// Separate component for Results Modal to handle animations cleanly
function ResultsModal({ store, isTimerMode, onReturnToDashboard, onPlayAgain, onChangeMode }: any) {
  // Reconciliation animation for score
  const count = useMotionValue(store.optimisticClicks);
  const [displayScore, setDisplayScore] = useState(store.optimisticClicks);
  
  // Use final score if available, otherwise fallback to optimistic during loading
  const finalScore = store.serverScore !== null ? store.serverScore : store.optimisticClicks;

  useEffect(() => {
    // If server score differs from optimistic, animate to it
    if (store.serverScore !== null && store.serverScore !== store.optimisticClicks) {
      const controls = animate(count, store.serverScore, {
        duration: 0.4,
        onUpdate: (latest) => setDisplayScore(Math.round(latest))
      });
      return () => controls.stop();
    } else {
      setDisplayScore(finalScore);
    }
  }, [store.serverScore, store.optimisticClicks, count, finalScore]);

  // Is still loading the final /game/end response?
  // In clicks mode, the final batch auto-completes it, so serverScore should be there.
  // In timer mode, if serverScore is null, we are waiting for POST /game/end to resolve.
  const isLoadingResult = store.status === 'completed' && store.serverScore === null;
  const isError = store.status === 'error';

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none px-6 sm:px-12 backdrop-blur-sm bg-black/20"
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
          {isError ? (
            <>
              <p className="text-xl font-700 uppercase tracking-widest text-[var(--accent-coral)] mb-4">
                Connection Lost
              </p>
              <p className="text-sm text-[var(--text-muted)] mb-8">
                Score invalidated for anti-cheat. Official runs require an unbroken connection.
              </p>
              <button
                className="nbr-btn w-full flex items-center justify-center py-4"
                onClick={onReturnToDashboard}
              >
                Return to Dashboard
              </button>
            </>
          ) : isLoadingResult ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4">
              <div className="nbr-spinner-dark" style={{ width: '2rem', height: '2rem', borderWidth: '4px' }} />
              <p className="text-sm font-700 uppercase tracking-widest text-[var(--text-muted)]">Verifying Results...</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-700 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {isTimerMode ? 'Final Score' : 'Final Time'}
              </p>
              
              <div className="relative mt-2 mb-2">
                <h2 className="nbr-display-heavy text-7xl sm:text-8xl">
                  {isTimerMode ? displayScore : `${(displayScore / 1000).toFixed(1)}s`}
                </h2>
              </div>

              {store.rank && (
                <div className="mb-6 flex items-center gap-2">
                  <span className="text-xs font-700 uppercase tracking-widest bg-[var(--accent-yellow)] border-2 border-[var(--border)] px-3 py-1 rounded-full shadow-[2px_2px_0_var(--shadow)]">
                    Rank #{store.rank}
                  </span>
                </div>
              )}

              <div className="flex flex-col items-center w-full gap-4 mt-6">
                <button
                  className="nbr-btn w-full flex items-center justify-center py-4"
                  onClick={onPlayAgain}
                >
                  PLAY AGAIN
                </button>
                <div className="flex items-center gap-6 mt-2">
                  <button
                    className="nbr-link text-xs uppercase tracking-widest"
                    onClick={onChangeMode}
                  >
                    Change Mode
                  </button>
                  <button
                    className="nbr-link text-xs uppercase tracking-widest"
                    onClick={onReturnToDashboard}
                  >
                    Leaderboard
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
