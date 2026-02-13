import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Settings, LogOut, X } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose
} from "@shared/ui/Sheet";

import { Button } from "@shared/ui/Button";
import { UserMenu } from "@shared/ui/UserMenu";
import { cn } from "@shared/lib/utils";
import { useUser } from "@features/users/hooks/useUser";
import { usePlatformAdmin } from "@features/users/hooks/usePlatformRole";
import { logoutEverywhere } from "@features/users/api/logout";
import { getDashboardNavItems, isNavItemActive } from "@app/navigation/Navigation";
import { ROUTES } from "@app/routes/routes";
import { Brand } from "@shared/ui/Brand";
import { UserAvatar } from "@shared/ui/UserAvatar";
import { NavItem } from "@app/navigation/components/NavItem";

import enTranslations from "@app/locales/en/components.json";
import frTranslations from "@app/locales/fr/components.json";
import LocaleSwitcher from "@app/navigation/components/LocaleSwitcher";
import { getLocale } from "@app/locales/locale";

const translations = { en: enTranslations, fr: frTranslations };

export function DashboardNav() {
  const location = useLocation();
  const { isPlatformAdmin } = usePlatformAdmin();
  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  // Filter navigation items based on user's platform role
  const navItems = useMemo(() => {
    return getDashboardNavItems(locale).filter((item) => {
      // If item requires admin, only show to platform admins
      if (item.adminOnly) {
        return isPlatformAdmin;
      }
      return true;
    });
  }, [isPlatformAdmin, locale]);

  return (
    <>
      <header className="border-b border-white/10 bg-black/70 backdrop-blur-md lg:hidden">
        <MobileHeader />
      </header>

      <aside className="hidden h-screen w-64 flex-col border-r border-white/10 bg-black/40 lg:flex">
        <div className="flex h-14 items-center justify-start border-b border-white/10 px-3">
          <Brand />
        </div>

        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              isActive={isNavItemActive(location.pathname, item)}
              variant="sidebar"
            />
          ))}
        </nav>

        <div className="space-y-3 border-t border-white/10 p-4">
          <LocaleSwitcher variant="sidebar" />
          <UserMenu variant="full" align="left" dropdownPosition="top" />
        </div>
      </aside>
    </>
  );
}

function MobileHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { auth, displayName, email, initial, avatarUrl, isAuthenticated } = useUser();
  const { isPlatformAdmin } = usePlatformAdmin();
  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].header.mobile;

  // Filter navigation items based on user's platform role
  const navItems = useMemo(() => {
    return getDashboardNavItems(locale).filter((item) => {
      // If item requires admin, only show to platform admins
      if (item.adminOnly) {
        return isPlatformAdmin;
      }
      return true;
    });
  }, [isPlatformAdmin, locale]);

  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const handle = (e: MediaQueryListEvent) => e.matches && setOpen(false);
    mq.addEventListener("change", handle);
    return () => mq.removeEventListener("change", handle);
  }, [open]);

  const handleSettings = useCallback(() => {
    setOpen(false);
    navigate(ROUTES.SETTINGS);
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    setOpen(false);
    await logoutEverywhere(auth);
  }, [auth]);

  const closeSheet = useCallback(() => setOpen(false), []);

  return (
    <div className="app-container flex h-12 items-center justify-between gap-4">
      <Brand size={20} fontSize="text-[10px]" />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-black/80 text-neutral-200">
            <Menu className="h-4 w-4" />
          </button>
        </SheetTrigger>

        <SheetContent
          side="right"
          hideCloseButton
          className={cn(
            "flex h-full flex-col border-l border-white/10 bg-black/95 text-neutral-50",
            "w-full max-w-none sm:w-3/4 sm:max-w-sm"
          )}
        >
          <SheetHeader className="flex flex-row items-center justify-between border-b border-white/10 px-4 py-3 text-left">
            <div className="flex h-9 items-center">
              <Brand />
            </div>

            <div className="flex items-center gap-2">
              <LocaleSwitcher variant="mobile" />
              <SheetClose className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-neutral-400 opacity-80 transition-all hover:bg-white/10 hover:text-neutral-200 hover:opacity-100">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </SheetClose>
            </div>

            <SheetTitle className="sr-only">{t.dashboard}</SheetTitle>
          </SheetHeader>

          <nav className="flex-1 px-4 py-5">
            <p className="mb-4 text-[11px] font-medium tracking-[0.16em] text-neutral-500 uppercase">
              Navigation
            </p>
            <div className="space-y-2">
              {navItems.map((item) => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  isActive={isNavItemActive(location.pathname, item)}
                  onClick={closeSheet}
                  variant="mobile"
                />
              ))}
            </div>
          </nav>

          {isAuthenticated && (
            <div className="space-y-3 border-t border-white/10 p-4 pb-6">
              <UserAvatar
                initial={initial}
                name={displayName}
                email={email}
                src={avatarUrl || undefined}
              />

              <div className="mt-2 flex flex-col gap-2">
                <Button
                  onClick={handleSettings}
                  variant="secondary"
                  className="flex items-center justify-center gap-2 border border-white/10 bg-white/5 py-2 font-medium text-neutral-200 hover:bg-white/10"
                >
                  <Settings size={16} className="opacity-80" />
                  {t.profile_settings}
                </Button>
                <Button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 border border-red-500/20 bg-red-500/10 py-2 font-medium text-red-300 hover:bg-red-500/20"
                >
                  <LogOut size={16} />
                  {t.signout}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
