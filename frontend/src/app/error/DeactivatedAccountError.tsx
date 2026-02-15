import { useState, useEffect } from "react";
import { Button } from "@shared/ui/Button";
import { Badge } from "@shared/ui/Badge";
import { AlertTriangle, LogOut, Mail } from "lucide-react";
import { useAuth } from "react-oidc-context";

import enTranslations from "@app/locales/en/errors.json";
import frTranslations from "@app/locales/fr/errors.json";
import { getLocale } from "@app/locales/locale";

const translations = {
  en: enTranslations,
  fr: frTranslations
};

export function DeactivatedAccountError() {
  const auth = useAuth();

  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].deactivated;

  const handleSignOut = () => {
    auth.signoutRedirect();
  };

  return (
    <div className="bg-kleff-bg relative isolate flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-20">
        <div className="bg-modern-noise bg-kleff-spotlight h-full w-full opacity-60" />
        <div className="bg-kleff-grid absolute inset-0 opacity-[0.25]" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-linear-to-b from-white/10 via-transparent" />

      <main className="flex flex-1 items-center">
        <div className="app-container py-20">
          <div className="mx-auto max-w-2xl">
            <div className="glass-panel relative overflow-hidden p-8 text-center sm:p-12">
              <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-red-500/5 via-transparent to-orange-500/5" />

              <div className="relative space-y-6">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Badge variant="destructive" className="text-xs">
                    {t.badge}
                  </Badge>
                  <span className="font-mono text-xs text-neutral-500">{t.status}</span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-neutral-50">{t.title}</h1>
                  <p className="text-sm text-neutral-400">{t.description}</p>
                </div>

                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6">
                  <div className="flex items-start gap-3 text-left">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-red-200">{t.what_this_means}</p>
                        <ul className="mt-2 space-y-1 text-xs text-red-300">
                          {t.consequences.map((consequence, index) => (
                            <li key={index}>• {consequence}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={handleSignOut}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>

                <div className="border-t border-neutral-800/50 pt-6">
                  <p className="text-xs text-neutral-500">
                    If you believe this is an error, please contact support.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs text-neutral-400 hover:text-neutral-200"
                    onClick={() =>
                      (window.location.href =
                        "mailto:support@kleff.io?subject=Deactivated Account Issue")
                    }
                  >
                    <Mail className="mr-1 h-3 w-3" />
                    Contact Support
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
