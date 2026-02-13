import { memo, useState, useEffect } from "react";
import { Button } from "@shared/ui/Button";
import enTranslations from "@app/locales/en/components.json";
import frTranslations from "@app/locales/fr/components.json";
import { getLocale } from "@app/locales/locale";

const translations = { en: enTranslations, fr: frTranslations };

interface AuthButtonsProps {
  onLogin: () => void;
  variant?: "desktop" | "mobile";
}

export const AuthButtons = memo(({ onLogin, variant = "desktop" }: AuthButtonsProps) => {
  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].header.mobile;

  if (variant === "mobile") {
    return (
      <>
        <Button
          onClick={onLogin}
          variant="ghost"
          size="sm"
          className="text-muted hover:text-foreground hidden text-[11px] font-medium sm:inline-flex"
        >
          {t.signin}
        </Button>
        <Button
          onClick={onLogin}
          size="sm"
          className="bg-gradient-kleff hidden text-[11px] font-semibold text-black shadow-md shadow-black/40 hover:brightness-110 sm:inline-flex"
        >
          {t.start}
        </Button>
      </>
    );
  }

  return (
    <>
      <Button
        onClick={onLogin}
        variant="outline"
        size="sm"
        className="border-white/18 bg-transparent text-[11px] font-medium hover:border-white/40 hover:bg-white/5"
      >
        {t.signin}
      </Button>
      <Button
        onClick={onLogin}
        size="sm"
        className="bg-gradient-kleff text-[11px] font-semibold text-black shadow-md shadow-black/40 hover:brightness-110"
      >
        {t.signup}
      </Button>
    </>
  );
});

AuthButtons.displayName = "AuthButtons";
