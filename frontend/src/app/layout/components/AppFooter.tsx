import { useState, useEffect } from "react";
import { ROUTES } from "@app/routes/routes";
import { UnderlineLink } from "@shared/ui/UnderlineLink";
import enTranslations from "@app/locales/en/components.json";
import frTranslations from "@app/locales/fr/components.json";
import { getLocale } from "@app/locales/locale";

const translations = { en: enTranslations, fr: frTranslations };

export function AppFooter() {
  const [locale, setLocaleState] = useState(getLocale());
  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].footer;

  return (
    <footer className="border-t border-white/5 bg-black/40">
      <div className="app-container py-8">
        <div className="flex flex-wrap items-start justify-between gap-x-12 gap-y-8">
          {/* Brand Section */}
          <div className="flex min-w-[200px] items-start gap-2">
            <span className="bg-kleff-primary mt-1 h-4 w-5 flex-shrink-0 rounded-lg" />
            <div className="flex flex-col">
              <span className="text-foreground text-[17px] font-semibold">{t.brand}</span>
              <span className="mt-1 max-w-xs text-[15px] text-neutral-500">{t.tagline}</span>
            </div>
          </div>

          {/* Links Grid */}
          <div className="flex flex-wrap gap-x-12 gap-y-8">
            {/* Product Column */}
            <div className="min-w-[120px]">
              <h3 className="mb-3 text-[15px] font-semibold text-neutral-200">{t.product}</h3>
              <ul className="space-y-2">
                <li>
                  <UnderlineLink
                    href={ROUTES.DOCS}
                    className="text-[14px] text-neutral-500 hover:text-neutral-200"
                  >
                    {t.docs}
                  </UnderlineLink>
                </li>
                <li>
                  <UnderlineLink
                    href={ROUTES.PRICING}
                    className="text-[14px] text-neutral-500 hover:text-neutral-200"
                  >
                    {t.pricing}
                  </UnderlineLink>
                </li>
                <li>
                  <UnderlineLink
                    href={ROUTES.STATUS}
                    className="text-[14px] text-neutral-500 hover:text-neutral-200"
                  >
                    {t.status}
                  </UnderlineLink>
                </li>
              </ul>
            </div>

            {/* Company Column */}
            <div className="min-w-[120px]">
              <h3 className="mb-3 text-[15px] font-semibold text-neutral-200">{t.company}</h3>
              <ul className="space-y-2">
                <li>
                  <UnderlineLink
                    href={ROUTES.ABOUT}
                    className="text-[14px] text-neutral-500 hover:text-neutral-200"
                  >
                    About
                  </UnderlineLink>
                </li>
                <li>
                  <UnderlineLink
                    href={ROUTES.FAQ}
                    className="text-[14px] text-neutral-500 hover:text-neutral-200"
                  >
                    FAQ
                  </UnderlineLink>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div className="min-w-[120px]">
              <h3 className="mb-3 text-[15px] font-semibold text-neutral-200">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <UnderlineLink
                    href={ROUTES.TERMS}
                    className="text-[14px] text-neutral-500 hover:text-neutral-200"
                  >
                    Terms
                  </UnderlineLink>
                </li>
                <li>
                  <UnderlineLink
                    href={ROUTES.PRIVACY}
                    className="text-[14px] text-neutral-500 hover:text-neutral-200"
                  >
                    Privacy
                  </UnderlineLink>
                </li>
              </ul>
            </div>

            {/* Contact Us Column */}
            <div>
              <h3 className="mb-3 text-[15px] font-semibold text-neutral-200">Contact Us</h3>
              <ul className="space-y-2">
                <li>
                  <UnderlineLink
                    href={"https://www.linkedin.com/company/kleffio/"}
                    className="text-[14px] text-neutral-500 hover:text-neutral-200"
                  >
                    Linkedin
                  </UnderlineLink>
                </li>
                <li>
                  <UnderlineLink
                    href={"mailto:kleffioapp@gmail.com"}
                    className="text-[14px] text-neutral-500 hover:text-neutral-200"
                  >
                    Email
                  </UnderlineLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-white/5 pt-6 text-center text-[14px] text-neutral-600">
          &copy; {new Date().getFullYear()} Kleff. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
