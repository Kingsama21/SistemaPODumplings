import { Navigate } from 'react-router';
import { useUser } from '../context/UserContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'mesero' | 'any';
}

export function ProtectedRoute({ children, requiredRole = 'any' }: ProtectedRouteProps) {
  const { user, loading, isAdmin, isMesero } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole !== 'any') {
    if (requiredRole === 'admin' && !isAdmin) {
      return <Navigate to="/" replace />;
    }
    if (requiredRole === 'mesero' && !isMesero) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
