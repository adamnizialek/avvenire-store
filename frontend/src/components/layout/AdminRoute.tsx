import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/stores/authStore';

export default function AdminRoute() {
  const { token, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!token || user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
