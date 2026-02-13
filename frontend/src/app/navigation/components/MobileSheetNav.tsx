import * as React from "react";
import { Link } from "react-router-dom";
import { MenuIcon, ChevronDown, Settings, LogOut, LayoutDashboard, X } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose
} from "@shared/ui/Sheet";

import { Button } from "@shared/ui/Button";
import { cn } from "@shared/lib/utils";
import { logoutEverywhere } from "@features/users/api/logout";
import type { MegaMenuSection } from "../Navigation";
import { getMegaMenuSections, getSimpleNavLinks } from "../Navigation";
import { ROUTES } from "@app/routes/routes";
import { Brand } from "@shared/ui/Brand";
import { UserAvatar } from "@shared/ui/UserAvatar";

import enTranslations from "@app/locales/en/components.json";
import frTranslations from "@app/locales/fr/components.json";
import LocaleSwitcher from "@app/navigation/components/LocaleSwitcher";
import { getLocale } from "@app/locales/locale";
import { useUser } from "@features/users/hooks/useUser";

const translations = { en: enTranslations, fr: frTranslations };

export function MobileSheetNav() {
  const { isAuthenticated } = useUser();
  const [open, setOpen] = React.useState(false);
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set(["product"]));
  const [locale, setLocaleState] = React.useState(getLocale());

  React.useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].header;
  const megaMenuSections = getMegaMenuSections(locale);
  const simpleNavLinks = getSimpleNavLinks(locale);

  React.useEffect(() => {
    if (!open) return;
    const handleResize = () => window.innerWidth >= 1024 && setOpen(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open]);

  const toggleSection = React.useCallback((key: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  const closeSheet = React.useCallback(() => setOpen(false), []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs shadow-sm transition-colors hover:bg-white/10"
          aria-label="Toggle navigation"
        >
          <MenuIcon className="h-4 w-4" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        hideCloseButton
        className="w-full border-l border-white/10 bg-linear-to-b from-[#18181a]/98 via-[#16161a]/98 to-[#18181a]/98 px-0 pt-0 pb-0 sm:w-[85vw] sm:max-w-sm"
      >
        <SheetHeader className="flex flex-row items-center justify-between border-b border-white/8 px-6 py-3">
          <Brand onClick={closeSheet} />

          <div className="flex items-center gap-2">
            <LocaleSwitcher variant="mobile" />
            <SheetClose className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-neutral-400 opacity-80 transition-all hover:bg-white/10 hover:text-neutral-200 hover:opacity-100">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetClose>
          </div>

          <SheetTitle className="sr-only">{t.mobile.nav_title}</SheetTitle>
          <SheetDescription className="sr-only">{t.mobile.nav_description}</SheetDescription>
        </SheetHeader>

        <nav className="overflow-y-auto px-4 py-4" style={{ maxHeight: "calc(100vh - 73px)" }}>
          <div className="space-y-4">
            {megaMenuSections.map((section) => (
              <MegaMenuSectionItem
                key={section.key}
                section={section}
                isExpanded={expandedSections.has(section.key)}
                onToggle={toggleSection}
                onNavigate={closeSheet}
              />
            ))}

            <div className="space-y-1 border-t border-white/8 pt-4">
              {simpleNavLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={closeSheet}
                  className="text-foreground block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="border-t border-white/8 pt-4">
              {isAuthenticated ? (
                <AuthenticatedSection onNavigate={closeSheet} locale={locale} />
              ) : (
                <UnauthenticatedSection onNavigate={closeSheet} locale={locale} />
              )}
            </div>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

const MegaMenuSectionItem = React.memo(
  ({
    section,
    isExpanded,
    onToggle,
    onNavigate
  }: {
    section: MegaMenuSection;
    isExpanded: boolean;
    onToggle: (key: string) => void;
    onNavigate: () => void;
  }) => {
    const handleToggle = React.useCallback(() => onToggle(section.key), [onToggle, section.key]);

    return (
      <div className="border-b border-white/8 pb-4 last:border-0">
        <button
          onClick={handleToggle}
          className="group flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
        >
          <div className="flex-1">
            <div className="text-foreground mb-0.5 flex items-center gap-2 text-sm font-semibold">
              {section.label}
              <ChevronDown
                className={cn(
                  "text-muted-foreground h-3.5 w-3.5 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </div>
            <div className="text-muted-foreground text-xs">{section.tagline}</div>
          </div>
        </button>

        <div
          className={cn(
            "grid transition-all duration-200 ease-in-out",
            isExpanded ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={onNavigate}
                    className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5"
                  >
                    <div className="text-muted-foreground group-hover:text-primary mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-white/5">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground text-sm font-medium">{item.label}</div>
                      <div className="text-muted-foreground text-xs leading-relaxed">
                        {item.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

MegaMenuSectionItem.displayName = "MegaMenuSectionItem";

const AuthenticatedSection = React.memo(
  ({ onNavigate, locale }: { onNavigate: () => void; locale: "en" | "fr" }) => {
    const { auth, displayName, email, initial, avatarUrl } = useUser();
    const t = translations[locale].header.mobile;

    const handleLogout = React.useCallback(async () => {
      onNavigate();
      await logoutEverywhere(auth);
    }, [onNavigate, auth]);

    return (
      <div className="space-y-3 px-2 pb-2">
        <UserAvatar
          initial={initial}
          name={displayName}
          email={email}
          src={avatarUrl || undefined}
        />

        <div className="flex flex-col gap-2">
          <Link to={ROUTES.DASHBOARD} onClick={onNavigate}>
            <Button className="bg-gradient-kleff flex w-full items-center justify-center gap-2 py-2 font-semibold text-black shadow-lg hover:brightness-110">
              <LayoutDashboard className="h-4 w-4" />
              {t.dashboard}
            </Button>
          </Link>

          <Link to={ROUTES.SETTINGS} onClick={onNavigate}>
            <Button
              variant="outline"
              className="flex w-full items-center justify-center gap-2 border-white/10 bg-white/5 py-2 font-medium text-neutral-200 hover:border-white/20 hover:bg-white/10"
            >
              <Settings className="h-4 w-4 opacity-80" />
              {t.profile_settings}
            </Button>
          </Link>

          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex w-full items-center justify-center gap-2 border-red-500/20 bg-red-500/10 py-2 font-medium text-red-300 hover:border-red-500/30 hover:bg-red-500/20"
          >
            <LogOut className="h-4 w-4" />
            {t.signout}
          </Button>
        </div>
      </div>
    );
  }
);

AuthenticatedSection.displayName = "AuthenticatedSection";

const UnauthenticatedSection = React.memo(
  ({ onNavigate, locale }: { onNavigate: () => void; locale: "en" | "fr" }) => {
    const t = translations[locale].header.mobile;

    return (
      <div className="space-y-2 px-2">
        <Link to={ROUTES.AUTH_SIGNIN} onClick={onNavigate} className="block">
          <Button
            variant="outline"
            className="h-11 w-full border-white/20 bg-transparent font-medium hover:border-white/40 hover:bg-white/5"
          >
            {t.signin}
          </Button>
        </Link>
        <Link to={ROUTES.AUTH_SIGNIN} onClick={onNavigate} className="block">
          <Button className="bg-gradient-kleff h-11 w-full font-semibold text-black shadow-lg hover:brightness-110">
            {t.signup}
          </Button>
        </Link>
      </div>
    );
  }
);

UnauthenticatedSection.displayName = "UnauthenticatedSection";
