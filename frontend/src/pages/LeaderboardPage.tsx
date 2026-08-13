import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/auth-store';

interface LeaderboardPageProps {
  onReturnToDashboard: () => void;
}

type TabType = 'Global' | 'Weekly' | 'Monthly' | 'Daily';

export function LeaderboardPage({ onReturnToDashboard }: LeaderboardPageProps) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('Global');
  
  // Mock Data
  const initialScores = [
    { id: 'u1', username: 'ProClicker', score: 215, rank: 1 },
    { id: 'u2', username: 'SpeedDemon', score: 202, rank: 2 },
    { id: 'u3', username: 'ClickyBot', score: 198, rank: 3 },
    { id: user?.id || 'u4', username: user?.username || 'You', score: 142, rank: 4 },
    { id: 'u5', username: 'CasualGamer', score: 130, rank: 5 },
  ];

  const [scores, setScores] = useState(initialScores);
  const [newScoreId, setNewScoreId] = useState<string | null>(null);

  // Simulate a new score entering after 3 seconds to show the animation
  useEffect(() => {
    const timer = setTimeout(() => {
      const newScore = { id: 'u6', username: 'NinjaFingers', score: 210, rank: 2 };
      
      setScores(prev => {
        const updated = [...prev, newScore].sort((a, b) => b.score - a.score);
        // Re-assign ranks based on new sort
        return updated.map((item, index) => ({ ...item, rank: index + 1 }));
      });
      
      setNewScoreId(newScore.id);
      
      // Remove the animation class trigger after it finishes
      setTimeout(() => setNewScoreId(null), 500);
      
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="min-h-[100dvh] relative nbr-dot-grid flex flex-col"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Top Bar with Back Button */}
      <div className="absolute top-0 left-0 p-6 z-20">
        <button
          onClick={onReturnToDashboard}
          className="text-sm font-700 uppercase tracking-widest nbr-link"
          style={{ letterSpacing: '0.12em', color: 'var(--text-muted)' }}
        >
          &larr; Dashboard
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center pt-16 pb-12 px-6 sm:px-12 w-full max-w-[480px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full flex flex-col gap-12"
        >
          {/* Header */}
          <div className="text-center">
            <h1 className="nbr-display-heavy text-4xl uppercase" style={{ color: 'var(--text-primary)' }}>
              Leaderboard
            </h1>
          </div>

          <div className="flex flex-col gap-6">
            {/* Segmented Control Tabs */}
            <div className="nbr-segment-group">
              {(['Global', 'Monthly', 'Weekly', 'Daily'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  className={`nbr-segment-btn ${activeTab === tab ? 'nbr-segment-btn-active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

          {/* Leaderboard List */}
          <div className="flex flex-col gap-3">
            {scores.map((item) => {
              const isFirst = item.rank === 1;
              const isCurrentUser = item.id === user?.id;
              const isNew = item.id === newScoreId;

              // Determine row styles
              let rowClass = 'nbr-lb-row';
              if (isFirst) rowClass += ' nbr-lb-row-gold';
              else if (isCurrentUser) rowClass += ' nbr-lb-row-user';
              
              if (isNew) rowClass += ' nbr-animate-pulse-press';

              return (
                <div
                  key={item.id}
                  className={`${rowClass} flex items-center justify-between px-5 py-4 w-full`}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank Badge */}
                    <div
                      className="flex items-center justify-center bg-white"
                      style={{
                        width: '2rem',
                        height: '2rem',
                        border: '2px solid var(--border)',
                        borderRadius: '50%',
                        flexShrink: 0
                      }}
                    >
                      <span className="nbr-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                        {item.rank}
                      </span>
                    </div>

                    {/* Username & Star Badge */}
                    <div className="flex items-center gap-2">
                      <span className="nbr-display-heavy text-xl uppercase truncate max-w-[150px] sm:max-w-[200px]" style={{ color: 'var(--text-primary)', marginTop: '2px' }}>
                        {item.username}
                      </span>
                      {isFirst && (
                        <div
                          title="#1 Rank"
                          className="flex items-center justify-center"
                          style={{
                            width: '1.5rem',
                            height: '1.5rem',
                            background: 'var(--accent-teal)',
                            border: '1.5px solid var(--border)',
                            borderRadius: '50%',
                            transform: 'rotate(15deg)',
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)' }}>
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <span className="nbr-mono text-2xl" style={{ color: 'var(--text-primary)' }}>
                      {item.score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
