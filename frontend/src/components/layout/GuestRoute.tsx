import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/stores/authStore';

/**
 * Keeps already-authenticated users out of the login/register/reset pages so
 * they can't silently create or switch into a second account while signed in.
 */
export default function GuestRoute() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
