import { useContext } from "react";
import { useAuth } from "react-oidc-context";
import { UserSettingsContext } from "@features/users/context/UserContext";

type AuthProfile = {
  name?: string;
  preferred_username?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  [key: string]: unknown;
};

export function useUser() {
  const auth = useAuth();
  const ctx = useContext(UserSettingsContext);

  // Return default values if context is not available (during initial render)
  if (!ctx) {
    return {
      auth,
      displayName: "",
      email: "",
      initial: "",
      avatarUrl: null,
      isAuthenticated: false,
      user: null,
      isLoading: true,
      error: null,
      reload: () => Promise.resolve()
    };
  }

  const { settings, isLoading: settingsLoading, error, reload } = ctx;
  const rawProfile = auth.user?.profile as AuthProfile | undefined;

  const email = settings?.email ?? rawProfile?.email ?? "";

  const displayName =
    settings?.displayName ??
    settings?.username ??
    rawProfile?.name ??
    rawProfile?.preferred_username ??
    ([rawProfile?.given_name, rawProfile?.family_name].filter(Boolean).join(" ") ||
      email ||
      "Unknown User");

  const username = settings?.username ?? rawProfile?.preferred_username ?? "";
  const avatarUrl = settings?.avatarUrl ?? rawProfile?.picture ?? null;
  const initial = (displayName[0] ?? email[0] ?? "K").toUpperCase();

  return {
    user: settings,

    email,
    displayName,
    username,
    avatarUrl,
    initial,

    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading || settingsLoading,
    error,

    auth,

    reload
  };
}
