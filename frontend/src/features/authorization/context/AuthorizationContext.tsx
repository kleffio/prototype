import { createContext, useContext } from "react";
import type { ReactNode } from "react";

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

export function AuthorizationProvider({ children }: AuthorizationProviderProps) {
  const shadowMode = false;
  const enforceMode = true;
  const isLoading = false;
  const error = null;

  const value: AuthorizationContextValue = {
    shadowMode,
    enforceMode,
    isLoading,
    error
  };

  return <AuthorizationContext.Provider value={value}>{children}</AuthorizationContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthorization(): AuthorizationContextValue {
  const context = useContext(AuthorizationContext);
  if (!context) {
    throw new Error("useAuthorization must be used within AuthorizationProvider");
  }
  return context;
}
