import { useState, useEffect } from "react";
import {
  Shield,
  Lock,
  Eye,
  Globe,
  Check,
  ArrowRight,
  FileText,
  CreditCard,
  Activity
} from "lucide-react";
import { Section, SectionHeader } from "@shared/ui/Section";
import { GradientIcon } from "@shared/ui/GradientIcon";
import { Badge } from "@shared/ui/Badge";
import { FeatureRow } from "@shared/ui/FeatureRow";
import { MiniCard } from "@shared/ui/MiniCard";
import enTranslations from "@app/locales/en/legal.json";
import frTranslations from "@app/locales/fr/legal.json";
import { getLocale } from "@app/locales/locale";

const translations = { en: enTranslations, fr: frTranslations };

export function PrivacyPolicyPage() {
  const [locale, setLocaleState] = useState(getLocale());
  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].privacy;

  return (
    <div className="relative isolate overflow-hidden">
      <Section className="flex flex-col items-center gap-12 px-4 pt-16 pb-12 text-center sm:pt-20 sm:pb-16">
        <div className="max-w-3xl space-y-6">
          <Badge
            variant="gradient"
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium"
          >
            <Shield className="h-3 w-3" />
            <span>{t.badge}</span>
          </Badge>

          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {t.title_line1}
              <br />
              <span className="text-gradient-kleff">{t.title_line2}</span>
            </h1>
            <p className="text-sm text-neutral-300 sm:text-base">{t.subtitle}</p>
            <p className="text-[11px] text-neutral-400">{t.last_updated}</p>
          </div>
        </div>
      </Section>

      <Section className="px-4 pb-16">
        <SectionHeader
          label={t.promise.label}
          title={t.promise.title}
          description={t.promise.description}
        />
        <div className="glass-panel-soft p-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <FeatureRow
              icon={(props) => <GradientIcon icon={Globe} {...props} />}
              title={t.promise.canadian.title}
              description={t.promise.canadian.description}
            />
            <FeatureRow
              icon={(props) => <GradientIcon icon={Lock} {...props} />}
              title={t.promise.encrypted.title}
              description={t.promise.encrypted.description}
            />
            <FeatureRow
              icon={(props) => <GradientIcon icon={Eye} {...props} />}
              title={t.promise.transparent.title}
              description={t.promise.transparent.description}
            />
            <FeatureRow
              icon={(props) => <GradientIcon icon={Shield} {...props} />}
              title={t.promise.pipeda.title}
              description={t.promise.pipeda.description}
            />
          </div>
        </div>
      </Section>

      <Section className="px-4 pb-16">
        <SectionHeader
          label={t.collection.label}
          title={t.collection.title}
          description={t.collection.description}
        />

        <div className="grid gap-3 md:grid-cols-3">
          <div className="glass-panel p-6">
            <div className="mb-3">
              <GradientIcon icon={FileText} />
            </div>
            <div className="mb-2 text-sm font-semibold text-neutral-50">
              {t.collection.contact.title}
            </div>
            <p className="text-[11px] leading-relaxed text-neutral-400">
              {t.collection.contact.description}
            </p>
          </div>
          <div className="glass-panel p-6">
            <div className="mb-3">
              <GradientIcon icon={CreditCard} />
            </div>
            <div className="mb-2 text-sm font-semibold text-neutral-50">
              {t.collection.billing.title}
            </div>
            <p className="text-[11px] leading-relaxed text-neutral-400">
              {t.collection.billing.description}
            </p>
          </div>
          <div className="glass-panel p-6">
            <div className="mb-3">
              <GradientIcon icon={Activity} />
            </div>
            <div className="mb-2 text-sm font-semibold text-neutral-50">
              {t.collection.usage.title}
            </div>
            <p className="text-[11px] leading-relaxed text-neutral-400">
              {t.collection.usage.description}
            </p>
          </div>
        </div>
      </Section>

      <Section className="px-4 pb-16">
        <div className="mx-auto max-w-4xl">
          <div className="glass-panel-soft p-8">
            <h2 className="mb-2 text-xs font-semibold tracking-[0.2em] text-neutral-400 uppercase">
              {t.how_we_use.label}
            </h2>
            <p className="mb-6 text-sm text-neutral-200">{t.how_we_use.description}</p>
            <div className="grid gap-3 text-left text-[11px] text-neutral-300 sm:grid-cols-2">
              <MiniCard
                title={t.how_we_use.delivery.title}
                description={t.how_we_use.delivery.description}
              />
              <MiniCard
                title={t.how_we_use.communication.title}
                description={t.how_we_use.communication.description}
              />
              <MiniCard
                title={t.how_we_use.improvements.title}
                description={t.how_we_use.improvements.description}
              />
              <MiniCard
                title={t.how_we_use.security.title}
                description={t.how_we_use.security.description}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section className="px-4 pb-16">
        <div className="mx-auto max-w-3xl">
          <div className="glass-panel-soft p-8">
            <h2 className="mb-6 text-center text-2xl font-semibold text-white">
              {t.rights.title}{" "}
              <span className="text-gradient-kleff">{t.rights.title_highlight}</span>
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {t.rights.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="bg-gradient-kleff flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full">
                    <Check className="h-3 w-3 text-black" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-50">{item.title}</h3>
                    <p className="text-[11px] text-neutral-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section className="px-4 pb-16">
        <div className="glass-panel p-8">
          <h2 className="mb-6 text-center text-2xl font-semibold text-white">
            {t.security_measures.title}{" "}
            <span className="text-gradient-kleff">{t.security_measures.title_highlight}</span>{" "}
            {t.security_measures.title_end}
          </h2>
          <div className="grid gap-4 text-xs text-neutral-300 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="mb-2 font-semibold text-neutral-100">
                {t.security_measures.encryption.title}
              </div>
              <div className="text-neutral-400">{t.security_measures.encryption.description}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="mb-2 font-semibold text-neutral-100">
                {t.security_measures.access_control.title}
              </div>
              <div className="text-neutral-400">
                {t.security_measures.access_control.description}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="mb-2 font-semibold text-neutral-100">
                {t.security_measures.monitoring.title}
              </div>
              <div className="text-neutral-400">{t.security_measures.monitoring.description}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="mb-2 font-semibold text-neutral-100">
                {t.security_measures.audits.title}
              </div>
              <div className="text-neutral-400">{t.security_measures.audits.description}</div>
            </div>
          </div>
        </div>
      </Section>

      <Section className="px-4 pb-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="glass-panel-soft p-8">
            <h2 className="mb-3 text-2xl font-semibold text-white">{t.contact.title}</h2>
            <p className="mb-6 text-xs text-neutral-300 sm:text-sm">{t.contact.description}</p>
            <a
              href="mailto:privacy@kleff.ca"
              className="bg-gradient-kleff inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-black shadow-md shadow-black/40 transition-all hover:brightness-110"
            >
              {t.contact.button}
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </Section>
    </div>
  );
}
