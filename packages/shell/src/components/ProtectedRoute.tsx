import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { LoadingSpinner } from "@groot/ui/loading-spinner";
import { useAuthStore } from "@groot/shell/store/auth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasCheckedAuth = useAuthStore((state) => state.hasCheckedAuth);

  if (!hasCheckedAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
