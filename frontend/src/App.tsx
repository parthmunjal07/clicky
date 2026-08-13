import { useEffect, useState } from 'react';
import { useAuthStore } from './store/auth-store';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { GamePage } from './pages/GamePage';
import { ModeSelectionPage } from './pages/ModeSelectionPage';
import type { GameConfig } from './pages/ModeSelectionPage';
import { LeaderboardPage } from './pages/LeaderboardPage';

type ViewState = 'dashboard' | 'mode-selection' | 'game' | 'leaderboard';

export default function App() {
  const { isAuthenticated, isLoading, isHydrated, hydrate } = useAuthStore();
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

    // Show loading screen while checking stored tokens
  if (isLoading || !isHydrated) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center nbr-dot-grid"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="nbr-spinner-dark" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '3px' }} />
          <p
            className="text-xs font-700 uppercase tracking-widest"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}
          >
            Loading
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (currentView === 'mode-selection') {
    return (
      <ModeSelectionPage
        onReturnToDashboard={() => setCurrentView('dashboard')}
        onStartGame={(config) => {
          setGameConfig(config);
          setCurrentView('game');
        }}
      />
    );
  }

  if (currentView === 'game' && gameConfig) {
    return (
      <GamePage
        config={gameConfig}
        onReturnToDashboard={() => setCurrentView('leaderboard')}
      />
    );
  }

  if (currentView === 'leaderboard') {
    return <LeaderboardPage onReturnToDashboard={() => setCurrentView('dashboard')} />;
  }

  return (
    <Dashboard 
      onPlayGame={() => setCurrentView('mode-selection')}
      onViewLeaderboard={() => setCurrentView('leaderboard')} 
    />
  );
}
