import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../store/auth-store';
import { useGameStore } from '../store/game-store';
import { leaderboardApi, type Mode, type Timeframe } from '../lib/leaderboard-api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { showToast } from '../store/toast-store';

interface LeaderboardPageProps {
  onReturnToDashboard: () => void;
}

export function LeaderboardPage({ onReturnToDashboard }: LeaderboardPageProps) {
  const { user } = useAuthStore();
  const { modeType: lastMode, modeValue: lastValue } = useGameStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const defaultMode = lastMode || 'timer';
  const defaultValue = lastValue || (defaultMode === 'timer' ? 30 : 50);

  const activeTab = (searchParams.get('range') as Timeframe) || 'global';
  const activeMode = (searchParams.get('mode') as Mode) || defaultMode;
  const activeValue = parseInt(searchParams.get('value') || String(defaultValue), 10);

  const { data: scores = [], isLoading, isError, error } = useQuery({
    queryKey: ['leaderboard', activeTab, activeMode, activeValue],
    queryFn: async () => {
      const res = await leaderboardApi.getLeaderboard(activeMode, activeValue, activeTab);
      return res.leaderboard;
    },
  });

  useEffect(() => {
    if (isError) {
      showToast(error?.message || 'Failed to load leaderboard');
    }
  }, [isError, error]);

  const setFilter = (updates: Record<string, string>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => next.set(k, v));
      return next;
    }, { replace: true });
  };

  const getValidValue = (mode: Mode, val: number) => {
    if (mode === 'timer') return [30, 20, 10].includes(val) ? val : 30;
    if (mode === 'clicks') return [50, 25, 10].includes(val) ? val : 50;
    return 30;
  };

  return (
    <div
      className="min-h-[100dvh] relative nbr-dot-grid flex flex-col"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div className="absolute top-0 left-0 p-6 z-20">
        <button
          onClick={onReturnToDashboard}
          className="text-sm font-700 uppercase tracking-widest nbr-link"
          style={{ letterSpacing: '0.12em', color: 'var(--text-muted)' }}
        >
          &larr; Dashboard
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center pt-16 pb-32 px-6 sm:px-12 w-full max-w-[480px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full flex flex-col gap-8"
        >
          <div className="text-center">
            <h1 className="nbr-display-heavy text-4xl uppercase" style={{ color: 'var(--text-primary)' }}>
              Leaderboard
            </h1>
          </div>

          <div className="flex flex-col gap-6">
            <div className="nbr-segment-group">
              {(['global', 'monthly', 'weekly', 'daily'] as Timeframe[]).map((tab) => (
                <button
                  key={tab}
                  className={`nbr-segment-btn ${activeTab === tab ? 'nbr-segment-btn-active' : ''}`}
                  onClick={() => setFilter({ range: tab })}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="flex justify-center gap-4">
                <button
                  className={`py-2 px-6 rounded-full text-sm font-700 uppercase tracking-widest transition-all ${
                    activeMode === 'timer'
                      ? 'bg-[var(--accent-coral)] text-white shadow-[2px_2px_0_var(--shadow)] border-[2.5px] border-[var(--border)]'
                      : 'bg-[var(--surface)] text-[var(--text-muted)] border-[2.5px] border-transparent hover:border-[var(--border)]'
                  }`}
                  onClick={() => setFilter({ mode: 'timer', value: String(getValidValue('timer', activeValue)) })}
                >
                  Timer
                </button>
                <button
                  className={`py-2 px-6 rounded-full text-sm font-700 uppercase tracking-widest transition-all ${
                    activeMode === 'clicks'
                      ? 'bg-[var(--accent-blue)] text-white shadow-[2px_2px_0_var(--shadow)] border-[2.5px] border-[var(--border)]'
                      : 'bg-[var(--surface)] text-[var(--text-muted)] border-[2.5px] border-transparent hover:border-[var(--border)]'
                  }`}
                  onClick={() => setFilter({ mode: 'clicks', value: String(getValidValue('clicks', activeValue)) })}
                >
                  Clicks
                </button>
              </div>

              <div className="flex items-center gap-4">
                {activeMode === 'timer' && [30, 20, 10].map(val => (
                  <button
                    key={val}
                    className={`nbr-pill px-6 py-3 text-lg ${activeValue === val ? 'nbr-pill-active' : ''}`}
                    onClick={() => setFilter({ value: String(val) })}
                  >
                    {val}s
                  </button>
                ))}
                {activeMode === 'clicks' && [50, 25, 10].map(val => (
                  <button
                    key={val}
                    className={`nbr-pill px-6 py-3 text-lg ${activeValue === val ? 'nbr-pill-active' : ''}`}
                    onClick={() => setFilter({ value: String(val) })}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 min-h-[300px]">
              {isLoading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="nbr-lb-row flex items-center justify-between px-5 py-4 w-full opacity-50 animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-300 rounded-full w-8 h-8 border-[2px] border-[var(--border)]" />
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-300 border-[1.5px] border-[var(--border)]" />
                        <div className="h-6 w-32 bg-gray-300 rounded" />
                      </div>
                    </div>
                    <div className="h-8 w-16 bg-gray-300 rounded" />
                  </div>
                ))
              ) : scores.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 gap-6 bg-[var(--surface)] border-[2.5px] border-[var(--border)] rounded-[16px] border-dashed">
                  <span className="text-sm font-700 text-[var(--text-muted)] uppercase tracking-widest text-center px-4">
                    No scores yet{activeTab === 'global' ? '' : activeTab === 'daily' ? ' today' : ` this ${activeTab}`} — be the first
                  </span>
                  <button className="py-2 px-6 rounded-full text-xs font-700 uppercase tracking-widest bg-[var(--accent-teal)] text-[var(--text-primary)] border-[2px] border-[var(--border)]" onClick={() => navigate('/home')}>
                    Play Now
                  </button>
                </div>
              ) : (
                <>
                  <AnimatePresence mode="popLayout">
                    {scores.map((item) => {
                      const isFirst = item.rank === 1;
                      const isCurrentUser = item.id === user?.id;
                      let rowClass = 'nbr-lb-row';
                      if (isFirst) rowClass += ' nbr-lb-row-gold';
                      else if (isCurrentUser) rowClass += ' nbr-lb-row-user';
  
                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          key={item.id}
                          className={`${rowClass} flex items-center justify-between px-5 py-4 w-full`}
                        >
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="flex items-center justify-center bg-white w-8 h-8 border-[2px] border-[var(--border)] rounded-full flex-shrink-0">
                              <span className="nbr-mono text-sm" style={{ color: 'var(--text-primary)' }}>{item.rank}</span>
                            </div>
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-8 h-8 rounded-full border-[1.5px] border-[var(--border)] overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
                                {item.avatarUrl ? <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-700">{(item.displayName || item.username).charAt(0).toUpperCase()}</span>}
                              </div>
                              <span className="nbr-display-heavy text-xl uppercase truncate">{item.displayName || item.username}</span>
                            </div>
                          </div>
                          <div className="text-right pl-4">
                            <span className="nbr-mono text-2xl" style={{ color: 'var(--text-primary)' }}>{activeMode === 'timer' ? item.score : `${(item.score / 1000).toFixed(2)}s`}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  
                  {!isLoading && scores.length > 0 && user && !scores.some(s => s.id === user.id) && (
                    <div className="text-center mt-4">
                      <span className="text-xs font-700 uppercase tracking-widest text-[var(--text-muted)]">
                        You haven't played {activeMode.charAt(0).toUpperCase() + activeMode.slice(1)} ({activeMode === 'timer' ? `${activeValue}s` : activeValue}) yet.
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
