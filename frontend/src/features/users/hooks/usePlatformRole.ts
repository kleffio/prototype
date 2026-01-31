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

      try {
        setIsLoading(true);
        const data = await getPlatformRoles(auth.user.access_token);
        setIsPlatformAdmin(data.roles.includes("platform_admin"));
      } catch (error) {
        console.error("Failed to check platform admin status:", error);
        setIsPlatformAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    void checkPlatformAdmin();
  }, [auth.isAuthenticated, auth.user?.access_token]);

  return { isPlatformAdmin, isLoading };
}
