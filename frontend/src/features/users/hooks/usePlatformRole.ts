import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { getPlatformRoles } from "../api/getPlatformRoles";

/**
 * Hook to check if the current user has platform admin privileges.
 *
 * This checks the platform_roles table in the backend via the user-service API.
 *
 * @returns {object} Object with isPlatformAdmin and isLoading properties
 */
export function usePlatformAdmin(): { isPlatformAdmin: boolean; isLoading: boolean } {
  const auth = useAuth();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start as loading

  useEffect(() => {
    const checkPlatformAdmin = async () => {
      if (!auth.isAuthenticated || !auth.user?.access_token) {
        setIsPlatformAdmin(false);
        setIsLoading(false);
        return;
      }

      // Always check platform admin status from server

      try {
        setIsLoading(true);
        const data = await getPlatformRoles(auth.user.access_token);
        setIsPlatformAdmin(data.roles.includes("platform_admin"));
        // Don't clear deactivated flag here - only the main user settings should do that
      } catch (error) {
        console.error("Failed to check platform admin status:", error);
        setIsPlatformAdmin(false);

        // Check if this is a deactivation error
        const err = error as { status?: number; isDeactivated?: boolean; response?: { status?: number }; message?: string };
        const isDeactivated = 
          // Custom deactivated error from axios interceptor
          (err.status === 403 && err.isDeactivated) ||
          // Direct axios response check
          (err.response?.status === 403) ||
          // Message-based check
          (err.message?.includes("deactivated"));

        if (isDeactivated) {
          window.location.href = "/error/deactivated";
        }
      } finally {
        setIsLoading(false);
      }
    };

    void checkPlatformAdmin();
  }, [auth.isAuthenticated, auth.user?.access_token]);

  return { isPlatformAdmin, isLoading };
}
