import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../store/auth-store';
import { usersApi } from '../lib/users-api';
import { showToast } from '../store/toast-store';

export function ProfilePage() {
  const { user, setAuth, clearAuth, hydrate } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!user) return null;

  const sessionHistory = user.recentSessions || [];
  
  // Create chart data from recent sessions (reverse for chronological order left-to-right)
  const chartData = sessionHistory
    .filter(s => typeof s.score === 'number' || !isNaN(Number(s.score)))
    .map(s => Number(s.score))
    .reverse();
    
  if (chartData.length === 0) {
    chartData.push(0);
  }

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

  async function handleSaveProfile() {
    setIsSaving(true);
    try {
      const res = await usersApi.updateProfile({ displayName, avatarUrl });
      setAuth(res.user);
      setIsEditing(false);
      showToast('Profile updated!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    try {
      await usersApi.deleteAccount();
      clearAuth();
      showToast('Account deleted');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete account');
    }
  }

  const nameDisplay = user.displayName || user.username;

  return (
    <div className="flex-1 relative nbr-dot-grid w-full h-full" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="relative z-10 flex flex-col items-center justify-start min-h-full px-6 sm:px-12 py-12 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[480px] flex flex-col gap-12"
        >
          {/* Header */}
          <div className="flex flex-col gap-4 text-center items-center">
            <div className="relative">
              <div className="flex items-center justify-center overflow-hidden bg-[var(--surface)] border-[2.5px] border-[var(--border)] rounded-[24px] w-32 h-32 shadow-[4px_4px_0_var(--shadow)] mb-4">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="nbr-display text-5xl text-[var(--accent-coral)]">
                    {nameDisplay.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="absolute bottom-4 -right-2 bg-[var(--accent-yellow)] border-[2.5px] border-[var(--border)] rounded-full p-2 shadow-[2px_2px_0_var(--shadow)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_var(--shadow)] transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            </div>
            
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full flex flex-col gap-4 bg-[var(--surface)] p-6 rounded-[16px] border-[2.5px] border-[var(--border)] shadow-[4px_4px_0_var(--shadow)]"
                >
                  <div className="flex flex-col text-left gap-1">
                    <label className="text-xs font-700 uppercase tracking-widest text-[var(--text-muted)]">Display Name</label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="nbr-input py-2"
                      placeholder={user.username}
                    />
                  </div>
                  <div className="flex flex-col text-left gap-1">
                    <label className="text-xs font-700 uppercase tracking-widest text-[var(--text-muted)]">Avatar URL</label>
                    <input 
                      type="text" 
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="nbr-input py-2"
                      placeholder="https://example.com/avatar.png"
                    />
                  </div>
                  <div className="flex gap-4 mt-2">
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-2 text-sm font-700 uppercase tracking-widest border-[2.5px] border-[var(--border)] rounded-[12px] hover:bg-[var(--bg)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex-1 py-2 text-sm font-700 uppercase tracking-widest bg-[var(--accent-coral)] text-white border-[2.5px] border-[var(--border)] rounded-[12px] shadow-[2px_2px_0_var(--shadow)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_var(--shadow)] transition-all"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  <h1 className="nbr-display-heavy text-4xl sm:text-5xl uppercase truncate max-w-full">
                    {nameDisplay}
                  </h1>
                  <p className="text-sm font-700 uppercase tracking-widest text-[var(--text-muted)]">
                    @{user.username}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Lifetime Stats */}
          <div className="grid grid-cols-3 gap-4 w-full">
            <div className="nbr-card flex flex-col items-center justify-center py-6 gap-2">
              <span className="nbr-display-heavy text-3xl text-[var(--accent-coral)]">{user.stats?.totalGamesPlayed || 0}</span>
              <span className="text-[0.65rem] font-700 uppercase tracking-widest text-[var(--text-muted)] text-center">Games<br/>Played</span>
            </div>
            <div className="nbr-card flex flex-col items-center justify-center py-6 gap-2">
              <span className="nbr-display-heavy text-3xl text-[var(--accent-blue)]">{user.stats?.highestCps || 0}</span>
              <span className="text-[0.65rem] font-700 uppercase tracking-widest text-[var(--text-muted)] text-center">Highest<br/>CPS</span>
            </div>
            <div className="nbr-card flex flex-col items-center justify-center py-6 gap-2">
              <span className="nbr-display-heavy text-3xl text-[var(--accent-yellow)]">{user.stats?.totalClicks || 0}</span>
              <span className="text-[0.65rem] font-700 uppercase tracking-widest text-[var(--text-muted)] text-center">Total<br/>Clicks</span>
            </div>
          </div>

          <div className="nbr-card p-6">
            <div className="flex flex-col gap-6">
              <p className="text-sm font-700 uppercase tracking-widest text-[var(--text-muted)]">
                Score Trend (Recent)
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
                        Rank {session.rank}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="flex justify-center mt-12">
            <button
              onClick={handleDeleteAccount}
              className="text-xs font-700 uppercase tracking-widest text-[var(--accent-coral)] hover:underline opacity-80"
            >
              Delete Account
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
