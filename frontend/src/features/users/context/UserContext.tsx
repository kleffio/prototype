import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "react-oidc-context";
import type { UserSettings, UserSettingsState } from "@features/users/types/User";
import { setAccessToken } from "@shared/lib/client";
import { Me } from "@features/users/api/me";
import { useNavigate, useLocation } from "react-router-dom";

const UserSettingsContext = createContext<UserSettingsState | undefined>(undefined);

function UserSettingsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { isLoading: authLoading, isAuthenticated, user } = auth;
  const navigate = useNavigate();
  const location = useLocation();

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [deactivatedUsers, setDeactivatedUsers] = useState<Set<string>>(new Set());

  const checkDeactivatedRoute = useCallback(() => {
    // No localStorage checking - deactivation is now detected from server responses only
  }, []);

  const isProtectedRoute = useCallback(() => {
    const path = location.pathname;
    return (
      path.startsWith("/dashboard") || path.startsWith("/settings") || path.startsWith("/projects")
    );
  }, [location.pathname]);

  const load = useCallback(async () => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (location.pathname === "/error/deactivated") {
      setIsLoading(false);
      return;
    }

    // Always make API calls to check current user status from server

    if (!isAuthenticated) {
      setAccessToken(null);
      setSettings(null);
      setError(null);
      setIsLoading(false);
      // Clear deactivated users cache when signing out
      setDeactivatedUsers(new Set());
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

    // Check if this user is known to be deactivated (anti-spam protection)
    const userEmail = user?.profile?.email || user?.profile?.sub || token.substring(0, 10);
    if (deactivatedUsers.has(userEmail)) {
      setSettings(null);
      setError(null);
      setIsLoading(false);
      if (isProtectedRoute()) {
        navigate("/error/deactivated");
      }
      return;
    }

    // Only call API if we don't have settings yet (avoid repeated calls)
    if (settings !== null) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await Me(token);
      setSettings(data);
      // Don't clear deactivated flag here - only sign out should clear it
    } catch (e) {
      console.error("Failed to load user settings", e);

      // Check for deactivated account - handle both axios error and custom error format
      const error = e as { status?: number; isDeactivated?: boolean; response?: { status?: number }; message?: string };
      const isDeactivated = 
        // Custom deactivated error from axios interceptor
        (error.status === 403 && error.isDeactivated) ||
        // Direct axios response check
        (error.response?.status === 403) ||
        // Message-based check
        (error.message?.includes("deactivated"));

      if (isDeactivated) {
        // Remember this user is deactivated (per-user caching, not browser-wide)
        setDeactivatedUsers(prev => new Set(prev).add(userEmail));
        navigate("/error/deactivated");
        return;
      }

      setError(e as Error);
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    authLoading,
    isAuthenticated,
    user?.access_token,
    user?.profile?.email,
    user?.profile?.sub,
    isProtectedRoute,
    settings,
    deactivatedUsers,
    navigate,
    location.pathname
  ]);

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
