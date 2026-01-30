import type { ReactNode } from "react";
import { UserSettingsProvider } from "@features/users/context/UserContext";

interface Props {
  children: ReactNode;
}

export function AppWithUserSettings({ children }: Props) {
  return <UserSettingsProvider>{children}</UserSettingsProvider>;
}