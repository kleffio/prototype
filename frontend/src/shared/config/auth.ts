/// <reference types="vite/client" />
import { WebStorageStateStore } from "oidc-client-ts";

const env = import.meta.env;

export const oidcConfig = {
  authority: "https://auth.kleff.io/application/o/kleff/",
  client_id: env.VITE_AUTH_CLIENT_ID,
  redirect_uri: window.location.origin + "/auth/callback",
  silent_redirect_uri: window.location.origin + "/auth/silent-callback",
  post_logout_redirect_uri: `${window.location.origin}/`,
  response_type: "code",
  scope: "openid profile email offline_access",

  userStore: new WebStorageStateStore({ store: window.localStorage }),

  useRefreshToken: true,
  automaticSilentRenew: true,

  includeIdTokenInSilentRenew: true,
  silentRequestTimeoutInSeconds: 10,

  loadUserInfo: true,

  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },

  metadata: {
    issuer: "https://auth.kleff.io/application/o/kleff/",
    authorization_endpoint: "https://auth.kleff.io/application/o/authorize/",
    token_endpoint: "https://auth.kleff.io/application/o/token/",
    userinfo_endpoint: "https://auth.kleff.io/application/o/userinfo/",
    end_session_endpoint: "https://auth.kleff.io/application/o/kleff/end-session/",
    jwks_uri: "https://auth.kleff.io/application/o/kleff/jwks/"
  }
} as const;
