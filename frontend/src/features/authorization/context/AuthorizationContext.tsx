import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';

/**
 * Authorization context for managing global authorization state.
 * Provides shadow mode and enforce mode status to the entire application.
 */
interface AuthorizationContextValue {
  shadowMode: boolean;
  enforceMode: boolean;
  isLoading: boolean;
  error: Error | null;
}

const AuthorizationContext = createContext<AuthorizationContextValue | undefined>(undefined);

interface AuthorizationProviderProps {
  children: ReactNode;
}

/**
 * Provider component for authorization context.
 * Fetches feature flags from backend to determine current authorization mode.
 */
export function AuthorizationProvider({ children }: AuthorizationProviderProps) {
  const auth = useAuth();

  // TESTING: Enforce mode enabled to test authorization blocking
  // Change these back to shadow mode for production Phase 1
  const shadowMode = false;  // Set to false to test enforcement
  const enforceMode = true;   // Set to true to test enforcement
  const isLoading = false;
  const error = null;

  useEffect(() => {
    // Feature flags would be fetched from backend in production
    // For Phase 1, we default to shadow mode with hard-coded values above

    // In future phases, uncomment this to fetch from backend:
    /*
    const [shadowMode, setShadowMode] = useState(true);
    const [enforceMode, setEnforceMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    async function fetchFeatureFlags() {
      try {
        const response = await fetch('/api/v1/authorization/feature-flags', {
          headers: {
            Authorization: `Bearer ${auth.user?.access_token}`,
          },
        });
        const flags = await response.json();
        setShadowMode(flags['authorization.shadow_mode'] ?? true);
        setEnforceMode(flags['authorization.enforce_mode'] ?? false);
      } catch (err) {
        console.error('Failed to fetch feature flags:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch feature flags'));
      } finally {
        setIsLoading(false);
      }
    }

    if (auth.isAuthenticated) {
      fetchFeatureFlags();
    }
    */
  }, [auth.isAuthenticated]);

  const value: AuthorizationContextValue = {
    shadowMode,
    enforceMode,
    isLoading,
    error,
  };

  return (
    <AuthorizationContext.Provider value={value}>
      {children}
    </AuthorizationContext.Provider>
  );
}

/**
 * Hook to access authorization context.
 * Must be used within AuthorizationProvider.
 */
export function useAuthorization(): AuthorizationContextValue {
  const context = useContext(AuthorizationContext);
  if (!context) {
    throw new Error('useAuthorization must be used within AuthorizationProvider');
  }
  return context;
}
