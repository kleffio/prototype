import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useLocation, useNavigate } from "react-router-dom";
import { KleffDot } from "@shared/ui/KleffDot";
import { Button } from "@shared/ui/Button";
import { Spinner } from "@shared/ui/Spinner";
import { ROUTES } from "@app/routes/routes";
import enTranslations from "@app/locales/en/auth.json";
import frTranslations from "@app/locales/fr/auth.json";
import { getLocale } from "@app/locales/locale";

const translations = { en: enTranslations, fr: frTranslations };

export function AuthPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };

  const from = useMemo(() => location.state?.from ?? ROUTES.DASHBOARD, [location.state?.from]);
  const attemptedRef = useRef(false);

  const [locale, setLocaleState] = useState(getLocale());
  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].auth;

  const isCallback = useMemo(() => {
    const qs = new URLSearchParams(window.location.search);
    return qs.has("code") || qs.has("id_token") || qs.has("error") || qs.has("state");
  }, []);

  useEffect(() => {
    if (auth.isLoading) return;
    if (!isCallback) return;
    if (!auth.isAuthenticated) return;

    navigate(from, { replace: true });
  }, [auth.isLoading, auth.isAuthenticated, isCallback, from, navigate]);

  useEffect(() => {
    if (auth.isLoading) return;
    if (isCallback) return;
    if (auth.isAuthenticated) {
      navigate(from, { replace: true });
      return;
    }
    if (attemptedRef.current) return;

    attemptedRef.current = true;

    auth.signinRedirect({ state: { from } }).catch((err) => {
      console.error("[AuthPage] signinRedirect failed:", err);
      attemptedRef.current = false;
    });
  }, [auth, auth.isLoading, auth.isAuthenticated, isCallback, from, navigate]);

  const handleContinue = () => {
    auth.signinRedirect({ state: { from } }).catch((err) => {
      console.error("[AuthPage] signinRedirect failed:", err);
      navigate(ROUTES.HOME, { replace: true });
    });
  };

  const title = isCallback ? t.finishing_sign_in : t.redirecting;
  const subtitle = isCallback ? t.finishing_subtitle : t.redirecting_subtitle;

  return (
    <div
      className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4"
      data-testid="auth-callback"
      role="main"
    >
      {/* WCAG 2.0 AA: Main content area */}
      <h1 className="sr-only">Authentication</h1>

      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-black/70 p-6 shadow-2xl shadow-black/70"
        aria-live="polite"
      >
        <div className="mb-5 flex flex-col items-center gap-3">
          <div className="bg-kleff-gold/10 flex h-12 w-12 items-center justify-center rounded-2xl">
            <KleffDot size={28} variant="full" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-center text-xs text-neutral-400">{subtitle}</p>
        </div>

        <div className="flex justify-center py-6" role="status" aria-live="polite">
          <Spinner size={56} label={title} />
        </div>

        <div className="mt-5 flex flex-col gap-2 text-center">
          <p className="text-[11px] text-neutral-500">{t.fallback_message}</p>
          <Button
            variant="outline"
            className="hover:border-kleff-gold/60 border-white/15 bg-transparent text-xs text-neutral-200 hover:text-white"
            onClick={handleContinue}
            disabled={auth.isLoading}
            aria-label="Try authentication again"
          >
            {t.try_again}
          </Button>
        </div>
      </div>
    </div>
  );
}
