import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "react-oidc-context";
import type { UserSettings, UserSettingsState } from "@features/users/types/User";
import { setAccessToken } from "@shared/lib/client";
import { Me } from "@features/users/api/me";
import { useNavigate, useLocation } from "react-router-dom";

interface DeactivatedAccountError extends Error {
  status: number;
  isDeactivated: boolean;
}

const UserSettingsContext = createContext<UserSettingsState | undefined>(undefined);

function UserSettingsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { isLoading: authLoading, isAuthenticated, user } = auth;
  const navigate = useNavigate();
  const location = useLocation();

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkDeactivatedRoute = useCallback(() => {
    if (localStorage.getItem('account-deactivated') === 'true') {
      const path = location.pathname;
      if (path.startsWith('/dashboard') || path.startsWith('/settings') || path.startsWith('/projects')) {
        if (path !== '/error/deactivated') {
          navigate('/error/deactivated');
        }
      }
    }
  }, [location.pathname, navigate]);

  const isProtectedRoute = useCallback(() => {
    const path = location.pathname;
    return path.startsWith('/dashboard') || path.startsWith('/settings') || path.startsWith('/projects');
  }, [location.pathname]);

  const load = useCallback(async () => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    
    if (location.pathname === '/error/deactivated') {
      setIsLoading(false);
      return;
    }

    // Skip API calls on public pages if already deactivated
    if (!isProtectedRoute() && localStorage.getItem('account-deactivated') === 'true') {
      setSettings(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!isAuthenticated) {
      setAccessToken(null);
      setSettings(null);
      setError(null);
      setIsLoading(false);
      localStorage.removeItem('account-deactivated');
      return;
    }

    const token = user?.access_token;
    if (!token) {
      console.warn("No access token found on auth.user");
      setAccessToken(null);
      setSettings(null);
      setIsLoading(false);
      return;
    }

    setAccessToken(token);

    try {
      setIsLoading(true);
      setError(null);

      const data = await Me(token);
      setSettings(data);
    } catch (e) {
      console.error("Failed to load user settings", e);
      
      
      if ((e as DeactivatedAccountError).status === 403 && (e as DeactivatedAccountError).isDeactivated) {
        localStorage.setItem('account-deactivated', 'true');
        navigate('/error/deactivated');
        return;
      }
      
      setError(e as Error);
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated, user?.access_token, location.pathname, navigate, isProtectedRoute]);

  useEffect(() => {
    const events = auth.events;
    const handleTokenExpired = () => console.error("Token expired");
    const handleSilentRenewError = (error: Error) => console.error("Silent renew error:", error);

    events.addAccessTokenExpired(handleTokenExpired);
    events.addSilentRenewError(handleSilentRenewError);

    return () => {
      events.removeAccessTokenExpired(handleTokenExpired);
      events.removeSilentRenewError(handleSilentRenewError);
    };
  }, [auth.events]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    checkDeactivatedRoute();
  }, [checkDeactivatedRoute]);

  const value: UserSettingsState = useMemo(
    () => ({
      settings,
      isLoading,
      error,
      reload: load
    }),
    [settings, isLoading, error, load]
  );

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
}

export { UserSettingsContext, UserSettingsProvider };
