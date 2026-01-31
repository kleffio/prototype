import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { ROUTES } from "@app/routes/routes";

type Props = { children: ReactElement };

export function ProtectedRoute({ children }: Props) {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.AUTH_SIGNIN}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}
