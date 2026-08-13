import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { ProtectedRoute } from './ProtectedRoute';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user } = useAuthStore();

  return (
    <ProtectedRoute>
      {user?.role === 'admin' ? children : <Navigate to="/home" replace />}
    </ProtectedRoute>
  );
}
