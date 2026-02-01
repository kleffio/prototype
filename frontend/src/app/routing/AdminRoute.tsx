import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { usePlatformAdmin } from "@features/users/hooks/usePlatformRole";
import { ROUTES } from "@app/routes/routes";

type Props = { children: ReactElement };

/**
 * Route guard that requires the user to be a platform admin.
 * If not authenticated, redirects to sign in.
 * If authenticated but not admin, redirects to dashboard with error message.
 */
export function AdminRoute({ children }: Props) {
  const auth = useAuth();
  const location = useLocation();
  const { isPlatformAdmin, isLoading } = usePlatformAdmin();

  // Redirect to sign in if not authenticated
  if (!auth.isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.AUTH_SIGNIN}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // Wait for platform admin check to complete
  if (isLoading) {
    return null; // Or show a loading spinner
  }

  // Show 403 forbidden if authenticated but not admin
  if (!isPlatformAdmin) {
    return (
      <Navigate
        to={ROUTES.DASHBOARD}
        replace
        state={{ error: "You don't have permission to access this page" }}
      />
    );
  }

  return children;
}
