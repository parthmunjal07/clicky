import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
