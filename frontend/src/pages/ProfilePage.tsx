import { motion } from 'motion/react';
import { useAuthStore } from '../store/auth-store';

export function ProfilePage() {
  const { user } = useAuthStore();

  if (!user) return null;

  // --- MOCK DATA (Moved from Dashboard) ---
  const chartData = [105, 110, 118, 115, 125, 134, 142]; 
  const sessionHistory = [
    { id: 1, date: 'Today', mode: 'Timer', score: 142, rank: 2 },
    { id: 2, date: 'Yesterday', mode: 'Clicks', score: 134, rank: 5 },
    { id: 3, date: 'Aug 10', mode: 'Timer', score: 125, rank: 1 },
    { id: 4, date: 'Aug 09', mode: 'Timer', score: 115, rank: 12 },
    { id: 5, date: 'Aug 08', mode: 'Clicks', score: 118, rank: 8 },
  ];
  // -----------------

  const chartWidth = 300;
  const chartHeight = 100;
  const maxScore = Math.max(...chartData, 1);
  const minScore = Math.min(...chartData, 0);
  const range = maxScore - minScore || 1;
  const xStep = chartWidth / (chartData.length - 1 || 1);

  const points = chartData.map((val, i) => {
    const x = i * xStep;
    const y = chartHeight - ((val - minScore) / range) * (chartHeight - 20) - 10; 
    return { x, y, val };
  });
  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="flex-1 relative nbr-dot-grid w-full h-full" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="relative z-10 flex flex-col items-center justify-start min-h-full px-6 sm:px-12 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[480px] flex flex-col gap-12"
        >
          <div className="flex flex-col gap-2 text-center items-center">
            <div className="flex items-center justify-center bg-[var(--surface)] border-[2.5px] border-[var(--border)] rounded-full w-24 h-24 shadow-[4px_4px_0_var(--shadow)] mb-4">
              <span className="nbr-display text-4xl text-[var(--accent-coral)]">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <h1 className="nbr-display-heavy text-4xl sm:text-5xl uppercase truncate max-w-full">
              {user.username}
            </h1>
            <p className="text-sm font-700 uppercase tracking-widest text-[var(--text-muted)]">
              Player Profile
            </p>
          </div>

          <div className="nbr-card p-6">
            <div className="flex flex-col gap-6">
              <p className="text-sm font-700 uppercase tracking-widest text-[var(--text-muted)]">
                Score Trend
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

          <div className="flex flex-col gap-6">
            <h2 className="text-sm font-700 uppercase tracking-widest px-1 text-[var(--text-muted)]">
              Session History
            </h2>
            <div className="flex flex-col gap-4">
              {sessionHistory.length === 0 ? (
                <div className="p-8 text-center border-[2.5px] border-[var(--border)] border-dashed rounded-[16px] bg-[var(--surface)]">
                  <p className="text-sm font-700 text-[var(--text-muted)]">No sessions yet. Play your first round!</p>
                </div>
              ) : (
                sessionHistory.map((session) => (
                  <div
                    key={session.id}
                    className="nbr-card-sm flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-700 text-[var(--text-primary)]">
                        {session.date}
                      </span>
                      <span className={`nbr-badge ${session.mode === 'Timer' ? 'nbr-badge-coral' : 'nbr-badge-blue'}`}>
                        {session.mode}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="nbr-mono text-xl text-[var(--text-primary)]">
                        {session.score}
                      </span>
                      <span className="text-xs font-700 uppercase text-[var(--text-muted)]">
                        Rank #{session.rank}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
