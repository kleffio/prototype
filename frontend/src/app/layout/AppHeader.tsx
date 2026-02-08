import { useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useCallback } from "react";
import { UserMenu } from "@shared/ui/UserMenu";
import { MobileSheetNav } from "@app/navigation/components/MobileSheetNav";
import { DesktopMegaMenu } from "@app/navigation/components/DesktopMegaMenu";
import { ROUTES } from "@app/routes/routes";
import { Brand } from "@shared/ui/Brand";
import { AuthButtons } from "@features/users/components/AuthButtons";

import LocaleSwitcher from "@app/navigation/components/LocaleSwitcher";

export function AppHeader() {
  const auth = useAuth();
  const navigate = useNavigate();

  const handleLogin = useCallback(() => {
    if (auth.isAuthenticated) {
      navigate(ROUTES.DASHBOARD);
    } else {
      auth.signinRedirect();
    }
  }, [auth.isAuthenticated, auth, navigate]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0f0f10]/40 backdrop-blur-xl supports-backdrop-filter:bg-[#0f0f10]/30">
      <div className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-[#0f0f10]/60 via-[#0f0f10]/50 to-[#0f0f10]/60" />
      <div className="pointer-events-none absolute inset-0 z-0 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]" />

      <div className="app-container relative z-10 flex h-12 items-center gap-6 md:h-14">
        <div className="flex flex-1 items-center gap-6">
          <Brand fontSize="text-[14px]" />
          <div className="hidden lg:block">
            <DesktopMegaMenu />
          </div>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <LocaleSwitcher variant="compact" />
          <div className="h-4 w-px bg-white/10" />

          {auth.isAuthenticated ? (
            <UserMenu variant="compact" align="right" />
          ) : (
            <AuthButtons onLogin={handleLogin} variant="desktop" />
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <MobileSheetNav />
        </div>
      </div>
    </header>
  );
}
