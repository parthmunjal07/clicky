import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/auth-store';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { HomeHub } from './pages/HomeHub';
import { GamePage } from './pages/GamePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { OfflineBanner } from './components/OfflineBanner';
import { ToastContainer } from './components/ToastContainer';
import { AppShell } from './components/AppShell';
import { Analytics } from '@vercel/analytics/react';

function GamePageRoute() {
  const navigate = useNavigate();
  return (<>
    <GamePage
      onReturnToDashboard={() => navigate('/leaderboard')}
    />
    <Analytics />
  </>
  );
}

function LeaderboardRoute() {
  const navigate = useNavigate();
  return <LeaderboardPage onReturnToDashboard={() => navigate('/home')} />;
}

function LandingRoute() {
  const { isAuthenticated, isHydrated, isLoading } = useAuthStore();

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

  return <LandingPage isAuthenticated={isAuthenticated} />;
}

function AuthRoute() {
  const { isAuthenticated, isHydrated, isLoading } = useAuthStore();

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

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <AuthPage />;
}

export default function App() {
  const { hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <BrowserRouter>
      <OfflineBanner />
      <ToastContainer />
      <Routes>
        {/* Landing page for unauthenticated users */}
        <Route path="/" element={<LandingRoute />} />

        {/* Auth Routes */}
        <Route path="/auth" element={<AuthRoute />} />
        <Route path="/login" element={<Navigate to="/auth?tab=login" replace />} />

        {/* Protected Routes wrapped in AppShell */}
        <Route element={<AppShell />}>
          <Route path="/home" element={<ProtectedRoute><HomeHub /></ProtectedRoute>} />
          <Route path="/game/:sessionId" element={<ProtectedRoute><GamePageRoute /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardRoute /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          {/* Admin Route */}
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
