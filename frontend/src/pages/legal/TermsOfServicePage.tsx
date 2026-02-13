import { useState, useEffect } from "react";
import { Scale, Zap, CreditCard, Shield, AlertCircle, Check, ArrowRight } from "lucide-react";
import { Section, SectionHeader } from "@shared/ui/Section";
import { GradientIcon } from "@shared/ui/GradientIcon";
import { Badge } from "@shared/ui/Badge";
import { FeatureRow } from "@shared/ui/FeatureRow";
import { MiniCard } from "@shared/ui/MiniCard";
import enTranslations from "@app/locales/en/legal.json";
import frTranslations from "@app/locales/fr/legal.json";
import { getLocale } from "@app/locales/locale";

const translations = { en: enTranslations, fr: frTranslations };

export function TermsOfServicePage() {
  const [locale, setLocaleState] = useState(getLocale());
  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].terms;

  return (
    <div className="relative isolate overflow-hidden">
      <Section className="flex flex-col items-center gap-12 px-4 pt-16 pb-12 text-center sm:pt-20 sm:pb-16">
        <div className="max-w-3xl space-y-6">
          <Badge
            variant="gradient"
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium"
          >
            <Scale className="h-3 w-3" />
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
          label={t.basics.label}
          title={t.basics.title}
          description={t.basics.description}
        />
        <div className="glass-panel-soft p-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <FeatureRow
              icon={(props) => <GradientIcon icon={Zap} {...props} />}
              title={t.basics.use_right.title}
              description={t.basics.use_right.description}
            />
            <FeatureRow
              icon={(props) => <GradientIcon icon={CreditCard} {...props} />}
              title={t.basics.pay_fair.title}
              description={t.basics.pay_fair.description}
            />
            <FeatureRow
              icon={(props) => <GradientIcon icon={Shield} {...props} />}
              title={t.basics.stay_secure.title}
              description={t.basics.stay_secure.description}
            />
            <FeatureRow
              icon={(props) => <GradientIcon icon={AlertCircle} {...props} />}
              title={t.basics.own_data.title}
              description={t.basics.own_data.description}
            />
          </div>
        </div>
      </Section>

      <Section className="px-4 pb-16">
        <SectionHeader
          label={t.acceptable_use.label}
          title={t.acceptable_use.title}
          description={t.acceptable_use.description}
        />

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {t.acceptable_use.items.map((item, idx) => (
            <div key={idx} className="glass-panel p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5">
                  <span className="text-[10px] text-neutral-400">&times;</span>
                </div>
                <p className="text-xs text-neutral-300">{item}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section className="px-4 pb-16">
        <div className="mx-auto max-w-4xl">
          <div className="glass-panel-soft p-8">
            <h2 className="mb-2 text-xs font-semibold tracking-[0.2em] text-neutral-400 uppercase">
              {t.sla.label}
            </h2>
            <p className="mb-6 text-sm text-neutral-200">{t.sla.description}</p>
            <div className="grid gap-3 text-left text-[11px] text-neutral-300 sm:grid-cols-2">
              <MiniCard title={t.sla.uptime.title} description={t.sla.uptime.description} />
              <MiniCard
                title={t.sla.infrastructure.title}
                description={t.sla.infrastructure.description}
              />
              <MiniCard title={t.sla.backups.title} description={t.sla.backups.description} />
              <MiniCard title={t.sla.ddos.title} description={t.sla.ddos.description} />
            </div>
          </div>
        </div>
      </Section>

      <Section className="px-4 pb-16">
        <div className="mx-auto max-w-3xl">
          <div className="glass-panel-soft p-8">
            <h2 className="mb-6 text-center text-2xl font-semibold text-white">
              {t.promise.title}{" "}
              <span className="text-gradient-kleff">{t.promise.title_highlight}</span>{" "}
              {t.promise.title_end}
            </h2>
            <div className="space-y-3">
              {t.promise.items.map((item, idx) => (
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
            {t.pricing_section.title}{" "}
            <span className="text-gradient-kleff">{t.pricing_section.title_highlight}</span>
          </h2>
          <div className="grid gap-4 text-xs text-neutral-300 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="mb-2 font-semibold text-neutral-100">
                {t.pricing_section.tiers.free.title}
              </div>
              <div className="text-neutral-400">{t.pricing_section.tiers.free.description}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="mb-2 font-semibold text-neutral-100">
                {t.pricing_section.tiers.payg.title}
              </div>
              <div className="text-neutral-400">{t.pricing_section.tiers.payg.description}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="mb-2 font-semibold text-neutral-100">
                {t.pricing_section.tiers.team.title}
              </div>
              <div className="text-neutral-400">{t.pricing_section.tiers.team.description}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="mb-2 font-semibold text-neutral-100">
                {t.pricing_section.tiers.cancel.title}
              </div>
              <div className="text-neutral-400">{t.pricing_section.tiers.cancel.description}</div>
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
              href="mailto:legal@kleff.ca"
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
