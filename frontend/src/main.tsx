import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "react-oidc-context";
import { App } from "@app/App";

import { oidcConfig } from "@shared/config/auth";

import { UserSettingsProvider } from "@features/users/context/UserContext";
import { AuthorizationProvider } from "@features/authorization/context/AuthorizationContext";

import "@shared/styles/tailwind.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider {...oidcConfig}>
      <UserSettingsProvider>
        <AuthorizationProvider>
          <App />
        </AuthorizationProvider>
      </UserSettingsProvider>
    </AuthProvider>
  </React.StrictMode>
);
