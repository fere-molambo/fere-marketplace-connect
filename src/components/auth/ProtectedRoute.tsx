import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  requireDashboardAccess?: boolean;
}

export const ProtectedRoute = ({ children, requireDashboardAccess = true }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAuthorized, loading: adminLoading } = useAdminAuth();

  // For routes that only require authentication (not dashboard access)
  if (!requireDashboardAccess) {
    if (authLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/auth" replace />;
    }

    return <>{children}</>;
  }

  // For routes that require dashboard access (admin, vendeur, équipe, super_admin)
  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
};
