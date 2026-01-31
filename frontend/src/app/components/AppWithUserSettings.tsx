import type { ReactNode } from "react";
import { UserSettingsProvider } from "@features/users/context/UserContext";
import { AuthorizationProvider } from "@features/authorization/context/AuthorizationContext";

interface Props {
  children: ReactNode;
}

export function AppWithUserSettings({ children }: Props) {
  return (
    <UserSettingsProvider>
      <AuthorizationProvider>
        {children}
      </AuthorizationProvider>
    </UserSettingsProvider>
  );
}
