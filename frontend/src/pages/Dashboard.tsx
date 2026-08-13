import { motion } from 'motion/react';
import { useAuthStore } from '../store/auth-store';
import { authApi } from '../lib/auth-api';

interface DashboardProps {
  onPlayGame?: () => void;
  onViewLeaderboard?: () => void;
}

export function Dashboard({ onPlayGame, onViewLeaderboard }: DashboardProps) {
  const { user, refreshToken, clearAuth } = useAuthStore();

  async function handleLogout() {
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Even if the API call fails, clear local state
    }
    clearAuth();
  }

  if (!user) return null;

  // --- MOCK DATA ---
  const personalBest = 142; // Example score (e.g. Clicks in 10s)
  const hasHeldNumberOneRank = true;
  const chartData = [105, 110, 118, 115, 125, 134, 142]; // Simple array of scores over time
  const sessionHistory = [
    { id: 1, date: 'Today', mode: 'Timer', score: 142, rank: 2 },
    { id: 2, date: 'Yesterday', mode: 'Clicks', score: 134, rank: 5 },
    { id: 3, date: 'Aug 10', mode: 'Timer', score: 125, rank: 1 },
    { id: 4, date: 'Aug 09', mode: 'Timer', score: 115, rank: 12 },
    { id: 5, date: 'Aug 08', mode: 'Clicks', score: 118, rank: 8 },
  ];
  // -----------------

  // SVG Chart Calculation (Simple mapping to a 300x100 viewBox)
  const chartWidth = 300;
  const chartHeight = 100;
  const maxScore = Math.max(...chartData);
  const minScore = Math.min(...chartData);
  const range = maxScore - minScore || 1;
  const xStep = chartWidth / (chartData.length - 1 || 1);

  const points = chartData.map((val, i) => {
    const x = i * xStep;
    const y = chartHeight - ((val - minScore) / range) * (chartHeight - 20) - 10; // 10px padding top/bottom
    return { x, y, val };
  });
  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div
      className="min-h-[100dvh] relative nbr-dot-grid"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div className="relative z-10 flex flex-col items-center justify-start min-h-[100dvh] px-6 sm:px-12 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[480px] flex flex-col gap-12"
        >
          {/* Top Card — no mt-* on children; nested gap-1 sub-groups handle tighter label→value spacing */}
          <div className="nbr-card flex flex-col gap-1 p-6">
            <h1 className="nbr-display-heavy text-4xl sm:text-5xl uppercase truncate max-w-full">
              {user.username}
            </h1>
            <p className="text-sm font-700 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Personal Best
            </p>
            <div className="flex items-center gap-3">
              <span className="nbr-mono text-3xl sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
                {personalBest}
              </span>
              {hasHeldNumberOneRank && (
                <div
                  title="#1 Rank Achieved"
                  className="flex items-center justify-center"
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    background: 'var(--accent-teal)',
                    border: '2.5px solid var(--border)',
                    borderRadius: '50%',
                    transform: 'rotate(15deg)',
                    boxShadow: '2px 2px 0 var(--shadow)',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)' }}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Line Chart Card — nested flex-col gap-6 removes mb-6 from the label */}
          <div className="nbr-card p-6">
            <div className="flex flex-col gap-6">
            <p className="text-sm font-700 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Recent Performance
            </p>
            <div className="w-full h-32 relative">
              <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <polyline
                  points={polylinePoints}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                />
                {points.map((p, i) => (
                  <rect
                    key={i}
                    x={p.x - 4}
                    y={p.y - 4}
                    width="8"
                    height="8"
                    fill="var(--surface)"
                    stroke="var(--border)"
                    strokeWidth="2.5"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
            </div>
            </div>
          </div>

          {/* Session History */}
          <div className="flex flex-col gap-6">
            <h2 className="text-sm font-700 uppercase tracking-widest px-1" style={{ color: 'var(--text-muted)' }}>
              Session History
            </h2>
            <div className="flex flex-col gap-3">
              {sessionHistory.map((session) => (
                <div
                  key={session.id}
                  className="nbr-card-sm flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-600" style={{ color: 'var(--text-primary)' }}>
                      {session.date}
                    </span>
                    <span className={`nbr-badge ${session.mode === 'Timer' ? 'nbr-badge-coral' : 'nbr-badge-blue'}`}>
                      {session.mode}
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="nbr-mono text-lg" style={{ color: 'var(--text-primary)' }}>
                      {session.score}
                    </span>
                    <span className="text-xs font-700 uppercase" style={{ color: 'var(--text-muted)' }}>
                      Rank #{session.rank}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons — gap-4 is the sole spacing source; no mt-* on any child */}
          <div className="flex flex-col items-center gap-4">
            {onPlayGame && (
              <button
                className="nbr-btn w-full flex items-center justify-center gap-2"
                onClick={onPlayGame}
                style={{ paddingTop: '1rem', paddingBottom: '1rem' }}
              >
                Play Game
              </button>
            )}

            {onViewLeaderboard && (
              <button
                className="nbr-btn-ghost w-full flex items-center justify-center gap-2"
                onClick={onViewLeaderboard}
                style={{ paddingTop: '1rem', paddingBottom: '1rem', background: 'var(--surface)' }}
              >
                Leaderboard
              </button>
            )}

            <button
              id="dashboard-logout"
              onClick={handleLogout}
              className="text-sm font-700 uppercase tracking-widest nbr-link"
              style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}
            >
              Log out
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
