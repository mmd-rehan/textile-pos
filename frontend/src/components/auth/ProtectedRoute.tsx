import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface Props {
  children: React.ReactNode;
  permission?: string;
}

export default function ProtectedRoute({ children, permission }: Props) {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const permissions = user?.permissions ?? [];

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (permission && !permissions.includes(permission)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xl font-bold">
          !
        </div>
        <h2 className="text-lg font-semibold text-gray-800">Access Denied</h2>
        <p className="text-sm text-gray-500">You don't have permission to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
